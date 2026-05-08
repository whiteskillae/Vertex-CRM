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
import { useSocket } from "@/context/SocketContext";

interface Contact {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'offline';
  unreadCount: number;
  phone?: string;
  isDeleted?: boolean;
}

interface Message {
  _id: string;
  senderId: string | { _id: string; name: string };
  receiverId: string | { _id: string; name: string };
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
  const { socket } = useSocket();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const [isTeamChat, setIsTeamChat] = useState(false);
  const [teamUnreadCount, setTeamUnreadCount] = useState(0);
  const [teamTypingUsers, setTeamTypingUsers] = useState<{userId: string, userName: string}[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [processing, setProcessing] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  // ── Stable Socket Listeners ───────────────────────────────────────────
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (msg: Message) => {
      setMessages(prev => {
        if (prev.find(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      
      const senderId = typeof msg.senderId === 'string' ? msg.senderId : msg.senderId?._id;

      setContacts(prev => prev.map(c => {
        if (c._id === senderId && selectedContact?._id !== c._id) {
          return { ...c, unreadCount: (c.unreadCount || 0) + 1 };
        }
        return c;
      }));
    };

    const handleTeamMessage = (msg: Message) => {
      if (isTeamChat) {
        setMessages(prev => {
          if (prev.find(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      } else {
        setTeamUnreadCount(prev => prev + 1);
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("team_message", handleTeamMessage);
    
    socket.on("messages_seen", ({ viewerId }) => {
      setMessages(prev => prev.map(m => 
        (typeof m.senderId === 'string' ? m.senderId : m.senderId?._id) === user._id ? { ...m, isSeen: true } : m
      ));
    });

    socket.on("typing", ({ senderId }) => {
      setTypingUsers(prev => prev.includes(senderId) ? prev : [...prev, senderId]);
    });

    socket.on("stop_typing", ({ senderId }) => {
      setTypingUsers(prev => prev.filter(id => id !== senderId));
    });

    socket.on("team:typing", ({ userId, userName, isTyping }) => {
      if (isTyping) {
        setTeamTypingUsers(prev => prev.some(u => u.userId === userId) ? prev : [...prev, { userId, userName }]);
      } else {
        setTeamTypingUsers(prev => prev.filter(u => u.userId !== userId));
      }
    });

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("team_message", handleTeamMessage);
      socket.off("messages_seen");
      socket.off("typing");
      socket.off("stop_typing");
      socket.off("team:typing");
    };
  }, [socket, user, selectedContact, isTeamChat]);

  const fetchContacts = useCallback(async () => {
    try {
      const { data } = await api.get("messages/contacts");
      setContacts(data.filter((c: Contact) => !c.isDeleted));
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
      await api.post("messages/mark-seen", { contactId });
      setContacts(prev => prev.map(c => c._id === contactId ? { ...c, unreadCount: 0 } : c));
    } catch (err) {
      console.error(err);
      setLoadingChat(false);
    }
  }, []);

  const fetchTeamMessages = useCallback(async () => {
    setLoadingChat(true);
    try {
      const { data } = await api.get(`messages?isTeamChat=true`);
      setMessages(data);
      setLoadingChat(false);
      setTeamUnreadCount(0);
    } catch (err) {
      console.error(err);
      setLoadingChat(false);
    }
  }, []);

  useEffect(() => {
    if (isTeamChat) {
      fetchTeamMessages();
    } else if (selectedContact) {
      fetchMessages(selectedContact._id);
    }
  }, [selectedContact, isTeamChat, fetchMessages, fetchTeamMessages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || processing) return;

    setProcessing(true);
    const msgData = {
      message: newMessage,
      receiverId: selectedContact?._id,
      isTeamChat
    };

    try {
      const { data } = await api.post("messages", msgData);
      if (!isTeamChat) {
        setMessages(prev => [...prev, data]);
      }
      setNewMessage("");
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        handleStopTyping();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleTyping = () => {
    if (!socket) return;
    if (isTeamChat) {
      socket.emit("team:typing", { isTyping: true, userName: user?.name });
    } else if (selectedContact) {
      socket.emit("typing", { to: selectedContact._id, isTyping: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(handleStopTyping, 2000);
  };

  const handleStopTyping = () => {
    if (!socket) return;
    if (isTeamChat) {
      socket.emit("team:typing", { isTyping: false });
    } else if (selectedContact) {
      socket.emit("typing", { to: selectedContact._id, isTyping: false });
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col md:flex-row gap-6">
      {/* Sidebar - Contacts */}
      <div className="w-full md:w-80 flex flex-col bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="p-6 border-b-4 border-black bg-zinc-50 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black uppercase italic tracking-tighter">Comms Hub</h2>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          </div>
          
          {/* Team Chat Tab */}
          <button 
            onClick={() => { setIsTeamChat(true); setSelectedContact(null); }}
            className={`w-full p-4 border-4 flex items-center justify-between transition-all group ${isTeamChat ? 'bg-black text-white border-black' : 'bg-white border-black hover:bg-zinc-100'}`}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className={`h-5 w-5 ${isTeamChat ? 'text-white' : 'text-black'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">Team Command</span>
            </div>
            {teamUnreadCount > 0 && (
              <span className="bg-red-600 text-white text-[8px] px-2 py-1 border-2 border-white">
                {teamUnreadCount}
              </span>
            )}
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Filter Nodes..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-black text-[10px] font-black uppercase outline-none focus:bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y-2 divide-black/5">
          {loading ? (
            <div className="p-10 flex flex-col items-center opacity-30 gap-3">
              <Loader2 className="animate-spin h-6 w-6" />
              <p className="text-[8px] font-black uppercase tracking-widest">Scanning Network...</p>
            </div>
          ) : (
            contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(contact => (
              <button
                key={contact._id}
                onClick={() => { setSelectedContact(contact); setIsTeamChat(false); }}
                className={`w-full p-5 flex items-center gap-4 hover:bg-zinc-50 transition-all text-left ${selectedContact?._id === contact._id ? 'bg-zinc-100 border-l-8 border-black' : ''}`}
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-black text-white flex items-center justify-center border-4 border-black font-black text-lg">
                    {contact.name[0].toUpperCase()}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${contact.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black uppercase truncate">{contact.name}</p>
                    {contact.unreadCount > 0 && (
                      <span className="bg-red-600 text-white text-[8px] px-2 py-1 border-2 border-white font-black animate-bounce">
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">{contact.role}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white border-4 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        {selectedContact || isTeamChat ? (
          <>
            {/* Header */}
            <div className="p-6 border-b-4 border-black bg-zinc-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 flex items-center justify-center border-4 border-black text-white font-black text-lg ${isTeamChat ? 'bg-red-600' : 'bg-black'}`}>
                  {isTeamChat ? <ShieldCheck className="h-6 w-6" /> : selectedContact?.name[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase italic tracking-tighter">
                    {isTeamChat ? 'Team Command Channel' : selectedContact?.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${isTeamChat || selectedContact?.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest">
                      {isTeamChat ? 'All Personnel Connected' : (selectedContact?.status === 'active' ? 'Signal Active' : 'Offline')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="p-3 border-2 border-black hover:bg-black hover:text-white transition-all"><Phone className="h-4 w-4" /></button>
                <button className="p-3 border-2 border-black hover:bg-black hover:text-white transition-all"><Video className="h-4 w-4" /></button>
                <button className="p-3 border-2 border-black hover:bg-black hover:text-white transition-all"><MoreVertical className="h-4 w-4" /></button>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-zinc-50">
              {loadingChat ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 gap-3">
                  <Loader2 className="animate-spin h-8 w-8" />
                  <p className="text-[10px] font-black uppercase tracking-widest italic">Decrypting Transmission...</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = (typeof msg.senderId === 'string' ? msg.senderId : msg.senderId?._id) === user?._id;
                  const senderName = typeof msg.senderId === 'string' ? 'Personnel' : msg.senderId?.name;
                  
                  return (
                    <div key={msg._id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      {!isMine && isTeamChat && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-2">
                          {senderName}
                        </span>
                      )}
                      <div className={`group relative max-w-[80%] p-5 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] ${isMine ? 'bg-black text-white' : 'bg-white text-black'}`}>
                        <p className="text-xs font-bold leading-relaxed">{msg.message}</p>
                        <div className={`flex items-center gap-2 mt-3 text-[8px] font-black uppercase ${isMine ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          <span>{format(new Date(msg.timestamp), 'HH:mm')}</span>
                          {isMine && (
                            msg.isSeen ? <CheckCheck className="h-3 w-3 text-blue-500" /> : <Check className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {/* Typing indicators */}
              {(isTeamChat ? teamTypingUsers.length > 0 : typingUsers.length > 0) && (
                <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-zinc-400 italic">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {isTeamChat 
                    ? `${teamTypingUsers.map(u => u.userName).join(', ')} typing...`
                    : `${selectedContact?.name} typing...`}
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t-4 border-black bg-white">
              <form onSubmit={handleSend} className="flex gap-4">
                <div className="flex gap-2">
                  <button type="button" className="p-4 border-2 border-black hover:bg-zinc-100 transition-all"><Paperclip className="h-5 w-5" /></button>
                  <button type="button" className="p-4 border-2 border-black hover:bg-zinc-100 transition-all"><Mic className="h-5 w-5" /></button>
                </div>
                <input 
                  type="text"
                  value={newMessage}
                  onChange={e => { setNewMessage(e.target.value); handleTyping(); }}
                  placeholder="TRANSMIT MESSAGE..."
                  className="flex-1 border-4 border-black p-4 text-xs font-black uppercase outline-none focus:bg-zinc-50 shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.05)]"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim() || processing}
                  className="px-8 py-4 bg-black text-white border-4 border-black font-black uppercase text-xs hover:bg-zinc-900 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] disabled:opacity-50"
                >
                  {processing ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30">
            <div className="w-24 h-24 border-8 border-black border-dashed flex items-center justify-center mb-8 animate-pulse">
              <MessageSquare className="h-12 w-12" />
            </div>
            <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Comms Link Standby</h3>
            <p className="max-w-md text-xs font-bold uppercase tracking-widest leading-loose">
              Select a personnel node or team channel to initiate secure encrypted communication protocols.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Re-add missing icons
import { MessageSquare } from "lucide-react";
