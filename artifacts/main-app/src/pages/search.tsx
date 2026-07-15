import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Search, Mic, MicOff, Globe, Loader2, Bot, ExternalLink, ChevronRight, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useSearch,
  useGetSearchSuggestions,
  getGetSearchSuggestionsQueryKey,
} from "@workspace/api-client-react";
import { useLanguage } from "@/hooks/use-language";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function SearchPage() {
  const [location] = useLocation();
  const { toast } = useToast();
  const { language, setLanguage, languages, isRtl, selectedLangData } = useLanguage();

  const getInitialQuery = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("q") || "";
    }
    return "";
  };

  const [query, setQuery] = useState(getInitialQuery);
  const [submitted, setSubmitted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isVoice, setIsVoice] = useState(false);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchMutation = useSearch();

  const { data: suggestionsData } = useGetSearchSuggestions(
    { lang: language },
    { query: { queryKey: getGetSearchSuggestionsQueryKey({ lang: language }) } }
  );

  const handleSearch = useCallback((q: string, voice = false) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setSubmitted(true);
    setIsVoice(voice);
    searchMutation.mutate({ data: { query: trimmed, language, isVoice: voice } });
  }, [language, searchMutation]);

  useEffect(() => {
    const q = getInitialQuery();
    if (q && !submitted) {
      handleSearch(q);
    }
  }, []);

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Voice not supported", description: "Your browser does not support voice input. Try Chrome or Edge.", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setTranscript(t);
      setQuery(t);
    };
    recognition.onend = () => {
      setIsListening(false);
      if (transcript.trim()) handleSearch(transcript, true);
      else if (query.trim()) handleSearch(query, true);
    };
    recognition.onerror = (e: any) => {
      setIsListening(false);
      toast({ title: "Voice error", description: e.error, variant: "destructive" });
    };

    recognition.start();
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const results = searchMutation.data;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background" dir={isRtl ? "rtl" : "ltr"}>
      {/* Search bar */}
      <div className="sticky top-16 z-40 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-2" role="search" aria-label="Search form">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
              <Input
                ref={inputRef}
                type="search"
                value={isListening ? transcript || query : query}
                onChange={e => setQuery(e.target.value)}
                placeholder={isListening ? "Listening..." : "Ask me anything..."}
                className={`pl-10 pr-4 h-11 ${isListening ? "border-red-400 ring-1 ring-red-400" : ""}`}
                aria-label="Search query"
                data-testid="input-search"
              />
              {isListening && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-red-500 font-medium">Listening</span>
                </div>
              )}
            </div>

            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[120px] h-11 shrink-0" aria-label="Select language" data-testid="select-search-language">
                <Globe className="w-4 h-4 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.flag} {lang.code.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={isListening ? stopVoice : startVoice}
              aria-label={isListening ? "Stop voice recording" : "Start voice recording"}
              data-testid="button-voice"
            >
              {isListening ? (
                <MicOff className="w-4 h-4 animate-pulse" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>

            <Button type="submit" className="h-11 gap-2 shrink-0" disabled={searchMutation.isPending} data-testid="button-search" aria-label="Search">
              {searchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="hidden sm:inline">Search</span>
            </Button>
          </form>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Suggestions (shown when no search yet) */}
        {!submitted && !searchMutation.isPending && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-secondary" />
              Popular searches
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8">
              {(suggestionsData?.suggestions || []).map(s => (
                <button
                  key={s}
                  onClick={() => handleSearch(s)}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-card border border-border hover:border-primary hover:shadow-sm text-left transition-all group"
                  aria-label={`Search: ${s}`}
                  data-testid={`button-suggestion-${s.substring(0, 10)}`}
                >
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">{s}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </button>
              ))}
            </div>

            <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              Voice search tip
            </h3>
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
              Click the microphone button and speak your question naturally. AssistAI will transcribe and search automatically.
            </div>
          </div>
        )}

        {/* Loading state */}
        {searchMutation.isPending && (
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-6 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-lg bg-card border border-border p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {results && !searchMutation.isPending && (
          <div className="space-y-5" aria-live="polite" aria-label="Search results">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Results for: <span className="font-medium text-foreground">"{results.query}"</span>
              </p>
              <div className="flex items-center gap-2">
                {isVoice && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Mic className="w-3 h-3" /> Voice
                  </Badge>
                )}
                {selectedLangData && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    {selectedLangData.flag} {selectedLangData.name}
                  </Badge>
                )}
              </div>
            </div>

            {/* AI Response */}
            <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-6" role="region" aria-label="AI response" data-testid="card-ai-response">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">AssistAI Response</p>
                  <p className="text-xs text-muted-foreground">AI-generated answer</p>
                </div>
                <Badge variant="secondary" className="ml-auto gap-1 text-xs">
                  <Sparkles className="w-3 h-3" /> AI
                </Badge>
              </div>
              <p className="text-foreground leading-relaxed" data-testid="text-ai-response">{results.aiResponse}</p>
            </div>

            {/* Web Results */}
            {results.results.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Related Resources</h3>
                <div className="space-y-3">
                  {results.results.map((r, i) => (
                    <div key={i} className="rounded-lg bg-card border border-border p-4 hover:shadow-sm hover:border-primary/30 transition-all" data-testid={`card-result-${i}`} role="article">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-primary hover:underline cursor-pointer text-sm mb-1 flex items-center gap-1.5">
                            {r.title}
                            <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60" aria-label="External link" />
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{r.snippet}</p>
                          <p className="text-xs text-muted-foreground/70 mt-1.5 truncate">{r.url}</p>
                        </div>
                        <div className="shrink-0">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            {Math.round(r.relevanceScore * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search again */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">Try another search:</p>
              <div className="flex flex-wrap gap-2">
                {(suggestionsData?.suggestions || []).slice(0, 3).map(s => (
                  <button
                    key={s}
                    onClick={() => handleSearch(s)}
                    className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/30 transition-colors"
                    aria-label={`Search: ${s}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {searchMutation.isError && (
          <div className="text-center py-12" role="alert">
            <p className="text-destructive font-medium mb-2">Search failed</p>
            <p className="text-muted-foreground text-sm mb-4">Please try again.</p>
            <Button onClick={() => handleSearch(query)} variant="outline" data-testid="button-retry">
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
