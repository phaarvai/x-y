import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Sparkles, Send, Lightbulb, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import XiyLogo from "@/components/XiyLogo";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

const MOCK_RESPONSES: Record<string, string> = {
  default: `Great idea! Here's a manufacturing plan for your product:

**Manufacturing Plan Generated**
• 4 manufacturing layers identified
• Estimated cost: $45,000 – $55,000  
• Timeline: 7–10 weeks
• 12 required materials listed

**Recommended Processes:**
1. **Layer 1 – Structural Components**: CNC Milling (5-axis) for precision parts
2. **Layer 2 – Housing & Enclosure**: Injection Molding for high-volume plastic parts
3. **Layer 3 – Electronics Integration**: PCB assembly and testing
4. **Layer 4 – Finishing & QA**: Surface treatment and quality inspection

**Suggested Manufacturers:** PrecisionTech Manufacturing (San Francisco) – Available Now, $120–$180/hr

Would you like me to find matching manufacturers or refine this plan?`,
};

function getResponse(query: string): string {
  if (query.toLowerCase().includes("smartphone") || query.toLowerCase().includes("phone")) {
    return `For custom smartphone cases, here's your manufacturing roadmap:

**Manufacturing Plan Generated**
• 3 manufacturing layers identified
• Estimated cost: $8,000 – $15,000 (for 500 units)
• Timeline: 3–5 weeks
• Materials: TPU, Polycarbonate, UV-resistant coating

**Process Breakdown:**
1. **Mold Creation**: CNC machining of injection mold ($3,000–$5,000 one-time)
2. **Production**: Injection molding, 500 units/day capacity
3. **Finishing**: UV printing for custom designs + quality check

**Best Match:** QuickProto Solutions – Available Now, $100–$150/hr

Ready to book a consultation?`;
  }
  return MOCK_RESPONSES.default;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      content: "Hi! I'm your AI Manufacturing Assistant. Describe your product idea, and I'll help you create a complete manufacturing plan with recommended processes, materials, and step-by-step execution.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || isTyping) return;
    const userMsg: Message = { id: Date.now(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      const aiMsg: Message = { id: Date.now() + 1, role: "assistant", content: getResponse(text) };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const STEPS = [
    "Describe your product idea",
    "Get a layered manufacturing plan",
    "Review material & machine recommendations",
    "Search & book manufacturers",
  ];

  return (
    <div className="h-screen bg-[#F8FAFF] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm shrink-0">
        <div className="h-14 flex items-center px-4">
          <Link href="/"><XiyLogo size="sm" /></Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-100 flex flex-col p-4 shrink-0">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-violet-600 font-semibold text-sm mb-1">
              <Sparkles className="w-4 h-4" /> AI Assistant
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">Get intelligent manufacturing guidance</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-6">
            <p className="font-semibold text-gray-700 text-xs mb-3">How It Works</p>
            <ol className="space-y-2">
              {STEPS.map((step, i) => (
                <li key={step} className="flex gap-2 text-xs text-gray-500 leading-snug">
                  <span className="text-blue-500 font-bold shrink-0">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-auto">
            <Link href="/browse">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 gap-1.5">
                <Factory className="w-3.5 h-3.5" /> Browse Manufacturers
              </Button>
            </Link>
          </div>
        </aside>

        {/* Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
            <h1 className="font-bold text-gray-900 text-lg">AI Manufacturing Assistant</h1>
            <p className="text-gray-500 text-sm">Powered by advanced AI to plan your manufacturing journey</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4" role="log" aria-label="Chat messages">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${msg.role === "assistant" ? "bg-white border border-gray-200 shadow-sm text-gray-800" : "bg-blue-600 text-white"}`}>
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1.5 text-violet-600 font-semibold text-xs mb-2">
                      <Sparkles className="w-3.5 h-3.5" /> AI Assistant
                    </div>
                  )}
                  <div className="whitespace-pre-line">{msg.content}</div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 shadow-sm rounded-xl px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  AI is thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-100 px-6 py-4 shrink-0">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Lightbulb className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder='Describe your product idea... (e.g., "I want to create custom smartphone cases with unique designs")'
                  className="pl-9 h-11 border-gray-200 rounded-lg text-sm"
                  data-testid="input-ai-message"
                  disabled={isTyping}
                />
              </div>
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
                className="bg-violet-600 hover:bg-violet-700 text-white h-11 px-5 gap-1.5 rounded-lg"
                data-testid="button-ai-send"
              >
                <Send className="w-4 h-4" /> Send
              </Button>
            </div>
            <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> Tip: Be specific about your product, materials, quantity, and special requirements
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
