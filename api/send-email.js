import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { to, subject, html } = req.body
    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'to, subject, and html are required' })
    }

    const gmailUser = process.env.GMAIL_USER
    const gmailPass = process.env.GMAIL_APP_PASSWORD
    if (!gmailUser || !gmailPass) {
      return res.status(500).json({ error: 'GMAIL_USER or GMAIL_APP_PASSWORD not set in Vercel env' })
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    })

    const recipients = Array.isArray(to) ? to : [to]
    let sent = 0
    const errors = []

    for (const email of recipients) {
      try {
        await transporter.sendMail({
          from: `"Meeting System" <${gmailUser}>`,
          to: email,
          subject,
          html,
        })
        sent += 1
      } catch (err) {
        errors.push({ email, error: err.message })
      }
    }

    return res.status(200).json({ sent, errors })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
