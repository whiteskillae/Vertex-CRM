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
      // Backend returns either an array directly or an object with a users array
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
        if (!confirm("DECOMMISSION NODE: This will restrict access and move the node to the decommissioned sector. Proceed?")) return;
        await api.delete(`auth/${id}`);
      }
      else if (action === 'hard-delete') {
        if (!confirm("PERMANENT DATA PURGE: This action is irreversible. Proceed?")) return;
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
      
      // Tactical Score: (Task completion % * 0.6) + (Report volume factor * 0.4)
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
      <div className="h-[60vh] flex items-center justify-center">
        <div className="bg-white border-8 border-black p-12 shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] text-center">
          <ShieldAlert className="h-16 w-16 text-red-600 mx-auto mb-6" />
          <h2 className="text-4xl font-black uppercase italic mb-4 text-black">Access Prohibited</h2>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.3em]">Administrative Credentials Required for Personnel Sector Access</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20 max-w-[1400px] mx-auto">
      {/* Sector Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-2 bg-black"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 italic">Central Intelligence</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter uppercase italic leading-none text-black">
            Personnel <span className="text-gray-300">Sector</span>
          </h1>
          <p className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] mt-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-600" /> Active Governance Protocol: v2.0.4
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-black transition-colors" />
            <input 
              type="text"
              placeholder="LOCATE NODE BY IDENTITY..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border-8 border-black px-12 py-5 text-sm font-black uppercase w-full md:w-[400px] focus:outline-none focus:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all placeholder:text-gray-200"
            />
          </div>
        </div>
      </div>

      {/* Operations Navigation */}
      <div className="flex bg-black p-2 shadow-[15px_15px_0px_0px_rgba(0,0,0,0.1)] overflow-x-auto no-scrollbar">
        {[
          { id: 'active', label: 'Authorized Nodes', icon: Users },
          { id: 'pending', label: 'Pending Access', icon: Clock },
          { id: 'blocked', label: 'Restricted Nodes', icon: UserX },
          { id: 'trash', label: 'Decommissioned', icon: Trash2 },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`flex items-center gap-3 px-8 py-4 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              tab === t.id 
                ? 'bg-white text-black shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]' 
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Main Terminal Display */}
      <div className="min-h-[500px] relative">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10"
            >
              <Loader2 className="h-16 w-16 animate-spin text-black mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse text-black">Synchronizing Intelligence Feed...</p>
            </motion.div>
          ) : (
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {filteredNodes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredNodes.map((node) => (
                    <div 
                      key={node._id} 
                      className="group bg-white border-8 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all hover:translate-x-2 hover:translate-y-2 relative overflow-hidden"
                    >
                      {/* Node Indicator */}
                      <div className={`absolute top-0 right-0 w-24 h-2 ${
                        tab === 'active' ? 'bg-green-500' :
                        tab === 'pending' ? 'bg-yellow-500' :
                        tab === 'blocked' ? 'bg-orange-500' : 'bg-red-600'
                      }`} />

                      <div className="flex items-start justify-between mb-8">
                        <div className="w-16 h-16 bg-black text-white flex items-center justify-center text-3xl font-black italic border-4 border-black">
                          {node.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] font-black uppercase text-gray-400 block mb-1 tracking-widest">ID Hash</span>
                          <span className="text-[10px] font-mono text-black font-bold uppercase">{node._id?.slice(-8)}</span>
                        </div>
                      </div>

                      <div className="space-y-4 mb-10">
                        <div>
                          <h3 className="text-xl font-black uppercase italic leading-none mb-1">{node.name}</h3>
                          <p className="text-[10px] font-bold text-gray-500 flex items-center gap-2"><Mail className="h-3 w-3" /> {node.email}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <span className="px-3 py-1 bg-zinc-100 border-2 border-black text-[9px] font-black uppercase tracking-widest">{node.role}</span>
                          <span className="px-3 py-1 bg-zinc-100 border-2 border-black text-[9px] font-black uppercase tracking-widest">{node.jobType || 'Office'}</span>
                        </div>
                      </div>

                      {/* Action Interface */}
                      <div className="grid grid-cols-2 gap-3 border-t-8 border-black pt-6">
                        {tab === 'active' && (
                          <>
                            <button onClick={() => handleAnalyse(node)} className="col-span-2 flex items-center justify-center gap-2 py-3 border-4 border-black bg-black text-white font-black text-[9px] uppercase hover:bg-white hover:text-black transition-all">
                              <Activity className="h-4 w-4" /> Analyse Intelligence
                            </button>
                            <Link href={`/dashboard/messages?recipient=${node._id}`} className="flex items-center justify-center gap-2 py-3 border-4 border-black font-black text-[9px] uppercase hover:bg-zinc-100 transition-all">
                              <MessageSquare className="h-4 w-4" /> Message
                            </Link>
                            <button onClick={() => handleAction(node._id, 'soft-delete')} className="flex items-center justify-center gap-2 py-3 border-4 border-black font-black text-[9px] uppercase hover:bg-red-600 hover:text-white transition-all">
                              <Trash2 className="h-4 w-4" /> Decommission
                            </button>
                          </>
                        )}

                        {tab === 'pending' && (
                          <>
                            <button onClick={() => handleAction(node._id, 'approve')} className="flex items-center justify-center gap-2 py-3 border-4 border-black bg-black text-white font-black text-[9px] uppercase hover:bg-white hover:text-black transition-all">
                              <Check className="h-4 w-4" /> Approve
                            </button>
                            <button onClick={() => handleAction(node._id, 'reject')} className="flex items-center justify-center gap-2 py-3 border-4 border-black font-black text-[9px] uppercase hover:bg-red-600 hover:text-white transition-all">
                              <X className="h-4 w-4" /> Reject
                            </button>
                          </>
                        )}

                        {tab === 'blocked' && (
                          <>
                            <button onClick={() => handleAction(node._id, 'unblock')} className="col-span-2 flex items-center justify-center gap-2 py-3 border-4 border-black font-black text-[9px] uppercase hover:bg-green-600 hover:text-white transition-all">
                              <ShieldCheck className="h-4 w-4" /> Reinstate Authorization
                            </button>
                          </>
                        )}

                        {tab === 'trash' && (
                          <>
                            <button onClick={() => handleAction(node._id, 'restore')} className="flex items-center justify-center gap-2 py-3 border-4 border-black font-black text-[9px] uppercase hover:bg-green-600 hover:text-white transition-all">
                              <RotateCcw className="h-4 w-4" /> Restore
                            </button>
                            <button onClick={() => handleAction(node._id, 'hard-delete')} className="flex items-center justify-center gap-2 py-3 border-4 border-black font-black text-[9px] uppercase hover:bg-red-600 hover:text-white transition-all text-red-600">
                              <AlertTriangle className="h-4 w-4" /> Purge
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-32 border-8 border-dashed border-gray-200">
                  <div className="p-8 bg-gray-50 border-4 border-black mb-6">
                    <UserX className="h-16 w-16 text-gray-300" />
                  </div>
                  <h3 className="text-2xl font-black uppercase italic text-gray-300 mb-2">No Node Activity Detected</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Database Query returned 0 results for sector: {tab}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Node Analysis Modal */}
      <AnimatePresence>
        {analysisNode && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAnalysisNode(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-white border-8 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] sm:shadow-[30px_30px_0px_0px_rgba(0,0,0,1)] p-6 sm:p-12 overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <button onClick={() => setAnalysisNode(null)} className="absolute top-6 right-6 p-2 hover:bg-zinc-100 border-4 border-black transition-all">
                <X className="h-6 w-6" />
              </button>

              <div className="flex flex-col md:flex-row gap-12">
                {/* Profile Header */}
                <div className="md:w-1/3">
                  <div className="w-32 h-32 bg-black text-white flex items-center justify-center text-5xl font-black italic border-8 border-black mb-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)]">
                    {analysisNode.name?.[0]?.toUpperCase()}
                  </div>
                  <h2 className="text-3xl font-black uppercase italic leading-none mb-2">{analysisNode.name}</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">{analysisNode.role} — {analysisNode.jobType || 'Standard'}</p>
                  
                  <div className="space-y-4 border-t-8 border-black pt-6">
                    <div>
                      <span className="text-[8px] font-black uppercase text-gray-400 block mb-1">Electronic Mail</span>
                      <span className="text-xs font-bold uppercase">{analysisNode.email}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black uppercase text-gray-400 block mb-1">Phone Frequency</span>
                      <span className="text-xs font-bold uppercase">{analysisNode.phone || 'NOT REGISTERED'}</span>
                    </div>
                  </div>
                </div>

                {/* Analysis Metrics */}
                <div className="flex-1">
                  {analyzing ? (
                    <div className="h-full flex flex-col items-center justify-center p-20">
                      <Loader2 className="h-12 w-12 animate-spin text-black mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Scanning Mission History...</p>
                    </div>
                  ) : analysisData ? (
                    <div className="space-y-8">
                      {/* Score Card */}
                      <div className="bg-black text-white p-8 flex items-center justify-between border-4 border-black">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-2 text-zinc-500">Tactical Performance Score</p>
                          <h4 className="text-6xl font-black italic">{analysisData.stats.score}<span className="text-xl text-zinc-600">/100</span></h4>
                        </div>
                        <div className="w-20 h-20 border-4 border-white flex items-center justify-center rotate-12">
                          <ShieldCheck className="h-10 w-10" />
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 border-4 border-black">
                          <p className="text-[8px] font-black uppercase text-gray-400 mb-2">Task Efficiency</p>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-black">{analysisData.stats.taskRate}%</span>
                            <span className="text-[10px] font-bold text-gray-400 mb-1">({analysisData.stats.doneTasks}/{analysisData.stats.totalTasks})</span>
                          </div>
                        </div>
                        <div className="p-6 border-4 border-black">
                          <p className="text-[8px] font-black uppercase text-gray-400 mb-2">Intelligence Reports</p>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-black">{analysisData.stats.totalReports}</span>
                            <span className="text-[10px] font-bold text-gray-400 mb-1">SUBMITTED</span>
                          </div>
                        </div>
                      </div>

                      {/* Recent Activity */}
                      <div className="space-y-4 pt-4 border-t-4 border-black">
                        <h5 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                          <Activity className="h-4 w-4" /> Recent Mission Logs
                        </h5>
                        <div className="space-y-2">
                          {analysisData.reports.slice(0, 5).map((r: { _id: string; missionType?: string; status: string }) => (
                            <div key={r._id} className="p-4 border-2 border-black flex justify-between items-center text-[10px] font-bold uppercase italic">
                              <span>Mission: {r.missionType || 'INTEL'}</span>
                              <span className={r.status === 'done' ? 'text-green-600' : 'text-orange-500'}>{r.status}</span>
                            </div>
                          ))}
                          {analysisData.reports.length === 0 && <p className="text-[10px] italic text-gray-400">No mission logs found on current frequency.</p>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-20 text-center text-gray-300">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                      <p className="text-xs font-black uppercase">Analysis Failed to Initialize</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
