# Resend Email Setup Guide

This application uses [Resend](https://resend.com) to send confirmation emails to new users during sign-up.

## Setup Instructions

### 1. Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get Your API Key

1. Log in to your Resend dashboard
2. Navigate to the "API Keys" section
3. Click "Create API Key"
4. Give it a name (e.g., "Quest App Production")
5. Copy the API key (it will only be shown once)

### 3. Configure Your Environment

1. Open the `.env` file in the project root
2. Replace the placeholder with your actual Resend API key:

```env
RESEND_API_KEY=re_YourActualApiKeyHere
```

### 4. Set Up Your Domain (Optional, for Production)

By default, Resend allows you to send emails from `onboarding@resend.dev` for testing.

For production use:
1. Add and verify your domain in the Resend dashboard
2. Update the "from" address in `backend/trpc/routes/auth/send-verification-email/route.ts`:

```typescript
from: 'Quest App <noreply@yourdomain.com>',
```

## How It Works

### Sign-Up Flow

1. User fills out the sign-up form with email, password, and full name
2. System creates a local user account with an email verification code
3. System calls the tRPC endpoint `auth.sendVerificationEmail`
4. Resend sends a beautiful HTML email with the verification code
5. User enters the code on the verification page
6. Account is activated and user can sign in

### Email Template

The verification email includes:
- A personalized greeting with the user's name
- A 6-character verification code (uppercase alphanumeric)
- A visually appealing design with gradients and proper formatting
- Mobile-responsive HTML

### Resend Features Used

- ✉️ **Email Sending**: Reliable email delivery via Resend API
- 🎨 **HTML Templates**: Beautiful, mobile-responsive emails
- 📊 **Email Tracking**: See delivery status in Resend dashboard
- 🔐 **Secure**: API key authentication

## Testing

### Development Mode

In development, you can:
1. Use the default `onboarding@resend.dev` sender address
2. Check the console logs for the verification code
3. Monitor email delivery in the Resend dashboard

### Verification Code

For testing purposes, the verification code is also logged to the console:
```
[localStorage] Verification code for user@example.com: ABC123
```

## Troubleshooting

### Email Not Sending

1. **Check API Key**: Ensure `RESEND_API_KEY` is set correctly in `.env`
2. **Check Console**: Look for error messages in the server console
3. **Resend Dashboard**: Check the "Logs" section in Resend dashboard
4. **Rate Limits**: Free tier has sending limits (100 emails/day)

### Email Going to Spam

1. Verify your domain in Resend
2. Set up proper SPF, DKIM, and DMARC records
3. Use a custom domain instead of `resend.dev`

### API Key Not Working

1. Make sure you copied the full API key
2. Ensure there are no extra spaces or quotes
3. Restart the development server after changing `.env`

## API Endpoints

### Send Verification Email

**Endpoint**: `auth.sendVerificationEmail`

**Type**: Mutation

**Input**:
```typescript
{
  email: string;
  fullName: string;
  verificationCode: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  messageId?: string;
  error?: string;
}
```

## Email Customization

To customize the email template, edit:
`backend/trpc/routes/auth/send-verification-email/route.ts`

You can modify:
- Email subject
- HTML content
- Styling (colors, fonts, layout)
- Branding elements

## Production Considerations

1. **Domain Verification**: Verify your domain before going to production
2. **From Address**: Use a branded email address
3. **Error Handling**: Monitor failed sends and implement retry logic
4. **Email Templates**: Consider using a template engine for complex emails
5. **Rate Limits**: Upgrade your Resend plan if you need higher limits
6. **Monitoring**: Set up alerts for failed email deliveries

## Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend React Email](https://react.email) - Build emails with React components
- [Email Best Practices](https://resend.com/docs/knowledge-base/email-best-practices)

## Support

For issues specific to Resend:
- Visit [Resend Support](https://resend.com/support)
- Check [Resend Status Page](https://status.resend.com)

For application-specific issues:
- Check the console logs
- Review the tRPC endpoint implementation
- Verify the authentication flow
