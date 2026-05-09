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
import AdminStats from "@/components/dashboard/AdminStats";
import CalendarView from "@/components/dashboard/CalendarView";
import TodoApp from "@/components/dashboard/TodoApp";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";

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

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin h-12 w-12 text-black" />
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.5em]">Establishing Uplink</p>
          <div className="flex gap-1 mt-2 justify-center">
            {[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-black animate-pulse" style={{ animationDelay: `${i*0.2}s` }} />)}
          </div>
        </div>
      </div>
    </div>
  );

  const isEmployee = user?.role === 'employee';
  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';

  return (
    <div className="space-y-8 pb-10">
      {/* Load Error Warning */}
      {loadError && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl shadow-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider">System Synchronization Warning: Integrity check required.</p>
          <button onClick={() => fetchData()} className="ml-auto text-[10px] font-bold uppercase text-amber-600 hover:underline">Re-Sync</button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-1 bg-black rounded-full"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Operations Control</span>
          </div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900"
          >
            {isEmployee ? "Personnel" : "Control"} <span className="text-zinc-300 font-light">Hub</span>
          </motion.h1>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase rounded-full border border-emerald-100">
              <Zap className="h-3 w-3 fill-emerald-500 text-emerald-500" /> System Online
            </div>
            <p className="text-xs font-medium text-zinc-500">
              Welcome back, <span className="font-bold text-zinc-900">{user?.name}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative group flex-1 md:flex-initial">
            <input 
              type="text" 
              placeholder="Search data..." 
              className="bg-white border border-zinc-200 rounded-2xl px-5 py-3 text-sm w-full md:w-72 focus:outline-none focus:ring-4 focus:ring-black/5 transition-all"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowAnnouncements(!showAnnouncements)}
              className={`flex-1 md:flex-none px-5 py-3 rounded-2xl border transition-all relative ${showAnnouncements ? "bg-black text-white border-black" : "bg-white text-zinc-600 border-zinc-200 hover:border-black hover:text-black"}`}
            >
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Notices</span>
              </div>
              {announcements.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  {announcements.length}
                </span>
              )}
            </button>
            <Link href="/dashboard/messages" className="px-5 py-3 rounded-2xl border border-zinc-200 bg-white text-zinc-600 hover:border-black hover:text-black transition-all">
              <MessageSquare className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Announcements Panel */}
      <AnimatePresence>
        {showAnnouncements && (
          <motion.div 
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -20 }}
            className="rounded-[2.5rem] border border-amber-100 bg-amber-50/50 p-8 shadow-sm relative z-50 overflow-hidden backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 border-b border-amber-200 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-amber-900">Global Protocols</h2>
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1">Priority Directives & Broadcasts</p>
                </div>
              </div>
              <button onClick={() => setShowAnnouncements(false)} className="p-2 hover:bg-amber-100 rounded-xl transition-all text-amber-900"><X className="h-6 w-6" /></button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-4 custom-scrollbar">
                {announcements.map((ann) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={ann._id} 
                    className={`p-5 rounded-2xl border relative ${ann.priority === 'urgent' ? 'bg-white border-red-200 shadow-lg shadow-red-500/5' : 'bg-white border-zinc-100 shadow-sm'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${ann.priority === 'urgent' ? 'bg-red-500 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                        {ann.priority}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-medium">{new Date(ann.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 mb-1">{ann.title}</h3>
                    <p className="text-sm text-zinc-600 leading-relaxed">{ann.content}</p>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-50">
                      <div className="w-6 h-6 bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold rounded-lg uppercase">
                        {ann.createdBy?.name?.[0]}
                      </div>
                      <p className="text-[10px] font-medium text-zinc-400 uppercase">Broadcast by {ann.createdBy?.name}</p>
                    </div>
                  </motion.div>
                ))}
                {announcements.length === 0 && (
                  <div className="p-16 text-center border border-dashed border-amber-200 rounded-3xl bg-white/50">
                    <p className="text-sm font-medium text-amber-800 opacity-40 uppercase tracking-widest">No active protocols</p>
                  </div>
                )}
              </div>

              {isManagerOrAdmin && (
                <div className="bg-white rounded-3xl border border-amber-100 p-8 space-y-5 shadow-sm">
                  <h3 className="text-lg font-bold text-zinc-900">New Broadcast</h3>
                  <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider ml-1">Subject Header</label>
                      <input 
                        required
                        type="text" 
                        placeholder="PROTOCOL TITLE..." 
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-xs font-bold uppercase focus:bg-white focus:ring-4 focus:ring-black/5 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider ml-1">Message Content</label>
                      <textarea 
                        required
                        placeholder="SPECIFY PARAMETERS..." 
                        value={newAnnouncement.content}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-xs font-bold h-24 focus:bg-white focus:ring-4 focus:ring-black/5 outline-none resize-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider ml-1">Urgency</label>
                        <select 
                          value={newAnnouncement.priority}
                          onChange={(e) => setNewAnnouncement({...newAnnouncement, priority: e.target.value})}
                          className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-xs font-bold uppercase focus:bg-white focus:ring-4 focus:ring-black/5 outline-none appearance-none cursor-pointer transition-all"
                        >
                          <option value="normal">Standard</option>
                          <option value="urgent">Critical</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button className="w-full py-4 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-black/10">
                          Broadcast
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
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-400 whitespace-nowrap">Performance Overview</h2>
          <div className="h-[1px] flex-1 bg-zinc-100"></div>
        </div>
        <AdminStats />
      </section>

      {/* Main Grid: Mission Control */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-10">
          {/* Active Colleagues */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 tracking-tight">Active Nodes</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Satellite Network Discovery</p>
              </div>
              {isManagerOrAdmin && (
                <Link href="/dashboard/personnel" className="flex items-center gap-2 px-4 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all rounded-xl shadow-lg shadow-black/10">
                  <Users className="h-4 w-4" /> Manage Sector
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {employees.length > 0 ? (
                employees.slice(0, 10).map((emp) => (
                  <Link 
                    key={emp._id} 
                    href={`/dashboard/messages?recipient=${emp._id}`}
                    className="group bg-white border border-zinc-100 p-4 rounded-2xl hover:bg-black transition-all shadow-sm hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1 duration-300 relative overflow-hidden"
                  >
                    {emp.isSharing && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black uppercase rounded-full animate-pulse z-10">
                        <Video className="w-2 h-2" /> Live
                      </div>
                    )}
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="w-10 h-10 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-center font-bold text-lg group-hover:bg-white group-hover:text-black group-hover:border-transparent transition-colors">
                        {emp.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="overflow-hidden w-full">
                        <p className="text-[11px] font-bold text-zinc-900 truncate group-hover:text-white">{emp.name}</p>
                        <p className="text-[9px] font-medium text-zinc-400 uppercase tracking-wide group-hover:text-zinc-500">{emp.role}</p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full py-12 bg-white border border-dashed border-zinc-200 rounded-3xl text-center">
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest italic">Searching for satellite nodes...</p>
                </div>
              )}
            </div>
          </section>

          {/* Calendar Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-bold text-zinc-900 tracking-tight">Logistics Calendar</h3>
              <div className="h-[1px] flex-1 bg-zinc-100"></div>
            </div>
            
            <div className="bg-white rounded-[2rem] border border-zinc-100 p-6 shadow-sm">
              <CalendarView />
            </div>
          </section>
        </div>
        
        {/* Sidebar Widgets */}
        <div className="space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm flex flex-col h-full min-h-[600px] overflow-hidden">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-zinc-900">
                <CheckSquare className="h-4 w-4 text-zinc-400" /> Mission Roadmap
              </h3>
              <div className="flex items-center gap-2 px-2.5 py-1 bg-white border border-zinc-200 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[9px] font-bold uppercase text-zinc-500">Live Sync</span>
              </div>
            </div>
            <div className="flex-1 p-4 bg-white">
              <TodoApp />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-[3rem] border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-zinc-900 text-white rounded-3xl shadow-xl shadow-black/10">
              <Activity className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Intelligence Feed</h2>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Satellite Node Activity Stream</p>
            </div>
          </div>
          <Link href="/dashboard/reports" className="group w-full md:w-auto">
            <div className="flex items-center justify-center gap-2 px-6 py-3.5 bg-zinc-50 hover:bg-black text-zinc-600 hover:text-white rounded-2xl border border-zinc-100 hover:border-black transition-all duration-300">
              <span className="text-xs font-bold uppercase tracking-widest">Access Archives</span>
              <ArrowUpRight className="h-4 w-4 group-hover:rotate-45 transition-transform" />
            </div>
          </Link>
        </div>
        
        <div className="divide-y divide-zinc-50 px-4">
          {recentReports.map((report, i) => (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              key={report._id} 
              className="p-6 flex flex-col md:flex-row items-center justify-between hover:bg-zinc-50/50 rounded-2xl transition-all gap-6 group"
            >
              <div className="flex items-center gap-5 flex-1 w-full">
                <div className="w-14 h-14 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-black group-hover:text-white group-hover:border-transparent transition-all duration-300">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="text-lg font-bold text-zinc-900 tracking-tight line-clamp-1">{report.title}</h3>
                    {i === 0 && <span className="bg-emerald-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase shadow-lg shadow-emerald-500/20">Recent</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1.5">
                      <Users className="h-3 w-3" /> Node: <span className="text-zinc-900">{report.employeeId?.name || "System"}</span>
                    </p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1.5">
                      <CalendarIcon className="h-3 w-3" /> Sync: <span className="text-zinc-900">{new Date(report.date).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedReport(report)}
                className="w-full md:w-auto px-8 py-3 bg-white border border-zinc-200 text-zinc-900 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-black hover:text-white hover:border-black transition-all shadow-sm active:scale-95"
              >
                Inspect Packet
              </button>
            </motion.div>
          ))}
          {recentReports.length === 0 && (
            <div className="p-20 text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-zinc-200 mb-4" />
              <p className="text-xs font-bold text-zinc-300 uppercase tracking-[0.2em]">Synchronizing Intelligence Stream...</p>
            </div>
          )}
        </div>
        
        <Link href="/dashboard/reports" className="block w-full py-8 bg-zinc-900 text-white text-center hover:bg-black transition-all group overflow-hidden">
          <span className="text-xs font-bold uppercase tracking-[0.4em] inline-block group-hover:translate-x-2 transition-transform">
            Execute Full System Audit Sequence &rarr;
          </span>
        </Link>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReport(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-[2.5rem] border border-zinc-200 shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-black text-white rounded-2xl">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Intelligence Record</h2>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Packet ID: {selectedReport._id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-zinc-200 rounded-xl transition-all">
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-8 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
                <div>
                  <h3 className="text-3xl font-bold text-zinc-900 tracking-tight mb-3">{selectedReport.title}</h3>
                  <div className="flex flex-wrap gap-5">
                    <span className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500 bg-zinc-50 px-3 py-1.5 rounded-full border border-zinc-100">
                      <Users className="h-3 w-3" /> Agent: {selectedReport.employeeId?.name}
                    </span>
                    <span className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500 bg-zinc-50 px-3 py-1.5 rounded-full border border-zinc-100">
                      <CalendarIcon className="h-3 w-3" /> Timestamp: {new Date(selectedReport.date).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-8 bg-zinc-50 rounded-3xl border border-zinc-100 border-dashed">
                  <p className="text-base text-zinc-700 leading-relaxed whitespace-pre-wrap">{selectedReport.content}</p>
                </div>

                {selectedReport.files && selectedReport.files.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 ml-1">Attached Data Packets</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedReport.files.map((file: any, idx: number) => (
                        <a 
                          key={idx} 
                          href={file.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 bg-white border border-zinc-100 rounded-2xl hover:border-black hover:shadow-lg transition-all group"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileText className="h-5 w-5 text-zinc-400 group-hover:text-black transition-colors" />
                            <span className="text-[10px] font-bold uppercase text-zinc-900 truncate">{file.name || `Packet_${idx+1}`}</span>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-zinc-300 group-hover:text-black transition-all" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-white border-t border-zinc-100 flex justify-end">
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="px-10 py-3.5 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/10"
                >
                  Close Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

