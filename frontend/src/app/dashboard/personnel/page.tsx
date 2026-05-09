"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { 
  Users, Loader2, Shield, Mail, Trash2, X, Check, UserX, Clock, 
  Activity, AlertTriangle, ShieldAlert, MessageSquare, RotateCcw, 
  Eye, Search, ShieldCheck, FileText
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
  const [mounted, setMounted] = useState(false);

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = "auth/contacts";
      if (tab === 'pending') endpoint = "auth/pending";
      else if (tab === 'blocked') endpoint = "auth/blocked";
      else if (tab === 'trash') endpoint = "auth/trash";

      const { data } = await api.get(endpoint);
      setNodes(Array.isArray(data) ? data : (data?.users || []));
    } catch (err) {
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (mounted && user && isAdminOrManager) fetchData();
  }, [mounted, user, tab, fetchData, isAdminOrManager]);

  const handleAction = async (id: string, action: string) => {
    try {
      if (action === 'approve') await api.put(`auth/${id}/approve`);
      else if (action === 'reject') await api.put(`auth/${id}/reject`);
      else if (action === 'block') await api.put(`auth/${id}/block`);
      else if (action === 'unblock') await api.put(`auth/${id}/unblock`);
      else if (action === 'restore') await api.put(`auth/${id}/restore`);
      else if (action === 'soft-delete') {
        if (!confirm("Confirm Decommission: Move this node to inactive storage?")) return;
        await api.delete(`auth/${id}`);
      }
      else if (action === 'hard-delete') {
        if (!confirm("Permanent Purge: Delete all node data forever?")) return;
        await api.delete(`auth/${id}/permanent`);
      }
      fetchData();
    } catch (err: any) {
      alert(`Failure: ${err.response?.data?.message || err.message}`);
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
      const taskRate = tasks.length > 0 ? (doneTasks / tasks.length) * 100 : 0;
      const score = Math.min(100, Math.round((taskRate * 0.6) + (reports.length * 2)));

      setAnalysisData({
        tasks, reports,
        stats: {
          doneTasks, totalTasks: tasks.length,
          taskRate: taskRate.toFixed(1),
          totalReports: reports.length,
          doneReports: reports.filter((r: any) => r.status === 'done').length,
          score
        }
      });
    } catch (err) { console.error(err); } finally { setAnalyzing(false); }
  };

  if (!mounted) return null;

  if (!isAdminOrManager) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-center p-8">
        <div className="max-w-md space-y-6">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold">Unauthorized Access</h2>
          <p className="text-muted-foreground text-sm">Administrative privileges are required to access personnel directories.</p>
        </div>
      </div>
    );
  }

  const filteredNodes = nodes.filter(n => 
    (n.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
    (n.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Personnel Inventory</h1>
          <p className="text-muted-foreground text-sm max-w-lg">Management and governance of the enterprise human capital network.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search identity..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-muted/50 border border-border rounded-2xl w-fit">
        {[
          { id: 'active', label: 'Authorized', icon: ShieldCheck },
          { id: 'pending', label: 'In-Queue', icon: Clock },
          { id: 'blocked', label: 'Restricted', icon: ShieldAlert },
          { id: 'trash', label: 'Decommissioned', icon: Trash2 },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`flex items-center gap-2 px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${
              tab === t.id ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="col-span-full h-64 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Syncing Node Stream...</p>
            </div>
          ) : filteredNodes.length > 0 ? (
            filteredNodes.map((node, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                key={node._id}
                className="premium-card p-8 bg-card flex flex-col"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center text-2xl font-bold">
                    {node.name?.[0]}
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight border ${
                    tab === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-muted text-muted-foreground border-border'
                  }`}>
                    {tab}
                  </span>
                </div>

                <div className="space-y-1 mb-8">
                  <h3 className="text-xl font-bold tracking-tight">{node.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" /> {node.email}
                  </div>
                </div>

                <div className="flex gap-2 mb-10">
                  <span className="px-3 py-1 bg-muted border border-border rounded-lg text-[10px] font-bold uppercase tracking-tight text-muted-foreground">{node.role}</span>
                  <span className="px-3 py-1 bg-muted border border-border rounded-lg text-[10px] font-bold uppercase tracking-tight text-muted-foreground">{node.jobType || 'Remote'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-auto">
                  {tab === 'active' && (
                    <>
                      <button onClick={() => handleAnalyse(node)} className="col-span-2 py-3 bg-primary text-primary-foreground rounded-xl text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2">
                        <Activity className="w-3.5 h-3.5" /> Performance Audit
                      </button>
                      <Link href={`/dashboard/messages?recipient=${node._id}`} className="py-2.5 bg-muted border border-border rounded-xl text-[10px] font-bold uppercase tracking-widest text-center hover:bg-background transition-all">
                        Chat
                      </Link>
                      <button onClick={() => handleAction(node._id, 'soft-delete')} className="py-2.5 bg-muted border border-border rounded-xl text-[10px] font-bold uppercase tracking-widest text-rose-600 hover:bg-rose-50 transition-all">
                        Remove
                      </button>
                    </>
                  )}
                  {tab === 'pending' && (
                    <>
                      <button onClick={() => handleAction(node._id, 'approve')} className="py-4 bg-primary text-primary-foreground rounded-xl text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all">
                        Approve
                      </button>
                      <button onClick={() => handleAction(node._id, 'reject')} className="py-4 bg-muted border border-border rounded-xl text-[10px] font-bold uppercase tracking-widest hover:text-rose-600 transition-all">
                        Decline
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-32 text-center space-y-4">
              <UserX className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">No personnel detected in this sector.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Analysis Modal */}
      <AnimatePresence>
        {analysisNode && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAnalysisNode(null)} className="absolute inset-0 bg-background/80 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              className="relative w-full max-w-5xl bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh]"
            >
              <div className="md:w-2/5 p-12 bg-muted/30 border-r border-border flex flex-col items-center text-center">
                <div className="w-40 h-40 bg-primary text-primary-foreground rounded-[2.5rem] flex items-center justify-center text-6xl font-bold shadow-xl mb-10">
                  {analysisNode.name?.[0]}
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">{analysisNode.name}</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-10">{analysisNode.role} • {analysisNode.jobType || 'Remote'}</p>
                <div className="w-full p-6 bg-background border border-border rounded-2xl text-xs flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" /> {analysisNode.email}
                </div>
              </div>

              <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
                {analyzing ? (
                  <div className="h-full flex flex-col items-center justify-center gap-6">
                    <Loader2 className="animate-spin w-12 h-12 text-muted-foreground" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Generating Performance Insight...</p>
                  </div>
                ) : analysisData && (
                  <div className="space-y-12">
                    <div className="bg-primary text-primary-foreground p-10 rounded-[2rem] flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Audit Score</p>
                        <h4 className="text-7xl font-bold tracking-tighter tabular-nums">{analysisData.stats.score}</h4>
                      </div>
                      <Activity className="w-16 h-16 opacity-20" />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-8 bg-muted rounded-2xl border border-border space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Completion Rate</p>
                        <p className="text-3xl font-bold">{analysisData.stats.taskRate}%</p>
                      </div>
                      <div className="p-8 bg-muted rounded-2xl border border-border space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Report Velocity</p>
                        <p className="text-3xl font-bold">{analysisData.stats.totalReports}</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-4">Activity Stream</h5>
                      <div className="space-y-3">
                        {analysisData.reports.slice(0, 5).map((r, i) => (
                          <div key={i} className="p-5 bg-card border border-border rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-semibold">{r.title || 'Standard Log'}</span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 bg-muted rounded">{r.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setAnalysisNode(null)} className="absolute top-8 right-8 p-2 hover:bg-muted rounded-xl transition-all"><X className="w-6 h-6" /></button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
