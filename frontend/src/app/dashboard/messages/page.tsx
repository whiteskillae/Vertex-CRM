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
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

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
      
      // Emit via socket for instant team sync if needed
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
      <Loader2 className="animate-spin h-20 w-20 text-black" />
      <span className="text-sm font-black uppercase tracking-[0.8em] animate-pulse">Establishing Secure Uplink...</span>
    </div>
  );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-8 pb-4">
      {/* Sidebar - Contacts */}
      <div className="w-full md:w-[400px] flex flex-col bg-white border-8 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="p-8 border-b-8 border-black bg-zinc-50 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Comms Hub</h2>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.4em] mt-2 italic">Secure Operational Grid</p>
            </div>
            <div className="w-5 h-5 bg-green-500 border-4 border-black rounded-none animate-pulse shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]" />
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-300" />
            <input 
              type="text" 
              placeholder="FILTER_NODES..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-4 border-black text-[11px] font-black uppercase focus:outline-none focus:bg-white bg-zinc-100 placeholder:text-zinc-300"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#fafafa]">
          {/* Team Chat Tab */}
          <button 
            onClick={() => { setIsTeamChat(true); setSelectedContact(null); }}
            className={`w-full p-8 border-b-8 flex items-center justify-between transition-all group relative overflow-hidden ${isTeamChat ? 'bg-black text-white border-black' : 'bg-white border-black hover:bg-zinc-100 shadow-[inset_0px_-8px_0px_0px_rgba(0,0,0,0.05)]'}`}
          >
            <div className="flex items-center gap-6 z-10">
              <div className={`w-16 h-16 border-4 border-current flex items-center justify-center ${isTeamChat ? 'bg-white text-black' : 'bg-black text-white'}`}>
                <Globe className="h-8 w-8" />
              </div>
              <div className="text-left">
                <p className="text-lg font-black uppercase tracking-tighter leading-none">Enterprise Matrix</p>
                <p className={`text-[9px] font-black uppercase tracking-widest mt-2 ${isTeamChat ? 'text-zinc-400' : 'text-zinc-500'}`}>Global Team Broadcast</p>
              </div>
            </div>
            {teamUnreadCount > 0 && (
              <span className="bg-red-600 text-white px-3 py-1 border-2 border-current text-[10px] font-black animate-bounce shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                {teamUnreadCount}
              </span>
            )}
          </button>

          <div className="p-4 bg-zinc-200 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 text-center">Personnel Nodes</div>

          {contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(contact => (
            <button
              key={contact._id}
              onClick={() => { setSelectedContact(contact); setIsTeamChat(false); }}
              className={`w-full p-8 border-b-4 border-black/10 flex items-center justify-between transition-all group ${selectedContact?._id === contact._id ? 'bg-white border-l-[16px] border-l-black translate-x-2' : 'hover:bg-zinc-50'}`}
            >
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className={`w-16 h-16 border-4 border-black flex items-center justify-center font-black text-2xl transition-transform group-hover:scale-110 ${selectedContact?._id === contact._id ? 'bg-black text-white' : 'bg-zinc-100 text-black'}`}>
                    {contact.name[0]}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 border-4 border-black ${contact.status === 'online' ? 'bg-green-500' : 'bg-zinc-400'}`} />
                </div>
                <div className="text-left">
                  <p className="text-lg font-black uppercase tracking-tighter leading-none">{contact.name}</p>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-2">{contact.role}</p>
                </div>
              </div>
              {contact.unreadCount ? contact.unreadCount > 0 && (
                <span className="bg-black text-white px-3 py-1 border-2 border-black text-[10px] font-black">
                  {contact.unreadCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white border-8 border-black shadow-[25px_25px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative">
        <AnimatePresence mode="wait">
          {selectedContact || isTeamChat ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col h-full"
            >
              {/* Chat Header */}
              <div className="p-8 border-b-8 border-black bg-zinc-50 flex items-center justify-between shadow-[0px_8px_0px_0px_rgba(0,0,0,0.05)] z-20">
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 border-4 border-black flex items-center justify-center ${isTeamChat ? 'bg-black text-white' : 'bg-white text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}>
                    {isTeamChat ? <Globe className="h-8 w-8" /> : <span className="font-black text-2xl">{selectedContact?.name[0]}</span>}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none">
                      {isTeamChat ? "Enterprise Matrix" : selectedContact?.name}
                    </h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2">
                      {isTeamChat ? (
                        <>GLOBAL_TEAM_UPLINK <Zap className="h-3 w-3 text-yellow-500" /></>
                      ) : (
                        <>SECURE_NODE_SESSION <Shield className="h-3 w-3 text-blue-500" /></>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {!isTeamChat && (
                    <button 
                      onClick={() => handleWhatsAppCall()}
                      className="p-5 border-4 border-black bg-[#25D366] text-white hover:bg-white hover:text-[#25D366] transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none translate-y-0 active:translate-y-2 group"
                    >
                      <Phone className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                  <button className="p-5 border-4 border-black bg-white hover:bg-black hover:text-white transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none translate-y-0 active:translate-y-2">
                    <Video className="h-6 w-6" />
                  </button>
                  <button className="p-5 border-4 border-black bg-white hover:bg-black hover:text-white transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none translate-y-0 active:translate-y-2">
                    <MoreVertical className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Messages Grid */}
              <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-[#fdfdfd] custom-scrollbar pattern-dots">
                {messages.map((msg, i) => {
                  const isOwn = (typeof msg.senderId === 'string' ? msg.senderId : msg.senderId?._id) === user?._id;
                  const senderName = typeof msg.senderId === 'object' ? msg.senderId?.name : (isOwn ? user?.name : 'Personnel');

                  return (
                    <div key={msg._id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      {isTeamChat && !isOwn && <span className="text-[10px] font-black uppercase text-zinc-400 mb-2 ml-4">{senderName}</span>}
                      <div className={`max-w-[75%] p-6 border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] relative group ${isOwn ? 'bg-black text-white' : 'bg-white text-black'}`}>
                        {/* File Support */}
                        {msg.fileUrl && (
                          <div className="mb-4 border-4 border-current p-2 bg-zinc-50/10">
                            {msg.fileType === 'image' ? (
                              <img 
                                src={msg.fileUrl} 
                                alt="Asset" 
                                className="w-full h-auto border-4 border-black cursor-pointer hover:opacity-80 transition-opacity" 
                                onClick={() => window.open(msg.fileUrl, '_blank')}
                              />
                            ) : (
                              <div className="flex items-center justify-between gap-6 p-4 bg-black/5">
                                <div className="flex items-center gap-4">
                                  <FileText className="h-8 w-8" />
                                  <span className="text-[10px] font-black uppercase tracking-tighter truncate max-w-[200px]">Asset_Secure_Payload.doc</span>
                                </div>
                                <button onClick={() => window.open(msg.fileUrl, '_blank')} className="p-3 bg-black text-white border-2 border-white hover:bg-white hover:text-black transition-all">
                                  <Download className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-sm font-bold uppercase leading-relaxed tracking-tight break-words">{msg.message}</p>
                        
                        <div className={`flex items-center gap-3 mt-4 text-[9px] font-black uppercase italic ${isOwn ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          <span>{format(new Date(msg.timestamp), 'HH:mm:ss')}</span>
                          {isOwn && (
                            msg.isSeen ? <CheckCheck className="h-4 w-4 text-blue-500" /> : <Check className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Typing Indicators */}
                {(isTeamChat ? teamTypingUsers : typingUsers).length > 0 && (
                  <div className="flex items-center gap-3 bg-zinc-100 p-4 border-4 border-black w-fit animate-pulse">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-black animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-black animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-black animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[9px] font-black uppercase italic">
                      {isTeamChat ? `${teamTypingUsers[0].userName} IS TRANSMITTING...` : 'NODE IS TRANSMITTING...'}
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-8 border-t-8 border-black bg-white">
                <AnimatePresence>
                  {previewUrl && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mb-6 p-4 bg-zinc-50 border-4 border-black relative group"
                    >
                      <img src={previewUrl} className="max-h-48 w-auto border-4 border-black mx-auto" />
                      <button onClick={() => { setPendingFile(null); setPreviewUrl(null); }} className="absolute -top-4 -right-4 bg-black text-white p-2 border-4 border-black hover:bg-white hover:text-black transition-all">
                        <X className="h-6 w-6" />
                      </button>
                    </motion.div>
                  )}
                  {pendingFile && !previewUrl && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="mb-6 p-6 bg-zinc-100 border-4 border-black flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <FileText className="h-10 w-10" />
                        <span className="text-[12px] font-black uppercase">{pendingFile.name}</span>
                      </div>
                      <button onClick={() => setPendingFile(null)} className="p-2 border-2 border-black hover:bg-red-600 hover:text-white transition-all"><X className="h-4 w-4" /></button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSend} className="flex gap-6 items-end">
                  <div className="flex gap-4">
                    <label className="p-6 border-4 border-black bg-zinc-50 hover:bg-black hover:text-white transition-all cursor-pointer shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none translate-y-0 active:translate-y-2">
                      <input type="file" className="hidden" onChange={handleFileChange} />
                      <Paperclip className="h-8 w-8" />
                    </label>
                    <button type="button" className="p-6 border-4 border-black bg-zinc-50 hover:bg-black hover:text-white transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none translate-y-0 active:translate-y-2">
                      <Smile className="h-8 w-8" />
                    </button>
                  </div>
                  
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(e);
                        }
                      }}
                      placeholder="ENTER_TRANSMISSION..."
                      className="w-full p-8 border-8 border-black text-lg font-black uppercase outline-none focus:bg-zinc-50 resize-none min-h-[100px] shadow-[inset_6px_6px_0px_0px_rgba(0,0,0,0.05)] placeholder:text-zinc-200"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={(!newMessage.trim() && !pendingFile) || processing}
                    className="p-8 bg-black text-white border-4 border-black hover:bg-white hover:text-black transition-all shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] active:shadow-none translate-y-0 active:translate-y-2 disabled:opacity-50 h-full flex items-center justify-center min-w-[120px] group"
                  >
                    {processing ? <Loader2 className="h-10 w-10 animate-spin" /> : <Send className="h-10 w-10 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" />}
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-30 bg-zinc-50/50">
              <div className="p-12 border-8 border-black border-dashed mb-10 group">
                <MessageSquare className="h-32 w-32 group-hover:scale-110 transition-transform duration-500" />
              </div>
              <h3 className="text-5xl font-black uppercase italic tracking-tighter mb-4">Awaiting Uplink</h3>
              <p className="text-sm font-black uppercase tracking-[0.5em] text-zinc-400">Select a node from the grid to initiate synchronization</p>
              
              <div className="grid grid-cols-3 gap-8 mt-16 w-full max-w-2xl">
                {[
                  { icon: Shield, label: "ENCRYPTED" },
                  { icon: Zap, label: "REAL-TIME" },
                  { icon: Globe, label: "BROADCAST" }
                ].map((item, i) => (
                  <div key={i} className="p-6 border-4 border-black flex flex-col items-center gap-4">
                    <item.icon className="h-8 w-8" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
