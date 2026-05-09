"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import axios from "axios";
import { 
  Users, Loader2, Shield, Mail, Trash2, X, Check, UserX, Clock, 
  Activity, AlertTriangle, ShieldAlert, MessageSquare, RotateCcw, 
  UserPlus, Eye, Info, Search, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

type Tab = 'active' | 'pending' | 'blocked' | 'trash';

interface Node {
  _id: string;
  name: string;
  email: string;
  role: string;
  jobType?: string;
  phone?: string;
  isDeleted?: boolean;
}

interface AnalysisData {
  tasks: any[];
  reports: any[];
  stats: {
    doneTasks: number;
    totalTasks: number;
    taskRate: string;
    totalReports: number;
    doneReports: number;
    score: number;
  };
}

export default function PersonnelPage() {
  const [tab, setTab] = useState<Tab>('active');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [analysisNode, setAnalysisNode] = useState<Node | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const { user } = useAuth();

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = "auth/contacts";
      if (tab === 'pending') endpoint = "auth/pending";
      else if (tab === 'blocked') endpoint = "auth/blocked";
      else if (tab === 'trash') endpoint = "auth/trash";

      const { data } = await api.get(endpoint);
      const rawList = Array.isArray(data) ? data : (data?.users || []);
      setNodes(rawList);
    } catch (err: any) {
      console.error(`Fetch failure [${tab}]:`, err.message);
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (user && isAdminOrManager) {
      fetchData();
    }
  }, [user, tab, fetchData, isAdminOrManager]);

  const handleAction = async (id: string, action: string) => {
    try {
      if (action === 'approve') await api.put(`auth/${id}/approve`);
      else if (action === 'reject') await api.put(`auth/${id}/reject`);
      else if (action === 'block') await api.put(`auth/${id}/block`);
      else if (action === 'unblock') await api.put(`auth/${id}/unblock`);
      else if (action === 'restore') await api.put(`auth/${id}/restore`);
      else if (action === 'soft-delete') {
        if (!confirm("Confirm Decommission: This node will be moved to inactive storage. Proceed?")) return;
        await api.delete(`auth/${id}`);
      }
      else if (action === 'hard-delete') {
        if (!confirm("Permanent Deletion: All data associated with this node will be purged. Proceed?")) return;
        await api.delete(`auth/${id}/permanent`);
      }
      fetchData();
    } catch (err: any) {
      alert(`Operation Failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleAnalyse = async (node: Node) => {
    setAnalysisNode(node);
    setAnalyzing(true);
    try {
      const [tasksRes, reportsRes] = await Promise.all([
        api.get(`tasks?userId=${node._id}`),
        api.get(`reports?employeeId=${node._id}`)
      ]);
      
      const tasks = tasksRes.data?.tasks || [];
      const reports = reportsRes.data || [];
      
      const doneTasks = tasks.filter((t: any) => t.status === 'completed').length;
      const totalTasks = tasks.length;
      const taskRate = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
      
      const doneReports = reports.filter((r: any) => r.status === 'done').length;
      const totalReports = reports.length;
      
      const score = Math.min(100, Math.round((taskRate * 0.6) + (totalReports * 2)));

      setAnalysisData({
        tasks,
        reports,
        stats: {
          doneTasks,
          totalTasks,
          taskRate: taskRate.toFixed(1),
          totalReports,
          doneReports,
          score
        }
      });
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredNodes = nodes.filter(n => 
    n.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdminOrManager) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <div className="bg-white rounded-3xl p-12 shadow-2xl text-center max-w-lg border border-zinc-100">
          <div className="w-20 h-20 bg-brand-rose/10 text-brand-rose flex items-center justify-center rounded-3xl mx-auto mb-8">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-4 uppercase">Security Alert</h2>
          <p className="text-sm font-bold text-zinc-400 uppercase tracking-[0.2em]">Administrative Credentials Required for Personnel Access</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-24">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-1.5 bg-zinc-950 rounded-full"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Governance Protocol</span>
          </div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-950 uppercase italic"
          >
            Personnel <span className="text-zinc-200 not-italic font-light">Inventory</span>
          </motion.h1>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-100 shadow-sm shadow-emerald-500/5">
              <Activity className="h-3 w-3 fill-emerald-500" /> Matrix Online
            </div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Authorized Authority: <span className="text-zinc-950">{user?.role}</span>
            </p>
          </div>
        </div>

        <div className="relative group w-full lg:w-[500px]">
          <input 
            type="text"
            placeholder="FILTER NODE IDENTITY..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white border border-zinc-100 rounded-[2.5rem] px-10 py-6 text-xs font-bold uppercase tracking-widest w-full focus:outline-none focus:ring-8 focus:ring-black/[0.02] focus:border-zinc-950 transition-all shadow-sm"
          />
          <Search className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-300 group-focus-within:text-zinc-950 transition-colors" />
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-zinc-50/50 p-3 rounded-[3rem] border border-zinc-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'active', label: 'Authorized', icon: ShieldCheck, color: 'emerald' },
            { id: 'pending', label: 'In-Queue', icon: Clock, color: 'amber' },
            { id: 'blocked', label: 'Blacklisted', icon: ShieldAlert, color: 'rose' },
            { id: 'trash', label: 'Purged', icon: Trash2, color: 'zinc' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`flex items-center gap-4 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-[2rem] relative overflow-hidden group ${
                tab === t.id 
                  ? 'bg-zinc-950 text-white shadow-2xl shadow-black/20' 
                  : 'text-zinc-400 hover:text-zinc-950 hover:bg-white'
              }`}
            >
              <t.icon className={`h-4 w-4 transition-transform group-hover:rotate-12 ${tab === t.id ? 'text-white' : 'text-zinc-300'}`} />
              {t.label}
              {tab === t.id && (
                <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-white opacity-20" />
              )}
            </button>
          ))}
        </div>
        <div className="px-8 py-3 bg-white rounded-full border border-zinc-100 shadow-sm">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Node_Count: <span className="text-zinc-950">{nodes.length}</span></span>
        </div>
      </div>

      {/* Grid Display */}
      <div className="min-h-[500px] relative">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-32 text-center"
            >
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-zinc-950 mb-8" />
                <div className="absolute inset-0 blur-2xl bg-zinc-950/5 animate-pulse" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.6em] text-zinc-300 italic">Re-aligning Neural Nodes...</p>
            </motion.div>
          ) : (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10"
            >
              {filteredNodes.length > 0 ? (
                filteredNodes.map((node, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={node._id} 
                    className="group bg-white rounded-[3rem] border border-zinc-100 p-10 shadow-sm hover:shadow-2xl hover:shadow-black/[0.05] hover:-translate-y-2 transition-all duration-500 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
                      <Shield className="w-40 h-40" />
                    </div>

                    <div className="flex items-start justify-between mb-10 relative z-10">
                      <div className="w-20 h-20 bg-zinc-50 border border-zinc-100 text-zinc-950 flex items-center justify-center text-4xl font-black rounded-[2rem] shadow-sm group-hover:bg-zinc-950 group-hover:text-white group-hover:rotate-6 transition-all duration-500">
                        {node.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                          tab === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          tab === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                          {tab}
                        </span>
                        <div className="flex gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${tab === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-200'}`} />
                          <div className={`w-2 h-2 rounded-full ${tab === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-zinc-200'}`} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-10 relative z-10">
                      <h3 className="text-2xl font-black text-zinc-950 tracking-tighter uppercase italic group-hover:text-zinc-950 transition-colors">{node.name}</h3>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        <Mail className="h-3.5 w-3.5" /> {node.email}
                      </div>
                    </div>

                    <div className="flex gap-3 flex-wrap mb-10 relative z-10">
                      <span className="px-5 py-2 bg-zinc-50 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 border border-zinc-100 shadow-sm transition-all group-hover:bg-white group-hover:border-zinc-200">{node.role}</span>
                      <span className="px-5 py-2 bg-zinc-50 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 border border-zinc-100 shadow-sm transition-all group-hover:bg-white group-hover:border-zinc-200">{node.jobType || 'Remote_Node'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative z-10">
                      {tab === 'active' && (
                        <>
                          <button onClick={() => handleAnalyse(node)} className="col-span-2 flex items-center justify-center gap-4 py-6 bg-zinc-950 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/20 overflow-hidden relative group/btn">
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform" />
                            <Activity className="h-5 w-5 animate-pulse relative z-10" /> 
                            <span className="relative z-10">Neural Analysis</span>
                          </button>
                          <Link href={`/dashboard/messages?recipient=${node._id}`} className="flex items-center justify-center gap-3 py-5 bg-white text-zinc-950 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all border border-zinc-100 shadow-sm">
                            <MessageSquare className="h-4 w-4 text-zinc-300" /> Uplink
                          </Link>
                          <button onClick={() => handleAction(node._id, 'soft-delete')} className="flex items-center justify-center gap-3 py-5 bg-white text-rose-600 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all border border-zinc-100 shadow-sm">
                            <Trash2 className="h-4 w-4 text-rose-300" /> Purge
                          </button>
                        </>
                      )}

                      {tab === 'pending' && (
                        <>
                          <button onClick={() => handleAction(node._id, 'approve')} className="flex items-center justify-center gap-3 py-6 bg-zinc-950 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-2xl shadow-black/20">
                            <Check className="h-5 w-5" /> Authorize
                          </button>
                          <button onClick={() => handleAction(node._id, 'reject')} className="flex items-center justify-center gap-3 py-6 bg-white text-rose-600 rounded-[2rem] text-[10px] font-black uppercase tracking-widest border border-zinc-100 hover:bg-rose-50 transition-all shadow-sm">
                            <X className="h-5 w-5" /> Expunge
                          </button>
                        </>
                      )}

                      {tab === 'blocked' && (
                        <button onClick={() => handleAction(node._id, 'unblock')} className="col-span-2 flex items-center justify-center gap-4 py-6 bg-zinc-950 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-2xl shadow-black/20">
                          <ShieldCheck className="h-5 w-5" /> Restore Perimeter
                        </button>
                      )}

                      {tab === 'trash' && (
                        <>
                          <button onClick={() => handleAction(node._id, 'restore')} className="flex items-center justify-center gap-3 py-6 bg-white text-zinc-950 rounded-[2rem] text-[10px] font-black uppercase tracking-widest border border-zinc-100 hover:bg-zinc-50 transition-all shadow-sm">
                            <RotateCcw className="h-5 w-5" /> Re-Active
                          </button>
                          <button onClick={() => handleAction(node._id, 'hard-delete')} className="flex items-center justify-center gap-3 py-6 bg-rose-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/20">
                            <AlertTriangle className="h-5 w-5" /> Total Purge
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-48 text-center bg-zinc-50/50 rounded-[4rem] border-2 border-dashed border-zinc-100 relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-zinc-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                  <div className="w-32 h-32 bg-white text-zinc-100 flex items-center justify-center rounded-[3rem] mb-10 shadow-2xl relative z-10 group-hover:scale-110 transition-transform duration-700">
                    <UserX className="h-16 w-16" />
                  </div>
                  <div className="space-y-4 relative z-10">
                    <h3 className="text-3xl font-black text-zinc-300 uppercase tracking-tighter italic">Sector Empty</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.5em] italic">Scanning perimeter frequency... 0 records detected</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Analysis Modal */}
      <AnimatePresence>
        {analysisNode && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 sm:p-10">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAnalysisNode(null)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-2xl" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative w-full max-w-5xl bg-white rounded-[4rem] border border-white/20 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col xl:flex-row"
            >
              <button onClick={() => setAnalysisNode(null)} className="absolute top-10 right-10 p-4 hover:bg-zinc-100 rounded-[2rem] transition-all text-zinc-400 hover:text-black z-50">
                <X className="h-8 w-8" />
              </button>

              <div className="xl:w-2/5 p-16 bg-zinc-50 border-r border-zinc-100 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute inset-0 pattern-dots opacity-[0.03] pointer-events-none" />
                <div className="w-48 h-48 bg-zinc-950 text-white flex items-center justify-center text-7xl font-black rounded-[3.5rem] mb-12 shadow-2xl relative z-10 group hover:rotate-12 transition-transform duration-700">
                  {analysisNode.name?.[0]?.toUpperCase()}
                </div>
                <div className="space-y-4 relative z-10">
                  <h2 className="text-4xl font-black text-zinc-950 tracking-tighter uppercase italic">{analysisNode.name}</h2>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em]">{analysisNode.role} Node</p>
                    <div className="h-1 w-12 bg-zinc-950 rounded-full" />
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{analysisNode.jobType || 'Remote_Deployment'}</p>
                  </div>
                </div>
                
                <div className="mt-16 w-full space-y-6 relative z-10 pt-16 border-t border-zinc-100">
                  <div className="flex items-center gap-6 p-6 bg-white rounded-3xl border border-zinc-100 shadow-sm group hover:border-zinc-950 transition-all">
                    <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-950 group-hover:text-white transition-all"><Mail className="w-6 h-6" /></div>
                    <span className="text-[11px] font-black text-zinc-600 truncate uppercase tracking-widest">{analysisNode.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-16 bg-white relative overflow-y-auto max-h-[85vh] custom-scrollbar">
                <div className="absolute inset-0 pattern-dots opacity-[0.01] pointer-events-none" />
                {analyzing ? (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 className="h-20 w-20 animate-spin text-zinc-950 mb-10" />
                    <p className="text-[12px] font-black uppercase tracking-[0.5em] text-zinc-300 italic">Intercepting Node History Feed...</p>
                  </div>
                ) : analysisData ? (
                  <div className="space-y-16 relative z-10">
                    <div className="bg-zinc-950 rounded-[3rem] p-12 text-white flex flex-col sm:flex-row items-center justify-between gap-10 shadow-2xl shadow-black/30 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-6 text-zinc-500">Node Performance Index</p>
                        <div className="flex items-baseline gap-4">
                          <h4 className="text-9xl font-black italic tracking-tighter">{analysisData.stats.score}</h4>
                          <span className="text-2xl font-black text-zinc-700 italic">/100</span>
                        </div>
                      </div>
                      <div className="w-32 h-32 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                        <Activity className="h-16 w-16 text-emerald-500 animate-pulse" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="p-10 bg-zinc-50 rounded-[2.5rem] border border-zinc-100 shadow-sm group hover:bg-white hover:shadow-xl transition-all duration-500">
                        <p className="text-[10px] font-black uppercase text-zinc-400 mb-6 tracking-[0.4em]">Operational Efficiency</p>
                        <div className="flex items-baseline gap-4">
                          <span className="text-5xl font-black text-zinc-950 italic">{analysisData.stats.taskRate}%</span>
                          <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">({analysisData.stats.doneTasks}/{analysisData.stats.totalTasks} Pkts)</span>
                        </div>
                      </div>
                      <div className="p-10 bg-zinc-50 rounded-[2.5rem] border border-zinc-100 shadow-sm group hover:bg-white hover:shadow-xl transition-all duration-500">
                        <p className="text-[10px] font-black uppercase text-zinc-400 mb-6 tracking-[0.4em]">Intelligence Output</p>
                        <div className="flex items-baseline gap-4">
                          <span className="text-5xl font-black text-zinc-950 italic">{analysisData.stats.totalReports}</span>
                          <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Broadcasts</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-10">
                      <div className="flex items-center gap-6">
                        <h5 className="text-[12px] font-black uppercase tracking-[0.5em] text-zinc-950 italic flex items-center gap-4">
                          <Clock className="h-6 w-6 text-zinc-300" /> Recent Log Stream
                        </h5>
                        <div className="h-[1px] flex-1 bg-zinc-100" />
                      </div>
                      <div className="space-y-4">
                        {analysisData.reports.slice(0, 5).map((r: { _id: string; title?: string; status: string; date: string }) => (
                          <div key={r._id} className="p-8 bg-white border border-zinc-100 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-6 group/item hover:border-zinc-950 transition-all shadow-sm">
                            <div className="flex items-center gap-6">
                              <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-300 group-hover/item:bg-zinc-950 group-hover/item:text-white transition-all"><FileText className="h-6 w-6" /></div>
                              <div>
                                <p className="text-sm font-black text-zinc-950 uppercase italic tracking-tight">{r.title || 'Standard Operation'}</p>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{new Date(r.date).toLocaleDateString()} // SYNC_OK</p>
                              </div>
                            </div>
                            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                              r.status === 'done' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                              {r.status}
                            </span>
                          </div>
                        ))}
                        {analysisData.reports.length === 0 && (
                          <div className="py-20 text-center bg-zinc-50/50 rounded-[3rem] border border-zinc-100 border-dashed">
                            <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.5em] italic">No active data packets in stream</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-32 text-center">
                    <AlertTriangle className="h-24 w-24 text-rose-100 mx-auto mb-10" />
                    <p className="text-[12px] font-black uppercase tracking-[0.6em] text-zinc-300 italic">Neural Uplink Interrupted: Data Fragment Missing</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
