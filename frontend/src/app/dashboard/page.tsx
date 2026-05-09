"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import axios from "axios";
import { 
  Users, 
  CheckSquare, 
  TrendingUp, 
  ArrowUpRight,
  Loader2,
  Bell,
  Search,
  Settings,
  Plus,
  MessageSquare,
  FileText,
  Calendar as CalendarIcon,
  UserPlus,
  X,
  AlertTriangle,
  Zap,
  Activity,
  Check
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";

// Dynamic imports for performance optimization
const AdminStats = dynamic(() => import("@/components/dashboard/AdminStats"), { 
  ssr: false,
  loading: () => <div className="h-[400px] bg-zinc-50 animate-pulse rounded-[3rem] border border-zinc-100" />
});

const CalendarView = dynamic(() => import("@/components/dashboard/CalendarView"), { 
  ssr: false,
  loading: () => <div className="h-[600px] bg-zinc-50 animate-pulse rounded-[3rem] border border-zinc-100" />
});

const TodoApp = dynamic(() => import("@/components/dashboard/TodoApp"), { 
  ssr: false,
  loading: () => <div className="h-[500px] bg-zinc-50 animate-pulse rounded-[3rem] border border-zinc-100" />
});

export default function DashboardPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "", priority: "normal" });
  const [loadError, setLoadError] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = async (controller?: AbortController) => {
    try {
      const isEmployee = user?.role === 'employee';
      
      const fetchPromises: any[] = [
        api.get("tasks", { signal: controller?.signal }),
        api.get("reports", { signal: controller?.signal }),
        api.get("announcements", { signal: controller?.signal })
      ];

      // Only fetch leads for managers and admins
      if (!isEmployee) {
        fetchPromises.unshift(api.get("leads", { signal: controller?.signal }));
      }

      const results = await Promise.allSettled(fetchPromises);

      let leadsResult, tasksResult, reportsResult, annResult;
      
      if (!isEmployee) {
        [leadsResult, tasksResult, reportsResult, annResult] = results;
      } else {
        [tasksResult, reportsResult, annResult] = results;
        leadsResult = { status: 'rejected', reason: 'Access Restricted' };
      }

      // Extract data safely from potentially paginated responses
      const leads = leadsResult.status === 'fulfilled' 
        ? (Array.isArray(leadsResult.value.data) ? leadsResult.value.data : (leadsResult.value.data.leads || [])) 
        : [];
      const tasks = tasksResult.status === 'fulfilled' 
        ? (Array.isArray(tasksResult.value.data) ? tasksResult.value.data : (tasksResult.value.data.tasks || [])) 
        : [];
      const reports = reportsResult.status === 'fulfilled' 
        ? (Array.isArray(reportsResult.value.data) ? reportsResult.value.data : (reportsResult.value.data.reports || [])) 
        : [];
      const anns = annResult.status === 'fulfilled' 
        ? (Array.isArray(annResult.value.data) ? annResult.value.data : (annResult.value.data.announcements || [])) 
        : [];

      setStats({
        leads: leads.length,
        tasks: tasks.length,
        pendingTasks: tasks.filter((t: any) => t.status !== 'completed').length,
        reportCount: reports.length
      });

      setRecentReports(reports.slice(-5).reverse());
      setAnnouncements(anns);

      const empData = await api.get("auth/contacts", { signal: controller?.signal });
      const employeeList = Array.isArray(empData.data) ? empData.data : [];
      setEmployees(employeeList.filter((u: any) => u._id !== user?._id));
    } catch (err: any) {
      if (!axios.isCancel(err)) {
        console.error(err);
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    fetchData(abortController);

    // Socket Listeners for Real-time Updates
    if (socket) {
      socket.on("new_announcement", (ann: any) => {
        setAnnouncements(prev => [ann, ...prev]);
      });

      socket.on("task_submission", () => fetchData());
      socket.on("task_status_updated", () => fetchData());
      
      socket.on("monitoring:update", ({ userId, status }: any) => {
        setEmployees(prev => prev.map(emp => 
          emp._id === userId ? { ...emp, isSharing: status === 'sharing' } : emp
        ));
      });
    }

    return () => {
      abortController.abort();
      if (socket) {
        socket.off("new_announcement");
        socket.off("task_submission");
        socket.off("task_status_updated");
        socket.off("monitoring:update");
      }
    };
  }, [socket, user]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post("announcements", newAnnouncement);
      setAnnouncements([data, ...announcements]);
      setNewAnnouncement({ title: "", content: "", priority: "normal" });
    } catch (err) {
      console.error(err);
    }
  };

  const markAnnouncementsAsSeen = async () => {
    if (showAnnouncements) {
      try {
        await api.post("auth/mark-read", { field: "announcements" });
        // Optionally update UI if there's a specific 'unseen' flag per announcement
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    if (showAnnouncements) markAnnouncementsAsSeen();
  }, [showAnnouncements]);

  if (!mounted) return null;

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-zinc-900" />
        <div className="text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.4em]">Establishing Uplink</p>
          <div className="flex gap-1 mt-2 justify-center">
            {[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-zinc-950 animate-pulse" style={{ animationDelay: `${i*0.2}s` }} />)}
          </div>
        </div>
      </div>
    </div>
  );

  const isEmployee = user?.role === 'employee';
  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-20">
      {/* Load Error Warning */}
      {loadError && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-5 bg-rose-50 border border-rose-100 rounded-2xl shadow-sm"
        >
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          <p className="text-[10px] font-bold text-rose-900 uppercase tracking-widest">Neural Uplink Fragmentation Detected: Integrity check mandatory.</p>
          <button onClick={() => fetchData()} className="ml-auto px-4 py-2 bg-rose-600 text-white text-[9px] font-bold uppercase tracking-widest rounded-xl hover:bg-rose-700 transition-colors">Re-Sync</button>
        </motion.div>
      )}

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-zinc-100 pb-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-zinc-900 rounded-full"></div>
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-400">Vertex Core</span>
          </div>
          <motion.h1 
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl font-bold tracking-tight text-zinc-950 uppercase italic"
          >
            {isEmployee ? "Personnel" : "Control"} <span className="text-zinc-300 not-italic font-normal">Center</span>
          </motion.h1>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase tracking-widest rounded-full border border-emerald-100 shadow-sm shadow-emerald-500/5">
              <Zap className="h-3 w-3 fill-emerald-500" /> Uplink Active
            </div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
              Authorized: <span className="text-zinc-950">{user?.name}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative group flex-1 md:flex-initial">
            <input 
              type="text" 
              placeholder="Query intelligence..." 
              className="bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-[11px] font-semibold uppercase tracking-widest w-full md:w-72 focus:bg-white focus:border-zinc-950 transition-all"
            />
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 group-focus-within:text-zinc-950 transition-colors" />
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowAnnouncements(!showAnnouncements)}
              className={`px-6 py-4 rounded-2xl border transition-all relative group shadow-sm ${showAnnouncements ? "bg-zinc-950 text-white border-zinc-950" : "bg-white text-zinc-500 border-zinc-100 hover:border-zinc-950"}`}
            >
              <div className="flex items-center gap-2">
                <Bell className={`h-4 w-4 ${showAnnouncements ? 'text-white' : 'text-zinc-400'}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Notices</span>
              </div>
              {announcements.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                  {announcements.length}
                </span>
              )}
            </button>
            <Link href="/dashboard/messages" className="p-4 rounded-2xl border border-zinc-100 bg-white text-zinc-400 hover:text-zinc-950 hover:border-zinc-950 transition-all shadow-sm">
              <MessageSquare className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Announcements Panel */}
      <AnimatePresence>
        {showAnnouncements && (
          <motion.div 
            initial={{ height: 0, opacity: 0, y: -15 }} animate={{ height: "auto", opacity: 1, y: 0 }} exit={{ height: 0, opacity: 0, y: -15 }}
            className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-8 shadow-xl relative z-50 overflow-hidden backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-8 border-b border-zinc-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-950 text-white flex items-center justify-center rounded-2xl shadow-xl">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-950 uppercase italic tracking-tight">System Protocols</h2>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Broadcast_Delta_v4</p>
                </div>
              </div>
              <button onClick={() => setShowAnnouncements(false)} className="p-3 hover:bg-zinc-100 rounded-xl transition-all text-zinc-400 group">
                <X className="h-6 w-6 group-hover:rotate-90 transition-transform" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
              <div className="space-y-5 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                {announcements.map((ann) => (
                  <motion.div 
                    layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={ann._id} 
                    className={`p-6 rounded-3xl border ${ann.priority === 'urgent' ? 'bg-white border-rose-100' : 'bg-white border-zinc-100'} shadow-sm`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-lg tracking-widest ${ann.priority === 'urgent' ? 'bg-rose-500 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                        {ann.priority}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{new Date(ann.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-lg font-bold text-zinc-950 mb-2 tracking-tight italic uppercase">{ann.title}</h3>
                    <p className="text-[12px] text-zinc-600 font-medium leading-relaxed line-clamp-3">{ann.content}</p>
                    <div className="flex items-center gap-2 mt-5 pt-4 border-t border-zinc-50">
                      <div className="w-7 h-7 bg-zinc-50 border border-zinc-100 text-zinc-900 flex items-center justify-center text-[10px] font-bold rounded-lg uppercase shadow-sm">
                        {ann.createdBy?.name?.[0]}
                      </div>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest italic">{ann.createdBy?.name}</p>
                    </div>
                  </motion.div>
                ))}
                {announcements.length === 0 && (
                  <div className="p-16 text-center border-2 border-dashed border-zinc-100 rounded-3xl bg-white/50">
                    <Activity className="h-10 w-10 text-zinc-200 mx-auto mb-4 opacity-40" />
                    <p className="text-[10px] font-bold text-zinc-300 opacity-40 uppercase tracking-[0.4em]">Silence in sector</p>
                  </div>
                )}
              </div>

              {isManagerOrAdmin && (
                <div className="bg-white rounded-[3rem] border border-amber-100 p-10 space-y-8 shadow-sm flex flex-col justify-center">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-zinc-950 uppercase italic tracking-tighter">Initialize Broadcast</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Global Node Notification System</p>
                  </div>
                  <form onSubmit={handleCreateAnnouncement} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-[0.2em] ml-2">Header</label>
                      <input 
                        required
                        type="text" 
                        placeholder="PROTOCOL TITLE..." 
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-5 text-[11px] font-bold uppercase tracking-widest focus:bg-white focus:ring-8 focus:ring-black/[0.02] outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-[0.2em] ml-2">Directives</label>
                      <textarea 
                        required
                        placeholder="SPECIFY PARAMETERS..." 
                        value={newAnnouncement.content}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-5 text-[11px] font-bold uppercase tracking-widest h-32 focus:bg-white focus:ring-8 focus:ring-black/[0.02] outline-none resize-none transition-all leading-relaxed"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-[0.2em] ml-2">Urgency</label>
                        <select 
                          value={newAnnouncement.priority}
                          onChange={(e) => setNewAnnouncement({...newAnnouncement, priority: e.target.value})}
                          className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-5 text-[11px] font-bold uppercase tracking-widest focus:bg-white focus:ring-8 focus:ring-black/[0.02] outline-none appearance-none cursor-pointer transition-all"
                        >
                          <option value="normal">Standard</option>
                          <option value="urgent">Critical</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button className="w-full py-5 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-[0.3em] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/20">
                          Execute Broadcast
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Section */}
      <section className="space-y-8">
        <div className="flex items-center gap-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.5em] text-zinc-400 whitespace-nowrap italic">Neural Net Metrics</h2>
          <div className="h-[1px] flex-1 bg-zinc-100"></div>
        </div>
        <AdminStats />
      </section>

      {/* Main Grid: Mission Control */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        <div className="xl:col-span-2 space-y-16">
          {/* Active Colleagues */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-zinc-950 tracking-tight italic uppercase">Active Entities</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Satellite Node Discovery</p>
              </div>
              {isManagerOrAdmin && (
                <Link href="/dashboard/personnel" className="flex items-center gap-2 px-5 py-3 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all rounded-xl shadow-lg shadow-black/10">
                  <Users className="h-3.5 w-3.5" /> Personnel Log
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {employees.length > 0 ? (
                employees.slice(0, 10).map((emp) => (
                  <Link 
                    key={emp._id} 
                    href={`/dashboard/messages?recipient=${emp._id}`}
                    className="group bg-white border border-zinc-100 p-5 rounded-3xl hover:border-zinc-300 transition-all shadow-sm hover:shadow-lg duration-300 relative overflow-hidden"
                  >
                    {emp.isSharing && (
                      <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 bg-rose-500 text-white text-[7px] font-bold uppercase rounded-full animate-pulse z-10 shadow-lg border border-white/10">
                        <Activity className="w-2.5 h-2.5" /> Live
                      </div>
                    )}
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="w-12 h-12 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-center font-bold text-lg group-hover:bg-zinc-950 group-hover:text-white transition-all duration-300">
                        {emp.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="overflow-hidden w-full">
                        <p className="text-[11px] font-bold text-zinc-950 truncate uppercase tracking-tight">{emp.name}</p>
                        <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest mt-0.5 italic">{emp.role}</p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full py-16 bg-zinc-50/50 border border-dashed border-zinc-200 rounded-3xl text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-zinc-200 mb-4" />
                  <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest italic">Scanning satellite perimeter...</p>
                </div>
              )}
            </div>
          </section>

          {/* Calendar Section */}
          <section className="space-y-8">
            <div className="flex items-center gap-6">
              <h3 className="text-3xl font-bold text-zinc-950 tracking-tighter italic uppercase">Operation Chronology</h3>
              <div className="h-[1px] flex-1 bg-zinc-100"></div>
            </div>
            
            <div className="bg-white rounded-[3rem] border border-zinc-100 p-10 shadow-sm overflow-hidden group">
              <div className="relative">
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-zinc-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <CalendarView />
              </div>
            </div>
          </section>
        </div>
        
        {/* Sidebar Widgets */}
        <div className="space-y-12">
          <div className="bg-white rounded-[3.5rem] border border-zinc-100 shadow-sm flex flex-col h-full min-h-[700px] overflow-hidden group">
            <div className="p-10 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] flex items-center gap-4 text-zinc-950 italic">
                <CheckSquare className="h-5 w-5 text-zinc-400 group-hover:text-zinc-950 transition-colors" /> Operation Roadmap
              </h3>
              <div className="flex items-center gap-2 px-3 py-1 bg-white border border-zinc-100 rounded-full shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50"></div>
                <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-zinc-400">Sync_Active</span>
              </div>
            </div>
            <div className="flex-1 p-8 bg-white relative">
              <div className="absolute inset-0 pattern-dots opacity-[0.01] pointer-events-none" />
              <TodoApp />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden group">
        <div className="p-8 border-b border-zinc-50 flex flex-col xl:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-zinc-950 text-white rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:rotate-6">
              <Activity className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-zinc-950 tracking-tight uppercase italic">Intelligence Feed</h2>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Satellite Node Activity Stream</p>
            </div>
          </div>
          <Link href="/dashboard/reports" className="group w-full xl:w-auto">
            <div className="flex items-center justify-center gap-3 px-8 py-4 bg-zinc-950 text-white rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-black/10">
              <span className="text-[10px] font-bold uppercase tracking-widest">Archives</span>
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </Link>
        </div>
        
        <div className="divide-y divide-zinc-50 px-4">
          {recentReports.map((report, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              key={report._id} 
              className="py-10 flex flex-col xl:flex-row items-center justify-between hover:bg-zinc-50/50 rounded-3xl px-8 transition-all gap-10 group/item border border-transparent hover:border-zinc-100/50"
            >
              <div className="flex items-center gap-8 flex-1 w-full">
                <div className="w-16 h-16 bg-white border border-zinc-100 rounded-3xl flex items-center justify-center text-zinc-300 group-hover/item:bg-zinc-950 group-hover/item:text-white group-hover/item:rotate-12 transition-all duration-500 shadow-sm group-hover/item:shadow-xl group-hover/item:shadow-black/20">
                  <FileText className="h-7 w-7" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-bold text-zinc-950 tracking-tight line-clamp-1 uppercase italic">{report.title}</h3>
                    {i === 0 && <span className="bg-emerald-500 text-white text-[9px] font-bold px-3 py-1 rounded-lg uppercase shadow-xl shadow-emerald-500/20 border border-white/20 tracking-widest">Priority_A</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 bg-zinc-50/50 px-3 py-1 rounded-full border border-zinc-100">
                      <Users className="h-3.5 w-3.5 text-zinc-950" /> <span className="text-zinc-500">Node:</span> <span className="text-zinc-950">{report.employeeId?.name || "System"}</span>
                    </p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 bg-zinc-50/50 px-3 py-1 rounded-full border border-zinc-100">
                      <CalendarIcon className="h-3.5 w-3.5 text-zinc-950" /> <span className="text-zinc-500">Sync:</span> <span className="text-zinc-950">{new Date(report.date).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedReport(report)}
                className="w-full xl:w-auto px-10 py-4 bg-white border border-zinc-100 text-zinc-950 text-[10px] font-bold uppercase tracking-[0.2em] rounded-2xl hover:bg-zinc-950 hover:text-white hover:border-zinc-950 transition-all shadow-sm active:scale-95 group/btn"
              >
                Inspect Data Packet
              </button>
            </motion.div>
          ))}
          {recentReports.length === 0 && (
            <div className="py-32 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-zinc-100 mb-8" />
              <p className="text-[10px] font-bold text-zinc-200 uppercase tracking-[0.5em]">Synchronizing Intelligence Stream...</p>
            </div>
          )}
        </div>
        
        <Link href="/dashboard/reports" className="block w-full py-12 bg-zinc-950 text-white text-center hover:bg-black transition-all group overflow-hidden relative">
          <div className="absolute inset-0 pattern-dots opacity-[0.05] group-hover:scale-110 transition-transform duration-1000" />
          <span className="text-[11px] font-bold uppercase tracking-[0.6em] inline-block group-hover:translate-x-6 transition-transform relative z-10 italic">
            Initialize Full System Audit Sequence &rarr;
          </span>
        </Link>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReport(null)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-2xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl border border-white/20 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <div className="p-10 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center relative overflow-hidden">
                <div className="absolute inset-0 pattern-dots opacity-[0.02] pointer-events-none" />
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-16 h-16 bg-zinc-950 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-black/20 group hover:rotate-12 transition-transform">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-zinc-950 tracking-tighter uppercase italic">Intelligence Record</h2>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Packet Fragment // ID_{selectedReport._id.slice(-8)}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedReport(null)} className="p-4 hover:bg-zinc-200/50 rounded-2xl transition-all text-zinc-400 hover:text-zinc-950 group relative z-10">
                  <X className="h-8 w-8 group-hover:rotate-90 transition-transform" />
                </button>
              </div>
              
              <div className="p-12 space-y-12 max-h-[70vh] overflow-y-auto custom-scrollbar relative">
                <div className="absolute inset-0 pattern-dots opacity-[0.01] pointer-events-none" />
                
                <div className="space-y-6 relative z-10">
                  <h3 className="text-4xl font-bold text-zinc-950 tracking-tighter uppercase italic leading-none">{selectedReport.title}</h3>
                  <div className="flex flex-wrap gap-4">
                    <span className="flex items-center gap-3 text-[9px] font-bold uppercase text-zinc-500 bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-100 shadow-sm tracking-[0.15em]">
                      <Users className="h-4 w-4 text-zinc-950" /> Agent: {selectedReport.employeeId?.name}
                    </span>
                    <span className="flex items-center gap-3 text-[9px] font-bold uppercase text-zinc-500 bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-100 shadow-sm tracking-[0.15em]">
                      <CalendarIcon className="h-4 w-4 text-zinc-950" /> Sync: {new Date(selectedReport.date).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-10 bg-zinc-50 rounded-[3rem] border border-zinc-100 relative group z-10">
                  <div className="absolute top-4 right-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                    <Activity className="w-20 h-20" />
                  </div>
                  <p className="text-lg text-zinc-700 font-medium leading-relaxed whitespace-pre-wrap relative z-10">{selectedReport.content}</p>
                </div>

                {selectedReport.files && selectedReport.files.length > 0 && (
                  <div className="space-y-6 relative z-10">
                    <div className="flex items-center gap-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-300 ml-1">Data Packets</h4>
                      <div className="h-[1px] flex-1 bg-zinc-50" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedReport.files.map((file: any, idx: number) => (
                        <a 
                          key={idx} 
                          href={file.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-6 bg-white border border-zinc-100 rounded-2xl hover:border-zinc-950 hover:shadow-2xl hover:shadow-black/5 transition-all group/file"
                        >
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="p-3 bg-zinc-50 group-hover/file:bg-zinc-950 group-hover/file:text-white transition-colors rounded-xl shadow-sm">
                              <FileText className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-950 truncate">{file.name || `Packet_${idx+1}`}</span>
                          </div>
                          <ArrowUpRight className="h-5 w-5 text-zinc-300 group-hover/file:text-zinc-950 group-hover/file:translate-x-0.5 group-hover/file:-translate-y-0.5 transition-all" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-10 bg-white border-t border-zinc-100 flex justify-end relative z-10">
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="px-12 py-5 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-[0.4em] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/20"
                >
                  Terminate Inspection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

