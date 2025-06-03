# Realtor Coach - Deployment Guide

## Overview
This AI-powered communication training platform for real estate agents requires proper hosting to enable Twilio webhook connectivity and natural voice interactions.

## Hosting Requirements

### Recommended Hosting Platforms
- **DigitalOcean App Platform**
- **Vercel (with serverless functions)**
- **Railway**
- **Render**
- **AWS/Azure/GCP with proper SSL**

### Why Not Replit for Production
Replit's `.replit.app` domains have connectivity issues with external webhook services like Twilio, preventing real-time phone call integration.

## Environment Variables Required

```env
# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# ElevenLabs API (for natural voice synthesis)
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Application
NODE_ENV=production
PORT=5000
```

## Twilio Webhook Configuration

Once deployed to your domain (e.g., `https://yourdomain.com`), configure these webhook URLs in your Twilio Console:

1. **Phone Number Voice Configuration:**
   - Webhook URL: `https://yourdomain.com/api/twilio/voice-response`
   - HTTP Method: POST

2. **Voice Call Status:**
   - Status Callback URL: `https://yourdomain.com/api/twilio/call-status`
   - HTTP Method: POST

## Deployment Steps

### Option 1: DigitalOcean App Platform
1. Connect your GitHub repository
2. Set environment variables in App Platform dashboard
3. Deploy with Node.js buildpack
4. Configure custom domain with SSL

### Option 2: Railway
1. Connect repository to Railway
2. Add environment variables
3. Deploy automatically
4. Use provided railway.app domain or configure custom domain

### Option 3: Vercel
1. Import project to Vercel
2. Configure environment variables
3. Ensure serverless functions are properly configured
4. Deploy with custom domain

## Voice Enhancement Features

The app now includes:
- **Natural speech patterns** with filler words and hesitations
- **SSML breaks** for realistic pauses
- **Personality-based responses** (DISC profiling)
- **Conversational interruptions** and thinking sounds
- **Context-aware reactions** based on agent responses

## Testing Deployment

1. Visit `https://yourdomain.com/test` - should return JSON success
2. Test webhook: `https://yourdomain.com/api/twilio/voice-simple`
3. Call your Twilio number - should hear natural voice response
4. Monitor server logs for webhook activity

## Production Optimizations

- Enable SSL/TLS encryption
- Set up error monitoring (Sentry)
- Configure rate limiting
- Add request logging
- Set up health checks
- Configure automatic deployments

## Support

For deployment assistance or webhook connectivity issues, ensure your hosting platform supports:
- Node.js runtime
- External webhook callbacks
- SSL certificates
- Environment variable configuration