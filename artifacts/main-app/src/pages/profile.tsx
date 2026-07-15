import { useLocation, Link } from "wouter";
import { User, Mail, Globe, Calendar, MessageSquare, BarChart3, Mic, LogOut, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useAuthContext } from "@/hooks/use-auth";
import {
  useGetConversationStats,
  useLogout,
  getGetConversationStatsQueryKey,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { logout } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logoutMutation = useLogout();

  const { data: stats, isLoading: statsLoading } = useGetConversationStats({
    query: {
      enabled: isAuthenticated,
      queryKey: getGetConversationStatsQueryKey(),
    }
  });

  if (!authLoading && !isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        logout();
        queryClient.clear();
        toast({ title: "Signed out", description: "Come back soon!" });
        setLocation("/");
      },
    });
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Profile card */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-start justify-between mb-5">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Your Profile
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
              data-testid="button-logout"
              aria-label="Sign out of your account"
            >
              <LogOut className="w-4 h-4" />
              {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
            </Button>
          </div>

          {authLoading || !user ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="font-semibold text-foreground" data-testid="text-profile-name">{user.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email Address</p>
                  <p className="font-medium text-foreground" data-testid="text-profile-email">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Preferred Language</p>
                  <Badge variant="secondary" className="mt-0.5" data-testid="badge-language">
                    {user.preferredLanguage.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Member Since</p>
                  <p className="font-medium text-foreground">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Usage Statistics
          </h2>
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 gap-3" role="region" aria-label="Usage statistics">
                {[
                  { label: "Total Conversations", value: stats.totalConversations, icon: <MessageSquare className="w-5 h-5" /> },
                  { label: "Total Messages", value: stats.totalMessages, icon: <BarChart3 className="w-5 h-5" /> },
                  { label: "Languages Used", value: stats.languagesUsed.length, icon: <Globe className="w-5 h-5" /> },
                  { label: "Voice Queries", value: stats.voiceQueriesCount, icon: <Mic className="w-5 h-5" /> },
                ].map(s => (
                  <div key={s.label} className="rounded-xl bg-primary/5 border border-primary/10 p-4 text-center" data-testid={`stat-${s.label.toLowerCase().replace(/ /g, "-")}`}>
                    <div className="text-primary flex justify-center mb-2">{s.icon}</div>
                    <div className="text-2xl font-bold text-foreground">{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {stats.languagesUsed.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Languages you've searched in:</p>
                  <div className="flex flex-wrap gap-2">
                    {stats.languagesUsed.map(lang => (
                      <Badge key={lang} variant="outline">{lang.toUpperCase()}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {stats.topQueries.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Your recent searches:</p>
                  <div className="space-y-1">
                    {stats.topQueries.map((q, i) => (
                      <Link href={`/search?q=${encodeURIComponent(q)}`} key={i}>
                        <div className="text-sm text-primary hover:underline truncate py-1 cursor-pointer">{q}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Quick actions */}
        <div className="flex gap-3">
          <Link href="/history" className="flex-1">
            <Button variant="outline" className="w-full gap-2" data-testid="button-view-history" aria-label="View conversation history">
              <History className="w-4 h-4" />
              View History
            </Button>
          </Link>
          <Link href="/search" className="flex-1">
            <Button className="w-full gap-2" data-testid="button-new-search" aria-label="Start a new search">
              <MessageSquare className="w-4 h-4" />
              New Search
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
