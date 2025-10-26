-- This SQL creates a trigger that automatically sends confirmation emails
-- when a new user signs up

-- First, create a function that calls our edge function
CREATE OR REPLACE FUNCTION public.send_confirmation_email()
RETURNS TRIGGER AS $$
DECLARE
  confirmation_url TEXT;
BEGIN
  -- Generate confirmation URL
  confirmation_url := current_setting('app.settings.site_url', true) || '/auth/confirm?token=' || NEW.confirmation_token;
  
  -- Call the edge function
  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-confirmation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'email', NEW.email,
        'full_name', NEW.raw_user_meta_data->>'full_name',
        'confirmation_url', confirmation_url
      )
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.confirmation_token IS NOT NULL)
  EXECUTE FUNCTION public.send_confirmation_email();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.send_confirmation_email() TO postgres;
GRANT EXECUTE ON FUNCTION public.send_confirmation_email() TO service_role;
