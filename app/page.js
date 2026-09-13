'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function HomePage() {
  // รายการสินค้าทั้งหมดที่ดึงมาจาก Supabase
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ฟอร์มสำหรับเพิ่มสินค้าใหม่
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    price: '',
    stock: '',
    unit: '',
  })
  const [adding, setAdding] = useState(false)

  // สถานะสำหรับแก้ไขสินค้าแบบ inline (เก็บ id แถวที่กำลังแก้ไข + ค่าที่แก้ไข)
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  // ดึงรายการสินค้าทั้งหมด เรียงตามชื่อ
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
    }

    setLoading(false)
  }

  // เพิ่มสินค้าใหม่
  async function handleAddProduct(e) {
    e.preventDefault()
    setError(null)

    if (!newProduct.sku || !newProduct.name) {
      setError('กรุณากรอก SKU และชื่อสินค้า')
      return
    }

    setAdding(true)

    const { error } = await supabase.from('products').insert({
      sku: newProduct.sku,
      name: newProduct.name,
      price: parseFloat(newProduct.price) || 0,
      stock: parseInt(newProduct.stock, 10) || 0,
      unit: newProduct.unit || 'ชิ้น',
    })

    if (error) {
      setError(error.message)
      setAdding(false)
      return
    }

    // เคลียร์ฟอร์มและโหลดรายการใหม่
    setNewProduct({ sku: '', name: '', price: '', stock: '', unit: '' })
    setAdding(false)
    fetchProducts()
  }

  // เริ่มแก้ไขแถว: จำ id และก๊อปค่าปัจจุบันมาใส่ editValues
  function startEdit(product) {
    setEditingId(product.id)
    setEditValues({
      sku: product.sku,
      name: product.name,
      price: product.price,
      stock: product.stock,
      unit: product.unit,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValues({})
  }

  // บันทึกการแก้ไขแถวที่กำลังแก้อยู่
  async function saveEdit(id) {
    setSavingEdit(true)
    setError(null)

    const { error } = await supabase
      .from('products')
      .update({
        sku: editValues.sku,
        name: editValues.name,
        price: parseFloat(editValues.price) || 0,
        stock: parseInt(editValues.stock, 10) || 0,
        unit: editValues.unit,
      })
      .eq('id', id)

    if (error) {
      setError(error.message)
      setSavingEdit(false)
      return
    }

    setSavingEdit(false)
    setEditingId(null)
    setEditValues({})
    fetchProducts()
  }

  // ลบสินค้า (มี confirm กันกดพลาด)
  async function handleDelete(id, name) {
    const confirmed = window.confirm(`ต้องการลบ "${name}" ใช่หรือไม่?`)
    if (!confirmed) return

    setError(null)

    const { error } = await supabase.from('products').delete().eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    fetchProducts()
  }

  return (
    <div>
      <h1>สินค้าและสต็อกคงเหลือ</h1>

      {error && <p style={{ color: 'red' }}>เกิดข้อผิดพลาด: {error}</p>}

      {/* ฟอร์มเพิ่มสินค้าใหม่ */}
      <form className="card" onSubmit={handleAddProduct}>
        <h3 style={{ marginTop: 0 }}>เพิ่มสินค้าใหม่</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <label>SKU</label>
            <input
              type="text"
              value={newProduct.sku}
              onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
              placeholder="LP-XX-20"
            />
          </div>
          <div>
            <label>ชื่อสินค้า</label>
            <input
              type="text"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              placeholder="ชื่อสินค้า"
            />
          </div>
          <div>
            <label>ราคา</label>
            <input
              type="number"
              step="0.01"
              value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              placeholder="249"
            />
          </div>
          <div>
            <label>สต็อก</label>
            <input
              type="number"
              value={newProduct.stock}
              onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
              placeholder="1000"
            />
          </div>
          <div>
            <label>หน่วย</label>
            <input
              type="text"
              value={newProduct.unit}
              onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
              placeholder="ชิ้น"
            />
          </div>
        </div>
        <button type="submit" disabled={adding}>
          {adding ? 'กำลังบันทึก...' : 'เพิ่มสินค้า'}
        </button>
      </form>

      {/* ตารางรายการสินค้า */}
      <div className="card">
        {loading && <p>กำลังโหลดข้อมูล...</p>}

        {!loading && (
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>ชื่อสินค้า</th>
                <th>ราคา</th>
                <th>คงเหลือ</th>
                <th>หน่วย</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const isEditing = editingId === product.id

                return (
                  <tr key={product.id}>
                    {isEditing ? (
                      // แถวที่กำลังแก้ไข: แสดง input แทนข้อความ
                      <>
                        <td>
                          <input
                            type="text"
                            value={editValues.sku}
                            onChange={(e) =>
                              setEditValues({ ...editValues, sku: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={editValues.name}
                            onChange={(e) =>
                              setEditValues({ ...editValues, name: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.price}
                            onChange={(e) =>
                              setEditValues({ ...editValues, price: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={editValues.stock}
                            onChange={(e) =>
                              setEditValues({ ...editValues, stock: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={editValues.unit}
                            onChange={(e) =>
                              setEditValues({ ...editValues, unit: e.target.value })
                            }
                          />
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => saveEdit(product.id)}
                            disabled={savingEdit}
                            style={{ marginRight: 6 }}
                          >
                            บันทึก
                          </button>
                          <button type="button" onClick={cancelEdit}>
                            ยกเลิก
                          </button>
                        </td>
                      </>
                    ) : (
                      // แถวปกติ: แสดงข้อความ
                      <>
                        <td>{product.sku}</td>
                        <td>{product.name}</td>
                        <td>{product.price} บาท</td>
                        <td>{product.stock}</td>
                        <td>{product.unit}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => startEdit(product)}
                            style={{ marginRight: 6 }}
                          >
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product.id, product.name)}
                            style={{ background: '#C0392B' }}
                          >
                            ลบ
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {!loading && products.length === 0 && <p>ยังไม่มีข้อมูลสินค้าในระบบ</p>}
      </div>
    </div>
  )
}
