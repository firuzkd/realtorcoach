import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import BottomNavigation from "@/components/bottom-navigation";
import { 
  ArrowLeft, 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Clock,
  User,
  MessageSquare
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const CALL_SCENARIOS = [
  {
    id: "urgent-viewing",
    title: "Urgent Property Viewing",
    clientName: "Sarah Chen",
    clientType: "Busy Executive", 
    scenario: "Client needs to view property today before flying out tomorrow",
    initialMessage: "Hi, I saw your listing online and I'm very interested. I'm flying out tomorrow morning for a business trip, but I really want to see this property today. Is there any way you can arrange an urgent viewing?",
    difficulty: "Medium",
    expectedDuration: "2-3 minutes"
  },
  {
    id: "price-negotiation",
    title: "Price Negotiation Call",
    clientName: "David Kumar", 
    clientType: "Experienced Investor",
    scenario: "Client wants to negotiate on a bulk purchase",
    initialMessage: "I've been looking at your off-plan development and I'm interested in buying 3 units. However, I think your asking price is a bit high for the current market. Can we discuss a better deal?",
    difficulty: "Hard",
    expectedDuration: "3-5 minutes"
  },
  {
    id: "first-time-buyer",
    title: "First-Time Buyer Consultation",
    clientName: "Emma Wilson",
    clientType: "First-Time Buyer",
    scenario: "Nervous first-time buyer needs reassurance and guidance",
    initialMessage: "Hi, I'm really interested in buying my first property, but I'm honestly quite nervous about the whole process. Can you help me understand how off-plan purchases work and what I need to be careful about?",
    difficulty: "Easy",
    expectedDuration: "4-6 minutes"
  }
];

type CallState = 'idle' | 'connecting' | 'active' | 'ended';

const AVAILABLE_VOICES = [
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", accent: "American Male", description: "Professional and clear" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", accent: "American Female", description: "Warm and confident" },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", accent: "American Female", description: "Calm and articulate" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", accent: "American Female", description: "Strong and assertive" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", accent: "American Female", description: "Emotional and expressive" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", accent: "American Male", description: "Deep and authoritative" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", accent: "American Male", description: "Crisp and professional" },
  { id: "pqHfZKP75CvOlQylNhV4", name: "Bill", accent: "American Male", description: "Friendly and approachable" }
];

