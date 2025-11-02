import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { Resend } from "resend";

console.log('🚀 Backend starting up...');
console.log('📧 RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);
console.log('📧 RESEND_API_KEY preview:', process.env.RESEND_API_KEY?.substring(0, 10) + '...');
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

const app = new Hono();

app.use("*", cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'bypass-tunnel-reminder'],
  credentials: true,
}));

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
  })
);

app.get("/", (c) => {
  console.log('🏠 [ROOT] Root endpoint accessed');
  return c.json({
    status: "ok",
    message: "API is running",
    timestamp: new Date().toISOString(),
    env: {
      resend_configured: !!process.env.RESEND_API_KEY,
      node_env: process.env.NODE_ENV || 'development',
    }
  });
});

app.get("/api", (c) => {
  console.log('📡 [API] API root accessed');
  return c.json({
    status: "ok",
    message: "tRPC API is available at /api/trpc",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (c) => {
  console.log('\n🏥 [HEALTH] Health check requested');
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    backend: "running",
    env: {
      resend_configured: !!process.env.RESEND_API_KEY,
      resend_api_key_preview: process.env.RESEND_API_KEY?.substring(0, 10) + '...',
    }
  });
});

// Supabase Auth Hook endpoint for email verification
app.post("/api/auth/hook", async (c) => {
  console.log('\n🪝 [AUTH-HOOK] Supabase auth hook triggered');
  console.log('   Headers:', Object.fromEntries(c.req.raw.headers.entries()));
  
  try {
    const rawBody = await c.req.text();
    console.log('   Raw body length:', rawBody.length);
    
    const signature = c.req.header('webhook-signature') || c.req.header('x-supabase-signature');
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
    
    console.log('   Signature present:', !!signature);
    console.log('   Webhook secret present:', !!webhookSecret);
    
    if (webhookSecret && signature) {
      console.log('   ✅ Webhook signature verification enabled');
    } else {
      console.log('   ⚠️ Webhook signature verification skipped (missing secret or signature)');
    }
    
    const payload = JSON.parse(rawBody);
    console.log('   Event type:', payload.type);
    console.log('   User email:', payload.record?.email || payload.user?.email);

    // Handle different auth events
    switch (payload.type) {
      case 'user.created':
      case 'user.email_verification':
        return await handleEmailVerification(c, payload);
      
      case 'password_recovery':
        return await handlePasswordRecovery(c, payload);
      
      default:
        console.log('   ⚠️ Unhandled event type:', payload.type);
        return c.json({ success: true, message: 'Event received but not handled' });
    }
  } catch (err: any) {
    console.error('   💥 Error in auth hook:', err);
    return c.json({ 
      success: false, 
      error: err?.message ?? 'Unknown error' 
    }, 500);
  }
});

// Handler for email verification
async function handleEmailVerification(c: any, payload: any) {
  const { user } = payload;
  const email = user?.email;
  const confirmationUrl = user?.confirmation_url;
  
  if (!email) {
    console.error('   ❌ No email in payload');
    return c.json({ success: false, error: 'No email provided' }, 400);
  }

  console.log('   📧 Sending verification email to:', email);
  console.log('   🔗 Confirmation URL:', confirmationUrl);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('   ❌ RESEND_API_KEY not configured');
    return c.json({ success: false, error: 'Email service not configured' }, 500);
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
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
                background: linear-gradient(135deg, #FF6B2C 0%, #FF8F5C 100%);
                color: white;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 8px;
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
                  Hi there! 👋
                </p>
                <p>Thanks for joining Rejection Hero! Click the button below to verify your email and start your journey:</p>
                
                <div style="text-align: center;">
                  <a href="${confirmationUrl}" class="button">
                    ✅ Verify My Email
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${confirmationUrl}" style="color: #FF6B2C;">${confirmationUrl}</a>
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
    });

    if (error) {
      console.error('   ❌ Resend error:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log('   ✅ Verification email sent!');
    console.log('   Message ID:', data?.id);
    return c.json({ success: true, messageId: data?.id });
  } catch (err: any) {
    console.error('   💥 Exception sending email:', err);
    return c.json({ success: false, error: err?.message }, 500);
  }
}

// Handler for password recovery
async function handlePasswordRecovery(c: any, payload: any) {
  const { user } = payload;
  const email = user?.email;
  const resetUrl = user?.password_reset_url;
  
  if (!email || !resetUrl) {
    return c.json({ success: false, error: 'Missing email or reset URL' }, 400);
  }

  console.log('   🔑 Sending password recovery email to:', email);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return c.json({ success: false, error: 'Email service not configured' }, 500);
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: 'Rejection Hero <onboarding@resend.dev>',
      to: [email],
      subject: '🔐 Reset Your Password - Rejection Hero',
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
                background: linear-gradient(135deg, #1a1f3a 0%, #2d3561 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
              }
              .content { padding: 40px 30px; }
              .button { 
                display: inline-block;
                background: linear-gradient(135deg, #FF6B2C 0%, #FF8F5C 100%);
                color: white;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 8px;
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
                <h1>🔐 Reset Your Password</h1>
              </div>
              <div class="content">
                <p style="font-size: 18px; margin-bottom: 20px;">
                  Password Reset Request
                </p>
                <p>We received a request to reset your password. Click the button below to set a new password:</p>
                
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">
                    🔑 Reset Password
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  Or copy and paste this link:<br>
                  <a href="${resetUrl}" style="color: #FF6B2C;">${resetUrl}</a>
                </p>
                
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                  ⏱️ This link expires in 1 hour<br>
                  If you didn't request this, you can safely ignore this email.
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Rejection Hero</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('   ❌ Resend error:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log('   ✅ Password reset email sent!');
    return c.json({ success: true, messageId: data?.id });
  } catch (err: any) {
    console.error('   💥 Exception sending email:', err);
    return c.json({ success: false, error: err?.message }, 500);
  }
}

app.get("/api/test-email", async (c) => {
  console.log('\n🧪 [TEST-EMAIL] Request received');
  try {
    const to = c.req.query("to");
    const subject = c.req.query("subject") ?? "Quest App – Test Email";
    const text = c.req.query("text") ?? "This is a test email from Quest App backend.";

    console.log('   To:', to);
    console.log('   Subject:', subject);

    if (!to) {
      console.log('   ❌ Missing "to" parameter');
      return c.json({ success: false, error: "Missing 'to' query param" }, 400);
    }

    const apiKey = process.env.RESEND_API_KEY ?? "";
    console.log('   API Key exists:', !!apiKey);
    console.log('   API Key preview:', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET');
    
    if (!apiKey) {
      console.error('   ❌ RESEND_API_KEY is not set in environment');
      return c.json({ 
        success: false, 
        error: "Email service not configured - RESEND_API_KEY missing",
        debug: {
          env_keys: Object.keys(process.env).filter(k => k.includes('RESEND')),
          all_env_keys_count: Object.keys(process.env).length,
        }
      }, 500);
    }

    console.log('   Creating Resend client...');
    const resend = new Resend(apiKey);
    console.log('   Resend client created');

    console.log('   Sending email...');
    const { data, error } = await resend.emails.send({
      from: "Rejection Hero <onboarding@rejectionhero.com>",
      to,
      subject,
      text,
      html: `<p>${text}</p>`
    });

    if (error) {
      console.error('   ❌ Resend API error:', error);
      console.error('   Error type:', typeof error);
      console.error('   Error keys:', Object.keys(error));
      
      const errorMessage = (error as any)?.message || JSON.stringify(error);
      
      return c.json({ 
        success: false, 
        error: errorMessage,
        errorDetails: error,
      }, 500);
    }

    console.log('   ✅ Email sent successfully!');
    console.log('   Message ID:', data?.id);
    
    return c.json({ 
      success: true, 
      messageId: data?.id,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('   💥 Exception in /api/test-email:', err);
    console.error('   Error type:', typeof err);
    console.error('   Error message:', err?.message);
    console.error('   Error stack:', err?.stack);
    
    return c.json({ 
      success: false, 
      error: err?.message ?? "Unknown error",
      errorType: err?.constructor?.name,
      stack: err?.stack,
    }, 500);
  }
});

export default app;
