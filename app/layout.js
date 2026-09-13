import './globals.css'

export const metadata = {
  title: 'SWEETIE BLOOM',
  description: 'Mini POS สำหรับร้านลิป SWEETIE BLOOM',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <header className="site-header">
          <div className="brand">SWEETIE BLOOM</div>
          <nav className="main-nav">
            <a href="/">หน้าหลัก</a>
            <a href="/sell">ขายสินค้า</a>
            <a href="/history">ประวัติการขาย</a>
          </nav>
        </header>
        <main className="site-main">{children}</main>
      </body>
    </html>
  )
}
