import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { Resend } from 'resend';

const RESEND_API_KEY = 're_8NoeRnFF_PyYgE55LwbtHnUmC3TJ3CkD5';

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
      console.log('[Resend] Sending verification email to:', input.email);
      console.log('[Resend] Using API key:', RESEND_API_KEY ? 'Found' : 'Missing');
      
      if (!RESEND_API_KEY) {
        console.error('[Resend] API key is not configured');
        return { 
          success: false, 
          error: 'Email service not configured. Please check with the code in console.' 
        };
      }
      
      const resend = new Resend(RESEND_API_KEY);

      const { data, error } = await resend.emails.send({
        from: 'Quest App <onboarding@resend.dev>',
        to: input.email,
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
      });

      if (error) {
        console.error('[Resend] Error sending email:', error);
        return { success: false, error: error.message || 'Failed to send email' };
      }

      console.log('[Resend] Email sent successfully:', data);
      return { success: true, messageId: data?.id };
    } catch (error: any) {
      console.error('[Resend] Exception sending email:', error);
      return { success: false, error: error?.message || 'Unknown error occurred' };
    }
  });

export default sendVerificationEmailProcedure;
