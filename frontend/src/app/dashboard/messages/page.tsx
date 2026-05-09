"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import api from "@/lib/api";
import { 
  Send, Paperclip, Search, MoreVertical, 
  Phone, Video, Smile, Shield, Globe, 
  User, Check, CheckCheck, Clock, Image as ImageIcon,
  FileText, Download, X, Loader2, MessageSquare,
  Hash, Users, ArrowLeft, Zap, ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface Contact {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: 'online' | 'offline' | 'away';
  unreadCount?: number;
  phone?: string;
  isDeleted?: boolean;
}

interface Message {
  _id: string;
  senderId: any;
  receiverId: any;
  message: string;
  timestamp: string;
  isSeen: boolean;
  isTeamChat: boolean;
  fileUrl?: string;
  fileType?: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isTeamChat, setIsTeamChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [teamUnreadCount, setTeamUnreadCount] = useState(0);
  
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [teamTypingUsers, setTeamTypingUsers] = useState<{userId: string, userName: string}[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers, teamTypingUsers]);

  // Socket listeners
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (msg: Message) => {
      const senderId = typeof msg.senderId === 'string' ? msg.senderId : msg.senderId?._id;
      if (!msg.isTeamChat) {
        if (selectedContact?._id === senderId || senderId === user._id) {
          setMessages(prev => {
            if (prev.find(m => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
          if (selectedContact?._id === senderId) {
            api.post("messages/seen", { contactId: senderId });
          }
        } else {
          setContacts(prev => prev.map(c => 
            c._id === senderId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
          ));
        }
      }
    };

    const handleTeamMessage = (msg: Message) => {
      const senderId = typeof msg.senderId === 'string' ? msg.senderId : msg.senderId?._id;
      if (isTeamChat) {
        setMessages(prev => {
          if (prev.find(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      } else {
        if (senderId !== user._id) {
          setTeamUnreadCount(prev => prev + 1);
        }
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("team_message", handleTeamMessage);
    
    socket.on("messages_seen", ({ viewerId }) => {
      setMessages(prev => prev.map(m => 
        (typeof m.senderId === 'string' ? m.senderId : m.senderId?._id) === user._id ? { ...m, isSeen: true } : m
      ));
    });

    socket.on("typing", ({ from, isTyping }) => {
      if (isTyping) setTypingUsers(prev => [...new Set([...prev, from])]);
      else setTypingUsers(prev => prev.filter(id => id !== from));
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

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!isTeamChat && !selectedContact) return;
      try {
        const { data } = await api.get("messages", {
          params: { 
            contactId: selectedContact?._id, 
            isTeamChat: isTeamChat.toString() 
          }
        });
        setMessages(data);
        if (selectedContact) {
          setContacts(prev => prev.map(c => c._id === selectedContact._id ? { ...c, unreadCount: 0 } : c));
          api.post("messages/seen", { contactId: selectedContact._id });
        } else if (isTeamChat) {
          setTeamUnreadCount(0);
        }
      } catch (err) { console.error(err); }
    };
    fetchMessages();
  }, [selectedContact, isTeamChat]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('upload', formData);
    return { url: res.data.secure_url, type: file.type.startsWith('image/') ? 'image' : 'file' };
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !pendingFile) || processing) return;

    setProcessing(true);
    let fileUrl = '';
    let fileType = '';

    try {
      if (pendingFile) {
        const uploadRes = await uploadFile(pendingFile);
        fileUrl = uploadRes.url;
        fileType = uploadRes.type;
      }

      const msgData = {
        message: newMessage,
        receiverId: selectedContact?._id,
        isTeamChat,
        fileUrl,
        fileType
      };

      const { data } = await api.post("messages", msgData);
      
      if (isTeamChat && socket) {
        socket.emit("team:message", data);
      }

      if (!isTeamChat) {
        setMessages(prev => [...prev, data]);
      }
      
      setNewMessage("");
      setPendingFile(null);
      setPreviewUrl(null);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        handleStopTyping();
      }
    } catch (err) {
      console.error(err);
      alert("Transmission failed. Re-linking...");
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

  const handleWhatsAppCall = (phone?: string) => {
    const targetPhone = phone || selectedContact?.phone;
    if (!targetPhone) {
      alert("No contact number registered for this node. Update profile protocols.");
      return;
    }
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center gap-8 opacity-40">
      <Loader2 className="animate-spin h-16 w-16 text-black" />
      <span className="text-[10px] font-black uppercase tracking-[0.8em]">Establishing Secure Uplink...</span>
    </div>
  );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-8 pb-4">
      {/* Sidebar - Contacts */}
      <div className="w-full lg:w-[420px] flex flex-col bg-white rounded-[3rem] border border-zinc-100 shadow-xl overflow-hidden">
        <div className="p-10 border-b border-zinc-50 bg-[#fafafa]/50 space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-4xl font-black uppercase tracking-tight text-zinc-900 leading-none">Comms Hub</h2>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.4em] mt-4 italic flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Secure Grid Active
              </p>
            </div>
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-zinc-100">
               <Zap className="h-6 w-6 text-zinc-900" />
            </div>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" />
            <input 
              type="text" 
              placeholder="SEARCH PERSONNEL..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-zinc-100 rounded-2xl p-5 pl-14 text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:border-zinc-900 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Team Chat Tab */}
          <button 
            onClick={() => { setIsTeamChat(true); setSelectedContact(null); }}
            className={`w-full p-10 border-b border-zinc-50 flex items-center justify-between transition-all group relative overflow-hidden ${isTeamChat ? 'bg-zinc-950 text-white' : 'bg-white hover:bg-zinc-50'}`}
          >
            <div className="flex items-center gap-6 relative z-10">
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-all duration-500 ${isTeamChat ? 'bg-white text-zinc-950 rotate-6' : 'bg-zinc-950 text-white group-hover:rotate-6'}`}>
                <Globe className="h-8 w-8" />
              </div>
              <div className="text-left">
                <p className="text-xl font-black uppercase tracking-tight leading-none">Enterprise Matrix</p>
                <p className={`text-[9px] font-black uppercase tracking-widest mt-2 ${isTeamChat ? 'text-zinc-500' : 'text-zinc-400'}`}>Global Team Broadcast</p>
              </div>
            </div>
            {teamUnreadCount > 0 && (
              <span className="bg-brand-rose text-white px-4 py-1.5 rounded-full text-[10px] font-black shadow-xl animate-bounce">
                {teamUnreadCount}
              </span>
            )}
          </button>

          <div className="px-10 py-6 bg-zinc-50 text-[9px] font-black uppercase tracking-[0.4em] text-zinc-400">Personnel Nodes</div>

          {contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(contact => (
            <button
              key={contact._id}
              onClick={() => { setSelectedContact(contact); setIsTeamChat(false); }}
              className={`w-full p-10 border-b border-zinc-50 flex items-center justify-between transition-all group ${selectedContact?._id === contact._id ? 'bg-zinc-50 border-l-[6px] border-l-zinc-950' : 'bg-white hover:bg-zinc-50'}`}
            >
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl transition-all duration-500 shadow-sm ${selectedContact?._id === contact._id ? 'bg-zinc-950 text-white' : 'bg-white border border-zinc-100 text-zinc-900 group-hover:bg-zinc-950 group-hover:text-white'}`}>
                    {contact.name[0]}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${contact.status === 'online' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-zinc-300'} shadow-xl`} />
                </div>
                <div className="text-left">
                  <p className="text-xl font-black uppercase tracking-tight text-zinc-900 leading-none">{contact.name}</p>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-2 italic">{contact.role}</p>
                </div>
              </div>
              {contact.unreadCount ? contact.unreadCount > 0 && (
                <span className="bg-zinc-950 text-white px-4 py-1.5 rounded-full text-[10px] font-black shadow-xl">
                  {contact.unreadCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-[3.5rem] border border-zinc-100 shadow-2xl overflow-hidden relative">
        <AnimatePresence mode="wait">
          {selectedContact || isTeamChat ? (
            <motion.div 
              key={selectedContact?._id || 'team'}
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex flex-col h-full"
            >
              {/* Chat Header */}
              <div className="p-10 border-b border-zinc-50 bg-white flex items-center justify-between z-20 shadow-sm">
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl transition-all duration-500 ${isTeamChat ? 'bg-zinc-950 text-white' : 'bg-white border border-zinc-100 text-zinc-900 shadow-zinc-100/50'}`}>
                    {isTeamChat ? <Globe className="h-8 w-8" /> : <span className="font-black text-2xl">{selectedContact?.name[0]}</span>}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tight text-zinc-900 leading-none">
                      {isTeamChat ? "Enterprise Matrix" : selectedContact?.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-3">
                      <div className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${isTeamChat ? 'bg-zinc-950 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                        {isTeamChat ? 'GLOBAL_UPLINK' : 'SECURE_NODE'}
                      </div>
                      <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest italic flex items-center gap-2">
                        {isTeamChat ? 'Syncing with all active personnel' : (selectedContact?.status === 'online' ? 'Synchronization Stable' : 'Node Offline')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {!isTeamChat && (
                    <button 
                      onClick={() => handleWhatsAppCall()}
                      className="p-5 bg-emerald-50 text-emerald-600 rounded-3xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm hover:scale-105 active:scale-95"
                    >
                      <Phone className="h-6 w-6" />
                    </button>
                  )}
                  <button className="p-5 bg-zinc-50 text-zinc-400 rounded-3xl hover:bg-zinc-950 hover:text-white transition-all shadow-sm hover:scale-105 active:scale-95">
                    <Video className="h-6 w-6" />
                  </button>
                  <button className="p-5 bg-zinc-50 text-zinc-400 rounded-3xl hover:bg-zinc-950 hover:text-white transition-all shadow-sm hover:scale-105 active:scale-95">
                    <MoreVertical className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Messages Grid */}
              <div className="flex-1 overflow-y-auto p-12 space-y-10 bg-[#fdfdfd] custom-scrollbar">
                {messages.map((msg, i) => {
                  const isOwn = (typeof msg.senderId === 'string' ? msg.senderId : msg.senderId?._id) === user?._id;
                  const senderName = typeof msg.senderId === 'object' ? msg.senderId?.name : (isOwn ? user?.name : 'Personnel');

                  return (
                    <div key={msg._id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      {isTeamChat && !isOwn && <span className="text-[9px] font-black uppercase text-zinc-300 mb-3 ml-4 tracking-widest">{senderName}</span>}
                      <div className={`max-w-[70%] p-8 rounded-[2.5rem] relative group transition-all duration-300 shadow-sm ${isOwn ? 'bg-zinc-950 text-white rounded-tr-none' : 'bg-white border border-zinc-100 text-zinc-900 rounded-tl-none hover:border-zinc-200'}`}>
                        {msg.fileUrl && (
                          <div className="mb-6 rounded-2xl overflow-hidden bg-white/5 border border-white/10 p-1 shadow-inner">
                            {msg.fileType === 'image' ? (
                              <img 
                                src={msg.fileUrl} 
                                alt="Asset" 
                                className="w-full h-auto rounded-xl cursor-pointer hover:opacity-90 transition-all" 
                                onClick={() => window.open(msg.fileUrl, '_blank')}
                              />
                            ) : (
                              <div className="flex items-center justify-between gap-6 p-6">
                                <div className="flex items-center gap-5">
                                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                                    <FileText className="h-6 w-6" />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Asset_Secure_Payload</p>
                                    <p className="text-[8px] font-bold text-zinc-500 uppercase mt-1 tracking-wider">Cloudinary Archive</p>
                                  </div>
                                </div>
                                <button onClick={() => window.open(msg.fileUrl, '_blank')} className="p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                                  <Download className="h-5 w-5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-sm font-semibold leading-relaxed tracking-tight break-words">{msg.message}</p>
                        
                        <div className={`flex items-center gap-3 mt-6 text-[8px] font-black uppercase tracking-widest ${isOwn ? 'text-zinc-500' : 'text-zinc-300'}`}>
                          <span>{format(new Date(msg.timestamp), 'HH:mm:ss')}</span>
                          {isOwn && (
                            msg.isSeen ? <CheckCheck className="h-3.5 w-3.5 text-indigo-400" /> : <Check className="h-3.5 w-3.5" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Typing Indicators */}
                {(isTeamChat ? teamTypingUsers : typingUsers).length > 0 && (
                  <motion.div initial={{opacity:0, y: 10}} animate={{opacity:1, y: 0}} className="flex items-center gap-4 bg-white border border-zinc-100 p-5 rounded-[1.5rem] w-fit shadow-sm">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 bg-zinc-950 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-zinc-950 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-zinc-950 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400 italic">
                      {isTeamChat ? `${teamTypingUsers[0].userName} IS TRANSMITTING...` : 'NODE IS TRANSMITTING...'}
                    </span>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-10 border-t border-zinc-50 bg-white">
                <AnimatePresence>
                  {previewUrl && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="mb-8 p-6 bg-zinc-50 rounded-[2.5rem] border border-zinc-100 relative group"
                    >
                      <img src={previewUrl} className="max-h-56 w-auto rounded-3xl shadow-2xl mx-auto border border-zinc-200" />
                      <button onClick={() => { setPendingFile(null); setPreviewUrl(null); }} className="absolute -top-4 -right-4 bg-zinc-950 text-white p-4 rounded-2xl shadow-xl hover:scale-110 transition-all">
                        <X className="h-6 w-6" />
                      </button>
                    </motion.div>
                  )}
                  {pendingFile && !previewUrl && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      className="mb-8 p-8 bg-zinc-950 rounded-[2.5rem] flex items-center justify-between shadow-2xl"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                           <FileText className="h-8 w-8" />
                        </div>
                        <div>
                          <p className="text-[12px] font-black text-white uppercase tracking-widest">{pendingFile.name}</p>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Pending Transmission</p>
                        </div>
                      </div>
                      <button onClick={() => setPendingFile(null)} className="p-4 bg-white/10 text-white rounded-2xl hover:bg-brand-rose transition-all"><X className="h-5 w-5" /></button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSend} className="flex gap-6 items-end">
                  <div className="flex gap-4 mb-2">
                    <label className="p-6 bg-zinc-50 text-zinc-400 rounded-3xl hover:bg-zinc-950 hover:text-white transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95">
                      <input type="file" className="hidden" onChange={handleFileChange} />
                      <Paperclip className="h-8 w-8" />
                    </label>
                    <button type="button" className="p-6 bg-zinc-50 text-zinc-400 rounded-3xl hover:bg-zinc-950 hover:text-white transition-all shadow-sm hover:scale-105 active:scale-95">
                      <Smile className="h-8 w-8" />
                    </button>
                  </div>
                  
                  <div className="flex-1 relative group">
                    <textarea
                      value={newMessage}
                      onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(e);
                        }
                      }}
                      placeholder="ENTER TRANSMISSION PROTOCOL..."
                      className="w-full p-8 bg-zinc-50 border border-zinc-100 rounded-[2.5rem] text-[15px] font-semibold text-zinc-900 outline-none focus:bg-white focus:border-zinc-950 transition-all resize-none min-h-[110px] max-h-[300px] shadow-sm scrollbar-hide"
                    />
                    <div className="absolute right-6 bottom-6 flex items-center gap-3">
                       <Zap className={`h-4 w-4 transition-all duration-700 ${newMessage.length > 0 ? 'text-indigo-500 animate-pulse scale-125' : 'text-zinc-200'}`} />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={(!newMessage.trim() && !pendingFile) || processing}
                    className="p-8 bg-zinc-950 text-white rounded-[2.5rem] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/20 disabled:opacity-50 h-full flex items-center justify-center min-w-[130px] group mb-2"
                  >
                    {processing ? <Loader2 className="h-10 w-10 animate-spin" /> : <Send className="h-10 w-10 group-hover:translate-x-2 group-hover:-translate-y-2 transition-all duration-500" />}
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center relative overflow-hidden">
              <div className="absolute inset-0 pattern-dots opacity-[0.03] scale-150 rotate-12" />
              <div className="relative z-10 space-y-12 max-w-lg">
                <div className="w-48 h-48 bg-zinc-50 rounded-[4rem] border border-zinc-100 flex items-center justify-center mx-auto shadow-2xl shadow-black/[0.02] group">
                  <MessageSquare className="h-20 w-20 text-zinc-100 group-hover:text-zinc-950 group-hover:scale-110 transition-all duration-700" />
                </div>
                <div className="space-y-6">
                  <h3 className="text-5xl font-black uppercase tracking-tight text-zinc-900 italic">Awaiting Uplink</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400 leading-relaxed">
                    Personnel Node Selection Required. Initiate Encrypted Synchronization Protocol to Begin Communication.
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { icon: Shield, label: "ENCRYPTED" },
                    { icon: Zap, label: "REAL-TIME" },
                    { icon: Globe, label: "BROADCAST" }
                  ].map((item, i) => (
                    <div key={i} className="p-6 bg-white border border-zinc-100 rounded-3xl flex flex-col items-center gap-4 shadow-sm">
                      <item.icon className="h-6 w-6 text-zinc-300" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
