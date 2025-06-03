import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { 
  Home, 
  MessageCircle, 
  Mic, 
  GraduationCap, 
  TrendingUp 
} from "lucide-react";

interface BottomNavigationProps {
  currentPage: "home" | "chat" | "voice" | "coach" | "progress";
}

export default function BottomNavigation({ currentPage }: BottomNavigationProps) {
  const [location] = useLocation();
  const { t } = useTranslation();

  const navItems = [
    {
      id: "home",
      label: t('home'),
      icon: Home,
      href: "/",
    },
    {
      id: "chat",
      label: t('chat'),
      icon: MessageCircle,
      href: "/chat",
    },
    {
      id: "voice",
      label: t('voice'),
      icon: Mic,
      href: "/voice",
    },
    {
      id: "coach",
      label: t('coach'),
      icon: GraduationCap,
      href: "/coach",
    },
    {
      id: "progress",
      label: t('progress'),
      icon: TrendingUp,
      href: "/progress",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 px-4 py-2">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id || location === item.href;

          return (
            <Link key={item.id} href={item.href}>
              <Button
                variant="ghost"
                size="sm"
                className={`flex flex-col items-center space-y-1 py-2 px-3 h-auto ${
                  isActive 
                    ? "text-primary" 
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
