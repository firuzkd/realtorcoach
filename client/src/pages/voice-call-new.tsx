import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  ArrowLeft,
  User,
  Clock,
  Activity
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import BottomNavigation from "@/components/bottom-navigation";
import { useLocation } from "wouter";

type CallState = 'setup' | 'connecting' | 'active' | 'ended';
type DifficultyLevel = "easy" | "medium" | "hard";

interface CallScenario {
  id: string;
  title: string;
  clientName: string;
  clientType: string;
  scenario: string;
  initialMessage: string;
  difficulty: DifficultyLevel;
}

const CALL_SCENARIOS: CallScenario[] = [
  {
    id: "urgent-viewing",
    title: "Urgent Property Viewing",
    clientName: "Sarah Chen",
    clientType: "Busy Executive", 
    scenario: "Client needs to view property today before flying out tomorrow",
    initialMessage: "Hi, I saw your listing online and I'm very interested. I'm flying out tomorrow morning for a business trip, but I really want to see this property today. Is there any way you can arrange an urgent viewing?",
    difficulty: "medium"
  },
  {
    id: "price-negotiation",
    title: "Price Negotiation Call",
    clientName: "David Kumar", 
    clientType: "Experienced Investor",
    scenario: "Client wants to negotiate on a bulk purchase",
    initialMessage: "I've been looking at your off-plan development and I'm interested in buying 3 units. However, I think your asking price is a bit high for the current market. Can we discuss a better deal?",
    difficulty: "hard"
  },
  {
    id: "first-time-buyer",
    title: "First-Time Buyer Consultation",
    clientName: "Emma Rodriguez",
    clientType: "First-Time Buyer",
    scenario: "Young professional buying first home, needs guidance",
    initialMessage: "Hi, I'm looking to buy my first property and I'm feeling quite overwhelmed. I've saved up for a deposit but I'm not sure about the process or what I should be looking for. Can you help guide me?",
    difficulty: "easy"
  }
];

const DISC_PERSONALITIES = [
  { id: "D", name: "Dominant", description: "Direct, decisive, results-focused" },
  { id: "I", name: "Influential", description: "Enthusiastic, optimistic, people-focused" },
  { id: "S", name: "Steady", description: "Patient, reliable, supportive" },
  { id: "C", name: "Conscientious", description: "Analytical, precise, quality-focused" }
];

