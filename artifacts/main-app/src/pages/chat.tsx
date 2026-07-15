import { useLocation, useParams } from "wouter";
import { ArrowLeft, Bot, User, Mic, Clock, MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetConversation, getGetConversationQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const id = parseInt(params.id || "0");

  const { data, isLoading, isError } = useGetConversation(id, {
    query: {
      enabled: !!id && isAuthenticated,
      queryKey: getGetConversationQueryKey(id),
    }
  });

  if (!authLoading && !isAuthenticated) {
    setLocation("/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-6 w-64" />
        <div className="space-y-4 mt-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <h2 className="font-semibold text-foreground mb-1">Conversation not found</h2>
        <p className="text-muted-foreground text-sm mb-4">This conversation may have been deleted.</p>
        <Link href="/history">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to History
          </Button>
        </Link>
      </div>
    );
  }

  const { conversation, messages } = data;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-16 z-30 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/history">
            <Button variant="ghost" size="icon" aria-label="Back to history" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-foreground text-sm truncate" data-testid="text-conv-title">
              {conversation.title}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {conversation.messageCount} messages
              </span>
              <Badge variant="outline" className="text-xs py-0 h-4">{conversation.language.toUpperCase()}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(conversation.createdAt)}
              </span>
            </div>
          </div>
          <Link href={`/search?q=${encodeURIComponent(conversation.title)}`}>
            <Button size="sm" variant="outline" className="gap-1.5 shrink-0 text-xs" aria-label="Search this topic again">
              <Search className="w-3.5 h-3.5" />
              Search again
            </Button>
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 space-y-5" role="log" aria-label="Conversation messages" aria-live="polite">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No messages in this conversation.</p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              data-testid={`message-${msg.id}`}
              role="article"
              aria-label={`${msg.role === "user" ? "Your message" : "AI response"}: ${msg.content.substring(0, 50)}`}
            >
              <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-sm ${msg.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`flex-1 max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === "assistant" ? "bg-card border border-border rounded-tl-sm" : "bg-primary text-primary-foreground rounded-tr-sm"}`}>
                  {msg.content}
                </div>
                <div className="flex items-center gap-1.5 px-1">
                  <span className="text-xs text-muted-foreground">{formatTime(msg.createdAt)}</span>
                  {msg.isVoice && (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground" title="Voice message">
                      <Mic className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
