export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      return Response.json(
        { ok: false, message: 'รูปแบบ request body ไม่ถูกต้อง (ต้องเป็น JSON ที่มี text)' },
        { status: 400 }
      )
    }

    const { text } = body || {}
    if (!text || typeof text !== 'string') {
      return Response.json({ ok: false, message: 'กรุณาส่ง text ที่เป็นข้อความมาด้วย' }, { status: 400 })
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return Response.json({ ok: false, message: 'Telegram config ยังไม่ถูกตั้งค่า' }, { status: 200 })
    }

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text, parse_mode: 'HTML' }),
    })

    const result = await response.json()
    return Response.json({ ok: response.ok, result }, { status: 200 })
  } catch (error) {
    return Response.json({ ok: false, message: error.message }, { status: 200 })
  }
}
