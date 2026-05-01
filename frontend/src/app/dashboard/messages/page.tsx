"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { 
  Send, User as UserIcon, Loader2, Phone, Video, MoreVertical, 
  Search, Paperclip, Smile, ShieldCheck, Clock, Check, CheckCheck,
  ChevronLeft, Trash2, Edit, X, Mic, Volume2, Download, ExternalLink,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { io, Socket } from "socket.io-client";

interface Message {
  _id: string;
  senderId: any;
  receiverId: any;
  message: string;
  fileUrl?: string;
  fileType?: string;
  voiceUrl?: string;
  timestamp: string;
  isSeen: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [processing, setProcessing] = useState(false);

  // ── Voice Recording State ──────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  // Initialize Socket
  useEffect(() => {
    if (!user) return;
    const socketUrl = process.env.NEXT_PUBLIC_API_URL 
      ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') 
      : 'https://vertex-crm.onrender.com';
      
    const s = io(socketUrl, {
      auth: { token: localStorage.getItem("token") }
    });
    setSocket(s);
    s.emit("join", user._id);

    s.on("new_message", (msg: Message) => {
      setMessages(prev => [...prev, msg]);
      // Update contacts unread count if not selected
      setContacts(prev => prev.map(c => {
        if (c._id === msg.senderId._id && selectedContact?._id !== c._id) {
          return { ...c, unreadCount: (c.unreadCount || 0) + 1 };
        }
        return c;
      }));
    });

    s.on("messages_seen", ({ viewerId }) => {
      setMessages(prev => prev.map(m => 
        m.senderId === user._id || m.senderId?._id === user._id ? { ...m, isSeen: true } : m
      ));
    });

    s.on("typing", ({ senderId }) => {
      if (!typingUsers.includes(senderId)) {
        setTypingUsers(prev => [...prev, senderId]);
      }
    });

    s.on("stop_typing", ({ senderId }) => {
      setTypingUsers(prev => prev.filter(id => id !== senderId));
    });

    return () => { s.disconnect(); };
  }, [user, selectedContact]);

  const fetchContacts = useCallback(async () => {
    try {
      const { data } = await api.get("messages/contacts");
      // Filter out deleted users just in case, though backend should handle it
      setContacts(data.filter((c: any) => !c.isDeleted));
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const fetchMessages = useCallback(async (contactId: string) => {
    setLoadingChat(true);
    try {
      const { data } = await api.get(`messages?contactId=${contactId}`);
      setMessages(data);
      setLoadingChat(false);
      // Mark as seen
      await api.post("messages/mark-seen", { contactId });
      setContacts(prev => prev.map(c => c._id === contactId ? { ...c, unreadCount: 0 } : c));
    } catch (err) {
      console.error(err);
      setLoadingChat(false);
    }
  }, []);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact._id);
    }
  }, [selectedContact, fetchMessages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    try {
      const { data } = await api.post("messages", {
        receiverId: selectedContact._id,
        message: newMessage
      });
      setMessages(prev => [...prev, data]);
      setNewMessage("");
      socket?.emit("stop_typing", { receiverId: selectedContact._id, senderId: user?._id });
    } catch (err) { console.error(err); }
  };

