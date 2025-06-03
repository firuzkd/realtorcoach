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
  Play,
  Clock,
  User,
  Activity,
  ArrowLeft
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
    difficulty: "Medium"
  },
  {
    id: "price-negotiation",
    title: "Price Negotiation Call",
    clientName: "David Kumar", 
    clientType: "Experienced Investor",
    scenario: "Client wants to negotiate on a bulk purchase",
    initialMessage: "I've been looking at your off-plan development and I'm interested in buying 3 units. However, I think your asking price is a bit high for the current market. Can we discuss a better deal?",
    difficulty: "Hard"
  },
  {
    id: "first-time-buyer",
    title: "First-Time Buyer Consultation",
    clientName: "Emma Rodriguez",
    clientType: "First-Time Buyer",
    scenario: "Young professional buying first home, needs guidance",
    initialMessage: "Hi, I'm looking to buy my first property and I'm feeling quite overwhelmed. I've saved up for a deposit but I'm not sure about the process or what I should be looking for. Can you help guide me?",
    difficulty: "Easy"
  }
];

const VOICE_OPTIONS = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", accent: "American", gender: "Female", description: "Natural, conversational" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", accent: "American", gender: "Female", description: "Warm, confident" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", accent: "American", gender: "Female", description: "Young professional" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", accent: "American", gender: "Male", description: "Friendly, approachable" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", accent: "American", gender: "Male", description: "Authoritative, experienced" }
];

type CallState = 'idle' | 'ready' | 'active' | 'ended';