export default function VoiceCall() {
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [callState, setCallState] = useState<CallState>('idle');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [callAnalysis, setCallAnalysis] = useState<any>(null);
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("pNInz6obpgDQGcFmaJgB"); // Default Adam voice
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);
  const [deepgramConnected, setDeepgramConnected] = useState(false);
  
  const callStartTimeRef = useRef<number>(0);
  const callIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const analyzeCallMutation = useMutation({
    mutationFn: async ({ transcript, scenario }: { transcript: string; scenario: string }) => {
      const response = await apiRequest("POST", "/api/analyze-voice", {
        transcript,
        scenario,
      });
      return response.json();
    },
    onSuccess: (result) => {
      setCallAnalysis(result);
    },
  });

  const currentScenario = CALL_SCENARIOS.find(s => s.id === selectedScenario);

  useEffect(() => {
    if (callState === 'active') {
      callStartTimeRef.current = Date.now();
      callIntervalRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (callIntervalRef.current) {
        clearInterval(callIntervalRef.current);
        callIntervalRef.current = null;
      }
    }

    return () => {
      if (callIntervalRef.current) {
        clearInterval(callIntervalRef.current);
      }
    };
  }, [callState]);

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const addDebugInfo = (message: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const startCall = async () => {
    if (!currentScenario) return;
    
    addDebugInfo("Starting call...");
    setCallState('connecting');
    
    // Start the call immediately
    setTimeout(() => {
      addDebugInfo("Moving to active state");
      setCallState('active');
      
      // Start speaking immediately
      setTimeout(() => {
        addDebugInfo("Starting speech synthesis");
        speakMessage(currentScenario.initialMessage);
        
        // Start professional speech recognition
        setTimeout(() => {
          startDeepgramConnection();
        }, 2000);
      }, 500);
    }, 1500);
  };

  const startDeepgramConnection = async () => {
    try {
      addDebugInfo("Connecting to professional speech service...");
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;
      
      // Set up WebSocket connection to Deepgram
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        addDebugInfo("Connected to speech service");
        ws.send(JSON.stringify({ type: 'start' }));
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'ready':
            setDeepgramConnected(true);
            addDebugInfo("Professional speech recognition ready");
            startAudioProcessing();
            break;
            
          case 'transcript':
            if (data.text) {
              setTranscript(data.text);
              
              if (data.is_final && data.text.trim().length > 1 && !isAIResponding) {
                addDebugInfo(`You said: "${data.text}"`);
                generateAIResponse(data.text.trim());
              }
            }
            break;
            
          case 'utterance_end':
            addDebugInfo("Utterance complete");
            break;
            
          case 'error':
            addDebugInfo(`Speech service error: ${data.error}`);
            break;
        }
      };
      
      ws.onerror = () => {
        addDebugInfo("Speech service connection error");
        setShowTextInput(true);
      };
      
      ws.onclose = () => {
        addDebugInfo("Speech service disconnected");
        setDeepgramConnected(false);
      };
      
    } catch (error) {
      addDebugInfo("Microphone access denied - using text input");
      setShowTextInput(true);
    }
  };
  
  const startAudioProcessing = () => {
    if (!streamRef.current) return;
    
    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;
    
    const source = audioContext.createMediaStreamSource(streamRef.current);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    
    processor.onaudioprocess = (event) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && !isAIResponding) {
        const inputData = event.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }
        
        // Convert to bytes array for base64 encoding
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Audio = btoa(binary);
        
        wsRef.current.send(JSON.stringify({
          type: 'audio',
          audio: base64Audio
        }));
        
        // Simple volume detection for visual feedback
        const volume = Math.sqrt(inputData.reduce((sum, val) => sum + val * val, 0) / inputData.length);
        setAudioLevel(volume * 100);
      }
    };
    
    source.connect(processor);
    processor.connect(audioContext.destination);
    setIsListening(true);
  };

  const generateAIResponse = async (userInput: string) => {
    // Prevent multiple simultaneous responses
    if (isAIResponding) {
      addDebugInfo("AI already responding, waiting...");
      return;
    }

    try {
      setIsAIResponding(true);
      addDebugInfo("Generating AI response...");
      
      // Stop listening while AI responds
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'stop' }));
      }
      setIsListening(false);
      
      const response = await fetch('/api/chat-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          scenario: currentScenario?.scenario,
          clientName: currentScenario?.clientName,
          clientType: currentScenario?.clientType
        })
      });

      const data = await response.json();
      addDebugInfo("AI response received");
      
      // Speak the AI response
      await speakMessage(data.response);
      
      // Clear transcript and restart listening after AI finishes
      setTranscript("");
      
      // Wait then restart listening for user response
      setTimeout(() => {
        if (callState === 'active' && !isMuted) {
          addDebugInfo("Listening for your response...");
          startDeepgramConnection();
        }
      }, 1500);
      
    } catch (error) {
      addDebugInfo("Error generating AI response");
      console.error("AI response error:", error);
    } finally {
      setIsAIResponding(false);
    }
  };

  const endCall = () => {
    setCallState('ended');
    stopListening();
    
    // Analyze the call
    if (transcript.trim()) {
      analyzeCallMutation.mutate({
        transcript: transcript.trim(),
        scenario: currentScenario?.scenario || "",
      });
    }
  };

  const startListening = () => {
    // Detect browser for better speech recognition settings
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    
    const hasWebkitSpeech = 'webkitSpeechRecognition' in window;
    const hasSpeech = 'SpeechRecognition' in window;
    
    if (!hasWebkitSpeech && !hasSpeech) {
      addDebugInfo("Speech recognition not supported in this browser");
      addDebugInfo("Try using Chrome or Firefox for better voice support");
      setShowTextInput(true);
      return;
    }
    
    if (isSafari) {
      addDebugInfo("Safari detected - speech recognition may be limited");
      addDebugInfo("For best experience, try Chrome or Firefox");
    }

    try {
      // Use Deepgram instead of browser speech recognition
      startDeepgramConnection();
      return;

      // Optimize settings based on browser
      if (isChrome || isFirefox) {
        recognition.continuous = true;
        recognition.interimResults = true;
        addDebugInfo("Using continuous recognition for Chrome/Firefox");
      } else {
        recognition.continuous = false;
        recognition.interimResults = true;
        addDebugInfo("Using single-shot recognition for Safari");
      }
      
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let speechTimeout: NodeJS.Timeout;
      let lastTranscript = '';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript = transcript.trim();
            addDebugInfo(`You said: "${finalTranscript}"`);
            
            // Generate AI response immediately when speech is final
            if (finalTranscript.length > 1 && !isAIResponding) {
              generateAIResponse(finalTranscript);
              setTranscript(finalTranscript);
              return; // Don't restart immediately
            }
          } else {
            interimTranscript = transcript;
            
            // Clear previous timeout
            clearTimeout(speechTimeout);
            
            // Set timeout to process speech if user pauses
            speechTimeout = setTimeout(() => {
              if (interimTranscript.trim().length > 1 && interimTranscript !== lastTranscript && !isAIResponding) {
                lastTranscript = interimTranscript.trim();
                addDebugInfo(`You said: "${lastTranscript}"`);
                generateAIResponse(lastTranscript);
                setTranscript(lastTranscript);
              }
            }, 2000); // Wait 2 seconds after user stops speaking
          }
        }
        
        setTranscript(finalTranscript + interimTranscript);
      };

      recognition.onstart = () => {
        console.log("Speech recognition started");
        setIsListening(true);
      };

      recognition.onend = () => {
        addDebugInfo("Speech recognition ended");
        setIsListening(false);
        
        // Auto-restart based on browser capabilities
        if (callState === 'active' && !isMuted) {
          const restartDelay = isChrome || isFirefox ? 500 : 1500;
          setTimeout(() => {
            if (callState === 'active' && !isMuted) {
              addDebugInfo("Restarting speech recognition...");
              startListening();
            }
          }, restartDelay);
        }
      };

      recognition.onerror = (event: any) => {
        addDebugInfo(`Speech error: ${event.error}`);
        setIsListening(false);
        
        if (event.error === 'no-speech') {
          // This is normal, just restart
          if (callState === 'active' && !isMuted) {
            setTimeout(() => {
              try {
                recognition.start();
              } catch (e) {
                addDebugInfo("Failed to restart recognition");
              }
            }, 1000);
          }
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          addDebugInfo("Microphone blocked - continuing without voice input");
          // Don't show alert, just continue the call without microphone
        } else {
          addDebugInfo(`Recognition error: ${event.error}`);
        }
      };

      try {
        recognition.start();
        console.log("Starting speech recognition...");
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
        setIsListening(false);
        addDebugInfo("Failed to start speech recognition");
      }
    } catch (error) {
      console.error("Speech recognition not supported");
      addDebugInfo("Speech recognition not supported in this browser");
      setShowTextInput(true);
    }
  };

  const stopListening = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
      wsRef.current.close();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    setIsListening(false);
    setDeepgramConnected(false);
  };

  const speakMessage = async (message: string) => {
    if (!isSpeakerOn) return;
    
    try {
      addDebugInfo("Generating natural speech...");
      
      // Use ElevenLabs for high-quality speech
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          voice: selectedVoice
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onplay = () => addDebugInfo("AI client speaking...");
        audio.onended = () => {
          addDebugInfo("AI finished speaking");
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => addDebugInfo("Audio playback error");
        
        await audio.play();
      } else {
        throw new Error('Failed to generate speech');
      }
    } catch (error) {
      addDebugInfo("Speech generation failed, using fallback");
      console.error("ElevenLabs speech error:", error);
      
      // Fallback to browser speech synthesis
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 0.85;
        utterance.pitch = 0.9;
        utterance.volume = 0.8;
        speechSynthesis.speak(utterance);
      }
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (newMutedState) {
      // Muting - stop listening
      stopListening();
      addDebugInfo("Microphone muted");
    } else {
      // Unmuting - start listening
      addDebugInfo("Microphone unmuted - starting listening");
      setTimeout(() => {
        startListening();
      }, 300);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  const resetCall = () => {
    setSelectedScenario("");
    setCallState('idle');
    setCallDuration(0);
    setTranscript("");
    setCallAnalysis(null);
    setIsMuted(false);
    setIsSpeakerOn(true);
  };

  if (!selectedScenario) {
    return (
      <>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50">
          <div className="flex items-center space-x-3">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Voice Call Practice</h1>
              <p className="text-sm text-slate-500">Real-time phone roleplay</p>
            </div>
          </div>
        </header>

        {/* Scenario Selection */}
        <main className="p-4 pb-20">
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Phone Call Training</h2>
              <p className="text-slate-600">Practice real-time conversations with AI clients</p>
            </div>

            {CALL_SCENARIOS.map((scenario) => (
              <Card key={scenario.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">{scenario.title}</h3>
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline" className="text-xs">{scenario.clientType}</Badge>
                        <Badge 
                          variant={scenario.difficulty === "Easy" ? "default" : scenario.difficulty === "Medium" ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {scenario.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                      <span className="text-white font-medium text-sm">{scenario.clientName.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-3">{scenario.scenario}</p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="flex items-start space-x-2">
                      <Phone className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-blue-800 font-medium mb-1">Client will say:</p>
                        <p className="text-sm text-blue-700 italic">"{scenario.initialMessage}"</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{scenario.clientName}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{scenario.expectedDuration}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setSelectedScenario(scenario.id)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Start Call
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>

        <BottomNavigation currentPage="voice" />
      </>
    );
  }

  if (callState === 'ended' && callAnalysis) {
    return (
      <>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={resetCall}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Call Analysis</h1>
              <p className="text-sm text-slate-500">Performance review</p>
            </div>
          </div>
        </header>

        {/* Call Analysis */}
        <main className="p-4 pb-20">
          <div className="space-y-6">
            {/* Call Summary */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">{currentScenario?.clientName.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{currentScenario?.clientName}</h3>
                      <p className="text-sm text-slate-500">{currentScenario?.title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">{callAnalysis.score}</div>
                    <div className="text-xs text-slate-500">Overall Score</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Call Duration: {formatCallDuration(callDuration)}</span>
                  <Badge variant="outline">Voice Call</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold text-slate-900 mb-4">Performance Breakdown</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary">{callAnalysis.confidence}</div>
                    <div className="text-sm text-slate-500">Confidence</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-secondary">{callAnalysis.energy}</div>
                    <div className="text-sm text-slate-500">Energy</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Clarity</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={callAnalysis.clarity} className="w-20" />
                      <span className="text-sm font-medium">{callAnalysis.clarity}%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Pace</span>
                    <Badge variant="outline" className="capitalize">{callAnalysis.pace}</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Filler Words</span>
                    <span className="text-sm font-medium">{callAnalysis.fillerWords}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feedback */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold text-slate-900 mb-3">AI Coach Feedback</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-green-700">{callAnalysis.feedback}</p>
                </div>
                
                {callAnalysis.suggestions && callAnalysis.suggestions.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h5 className="text-sm font-medium text-blue-800 mb-2">Suggestions for Next Time:</h5>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {callAnalysis.suggestions.map((suggestion: string, index: number) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-blue-400">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button onClick={resetCall} variant="outline" className="flex-1">
                Try Another Call
              </Button>
              <Link href="/progress" className="flex-1">
                <Button className="w-full">
                  View Progress
                </Button>
              </Link>
            </div>
          </div>
        </main>

        <BottomNavigation currentPage="voice" />
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={resetCall}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {callState === 'connecting' ? 'Connecting...' : 'Live Call'}
            </h1>
            <p className="text-sm text-slate-500">{currentScenario?.clientName}</p>
          </div>
        </div>
      </header>

      {/* Call Interface */}
      <main className="flex-1 bg-gradient-to-b from-green-50 to-green-100 p-6 pb-20">
        <div className="flex flex-col items-center justify-center h-full space-y-8">
          {/* Client Avatar */}
          <div className="relative">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-3xl">
                {currentScenario?.clientName.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            
            {callState === 'connecting' && (
              <div className="absolute inset-0 w-32 h-32 border-4 border-green-400 rounded-full animate-pulse"></div>
            )}
            
            {callState === 'active' && isListening && (
              <div className="absolute inset-0 w-32 h-32 border-4 border-green-500 rounded-full animate-ping"></div>
            )}
          </div>

          {/* Client Info */}
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-slate-900 mb-1">
              {currentScenario?.clientName}
            </h2>
            <p className="text-slate-600 mb-2">{currentScenario?.clientType}</p>
            <Badge variant="outline">{currentScenario?.title}</Badge>
          </div>

          {/* Call Status */}
          <div className="text-center">
            {callState === 'connecting' && (
              <>
                <p className="text-lg text-slate-600 mb-2">Connecting call...</p>
                <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto"></div>
              </>
            )}
            {callState === 'active' && (
              <>
                <p className="text-lg text-green-600 mb-2">Call Active • {isListening ? 'Listening' : 'Ready'}</p>
                <div className="text-3xl font-mono text-slate-900">
                  {formatCallDuration(callDuration)}
                </div>
                {!isListening && (
                  <p className="text-sm text-slate-500 mt-2">Tap microphone button to start voice input</p>
                )}
              </>
            )}
          </div>

          {/* Debug Info */}
          {debugInfo.length > 0 && (
            <Card className="w-full max-w-sm">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-slate-900">Debug Info</span>
                </div>
                <div className="text-xs text-slate-600 space-y-1 max-h-20 overflow-y-auto">
                  {debugInfo.map((info, index) => (
                    <div key={index}>{info}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Text Input Fallback */}
          {callState === 'active' && (
            <Card className="w-full max-w-sm">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-slate-900">Your Response</span>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type your response..."
                    className="flex-1 px-2 py-1 text-sm border rounded"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && textInput.trim()) {
                        addDebugInfo(`You typed: "${textInput}"`);
                        generateAIResponse(textInput);
                        setTextInput("");
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (textInput.trim()) {
                        addDebugInfo(`You typed: "${textInput}"`);
                        generateAIResponse(textInput);
                        setTextInput("");
                      }
                    }}
                    disabled={!textInput.trim()}
                  >
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Live Transcript */}
          {callState === 'active' && transcript && (
            <Card className="w-full max-w-sm">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-slate-900">Live Transcript</span>
                </div>
                <p className="text-sm text-slate-700 italic">"{transcript}"</p>
              </CardContent>
            </Card>
          )}

          {/* Start Call Button */}
          {callState === 'idle' && (
            <Button
              onClick={startCall}
              size="lg"
              className="w-20 h-20 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg"
            >
              <Phone className="w-10 h-10" />
            </Button>
          )}

          {/* Voice Selection */}
          {callState === 'idle' && selectedScenario && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Choose Client Voice</h3>
                <p className="text-sm text-slate-600">Select the voice and accent for your client</p>
              </div>
              
              <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
                {AVAILABLE_VOICES.map((voice) => (
                  <Button
                    key={voice.id}
                    variant={selectedVoice === voice.id ? "default" : "outline"}
                    onClick={() => setSelectedVoice(voice.id)}
                    className="text-left justify-start p-4 h-auto"
                  >
                    <div>
                      <div className="font-semibold">{voice.name}</div>
                      <div className="text-sm opacity-80">{voice.accent}</div>
                      <div className="text-xs opacity-60">{voice.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Call Controls */}
          {callState === 'active' && (
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="lg"
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full ${!isMuted ? 'bg-green-100 border-green-300' : 'bg-gray-100 border-gray-300'}`}
              >
                {isMuted ? <MicOff className="w-6 h-6 text-gray-600" /> : <Mic className="w-6 h-6 text-green-600" />}
              </Button>

              <div className="text-center">
                <Button
                  onClick={endCall}
                  size="lg"
                  className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white"
                >
                  <PhoneOff className="w-8 h-8" />
                </Button>
                <p className="text-xs text-slate-500 mt-1">End Call</p>
              </div>

              <Button
                variant="outline"
                size="lg"
                onClick={toggleSpeaker}
                className={`w-14 h-14 rounded-full ${!isSpeakerOn ? 'bg-slate-100 border-slate-300' : ''}`}
              >
                {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6 text-slate-400" />}
              </Button>
            </div>
          )}

          {/* Conversation Status */}
          {callState === 'active' && (
            <div className="text-center">
              {isAIResponding ? (
                <p className="text-sm text-blue-600">AI Client speaking...</p>
              ) : isListening ? (
                <p className="text-sm text-green-600">Listening for your response...</p>
              ) : isMuted ? (
                <p className="text-sm text-gray-500">Microphone muted</p>
              ) : (
                <p className="text-sm text-blue-600">Ready to listen...</p>
              )}
            </div>
          )}
        </div>
      </main>

      <BottomNavigation currentPage="voice" />
    </>
  );
}