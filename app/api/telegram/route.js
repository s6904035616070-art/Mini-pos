'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

// Telegram config: อ่านจาก NEXT_PUBLIC env vars (ยิงตรงจาก client ตามที่ระบุ)
const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID

// เกณฑ์แจ้งเตือนสต๊อกเหลือน้อย
const LOW_STOCK_THRESHOLD = 5

export default function SellPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState(1)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setProducts(data)
      if (data.length > 0) {
        setSelectedProductId(data[0].id)
      }
    }

    setLoading(false)
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId)
  const totalPrice = selectedProduct ? selectedProduct.price * quantity : 0

  function resetForm() {
    setQuantity(1)
    if (products.length > 0) {
      setSelectedProductId(products[0].id)
    }
  }

  // ส่งข้อความแจ้งเตือนไปยัง Telegram โดยตรงจาก client
  // ทำงานแบบ async/try-catch แยกออกจาก flow หลัก ไม่ throw ต่อ
  // เพื่อไม่ให้การแจ้งเตือน Telegram มีปัญหาไปกระทบระบบขาย
  async function sendTelegramMessage(messageText) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn('ยังไม่ได้ตั้งค่า NEXT_PUBLIC_TELEGRAM_BOT_TOKEN / NEXT_PUBLIC_TELEGRAM_CHAT_ID')
      return
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: messageText,
            parse_mode: 'HTML',
          }),
        }
      )

      // fetch ไม่ throw error แม้ Telegram ตอบ 400/401 กลับมา
      // ต้องเช็ค response.ok เองแล้ว log body ไว้ดูสาเหตุจริง (เช่น token ผิด, chat_id ผิด, บอทไม่ได้เป็นแอดมิน)
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        console.error('Telegram API ตอบกลับผิดพลาด:', response.status, errorBody)
      }
    } catch (notifyError) {
      // ไม่ throw ต่อ แค่ log ไว้ ไม่ให้กระทบระบบขาย
      console.error('ส่งแจ้งเตือน Telegram ไม่สำเร็จ:', notifyError)
    }
  }

  async function handleSell(e) {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!selectedProduct) {
      setError('กรุณาเลือกสินค้า')
      return
    }
    if (!quantity || quantity < 1) {
      setError('กรุณากรอกจำนวนให้ถูกต้อง')
      return
    }
    // ตรวจสอบสต็อกก่อนบันทึกการขาย
    if (quantity > selectedProduct.stock) {
      setError(`สต็อกไม่เพียงพอ (คงเหลือ ${selectedProduct.stock} ${selectedProduct.unit})`)
      return
    }

    setSubmitting(true)
    const soldAt = new Date().toISOString()

    // 1) บันทึกรายการขายลงตาราง sales
    const { error: saleError } = await supabase.from('sales').insert({
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: quantity,
      total_price: totalPrice,
      sold_at: soldAt,
    })

    if (saleError) {
      setError(saleError.message)
      setSubmitting(false)
      return
    }

    // 2) อัปเดต stock ในตาราง products ให้ลดลงตามจำนวนที่ขาย
    const newStock = selectedProduct.stock - quantity

    const { error: stockError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', selectedProduct.id)

    if (stockError) {
      setError(stockError.message)
      setSubmitting(false)
      return
    }

    // --- ส่วนที่เพิ่ม: แจ้งเตือน Telegram หลังตัดสต๊อกสำเร็จ ---
    const displayTime = new Date().toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    // งานที่ 1: แจ้งเตือน Order เข้าใหม่ (ยิงทุกครั้งที่ขายสำเร็จ)
    const orderMessage =
      `🛍️ <b>มีรายการขายใหม่!</b>\n` +
      `- สินค้า: ${selectedProduct.name}\n` +
      `- จำนวน: ${quantity} ชิ้น\n` +
      `- ราคารวม: ${totalPrice} บาท\n` +
      `- สต๊อกคงเหลือปัจจุบัน: ${newStock} ชิ้น\n` +
      `- เวลา: ${displayTime}`

    // ยิงแบบไม่ await บล็อก UI และไม่ทำให้ระบบขายพังถ้า Telegram มีปัญหา
    sendTelegramMessage(orderMessage)

    // งานที่ 2: ถ้าสต๊อกหลังตัดเหลือน้อยกว่าหรือเท่ากับเกณฑ์ที่ตั้งไว้ ให้ยิงแจ้งเตือนแยกอีก 1 ข้อความ
    if (newStock <= LOW_STOCK_THRESHOLD) {
      const lowStockMessage =
        `🚨 <b>[เตือนภัย] สต๊อกสินค้าใกล้หมด!</b>\n` +
        `- สินค้า: ${selectedProduct.name}\n` +
        `- คงเหลือเพียง: ${newStock} ชิ้น\n` +
        `⚠️ กรุณาเติมสต๊อกสินค้าด่วน!`

      sendTelegramMessage(lowStockMessage)
    }
    // --- จบส่วนที่เพิ่ม ---

    setSuccessMessage(
      `ขาย "${selectedProduct.name}" จำนวน ${quantity} ${selectedProduct.unit} สำเร็จ (ยอดรวม ${totalPrice} บาท)`
    )
    setSubmitting(false)
    await fetchProducts()
    resetForm()
  }

  return (
    <div>
      <h1>ขายสินค้า</h1>

      {loading && <p>กำลังโหลดข้อมูล...</p>}
      {!loading && products.length === 0 && <p>ยังไม่มีสินค้าในระบบ</p>}

      {!loading && products.length > 0 && (
        <form className="card" onSubmit={handleSell}>
          <div style={{ marginBottom: 16 }}>
            <label>เลือกสินค้า</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} — {product.price} บาท (คงเหลือ {product.stock} {product.unit})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label>จำนวน</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
            />
          </div>

          {selectedProduct && (
            <p>
              ยอดรวม: <strong>{totalPrice.toLocaleString('th-TH')} บาท</strong>
            </p>
          )}

          {error && <p style={{ color: 'red' }}>{error}</p>}
          {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}

          <button type="submit" disabled={submitting || !selectedProduct}>
            {submitting ? 'กำลังบันทึก...' : 'ขาย'}
          </button>
        </form>
      )}
    </div>
  )
}
