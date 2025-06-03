import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import BottomNavigation from "@/components/bottom-navigation";
import { LanguageSelector } from "@/components/language-selector";
import { useTranslation } from "@/lib/i18n";
import DISCProfile from "@/components/disc-profile";
import { 
  Home, 
  MessageCircle, 
  Mic, 
  Phone, 
  Trophy, 
  Target, 
  TrendingUp,
  Bell,
  Flame,
  ArrowRight,
  Book
} from "lucide-react";
import type { User, Session, Challenge } from "@shared/schema";

// Mock user data - in real app this would come from authentication
const MOCK_USER_ID = 1;

export default function Dashboard() {
  const [greeting, setGreeting] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user/1"],
  });

  const { data: recentSessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/users/1/sessions"],
  });

  const { data: dailyChallenge } = useQuery<Challenge>({
    queryKey: ["/api/users/1/daily-challenge"],
  });

  const userInitials = user?.name?.split(' ').map(n => n[0]).join('') || "JD";
  const streak = user?.streak || 7;
  const averageScore = user?.averageScore || 94;
  const totalSessions = user?.totalSessions || 23;

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <Home className="text-white w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{t('dashboard')}</h1>
              <p className="text-xs text-slate-500">Today's Practice</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <LanguageSelector />
            <div className="relative">
              <Bell className="text-slate-400 w-5 h-5" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></div>
            </div>
            <div className="w-8 h-8 bg-gradient-to-br from-accent to-success rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">{userInitials}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 px-4">
        {/* Welcome Section */}
        <section className="py-6">
          <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl font-semibold mb-2">
                {greeting}, {user?.name?.split(' ')[0] || 'Jordan'}!
              </h2>
              <p className="text-blue-100 mb-4">
                {t('welcomeBack')}
              </p>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{streak}</div>
                  <div className="text-xs text-blue-100">Day Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{averageScore}</div>
                  <div className="text-xs text-blue-100">Avg Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{totalSessions}</div>
                  <div className="text-xs text-blue-100">Sessions</div>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          </div>
        </section>

        {/* Daily Challenge */}
        {dailyChallenge && (
          <section className="mb-6">
            <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Trophy className="text-accent w-5 h-5" />
                    <h3 className="font-semibold text-slate-900">Today's Challenge</h3>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Flame className="text-destructive w-4 h-4" />
                    <span className="text-sm text-slate-600">{streak}</span>
                  </div>
                </div>
                <p className="text-slate-700 mb-4">{dailyChallenge.description}</p>
                <Link href="/chat">
                  <Button className="w-full bg-accent hover:bg-accent/90 text-white">
                    Start Challenge <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Quick Actions */}
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('practiceAreas')}</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Link href="/chat">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                    <MessageCircle className="text-primary w-6 h-6" />
                  </div>
                  <h4 className="font-medium text-slate-900 mb-1">{t('chatPractice')}</h4>
                  <p className="text-sm text-slate-500">{t('chatPracticeDesc')}</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/voice">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mb-3">
                    <Mic className="text-secondary w-6 h-6" />
                  </div>
                  <h4 className="font-medium text-slate-900 mb-1">{t('voicePractice')}</h4>
                  <p className="text-sm text-slate-500">{t('voicePracticeDesc')}</p>
                </CardContent>
              </Card>
            </Link>
          </div>
          
          {/* Voice Call Feature - Highlighted */}
          <Link href="/voice-call">
            <Card className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                    <Phone className="text-white w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 mb-1">Voice Call Practice</h4>
                    <p className="text-sm text-slate-600">Real-time phone roleplay with AI clients</p>
                  </div>
                  <div className="text-green-600">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* DISC Profile */}
        <DISCProfile user={user} />

        {/* DISC Assessment Link */}
        <section className="mb-6">
          <Link href="/disc-assessment">
            <Card className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                    <Target className="text-white w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 mb-1">Take DISC Assessment</h4>
                    <p className="text-sm text-slate-600">Discover your personality type and communication style</p>
                  </div>
                  <div className="text-purple-600">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* Knowledge Base Management */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Admin Tools</h3>
          </div>
          <Link href="/knowledge-base">
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Book className="text-white w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 mb-1">Knowledge Base</h4>
                    <p className="text-sm text-slate-600">Manage scenarios, challenges & coaching content</p>
                  </div>
                  <div className="text-blue-600">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* Recent Sessions */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Sessions</h3>
            <Link href="/progress">
              <Button variant="ghost" size="sm" className="text-primary">
                View All
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {recentSessions.slice(0, 2).map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        {session.type === 'chat' ? (
                          <MessageCircle className="text-primary w-5 h-5" />
                        ) : (
                          <Mic className="text-secondary w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">{session.scenario}</h4>
                        <p className="text-sm text-slate-500">
                          {new Date(session.createdAt!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-success">{session.score}</div>
                      <div className="text-xs text-slate-500">Score</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    {session.confidence && (
                      <div className="flex items-center space-x-1">
                        <Target className="text-success w-3 h-3" />
                        <span className="text-slate-600">
                          Confidence: <span className="font-medium text-success">{session.confidence}%</span>
                        </span>
                      </div>
                    )}
                    {session.clarity && (
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="text-accent w-3 h-3" />
                        <span className="text-slate-600">
                          Clarity: <span className="font-medium text-accent">{session.clarity}%</span>
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <BottomNavigation currentPage="home" />
    </>
  );
}
