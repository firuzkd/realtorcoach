import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/components/language-provider";
import Dashboard from "@/pages/dashboard";
import ChatRoleplay from "@/pages/chat-roleplay";
import VoicePractice from "@/pages/voice-practice";
import VoiceCall from "@/pages/voice-call-phone";
import CoachMe from "@/pages/coach-me";
import Progress from "@/pages/progress";
import KnowledgeBase from "@/pages/knowledge-base";
import DiscAssessmentPage from "@/pages/disc-assessment";
import CallInsights from "@/pages/call-insights";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/chat" component={ChatRoleplay} />
      <Route path="/voice" component={VoicePractice} />
      <Route path="/voice-call" component={VoiceCall} />
      <Route path="/coach" component={CoachMe} />
      <Route path="/progress" component={Progress} />
      <Route path="/knowledge-base" component={KnowledgeBase} />
      <Route path="/disc-assessment" component={DiscAssessmentPage} />
      <Route path="/call-insights" component={CallInsights} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-slate-50">
            <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen relative">
              <Router />
            </div>
            <Toaster />
          </div>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
