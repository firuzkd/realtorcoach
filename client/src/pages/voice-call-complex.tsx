import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  MessageSquare,
  Activity,
  Clock,
  User,
  Settings
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
    clientName: "Emma Rodriguez",
    clientType: "First-Time Buyer",
    scenario: "Young professional buying first home, needs guidance",
    initialMessage: "Hi, I'm looking to buy my first property and I'm feeling quite overwhelmed. I've saved up for a deposit but I'm not sure about the process or what I should be looking for. Can you help guide me?",
    difficulty: "Easy",
    expectedDuration: "2-4 minutes"
  }
];

const VOICE_OPTIONS = [
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", accent: "American", gender: "Male" },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", accent: "American", gender: "Female" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", accent: "American", gender: "Female" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", accent: "American", gender: "Female" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", accent: "American", gender: "Male" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", accent: "American", gender: "Female" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", accent: "American", gender: "Male" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", accent: "American", gender: "Male" },
  { id: "pqHfZKP75CvOlQylNhV4", name: "Bill", accent: "American", gender: "Male" },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", accent: "American", gender: "Male" }
];

type CallState = 'idle' | 'connecting' | 'active' | 'ended';

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
  const [selectedVoice, setSelectedVoice] = useState("pNInz6obpgDQGcFmaJgB");
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);
  const [deepgramConnected, setDeepgramConnected] = useState(false);
  const [needsAudioPermission, setNeedsAudioPermission] = useState(false);
  const [pendingAudio, setPendingAudio] = useState<HTMLAudioElement | null>(null);
  
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
        scenario
      });
      return response;
    },
    onSuccess: (result) => {
      setCallAnalysis(result);
    }
  });

  const generateResponseMutation = useMutation({
    mutationFn: async ({ message, scenario, clientName, clientType }: { 
      message: string; 
      scenario: string; 
      clientName: string; 
      clientType: string; 
    }) => {
      const response = await apiRequest("POST", "/api/voice-call-response", {
        agentMessage: message,
        scenario,
        clientName,
        clientType,
        voiceId: selectedVoice
      });
      return await response.json();
    }
  });

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${info}`]);
  };

  // Professional Deepgram speech recognition setup
  const startDeepgramConnection = async () => {
    try {
      addDebugInfo("Starting professional speech recognition...");
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;
      
      // Create WebSocket connection to server
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        addDebugInfo("Connected to speech recognition server");
        setDeepgramConnected(true);
        setIsListening(true);
        
        // Send start command
        ws.send(JSON.stringify({ type: 'start' }));
        
        // Set up audio processing
        setupAudioProcessing(stream, ws);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'transcript') {
          const text = data.text.trim();
          if (text) {
            setTranscript(text);
            addDebugInfo(`You said: "${text}"`);
            
            // Generate AI response for final transcripts
            if (data.is_final && text.length > 2 && !isAIResponding) {
              const scenario = CALL_SCENARIOS.find(s => s.id === selectedScenario);
              if (scenario) {
                generateAIResponse(text, scenario);
              }
            }
          }
        } else if (data.type === 'speech_started') {
          setIsRecording(true);
        } else if (data.type === 'speech_ended') {
          setIsRecording(false);
        }
      };
      
      ws.onerror = (error) => {
        addDebugInfo("Speech recognition error occurred");
        console.error("WebSocket error:", error);
      };
      
      ws.onclose = () => {
        addDebugInfo("Speech recognition disconnected");
        setDeepgramConnected(false);
        setIsListening(false);
        
        // Don't auto-reconnect if call ended
        if (callState === 'active') {
          addDebugInfo("Attempting to reconnect speech recognition...");
          setTimeout(() => {
            if (callState === 'active') {
              startDeepgramConnection();
            }
          }, 2000);
        }
      };
      
    } catch (error) {
      addDebugInfo("Failed to start speech recognition");
      console.error("Microphone access error:", error);
      setShowTextInput(true);
    }
  };

  const setupAudioProcessing = (stream: MediaStream, ws: WebSocket) => {
    try {
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      addDebugInfo("Setting up audio processing...");
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0);
          
          // Convert to 16-bit PCM
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          
          // Send audio data to server
          ws.send(pcmData.buffer);
          
          // Calculate audio level for visual feedback
          const sum = inputData.reduce((acc, val) => acc + Math.abs(val), 0);
          const level = sum / inputData.length;
          setAudioLevel(level * 100);
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      addDebugInfo("Audio processing setup complete");
    } catch (error) {
      addDebugInfo("Audio processing setup failed");
      console.error("Audio processing error:", error);
    }
  };

  const generateAIResponse = async (userMessage: string, scenario: any) => {
    if (isAIResponding) return;
    
    setIsAIResponding(true);
    addDebugInfo("AI is thinking...");
    
    try {
      const result = await generateResponseMutation.mutateAsync({
        message: userMessage,
        scenario: scenario.scenario,
        clientName: scenario.clientName,
        clientType: scenario.clientType
      });
      
      if (result.audioUrl) {
        addDebugInfo(`${scenario.clientName}: "${result.response}"`);
        
        // Play AI response
        if (result.audioUrl) {
          const audio = new Audio(result.audioUrl);
          audio.onended = () => {
            setIsAIResponding(false);
            // Continue listening after AI finishes speaking
            if (callState === 'active' && deepgramConnected) {
              addDebugInfo("Listening for your response...");
            }
          };
          audio.play();
        }
      }
      
      setTranscript("");
      
    } catch (error) {
      addDebugInfo("Error generating AI response");
      console.error("AI response error:", error);
      setIsAIResponding(false);
    }
  };

  const startCall = async () => {
    const scenario = CALL_SCENARIOS.find(s => s.id === selectedScenario);
    if (!scenario) return;

    setCallState('connecting');
    addDebugInfo(`Connecting to ${scenario.clientName}...`);
    
    setTimeout(async () => {
      setCallState('active');
      setConversationActive(true);
      callStartTimeRef.current = Date.now();
      
      // Start call timer
      callIntervalRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }, 1000);
      
      addDebugInfo(`Call connected with ${scenario.clientName}`);
      addDebugInfo("Starting speech recognition...");
      
      // Start Deepgram speech recognition
      await startDeepgramConnection();
      
      // Play initial client message
      setTimeout(async () => {
        if (isSpeakerOn) {
          try {
            addDebugInfo(`${scenario.clientName}: "${scenario.initialMessage}"`);
            
            const result = await generateResponseMutation.mutateAsync({
              message: "INITIAL_MESSAGE",
              scenario: scenario.scenario,
              clientName: scenario.clientName,
              clientType: scenario.clientType
            });
            
            if (result.audioUrl) {
              addDebugInfo("Playing client audio...");
              const audio = new Audio(result.audioUrl);
              audio.onplay = () => addDebugInfo("Audio started playing");
              audio.onended = () => addDebugInfo("Audio finished playing");
              audio.onerror = (e) => addDebugInfo("Audio playback error");
              
              try {
                await audio.play();
              } catch (playError) {
                addDebugInfo("Audio autoplay blocked - click button to enable audio");
                setPendingAudio(audio);
                setNeedsAudioPermission(true);
              }
            }
          } catch (error) {
            addDebugInfo("Failed to play initial message");
          }
        }
      }, 2000);
      
    }, 1500);
  };

  const endCall = () => {
    setCallState('ended');
    setConversationActive(false);
    
    // Stop speech recognition
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    if (callIntervalRef.current) {
      clearInterval(callIntervalRef.current);
    }
    
    setIsListening(false);
    setDeepgramConnected(false);
    setIsAIResponding(false);
    
    addDebugInfo("Call ended");
    
    // Analyze the call
    if (transcript) {
      analyzeCallMutation.mutate({ 
        transcript, 
        scenario: selectedScenario 
      });
    }
  };

  const sendTextMessage = () => {
    if (!textInput.trim()) return;
    
    const scenario = CALL_SCENARIOS.find(s => s.id === selectedScenario);
    if (scenario) {
      addDebugInfo(`You said: "${textInput}"`);
      generateAIResponse(textInput, scenario);
      setTextInput("");
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedScenarioData = CALL_SCENARIOS.find(s => s.id === selectedScenario);
  const selectedVoiceData = VOICE_OPTIONS.find(v => v.id === selectedVoice);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-6 w-6" />
              Professional Voice Call Practice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Scenario Selection */}
            {callState === 'idle' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Choose Call Scenario</label>
                  <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a practice scenario" />
                    </SelectTrigger>
                    <SelectContent>
                      {CALL_SCENARIOS.map((scenario) => (
                        <SelectItem key={scenario.id} value={scenario.id}>
                          {scenario.title} - {scenario.difficulty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Voice Selection */}
                <div>
                  <label className="text-sm font-medium">Client Voice</label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICE_OPTIONS.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name} ({voice.gender}, {voice.accent})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedScenarioData && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedScenarioData.clientName} - {selectedScenarioData.clientType}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedScenarioData.scenario}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Expected duration: {selectedScenarioData.expectedDuration}
                    </p>
                  </div>
                )}

                <Button 
                  onClick={startCall} 
                  disabled={!selectedScenario}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Start Call
                </Button>
              </div>
            )}

            {/* Active Call Interface */}
            {(callState === 'connecting' || callState === 'active') && (
              <div className="space-y-4">
                {/* Call Status */}
                <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">
                      {callState === 'connecting' ? 'Connecting...' : `Connected with ${selectedScenarioData?.clientName}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    {formatDuration(callDuration)}
                  </div>
                </div>

                {/* Voice/Speech Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm">
                      Speech: {deepgramConnected ? 'Connected' : 'Connecting...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className={`h-2 w-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
                    <span className="text-sm">
                      {isListening ? 'Listening' : 'Not listening'}
                    </span>
                  </div>
                </div>

                {/* Current Transcript */}
                {transcript && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium">You're saying:</p>
                    <p className="text-sm">{transcript}</p>
                  </div>
                )}

                {/* AI Response Status */}
                {isAIResponding && (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm font-medium">AI is responding...</p>
                  </div>
                )}

                {/* Audio Permission Button */}
                {needsAudioPermission && (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm font-medium mb-2">Audio permission needed</p>
                    <p className="text-sm text-gray-600 mb-3">Click to enable audio playback for the voice call</p>
                    <Button 
                      onClick={async () => {
                        if (pendingAudio) {
                          try {
                            await pendingAudio.play();
                            setNeedsAudioPermission(false);
                            setPendingAudio(null);
                            addDebugInfo("Audio enabled successfully");
                          } catch (error) {
                            addDebugInfo("Failed to enable audio");
                          }
                        }
                      }}
                      className="w-full"
                    >
                      <Volume2 className="h-4 w-4 mr-2" />
                      Enable Audio
                    </Button>
                  </div>
                )}

                {/* Text Input Fallback */}
                {showTextInput && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
                    />
                    <Button onClick={sendTextMessage}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Call Controls */}
                <div className="flex justify-center gap-4">
                  <Button
                    variant={isMuted ? "destructive" : "outline"}
                    size="lg"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  
                  <Button
                    variant={isSpeakerOn ? "outline" : "secondary"}
                    size="lg"
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  >
                    {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowTextInput(!showTextInput)}
                  >
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={endCall}
                  >
                    <PhoneOff className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Call Analysis */}
            {callState === 'ended' && callAnalysis && (
              <div className="space-y-4">
                <h3 className="font-semibold">Call Analysis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm font-medium">Overall Score</p>
                    <p className="text-2xl font-bold">{callAnalysis.score}/10</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm font-medium">Confidence</p>
                    <p className="text-2xl font-bold">{callAnalysis.confidence}/10</p>
                  </div>
                </div>
                
                {callAnalysis.feedback && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">Feedback</p>
                    <p className="text-sm">{callAnalysis.feedback}</p>
                  </div>
                )}
                
                <Button onClick={() => window.location.reload()} className="w-full">
                  Start New Call
                </Button>
              </div>
            )}

            {/* Debug Information */}
            {debugInfo.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Call Log</h4>
                <div className="space-y-1 text-xs text-gray-600 max-h-32 overflow-y-auto">
                  {debugInfo.map((info, index) => (
                    <div key={index}>{info}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}