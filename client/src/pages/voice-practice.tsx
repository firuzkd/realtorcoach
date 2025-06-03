import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import BottomNavigation from "@/components/bottom-navigation";
import VoiceRecorder from "@/components/voice-recorder";
import { ArrowLeft, Mic, CheckCircle, TrendingUp, Heart, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const VOICE_SCENARIOS = [
  {
    id: "price-objection",
    title: "Price Objection Response",
    scenario: 'A potential client just WhatsApped: "Hi, I saw your property listing online. The price seems high for the area. Can you justify the cost?"',
    difficulty: "Medium",
    expectedDuration: "30-60 seconds"
  },
  {
    id: "first-inquiry",
    title: "First Inquiry Response",
    scenario: 'A new lead messages: "I\'m interested in off-plan properties. Can you tell me about the payment plans and when I need to pay?"',
    difficulty: "Easy",
    expectedDuration: "45-90 seconds"
  },
  {
    id: "urgent-viewing",
    title: "Urgent Viewing Request",
    scenario: 'An investor calls: "I\'m flying out tomorrow but really want to see this property today. Can you arrange something urgently?"',
    difficulty: "Hard",
    expectedDuration: "20-40 seconds"
  }
];

type AnalysisResult = {
  score: number;
  confidence: number;
  clarity: number;
  energy: number;
  fillerWords: number;
  pace: string;
  feedback: string;
  suggestions: string[];
};

export default function VoicePractice() {
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeVoiceMutation = useMutation({
    mutationFn: async ({ transcript, scenario }: { transcript: string; scenario: string }) => {
      const response = await apiRequest("POST", "/api/analyze-voice", {
        transcript,
        scenario,
      });
      return response.json();
    },
    onSuccess: (result: AnalysisResult) => {
      setAnalysisResult(result);
      setIsAnalyzing(false);
    },
    onError: () => {
      setIsAnalyzing(false);
    },
  });

  const handleRecordingComplete = async (transcript: string) => {
    if (!selectedScenario) return;
    
    setIsAnalyzing(true);
    const scenario = VOICE_SCENARIOS.find(s => s.id === selectedScenario);
    if (scenario) {
      analyzeVoiceMutation.mutate({
        transcript,
        scenario: scenario.scenario,
      });
    }
  };

  const handleStartNewScenario = () => {
    setSelectedScenario("");
    setAnalysisResult(null);
    setIsAnalyzing(false);
  };

  const currentScenario = VOICE_SCENARIOS.find(s => s.id === selectedScenario);

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
              <h1 className="text-lg font-semibold text-slate-900">Voice Practice</h1>
              <p className="text-sm text-slate-500">Record and analyze your responses</p>
            </div>
          </div>
        </header>

        {/* Scenario Selection */}
        <main className="p-4 pb-20">
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="w-8 h-8 text-secondary" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Voice Training</h2>
              <p className="text-slate-600">Practice your verbal responses to common client scenarios</p>
            </div>

            {VOICE_SCENARIOS.map((scenario) => (
              <Card key={scenario.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-slate-900 flex-1">{scenario.title}</h3>
                    <Badge 
                      variant={scenario.difficulty === "Easy" ? "default" : scenario.difficulty === "Medium" ? "secondary" : "destructive"}
                      className="ml-2"
                    >
                      {scenario.difficulty}
                    </Badge>
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-slate-700">{scenario.scenario}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                    <span>Expected duration: {scenario.expectedDuration}</span>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Voice response</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setSelectedScenario(scenario.id)}
                    className="w-full"
                  >
                    Start Recording
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

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={handleStartNewScenario}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Voice Practice</h1>
            <p className="text-sm text-slate-500">Record your response</p>
          </div>
        </div>
      </header>

      {/* Voice Practice Content */}
      <main className="flex-1 p-6 pb-20">
        {/* Scenario */}
        <div className="bg-gradient-to-r from-secondary/10 to-secondary/5 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-slate-900">Scenario</h4>
            <Badge variant="outline">{currentScenario?.difficulty}</Badge>
          </div>
          <p className="text-slate-700">{currentScenario?.scenario}</p>
        </div>

        {/* Voice Recorder */}
        <VoiceRecorder 
          onRecordingComplete={handleRecordingComplete}
          isAnalyzing={isAnalyzing}
        />

        {/* Analysis Results */}
        {analysisResult && (
          <div className="mt-6 space-y-4 animate-fade-in">
            <Card>
              <CardContent className="p-4">
                <h5 className="font-medium text-slate-900 mb-3 flex items-center">
                  <CheckCircle className="w-5 h-5 text-success mr-2" />
                  Analysis Results
                </h5>
                
                {/* Score Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">{analysisResult.score}</div>
                    <div className="text-sm text-slate-500">Overall Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{analysisResult.confidence}</div>
                    <div className="text-sm text-slate-500">Confidence</div>
                  </div>
                </div>

                {/* Detailed Metrics */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Clarity</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={analysisResult.clarity} className="w-20" />
                      <span className="text-sm font-medium">{analysisResult.clarity}%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Energy</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={analysisResult.energy} className="w-20" />
                      <span className="text-sm font-medium">{analysisResult.energy}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Heart className="w-4 h-4 text-destructive" />
                      <span className="text-sm text-slate-600">Filler Words</span>
                    </div>
                    <span className="text-sm font-medium">{analysisResult.fillerWords}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-sm text-slate-600">Pace</span>
                    </div>
                    <Badge variant="outline" className="capitalize">{analysisResult.pace}</Badge>
                  </div>
                </div>

                {/* Feedback */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="text-success w-4 h-4" />
                    <span className="text-sm font-medium text-success">Feedback</span>
                  </div>
                  <p className="text-sm text-green-700">{analysisResult.feedback}</p>
                </div>

                {/* Suggestions */}
                {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="text-primary w-4 h-4" />
                      <span className="text-sm font-medium text-primary">Suggestions</span>
                    </div>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {analysisResult.suggestions.map((suggestion, index) => (
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
              <Button onClick={handleStartNewScenario} variant="outline" className="flex-1">
                Try Another Scenario
              </Button>
              <Button 
                onClick={() => {
                  setAnalysisResult(null);
                  setIsAnalyzing(false);
                }} 
                className="flex-1"
              >
                Record Again
              </Button>
            </div>
          </div>
        )}
      </main>

      <BottomNavigation currentPage="voice" />
    </>
  );
}
