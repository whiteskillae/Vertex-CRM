"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import api from "@/lib/api";
import { 
  Send, 
  Paperclip, 
  Search, 
  MoreVertical, 
  Phone, 
  Video, 
  Smile, 
  User, 
  Check, 
  CheckCheck, 
  Globe, 
  Loader2, 
  MessageSquare,
  X,
  FileText,
  Download,
  Activity
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
  const [mounted, setMounted] = useState(false);
  
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchContacts();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  const fetchContacts = async () => {
    try {
      const { data } = await api.get("messages/contacts");
      setContacts(data.filter((c: Contact) => c._id !== user?._id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (msg: Message) => {
      const senderId = typeof msg.senderId === 'string' ? msg.senderId : msg.senderId?._id;
      if (!msg.isTeamChat) {
        if (selectedContact?._id === senderId || senderId === user._id) {
          setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
          if (selectedContact?._id === senderId) api.post("messages/seen", { contactId: senderId });
        } else {
          setContacts(prev => prev.map(c => c._id === senderId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c));
        }
      } else {
        if (isTeamChat) setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
        else if (senderId !== user._id) setTeamUnreadCount(prev => prev + 1);
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("team_message", handleNewMessage);
    socket.on("typing", ({ from, isTyping }) => {
      if (isTyping) setTypingUsers(prev => [...new Set([...prev, from])]);
      else setTypingUsers(prev => prev.filter(id => id !== from));
    });

    return () => {
      socket.off("new_message");
      socket.off("team_message");
      socket.off("typing");
    };
  }, [socket, user, selectedContact, isTeamChat]);

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
        } else {
          setTeamUnreadCount(0);
        }
      } catch (err) { console.error(err); }
    };
    fetchMessages();
  }, [selectedContact, isTeamChat]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !pendingFile) || processing) return;

    setProcessing(true);
    try {
      let fileUrl = '';
      let fileType = '';
      if (pendingFile) {
        const formData = new FormData();
        formData.append('file', pendingFile);
        const res = await api.post('upload', formData);
        fileUrl = res.data.secure_url;
        fileType = pendingFile.type.startsWith('image/') ? 'image' : 'file';
      }

      const msgData = {
        message: newMessage,
        receiverId: selectedContact?._id,
        isTeamChat,
        fileUrl,
        fileType
      };

      const { data } = await api.post("messages", msgData);
      if (isTeamChat) socket?.emit("team:message", data);
      if (!isTeamChat) setMessages(prev => [...prev, data]);
      
      setNewMessage("");
      setPendingFile(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Synchronizing Protocol...</p>
      </div>
    );
  }

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-180px)] flex bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm">
      {/* Sidebar */}
      <div className="w-[380px] flex flex-col border-r border-border bg-muted/10">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight">Messages</h1>
            <div className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-tight">Active</div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Filter contacts..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Team Broadcast */}
          <button
            onClick={() => { setIsTeamChat(true); setSelectedContact(null); }}
            className={`w-full p-4 flex items-center gap-4 transition-all border-b border-border/50 ${isTeamChat ? 'bg-secondary' : 'hover:bg-muted/30'}`}
          >
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Team Matrix</span>
                {teamUnreadCount > 0 && <div className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-[10px] font-bold">{teamUnreadCount}</div>}
              </div>
              <p className="text-xs text-muted-foreground truncate">Global personnel broadcast</p>
            </div>
          </button>

          {/* Contact List */}
          <div className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/5">Personnel</div>
          {filteredContacts.map(contact => (
            <button
              key={contact._id}
              onClick={() => { setSelectedContact(contact); setIsTeamChat(false); }}
              className={`w-full p-4 flex items-center gap-4 transition-all border-b border-border/50 ${selectedContact?._id === contact._id ? 'bg-secondary' : 'hover:bg-muted/30'}`}
            >
              <div className="relative shrink-0">
                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center font-bold text-lg text-muted-foreground border border-border">
                  {contact.name?.[0]?.toUpperCase() || <User className="w-6 h-6 opacity-30" />}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${contact.status === 'online' ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm truncate">{contact.name}</span>
                  {contact.unreadCount ? contact.unreadCount > 0 && <div className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-[10px] font-bold">{contact.unreadCount}</div> : null}
                </div>
                <p className="text-xs text-muted-foreground truncate uppercase tracking-tight">{contact.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-background relative">
        <AnimatePresence mode="wait">
          {selectedContact || isTeamChat ? (
            <motion.div 
              key={selectedContact?._id || 'team'}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex-1 flex flex-col h-full"
            >
              {/* Chat Header */}
              <div className="h-20 px-8 flex items-center justify-between border-b border-border bg-background/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center font-bold border border-border text-sm">
                    {isTeamChat ? <Globe className="w-5 h-5 text-primary" /> : selectedContact?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{isTeamChat ? "Team Matrix" : selectedContact?.name}</h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                      {isTeamChat ? 'Active Sync' : (selectedContact?.status === 'online' ? 'Signal Stable' : 'Node Offline')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isTeamChat && (
                    <button className="p-2.5 hover:bg-muted rounded-xl text-muted-foreground transition-all"><Phone className="w-4 h-4" /></button>
                  )}
                  <button className="p-2.5 hover:bg-muted rounded-xl text-muted-foreground transition-all"><Video className="w-4 h-4" /></button>
                  <button className="p-2.5 hover:bg-muted rounded-xl text-muted-foreground transition-all"><MoreVertical className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Messages Grid */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-muted/5 custom-scrollbar">
                {messages.map((msg, i) => {
                  const isOwn = (typeof msg.senderId === 'string' ? msg.senderId : msg.senderId?._id) === user?._id;
                  return (
                    <div key={msg._id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      {isTeamChat && !isOwn && <span className="text-[10px] font-bold text-muted-foreground mb-2 ml-2">{msg.senderId?.name}</span>}
                      <div className={`max-w-[70%] p-4 rounded-2xl text-sm shadow-sm transition-all ${isOwn ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card border border-border text-foreground rounded-tl-none'}`}>
                        {msg.fileUrl && (
                          <div className="mb-3 rounded-xl overflow-hidden border border-border/50">
                            {msg.fileType === 'image' ? (
                              <img src={msg.fileUrl} alt="Attachment" className="w-full h-auto max-h-96 object-cover" onClick={() => window.open(msg.fileUrl, '_blank')} />
                            ) : (
                              <div className="flex items-center gap-4 p-4 bg-muted/50">
                                <FileText className="w-8 h-8 text-muted-foreground" />
                                <div className="flex-1 overflow-hidden">
                                  <p className="text-xs font-bold truncate uppercase tracking-tight">SECURE_ATTACHMENT</p>
                                  <p className="text-[10px] text-muted-foreground">Encrypted Payload</p>
                                </div>
                                <button onClick={() => window.open(msg.fileUrl, '_blank')} className="p-2 hover:bg-muted rounded-lg transition-all"><Download className="w-4 h-4" /></button>
                              </div>
                            )}
                          </div>
                        )}
                        <p className="leading-relaxed">{msg.message}</p>
                        <div className={`flex items-center gap-2 mt-2 text-[10px] font-bold opacity-50 ${isOwn ? 'justify-end' : ''}`}>
                          <span>{format(new Date(msg.timestamp), 'HH:mm')}</span>
                          {isOwn && (msg.isSeen ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-8 border-t border-border bg-background">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-end gap-4">
                  <div className="flex gap-2 mb-2">
                    <label className="p-2.5 bg-muted text-muted-foreground rounded-xl hover:text-foreground cursor-pointer transition-all">
                      <input type="file" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPendingFile(file);
                          if (file.type.startsWith('image/')) setPreviewUrl(URL.createObjectURL(file));
                        }
                      }} />
                      <Paperclip className="w-5 h-5" />
                    </label>
                    <button type="button" className="p-2.5 bg-muted text-muted-foreground rounded-xl hover:text-foreground transition-all"><Smile className="w-5 h-5" /></button>
                  </div>
                  
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(e);
                        }
                      }}
                      placeholder="Type a message..."
                      className="w-full p-4 bg-muted border border-border rounded-2xl text-sm outline-none focus:ring-1 focus:ring-primary transition-all resize-none min-h-[52px] max-h-[200px] scrollbar-hide"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={(!newMessage.trim() && !pendingFile) || processing}
                    className="p-4 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/20 disabled:opacity-50 transition-all active:scale-95 mb-1"
                  >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-24 h-24 bg-muted rounded-3xl flex items-center justify-center mb-8 border border-border">
                <MessageSquare className="w-12 h-12 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-3">Protocol Comms Center</h3>
              <p className="text-xs text-muted-foreground max-w-sm uppercase font-bold tracking-[0.2em] leading-relaxed">
                Select a personnel node or enterprise matrix to initiate secure synchronization.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
