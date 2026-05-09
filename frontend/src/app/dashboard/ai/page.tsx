"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { 
  Send, Mic, Volume2, VolumeX, ShieldCheck, 
  Loader2, Sparkles, Trash2, MessageSquare, 
  Bot, User as UserIcon, Activity, Zap, Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface WebkitSpeechRecognitionEvent {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
  };
}

export default function AIPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [usage, setUsage] = useState<{ count: number; limit: number; isAdmin: boolean } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: WebkitSpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const speak = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const { data } = await api.post("ai/chat", {
        message: userMessage,
        history: messages
      });

      const aiResponse = data.response;
      setMessages(prev => [...prev, { role: 'model', content: aiResponse }]);
      setUsage(data.usage);
      if (voiceEnabled) speak(aiResponse);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.response?.status === 429 
        ? "DAILY QUOTA EXCEEDED: Operational limit reached (20/20)."
        : "UPLINK FAILURE: Unable to reach neural core.";
      
      setMessages(prev => [...prev, { role: 'model', content: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = () => {
    if (recognitionRef.current) {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] max-w-6xl mx-auto bg-white rounded-[3rem] shadow-2xl shadow-black/[0.03] overflow-hidden border border-zinc-100 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 pattern-dots opacity-[0.02] pointer-events-none" />

      {/* Header */}
      <div className="px-10 py-8 border-b border-zinc-50 flex items-center justify-between bg-white/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-16 h-16 bg-zinc-950 text-white flex items-center justify-center rounded-3xl shadow-xl transition-all duration-500 group-hover:rotate-6">
              <Cpu className="h-8 w-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full z-10 animate-pulse shadow-lg" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight uppercase leading-none">Vertex AI Core</h2>
            <div className="flex items-center gap-3 mt-3">
              <span className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">
                Neural Uplink Stable
              </span>
              {usage && (
                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-[0.1em] bg-zinc-50 px-2 py-0.5 rounded">
                  Quota: {usage.count} / {usage.limit}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-4 rounded-2xl transition-all shadow-sm ${voiceEnabled ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-white text-zinc-400 hover:text-zinc-600 border border-zinc-100'}`}
            title="Toggle Voice"
          >
            {voiceEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
          </button>
          <button 
            onClick={clearChat}
            className="p-4 bg-white text-zinc-400 hover:text-rose-500 hover:bg-rose-50 border border-zinc-100 rounded-2xl transition-all shadow-sm group"
            title="Clear Chat"
          >
            <Trash2 className="h-6 w-6 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar relative z-10">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex flex-col items-center justify-center text-center p-12 space-y-12"
            >
              <div className="w-24 h-24 bg-zinc-50 text-zinc-200 flex items-center justify-center rounded-[2.5rem] shadow-inner relative group">
                <Sparkles className="h-10 w-10 group-hover:text-zinc-950 transition-colors duration-700" />
                <div className="absolute inset-0 bg-zinc-950 rounded-[2.5rem] opacity-0 group-hover:opacity-10 transition-all duration-700" />
              </div>
              <div className="space-y-6">
                <h3 className="text-4xl font-black text-zinc-900 tracking-tight uppercase italic">Awaiting Directives</h3>
                <p className="max-w-md text-[10px] text-zinc-400 font-black uppercase tracking-[0.4em] leading-relaxed mx-auto">
                  Analyze CRM Architecture, Manage Personnel Nodes, or Execute Data Synthesis.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                {[
                  { label: "Summarize Tasks", icon: Activity, desc: "Process all pending node operations" },
                  { label: "Lead Synthesis", icon: Zap, desc: "Analyze high-value conversion paths" },
                  { label: "Personnel Audit", icon: UserIcon, desc: "Review global network performance" },
                  { label: "System Hardening", icon: ShieldCheck, desc: "Analyze security and vault logs" }
                ].map((s, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setInput(s.label)}
                    className="p-6 bg-white border border-zinc-100 rounded-3xl text-left hover:border-zinc-950 group transition-all shadow-sm hover:shadow-xl"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="p-2 bg-zinc-50 rounded-xl group-hover:bg-zinc-950 group-hover:text-white transition-all">
                        <s.icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">{s.label}</span>
                    </div>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{s.desc}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            messages.map((msg, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={i} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-5 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg transition-transform hover:scale-110 ${msg.role === 'user' ? 'bg-zinc-950 text-white' : 'bg-indigo-500 text-white'}`}>
                    {msg.role === 'user' ? <UserIcon className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                  </div>
                  <div className={`px-8 py-5 rounded-[2rem] text-sm font-semibold leading-relaxed tracking-tight shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-zinc-950 text-white rounded-tr-none' 
                      : 'bg-white text-zinc-900 rounded-tl-none border border-zinc-100'
                  }`}>
                    {msg.content}
                    {msg.role === 'model' && i === messages.length - 1 && isSpeaking && (
                      <div className="mt-4 flex gap-1.5 items-center opacity-40">
                        {[1,2,3,4,5,6].map(j => (
                          <div key={j} className="w-0.5 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${j*0.1}s` }} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        
        {loading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex gap-5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex-shrink-0 flex items-center justify-center shadow-lg animate-pulse">
                <Bot className="h-5 w-5" />
              </div>
              <div className="px-8 py-5 bg-white border border-zinc-100 rounded-[2rem] rounded-tl-none flex items-center gap-4 text-zinc-400 shadow-sm">
                <Loader2 className="animate-spin h-5 w-5 text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Processing Neural Fragment...</span>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={scrollRef} className="h-8" />
      </div>

      {/* Input */}
      <div className="p-10 bg-white border-t border-zinc-50 relative z-20">
        <form onSubmit={handleSend} className="flex gap-6 items-end max-w-4xl mx-auto">
          <div className="flex-1 bg-zinc-50 border border-zinc-100 rounded-[2.5rem] p-3 focus-within:bg-white focus-within:border-zinc-950 focus-within:shadow-2xl focus-within:shadow-black/[0.03] transition-all">
            <textarea 
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="ENTER SYSTEM DIRECTIVE..."
              className="w-full bg-transparent border-none px-6 py-4 text-[15px] font-semibold text-zinc-900 placeholder:text-zinc-300 focus:outline-none resize-none max-h-48 custom-scrollbar scrollbar-hide"
            />
            <div className="flex items-center justify-between px-4 pb-2">
              <button 
                type="button"
                onClick={isRecording ? () => {} : startRecording}
                className={`p-3 transition-all rounded-xl shadow-sm ${isRecording ? 'text-rose-500 bg-rose-50 border border-rose-100 animate-pulse' : 'text-zinc-400 bg-white hover:text-zinc-950 hover:bg-zinc-50 border border-zinc-100'}`}
                title="Voice Input"
              >
                <Mic className="h-5 w-5" />
              </button>
              <span className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.2em] italic">Neural Link Enabled :: Node_Alpha</span>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={!input.trim() || loading}
            className="p-8 bg-zinc-950 text-white rounded-[2.5rem] hover:scale-105 active:scale-95 disabled:opacity-20 transition-all shadow-2xl shadow-black/20"
          >
            {loading ? <Loader2 className="animate-spin h-8 w-8" /> : <Send className="h-8 w-8" />}
          </button>
        </form>
      </div>
    </div>
  );
}
