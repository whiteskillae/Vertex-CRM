"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { 
  Send, Mic, Volume2, VolumeX, ShieldCheck, 
  Loader2, Sparkles, Trash2, MessageSquare, 
  Bot, User as UserIcon, History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
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
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
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
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      if (err.response?.status === 429) {
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: "DEPLOYMENT REJECTED: Daily operational quota exceeded (20/20). Neural link will reset in 24 hours. Contact administrator for priority access." 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: "Protocol Failure: Unable to establish connection with neural core. Error: " + (err.response?.data?.message || "Internal Uplink Fault")
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const startRecording = () => {
    if (recognitionRef.current) {
      setIsRecording(true);
      recognitionRef.current.start();
    } else {
      alert("Voice protocol not supported in this environment.");
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-6 bg-black text-white border-4 border-black flex items-center justify-between shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white text-black flex items-center justify-center border-2 border-white">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter leading-none">Vertex AI Core</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Operational Assistant — v1.0.4</p>
              {usage && !usage.isAdmin && (
                <span className="text-[10px] font-black bg-white text-black px-2 border border-white">
                  QUOTA: {usage.count}/{usage.limit}
                </span>
              )}
              {usage?.isAdmin && (
                <span className="text-[10px] font-black bg-white text-black px-2 border border-white">
                  ADMIN_UNLIMITED
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-3 border-2 border-white transition-all ${voiceEnabled ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}
          >
            {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          <button 
            onClick={clearChat}
            className="p-3 border-2 border-white text-white hover:bg-white hover:text-black transition-all"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Chat Display */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-zinc-50 border-4 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,0.05)] custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
            <div className="w-24 h-24 border-4 border-black border-dashed flex items-center justify-center mb-6 animate-pulse">
              <Sparkles className="h-12 w-12" />
            </div>
            <h3 className="text-2xl font-black uppercase italic italic tracking-tighter mb-2">Neural Link Standby</h3>
            <p className="max-w-md text-xs font-bold uppercase tracking-widest leading-loose">
              Initiate communication for CRM intelligence, workflow guidance, and project data analysis.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i} 
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-10 h-10 border-4 border-black flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-white text-black' : 'bg-black text-white'}`}>
                {msg.role === 'user' ? <UserIcon className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
              </div>
              <div className={`p-6 border-4 border-black max-w-[80%] text-sm font-bold leading-relaxed shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${msg.role === 'user' ? 'bg-white text-black' : 'bg-zinc-900 text-white'}`}>
                {msg.content}
              </div>
            </motion.div>
          ))
        )}
        {loading && (
          <div className="flex gap-4">
            <div className="w-10 h-10 border-4 border-black flex-shrink-0 flex items-center justify-center bg-black text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div className="p-6 border-4 border-black bg-zinc-900 text-white flex items-center gap-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Processing Query...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
        <form onSubmit={handleSend} className="flex gap-4">
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="QUERY NEURAL CORE..."
              className="w-full bg-white border-4 border-black p-5 pr-14 text-sm font-black uppercase placeholder:opacity-30 focus:outline-none transition-all shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.05)]"
            />
            <button 
              type="button"
              onClick={isRecording ? () => {} : startRecording}
              className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 transition-all ${isRecording ? 'text-red-600 animate-pulse' : 'text-black hover:scale-110'}`}
            >
              <Mic className="h-6 w-6" />
            </button>
          </div>
          <button 
            type="submit" 
            disabled={!input.trim() || loading}
            className="p-5 bg-black text-white border-4 border-black hover:bg-zinc-900 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <Send className="h-6 w-6" />}
          </button>
        </form>
        <p className="text-[8px] font-black uppercase tracking-widest mt-4 text-gray-400 text-center italic">
          Vertex AI may occasionally provide inaccurate intelligence. Verify critical operational data.
        </p>
      </div>
    </div>
  );
}