  const handleCall = () => {
    if (!selectedContact?.phone) {
      alert("No mobile frequency registered for this node.");
      return;
    }
    // Remove non-numeric characters for WhatsApp API
    const cleanPhone = selectedContact.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  // ── Voice Logic ────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        setIsRecording(false);
        setMediaRecorder(null);
        setRecordingTime(0);

        // Access the shouldSend ref or state to determine if we should upload
        // For simplicity, I'll use a local closure or check a flag.
        // Actually, I'll pass a parameter to stopRecording.
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied:", err);
      alert("Microphone access required for voice transmissions.");
    }
  };

  const stopRecording = async (shouldSend: boolean = true) => {
    if (mediaRecorder && isRecording) {
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorder.onstop = async () => {
        if (shouldSend) {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          const { uploadToCloudinary } = await import("@/lib/cloudinary");
          const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
          
          try {
            setProcessing(true);
            const voiceUrl = await uploadToCloudinary(audioFile);
            const { data } = await api.post("messages", {
              receiverId: selectedContact?._id,
              voiceUrl,
              message: "🎤 Voice Transmission"
            });
            setMessages(prev => [...prev, data]);
          } catch (err) {
            console.error("Voice upload failed:", err);
          } finally {
            setProcessing(false);
          }
        }
        
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setMediaRecorder(null);
        setRecordingTime(0);
      };

      mediaRecorder.stop();
    }
  };

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!socket || !selectedContact) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", { receiverId: selectedContact._id, senderId: user?._id });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("stop_typing", { receiverId: selectedContact._id, senderId: user?._id });
    }, 2000);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6">
      {/* Sidebar: Contacts */}
      <div className={`flex-col w-full md:w-96 bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b-4 border-black bg-black text-white">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <ShieldCheck className="h-6 w-6" /> Comms Hub
          </h2>
          <div className="mt-4 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search personnel..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border-2 border-zinc-700 pl-11 pr-4 py-3 text-xs font-bold uppercase focus:border-white focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center gap-3 opacity-20">
              <Loader2 className="animate-spin h-8 w-8" />
              <span className="text-[10px] font-black uppercase">Scanning Frequencies...</span>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-10 text-center opacity-30 italic">
              <p className="text-xs font-black uppercase">No active nodes detected</p>
            </div>
          ) : (
            filteredContacts.map(contact => (
              <button 
                key={contact._id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full p-5 flex items-center gap-4 border-b-4 border-black/5 hover:bg-gray-50 transition-all text-left relative group ${selectedContact?._id === contact._id ? 'bg-gray-100' : ''}`}
              >
                <div className="relative">
                  <div className={`w-14 h-14 border-4 border-black flex items-center justify-center bg-white group-hover:scale-105 transition-transform ${contact.status === 'active' ? 'border-green-500' : 'border-black'}`}>
                    <UserIcon className="h-7 w-7 text-black" />
                  </div>
                  {contact.status === 'active' && (
                    <div className="absolute -right-1 -bottom-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-black uppercase truncate pr-2">{contact.name}</span>
                    {contact.unreadCount > 0 && (
                      <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 border-2 border-black animate-bounce shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 truncate">{contact.role} — {contact.email}</p>
                </div>
                {selectedContact?._id === contact._id && (
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-black" />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main: Chat Area */}
      <div className={`flex-1 bg-white border-4 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] flex-col relative ${!selectedContact ? 'hidden md:flex opacity-20 bg-zinc-50' : 'flex'}`}>
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b-4 border-black flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedContact(null)} className="md:hidden p-2 hover:bg-gray-100 border-2 border-black">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="w-12 h-12 border-4 border-black flex items-center justify-center">
                  <UserIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic leading-none">{selectedContact.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${selectedContact.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      {typingUsers.includes(selectedContact._id) ? "Transmitting..." : selectedContact.status === 'active' ? "Connected" : "Standby"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleCall}
                  className="p-3 border-2 border-black hover:bg-black hover:text-white transition-all"
                  title="WhatsApp Frequency"
                >
                  <Phone className="h-5 w-5" />
                </button>
                <button className="p-3 border-2 border-black hover:bg-black hover:text-white transition-all"><MoreVertical className="h-5 w-5" /></button>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
              {loadingChat ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 opacity-20">
                  <Loader2 className="animate-spin h-10 w-10 text-black" />
                  <span className="text-xs font-black uppercase tracking-widest">Decrypting Logs...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 italic">
                  <div className="w-20 h-20 border-4 border-black border-dashed flex items-center justify-center mb-4">
                    <Plus className="h-10 w-10" />
                  </div>
                  <p className="text-sm font-black uppercase">Initiate Secure Frequency</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.senderId === user?._id || msg.senderId?._id === user?._id;
                  const showTime = i === 0 || format(new Date(messages[i-1].timestamp), 'HH:mm') !== format(new Date(msg.timestamp), 'HH:mm');
                  
                  return (
                    <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {showTime && (
                        <span className="text-[9px] font-black uppercase text-gray-400 mb-2 px-2 tracking-widest">{format(new Date(msg.timestamp), 'HH:mm — dd MMM')}</span>
                      )}
                      <div className="group relative max-w-[85%] md:max-w-[70%]">
                        <div className={`p-5 border-4 border-black text-sm font-bold leading-relaxed shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${isMe ? 'bg-black text-white rounded-l-2xl rounded-tr-2xl' : 'bg-white text-black rounded-r-2xl rounded-tl-2xl'}`}>
                          {msg.voiceUrl ? (
                            <div className="flex flex-col gap-3 min-w-[200px]">
                              <div className="flex items-center gap-3">
                                <Mic className={`h-4 w-4 ${isMe ? 'text-zinc-500' : 'text-gray-400'}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Voice Memo</span>
                              </div>
                              <audio src={msg.voiceUrl} controls className={`w-full h-8 ${isMe ? 'invert' : ''}`} />
                            </div>
                          ) : msg.fileUrl ? (
                            <div className="flex flex-col gap-3">
                              <div className="p-4 bg-zinc-100 border-2 border-black flex items-center gap-3">
                                <Paperclip className="h-4 w-4 text-black" />
                                <span className="text-[10px] font-black uppercase text-black">Attachment</span>
                              </div>
                              <a href={msg.fileUrl} target="_blank" className="text-xs underline font-black uppercase text-blue-400">View Resource</a>
                            </div>
                          ) : (
                            msg.message
                          )}
                          <div className={`flex items-center gap-1 mt-2 ${isMe ? 'text-zinc-500' : 'text-gray-400'}`}>
                            {isMe && (msg.isSeen ? <CheckCheck className="h-3 w-3 text-blue-400" /> : <Check className="h-3 w-3" />)}
                            <span className="text-[8px] font-black uppercase">{format(new Date(msg.timestamp), 'HH:mm')}</span>
                            {msg.isEdited && <span className="text-[8px] font-black uppercase italic ml-1">(MODIFIED)</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t-4 border-black bg-white">
              <form onSubmit={handleSend} className="flex gap-4 items-end">
                <div className="flex gap-2 mb-1">
                  <button type="button" className="p-3 border-2 border-black hover:bg-gray-100 transition-all"><Paperclip className="h-5 w-5" /></button>
                </div>
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder="ENTER SECURE TRANSMISSION..."
                    className="w-full bg-white border-4 border-black p-5 pr-14 text-sm font-black uppercase placeholder:opacity-30 focus:outline-none transition-all shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.05)]"
                  />
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim()}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-black hover:scale-110 disabled:opacity-20 transition-all"
                  >
                    <Send className="h-6 w-6" />
                  </button>
                </div>
                {isRecording ? (
                  <div className="flex items-center gap-4 bg-red-600 text-white p-4 border-4 border-black">
                    <div className="flex items-end gap-1 h-6 w-12 px-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <motion.div 
                          key={i}
                          animate={{ height: [4, 16, 4] }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                          className="w-1 bg-white"
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{recordingTime}s</span>
                    <div className="flex gap-2 ml-4">
                      <button 
                        type="button" 
                        onClick={() => stopRecording(false)} 
                        className="p-2 bg-black text-white hover:bg-white hover:text-black transition-all border-2 border-black"
                        title="Abort Transmission"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => stopRecording(true)} 
                        className="p-2 bg-green-500 text-white hover:bg-white hover:text-green-500 transition-all border-2 border-black"
                        title="Execute Transmission"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    type="button" 
                    onClick={startRecording}
                    disabled={processing}
                    className="p-5 bg-black text-white border-4 border-black hover:bg-zinc-900 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)]"
                  >
                    {processing ? <Loader2 className="animate-spin h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </button>
                )}
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center">
            <div className="w-32 h-32 border-8 border-black flex items-center justify-center bg-white rotate-12 mb-8 shadow-[15px_15px_0px_0px_rgba(0,0,0,1)]">
              <ShieldCheck className="h-16 w-16" />
            </div>
            <h2 className="text-3xl font-black uppercase italic italic tracking-tighter mb-4">Frequency Standby</h2>
            <p className="max-w-md text-xs font-bold text-gray-400 uppercase tracking-widest leading-loose">
              Select a secure node from the operational manifest to initiate encrypted communication. All transmissions are logged and audited.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
