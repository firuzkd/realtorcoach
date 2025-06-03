import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Phone, 
  PhoneOff, 
  ArrowLeft,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import BottomNavigation from "@/components/bottom-navigation";
import { useLocation } from "wouter";

type CallState = 'setup' | 'calling' | 'active' | 'ended';
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

export default function VoiceCallPhone() {
  const [, setLocation] = useLocation();
  const [callState, setCallState] = useState<CallState>('setup');
  const [selectedScenario, setSelectedScenario] = useState<CallScenario | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('medium');
  const [selectedPersonality, setSelectedPersonality] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<string>('');
  const [callSid, setCallSid] = useState<string>('');

  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Start call mutation
  const startCallMutation = useMutation({
    mutationFn: async (data: { 
      scenario: string; 
      difficulty: string; 
      personality: string; 
      clientName: string; 
      clientType: string;
      phoneNumber: string;
    }) => {
      const response = await apiRequest("POST", "/api/twilio/start-call", data);
      return response.json();
    },
    onSuccess: (data) => {
      setCallSid(data.callSid);
      setCallState('calling');
      startCallTimer();
      pollCallStatus(data.callSid);
    },
    onError: (error: any) => {
      console.error('Failed to start call:', error);
      
      // Extract error message from the response
      if (error.response) {
        error.response.json().then((data: any) => {
          if (data.error === 'UAE calling not enabled') {
            setCallStatus(`${data.message} Visit: ${data.setupUrl}`);
          } else {
            setCallStatus(data.message || 'Failed to start call');
          }
        }).catch(() => {
          setCallStatus('Failed to start call');
        });
      } else {
        setCallStatus('Network error - please try again');
      }
    }
  });

  // End call mutation
  const endCallMutation = useMutation({
    mutationFn: async (callSid: string) => {
      const response = await apiRequest("POST", "/api/twilio/end-call", { callSid });
      return response.json();
    },
    onSuccess: () => {
      setCallState('ended');
      stopCallTimer();
    }
  });

  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "hard": return "bg-red-100 text-red-800";
    }
  };

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const pollCallStatus = async (callSid: string) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/twilio/call-status/${callSid}`);
        const data = await response.json();
        
        setCallStatus(data.status);
        
        if (data.status === 'in-progress') {
          setCallState('active');
        } else if (data.status === 'completed' || data.status === 'failed' || data.status === 'busy' || data.status === 'no-answer') {
          setCallState('ended');
          stopCallTimer();
        } else if (data.status === 'ringing') {
          // Continue polling
          setTimeout(checkStatus, 2000);
        }
      } catch (error) {
        console.error('Error checking call status:', error);
      }
    };
    
    checkStatus();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPhoneNumber = (value: string) => {
    // Keep + sign and digits only
    const cleaned = value.replace(/[^\d+]/g, '');
    
    // If it starts with +, keep international format
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // Remove leading + for processing
    const digits = cleaned.replace(/^\+/, '');
    
    // UAE number starting with 971
    if (digits.startsWith('971') || digits.length > 9) {
      return `+${digits}`;
    }
    
    // Default to UAE format
    return `+971${digits}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const getPhoneDigits = (formatted: string) => {
    if (formatted.startsWith('+')) {
      return formatted;
    }
    return `+971${formatted.replace(/\D/g, '')}`;
  };

  const isValidPhoneNumber = (phone: string) => {
    const clean = phone.replace(/[^\d+]/g, '');
    // UAE: +971XXXXXXXXX (13 digits total including +)
    return clean.startsWith('+971') && clean.length === 13;
  };

  const handleStartCall = () => {
    if (!selectedScenario || !selectedPersonality || !phoneNumber) return;
    
    const formattedNumber = getPhoneDigits(phoneNumber);
    if (!isValidPhoneNumber(phoneNumber)) return;
    
    startCallMutation.mutate({
      scenario: selectedScenario.scenario,
      difficulty: selectedDifficulty,
      personality: selectedPersonality,
      clientName: selectedScenario.clientName,
      clientType: selectedScenario.clientType,
      phoneNumber: formattedNumber
    });
  };

  const handleEndCall = () => {
    if (callSid) {
      endCallMutation.mutate(callSid);
    }
  };

  const resetCall = () => {
    setCallState('setup');
    setCallDuration(0);
    setCallStatus('');
    setCallSid('');
    setSelectedScenario(null);
    setSelectedPersonality('');
    setPhoneNumber('');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCallTimer();
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
              <h1 className="text-xl font-bold text-slate-900">Real Phone Call Practice</h1>
            </div>

            <div className="space-y-6">


              {/* Phone Number Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Phone className="w-5 h-5 mr-2 text-blue-600" />
                    Your Phone Number
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="+971501234567"
                      maxLength={13}
                      className="text-lg"
                    />
                    <div className="space-y-1 mt-2">
                      <p className="text-sm text-slate-500">
                        You'll receive a real phone call from the AI client
                      </p>
                      <p className="text-xs text-slate-400">
                        Dubai format: +971XXXXXXXXX (9 digits after country code)
                      </p>
                      {phoneNumber && !isValidPhoneNumber(phoneNumber) && (
                        <p className="text-xs text-red-500">
                          Please enter a valid Dubai phone number (+971XXXXXXXXX)
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scenario Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Select Practice Scenario</CardTitle>
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

              {/* Practice Settings */}
              {selectedScenario && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Practice Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="block text-sm font-medium text-slate-700 mb-2">
                        Difficulty Level
                      </Label>
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
                      <Label className="block text-sm font-medium text-slate-700 mb-2">
                        Client Personality (DISC)
                      </Label>
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
                      disabled={!selectedPersonality || !phoneNumber || !isValidPhoneNumber(phoneNumber) || startCallMutation.isPending}
                      className="w-full"
                      size="lg"
                    >
                      {startCallMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Initiating Call...
                        </>
                      ) : (
                        <>
                          <Phone className="w-5 h-5 mr-2" />
                          Start Phone Call
                        </>
                      )}
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

  if (callState === 'calling') {
    return (
      <>
        <main className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 pb-20">
          <div className="px-4 pt-6">
            <div className="flex flex-col items-center justify-center min-h-[80vh]">
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-yellow-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <Phone className="w-12 h-12 text-white animate-bounce" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Calling Your Phone...</h2>
                  <p className="text-slate-600 mb-2">Answer the call from {selectedScenario?.clientName}</p>
                  <p className="text-sm text-slate-500">Status: {callStatus}</p>
                </div>
                <div className="flex items-center justify-center space-x-1 text-lg font-mono text-slate-700">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(callDuration)}</span>
                </div>
                <Button 
                  onClick={handleEndCall}
                  variant="destructive"
                  size="lg"
                  disabled={endCallMutation.isPending}
                >
                  <PhoneOff className="w-5 h-5 mr-2" />
                  Cancel Call
                </Button>
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
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto">
                <Phone className="w-12 h-12 text-white" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Call Active</h2>
                <p className="text-slate-600 mb-2">Speaking with {selectedScenario?.clientName}</p>
                <p className="text-sm text-slate-500">{selectedScenario?.clientType}</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Call Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-mono text-center text-slate-700">
                    {formatDuration(callDuration)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Scenario Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-left">
                    <p><strong>Scenario:</strong> {selectedScenario?.scenario}</p>
                    <p><strong>Personality:</strong> {DISC_PERSONALITIES.find(p => p.id === selectedPersonality)?.name}</p>
                    <p><strong>Difficulty:</strong> <Badge className={getDifficultyColor(selectedDifficulty)}>{selectedDifficulty}</Badge></p>
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={handleEndCall}
                variant="destructive"
                size="lg"
                disabled={endCallMutation.isPending}
              >
                <PhoneOff className="w-5 h-5 mr-2" />
                End Call
              </Button>
            </div>
          </div>
        </main>
        <BottomNavigation currentPage="voice" />
      </>
    );
  }

  if (callState === 'ended') {
    const getStatusIcon = () => {
      if (callStatus === 'completed') return <CheckCircle className="w-12 h-12 text-green-600" />;
      if (callStatus === 'failed' || callStatus === 'busy' || callStatus === 'no-answer') return <XCircle className="w-12 h-12 text-red-600" />;
      return <PhoneOff className="w-12 h-12 text-slate-600" />;
    };

    const getStatusMessage = () => {
      switch (callStatus) {
        case 'completed': return 'Call completed successfully';
        case 'failed': return 'Call failed';
        case 'busy': return 'Line was busy';
        case 'no-answer': return 'No answer';
        default: return 'Call ended';
      }
    };

    return (
      <>
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-20">
          <div className="px-4 pt-6">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                {getStatusIcon()}
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{getStatusMessage()}</h2>
                <p className="text-slate-600">Duration: {formatDuration(callDuration)}</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Call Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-left">
                    <p><strong>Client:</strong> {selectedScenario?.clientName}</p>
                    <p><strong>Scenario:</strong> {selectedScenario?.scenario}</p>
                    <p><strong>Personality:</strong> {DISC_PERSONALITIES.find(p => p.id === selectedPersonality)?.name}</p>
                    <p><strong>Difficulty:</strong> <Badge className={getDifficultyColor(selectedDifficulty)}>{selectedDifficulty}</Badge></p>
                    <p><strong>Status:</strong> {callStatus}</p>
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