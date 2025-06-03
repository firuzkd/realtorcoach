import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n";
import BottomNavigation from "@/components/bottom-navigation";
import ChatMessage from "@/components/chat-message";
import { ArrowLeft, Send, Lightbulb, User, StopCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Challenge, Session, Message } from "@shared/schema";

// DISC personality types for client behavior
const discPersonalities = {
  D: {
    name: "Direct & Decisive",
    traits: "Business-focused, time-conscious, goal-oriented",
    behavior: "Prefers efficiency, likes clear outcomes, values results",
    color: "bg-red-500"
  },
  I: {
    name: "Social & Engaging", 
    traits: "People-oriented, optimistic, relationship-focused",
    behavior: "Enjoys conversation, values personal connection, collaborative",
    color: "bg-yellow-500"
  },
  S: {
    name: "Thoughtful & Steady",
    traits: "Careful, supportive, relationship-oriented",
    behavior: "Takes time to decide, values stability, asks clarifying questions",
    color: "bg-green-500"
  },
  C: {
    name: "Detail-Oriented & Thorough",
    traits: "Quality-focused, analytical, research-minded",
    behavior: "Wants comprehensive information, values accuracy, methodical",
    color: "bg-blue-500"
  }
};

// Difficulty levels for practice sessions
const difficultyLevels = {
  easy: {
    name: "Beginner",
    description: "Basic interactions, patient clients, straightforward scenarios",
    color: "bg-green-100 text-green-800",
    icon: "🟢"
  },
  medium: {
    name: "Intermediate", 
    description: "Moderate objections, realistic client behavior, some challenges",
    color: "bg-yellow-100 text-yellow-800",
    icon: "🟡"
  },
  hard: {
    name: "Advanced",
    description: "Complex objections, demanding clients, challenging negotiations",
    color: "bg-red-100 text-red-800",
    icon: "🔴"
  }
};

// Default scenarios if API fails
const getDefaultScenarios = () => [
  {
    id: "property-inquiry",
    title: "Property Inquiry",
    description: "Client interested in off-plan development",
    baseMessage: "Hi! I'm interested in your off-plan development."
  },
  {
    id: "investment-consultation", 
    title: "Investment Consultation",
    description: "Client seeking investment advice",
    baseMessage: "I'm looking to invest in property."
  },
  {
    id: "price-negotiation",
    title: "Price Negotiation",
    description: "Client wanting to negotiate pricing",
    baseMessage: "I'm interested but concerned about the pricing."
  }
];