export default function VoiceCall() {
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [callState, setCallState] = useState<CallState>('idle');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState("pNInz6obpgDQGcFmaJgB");
  const [textInput, setTextInput] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Array<{speaker: string, message: string}>>([]);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [useFallbackInput, setUseFallbackInput] = useState(false);
  
  const callStartTimeRef = useRef<number>(0);
  const callIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Check speech recognition support on component mount
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      addDebugInfo("Speech recognition available");
    } else {
      setSpeechSupported(false);
      addDebugInfo("Speech recognition not supported - using text input");
      setUseFallbackInput(true);
    }
  }, []);

  const startListening = () => {
    if (!speechSupported) {
      addDebugInfo("Speech recognition not available");
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let finalTranscriptBuffer = '';
      let silenceTimeout: NodeJS.Timeout;

      recognition.onstart = () => {
        setIsListening(true);
        addDebugInfo("Listening for your response...");
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            finalTranscriptBuffer += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscriptBuffer + interimTranscript);

        // Clear existing timeout
        clearTimeout(silenceTimeout);

        // Set new timeout for silence detection
        silenceTimeout = setTimeout(() => {
          if (finalTranscriptBuffer.trim().length > 0 && !isAIResponding) {
            processVoiceInput(finalTranscriptBuffer.trim());
            finalTranscriptBuffer = '';
            setTranscript('');
          }
        }, 2000);

        // Process immediately if we have a final result and it's substantial
        if (finalTranscript.trim().length > 0) {
          clearTimeout(silenceTimeout);
          if (!isAIResponding) {
            processVoiceInput(finalTranscriptBuffer.trim());
            finalTranscriptBuffer = '';
            setTranscript('');
          }
        }
      };

      recognition.onerror = (event: any) => {
        addDebugInfo(`Speech error: ${event.error}`);
        if (event.error === 'not-allowed') {
          addDebugInfo("Microphone permission denied - using text input");
          setUseFallbackInput(true);
        } else if (event.error === 'no-speech') {
          // Normal timeout, just restart
          restartListening();
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (callState === 'active' && !isAIResponding) {
          restartListening();
        }
      };

      recognition.start();
    } catch (error) {
      addDebugInfo("Failed to start speech recognition");
      setUseFallbackInput(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
  };

  const restartListening = () => {
    if (callState === 'active' && !isAIResponding) {
      restartTimeoutRef.current = setTimeout(() => {
        startListening();
      }, 1000);
    }
  };

  const processVoiceInput = async (voiceText: string) => {
    if (voiceText.length < 2) return;
    
    addDebugInfo(`You said: "${voiceText}"`);
    setTranscript('');
    
    // Stop listening while processing
    stopListening();
    
    const scenario = CALL_SCENARIOS.find(s => s.id === selectedScenario);
    if (!scenario) return;

    setIsAIResponding(true);
    
    // Add user message to conversation
    setConversationHistory(prev => [...prev, {
      speaker: "You",
      message: voiceText
    }]);

    try {
      const result = await generateResponseMutation.mutateAsync({
        message: voiceText,
        scenario: scenario.scenario,
        clientName: scenario.clientName,
        clientType: scenario.clientType
      });

      if (result.response) {
        addDebugInfo(`${scenario.clientName}: "${result.response}"`);
        
        // Add AI response to conversation
        setConversationHistory(prev => [...prev, {
          speaker: scenario.clientName,
          message: result.response
        }]);

        // Play audio if available
        if (result.audioUrl) {
          await playAudio(result.audioUrl);
        }
      }
    } catch (error) {
      addDebugInfo("Error generating response");
      console.error("Response error:", error);
    } finally {
      setIsAIResponding(false);
      // Restart listening after AI responds
      if (callState === 'active') {
        setTimeout(() => {
          if (!isListening) {
            startListening();
          }
        }, 2000);
      }
    }
  };

  const startCall = async () => {
    const scenario = CALL_SCENARIOS.find(s => s.id === selectedScenario);
    if (!scenario) return;

    setCallState('ready');
    setConversationHistory([]);
    addDebugInfo(`Starting call with ${scenario.clientName}`);
    
    // Add initial client message to conversation
    setConversationHistory([{
      speaker: scenario.clientName,
      message: scenario.initialMessage
    }]);
    
    addDebugInfo(`${scenario.clientName}: "${scenario.initialMessage}"`);
    
    // Start call timer
    callStartTimeRef.current = Date.now();
    callIntervalRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
    }, 1000);
    
    setCallState('active');
    
    // Start listening after initial audio finishes
    setTimeout(() => {
      if (speechSupported && !useFallbackInput) {
        startListening();
      }
    }, 4000);
  };

  const playAudio = async (audioUrl: string) => {
    if (currentAudio) {
      currentAudio.pause();
    }
    
    const audio = new Audio(audioUrl);
    setCurrentAudio(audio);
    
    audio.onended = () => {
      addDebugInfo("Audio finished - ready to listen");
      // Auto-restart listening after audio finishes
      if (callState === 'active' && speechSupported && !useFallbackInput && !isListening) {
        setTimeout(() => {
          startListening();
        }, 500);
      }
    };
    
    try {
      await audio.play();
      addDebugInfo("Audio playing...");
    } catch (error) {
      addDebugInfo("Click play button to hear audio");
    }
  };

  const sendResponse = async () => {
    if (!textInput.trim()) return;
    
    const scenario = CALL_SCENARIOS.find(s => s.id === selectedScenario);
    if (!scenario) return;

    setIsAIResponding(true);
    addDebugInfo(`You: "${textInput}"`);
    
    // Add user message to conversation
    setConversationHistory(prev => [...prev, {
      speaker: "You",
      message: textInput
    }]);

    try {
      const result = await generateResponseMutation.mutateAsync({
        message: textInput,
        scenario: scenario.scenario,
        clientName: scenario.clientName,
        clientType: scenario.clientType
      });

      if (result.response) {
        addDebugInfo(`${scenario.clientName}: "${result.response}"`);
        
        // Add AI response to conversation
        setConversationHistory(prev => [...prev, {
          speaker: scenario.clientName,
          message: result.response
        }]);

        // Play audio if available
        if (result.audioUrl) {
          await playAudio(result.audioUrl);
        }
      }
    } catch (error) {
      addDebugInfo("Error generating response");
      console.error("Response error:", error);
    } finally {
      setIsAIResponding(false);
      setTextInput("");
    }
  };

  const endCall = () => {
    setCallState('ended');
    stopListening();
    if (callIntervalRef.current) {
      clearInterval(callIntervalRef.current);
    }
    if (currentAudio) {
      currentAudio.pause();
    }
    addDebugInfo("Call ended");
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
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-6 w-6" />
                Voice Call Practice
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Setup */}
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

                <div>
                  <label className="text-sm font-medium">Client Voice</label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICE_OPTIONS.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name} - {voice.description} ({voice.gender})
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

            {/* Active Call */}
            {(callState === 'ready' || callState === 'active') && selectedScenarioData && (
              <div className="space-y-4">
                {/* Call Status */}
                <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">Connected with {selectedScenarioData.clientName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    {formatDuration(callDuration)}
                  </div>
                </div>

                {/* Voice Status Indicator */}
                {speechSupported && !useFallbackInput && (
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${
                          isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-sm font-medium">
                          {isListening ? 'Listening...' : isAIResponding ? 'AI responding...' : 'Ready to listen'}
                        </span>
                      </div>
                      {transcript && (
                        <span className="text-xs text-gray-500">"{transcript}"</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Conversation History */}
                <div className="bg-white border rounded-lg p-4 max-h-64 overflow-y-auto">
                  <h4 className="font-medium mb-3">Conversation</h4>
                  <div className="space-y-3">
                    {conversationHistory.map((item, index) => (
                      <div key={index} className={`p-3 rounded-lg ${
                        item.speaker === 'You' 
                          ? 'bg-blue-50 ml-4' 
                          : 'bg-gray-50 mr-4'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{item.speaker}</span>
                          {item.speaker !== 'You' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                try {
                                  const result = await generateResponseMutation.mutateAsync({
                                    message: "REPLAY_MESSAGE",
                                    scenario: selectedScenarioData.scenario,
                                    clientName: selectedScenarioData.clientName,
                                    clientType: selectedScenarioData.clientType
                                  });
                                  if (result.audioUrl) {
                                    await playAudio(result.audioUrl);
                                  }
                                } catch (error) {
                                  addDebugInfo("Failed to replay audio");
                                }
                              }}
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm">{item.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Voice Controls */}
                {speechSupported && !useFallbackInput && (
                  <div className="flex justify-center gap-4">
                    <Button
                      variant={isListening ? "destructive" : "outline"}
                      onClick={() => {
                        if (isListening) {
                          stopListening();
                        } else {
                          startListening();
                        }
                      }}
                      disabled={isAIResponding}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  </div>
                )}

                {/* Text Input Fallback */}
                {(useFallbackInput || !speechSupported) && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Your Response (Text Mode)</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your response as the real estate agent..."
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isAIResponding && sendResponse()}
                        disabled={isAIResponding}
                      />
                      <Button 
                        onClick={sendResponse}
                        disabled={!textInput.trim() || isAIResponding}
                      >
                        {isAIResponding ? 'Thinking...' : 'Send'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Call Controls */}
                <div className="flex justify-center gap-4">
                  <Button
                    variant="destructive"
                    onClick={endCall}
                  >
                    <PhoneOff className="h-4 w-4 mr-2" />
                    End Call
                  </Button>
                </div>
              </div>
            )}

            {/* Call Ended */}
            {callState === 'ended' && (
              <div className="text-center space-y-4">
                <h3 className="font-semibold">Call Completed</h3>
                <p className="text-sm text-gray-600">Duration: {formatDuration(callDuration)}</p>
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