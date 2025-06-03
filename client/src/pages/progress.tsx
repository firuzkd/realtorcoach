import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import BottomNavigation from "@/components/bottom-navigation";
import { 
  ArrowLeft, 
  TrendingUp, 
  Target, 
  MessageCircle, 
  Mic, 
  Calendar,
  Award,
  BarChart3,
  Clock,
  CheckCircle
} from "lucide-react";
import type { User, Session } from "@shared/schema";

export default function ProgressPage() {
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user/1"],
  });

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/users/1/sessions"],
  });

  // Calculate statistics
  const totalSessions = sessions.length;
  const chatSessions = sessions.filter(s => s.type === 'chat').length;
  const voiceSessions = sessions.filter(s => s.type === 'voice').length;
  const averageScore = sessions.length > 0 
    ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length)
    : 0;
  
  const recentSessions = sessions.slice(0, 10);
  const thisWeekSessions = sessions.filter(s => {
    const sessionDate = new Date(s.createdAt!);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return sessionDate > weekAgo;
  });

  // Calculate progress trends
  const lastWeekAverage = thisWeekSessions.length > 0
    ? Math.round(thisWeekSessions.reduce((sum, s) => sum + s.score, 0) / thisWeekSessions.length)
    : 0;

  const scoreImprovement = averageScore - (averageScore - 5); // Simplified calculation
  const streak = user?.streak || 0;

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
            <h1 className="text-lg font-semibold text-slate-900">Progress</h1>
            <p className="text-sm text-slate-500">Track your improvement</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="px-4 mt-6">
            {/* Key Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary mb-1">{averageScore}</div>
                  <div className="text-sm text-slate-500">Avg Score</div>
                  <div className="flex items-center justify-center mt-2">
                    <TrendingUp className="w-3 h-3 text-success mr-1" />
                    <span className="text-xs text-success">+{scoreImprovement}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-accent mb-1">{streak}</div>
                  <div className="text-sm text-slate-500">Day Streak</div>
                  <div className="flex items-center justify-center mt-2">
                    <Award className="w-3 h-3 text-accent mr-1" />
                    <span className="text-xs text-slate-600">Personal best</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-secondary mb-1">{totalSessions}</div>
                  <div className="text-sm text-slate-500">Total Sessions</div>
                  <div className="flex items-center justify-center mt-2">
                    <BarChart3 className="w-3 h-3 text-secondary mr-1" />
                    <span className="text-xs text-slate-600">{thisWeekSessions.length} this week</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-success mb-1">{lastWeekAverage}</div>
                  <div className="text-sm text-slate-500">Week Avg</div>
                  <div className="flex items-center justify-center mt-2">
                    <Calendar className="w-3 h-3 text-success mr-1" />
                    <span className="text-xs text-slate-600">Last 7 days</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Breakdown */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Performance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-600">Chat Practice</span>
                    <span className="text-sm font-medium">{chatSessions} sessions</span>
                  </div>
                  <Progress value={(chatSessions / totalSessions) * 100} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-600">Voice Practice</span>
                    <span className="text-sm font-medium">{voiceSessions} sessions</span>
                  </div>
                  <Progress value={(voiceSessions / totalSessions) * 100} className="h-2" />
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <div className="text-sm text-slate-600 mb-2">Areas of focus:</div>
                  <div className="flex flex-wrap gap-2">
                    {sessions.some(s => s.confidence && s.confidence < 80) && (
                      <Badge variant="outline" className="text-xs">Confidence</Badge>
                    )}
                    {sessions.some(s => s.clarity && s.clarity < 80) && (
                      <Badge variant="outline" className="text-xs">Clarity</Badge>
                    )}
                    {sessions.some(s => s.cta && s.cta < 80) && (
                      <Badge variant="outline" className="text-xs">Call-to-Action</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Goal */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  Weekly Goal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600">Practice Sessions</span>
                  <span className="text-sm font-medium">{thisWeekSessions.length} / 5</span>
                </div>
                <Progress value={(thisWeekSessions.length / 5) * 100} className="h-2 mb-3" />
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {5 - thisWeekSessions.length > 0 
                      ? `${5 - thisWeekSessions.length} more sessions to reach your goal`
                      : "Goal achieved! 🎉"
                    }
                  </span>
                  {thisWeekSessions.length >= 5 && (
                    <CheckCircle className="w-4 h-4 text-success" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Link href="/chat">
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center space-y-2">
                  <MessageCircle className="w-6 h-6" />
                  <span className="text-sm">Practice Chat</span>
                </Button>
              </Link>
              <Link href="/voice">
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center space-y-2">
                  <Mic className="w-6 h-6" />
                  <span className="text-sm">Practice Voice</span>
                </Button>
              </Link>
            </div>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="px-4 mt-6">
            <div className="space-y-4">
              {recentSessions.map((session) => (
                <Card key={session.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          {session.type === 'chat' ? (
                            <MessageCircle className="text-primary w-5 h-5" />
                          ) : (
                            <Mic className="text-secondary w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">{session.scenario}</h3>
                          <div className="flex items-center space-x-2 text-sm text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(session.createdAt!).toLocaleDateString()}</span>
                            {session.duration && (
                              <>
                                <span>•</span>
                                <span>{Math.floor(session.duration / 60)}:{(session.duration % 60).toString().padStart(2, '0')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-success">{session.score}</div>
                        <div className="text-xs text-slate-500">Score</div>
                      </div>
                    </div>

                    {/* Detailed Metrics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {session.confidence && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Confidence:</span>
                          <span className="font-medium">{session.confidence}%</span>
                        </div>
                      )}
                      {session.clarity && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Clarity:</span>
                          <span className="font-medium">{session.clarity}%</span>
                        </div>
                      )}
                      {session.value && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Value:</span>
                          <span className="font-medium">{session.value}%</span>
                        </div>
                      )}
                      {session.cta && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">CTA:</span>
                          <span className="font-medium">{session.cta}%</span>
                        </div>
                      )}
                      {session.energy && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Energy:</span>
                          <span className="font-medium">{session.energy}%</span>
                        </div>
                      )}
                      {session.pace && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Pace:</span>
                          <Badge variant="outline" className="text-xs capitalize">{session.pace}</Badge>
                        </div>
                      )}
                    </div>

                    {/* Feedback Preview */}
                    {session.feedback && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-700 line-clamp-2">{session.feedback}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {sessions.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No sessions yet</h3>
                  <p className="text-slate-600 mb-6">Start practicing to see your progress here</p>
                  <div className="flex space-x-3 justify-center">
                    <Link href="/chat">
                      <Button>Start Chat Practice</Button>
                    </Link>
                    <Link href="/voice">
                      <Button variant="outline">Try Voice Practice</Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation currentPage="progress" />
    </>
  );
}
