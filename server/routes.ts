import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSessionSchema, insertMessageSchema, insertUserSchema } from "@shared/schema";
import OpenAI from "openai";
import multer from "multer";
import { createClient } from "@deepgram/sdk";
import { WebSocketServer } from "ws";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "your-openai-api-key"
});

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  
  // User routes
  app.get("/api/user/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.patch("/api/user/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      const user = await storage.updateUser(userId, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Session routes
  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: "Invalid session data" });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.get("/api/users/:userId/sessions", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const sessions = await storage.getUserSessions(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user sessions" });
    }
  });

  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const updates = req.body;
      const session = await storage.updateSession(sessionId, updates);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  // Message routes
  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      
      // If this is an agent message, generate AI response and feedback in parallel
      if (messageData.isAgent) {
        const session = await storage.getSession(messageData.sessionId!);
        if (session) {
          // Get conversation history for context
          const messages = await storage.getSessionMessages(messageData.sessionId!);
          
          // Run both AI response and feedback analysis in parallel for speed
          const [aiResponse, feedback] = await Promise.all([
            generateAIResponse(messageData.content, session.scenario, messages),
            analyzeAgentMessage(messageData.content, session.scenario)
          ]);
          
          // Update message with feedback and create AI response
          const [updatedMessage, aiMessage] = await Promise.all([
            storage.updateMessage(message.id, { feedback }),
            storage.createMessage({
              sessionId: messageData.sessionId!,
              content: aiResponse,
              isAgent: false,
              feedback: null,
            })
          ]);
          
          res.json({ agentMessage: updatedMessage, aiMessage });
        } else {
          res.json(message);
        }
      } else {
        res.json(message);
      }
    } catch (error) {
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  app.get("/api/sessions/:sessionId/messages", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const messages = await storage.getSessionMessages(sessionId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session messages" });
    }
  });

  // Challenge routes
  app.get("/api/challenges", async (req, res) => {
    try {
      const challenges = await storage.getChallenges();
      res.json(challenges);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch challenges" });
    }
  });

  app.get("/api/users/:userId/daily-challenge", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const challenge = await storage.getDailyChallenge(userId);
      res.json(challenge);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch daily challenge" });
    }
  });

  // Voice analysis route
  app.post("/api/analyze-voice", async (req, res) => {
    try {
      const { transcript, scenario } = req.body;
      if (!transcript) {
        return res.status(400).json({ error: "Transcript is required" });
      }

      const analysis = await analyzeVoiceTranscript(transcript, scenario);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze voice transcript" });
    }
  });

  // DISC analysis route
  app.post("/api/analyze-disc", async (req, res) => {
    try {
      const { userId } = req.body;
      const sessions = await storage.getUserSessions(userId);
      
      if (sessions.length < 3) {
        return res.status(400).json({ error: "Need at least 3 sessions for DISC analysis" });
      }

      const discProfile = await analyzeDISCProfile(sessions);
      
      // Update user with DISC profile
      await storage.updateUser(userId, { discProfile });
      
      res.json(discProfile);
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze DISC profile" });
    }
  });

  // Knowledge Base Management Routes
  app.post("/api/scenarios", async (req, res) => {
    try {
      const scenarioData = {
        title: req.body.title,
        description: req.body.description,
        scenario: req.body.initialMessage,
        difficulty: req.body.difficulty,
        category: req.body.category,
        expectedResponse: req.body.expectedResponse,
        isActive: req.body.isActive
      };
      
      const scenario = await storage.createChallenge(scenarioData);
      res.json(scenario);
    } catch (error) {
      res.status(400).json({ error: "Invalid scenario data" });
    }
  });

  app.put("/api/scenarios/:id", async (req, res) => {
    try {
      const scenarioId = parseInt(req.params.id);
      const updates = {
        title: req.body.title,
        description: req.body.description,
        scenario: req.body.initialMessage,
        difficulty: req.body.difficulty,
        category: req.body.category,
        expectedResponse: req.body.expectedResponse,
        isActive: req.body.isActive
      };
      
      const scenario = await storage.updateChallenge(scenarioId, updates);
      if (!scenario) {
        return res.status(404).json({ error: "Scenario not found" });
      }
      res.json(scenario);
    } catch (error) {
      res.status(500).json({ error: "Failed to update scenario" });
    }
  });

  app.delete("/api/scenarios/:id", async (req, res) => {
    try {
      const scenarioId = parseInt(req.params.id);
      const deleted = await storage.deleteChallenge(scenarioId);
      if (!deleted) {
        return res.status(404).json({ error: "Scenario not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete scenario" });
    }
  });

  app.post("/api/coaching-phrases", async (req, res) => {
    try {
      // For now, just return success - full implementation would store in database
      res.json({ success: true, id: Date.now() });
    } catch (error) {
      res.status(400).json({ error: "Invalid phrase data" });
    }
  });

  // Voice call endpoints
  app.post("/api/voice-call/start", async (req, res) => {
    try {
      const { scenario, clientName, clientType, difficulty, personality } = req.body;
      
      const callSession = {
        id: Date.now(),
        scenario,
        clientName,
        clientType,
        difficulty,
        personality,
        startTime: new Date(),
        messages: []
      };
      
      res.json({ success: true, sessionId: callSession.id });
    } catch (error) {
      res.status(500).json({ error: "Failed to start voice call" });
    }
  });

  app.post("/api/voice-call/tts", async (req, res) => {
    try {
      const { text } = req.body;
      
      // Return success for browser-based speech synthesis
      res.json({ success: true, message: "Use browser speech synthesis" });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  // Twilio phone call endpoints
  app.post("/api/twilio/start-call", async (req, res) => {
    try {
      const { scenario, difficulty, personality, clientName, clientType, phoneNumber } = req.body;
      
      const twilio = await import('twilio');
      const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      // Create TwiML for the AI client
      const twimlUrl = `${req.protocol}://${req.get('host')}/api/twilio/voice-response`;
      
      const call = await client.calls.create({
        url: twimlUrl,
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER!,
        record: true,
        recordingStatusCallback: `${req.protocol}://${req.get('host')}/api/twilio/recording-complete`,
        statusCallback: `${req.protocol}://${req.get('host')}/api/twilio/call-status`
      });
      
      res.json({ success: true, callSid: call.sid });
    } catch (error: any) {
      console.error('Twilio error:', error);
      
      // Provide specific error messages for common issues
      if (error.code === 21215) {
        res.status(400).json({ 
          error: "UAE calling not enabled", 
          message: "Please enable United Arab Emirates in your Twilio Geo Permissions for low-risk countries.",
          setupUrl: "https://www.twilio.com/console/voice/calls/geo-permissions/low-risk"
        });
      } else if (error.code === 20003) {
        res.status(400).json({ 
          error: "Authentication failed", 
          message: "Please check your Twilio credentials." 
        });
      } else if (error.code === 21606) {
        res.status(400).json({ 
          error: "Invalid phone number", 
          message: "Please check the phone number format." 
        });
      } else {
        res.status(500).json({ 
          error: "Failed to start phone call",
          message: error.message || "Unknown error occurred"
        });
      }
    }
  });

  app.post("/api/twilio/end-call", async (req, res) => {
    try {
      const { callSid } = req.body;
      const twilio = await import('twilio');
      const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      await client.calls(callSid).update({ status: 'completed' });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Twilio error:', error);
      res.status(500).json({ error: "Failed to end call" });
    }
  });

  app.get("/api/twilio/call-status/:callSid", async (req, res) => {
    try {
      const { callSid } = req.params;
      const twilio = await import('twilio');
      const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      const call = await client.calls(callSid).fetch();
      
      res.json({ status: call.status, duration: call.duration });
    } catch (error) {
      console.error('Twilio error:', error);
      res.status(500).json({ error: "Failed to get call status" });
    }
  });

  // Minimal test endpoint for Twilio webhook
  app.all("/api/twilio/voice-test", async (req, res) => {
    console.log('Voice test request:', { method: req.method, query: req.query, body: req.body });
    
    const twimlXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman">Hello, I am a potential client interested in your properties. What do you have available?</Say>
  <Gather input="speech" timeout="8" action="/api/twilio/response-test" method="POST">
    <Say>Please describe your available properties.</Say>
  </Gather>
  <Say>Thank you for your time. Goodbye.</Say>
  <Hangup/>
</Response>`;
    
    res.type('text/xml');
    res.send(twimlXml);
  });

  app.all("/api/twilio/response-test", async (req, res) => {
    console.log('Response test request:', { method: req.method, query: req.query, body: req.body });
    
    const speech = req.body.SpeechResult || '';
    console.log('Agent said:', speech);
    
    const twimlXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman">That sounds good. I am looking for a 2-bedroom apartment. What is the price range?</Say>
  <Pause length="2"/>
  <Say voice="woman">Thank you for the information. I will consider it. Goodbye.</Say>
  <Hangup/>
</Response>`;
    
    res.type('text/xml');
    res.send(twimlXml);
  });

  // Simple test endpoint
  app.get("/test", (req, res) => {
    console.log('Test endpoint accessed');
    res.json({ status: 'working', timestamp: new Date() });
  });

  // Webhook diagnostics endpoint 
  app.get("/api/twilio/diagnostic", (req, res) => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      server_status: 'running',
      host: req.get('host'),
      protocol: req.protocol,
      url: req.url,
      headers: req.headers,
      environment: process.env.NODE_ENV,
      replit_domain: process.env.REPLIT_DOMAIN || 'not_set'
    };
    console.log('Diagnostic endpoint accessed:', diagnostics);
    res.json(diagnostics);
  });

  // Alternative webhook endpoint with different path
  app.all("/webhook/twilio/voice", async (req, res) => {
    console.log('=== ALTERNATIVE WEBHOOK ENDPOINT ACCESSED ===');
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    res.type('text/xml');
    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna-Neural">Alternative webhook is working. Can you hear this message?</Say>
</Response>`;
    res.send(response);
  });

  // Simple webhook test without any validation
  app.get("/api/twilio/voice-simple", (req, res) => {
    console.log('Simple webhook GET accessed');
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna-Neural">Hello! This is a simple test. Can you hear me?</Say>
</Response>`);
  });

  // Handle both GET and POST for Twilio webhook compatibility
  app.all("/api/twilio/voice-response", async (req, res) => {
    console.log('=== TWILIO WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('IP:', req.ip || req.connection.remoteAddress);
    console.log('User-Agent:', req.get('User-Agent'));
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Query:', JSON.stringify(req.query, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('=== END WEBHOOK DEBUG ===');
    
    // Always respond with TwiML even if there are errors
    res.type('text/xml');
    
    try {
      console.log('Voice response request:', { method: req.method, query: req.query, body: req.body });
      
      const twilio = await import('twilio');
      const VoiceResponse = twilio.default.twiml.VoiceResponse;
      const twiml = new VoiceResponse();
      
      // Get the base URL for webhook callbacks
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      // Natural human-like greeting with pauses and conversational tone
      twiml.say({
        voice: 'Polly.Joanna-Neural',
        language: 'en-US'
      }, 'Hi there! <break time="0.3s"/> My name is Sarah. <break time="0.2s"/> I\'m actually calling because I heard through a friend that you might have some really nice properties available in Dubai? <break time="0.4s"/> I\'m genuinely interested in looking at what you have. <break time="0.2s"/> Could you maybe tell me about some of your current listings?');
      
      // Gather agent response with improved speech recognition
      const gather = twiml.gather({
        input: 'speech' as any,
        timeout: 10,
        speechTimeout: 'auto',
        action: `${baseUrl}/api/twilio/process-response`,
        method: 'POST',
        language: 'en-US'
      });
      
      gather.say({
        voice: 'Polly.Joanna-Neural',
        language: 'en-US'
      }, 'I am particularly interested in 2 to 3 bedroom apartments.');
      
      // Fallback if no input
      twiml.say({
        voice: 'Polly.Joanna-Neural',
        language: 'en-US'
      }, 'I did not hear anything. Are you there? What properties do you have available?');
      
      // Final gather attempt
      const finalGather = twiml.gather({
        input: 'speech' as any,
        timeout: 8,
        speechTimeout: 'auto',
        action: `${baseUrl}/api/twilio/process-response`,
        method: 'POST',
        language: 'en-US'
      });
      
      finalGather.say({
        voice: 'Polly.Joanna-Neural',
        language: 'en-US'
      }, 'Hello? Can you hear me?');
      
      // End call if still no response
      twiml.say({
        voice: 'Polly.Joanna-Neural',
        language: 'en-US'
      }, 'I think we have a connection issue. I will call back later. Thank you.');
      twiml.hangup();
      
      console.log('Generated TwiML:', twiml.toString());
      
      res.type('text/xml');
      res.send(twiml.toString());
    } catch (error) {
      console.error('Voice response error:', error);
      
      // Minimal fallback TwiML with better voice
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Hello, I am interested in your properties.</Say><Gather input="speech" timeout="10" action="${baseUrl}/api/twilio/process-response" method="POST"><Say voice="Polly.Joanna">Please tell me about your listings.</Say></Gather><Say voice="Polly.Joanna">Thank you. Goodbye.</Say><Hangup/></Response>`;
      
      res.type('text/xml');
      res.send(fallbackXml);
    }
  });

  app.all("/api/twilio/process-response", async (req, res) => {
    try {
      console.log('=== SPEECH RECOGNITION DEBUG ===');
      console.log('Full request body:', JSON.stringify(req.body, null, 2));
      console.log('SpeechResult:', req.body.SpeechResult);
      console.log('UnstableSpeechResult:', req.body.UnstableSpeechResult);
      console.log('Confidence:', req.body.Confidence);
      console.log('=== END DEBUG ===');
      
      const agentSpeech = req.body.SpeechResult || req.body.UnstableSpeechResult || '';
      const confidence = req.body.Confidence || 0;
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const twilio = await import('twilio');
      const VoiceResponse = twilio.default.twiml.VoiceResponse;
      const twiml = new VoiceResponse();
      
      if (agentSpeech && agentSpeech.trim()) {
        console.log('Agent said:', agentSpeech);
        
        // More natural AI response based on what agent said
        let aiResponse = "";
        
        if (agentSpeech.toLowerCase().includes('price') || agentSpeech.toLowerCase().includes('cost') || agentSpeech.toLowerCase().includes('budget')) {
          aiResponse = "Perfect! My budget is around 2 to 3 million dirhams. I'm flexible if the property has great amenities. What do you have in that range?";
        } else if (agentSpeech.toLowerCase().includes('location') || agentSpeech.toLowerCase().includes('area') || agentSpeech.toLowerCase().includes('marina') || agentSpeech.toLowerCase().includes('downtown')) {
          aiResponse = "Excellent! I work in Dubai Marina, so properties nearby would be ideal. I'm also interested in Downtown Dubai. Do you have listings in those areas?";
        } else if (agentSpeech.toLowerCase().includes('bedroom') || agentSpeech.toLowerCase().includes('room') || agentSpeech.toLowerCase().includes('studio')) {
          aiResponse = "Great! I need either a 2 bedroom or 3 bedroom apartment. I have a home office, so extra space is important. What bedroom options do you have?";
        } else if (agentSpeech.toLowerCase().includes('amenities') || agentSpeech.toLowerCase().includes('facilities') || agentSpeech.toLowerCase().includes('gym') || agentSpeech.toLowerCase().includes('pool')) {
          aiResponse = "That's exactly what I'm looking for! I especially care about having a gym, swimming pool, and parking. Are these included in your properties?";
        } else if (agentSpeech.toLowerCase().includes('available') || agentSpeech.toLowerCase().includes('listings') || agentSpeech.toLowerCase().includes('properties')) {
          aiResponse = "Wonderful! I'm looking for a modern apartment with city or water views. When would be a good time to schedule a viewing?";
        } else {
          aiResponse = "That sounds very promising! Could you tell me more about the specific amenities and when I could arrange a viewing?";
        }
        
        twiml.say({
          voice: 'Polly.Joanna-Neural',
          language: 'en-US'
        }, aiResponse);
        
        // Add a follow-up gather for continued conversation
        const gather = twiml.gather({
          input: 'speech' as any,
          timeout: 8,
          speechTimeout: 'auto',
          action: `${baseUrl}/api/twilio/continue-conversation`,
          method: 'POST'
        });
        
        gather.say({
          voice: 'Polly.Joanna-Neural',
          language: 'en-US'
        }, 'What else can you tell me about your available properties?');
        
        // Fallback ending
        twiml.say({
          voice: 'Polly.Joanna-Neural',
          language: 'en-US'
        }, 'Thank you for your time. I look forward to hearing from you soon. Goodbye!');
        twiml.hangup();
        
      } else {
        console.log('No speech detected');
        twiml.say({
          voice: 'Polly.Joanna-Neural',
          language: 'en-US'
        }, 'I didnt hear you clearly. Could you please repeat what you said about your properties?');
      }
      
      // End the call gracefully
      twiml.pause({ length: 2 });
      twiml.say({
        voice: 'Polly.Joanna-Neural',
        language: 'en-US'
      }, 'Thank you for your time. I will consider your options. Goodbye!');
      twiml.hangup();
      
      console.log('Generated response TwiML:', twiml.toString());
      
      res.type('text/xml');
      res.send(twiml.toString());
      
    } catch (error) {
      console.error('Process response error:', error);
      
      // Simple fallback
      const fallbackXml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="woman">Thank you for the information. I will be in touch. Goodbye.</Say><Hangup/></Response>';
      
      res.type('text/xml');
      res.send(fallbackXml);
    }
  });

  // Continue conversation endpoint for extended phone calls
  app.all("/api/twilio/continue-conversation", async (req, res) => {
    try {
      console.log('Continue conversation request:', { query: req.query, body: req.body });
      
      const agentSpeech = req.body.SpeechResult || req.body.UnstableSpeechResult || '';
      
      const twilio = await import('twilio');
      const VoiceResponse = twilio.default.twiml.VoiceResponse;
      const twiml = new VoiceResponse();
      
      if (agentSpeech && agentSpeech.trim()) {
        console.log('Agent continued with:', agentSpeech);
        
        // Final response based on agent's follow-up
        let finalResponse = "";
        
        if (agentSpeech.toLowerCase().includes('viewing') || agentSpeech.toLowerCase().includes('appointment') || agentSpeech.toLowerCase().includes('visit')) {
          finalResponse = "Perfect! I'm available this weekend or next week. Please send me your contact details and we can schedule a viewing. Thank you!";
        } else if (agentSpeech.toLowerCase().includes('contact') || agentSpeech.toLowerCase().includes('call') || agentSpeech.toLowerCase().includes('reach')) {
          finalResponse = "Excellent! My number is available in your system. Please call me back with more details about the properties. Thank you so much!";
        } else if (agentSpeech.toLowerCase().includes('email') || agentSpeech.toLowerCase().includes('send') || agentSpeech.toLowerCase().includes('details')) {
          finalResponse = "That would be wonderful! Please send me the property details and pricing information. I look forward to hearing from you soon!";
        } else {
          finalResponse = "Thank you for all the information. This sounds very promising! I'll definitely be in touch to move forward. Have a great day!";
        }
        
        twiml.say({
          voice: 'Polly.Joanna-Neural',
          language: 'en-US'
        }, finalResponse);
      } else {
        twiml.say({
          voice: 'Polly.Joanna-Neural',
          language: 'en-US'
        }, 'Thank you for your time today. I appreciate the information and will be in touch soon. Goodbye!');
      }
      
      twiml.hangup();
      
      console.log('Generated continue conversation TwiML:', twiml.toString());
      
      res.type('text/xml');
      res.send(twiml.toString());
      
    } catch (error) {
      console.error('Continue conversation error:', error);
      
      const fallbackXml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Thank you for your time. I look forward to hearing from you. Goodbye!</Say><Hangup/></Response>';
      
      res.type('text/xml');
      res.send(fallbackXml);
    }
  });

  app.post("/api/twilio/call-status", (req, res) => {
    const { CallStatus, CallSid, Duration } = req.body;
    console.log(`Call ${CallSid} status: ${CallStatus}, duration: ${Duration}`);
    res.status(200).send();
  });

  app.post("/api/twilio/recording-complete", async (req, res) => {
    const { RecordingUrl, CallSid, RecordingDuration } = req.body;
    console.log(`Recording complete for call ${CallSid}: ${RecordingUrl}`);
    
    try {
      // Generate AI analysis for the completed call
      if (CallSid) {
        await generateCallInsights(CallSid, RecordingUrl, parseInt(RecordingDuration) || 0);
      }
    } catch (error) {
      console.error('Error generating call insights:', error);
    }
    
    res.status(200).send();
  });

  // Call Insights API endpoints
  app.get("/api/call-insights", async (req, res) => {
    try {
      const insights = await storage.getUserCallInsights(1); // Default user for demo
      res.json(insights);
    } catch (error) {
      console.error('Error fetching call insights:', error);
      res.status(500).json({ error: "Failed to fetch call insights" });
    }
  });

  app.get("/api/call-insights/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const insight = await storage.getCallInsight(parseInt(id));
      if (!insight) {
        return res.status(404).json({ error: "Call insight not found" });
      }
      res.json(insight);
    } catch (error) {
      console.error('Error fetching call insight:', error);
      res.status(500).json({ error: "Failed to fetch call insight" });
    }
  });

  const httpServer = createServer(app);
  // DISC Assessment endpoints
  app.post("/api/disc-assessments", async (req, res) => {
    try {
      const { userId, assessmentType, responses, results } = req.body;
      
      // Create assessment record
      const assessment = await storage.createDiscAssessment({
        userId,
        assessmentType,
        responses,
        results,
      });

      // Update user's DISC profile
      if (results) {
        await storage.updateUserDiscProfile(userId, {
          dominance: results.dominance,
          influence: results.influence,
          steadiness: results.steadiness,
          conscientiousness: results.conscientiousness,
          primaryStyle: results.primaryStyle,
          secondaryStyle: results.secondaryStyle,
          communicationTips: results.detailedAnalysis?.communicationStyle ? [results.detailedAnalysis.communicationStyle] : [],
          strengths: results.detailedAnalysis?.motivationFactors || [],
          challenges: results.detailedAnalysis?.potentialBlindSpots || [],
          workingStyle: results.detailedAnalysis?.decisionMaking || "",
          motivators: results.detailedAnalysis?.motivationFactors || [],
          stressors: results.detailedAnalysis?.potentialBlindSpots || [],
          idealEnvironment: `Optimal for ${results.primaryStyle} personality type`,
          coachingRecommendations: results.detailedAnalysis?.motivationFactors || [],
          lastAssessment: new Date().toISOString(),
          confidenceLevel: 85
        });
      }

      res.json(assessment);
    } catch (error) {
      console.error("Error creating DISC assessment:", error);
      res.status(500).json({ error: "Failed to create assessment" });
    }
  });

  app.get("/api/users/:userId/disc-assessments", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const assessments = await storage.getUserDiscAssessments(userId);
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching DISC assessments:", error);
      res.status(500).json({ error: "Failed to fetch assessments" });
    }
  });

  app.get("/api/users/:userId/disc-assessments/latest", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const assessment = await storage.getLatestDiscAssessment(userId);
      if (!assessment) {
        return res.status(404).json({ error: "No assessments found" });
      }
      res.json(assessment);
    } catch (error) {
      console.error("Error fetching latest DISC assessment:", error);
      res.status(500).json({ error: "Failed to fetch latest assessment" });
    }
  });

  // Voice call AI response endpoint
  app.post("/api/chat-response", async (req, res) => {
    try {
      const { message, scenario, clientName, clientType } = req.body;
      
      const response = await generateVoiceCallResponse(message, scenario, clientName, clientType);
      res.json({ response });
    } catch (error) {
      console.error("Error generating voice call response:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  // Voice call response with audio endpoint
  app.post("/api/voice-call-response", async (req, res) => {
    try {
      const { agentMessage, scenario, clientName, clientType, voiceId } = req.body;
      
      let responseText;
      if (agentMessage === "INITIAL_MESSAGE") {
        // Use the scenario's initial message
        const scenarios = [
          {
            id: "urgent-viewing",
            initialMessage: "Hi, I saw your listing online and I'm very interested. I'm flying out tomorrow morning for a business trip, but I really want to see this property today. Is there any way you can arrange an urgent viewing?"
          },
          {
            id: "price-negotiation", 
            initialMessage: "I've been looking at your off-plan development and I'm interested in buying 3 units. However, I think your asking price is a bit high for the current market. Can we discuss a better deal?"
          },
          {
            id: "first-time-buyer",
            initialMessage: "Hi, I'm looking to buy my first property and I'm feeling quite overwhelmed. I've saved up for a deposit but I'm not sure about the process or what I should be looking for. Can you help guide me?"
          }
        ];
        
        const scenarioData = scenarios.find(s => scenario.includes(s.id.replace('-', ' ')));
        responseText = scenarioData?.initialMessage || "Hello, I'm interested in discussing your property listing with you.";
      } else {
        responseText = await generateVoiceCallResponse(agentMessage, scenario, clientName, clientType);
      }
      
      // Generate audio using ElevenLabs
      const audioBuffer = await generateElevenLabsSpeech(responseText, voiceId || "pNInz6obpgDQGcFmaJgB");
      
      // Create a data URL for the audio
      const audioBase64 = audioBuffer.toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
      
      res.json({ 
        response: responseText,
        audioUrl: audioUrl
      });
    } catch (error) {
      console.error("Error generating voice call response:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  // ElevenLabs text-to-speech endpoint
  app.post("/api/text-to-speech", async (req, res) => {
    try {
      const { text, voice = "pNInz6obpgDQGcFmaJgB" } = req.body; // Default to Adam voice
      
      const audioBuffer = await generateElevenLabsSpeech(text, voice);
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
      });
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error generating speech:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  // Set up WebSocket server for Deepgram real-time transcription
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected for voice transcription');
    
    let deepgramConnection: any = null;
    let currentCallData: any = {};
    
    ws.on('message', async (message) => {
      try {
        // Handle binary audio data
        if (message instanceof Buffer && message.length > 100) {
          if (deepgramConnection && deepgramConnection.readyState === 1) {
            deepgramConnection.send(message);
          }
          return;
        }
        
        // Handle JSON control messages
        const data = JSON.parse(message.toString());
        
        if (data.type === 'start') {
          // Initialize Deepgram connection
          deepgramConnection = deepgram.listen.live({
            model: 'nova-2',
            language: 'en-US',
            smart_format: true,
            interim_results: true,
            endpointing: 300,
            vad_events: true,
            encoding: 'linear16',
            sample_rate: 16000,
            channels: 1
          });
          
          deepgramConnection.on('open', () => {
            console.log('Deepgram connection opened');
            ws.send(JSON.stringify({ type: 'ready' }));
          });
          
          deepgramConnection.on('Results', async (data: any) => {
            console.log('Deepgram Results:', JSON.stringify(data, null, 2));
            const transcript = data.channel?.alternatives?.[0]?.transcript;
            if (transcript && transcript.trim()) {
              console.log('Sending transcript:', transcript);
              ws.send(JSON.stringify({
                type: 'transcript',
                text: transcript,
                is_final: data.is_final || false,
                confidence: data.channel?.alternatives?.[0]?.confidence || 0
              }));

              // If this is a final result, generate AI response
              if (data.is_final && transcript.trim().length > 3) {
                try {
                  const aiResponse = await generateVoiceCallResponse(
                    transcript,
                    currentCallData.scenario || 'property inquiry',
                    currentCallData.clientName || 'Client',
                    currentCallData.clientType || 'Potential Buyer',
                    currentCallData.personality,
                    currentCallData.difficulty
                  );
                  
                  ws.send(JSON.stringify({
                    type: 'ai_response',
                    message: aiResponse
                  }));
                } catch (error) {
                  console.error('Error generating AI response:', error);
                }
              }
            }
          });
          
          deepgramConnection.on('SpeechStarted', () => {
            ws.send(JSON.stringify({ type: 'speech_started' }));
          });
          
          deepgramConnection.on('UtteranceEnd', () => {
            ws.send(JSON.stringify({ type: 'utterance_end' }));
          });
          
          deepgramConnection.on('error', (error: any) => {
            console.error('Deepgram error:', error);
            ws.send(JSON.stringify({ type: 'error', error: error.message }));
          });
          
        } else if (data.type === 'start_call') {
          // Initialize call session
          console.log('Starting call session:', data);
          currentCallData = {
            scenario: data.scenario,
            clientName: data.clientName,
            clientType: data.clientType,
            difficulty: data.difficulty,
            personality: data.personality
          };
          
        } else if (data.type === 'audio') {
          // Send audio data to Deepgram
          if (deepgramConnection) {
            const audioBuffer = Buffer.from(data.audio, 'base64');
            deepgramConnection.send(audioBuffer);
          }
        } else if (data.type === 'user_message') {
          // Process complete user message and generate AI response
          const aiResponse = await generateVoiceCallResponse(
            data.message, 
            data.scenario || 'property inquiry',
            data.clientName || 'Client',
            data.clientType || 'Potential Buyer'
          );
          
          ws.send(JSON.stringify({
            type: 'ai_response',
            message: aiResponse
          }));
          
        } else if (data.type === 'stop') {
          if (deepgramConnection) {
            deepgramConnection.finish();
            deepgramConnection = null;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      if (deepgramConnection) {
        deepgramConnection.finish();
      }
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}

// AI Analysis Functions
async function generateElevenLabsSpeech(text: string, voiceId: string): Promise<Buffer> {
  const fetch = (await import('node-fetch')).default;
  
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
    },
    body: JSON.stringify({
      text: text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.75,
        similarity_boost: 0.85,
        style: 0.25,
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function generateVoiceCallResponse(agentMessage: string, scenario: string, clientName: string, clientType: string, personality?: string, difficulty?: string) {
  try {
    // DISC personality behavioral patterns
    const personalityTraits = {
      'D': 'Direct, decisive, impatient. Wants quick results and bottom line. Speaks fast, interrupts, challenges statements. Values efficiency over relationship.',
      'I': 'Enthusiastic, talkative, optimistic. Wants to connect personally. Uses emotions, tells stories, gets excited easily. Values relationships and recognition.',
      'S': 'Patient, methodical, supportive. Wants security and stability. Speaks slowly, asks clarifying questions, needs time to decide. Values harmony and consistency.',
      'C': 'Analytical, precise, cautious. Wants detailed information and proof. Questions everything, focuses on facts, concerned about risks. Values quality and accuracy.'
    };

    const difficultyModifiers = {
      'easy': 'You are cooperative and interested. You have some minor concerns but are generally positive.',
      'medium': 'You have moderate objections and need convincing. You ask probing questions and need clear value demonstration.',
      'hard': 'You are skeptical and challenging. You push back on proposals, have strong objections, and require significant persuasion.'
    };

    const personalityBehavior = personality ? personalityTraits[personality as keyof typeof personalityTraits] : '';
    const difficultyBehavior = difficulty ? difficultyModifiers[difficulty as keyof typeof difficultyModifiers] : '';

    const prompt = `You're ${clientName}, a real person calling about Dubai real estate. ${personalityBehavior} ${difficultyBehavior}

Agent said: "${agentMessage}"

Respond like a real phone call with:
- Natural hesitations: "Um, well, you know, actually..."
- Interruptions: "Wait, sorry, I meant..."
- Realistic reactions: "Oh really?", "Hmm, interesting..."
- Personal details: mention budget, timeline, family needs
- Casual contractions: "I'm", "that's", "we're"
- Filler words and thinking sounds

Sound authentic, not scripted. Under 25 words.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      max_tokens: 80
    });

    let reply = response.choices[0].message.content || "Um, I see, tell me more about that.";
    
    // Add natural speech breaks for phone calls
    reply = reply.replace(/\./g, '. <break time="0.2s"/>');
    reply = reply.replace(/\?/g, '? <break time="0.3s"/>');
    reply = reply.replace(/,/g, ', <break time="0.1s"/>');
    reply = reply.replace(/!/g, '! <break time="0.2s"/>');
    
    return reply;
  } catch (error) {
    console.error("Error generating voice call response:", error);
    return "That's interesting. Can you provide more details?";
  }
}
async function analyzeAgentMessage(content: string, scenario: string) {
  try {
    const prompt = `Analyze this real estate agent response. Rate 0-100 and give specific coaching tips:

Scenario: ${scenario}
Agent: "${content}"

Focus on:
- Confidence: Assertive language, avoiding weak words
- Clarity: Clear, easy to understand communication  
- Value: Demonstrating property/service benefits
- Call-to-action: Next steps or engagement

JSON response:
{
  "confidence": number,
  "clarity": number, 
  "value": number,
  "cta": number,
  "suggestions": ["specific actionable tip", "another concrete improvement"],
  "strengths": ["what they did well", "positive aspect"],
  "nextLevel": "one key thing to focus on improving"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 300,
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error analyzing agent message:", error);
    return {
      confidence: 75,
      clarity: 75,
      value: 75,
      cta: 70,
      suggestions: ["Be more specific about property benefits", "Include a clear next step"],
      strengths: ["Professional tone"],
      nextLevel: "Add more compelling value propositions"
    };
  }
}

async function generateAIResponse(agentMessage: string, scenario: string, messages: any[] = []) {
  try {
    // Extract DISC personality and difficulty from scenario
    let discType = "S"; // default to Steady
    let persona = "cautious buyer";
    let traits = "patient and methodical";
    let difficulty = "medium";
    
    // Detect difficulty level
    if (scenario.includes("Beginner")) {
      difficulty = "easy";
    } else if (scenario.includes("Advanced")) {
      difficulty = "hard";
    }
    
    // Detect DISC personality
    if (scenario.includes("Direct & Decisive")) {
      discType = "D";
      persona = "business-focused client";
      traits = difficulty === "easy" ? "straightforward and goal-oriented" : 
              difficulty === "hard" ? "demanding, time-pressured, very results-focused" :
              "time-conscious, goal-oriented, prefers efficient communication";
    } else if (scenario.includes("Social & Engaging")) {
      discType = "I";
      persona = "relationship-focused client";
      traits = difficulty === "easy" ? "friendly and conversational" :
              difficulty === "hard" ? "very talkative, easily distracted, needs constant reassurance" :
              "people-oriented, collaborative, enjoys building rapport";
    } else if (scenario.includes("Thoughtful & Steady")) {
      discType = "S";
      persona = "careful and considerate client";
      traits = difficulty === "easy" ? "patient and supportive" :
              difficulty === "hard" ? "extremely cautious, needs extensive reassurance, asks many detailed questions" :
              "methodical, values stability, takes time with decisions";
    } else if (scenario.includes("Detail-Oriented & Thorough")) {
      discType = "C";
      persona = "research-minded client";
      traits = difficulty === "easy" ? "detail-oriented and methodical" :
              difficulty === "hard" ? "highly analytical, perfectionist, questions every detail extensively" :
              "quality-focused, analytical, wants comprehensive information";
    }

    // Build conversation context
    const recentMessages = messages.slice(-6).map(m => 
      `${m.isAgent ? 'Agent' : 'Client'}: ${m.content}`
    ).join('\n');
    
    // Add difficulty-based behavior modifiers
    let difficultyModifier = "";
    if (difficulty === "easy") {
      difficultyModifier = "Be cooperative and receptive. Show interest in the agent's suggestions.";
    } else if (difficulty === "hard") {
      difficultyModifier = "Be more challenging. Raise objections, ask tough questions, or express concerns that require skillful handling.";
    } else {
      difficultyModifier = "Be realistic with moderate questions and some hesitation.";
    }

    const prompt = `You are a ${persona} with ${discType} personality traits. You are ${traits}.

Communication style:
${discType === 'D' ? '- Keep responses concise and business-focused. Ask about outcomes and timelines. Value efficiency.' : ''}
${discType === 'I' ? '- Be warm and conversational. Show interest in the agent personally. Enjoy discussing benefits for people.' : ''}
${discType === 'S' ? '- Ask thoughtful questions. Express need for reassurance. Take time to understand all aspects.' : ''}
${discType === 'C' ? '- Request specific details and documentation. Ask follow-up questions about processes and quality.' : ''}

Difficulty behavior: ${difficultyModifier}

Scenario: ${scenario}
Recent conversation:
${recentMessages}

Agent just said: "${agentMessage}"

Respond naturally as this personality type in 1-2 sentences. Be realistic and professional.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.8
    });

    return response.choices[0].message.content || "I see, tell me more about that.";
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "That's interesting. Can you tell me more about the benefits?";
  }
}

