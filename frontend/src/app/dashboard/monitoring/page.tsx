"use client";

import React, { useEffect, useState } from 'react';
import { getMonitoringStatus, MonitoringStatus } from '@/services/monitoringService';
import { LiveStreamViewer } from '@/components/monitoring/LiveStreamViewer';
import { useSocket } from '@/context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Monitor, 
  Clock, 
  MessageSquare, 
  AlertCircle,
  RefreshCw,
  Search,
  LayoutGrid,
  List,
  Loader2,
  Activity,
  X,
  Globe,
  Send,
  ChevronRight
} from 'lucide-react';

export default function MonitoringDashboard() {
  const { socket } = useSocket();
  const [employees, setEmployees] = useState<MonitoringStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedUser, setSelectedUser] = useState<MonitoringStatus | null>(null);
  const [messages, setMessages] = useState<Record<string, string[]>>({});
  const [inputMessage, setInputMessage] = useState("");

  const fetchStatus = async () => {
    try {
      const data = await getMonitoringStatus();
      setEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    if (!socket) return;

    socket.on('monitoring:update', ({ userId, status }: { userId: string, status: string }) => {
      setEmployees(prev => prev.map(emp => 
        emp._id === userId ? { ...emp, isSharing: status === 'sharing' } : emp
      ));
    });

    return () => {
      socket.off('monitoring:update');
    };
  }, [socket]);

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 opacity-30">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-900" />
        <span className="text-[9px] font-bold uppercase tracking-[0.4em]">Establishing Uplink...</span>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-24">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-zinc-100 pb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">Live Monitoring</h1>
          <p className="text-[11px] text-zinc-400 font-medium mt-2 flex items-center gap-2">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Personnel Monitoring Active
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" />
            <input 
              type="text"
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-[11px] font-semibold outline-none focus:bg-white focus:border-zinc-900 transition-all w-full sm:w-72"
            />
          </div>
          <div className="flex bg-zinc-50 p-1 rounded-xl border border-zinc-100">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-950'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-950'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Employees */}
      <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
        {filteredEmployees.map((emp) => (
          <motion.div
            key={emp._id}
            layout
            className="group relative bg-white rounded-[2rem] border border-zinc-100 p-8 hover:border-zinc-300 transition-all duration-300 shadow-sm hover:shadow-xl"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-50 text-zinc-900 border border-zinc-100 rounded-xl flex items-center justify-center font-bold text-lg">
                  {emp.name[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 leading-tight">{emp.name}</h3>
                  <p className="text-[10px] font-medium text-zinc-400 mt-0.5">{emp.role}</p>
                </div>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${emp.isSharing ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-400'}`}>
                {emp.isSharing ? 'Live' : 'Idle'}
              </div>
            </div>

            {emp.isSharing ? (
              <div className="mb-6 cursor-pointer group/stream relative aspect-video" onClick={() => setSelectedUser(emp)}>
                <div className="rounded-2xl overflow-hidden border border-zinc-100 h-full">
                  <LiveStreamViewer userId={emp._id} userName={emp.name} />
                </div>
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/stream:opacity-100 transition-all rounded-2xl flex items-center justify-center">
                   <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-2xl scale-90 group-hover/stream:scale-100 transition-transform">
                      <Maximize2 className="h-5 w-5 text-zinc-900" />
                   </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-300 mb-6 gap-3">
                <Monitor className="w-6 h-6 opacity-40" />
                <p className="text-[9px] font-bold uppercase tracking-widest">No Active Stream</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-zinc-50">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-zinc-300" />
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">{emp.isSharing ? 'Transmitting' : 'Sleeping'}</span>
              </div>
              <button 
                onClick={() => setSelectedUser(emp)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-600 rounded-xl hover:bg-zinc-950 hover:text-white transition-all text-[10px] font-bold uppercase"
              >
                Inspect <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Expanded Monitoring Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-8">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/60 backdrop-blur-2xl"
              onClick={() => setSelectedUser(null)}
            />
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 20 }}
              className="relative bg-white border border-zinc-200 w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl rounded-[2.5rem] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-950 text-white rounded-xl flex items-center justify-center">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 leading-none">{selectedUser.name}</h2>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Live Uplink Active
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-3 bg-zinc-50 text-zinc-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                <div className="flex-[2.5] bg-zinc-50/30 p-8 overflow-y-auto">
                  {selectedUser.isSharing ? (
                    <div className="h-full flex flex-col">
                      <div className="flex-1 rounded-3xl overflow-hidden shadow-2xl bg-black border border-zinc-200">
                        <LiveStreamViewer userId={selectedUser._id} userName={selectedUser.name} />
                      </div>
                      <div className="mt-8 grid grid-cols-3 gap-4">
                        {[
                          { label: 'Uplink Health', val: 'Excellent', icon: Activity },
                          { label: 'Latency', val: '12ms', icon: Zap },
                          { label: 'Signal', val: 'Secure', icon: Globe }
                        ].map((stat, i) => (
                          <div key={i} className="p-5 bg-white border border-zinc-100 rounded-2xl">
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                               <stat.icon className="h-3 w-3" /> {stat.label}
                            </p>
                            <p className="text-sm font-bold text-zinc-900 uppercase">{stat.val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-300 gap-4">
                      <Monitor className="w-16 h-16 opacity-20" />
                      <p className="text-xl font-bold uppercase tracking-widest text-zinc-200 italic">No Feed Available</p>
                    </div>
                  )}
                </div>

                {/* Side Chat */}
                <div className="flex-1 border-l border-zinc-100 flex flex-col bg-white">
                  <div className="p-6 border-b border-zinc-100 flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-zinc-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-900">Command Center</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50/20">
                    {(messages[selectedUser._id] || []).map((msg, i) => (
                      <div key={i} className="p-4 bg-zinc-900 text-white rounded-2xl rounded-tr-none text-[10px] font-medium leading-relaxed">
                        {msg}
                      </div>
                    ))}
                    {(!messages[selectedUser._id] || messages[selectedUser._id].length === 0) && (
                      <div className="h-full flex items-center justify-center opacity-20">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em]">Silence Observed</p>
                      </div>
                    )}
                  </div>

                  <div className="p-6 border-t border-zinc-100 bg-white">
                    <div className="flex gap-2 p-1.5 bg-zinc-50 rounded-2xl border border-zinc-100 focus-within:border-zinc-900 transition-all">
                      <input 
                        type="text"
                        placeholder="Type a message..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 bg-transparent px-4 py-2 text-[10px] font-semibold outline-none text-zinc-900"
                      />
                      <button onClick={handleSendMessage} className="p-3 bg-zinc-950 text-white rounded-xl">
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
