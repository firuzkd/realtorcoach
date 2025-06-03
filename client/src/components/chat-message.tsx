import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, Target, TrendingUp, MessageSquare } from "lucide-react";
import type { Message } from "@shared/schema";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isAgent = message.isAgent;
  const feedback = message.feedback;

  return (
    <div className="space-y-3">
      {/* Message */}
      <div className={`flex items-start space-x-3 ${isAgent ? 'flex-row-reverse space-x-reverse' : ''}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isAgent 
            ? 'bg-gradient-to-br from-primary to-secondary' 
            : 'bg-gradient-to-br from-purple-400 to-pink-400'
        }`}>
          <span className="text-white text-sm font-medium">
            {isAgent ? 'You' : 'AI'}
          </span>
        </div>
        <div className={`rounded-2xl p-3 max-w-xs ${
          isAgent 
            ? 'bg-primary text-primary-foreground rounded-tr-md ml-auto' 
            : 'bg-slate-100 text-slate-900 rounded-tl-md'
        }`}>
          <p className="text-sm">{message.content}</p>
          <div className={`text-xs mt-1 ${
            isAgent ? 'text-blue-100' : 'text-slate-500'
          }`}>
            {new Date(message.createdAt!).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>

      {/* Feedback for Agent Messages */}
      {isAgent && feedback && (
        <Card className="bg-blue-50 border-blue-200 animate-fade-in">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 mb-3">
              <Lightbulb className="text-primary w-4 h-4" />
              <span className="text-sm font-medium text-primary">Live Feedback</span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 flex items-center">
                    <Target className="w-3 h-3 mr-1" />
                    Confidence
                  </span>
                  <span className="font-medium">{feedback.confidence}%</span>
                </div>
                <Progress value={feedback.confidence} className="h-1" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Clarity
                  </span>
                  <span className="font-medium">{feedback.clarity}%</span>
                </div>
                <Progress value={feedback.clarity} className="h-1" />
              </div>

              {feedback.grammar && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Grammar</span>
                    <span className="font-medium">{feedback.grammar}%</span>
                  </div>
                  <Progress value={feedback.grammar} className="h-1" />
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 flex items-center">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Value
                  </span>
                  <span className="font-medium">{feedback.value}%</span>
                </div>
                <Progress value={feedback.value} className="h-1" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">CTA</span>
                  <span className="font-medium">{feedback.cta}%</span>
                </div>
                <Progress value={feedback.cta} className="h-1" />
              </div>
            </div>

            {/* Strengths */}
            {(feedback as any).strengths && (feedback as any).strengths.length > 0 && (
              <div className="space-y-1 mb-2">
                <div className="text-xs font-medium text-green-700 mb-1">✓ Strengths:</div>
                {(feedback as any).strengths.slice(0, 2).map((strength: string, index: number) => (
                  <div key={index} className="text-xs text-green-600 flex items-start space-x-1">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span>{strength}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {feedback.suggestions && feedback.suggestions.length > 0 && (
              <div className="space-y-1 mb-2">
                <div className="text-xs font-medium text-blue-700 mb-1">💡 Quick Tips:</div>
                {feedback.suggestions.slice(0, 2).map((suggestion, index) => (
                  <div key={index} className="text-xs text-blue-600 flex items-start space-x-1">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Next Level Focus */}
            {(feedback as any).nextLevel && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2">
                <div className="text-xs font-medium text-amber-700 mb-1">🎯 Focus Next:</div>
                <div className="text-xs text-amber-600">{(feedback as any).nextLevel}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
