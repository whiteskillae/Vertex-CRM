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
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

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

  const [usage, setUsage] = useState<{ count: number; limit: number; isAdmin: boolean } | null>(null);

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
      speak(aiResponse);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.response?.status === 429 
        ? "DAILY QUOTA EXCEEDED: Operational limit reached (20/20). System reset in 24h."
        : "UPLINK FAILURE: Unable to reach neural core. Please retry.";
      
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
    <div className="flex flex-col h-[calc(100vh-180px)] max-w-6xl mx-auto">
      {/* Dynamic Header Card */}
      <div className="bg-white rounded-[2rem] border border-zinc-100 p-6 mb-6 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-14 h-14 bg-indigo-600 text-white flex items-center justify-center rounded-2xl shadow-xl shadow-indigo-500/20 relative z-10">
              <Cpu className="h-7 w-7" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full z-20 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Vertex AI <span className="text-indigo-600">Core</span></h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                <Activity className="h-3 w-3" /> Neural Link Active
              </span>
              <div className="h-3 w-[1px] bg-zinc-200" />
              {usage && (
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                  {usage.isAdmin ? "Admin Unlimited" : `Quota: ${usage.count}/${usage.limit}`}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-3 rounded-xl transition-all ${voiceEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-zinc-50 text-zinc-400 hover:text-zinc-600'}`}
            title="Toggle Voice Output"
          >
            {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          <button 
            onClick={clearChat}
            className="p-3 bg-zinc-50 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="Clear Chat History"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Chat Space */}
      <div className="flex-1 bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar scroll-smooth">
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center p-10"
              >
                <div className="w-24 h-24 bg-indigo-50 text-indigo-400 flex items-center justify-center rounded-[2rem] mb-8 animate-bounce transition-all duration-[2000ms]">
                  <Sparkles className="h-12 w-12" />
                </div>
                <h3 className="text-3xl font-bold text-zinc-900 tracking-tight mb-3">Operational Neural Core</h3>
                <p className="max-w-md text-sm text-zinc-400 leading-relaxed font-medium">
                  I am synchronized with your CRM data. Ask me about personnel, task logistics, or project metrics to initiate optimization protocols.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-12 w-full max-w-xl">
                  {["Summarize recent reports", "List urgent tasks", "Check lead conversion stats", "Personnel availability"].map((suggestion, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setInput(suggestion)}
                      className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold text-zinc-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all text-left group"
                    >
                      <span className="opacity-40 group-hover:opacity-100 mr-2">&rsaquo;</span>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              messages.map((msg, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  key={i} 
                  className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg ${msg.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-indigo-600 text-white'}`}>
                    {msg.role === 'user' ? <UserIcon className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                  </div>
                  <div className={`relative px-6 py-4 rounded-[2rem] max-w-[85%] sm:max-w-[70%] text-[13px] font-medium leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-zinc-900 text-white rounded-tr-none' 
                      : 'bg-indigo-50 text-indigo-900 rounded-tl-none border border-indigo-100'
                  }`}>
                    {msg.content}
                    {msg.role === 'model' && i === messages.length - 1 && isSpeaking && (
                      <div className="absolute -bottom-6 left-2 flex gap-1 items-center">
                        {[1,2,3].map(j => (
                          <div key={j} className="w-1 h-3 bg-indigo-400 rounded-full animate-wave" style={{ animationDelay: `${j*0.1}s` }} />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
          
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex-shrink-0 flex items-center justify-center shadow-lg">
                <Bot className="h-5 w-5" />
              </div>
              <div className="px-8 py-5 bg-indigo-50 border border-indigo-100 rounded-[2rem] rounded-tl-none flex items-center gap-4 text-indigo-400 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Neural core processing...</span>
              </div>
            </motion.div>
          )}
          <div ref={scrollRef} className="h-4" />
        </div>

        {/* Input Dock */}
        <div className="p-6 bg-white border-t border-zinc-100">
          <form onSubmit={handleSend} className="flex gap-3 relative">
            <div className="flex-1 relative group">
              <div className="absolute inset-0 bg-indigo-600/5 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-all duration-500" />
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Synchronize query with neural link..."
                className="w-full bg-zinc-50 border border-zinc-100 rounded-[1.5rem] p-5 pr-14 text-sm font-semibold text-zinc-900 placeholder:text-zinc-300 focus:bg-white focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 outline-none transition-all relative z-10"
              />
              <button 
                type="button"
                onClick={isRecording ? () => {} : startRecording}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 z-20 transition-all ${isRecording ? 'text-red-500 animate-pulse scale-125' : 'text-zinc-300 hover:text-indigo-600 hover:scale-110'}`}
                title="Voice Input"
              >
                <Mic className="h-6 w-6" />
              </button>
            </div>
            <button 
              type="submit" 
              disabled={!input.trim() || loading}
              className="px-8 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-bold hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center min-w-[80px]"
            >
              {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <Send className="h-6 w-6" />}
            </button>
          </form>
          <div className="flex items-center justify-center gap-4 mt-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-300 flex items-center gap-1.5">
              <Zap className="h-3 w-3" /> End-to-End Encryption
            </p>
            <div className="w-1 h-1 bg-zinc-200 rounded-full" />
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-300 flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" /> Secure Data Vault
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
