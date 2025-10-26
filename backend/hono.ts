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

app.use("*", cors());

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
  })
);

app.get("/", (c) => {
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
