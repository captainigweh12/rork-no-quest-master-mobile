import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5';

export const sendVerificationEmailProcedure = publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      fullName: z.string(),
      verificationCode: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      console.log('[Resend] Starting email send process...');
      console.log('[Resend] Target email:', input.email);
      console.log('[Resend] Full name:', input.fullName);
      console.log('[Resend] Verification code:', input.verificationCode);
      console.log('[Resend] API key present:', !!RESEND_API_KEY);
      console.log('[Resend] API key (first 10 chars):', RESEND_API_KEY?.substring(0, 10));
      
      if (!RESEND_API_KEY || RESEND_API_KEY === '') {
        console.error('[Resend] ❌ API key is missing or empty');
        return { 
          success: false, 
          error: 'Email service not configured. API key is missing.' 
        };
      }
      
      console.log('[Resend] Creating Resend client...');
      const resend = new Resend(RESEND_API_KEY);
      console.log('[Resend] Resend client created successfully');

      console.log('[Resend] Preparing email payload...');
      const emailPayload = {
        from: 'Rejection Hero <onboarding@rejectionhero.com>',
        to: [input.email],
        subject: 'Verify Your Email - Quest App',
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
      
      console.log('[Resend] Email payload prepared:', JSON.stringify({
        from: emailPayload.from,
        to: emailPayload.to,
        subject: emailPayload.subject,
        htmlLength: emailPayload.html.length
      }));
      
      console.log('[Resend] Calling resend.emails.send()...');
      const result = await resend.emails.send(emailPayload);
      console.log('[Resend] API call completed');
      console.log('[Resend] Full result:', JSON.stringify(result, null, 2));

      if (result.error) {
        console.error('[Resend] ❌ Error from Resend API:', result.error);
        console.error('[Resend] Error details:', JSON.stringify(result.error, null, 2));
        return { 
          success: false, 
          error: result.error.message || JSON.stringify(result.error) || 'Failed to send email' 
        };
      }

      console.log('[Resend] ✅ Email sent successfully!');
      console.log('[Resend] Message ID:', result.data?.id);
      return { success: true, messageId: result.data?.id };
    } catch (error: any) {
      console.error('[Resend] ❌ Exception caught in mutation:');
      console.error('[Resend] Error message:', error?.message);
      console.error('[Resend] Error name:', error?.name);
      console.error('[Resend] Error stack:', error?.stack);
      console.error('[Resend] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      return { 
        success: false, 
        error: error?.message || error?.toString() || 'Unknown error occurred while sending email' 
      };
    }
  });

export default sendVerificationEmailProcedure;
