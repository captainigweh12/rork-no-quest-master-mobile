import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { Resend } from "resend";

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
  return c.json({ status: "ok", message: "API is running" });
});

app.get("/api/test-email", async (c) => {
  try {
    const to = c.req.query("to");
    const subject = c.req.query("subject") ?? "Quest App – Test Email";
    const text = c.req.query("text") ?? "This is a test email from Quest App backend.";

    if (!to) {
      return c.json({ success: false, error: "Missing 'to' query param" }, 400);
    }

    const apiKey = process.env.RESEND_API_KEY ?? "";
    if (!apiKey) {
      console.error("[Resend] Missing RESEND_API_KEY env var");
      return c.json({ success: false, error: "Email service not configured" }, 500);
    }

    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: "Rejection Hero <onboarding@rejectionhero.com>",
      to,
      subject,
      text,
      html: `<p>${text}</p>`
    });

    if (error) {
      console.error("[Resend] Error sending test email:", error);
      return c.json({ success: false, error: (error as any)?.message ?? "Failed to send" }, 500);
    }

    return c.json({ success: true, messageId: data?.id });
  } catch (err: any) {
    console.error("[Resend] Exception in /api/test-email:", err);
    return c.json({ success: false, error: err?.message ?? "Unknown error" }, 500);
  }
});

export default app;
