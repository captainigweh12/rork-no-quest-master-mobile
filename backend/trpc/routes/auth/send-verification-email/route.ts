import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';

console.log('\n🔑 [EMAIL ROUTE] Module loaded');
console.log('   RESEND_API_KEY exists:', !!RESEND_API_KEY);
console.log('   RESEND_API_KEY preview:', RESEND_API_KEY ? RESEND_API_KEY.substring(0, 10) + '...' : 'NOT SET');

function toErrorString(err: unknown): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export const sendVerificationEmailProcedure = publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      fullName: z.string(),
      verificationCode: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('\n📧 [tRPC EMAIL] Mutation called');
    console.log('   Email:', input.email);
    console.log('   Full name:', input.fullName);
    console.log('   Verification code:', input.verificationCode);
    console.log('   API key at runtime:', !!process.env.RESEND_API_KEY);
    console.log('   API key preview:', process.env.RESEND_API_KEY?.substring(0, 10) + '...');
    
    try {

      const apiKey = process.env.RESEND_API_KEY ?? RESEND_API_KEY;
      
      if (!apiKey) {
        console.error('   ❌ RESEND_API_KEY is not set');
        console.error('   Available env vars:', Object.keys(process.env).filter(k => k.includes('RESEND')));
        return {
          success: false,
          error: 'Email service not configured. RESEND_API_KEY is missing.',
          debug: {
            env_resend_keys: Object.keys(process.env).filter(k => k.includes('RESEND')),
            total_env_keys: Object.keys(process.env).length,
          }
        };
      }

      console.log('   Creating Resend client...');
      const resend = new Resend(apiKey);
      console.log('   Resend client created');
      console.log('   Using API key:', apiKey.substring(0, 10) + '...');

      console.log('   Preparing email payload...');
      const emailPayload = {
        from: 'Rejection Hero <onboarding@rejectionhero.com>',
        to: [input.email] as string[],
        subject: 'Verify Your Email - Quest App',
        text: `Hi ${input.fullName}, your verification code is ${input.verificationCode}. This code expires in 24 hours.`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Verify Your Email</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Quest App!</h1>
              </div>
              <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <h2 style="color: #333; margin-top: 0;">Hi ${input.fullName},</h2>
                <p style="font-size: 16px; color: #666;">Thank you for signing up! To complete your registration and start your quest journey, please verify your email address.</p>
                <div style="background: #f7f7f7; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 5px;">
                  <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your verification code is:</p>
                  <p style="margin: 0; font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; text-align: center;">${input.verificationCode}</p>
                </div>
                <p style="font-size: 14px; color: #999; margin-top: 30px;">This code will expire in 24 hours. If you didn't create an account with Quest App, please ignore this email.</p>
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="font-size: 12px; color: #999; margin: 0;">Best regards,<br>The Quest App Team</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

      console.log('   Email from:', emailPayload.from);
      console.log('   Email to:', emailPayload.to);
      console.log('   Email subject:', emailPayload.subject);
      console.log('   HTML length:', emailPayload.html.length);

      console.log('   Calling Resend API...');
      const { data, error } = await resend.emails.send(emailPayload);
      console.log('   Resend API call completed');

      if (error) {
        console.error('   ❌ Resend API returned error:');
        console.error('   Error type:', typeof error);
        console.error('   Error:', error);
        
        const errorText = toErrorString(error);
        console.error('   Error string:', errorText);
        
        return {
          success: false,
          error: errorText || 'Failed to send email',
        };
      }

      console.log('   ✅ Email sent successfully!');
      console.log('   Message ID:', data?.id);
      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error('   💥 Exception caught:');
      console.error('   Error type:', typeof error);
      console.error('   Error:', error);
      
      const errText = toErrorString(error);
      console.error('   Error string:', errText);
      
      return {
        success: false,
        error: errText,
      };
    }
  });

export default sendVerificationEmailProcedure;
