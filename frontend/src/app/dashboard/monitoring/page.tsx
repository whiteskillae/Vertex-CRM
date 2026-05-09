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
  Activity
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

    socket.on('monitoring:activity', ({ userId, status }: { userId: string, status: string }) => {
      // Handle activity updates if needed
    });

    return () => {
      socket.off('monitoring:update');
      socket.off('monitoring:activity');
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 opacity-40">
        <Loader2 className="w-16 h-16 animate-spin text-zinc-900" />
        <span className="text-[10px] font-black uppercase tracking-[0.8em]">Synchronizing Intelligence Nodes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-24">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 border-b border-zinc-100 pb-12">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3.5 bg-zinc-950 text-white rounded-2xl shadow-xl shadow-black/10">
              <Monitor className="w-7 h-7" />
            </div>
            <div className="h-0.5 w-12 bg-zinc-900 rounded-full" />
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tight text-zinc-900 leading-none">Intelligence Hub</h1>
          <p className="text-[10px] uppercase tracking-[0.5em] font-black text-zinc-400 mt-4 italic flex items-center gap-3">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Personnel Network Active
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" />
            <input 
              type="text"
              placeholder="SEARCH NODE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-14 pr-8 py-5 bg-white border border-zinc-100 rounded-[2rem] text-[10px] font-black uppercase tracking-widest outline-none focus:border-zinc-950 transition-all w-full sm:w-80 shadow-sm"
            />
          </div>
          <div className="flex bg-white p-1.5 rounded-[1.8rem] border border-zinc-100 shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-4 rounded-2xl transition-all ${viewMode === 'grid' ? 'bg-zinc-950 text-white shadow-xl' : 'text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-4 rounded-2xl transition-all ${viewMode === 'list' ? 'bg-zinc-950 text-white shadow-xl' : 'text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Employees */}
      <div className={`grid gap-10 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
        {filteredEmployees.map((emp) => (
          <motion.div
            key={emp._id}
            layout
            className="group relative bg-white rounded-[3.5rem] border border-zinc-100 p-10 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
               <div className="p-3 bg-zinc-50 rounded-2xl">
                  <Activity className="h-5 w-5 text-zinc-300" />
               </div>
            </div>

            <div className="flex items-start justify-between mb-10">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-zinc-950 text-white rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-xl shadow-black/10 group-hover:rotate-6 transition-transform duration-500">
                  {emp.name[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 leading-none">{emp.name}</h3>
                  <div className="flex flex-col gap-1 mt-2">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em]">{emp.email}</p>
                    <span className="text-[8px] text-indigo-600 font-black uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded w-fit">{emp.role}</span>
                  </div>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-sm ${emp.isSharing ? 'bg-emerald-500 text-white border-emerald-400 animate-pulse' : 'bg-zinc-50 text-zinc-400 border-zinc-100'}`}>
                {emp.isSharing ? 'LIVE_STREAMING' : 'SIGNAL_IDLE'}
              </div>
            </div>

            {emp.isSharing ? (
              <div className="mb-10 cursor-pointer group/stream relative" onClick={() => setSelectedUser(emp)}>
                <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white">
                  <LiveStreamViewer userId={emp._id} userName={emp.name} />
                </div>
                <div className="absolute inset-0 bg-zinc-950/40 rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover/stream:opacity-100 transition-all backdrop-blur-[2px]">
                   <div className="p-5 bg-white text-zinc-950 rounded-3xl shadow-2xl scale-75 group-hover/stream:scale-100 transition-transform duration-500">
                      <LayoutGrid className="h-8 w-8" />
                   </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-[#fafafa] rounded-[2.5rem] border border-zinc-100 border-dashed flex flex-col items-center justify-center text-zinc-300 mb-10 space-y-4">
                <div className="p-4 bg-white rounded-3xl shadow-sm">
                   <AlertCircle className="w-6 h-6 text-zinc-200" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em]">No Active Transmission</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-8 border-t border-zinc-50">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-zinc-300" />
                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Latency: 14ms <span className="text-emerald-500 mx-2">●</span> Optimized</span>
              </div>
              <button 
                onClick={() => setSelectedUser(emp)}
                className="p-5 bg-zinc-50 text-zinc-900 rounded-[1.8rem] hover:bg-zinc-950 hover:text-white transition-all shadow-sm hover:scale-110 active:scale-95 group/btn"
              >
                <MessageSquare className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Expanded Monitoring & Chat Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/40 backdrop-blur-3xl"
              onClick={() => setSelectedUser(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 40 }}
              className="relative bg-white border border-zinc-100 w-full max-w-7xl h-[90vh] flex flex-col shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rounded-[4rem] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-10 border-b border-zinc-50 flex items-center justify-between bg-white z-20">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-zinc-950 text-white rounded-[1.8rem] flex items-center justify-center shadow-2xl shadow-black/20">
                    <Monitor className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight text-zinc-900 leading-none">{selectedUser.name}</h2>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-[0.4em] font-black mt-3 italic flex items-center gap-3">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Direct Intelligence Uplink Established
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-5 bg-zinc-50 text-zinc-400 rounded-3xl hover:bg-rose-500 hover:text-white transition-all shadow-sm group">
                  <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Main View */}
                <div className="flex-[2] bg-[#fdfdfd] p-10 overflow-y-auto">
                  {selectedUser.isSharing ? (
                    <div className="h-full flex flex-col">
                      <div className="flex-1 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white bg-black ring-1 ring-zinc-100">
                        <LiveStreamViewer userId={selectedUser._id} userName={selectedUser.name} />
                      </div>
                      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {[
                          { label: 'Active Sessions', val: '04:22:15', icon: Clock },
                          { label: 'Node Status', val: 'Optimized', icon: Zap },
                          { label: 'Network Integrity', val: '98.4%', icon: Globe }
                        ].map((stat, i) => (
                          <div key={i} className="p-8 bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                               <stat.icon className="h-3 w-3" /> {stat.label}
                            </p>
                            <p className="text-2xl font-black uppercase tracking-tight text-zinc-900">{stat.val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-200 gap-8">
                      <div className="p-16 bg-zinc-50 rounded-[5rem] border border-zinc-100 border-dashed">
                        <Monitor className="w-24 h-24 opacity-20" />
                      </div>
                      <p className="text-3xl font-black uppercase tracking-[0.3em] italic text-zinc-300">Uplink Offline</p>
                    </div>
                  )}
                </div>

                {/* Side Chat */}
                <div className="flex-1 border-l border-zinc-50 flex flex-col bg-white">
                  <div className="p-8 border-b border-zinc-50 bg-[#fafafa]/50 flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                       <MessageSquare className="w-5 h-5 text-zinc-950" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900">Admin Command Center</span>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Direct Node Messaging</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-[#fdfdfd]">
                    {(messages[selectedUser._id] || []).map((msg, i) => (
                      <div key={i} className="p-6 bg-zinc-950 text-white rounded-[1.8rem] rounded-tr-none text-[11px] font-semibold tracking-tight shadow-xl shadow-black/10">
                        {msg}
                        <div className="mt-3 text-[8px] font-black text-zinc-500 uppercase tracking-widest">TRANSMITTED :: SUCCESS</div>
                      </div>
                    ))}
                    {(!messages[selectedUser._id] || messages[selectedUser._id].length === 0) && (
                      <div className="flex flex-col items-center justify-center h-full opacity-20 gap-4">
                         <div className="p-6 border-4 border-dashed border-zinc-200 rounded-[3rem]">
                            <MessageSquare className="h-10 w-10 text-zinc-300" />
                         </div>
                         <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400">No active comms</p>
                      </div>
                    )}
                  </div>

                  <div className="p-8 border-t border-zinc-50 bg-white">
                    <div className="flex gap-4 p-2 bg-zinc-50 rounded-[2.5rem] border border-zinc-100 shadow-inner group-focus-within:border-zinc-950 transition-all">
                      <input 
                        type="text"
                        placeholder="ENTER COMMAND..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 bg-transparent px-6 py-4 text-[11px] font-black uppercase tracking-widest outline-none text-zinc-900 placeholder:text-zinc-300"
                      />
                      <button 
                        onClick={handleSendMessage}
                        className="p-5 bg-zinc-950 text-white rounded-[1.8rem] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/20"
                      >
                        <Send className="w-5 h-5" />
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
