import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, RefreshCw } from "lucide-react";
import type { User as UserType } from "@shared/schema";

interface DISCProfileProps {
  user?: UserType;
}

const DISC_COLORS = {
  D: "disc-red",
  I: "disc-yellow", 
  S: "disc-green",
  C: "disc-blue"
};

const DISC_DESCRIPTIONS = {
  D: {
    title: "Dominant (Red)",
    traits: "Direct, results-oriented, decisive",
    description: "You're a natural leader who likes to take charge and get things done quickly."
  },
  I: {
    title: "Influencer (Yellow)", 
    traits: "Enthusiastic, optimistic, people-oriented",
    description: "You excel at building relationships and motivating others through your positive energy."
  },
  S: {
    title: "Steady (Green)",
    traits: "Patient, loyal, supportive",
    description: "You provide stability and are great at building trust with clients through consistency."
  },
  C: {
    title: "Compliant (Blue)",
    traits: "Analytical, reserved, precise",
    description: "You excel at providing detailed information and systematic approaches to problems."
  }
};

export default function DISCProfile({ user }: DISCProfileProps) {
  const discProfile = user?.discProfile;

  if (!discProfile) {
    return (
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Your DISC Profile</h3>
        </div>
        <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-slate-400" />
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">Complete a few sessions to unlock your DISC profile</h4>
            <p className="text-slate-600 text-sm mb-4">
              Practice with chat and voice sessions to get personalized insights about your communication style.
            </p>
            <Badge variant="outline" className="text-xs">
              Need 3+ sessions for analysis
            </Badge>
          </CardContent>
        </Card>
      </section>
    );
  }

  const primaryType = discProfile.primaryType as keyof typeof DISC_DESCRIPTIONS;
  const primaryInfo = DISC_DESCRIPTIONS[primaryType] || DISC_DESCRIPTIONS.D;
  const primaryColorClass = DISC_COLORS[primaryType] || DISC_COLORS.D;

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Your DISC Profile</h3>
        <Button variant="ghost" size="sm" className="text-primary">
          View Details
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4 mb-4">
            <div className={`w-16 h-16 bg-gradient-to-br from-${primaryColorClass} to-${primaryColorClass} rounded-full flex items-center justify-center`}>
              <span className="text-white font-bold text-xl">{primaryType}</span>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">{primaryInfo.title}</h4>
              <p className="text-slate-500 text-sm">{primaryInfo.traits}</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-slate-700">{primaryInfo.description}</p>
          </div>

          <div className="space-y-3">
            {/* DISC Bars */}
            <div className="flex items-center space-x-3">
              <span className="text-sm text-slate-600 w-8 font-medium">D</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-disc-red h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${discProfile.dominant}%` }}
                />
              </div>
              <span className="text-sm font-medium text-slate-900 w-10 text-right">
                {discProfile.dominant}%
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-sm text-slate-600 w-8 font-medium">I</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-disc-yellow h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${discProfile.influencer}%` }}
                />
              </div>
              <span className="text-sm font-medium text-slate-900 w-10 text-right">
                {discProfile.influencer}%
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-sm text-slate-600 w-8 font-medium">S</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-disc-green h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${discProfile.steady}%` }}
                />
              </div>
              <span className="text-sm font-medium text-slate-900 w-10 text-right">
                {discProfile.steady}%
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-sm text-slate-600 w-8 font-medium">C</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-disc-blue h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${discProfile.compliant}%` }}
                />
              </div>
              <span className="text-sm font-medium text-slate-900 w-10 text-right">
                {discProfile.compliant}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
