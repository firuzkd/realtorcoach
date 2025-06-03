import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Phone, Clock, TrendingUp, TrendingDown, Target, 
  Brain, Heart, MessageSquare, Users, Award,
  ChevronRight, Calendar, BarChart3, Zap, ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import type { CallInsight, User } from "@shared/schema";

export default function CallInsights() {
  const { data: insights = [], isLoading } = useQuery<CallInsight[]>({
    queryKey: ["/api/call-insights"],
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user/1"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const recentInsights = insights.slice(0, 5);
  const avgScore = insights.length > 0 
    ? Math.round(insights.reduce((sum: number, insight: CallInsight) => sum + insight.overallScore, 0) / insights.length)
    : 0;
  
  const totalDuration = insights.reduce((sum: number, insight: CallInsight) => sum + insight.duration, 0);
  const totalCalls = insights.length;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "hard": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Call Insights</h1>
              <p className="text-slate-600">AI-powered performance analysis and coaching feedback</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-slate-700">AI Analytics</span>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Calls</p>
                  <p className="text-2xl font-bold text-slate-900">{totalCalls}</p>
                </div>
                <Phone className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Average Score</p>
                  <p className="text-2xl font-bold text-slate-900">{avgScore}%</p>
                </div>
                <Award className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Practice Time</p>
                  <p className="text-2xl font-bold text-slate-900">{formatDuration(totalDuration)}</p>
                </div>
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Improvement Trend</p>
                  <p className="text-2xl font-bold text-green-600">+12%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Calls */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Recent Call Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentInsights.length === 0 ? (
                  <div className="text-center py-8">
                    <Phone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No call insights available yet.</p>
                    <p className="text-sm text-slate-400">Complete phone practice sessions to see detailed AI analysis.</p>
                  </div>
                ) : (
                  recentInsights.map((insight: CallInsight) => (
                    <div key={insight.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getScoreColor(insight.overallScore)}`}>
                            <span className="font-bold">{insight.overallScore}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{insight.clientName}</h3>
                            <p className="text-sm text-slate-600">{insight.scenario}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getDifficultyColor(insight.difficulty)}>
                            {insight.difficulty}
                          </Badge>
                          <p className="text-xs text-slate-500 mt-1">
                            {format(new Date(insight.completedAt), 'MMM dd, HH:mm')}
                          </p>
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                        {insight.metrics && Object.entries(insight.metrics).slice(0, 5).map(([key, value]) => (
                          <div key={key} className="text-center">
                            <div className="text-xs text-slate-500 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                            <div className="font-semibold text-sm">{value}%</div>
                          </div>
                        ))}
                      </div>

                      {/* AI Insights Preview */}
                      {insight.aiAnalysis && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-blue-900 font-medium">AI Coach Summary</p>
                              <p className="text-sm text-blue-700 line-clamp-2">
                                {insight.aiAnalysis.summary}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <Button variant="ghost" size="sm" className="mt-3 w-full">
                        View Detailed Analysis
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Performance Trends */}
          <div className="space-y-4">
            {/* Skills Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Skills Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {insights.length > 0 && insights[0]?.metrics ? (
                  Object.entries(insights[0].metrics).map(([skill, score]) => (
                    <div key={skill}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium capitalize">
                          {skill.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-sm font-bold">{score}%</span>
                      </div>
                      <Progress value={score} className="h-2" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Complete calls to see skill breakdown</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* DISC Alignment */}
            {user?.discProfile && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    DISC Alignment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Primary Style</span>
                      <Badge variant="outline">{user.discProfile.primaryStyle}</Badge>
                    </div>
                    <div className="text-sm text-slate-600">
                      <p className="font-medium mb-1">Recent Adaptability:</p>
                      <p className="text-xs">Your communication style showed good flexibility with different client personalities.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Practice Session
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Review Transcripts
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Heart className="w-4 h-4 mr-2" />
                  Focus on Weak Areas
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}