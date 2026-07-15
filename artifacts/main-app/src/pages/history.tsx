import { useState } from "react";
import { Link } from "wouter";
import { History, MessageSquare, Trash2, BarChart3, Globe, Mic, Clock, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useListConversations,
  useDeleteConversation,
  useGetConversationStats,
  getListConversationsQueryKey,
  getGetConversationStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function HistoryPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: convsData, isLoading: convsLoading } = useListConversations({
    query: { queryKey: getListConversationsQueryKey() }
  });

  const { data: stats, isLoading: statsLoading } = useGetConversationStats({
    query: { queryKey: getGetConversationStatsQueryKey() }
  });

  const deleteMutation = useDeleteConversation();

  if (!authLoading && !isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Conversation deleted" });
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetConversationStatsQueryKey() });
          setDeleteId(null);
        },
        onError: () => {
          toast({ title: "Delete failed", variant: "destructive" });
          setDeleteId(null);
        },
      }
    );
  };

  const convs = convsData?.conversations || [];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <History className="w-6 h-6 text-primary" />
              Conversation History
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Your past searches and AI conversations</p>
          </div>
          <Link href="/search">
            <Button size="sm" className="gap-2" data-testid="button-new-search" aria-label="Start a new search">
              <Search className="w-4 h-4" />
              New Search
            </Button>
          </Link>
        </div>

        {/* Stats */}
        {statsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" role="region" aria-label="Usage statistics">
            {[
              { label: "Conversations", value: stats.totalConversations, icon: <MessageSquare className="w-5 h-5" /> },
              { label: "Total Messages", value: stats.totalMessages, icon: <BarChart3 className="w-5 h-5" /> },
              { label: "Languages Used", value: stats.languagesUsed.length, icon: <Globe className="w-5 h-5" /> },
              { label: "Voice Queries", value: stats.voiceQueriesCount, icon: <Mic className="w-5 h-5" /> },
            ].map(s => (
              <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center" data-testid={`stat-${s.label.toLowerCase().replace(" ", "-")}`}>
                <div className="text-primary flex justify-center mb-2">{s.icon}</div>
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Conversations list */}
        {convsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : convs.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-border bg-card">
            <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No conversations yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Start a search to build your history.</p>
            <Link href="/search">
              <Button size="sm" variant="outline" className="gap-2">
                <Search className="w-4 h-4" />
                Start searching
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2" role="list" aria-label="Conversation history">
            {convs.map(conv => (
              <div
                key={conv.id}
                className="group flex items-center gap-3 bg-card rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-sm transition-all"
                role="listitem"
                data-testid={`card-conversation-${conv.id}`}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <Link href={`/chat/${conv.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-foreground text-sm truncate hover:text-primary transition-colors">{conv.title}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {conv.messageCount} messages
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(conv.updatedAt)}
                    </span>
                    <Badge variant="outline" className="text-xs py-0 h-4">
                      {conv.language.toUpperCase()}
                    </Badge>
                  </div>
                </Link>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setDeleteId(conv.id)}
                    aria-label={`Delete conversation: ${conv.title}`}
                    data-testid={`button-delete-${conv.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Link href={`/chat/${conv.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label={`Open conversation: ${conv.title}`}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
