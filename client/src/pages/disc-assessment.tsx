import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from "@/lib/i18n";
import BottomNavigation from "@/components/bottom-navigation";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  BarChart3, 
  TrendingUp,
  Users,
  Target,
  Brain,
  Star
} from "lucide-react";
import { 
  DISC_QUESTIONS, 
  calculateDiscResults, 
  getStyleName, 
  getStyleDescription,
  getCoachingRecommendations,
  type DiscResponse,
  type DiscResults 
} from "@/lib/disc-assessment";
import { apiRequest } from "@/lib/queryClient";
import type { User, DiscAssessment } from "@shared/schema";

export default function DiscAssessmentPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<DiscResponse[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [intensity, setIntensity] = useState<number[]>([3]);
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<DiscResults | null>(null);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user/1"],
  });

  const { data: previousAssessments = [] } = useQuery<DiscAssessment[]>({
    queryKey: ["/api/users/1/disc-assessments"],
  });

  const saveAssessmentMutation = useMutation({
    mutationFn: async (assessmentData: {
      responses: DiscResponse[];
      results: DiscResults;
    }) => {
      const response = await apiRequest("POST", "/api/disc-assessments", {
        userId: 1,
        assessmentType: "initial",
        responses: assessmentData.responses,
        results: assessmentData.results,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/1/disc-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/1"] });
    },
  });

  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId);
  };

  const handleNext = () => {
    if (!selectedOption) return;

    const newResponse: DiscResponse = {
      questionId: DISC_QUESTIONS[currentQuestion].id,
      selectedOptions: [selectedOption],
      intensity: intensity[0],
    };

    const updatedResponses = [...responses, newResponse];
    setResponses(updatedResponses);

    if (currentQuestion < DISC_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption("");
      setIntensity([3]);
    } else {
      // Calculate results and complete assessment
      const calculatedResults = calculateDiscResults(updatedResponses);
      setResults(calculatedResults);
      setIsComplete(true);
      
      // Save to backend
      saveAssessmentMutation.mutate({
        responses: updatedResponses,
        results: calculatedResults,
      });
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      // Restore previous response
      const prevResponse = responses[currentQuestion - 1];
      if (prevResponse) {
        setSelectedOption(prevResponse.selectedOptions[0]);
        setIntensity([prevResponse.intensity]);
      }
      // Remove the current response from the array
      setResponses(responses.slice(0, -1));
    }
  };

  const progress = ((currentQuestion + 1) / DISC_QUESTIONS.length) * 100;

  if (isComplete && results) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50">
          <div className="flex items-center space-x-3">
            <Link href="/progress">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">DISC Assessment Results</h1>
              <p className="text-sm text-slate-500">Your personality profile</p>
            </div>
          </div>
        </header>

        <main className="p-4 pb-20 space-y-6">
          {/* Success Message */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Assessment Complete!</h3>
                  <p className="text-green-700">Your DISC profile has been analyzed and saved.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Primary Style */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-amber-500" />
                <span>Your Primary Style: {getStyleName(results.primaryStyle)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">{getStyleDescription(results.primaryStyle)}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-slate-900">Primary</div>
                  <div className="text-2xl font-bold text-primary">{results.primaryStyle}</div>
                </div>
                {results.secondaryStyle && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-slate-900">Secondary</div>
                    <div className="text-2xl font-bold text-secondary">{results.secondaryStyle}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* DISC Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Your DISC Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-red-600">Dominance (D)</span>
                  <span className="font-bold">{results.dominance}%</span>
                </div>
                <Progress value={results.dominance} className="h-3" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-yellow-600">Influence (I)</span>
                  <span className="font-bold">{results.influence}%</span>
                </div>
                <Progress value={results.influence} className="h-3" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-green-600">Steadiness (S)</span>
                  <span className="font-bold">{results.steadiness}%</span>
                </div>
                <Progress value={results.steadiness} className="h-3" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-blue-600">Conscientiousness (C)</span>
                  <span className="font-bold">{results.conscientiousness}%</span>
                </div>
                <Progress value={results.conscientiousness} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Detailed Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5" />
                <span>Detailed Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Communication Style</h4>
                <p className="text-slate-600">{results.detailedAnalysis.communicationStyle}</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Decision Making</h4>
                <p className="text-slate-600">{results.detailedAnalysis.decisionMaking}</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Stress Response</h4>
                <p className="text-slate-600">{results.detailedAnalysis.stressResponse}</p>
              </div>
            </CardContent>
          </Card>

          {/* Motivation Factors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>What Motivates You</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {results.detailedAnalysis.motivationFactors.map((factor, index) => (
                  <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                    {factor}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Potential Blind Spots */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Areas for Development</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {results.detailedAnalysis.potentialBlindSpots.map((blindSpot, index) => (
                  <Badge key={index} variant="outline" className="border-amber-200 text-amber-800">
                    {blindSpot}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Coaching Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Personalized Coaching Tips</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {getCoachingRecommendations(results).map((recommendation, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-slate-600">{recommendation}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link href="/coach">
              <Button className="w-full">
                View Personalized Coaching Content
              </Button>
            </Link>
            <Link href="/progress">
              <Button variant="outline" className="w-full">
                Back to Progress
              </Button>
            </Link>
          </div>
        </main>

        <BottomNavigation currentPage="progress" />
      </>
    );
  }

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <Link href="/progress">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-900">DISC Assessment</h1>
            <p className="text-sm text-slate-500">Question {currentQuestion + 1} of {DISC_QUESTIONS.length}</p>
          </div>
        </div>
        <div className="mt-3">
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      <main className="p-4 pb-20">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {DISC_QUESTIONS[currentQuestion].situation}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={selectedOption} onValueChange={handleOptionSelect}>
              {DISC_QUESTIONS[currentQuestion].options.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {selectedOption && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  How strongly does this describe you? ({intensity[0]}/5)
                </Label>
                <Slider
                  value={intensity}
                  onValueChange={setIntensity}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Not at all</span>
                  <span>Somewhat</span>
                  <span>Very much</span>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
              >
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={!selectedOption}
              >
                {currentQuestion === DISC_QUESTIONS.length - 1 ? "Complete Assessment" : "Next"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation currentPage="progress" />
    </>
  );
}