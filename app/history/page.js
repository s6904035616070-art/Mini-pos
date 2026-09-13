'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function HistoryPage() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSales()
  }, [])

  async function fetchSales() {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('sold_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setSales(data)
    }

    setLoading(false)
  }

  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_price), 0)

  function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  return (
    <div>
      <h1>ประวัติการขาย</h1>

      {loading && <p>กำลังโหลดข้อมูล...</p>}
      {error && <p style={{ color: 'red' }}>เกิดข้อผิดพลาด: {error}</p>}

      {!loading && !error && (
        <>
          <div className="card">
            <p style={{ margin: 0 }}>
              ยอดขายรวมทั้งหมด: <strong>{totalRevenue.toLocaleString('th-TH')} บาท</strong>
            </p>
          </div>

          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>วันที่/เวลา</th>
                  <th>สินค้า</th>
                  <th>จำนวน</th>
                  <th>ยอดรวม</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{formatDate(sale.sold_at)}</td>
                    <td>{sale.product_name}</td>
                    <td>{sale.quantity}</td>
                    <td>{Number(sale.total_price).toLocaleString('th-TH')} บาท</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {sales.length === 0 && <p>ยังไม่มีประวัติการขาย</p>}
          </div>
        </>
      )}
    </div>
  )
}
