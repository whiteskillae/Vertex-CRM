"use client";

import React, { useEffect, useState } from 'react';
import { getMonitoringStatus, MonitoringStatus } from '@/services/monitoringService';
import { LiveStreamViewer } from '@/components/monitoring/LiveStreamViewer';
import { useSocket } from '@/context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Monitor, 
  Clock, 
  MessageSquare, 
  Search,
  LayoutGrid,
  List,
  Loader2,
  Activity,
  X,
  Globe,
  Send,
  Maximize2,
  Zap
} from 'lucide-react';

const LiveTimer = ({ startTime }: { startTime: string | Date }) => {
  const [duration, setDuration] = useState("");

  useEffect(() => {
    const update = () => {
      const start = new Date(startTime).getTime();
      const diff = Math.floor((Date.now() - start) / 1000);
      if (diff < 0) return setDuration("0m 0s");
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setDuration(`${h > 0 ? h + 'h ' : ''}${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span className="tabular-nums">{duration}</span>;
};

export default function MonitoringDashboard() {
  const router = useRouter();
  const { socket } = useSocket();
  const [monitors, setMonitors] = useState<MonitoringStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedUser, setSelectedUser] = useState<MonitoringStatus | null>(null);
  const [messages, setMessages] = useState<Record<string, string[]>>({});
  const [inputMessage, setInputMessage] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await getMonitoringStatus();
      setMonitors(data);
    } catch (err) {
      console.error("Failed to fetch monitoring status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = ({ userId, status }: { userId: string, status: string }) => {
      setMonitors(prev => prev.map(m => 
        m._id === userId ? { ...m, isSharing: status === 'sharing' } : m
      ));
    };

    socket.on('monitoring:update', handleUpdate);
    return () => {
      socket.off('monitoring:update', handleUpdate);
    };
  }, [socket]);

  const filteredMonitors = monitors.filter(m => 
    (m.userName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (m.userEmail?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!selectedUser || !inputMessage.trim()) return;
    socket?.emit('admin:message', { to: selectedUser._id, message: inputMessage });
    setMessages(prev => ({
      ...prev,
      [selectedUser._id]: [...(prev[selectedUser._id] || []), `You: ${inputMessage}`]
    }));
    setInputMessage("");
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Syncing Monitoring Grid...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Live Oversight</h1>
          <p className="text-muted-foreground text-sm max-w-md">Real-time personnel monitoring and secure screen transmission oversight.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Filter by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary transition-all w-64"
            />
          </div>
          <div className="flex bg-muted p-1 rounded-xl border border-border">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Monitoring Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredMonitors.map((monitor) => (
          <motion.div
            key={monitor._id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card bg-card overflow-hidden group"
          >
            {/* User Info Bar */}
            <div className="p-5 flex items-center justify-between border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                  {monitor.userName?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-semibold truncate max-w-[120px]">{monitor.userName}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${monitor.isSharing ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                      {monitor.isSharing ? 'Transmitting' : 'Signal Lost'}
                    </span>
                  </div>
                </div>
              </div>
              {monitor.isSharing && (
                <div className="px-3 py-1 bg-background border border-border rounded-full text-[10px] font-bold tabular-nums">
                  <LiveTimer startTime={monitor.lastActive || Date.now()} />
                </div>
              )}
            </div>

            {/* Video Preview */}
            <div className="aspect-video bg-muted relative group-hover:cursor-pointer" onClick={() => monitor.isSharing && setSelectedUser(monitor)}>
              {monitor.isSharing ? (
                <>
                  <LiveStreamViewer userId={monitor._id} userName={monitor.userName} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                      <div className="bg-background/90 backdrop-blur-md p-3 rounded-2xl shadow-2xl">
                        <Maximize2 className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
                  <Monitor className="w-8 h-8 mb-2" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em]">No Active Feed</span>
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="p-4 flex items-center justify-between border-t border-border">
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold uppercase tracking-tight">Node Status</span>
                  <span className="text-[10px] font-medium">{monitor.isSharing ? 'Verified' : 'Standby'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => router.push(`/dashboard/messages?recipient=${monitor._id}`)}
                  className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button 
                  disabled={!monitor.isSharing}
                  onClick={() => setSelectedUser(monitor)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${monitor.isSharing ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
                >
                  Oversight
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Expanded Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-xl"
              onClick={() => setSelectedUser(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-7xl h-full bg-card border border-border shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col"
            >
              <div className="h-20 px-8 flex items-center justify-between border-b border-border bg-card">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold leading-none">{selectedUser.userName}</h2>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1.5 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Secure Uplink Established
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-3 hover:bg-muted rounded-2xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                <div className="flex-[3] p-8 lg:p-12 bg-muted/10 overflow-y-auto">
                  <div className="aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl border border-border relative">
                    <LiveStreamViewer userId={selectedUser._id} userName={selectedUser.userName} />
                  </div>
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                      { label: 'Uplink Delay', val: '12ms', icon: Zap },
                      { label: 'Connection', val: 'Secure P2P', icon: Globe },
                      { label: 'Oversight', val: 'Active', icon: Monitor },
                    ].map((s, i) => (
                      <div key={i} className="p-6 bg-card border border-border rounded-[1.5rem]">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                          <s.icon className="w-3 h-3" /> {s.label}
                        </p>
                        <p className="text-sm font-semibold">{s.val}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1 border-l border-border bg-card flex flex-col">
                  <div className="p-6 border-b border-border flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Protocol Chat</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {(messages[selectedUser._id] || []).map((msg, i) => (
                      <div key={i} className={`p-4 rounded-2xl text-xs leading-relaxed ${msg.startsWith('You:') ? 'bg-primary text-primary-foreground ml-8 rounded-tr-none' : 'bg-muted mr-8 rounded-tl-none'}`}>
                        {msg}
                      </div>
                    ))}
                    {(!messages[selectedUser._id]?.length) && (
                      <div className="h-full flex items-center justify-center opacity-20">
                        <p className="text-[9px] font-bold uppercase tracking-widest">No Transmissions</p>
                      </div>
                    )}
                  </div>
                  <div className="p-6 border-t border-border">
                    <div className="flex gap-2 p-2 bg-muted rounded-2xl border border-border focus-within:ring-1 focus-ring-primary transition-all">
                      <input 
                        type="text"
                        placeholder="Send command..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 bg-transparent px-3 py-1.5 text-xs outline-none"
                      />
                      <button onClick={handleSendMessage} className="p-2.5 bg-primary text-primary-foreground rounded-xl">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
