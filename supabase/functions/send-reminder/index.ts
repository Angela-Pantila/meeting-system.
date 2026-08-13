import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { meetingId, message } = await req.json()
    if (!meetingId || !message) {
      return new Response(JSON.stringify({ error: 'meetingId and message are required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization') || ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: userErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('id, role, department_id')
      .eq('id', user.id)
      .single()

    const { data: meeting } = await supabase
      .from('meetings')
      .select('id, title, department_id, start_time, end_time')
      .eq('id', meetingId)
      .single()

    if (!meeting) {
      return new Response(JSON.stringify({ error: 'Meeting not found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const isAdmin = senderProfile?.role === 'admin'
    const isDeptAdmin = senderProfile?.role === 'head' && senderProfile?.department_id === meeting.department_id
    if (!isAdmin && !isDeptAdmin) {
      return new Response(JSON.stringify({ error: 'Only managers can send reminders' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { data: participants } = await supabase
      .from('meeting_participants')
      .select('profile:profiles(email, full_name)')
      .eq('meeting_id', meetingId)

    const emails = participants
      ?.map((p) => p.profile?.email)
      .filter(Boolean)

    if (!emails?.length) {
      return new Response(JSON.stringify({ sent: 0, message: 'No participant emails' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const resend = new Resend(apiKey)
    const from = Deno.env.get('RESEND_FROM_EMAIL') || 'Meetings <onboarding@resend.dev>'
    const meetingTime = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date(meeting.start_time))

    let sent = 0
    for (const email of emails) {
      try {
        const { error } = await resend.emails.send({
          from,
          to: [email],
          subject: `Reminder: ${meeting.title}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="margin:0 0 8px">${meeting.title}</h2>
              <p style="color:#475569;font-size:14px;margin:0 0 16px">${meetingTime}</p>
              <p style="font-size:15px;line-height:1.5;white-space:pre-line">${message}</p>
            </div>
          `,
        })
        if (error) console.error('send failed for', email, error)
        else sent += 1
      } catch (err) {
        console.error('send error for', email, err)
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
