#!/bin/bash

# Test if the Supabase Edge Function exists and works

echo "🧪 Testing Supabase Edge Function..."
echo ""

curl -X POST \
  'https://hotbmbscjxgayivmyenb.supabase.co/functions/v1/send-confirmation' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdGJtYnNjanhnYXlpdm15ZW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MjgyMDgsImV4cCI6MjA3NzAwNDIwOH0.8pU3MXu8ylwSORBzXMQqbQ6ZBKXh9tXWALiJo1A8E8M' \
  -d '{
    "email": "test@example.com",
    "full_name": "Test User",
    "confirmation_url": "https://example.com/confirm?token=test123"
  }'

echo ""
echo ""
echo "✅ If you see a successful response, the edge function works!"
echo "❌ If you see 404 or other error, you need to deploy it first."
