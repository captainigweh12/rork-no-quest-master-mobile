// @ts-nocheck
import { Webhook } from "npm:standardwebhooks@1.0.0";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SEND_EMAIL_HOOK_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET');

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  
  if (url.pathname === '/' && req.method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'ok',
      message: 'Send confirmation email function is running',
      routes: {
        'POST /': 'Handle Supabase send email hook'
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 405
    });
  }

  try {
    const body = await req.text();
    
    if (SEND_EMAIL_HOOK_SECRET) {
      const signature = req.headers.get('X-Webhook-Signature');
      if (!signature) {
        console.error('❌ Missing webhook signature');
        return new Response(JSON.stringify({ error: 'Missing signature' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 401
        });
      }

      try {
        const secret = SEND_EMAIL_HOOK_SECRET.replace('v1,whsec_', '').replace('whsec_', '');
        const wh = new Webhook(secret);
        wh.verify(body, {
          'webhook-signature': signature
        });
        console.log('✅ Webhook signature verified');
      } catch (err) {
        console.error('❌ Webhook verification failed:', err);
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 401
        });
      }
    }

    const payload = JSON.parse(body);
    console.log('📧 Received email hook:', payload.email_action_type);

    if (payload.email_action_type !== 'signup') {
      console.log('ℹ️ Not a signup email, skipping');
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }

    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not set');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }

    const confirmationUrl = payload.token_hash 
      ? `${payload.site_url}/verify-email?token_hash=${payload.token_hash}&type=signup`
      : payload.confirmation_url;

    console.log('📧 Sending email to:', payload.email_data.to);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'QuestMatch <onboarding@resend.dev>',
        to: payload.email_data.to,
        subject: 'Confirm your email for QuestMatch',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to QuestMatch! 🎯</h1>
              </div>
              <div style="background: white; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; margin-bottom: 20px;">Hey there!</p>
                <p style="font-size: 16px; margin-bottom: 20px;">Thanks for signing up! We're excited to have you join our community of adventurers.</p>
                <p style="font-size: 16px; margin-bottom: 30px;">Click the button below to confirm your email and start your journey:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${confirmationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Confirm Email</a>
                </div>
                <p style="font-size: 14px; color: #666; margin-top: 30px;">Or copy and paste this link into your browser:</p>
                <p style="font-size: 12px; color: #999; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px;">${confirmationUrl}</p>
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                <p style="font-size: 12px; color: #999; margin-bottom: 0;">If you didn't create an account, you can safely ignore this email.</p>
              </div>
            </body>
          </html>
        `
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('❌ Resend API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: errorText }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }

    const result = await emailResponse.json();
    console.log('✅ Email sent successfully:', result);

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('💥 Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