export default function VoiceCallNew() {
  const [, setLocation] = useLocation();
  const [callState, setCallState] = useState<CallState>('setup');
  const [selectedScenario, setSelectedScenario] = useState<CallScenario | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('medium');
  const [selectedPersonality, setSelectedPersonality] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [conversation, setConversation] = useState<Array<{role: 'user' | 'ai', content: string, timestamp: number}>>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start call mutation
  const startCallMutation = useMutation({
    mutationFn: async (data: { scenario: string; difficulty: string; personality: string; clientName: string; clientType: string }) => {
      const response = await apiRequest("POST", "/api/voice-call/start", data);
      return response.json();
    },
    onSuccess: () => {
      initiateCall();
    }
  });

  // Send audio mutation
  const sendAudioMutation = useMutation({
    mutationFn: async (audioData: { audio: string; scenario: string; clientName: string; clientType: string }) => {
      const response = await apiRequest("POST", "/api/voice-call/audio", audioData);
      return response.json();
    }
  });

  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "hard": return "bg-red-100 text-red-800";
    }
  };

  const initiateCall = async () => {
    if (!selectedScenario) return;

    setCallState('connecting');
    setConnectionStatus('connecting');

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      streamRef.current = stream;

      // Initialize WebSocket connection
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        setCallState('active');
        startRecording();
        startCallTimer();

        // Send initial setup
        ws.send(JSON.stringify({
          type: 'start_call',
          scenario: selectedScenario.scenario,
          clientName: selectedScenario.clientName,
          clientType: selectedScenario.clientType,
          difficulty: selectedDifficulty,
          personality: selectedPersonality
        }));

        // Send initial AI message
        setTimeout(() => {
          const initialMsg = {
            role: 'ai' as const,
            content: selectedScenario.initialMessage,
            timestamp: Date.now()
          };
          setConversation([initialMsg]);
          playAIResponse(selectedScenario.initialMessage);
        }, 1000);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'transcript') {
          setCurrentTranscript(data.text);
          if (data.is_final) {
            addToConversation('user', data.text);
            setCurrentTranscript('');
          }
        } else if (data.type === 'ai_response') {
          addToConversation('ai', data.message);
          playAIResponse(data.message);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        if (callState === 'active') {
          endCall();
        }
      };

    } catch (error) {
      console.error('Failed to start call:', error);
      setCallState('setup');
      setConnectionStatus('disconnected');
    }
  };

  const startRecording = () => {
    if (!streamRef.current || !wsRef.current) return;

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          // Convert to base64 and send
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = (reader.result as string).split(',')[1];
            wsRef.current?.send(JSON.stringify({
              type: 'audio',
              audio: base64Audio
            }));
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.start(250); // Send audio chunks every 250ms
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const addToConversation = (role: 'user' | 'ai', content: string) => {
    setConversation(prev => [...prev, {
      role,
      content,
      timestamp: Date.now()
    }]);
  };

  const playAIResponse = (text: string) => {
    setIsAISpeaking(true);
    
    // Use browser's built-in speech synthesis
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice settings
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Find a suitable voice (prefer female for variety)
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.name.includes('Female')
      ) || voices.find(voice => voice.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onend = () => {
        setIsAISpeaking(false);
      };
      
      utterance.onerror = () => {
        setIsAISpeaking(false);
      };
      
      speechSynthesis.speak(utterance);
    } else {
      // Fallback: just show text without audio
      setIsAISpeaking(false);
    }
  };

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const endCall = () => {
    // Clean up media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Clean up WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clean up media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clean up timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    setCallState('ended');
    setIsRecording(false);
    setIsAISpeaking(false);
    setConnectionStatus('disconnected');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartCall = () => {
    if (!selectedScenario || !selectedPersonality) return;
    
    startCallMutation.mutate({
      scenario: selectedScenario.scenario,
      difficulty: selectedDifficulty,
      personality: selectedPersonality,
      clientName: selectedScenario.clientName,
      clientType: selectedScenario.clientType
    });
  };

  const resetCall = () => {
    setCallState('setup');
    setCallDuration(0);
    setConversation([]);
    setCurrentTranscript('');
    setSelectedScenario(null);
    setSelectedPersonality('');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  if (callState === 'setup') {
    return (
      <>
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20">
          <div className="px-4 pt-6">
            <div className="flex items-center mb-6">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation('/dashboard')}
                className="mr-3"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-xl font-bold text-slate-900">Voice Call Practice</h1>
            </div>

            <div className="space-y-6">
              {/* Scenario Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Phone className="w-5 h-5 mr-2 text-blue-600" />
                    Select Practice Scenario
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {CALL_SCENARIOS.map((scenario) => (
                    <div
                      key={scenario.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedScenario?.id === scenario.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => setSelectedScenario(scenario)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-slate-900">{scenario.title}</h3>
                        <Badge className={getDifficultyColor(scenario.difficulty)}>
                          {scenario.difficulty}
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm text-slate-600 mb-2">
                        <User className="w-4 h-4 mr-1" />
                        {scenario.clientName} - {scenario.clientType}
                      </div>
                      <p className="text-sm text-slate-600">{scenario.scenario}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Difficulty & Personality Selection */}
              {selectedScenario && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Practice Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Difficulty Level
                      </label>
                      <Select value={selectedDifficulty} onValueChange={(value: DifficultyLevel) => setSelectedDifficulty(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy - Cooperative client</SelectItem>
                          <SelectItem value="medium">Medium - Some objections</SelectItem>
                          <SelectItem value="hard">Hard - Challenging client</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Client Personality (DISC)
                      </label>
                      <Select value={selectedPersonality} onValueChange={setSelectedPersonality}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose personality type" />
                        </SelectTrigger>
                        <SelectContent>
                          {DISC_PERSONALITIES.map(personality => (
                            <SelectItem key={personality.id} value={personality.id}>
                              {personality.name} - {personality.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={handleStartCall}
                      disabled={!selectedPersonality || startCallMutation.isPending}
                      className="w-full"
                      size="lg"
                    >
                      <Phone className="w-5 h-5 mr-2" />
                      {startCallMutation.isPending ? 'Starting Call...' : 'Start Voice Call'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
        <BottomNavigation currentPage="voice" />
      </>
    );
  }

  if (callState === 'connecting') {
    return (
      <>
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20">
          <div className="px-4 pt-6">
            <div className="flex flex-col items-center justify-center min-h-[80vh]">
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <Phone className="w-12 h-12 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Connecting...</h2>
                  <p className="text-slate-600">Setting up your call with {selectedScenario?.clientName}</p>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <BottomNavigation currentPage="voice" />
      </>
    );
  }

  if (callState === 'active') {
    return (
      <>
        <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 pb-20">
          <div className="px-4 pt-6">
            {/* Call Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-slate-600 capitalize">{connectionStatus}</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">{selectedScenario?.clientName}</h1>
              <p className="text-slate-600">{selectedScenario?.clientType}</p>
              <div className="flex items-center justify-center space-x-1 text-lg font-mono text-slate-700 mt-2">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(callDuration)}</span>
              </div>
            </div>

            {/* Conversation Display */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-sm text-slate-600">Live Conversation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {conversation.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-100 text-slate-900'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {currentTranscript && (
                    <div className="flex justify-end">
                      <div className="max-w-xs px-3 py-2 rounded-lg text-sm bg-blue-200 text-blue-800 italic">
                        {currentTranscript}...
                      </div>
                    </div>
                  )}
                  {isAISpeaking && (
                    <div className="flex justify-start">
                      <div className="px-3 py-2 rounded-lg text-sm bg-slate-200 text-slate-600 italic">
                        Speaking...
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Call Controls */}
            <div className="flex items-center justify-center space-x-6">
              <Button
                variant={isMuted ? "default" : "outline"}
                size="lg"
                className="w-16 h-16 rounded-full"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>

              <Button
                variant="destructive"
                size="lg"
                className="w-20 h-20 rounded-full"
                onClick={endCall}
              >
                <PhoneOff className="w-8 h-8" />
              </Button>

              <Button
                variant={isSpeakerOn ? "default" : "outline"}
                size="lg"
                className="w-16 h-16 rounded-full"
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              >
                {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </Button>
            </div>

            {/* Recording Status */}
            <div className="text-center mt-6">
              <div className="flex items-center justify-center space-x-2">
                {isRecording && (
                  <>
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-slate-600">Recording</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
        <BottomNavigation currentPage="voice" />
      </>
    );
  }

  if (callState === 'ended') {
    return (
      <>
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-20">
          <div className="px-4 pt-6">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-slate-400 rounded-full flex items-center justify-center mx-auto">
                <PhoneOff className="w-12 h-12 text-white" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Call Ended</h2>
                <p className="text-slate-600">Duration: {formatDuration(callDuration)}</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Conversation Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {conversation.map((msg, index) => (
                      <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                          msg.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-100 text-slate-900'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Button onClick={resetCall} className="w-full" size="lg">
                  <Phone className="w-5 h-5 mr-2" />
                  Start New Call
                </Button>
                <Button variant="outline" onClick={() => setLocation('/dashboard')} className="w-full">
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </main>
        <BottomNavigation currentPage="voice" />
      </>
    );
  }

  return null;
}