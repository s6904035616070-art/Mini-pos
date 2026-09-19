'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

// เกณฑ์แจ้งเตือนสต๊อกเหลือน้อย
const LOW_STOCK_THRESHOLD = 5

export default function SellPage() {
  // รายการสินค้าทั้งหมด (ไว้ใช้ทำ dropdown)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // ฟอร์มขายสินค้า: สินค้าที่เลือก + จำนวน
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

  // ยิงข้อความแจ้งเตือนไปยัง API route ฝั่ง server (async/try-catch แยกจาก flow หลัก)
  async function sendTelegramNotification(text) {
    try {
      await fetch('/api/notify-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
    } catch (notifyError) {
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
    if (quantity > selectedProduct.stock) {
      setError(`สต็อกไม่เพียงพอ (คงเหลือ ${selectedProduct.stock} ${selectedProduct.unit})`)
      return
    }

    setSubmitting(true)
    const soldAt = new Date().toISOString()

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

    // --- แจ้งเตือน Telegram หลังตัดสต๊อกสำเร็จ ---
    const displayTime = new Date().toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

    const orderMessage =
      `🛍️ <b>มีรายการขายใหม่!</b>\n` +
      `- สินค้า: ${selectedProduct.name}\n` +
      `- จำนวน: ${quantity} ชิ้น\n` +
      `- ราคารวม: ${totalPrice} บาท\n` +
      `- สต๊อกคงเหลือปัจจุบัน: ${newStock} ชิ้น\n` +
      `- เวลา: ${displayTime}`
    sendTelegramNotification(orderMessage)

    if (newStock <= LOW_STOCK_THRESHOLD) {
      const lowStockMessage =
        `🚨 <b>[เตือนภัย] สต๊อกสินค้าใกล้หมด!</b>\n` +
        `- สินค้า: ${selectedProduct.name}\n` +
        `- คงเหลือเพียง: ${newStock} ชิ้น\n` +
        `⚠️ กรุณาเติมสต๊อกสินค้าด่วน!`
      sendTelegramNotification(lowStockMessage)
    }
    // --- จบส่วนแจ้งเตือน ---

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
            <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
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
            <p>ยอดรวม: <strong>{totalPrice.toLocaleString('th-TH')} บาท</strong></p>
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