export default function ChatRoleplay() {
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [selectedDiscType, setSelectedDiscType] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<"scenario" | "difficulty" | "personality">("scenario");
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: [`/api/sessions/${currentSession?.id}/messages`],
    enabled: !!currentSession?.id,
  });

  const { data: apiScenarios = getDefaultScenarios() } = useQuery({
    queryKey: ['/api/challenges'],
    select: (data: any[]) => {
      // Transform challenges/scenarios from the API into the format we need
      return data.map((challenge: any) => ({
        id: challenge.id.toString(),
        title: challenge.title,
        description: challenge.description,
        baseMessage: challenge.scenario || challenge.initialMessage || `Hi! I'm interested in ${challenge.title.toLowerCase()}.`
      }));
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async ({ scenarioId, discType, difficulty }: { scenarioId: string, discType: string, difficulty: string }) => {
      const scenario = apiScenarios.find((s: any) => s.id === scenarioId);
      const discPersonality = discPersonalities[discType as keyof typeof discPersonalities];
      const difficultyLevel = difficultyLevels[difficulty as keyof typeof difficultyLevels];
      
      if (!scenario || !discPersonality || !difficultyLevel) throw new Error("Scenario, personality, or difficulty not found");

      const response = await apiRequest("POST", "/api/sessions", {
        userId: 1,
        type: "chat",
        scenario: `${scenario.title} - ${discPersonality.name} Client (${difficultyLevel.name}): ${discPersonality.behavior}`,
        score: 0,
      });
      return response.json();
    },
    onSuccess: (session: Session) => {
      setCurrentSession(session);
      // Create personalized initial message based on DISC type
      const scenario = apiScenarios.find((s: any) => s.id === selectedScenario);
      const discPersonality = discPersonalities[selectedDiscType as keyof typeof discPersonalities];
      
      if (scenario && discPersonality) {
        let initialMessage = "";
        switch (selectedDiscType) {
          case "D":
            initialMessage = `${scenario.baseMessage} What are the key benefits and timeline for this opportunity?`;
            break;
          case "I":
            initialMessage = `Hi! ${scenario.baseMessage} I'd love to learn more about what makes this special.`;
            break;
          case "S":
            initialMessage = `Hello, ${scenario.baseMessage} Could you help me understand the process and what to expect?`;
            break;
          case "C":
            initialMessage = `${scenario.baseMessage} Could you provide some details about the specifications and market conditions?`;
            break;
          default:
            initialMessage = scenario.baseMessage;
        }
        
        sendMessageMutation.mutate({
          sessionId: session.id,
          content: initialMessage,
          isAgent: false,
        });
      }
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { sessionId: number; content: string; isAgent: boolean }) => {
      const response = await apiRequest("POST", "/api/messages", messageData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sessions/${currentSession?.id}/messages`] });
      setNewMessage("");
      setIsTyping(false);
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: async () => {
      if (!currentSession) return;
      
      // Calculate final score based on message feedback
      const agentMessages = messages.filter(m => m.isAgent && m.feedback);
      let totalScore = 0;
      let messageCount = 0;
      
      agentMessages.forEach(msg => {
        if (msg.feedback) {
          const feedback = msg.feedback as any;
          const scoreSum = (feedback.confidence || 0) + (feedback.clarity || 0) + (feedback.value || 0) + (feedback.cta || 0);
          const score = scoreSum / 4;
          totalScore += score;
          messageCount++;
        }
      });
      
      const finalSessionScore = messageCount > 0 ? Math.round(totalScore / messageCount) : 0;
      
      const response = await apiRequest("PATCH", `/api/sessions/${currentSession.id}`, {
        score: finalSessionScore,
        completed: true
      });
      
      return { score: finalSessionScore };
    },
    onSuccess: (data) => {
      if (data) {
        setFinalScore(data.score);
        setShowScoreModal(true);
      }
    },
  });

  const handleStartScenario = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    // This function is no longer used - scenarios are selected through the step flow
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !currentSession) return;
    
    setIsTyping(true);
    sendMessageMutation.mutate({
      sessionId: currentSession.id,
      content: newMessage,
      isAgent: true,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const currentScenario = apiScenarios.find((s: any) => s.id === selectedScenario);
  const sessionScore = currentSession?.score || 0;

  if (!currentSession) {
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
              <h1 className="text-lg font-semibold text-slate-900">Chat Practice</h1>
              <p className="text-sm text-slate-500">Choose a roleplay scenario</p>
            </div>
          </div>
        </header>

        {/* Scenario Selection Screen */}
        {currentStep === "scenario" && (
          <main className="p-4 pb-20">
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Choose Practice Scenario</h2>
                <p className="text-slate-600">Select the type of client interaction to practice</p>
              </div>

              <div className="space-y-3">
                {apiScenarios.map((scenario: any) => (
                  <Card 
                    key={scenario.id} 
                    className={`cursor-pointer transition-all ${
                      selectedScenario === scenario.id 
                        ? 'ring-2 ring-primary border-primary' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => {
                      setSelectedScenario(scenario.id);
                      setCurrentStep("difficulty");
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-medium text-sm">{scenario.id.slice(0,2).toUpperCase()}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 mb-1">{scenario.title}</h4>
                          <p className="text-sm text-slate-600">{scenario.description}</p>
                        </div>
                        {selectedScenario === scenario.id && (
                          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>


            </div>
          </main>
        )}

        {/* Difficulty Selection Screen */}
        {currentStep === "difficulty" && (
          <main className="p-4 pb-20">
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Choose Difficulty Level</h2>
                <p className="text-slate-600">Select your practice difficulty</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {Object.entries(difficultyLevels).map(([key, difficulty]) => (
                  <Card 
                    key={key}
                    className={`cursor-pointer transition-all ${
                      selectedDifficulty === key 
                        ? 'ring-2 ring-primary border-primary' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => {
                      setSelectedDifficulty(key);
                      setCurrentStep("personality");
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">{difficulty.icon}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-slate-900">{difficulty.name}</h4>
                            <Badge className={difficulty.color}>{key.toUpperCase()}</Badge>
                          </div>
                          <p className="text-sm text-slate-600">{difficulty.description}</p>
                        </div>
                        {selectedDifficulty === key && (
                          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-center">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep("scenario")}
                  className="w-32"
                >
                  Back
                </Button>
              </div>
            </div>
          </main>
        )}

        {/* Personality Selection Screen */}
        {currentStep === "personality" && (
          <main className="p-4 pb-20">
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Choose Client Personality</h2>
                <p className="text-slate-600">Select the personality type to practice with</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {Object.entries(discPersonalities).map(([key, personality]) => (
                  <Card 
                    key={key}
                    className={`cursor-pointer transition-all ${
                      selectedDiscType === key 
                        ? 'ring-2 ring-primary border-primary' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => {
                      setSelectedDiscType(key);
                      createSessionMutation.mutate({ scenarioId: selectedScenario, discType: key, difficulty: selectedDifficulty });
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <div className={`w-10 h-10 ${personality.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white font-bold text-sm">{key}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 mb-1">{personality.name}</h4>
                          <p className="text-xs text-slate-600 mb-2">{personality.traits}</p>
                          <p className="text-xs text-slate-500">{personality.behavior}</p>
                        </div>
                        {selectedDiscType === key && (
                          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-center">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep("difficulty")}
                  className="w-32"
                >
                  Back
                </Button>
              </div>
            </div>
          </main>
        )}

        <BottomNavigation currentPage="chat" />
      </>
    );
  }

  return (
    <>
      {/* Chat Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setCurrentSession(null)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className={`w-10 h-10 ${discPersonalities[selectedDiscType as keyof typeof discPersonalities]?.color || 'bg-purple-500'} rounded-full flex items-center justify-center`}>
              <span className="text-white font-medium">{selectedDiscType}</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{discPersonalities[selectedDiscType as keyof typeof discPersonalities]?.name || 'Client'}</h3>
              <p className="text-sm text-slate-500">{currentScenario?.title}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-success/10 px-3 py-1 rounded-full">
              <span className="text-success text-sm font-medium">Score: {sessionScore}</span>
            </div>
            <Button
              onClick={() => endSessionMutation.mutate()}
              disabled={endSessionMutation.isPending || messages.length < 3}
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <StopCircle className="w-4 h-4 mr-1" />
              End
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isTyping && (
              <div className="flex items-start space-x-3">
                <div className={`w-8 h-8 ${discPersonalities[selectedDiscType as keyof typeof discPersonalities]?.color || 'bg-purple-500'} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-sm">{selectedDiscType || 'AI'}</span>
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-tl-md p-3 max-w-xs">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Chat Input - Fixed at bottom with proper spacing */}
      <div className="p-4 border-t border-slate-200 bg-white sticky bottom-16 z-40">
        <div className="flex items-center space-x-3">
          <div className="flex-1 bg-slate-100 rounded-2xl px-4 py-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response..."
              className="w-full bg-transparent border-0 outline-none focus:ring-0 p-0"
              disabled={sendMessageMutation.isPending}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            size="icon"
            className="w-10 h-10 rounded-full"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Score Results Modal */}
      <Dialog open={showScoreModal} onOpenChange={setShowScoreModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Session Complete!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-primary">{finalScore}</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Great Work!</h3>
            <p className="text-slate-600 mb-6">
              You completed the {currentScenario?.title} scenario. Your average score was {finalScore}/100.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => {
                  setShowScoreModal(false);
                  setCurrentSession(null);
                  setSelectedScenario("");
                }}
                className="w-full"
              >
                Try Another Scenario
              </Button>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation currentPage="chat" />
    </>
  );
}
