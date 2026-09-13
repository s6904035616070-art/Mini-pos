'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function SellPage() {
  const [products, setProducts] = useState([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
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

  async function handleSell(e) {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!selectedProduct) {
      setError('กรุณาเลือกสินค้า')
      return
    }

    if (quantity < 1) {
      setError('จำนวนต้องมากกว่า 0')
      return
    }

    if (quantity > selectedProduct.stock) {
      setError('สต็อกไม่เพียงพอ')
      return
    }

    setSubmitting(true)

    const { error: saleError } = await supabase.from('sales').insert({
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: quantity,
      total_price: totalPrice,
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

    setSuccessMessage(
      `ขาย ${selectedProduct.name} จำนวน ${quantity} ${selectedProduct.unit} สำเร็จ`
    )
    setQuantity(1)
    setSubmitting(false)
    fetchProducts()
  }

  return (
    <div>
      <h1>ขายสินค้า</h1>

      {loading && <p>กำลังโหลดข้อมูล...</p>}

      {!loading && (
        <form className="card" onSubmit={handleSell}>
          <div style={{ marginBottom: 16 }}>
            <label>เลือกสินค้า</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} (คงเหลือ {product.stock} {product.unit})
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
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          {selectedProduct && (
            <p>
              ราคารวม: <strong>{totalPrice} บาท</strong>
            </p>
          )}

          {error && <p style={{ color: 'red' }}>{error}</p>}
          {successMessage && (
            <p style={{ color: 'green' }}>{successMessage}</p>
          )}

          <button type="submit" disabled={submitting || !selectedProduct}>
            {submitting ? 'กำลังบันทึก...' : 'ยืนยันการขาย'}
          </button>
        </form>
      )}
    </div>
  )
}
