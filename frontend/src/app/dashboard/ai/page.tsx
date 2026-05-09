"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { 
  Send, 
  Mic, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Loader2, 
  Sparkles,
  RefreshCw,
  Terminal,
  Brain,
  Zap,
  Command,
  User,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: 'user' | 'ai';
  content: string;
}

export default function AIPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: `Greetings, ${user?.name}. I am the Vertex AI Assistant. How can I optimize your workflow today?` }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      // Pass history (excluding the greeting if preferred, but usually good to include)
      const { data } = await api.post("ai/chat", { 
        message: userMsg,
        history: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      });
      
      setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.message || "Protocol error: Connection to AI core interrupted.";
      setMessages(prev => [...prev, { role: 'ai', content: errorMsg }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="h-20 px-8 flex items-center justify-between border-b border-border bg-background/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">AI Assistant</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Core Processing Active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setVoiceActive(!voiceActive)}
            className={`p-2.5 rounded-xl transition-all ${voiceActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
          >
            {voiceActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => setMessages([{ role: 'ai', content: `Session reset. How can I help you, ${user?.name}?` }])}
            className="p-2.5 hover:bg-muted text-muted-foreground rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-8 bg-muted/5 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-border shadow-sm ${msg.role === 'ai' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                {msg.role === 'ai' ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
                <div className={`p-5 rounded-2xl text-sm leading-relaxed ${msg.role === 'ai' ? 'bg-card border border-border shadow-sm' : 'bg-primary text-primary-foreground'}`}>
                  {msg.content}
                </div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
                  {msg.role === 'ai' ? 'Vertex Core' : 'User Node'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-6">
              <div className="w-9 h-9 bg-primary text-primary-foreground rounded-xl flex items-center justify-center border border-border animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="flex gap-1.5 items-center p-4 bg-muted/30 rounded-2xl">
                <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" />
              </div>
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-8 border-t border-border bg-background">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSend} className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-3 text-muted-foreground">
              <Command className="w-4 h-4" />
            </div>
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or use '/' for commands..."
              className="w-full pl-12 pr-32 py-4 bg-muted border border-border rounded-2xl text-sm outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/50 font-medium"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button 
                type="button"
                className="p-2 hover:bg-primary/5 text-muted-foreground hover:text-primary rounded-lg transition-all"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold uppercase tracking-widest disabled:opacity-50 transition-all hover:opacity-90 flex items-center gap-2"
              >
                {isTyping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Transmit
              </button>
            </div>
          </form>
          <div className="mt-4 flex items-center justify-center gap-6 opacity-30">
            {[
              { label: "Data Analysis", icon: Activity },
              { label: "Code Audit", icon: Terminal },
              { label: "Security Path", icon: ShieldCheck },
              { label: "Performance", icon: Zap }
            ].map((chip, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <chip.icon className="w-2.5 h-2.5" />
                <span className="text-[9px] font-bold uppercase tracking-widest">{chip.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
