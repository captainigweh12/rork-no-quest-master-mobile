import { Webhook } from "standardwebhooks"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SEND_EMAIL_HOOK_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET')

console.log('🚀 Send Confirmation Email Function Started')
console.log('   Resend API Key exists:', !!RESEND_API_KEY)
console.log('   Webhook Secret exists:', !!SEND_EMAIL_HOOK_SECRET)

interface EmailRequest {
  email: string
  full_name?: string
  confirmation_url?: string
}

interface AuthHookRequest {
  type: string
  email: string
  user: {
    id: string
    email: string
    user_metadata?: {
      full_name?: string
    }
  }
  token_hash: string
  redirect_to?: string
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📧 Incoming request to send confirmation email')
    console.log('📧 Request URL:', req.url)
    console.log('📧 Request method:', req.method)
    
    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured',
          hint: 'Set RESEND_API_KEY secret in Supabase'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const rawBody = await req.text()
    console.log('📦 Raw body length:', rawBody.length)
    
    let body: any
    try {
      body = JSON.parse(rawBody)
    } catch (parseErr) {
      console.error('❌ Failed to parse body:', parseErr)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    
    console.log('📦 Request body type:', body.type || 'direct')
    
    if (body.type === 'confirmation' && SEND_EMAIL_HOOK_SECRET) {
      console.log('🔐 Verifying webhook signature...')
      
      const signature = req.headers.get('x-webhook-signature')
      if (!signature) {
        console.error('❌ Missing webhook signature header')
        return new Response(
          JSON.stringify({ error: 'Unauthorized hook: missing signature' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      const secret = SEND_EMAIL_HOOK_SECRET.replace(/^v1,whsec_/, 'whsec_')
      
      try {
        const wh = new Webhook(secret)
        wh.verify(rawBody, {
          'webhook-id': req.headers.get('webhook-id') || '',
          'webhook-timestamp': req.headers.get('webhook-timestamp') || '',
          'webhook-signature': signature,
        })
        console.log('✅ Webhook signature verified')
      } catch (err) {
        console.error('❌ Webhook verification failed:', err)
        return new Response(
          JSON.stringify({ error: 'Unauthorized hook: invalid signature' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }
    
    let email: string
    let full_name: string | undefined
    let confirmation_url: string
    
    if (body.type === 'confirmation') {
      console.log('🪝 Processing Auth Hook request')
      const authHook = body as AuthHookRequest
      email = authHook.email
      full_name = authHook.user?.user_metadata?.full_name
      
      const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://8081-i8uit1c71qmgs8e19qjxf-6532622b.e2b.app'
      confirmation_url = `${appBaseUrl}/verify-email?token_hash=${authHook.token_hash}&type=signup`
      
      if (authHook.redirect_to) {
        confirmation_url += `&redirect_to=${encodeURIComponent(authHook.redirect_to)}`
      }
    } else {
      console.log('📞 Processing direct call')
      const directCall = body as EmailRequest
      email = directCall.email
      full_name = directCall.full_name
      confirmation_url = directCall.confirmation_url || ''
    }
    
    console.log('📨 Sending to:', email)
    console.log('👤 Name:', full_name || 'User')
    console.log('🔗 Confirmation URL provided:', !!confirmation_url)

    const emailBody = {
      from: 'Rejection Hero <onboarding@resend.dev>',
      to: [email],
      subject: '🦸 Verify Your Email - Rejection Hero',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                margin: 0; 
                padding: 0; 
                background: #f5f5f5; 
              }
              .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background: white; 
              }
              .header { 
                background: linear-gradient(135deg, #FF6B2C 0%, #FF8F5C 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
              }
              .content { padding: 40px 30px; }
              .button { 
                display: inline-block;
                background: linear-gradient(135deg, #1a1f3a 0%, #2d3561 100%);
                color: white;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 600;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                padding: 30px;
                color: #999;
                font-size: 12px;
                border-top: 1px solid #eee;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🦸 Welcome to Rejection Hero!</h1>
              </div>
              <div class="content">
                <p style="font-size: 18px; margin-bottom: 20px;">
                  Hi ${full_name || 'there'}! 👋
                </p>
                <p>Thanks for joining Rejection Hero! Click the button below to verify your email and start your journey:</p>
                
                <div style="text-align: center;">
                  <a href="${confirmation_url}" class="button">
                    ✅ Verify My Email
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${confirmation_url}" style="color: #FF6B2C; word-break: break-all;">${confirmation_url}</a>
                </p>
                
                <p style="margin-top: 30px;">
                  Ready to build confidence through rejection? Let's go! 💪
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Rejection Hero</p>
                <p>Build confidence, one rejection at a time.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    }

    console.log('📤 Sending email via Resend...')
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailBody),
    })

    if (!res.ok) {
      const error = await res.text()
      console.error('❌ Resend API error:', error)
      console.error('❌ Status:', res.status)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: error, status: res.status }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const data = await res.json()
    console.log('✅ Email sent successfully!', data)

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('💥 Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    
    console.error('💥 Error details:', {
      message: errorMessage,
      stack: errorStack,
    })
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        stack: errorStack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
