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
  List
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
      // Handle activity updates if needed (e.g., small badge update)
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <RefreshCw className="w-10 h-10 animate-spin text-black" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-8 border-black pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Monitor className="w-8 h-8" />
            <h1 className="text-4xl font-black uppercase tracking-tighter italic">Intelligence Hub</h1>
          </div>
          <p className="text-xs font-black text-zinc-500 uppercase tracking-[0.4em]">Real-Time Personnel Monitoring</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text"
              placeholder="SEARCH NODE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 border-4 border-black text-xs font-black uppercase outline-none focus:bg-zinc-50 transition-colors w-64"
            />
          </div>
          <div className="flex border-4 border-black">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-black text-white' : 'hover:bg-zinc-100'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 border-l-4 border-black ${viewMode === 'list' ? 'bg-black text-white' : 'hover:bg-zinc-100'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Employees */}
      <div className={`grid gap-8 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {filteredEmployees.map((emp) => (
          <motion.div
            key={emp._id}
            layout
            className="group relative bg-white border-4 border-black p-6 hover:shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-black text-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                  {emp.name[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">{emp.name}</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{emp.email}</p>
                </div>
              </div>
              <div className={`px-2 py-1 border-2 border-black text-[8px] font-black uppercase ${emp.isSharing ? 'bg-green-500 text-white animate-pulse' : 'bg-zinc-100 text-zinc-400'}`}>
                {emp.isSharing ? 'SHARING' : 'IDLE'}
              </div>
            </div>

            {emp.isSharing ? (
              <div className="mb-6 cursor-pointer" onClick={() => setSelectedUser(emp)}>
                <LiveStreamViewer userId={emp._id} userName={emp.name} />
              </div>
            ) : (
              <div className="aspect-video bg-zinc-50 border-4 border-black border-dashed flex flex-col items-center justify-center text-zinc-300 mb-6">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">No Active Stream</p>
              </div>
            )}

            <div className="flex items-center justify-between border-t-4 border-black pt-4">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-zinc-400" />
                <span className="text-[9px] font-black uppercase text-zinc-500">Last Seen: Just Now</span>
              </div>
              <button 
                onClick={() => setSelectedUser(emp)}
                className="p-2 border-2 border-black hover:bg-black hover:text-white transition-all"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Expanded Monitoring & Chat Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => setSelectedUser(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white border-8 border-black w-full max-w-6xl h-[85vh] flex flex-col shadow-[40px_40px_0px_0px_rgba(0,0,0,0.3)]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b-8 border-black flex items-center justify-between bg-black text-white">
                <div className="flex items-center gap-4">
                  <Monitor className="w-6 h-6" />
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter italic leading-none">{selectedUser.name}</h2>
                    <p className="text-[9px] text-zinc-400 uppercase tracking-[0.3em] font-bold mt-1">Direct Monitoring Link</p>
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-2 border-2 border-white hover:bg-white hover:text-black transition-all">
                  <AlertCircle className="w-5 h-5 rotate-45" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 flex overflow-hidden">
                {/* Main View */}
                <div className="flex-[2] bg-zinc-50 p-8 overflow-y-auto">
                  {selectedUser.isSharing ? (
                    <div className="h-full flex flex-col">
                      <div className="flex-1">
                        <LiveStreamViewer userId={selectedUser._id} userName={selectedUser.name} />
                      </div>
                      <div className="mt-8 grid grid-cols-3 gap-4">
                        <div className="p-4 bg-white border-4 border-black">
                          <p className="text-[9px] font-black text-zinc-400 uppercase mb-1">Active Time</p>
                          <p className="text-lg font-black uppercase">04:22:15</p>
                        </div>
                        <div className="p-4 bg-white border-4 border-black">
                          <p className="text-[9px] font-black text-zinc-400 uppercase mb-1">Idle Time</p>
                          <p className="text-lg font-black uppercase">00:12:05</p>
                        </div>
                        <div className="p-4 bg-white border-4 border-black">
                          <p className="text-[9px] font-black text-zinc-400 uppercase mb-1">Efficiency</p>
                          <p className="text-lg font-black uppercase text-green-600">92%</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                      <Monitor className="w-20 h-20 mb-4 opacity-10" />
                      <p className="text-2xl font-black uppercase tracking-widest italic">Signal Offline</p>
                    </div>
                  )}
                </div>

                {/* Side Chat */}
                <div className="flex-1 border-l-8 border-black flex flex-col bg-white">
                  <div className="p-4 border-b-4 border-black bg-zinc-50 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Admin Comms</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {(messages[selectedUser._id] || []).map((msg, i) => (
                      <div key={i} className="p-3 bg-black text-white border-2 border-black text-[10px] font-bold uppercase tracking-tight">
                        {msg}
                      </div>
                    ))}
                    {messages[selectedUser._id]?.length === 0 && (
                      <p className="text-[9px] font-bold text-zinc-400 uppercase text-center mt-10">No messages sent in this session.</p>
                    )}
                  </div>

                  <div className="p-4 border-t-8 border-black bg-zinc-50">
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="SEND COMMAND..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 p-3 border-4 border-black text-[10px] font-black uppercase outline-none focus:bg-white"
                      />
                      <button 
                        onClick={handleSendMessage}
                        className="px-4 bg-black text-white border-4 border-black hover:bg-white hover:text-black transition-all"
                      >
                        <RefreshCw className="w-4 h-4 rotate-90" />
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
