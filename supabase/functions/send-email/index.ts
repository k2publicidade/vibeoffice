import "jsr:@supabase/functions-js/edge-runtime.d.ts"

interface EmailPayload {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: Array<{
    filename: string
    content: string
    contentType?: string
  }>
  tags?: Array<{
    name: string
    value: string
  }>
}

interface ResendResponse {
  id: string
  from: string
  to: string[]
  created_at: string
}

Deno.serve(async (req: Request) => {
  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    // Validar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse body
    const payload: EmailPayload = await req.json()

    // Validações básicas
    if (!payload.to || !payload.subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!payload.html && !payload.text) {
      return new Response(
        JSON.stringify({ error: 'Either html or text content is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Buscar API key do Resend (configurar no Supabase Dashboard)
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 501, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Configurar remetente padrão
    const defaultFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev'

    // Montar payload do Resend
    const resendPayload = {
      from: payload.from || defaultFrom,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      reply_to: payload.replyTo,
      cc: payload.cc ? (Array.isArray(payload.cc) ? payload.cc : [payload.cc]) : undefined,
      bcc: payload.bcc ? (Array.isArray(payload.bcc) ? payload.bcc : [payload.bcc]) : undefined,
      attachments: payload.attachments,
      tags: payload.tags,
    }

    // Enviar email via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', responseData)
      return new Response(
        JSON.stringify({
          error: 'Failed to send email',
          details: responseData
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Retornar sucesso
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        data: responseData as ResendResponse
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: (error as Error).message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
