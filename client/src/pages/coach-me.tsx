import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNavigation from "@/components/bottom-navigation";
import DISCProfile from "@/components/disc-profile";
import { 
  ArrowLeft, 
  ArrowRight,
  ArrowLeft as PrevIcon,
  Lightbulb, 
  Target, 
  MessageSquare, 
  TrendingUp,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

const PHRASE_CATEGORIES = [
  {
    id: "objections",
    title: "Handling Objections",
    icon: Target,
    phrases: [
      {
        situation: "Price is too high",
        poor: "Well, this is our price.",
        better: "I understand price is important. Let me show you the unique value this property offers that justifies the investment.",
        tip: "Always acknowledge the concern first, then redirect to value"
      },
      {
        situation: "Need to think about it",
        poor: "Okay, let me know when you decide.",
        better: "I completely understand - this is a significant decision. What specific aspects would you like to discuss to help you feel more confident?",
        tip: "Identify the real concern behind 'thinking about it'"
      },
      {
        situation: "Comparing with other properties",
        poor: "Our property is the best.",
        better: "Smart approach! Comparing options shows you're making an informed decision. What criteria are most important to you in your comparison?",
        tip: "Praise their diligence while positioning yourself as a helpful advisor"
      }
    ]
  },
  {
    id: "value-building",
    title: "Building Value",
    icon: TrendingUp,
    phrases: [
      {
        situation: "Explaining off-plan benefits",
        poor: "Off-plan is cheaper and you can customize.",
        better: "Off-plan properties offer three key advantages: flexible payment plans that improve your cash flow, potential capital appreciation during construction, and the opportunity to customize your future home to your exact preferences.",
        tip: "Use the rule of three - present benefits in groups of three"
      },
      {
        situation: "Location advantages",
        poor: "This area is good.",
        better: "This location is strategically positioned with excellent connectivity - 10 minutes to downtown, upcoming metro expansion, and surrounded by premium amenities that will enhance your lifestyle and property value.",
        tip: "Be specific with facts and numbers"
      }
    ]
  },
  {
    id: "closing",
    title: "Call-to-Action",
    icon: MessageSquare,
    phrases: [
      {
        situation: "Booking a viewing",
        poor: "Would you like to see it?",
        better: "Based on what you've told me, this property aligns perfectly with your needs. I have availability tomorrow at 2 PM or Thursday at 10 AM - which works better for you?",
        tip: "Offer specific times to make decision-making easier"
      },
      {
        situation: "Moving to next step",
        poor: "Are you interested?",
        better: "I can see this property excites you - your questions show you're already envisioning yourself here. Shall we secure your preferred unit with a reservation today?",
        tip: "Use assumptive language based on their engagement"
      }
    ]
  }
];

type PhraseCard = {
  situation: string;
  poor: string;
  better: string;
  tip: string;
};

export default function CoachMe() {
  const [activeCategory, setActiveCategory] = useState("objections");
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user/1"],
  });

  const analyzeDISCMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/analyze-disc", {
        userId: 1,
      });
      return response.json();
    },
  });

  const currentCategory = PHRASE_CATEGORIES.find(cat => cat.id === activeCategory);
  const currentPhrase = currentCategory?.phrases[currentPhraseIndex];

  const nextPhrase = () => {
    if (currentCategory && currentPhraseIndex < currentCategory.phrases.length - 1) {
      setCurrentPhraseIndex(currentPhraseIndex + 1);
    } else {
      setCurrentPhraseIndex(0);
    }
  };

  const prevPhrase = () => {
    if (currentPhraseIndex > 0) {
      setCurrentPhraseIndex(currentPhraseIndex - 1);
    } else if (currentCategory) {
      setCurrentPhraseIndex(currentCategory.phrases.length - 1);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    setCurrentPhraseIndex(0);
  };

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
            <h1 className="text-lg font-semibold text-slate-900">Coach Me</h1>
            <p className="text-sm text-slate-500">Personalized coaching & tips</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        <Tabs defaultValue="phrases" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
            <TabsTrigger value="phrases">Phrase Bank</TabsTrigger>
            <TabsTrigger value="profile">DISC Profile</TabsTrigger>
          </TabsList>

          {/* Phrase Bank Tab */}
          <TabsContent value="phrases" className="px-4 mt-6">
            {/* Category Selector */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {PHRASE_CATEGORIES.map((category) => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.id}
                    variant={activeCategory === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCategoryChange(category.id)}
                    className="h-auto p-3 flex flex-col items-center space-y-2"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs text-center leading-tight">{category.title}</span>
                  </Button>
                );
              })}
            </div>

            {/* Phrase Card */}
            {currentPhrase && (
              <Card className="mb-6">
                <CardContent className="p-0">
                  {/* Card Header */}
                  <div className="p-4 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">{currentPhrase.situation}</h3>
                      <Badge variant="outline" className="text-xs">
                        {currentPhraseIndex + 1} of {currentCategory?.phrases.length}
                      </Badge>
                    </div>
                  </div>

                  {/* Poor Example */}
                  <div className="p-4 bg-red-50 border-b border-slate-200">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-destructive/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-destructive text-sm">✗</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-destructive mb-1">Avoid saying:</h4>
                        <p className="text-sm text-slate-700 italic">"{currentPhrase.poor}"</p>
                      </div>
                    </div>
                  </div>

                  {/* Better Example */}
                  <div className="p-4 bg-green-50 border-b border-slate-200">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-success text-sm">✓</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-success mb-1">Try this instead:</h4>
                        <p className="text-sm text-slate-700 italic">"{currentPhrase.better}"</p>
                      </div>
                    </div>
                  </div>

                  {/* Tip */}
                  <div className="p-4 bg-blue-50">
                    <div className="flex items-start space-x-3">
                      <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-primary mb-1">Pro Tip:</h4>
                        <p className="text-sm text-blue-700">{currentPhrase.tip}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center mb-6">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={prevPhrase}
                className="flex items-center space-x-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>
              
              <div className="flex space-x-1">
                {currentCategory?.phrases.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPhraseIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentPhraseIndex ? 'bg-primary' : 'bg-slate-300'
                    }`}
                  />
                ))}
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={nextPhrase}
                className="flex items-center space-x-2"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Practice Suggestion */}
            <Card className="bg-gradient-to-r from-primary/10 to-secondary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Target className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-slate-900">Practice Suggestion</h3>
                </div>
                <p className="text-slate-700 mb-4">
                  Try recording yourself saying the improved phrase out loud. Focus on your tone and pace.
                </p>
                <div className="flex space-x-3">
                  <Link href="/voice" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Practice with Voice
                    </Button>
                  </Link>
                  <Link href="/chat" className="flex-1">
                    <Button className="w-full">
                      Practice in Chat
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DISC Profile Tab */}
          <TabsContent value="profile" className="px-4 mt-6">
            <DISCProfile user={user} />
            
            {/* DISC Analysis */}
            <Card className="mt-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Update Your Profile</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => analyzeDISCMutation.mutate()}
                    disabled={analyzeDISCMutation.isPending}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${analyzeDISCMutation.isPending ? 'animate-spin' : ''}`} />
                    <span>Analyze</span>
                  </Button>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  Get an updated DISC analysis based on your recent practice sessions. You need at least 3 sessions for accurate results.
                </p>
                {analyzeDISCMutation.isPending && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-700">Analyzing your communication patterns...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personalized Tips */}
            {user?.discProfile && (
              <Card className="mt-6">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Personalized Tips</h3>
                  <div className="space-y-4">
                    {user.discProfile.primaryType === "D" && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <h4 className="font-medium text-red-800 mb-2">For Dominant (Red) Types:</h4>
                        <ul className="text-sm text-red-700 space-y-1">
                          <li>• Remember to listen actively and not rush the client</li>
                          <li>• Use data and facts to support your arguments</li>
                          <li>• Practice patience with indecisive clients</li>
                        </ul>
                      </div>
                    )}
                    {user.discProfile.primaryType === "I" && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <h4 className="font-medium text-yellow-800 mb-2">For Influencer (Yellow) Types:</h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          <li>• Channel your enthusiasm to build rapport</li>
                          <li>• Focus on benefits and emotional appeals</li>
                          <li>• Prepare facts to support your natural persuasiveness</li>
                        </ul>
                      </div>
                    )}
                    {user.discProfile.primaryType === "S" && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <h4 className="font-medium text-green-800 mb-2">For Steady (Green) Types:</h4>
                        <ul className="text-sm text-green-700 space-y-1">
                          <li>• Use your natural listening skills to understand needs</li>
                          <li>• Practice being more assertive with call-to-actions</li>
                          <li>• Leverage your trustworthy demeanor</li>
                        </ul>
                      </div>
                    )}
                    {user.discProfile.primaryType === "C" && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h4 className="font-medium text-blue-800 mb-2">For Compliant (Blue) Types:</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Use your attention to detail to provide thorough information</li>
                          <li>• Practice being more spontaneous and conversational</li>
                          <li>• Work on building emotional connections</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation currentPage="coach" />
    </>
  );
}
