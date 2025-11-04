import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { Resend } from "resend";



const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "bypass-tunnel-reminder",
      "x-agora-mint-key",
      "x-videosdk-mint-key",
    ],
    credentials: false,
  })
);

/**
 * IMPORTANT: tell the adapter the exact endpoint we're mounted at.
 * Without `endpoint: '/api/trpc'`, the adapter may treat the remaining
 * path as 'trpc/agora.env' instead of 'agora.env'.
 */
app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    endpoint: "/api/trpc",
  })
);

// ---- simple diagnostics ----
app.get("/", (c) => {
  console.log("🏠 [ROOT] Root endpoint accessed");
  return c.json({
    status: "ok",
    message: "API is running",
    timestamp: new Date().toISOString(),
    env: {
      resend_configured: !!process.env.RESEND_API_KEY,
      node_env: process.env.NODE_ENV || "development",
    },
  });
});

app.get("/api", (c) => {
  console.log("📡 [API] API root accessed");
  return c.json({
    status: "ok",
    message: "tRPC API is available at /api/trpc",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (c) => {
  console.log("\n🏥 [HEALTH] Health check requested");
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    backend: "running",
    env: {
      resend_configured: !!process.env.RESEND_API_KEY,
      resend_api_key_preview:
        (process.env.RESEND_API_KEY?.substring(0, 10) || "") + "...",
    },
  });
});

app.get("/api/trpc-routes", (c) => {
  console.log("\n🔍 [ROUTES] tRPC routes diagnostic requested");
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    routes: {
      example: {
        hi: "query",
      },
      agora: {
        env: "query",
        token: "query",
      },
      videosdk: {
        getToken: "query",
        createMeeting: "mutation",
        validateMeeting: "query",
        checkConfig: "query",
      },
    },
    endpoints: {
      health: "/api/health",
      trpc: "/api/trpc",
      checkConfig: "/api/trpc/videosdk.checkConfig",
      getToken: "/api/trpc/videosdk.getToken",
    },
    env_check: {
      videosdk_api_key: !!process.env.VIDEOSDK_API_KEY,
      videosdk_secret_key: !!process.env.VIDEOSDK_SECRET_KEY,
    },
  });
});

// ---------------- Email Hook handlers (unchanged) ----------------

app.post("/api/auth/hook", async (c) => {
  console.log("\n🪝 [AUTH-HOOK] Supabase auth hook triggered");
  console.log("   Headers:", Object.fromEntries(c.req.raw.headers.entries()));

  try {
    const rawBody = await c.req.text();
    console.log("   Raw body length:", rawBody.length);

    const signature =
      c.req.header("webhook-signature") || c.req.header("x-supabase-signature");
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;

    console.log("   Signature present:", !!signature);
    console.log("   Webhook secret present:", !!webhookSecret);

    if (webhookSecret && signature) {
      console.log("   ✅ Webhook signature verification enabled");
    } else {
      console.log(
        "   ⚠️ Webhook signature verification skipped (missing secret or signature)"
      );
    }

    const payload = JSON.parse(rawBody);
    console.log("   Event type:", payload.type);
    console.log("   User email:", payload.record?.email || payload.user?.email);

    switch (payload.type) {
      case "user.created":
      case "user.email_verification":
        return await handleEmailVerification(c, payload);
      case "password_recovery":
        return await handlePasswordRecovery(c, payload);
      default:
        console.log("   ⚠️ Unhandled event type:", payload.type);
        return c.json({ success: true, message: "Event received but not handled" });
    }
  } catch (err: any) {
    console.error("   💥 Error in auth hook:", err);
    return c.json(
      {
        success: false,
        error: err?.message ?? "Unknown error",
      },
      500
    );
  }
});

async function handleEmailVerification(c: any, payload: any) {
  const { user } = payload;
  const email = user?.email;
  const confirmationUrl = user?.confirmation_url;

  if (!email) {
    console.error("   ❌ No email in payload");
    return c.json({ success: false, error: "No email provided" }, 400);
  }

  console.log("   📧 Sending verification email to:", email);
  console.log("   🔗 Confirmation URL:", confirmationUrl);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("   ❌ RESEND_API_KEY not configured");
    return c.json({ success: false, error: "Email service not configured" }, 500);
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: "Rejection Hero <onboarding@resend.dev>",
      to: [email],
      subject: "🦸 Verify Your Email - Rejection Hero",
      html: `...omitted for brevity...`,
    });

    if (error) {
      console.error("   ❌ Resend error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log("   ✅ Verification email sent!");
    console.log("   Message ID:", data?.id);
    return c.json({ success: true, messageId: data?.id });
  } catch (err: any) {
    console.error("   💥 Exception sending email:", err);
    return c.json({ success: false, error: err?.message }, 500);
  }
}

async function handlePasswordRecovery(c: any, payload: any) {
  const { user } = payload;
  const email = user?.email;
  const resetUrl = user?.password_reset_url;

  if (!email || !resetUrl) {
    return c.json({ success: false, error: "Missing email or reset URL" }, 400);
  }

  console.log("   🔑 Sending password recovery email to:", email);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return c.json({ success: false, error: "Email service not configured" }, 500);
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: "Rejection Hero <onboarding@resend.dev>",
      to: [email],
      subject: "🔐 Reset Your Password - Rejection Hero",
      html: `...omitted for brevity...`,
    });

    if (error) {
      console.error("   ❌ Resend error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log("   ✅ Password reset email sent!");
    return c.json({ success: true, messageId: data?.id });
  } catch (err: any) {
    console.error("   💥 Exception sending email:", err);
    return c.json({ success: false, error: err?.message }, 500);
  }
}

app.get("/api/test-email", async (c) => {
  console.log("\n🧪 [TEST-EMAIL] Request received");
  try {
    const to = c.req.query("to");
    const subject = c.req.query("subject") ?? "Quest App – Test Email";
    const text = c.req.query("text") ?? "This is a test email from Quest App backend.";

    if (!to) {
      return c.json({ success: false, error: "Missing 'to' query param" }, 400);
    }

    const apiKey = process.env.RESEND_API_KEY ?? "";
    if (!apiKey) {
      return c.json(
        {
          success: false,
          error: "Email service not configured - RESEND_API_KEY missing",
        },
        500
      );
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: "Rejection Hero <onboarding@rejectionhero.com>",
      to,
      subject,
      text,
      html: `<p>${text}</p>`,
    });

    if (error) {
      return c.json({ success: false, error: (error as any)?.message || String(error) }, 500);
    }

    return c.json({
      success: true,
      messageId: data?.id,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return c.json(
      {
        success: false,
        error: err?.message ?? "Unknown error",
        errorType: err?.constructor?.name,
        stack: err?.stack,
      },
      500
    );
  }
});

export default app;