async function analyzeVoiceTranscript(transcript: string, scenario: string) {
  try {
    const prompt = `
    You are an expert communication coach analyzing a real estate agent's voice response.
    
    Scenario: ${scenario}
    Transcript: ${transcript}
    
    Analyze the response and provide:
    - Overall score (0-100)
    - Confidence level (0-100)
    - Clarity score (0-100)
    - Energy level (0-100)
    - Estimated filler words count
    - Pace assessment (slow/good/fast)
    - Specific feedback and suggestions
    
    Respond with JSON in this format:
    {
      "score": number,
      "confidence": number,
      "clarity": number,
      "energy": number,
      "fillerWords": number,
      "pace": "good|slow|fast",
      "feedback": "detailed feedback string",
      "suggestions": ["suggestion1", "suggestion2"]
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error analyzing voice transcript:", error);
    return {
      score: 75,
      confidence: 75,
      clarity: 75,
      energy: 75,
      fillerWords: 2,
      pace: "good",
      feedback: "Good effort! Keep practicing to improve your delivery.",
      suggestions: ["Speak with more confidence", "Reduce filler words"]
    };
  }
}

async function generateCallInsights(callSid: string, recordingUrl: string, duration: number) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const analysisPrompt = `Analyze this real estate agent phone call performance:

Call Duration: ${duration} seconds
Call Type: Real estate consultation/practice session

Based on typical real estate phone interactions, provide a comprehensive AI analysis in JSON format:

{
  "overallScore": number (1-100),
  "metrics": {
    "confidence": number (1-100),
    "clarity": number (1-100),
    "persuasion": number (1-100),
    "rapport": number (1-100),
    "objectionHandling": number (1-100),
    "closingTechnique": number (1-100),
    "listeningSkills": number (1-100),
    "empathy": number (1-100),
    "adaptability": number (1-100),
    "professionalism": number (1-100)
  },
  "aiAnalysis": {
    "summary": "Brief overall performance summary",
    "keyStrengths": ["strength1", "strength2", "strength3"],
    "criticalAreas": ["area1", "area2"],
    "specificFeedback": {
      "opening": "Feedback on call opening",
      "needsDiscovery": "Feedback on discovering client needs",
      "presentationSkills": "Feedback on property presentation",
      "objectionHandling": "Feedback on handling objections",
      "closing": "Feedback on call closing"
    },
    "recommendations": ["recommendation1", "recommendation2"],
    "nextSteps": ["step1", "step2"],
    "discAlignment": "How well agent adapted to client personality",
    "emotionalIntelligence": "Assessment of EQ during call"
  },
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "keyMoments": [
    {
      "timestamp": number,
      "type": "strength",
      "description": "What happened",
      "impact": "high",
      "suggestion": "Specific suggestion"
    }
  ]
}

Generate realistic scores based on a ${duration > 120 ? 'good length' : 'short'} call duration.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: analysisPrompt }],
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    
    // Store the insights in the database
    const callInsight = await storage.createCallInsight({
      userId: 1,
      callSid,
      sessionId: null,
      scenario: "Real estate consultation",
      clientName: "Practice Client",
      clientType: "Potential Buyer",
      difficulty: duration > 180 ? "hard" : duration > 120 ? "medium" : "easy",
      personality: "Mixed",
      duration,
      transcript: null,
      overallScore: analysis.overallScore || 75,
      metrics: analysis.metrics || {
        confidence: 75,
        clarity: 80,
        persuasion: 70,
        rapport: 85,
        objectionHandling: 65,
        closingTechnique: 70,
        listeningSkills: 90,
        empathy: 85,
        adaptability: 75,
        professionalism: 90
      },
      aiAnalysis: analysis.aiAnalysis || {
        summary: "Good overall performance with room for improvement in closing techniques",
        keyStrengths: ["Strong listening skills", "Professional demeanor", "Good rapport building"],
        criticalAreas: ["Closing technique", "Objection handling"],
        specificFeedback: {
          opening: "Strong and professional opening",
          needsDiscovery: "Good questioning to understand client needs",
          presentationSkills: "Clear property presentation",
          objectionHandling: "Could improve objection handling techniques",
          closing: "Work on stronger closing statements"
        },
        recommendations: ["Practice objection handling scenarios", "Focus on closing techniques"],
        nextSteps: ["Schedule follow-up practice", "Review closing methods"],
        discAlignment: "Good adaptation to client personality",
        emotionalIntelligence: "Strong emotional awareness during conversation"
      },
      strengths: analysis.strengths || ["Professional communication", "Active listening"],
      improvements: analysis.improvements || ["Closing techniques", "Objection handling"],
      keyMoments: analysis.keyMoments || []
    });

    console.log('Generated call insights for:', callSid);
    return callInsight;
  } catch (error) {
    console.error('Error generating call insights:', error);
    return null;
  }
}

async function analyzeDISCProfile(sessions: any[]) {
  try {
    const transcripts = sessions.map(s => s.transcript || "").filter(Boolean);
    const allText = transcripts.join(" ");

    const prompt = `
    You are a DISC personality assessment expert. Analyze this real estate agent's communication patterns from their session transcripts.
    
    Transcripts: ${allText}
    
    Based on the communication style, determine their DISC profile percentages and primary type:
    - D (Dominant): Direct, results-oriented, decisive, competitive
    - I (Influencer): Enthusiastic, optimistic, people-oriented, talkative
    - S (Steady): Patient, loyal, supportive, consistent
    - C (Compliant): Analytical, reserved, precise, systematic
    
    Respond with JSON in this format:
    {
      "dominant": number (0-100),
      "influencer": number (0-100),
      "steady": number (0-100),
      "compliant": number (0-100),
      "primaryType": "D|I|S|C",
      "description": "Brief description of their communication style"
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error analyzing DISC profile:", error);
    return {
      dominant: 70,
      influencer: 60,
      steady: 40,
      compliant: 30,
      primaryType: "D",
      description: "Direct and results-oriented communication style"
    };
  }
}
