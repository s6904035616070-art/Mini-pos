// API Route ฝั่ง server สำหรับส่งข้อความแจ้งเตือนเข้า Telegram
// เก็บ Bot Token ไว้ที่นี่เท่านั้น (ไม่ใช้ NEXT_PUBLIC_) เพื่อไม่ให้หลุดไปอยู่ในโค้ดฝั่ง browser

export async function POST(request) {
  try {
    const { text } = await request.json()

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

    // ถ้ายังไม่ได้ตั้งค่า env vars ให้ตอบกลับแบบไม่ error รุนแรง (ไม่ให้กระทบระบบขาย)
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return Response.json(
        { ok: false, message: 'Telegram config ยังไม่ถูกตั้งค่า' },
        { status: 200 }
      )
    }

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'HTML',
      }),
    })

    const result = await response.json()

    return Response.json({ ok: response.ok, result }, { status: 200 })
  } catch (error) {
    // ไม่ throw error ออกไป เพื่อไม่ให้กระทบหน้าขายสินค้า
    return Response.json(
      { ok: false, message: error.message },
      { status: 200 }
    )
  }
}
