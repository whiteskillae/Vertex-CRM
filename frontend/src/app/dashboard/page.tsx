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
    }

    return () => {
      abortController.abort();
      if (socket) {
        socket.off("new_announcement");
        socket.off("task_submission");
        socket.off("task_status_updated");
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
    <div className="space-y-12 pb-24">
      {/* Load Error Warning */}
      {loadError && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <p className="text-[10px] font-black uppercase tracking-widest">Partial Sync Failure. Integrity check required.</p>
          <button onClick={() => fetchData()} className="ml-auto underline font-black text-[10px] uppercase">Re-Sync</button>
        </div>
      )}

      {/* Header & Global Search */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-1 bg-black"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400">Node Status: Active</span>
          </div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-7xl font-black tracking-tighter uppercase italic leading-none"
          >
            {isEmployee ? "Worker" : "Control"} <span className="text-gray-300">Hub</span>
          </motion.h1>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-black text-white text-[8px] font-black uppercase">
              <Zap className="h-3 w-3 fill-yellow-400 text-yellow-400" /> System Online
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Authenticated Session: {user?.name}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          <div className="relative group flex-1 md:flex-initial">
            <input 
              type="text" 
              placeholder="GLOBAL DATABASE SEARCH..." 
              className="bg-white border-4 border-black px-6 py-4 text-xs font-black w-full md:w-80 focus:outline-none focus:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all uppercase placeholder:text-gray-300"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-black" />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowAnnouncements(!showAnnouncements)}
              className={`flex-1 md:flex-none px-6 py-4 border-4 border-black transition-all relative ${showAnnouncements ? "bg-black text-white" : "bg-white text-black hover:bg-black hover:text-white"}`}
            >
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase">Notices</span>
              </div>
              {announcements.length > 0 && (
                <span className="absolute -top-3 -right-3 w-6 h-6 bg-red-600 text-white text-[10px] font-black flex items-center justify-center border-4 border-white shadow-lg">
                  {announcements.length}
                </span>
              )}
            </button>
            <Link href="/dashboard/messages" className="px-6 py-4 border-4 border-black bg-white text-black hover:bg-black hover:text-white transition-all">
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
            className="border-8 border-black bg-yellow-50 p-8 shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] relative z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8 border-b-4 border-black pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black text-white">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter italic">Global Protocols</h2>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Priority Directives & Broadcasts</p>
                </div>
              </div>
              <button onClick={() => setShowAnnouncements(false)} className="p-2 border-4 border-black hover:bg-black hover:text-white transition-all"><X className="h-6 w-6" /></button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6 max-h-[500px] overflow-y-auto pr-6 custom-scrollbar">
                {announcements.map((ann) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={ann._id} 
                    className={`p-6 border-4 border-black relative ${ann.priority === 'urgent' ? 'bg-red-100 shadow-[6px_6px_0px_0px_rgba(220,38,38,1)]' : 'bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-[10px] font-black uppercase px-3 py-1 border-2 ${ann.priority === 'urgent' ? 'border-red-600 bg-red-600 text-white' : 'border-black bg-black text-white'}`}>
                        {ann.priority}
                      </span>
                      <span className="text-[10px] text-gray-500 font-black uppercase">{new Date(ann.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight mb-2 leading-none">{ann.title}</h3>
                    <p className="text-sm text-gray-600 font-bold leading-relaxed">{ann.content}</p>
                    <div className="flex items-center gap-2 mt-6 pt-4 border-t-2 border-black/5">
                      <div className="w-6 h-6 bg-black text-white flex items-center justify-center text-[10px] font-black uppercase">
                        {ann.createdBy?.name?.[0]}
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">Broadcast by {ann.createdBy?.name}</p>
                    </div>
                  </motion.div>
                ))}
                {announcements.length === 0 && (
                  <div className="p-20 text-center border-4 border-dashed border-gray-200">
                    <p className="text-sm font-black text-gray-300 uppercase italic">No active protocol updates</p>
                  </div>
                )}
              </div>

              {isManagerOrAdmin && (
                <div className="bg-white border-8 border-black p-8 space-y-6 relative">
                  <div className="absolute -top-4 -left-4 bg-black text-white px-4 py-2 text-[10px] font-black uppercase italic">Protocol Uplink</div>
                  <h3 className="text-xl font-black uppercase tracking-tighter">Broadcast Directives</h3>
                  <form onSubmit={handleCreateAnnouncement} className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Subject Header</label>
                      <input 
                        required
                        type="text" 
                        placeholder="PROTOCOL TITLE..." 
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                        className="w-full border-4 border-black p-4 text-xs font-black uppercase focus:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Detailed Instructions</label>
                      <textarea 
                        required
                        placeholder="SPECIFY OPERATIONAL PARAMETERS..." 
                        value={newAnnouncement.content}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                        className="w-full border-4 border-black p-4 text-xs font-black h-32 focus:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Urgency Level</label>
                      <select 
                        value={newAnnouncement.priority}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, priority: e.target.value})}
                        className="w-full border-4 border-black p-4 text-xs font-black uppercase focus:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] outline-none appearance-none"
                      >
                        <option value="normal">Standard Operation</option>
                        <option value="urgent">Critical Alert</option>
                      </select>
                    </div>
                    <button className="w-full py-5 bg-black text-white text-xs font-black uppercase tracking-[0.3em] hover:bg-white hover:text-black border-4 border-black transition-all shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)]">
                      Execute Broadcast
                    </button>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Operations Overview Section */}
      <section className="space-y-8">
        <div className="flex items-center gap-6">
          <h2 className="text-xs font-black uppercase tracking-[0.6em] text-gray-300 whitespace-nowrap">Operational Analytics</h2>
          <div className="h-[4px] flex-1 bg-black/5 rounded-full"></div>
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-black"></div>
            <div className="w-3 h-3 bg-gray-200"></div>
          </div>
        </div>
        <AdminStats />
      </section>

      {/* Main Grid: Mission Control */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        <div className="xl:col-span-2 space-y-12">
          {/* Mission Deployment: Personnel List */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-3 h-12 bg-black"></div>
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tight italic">Active Colleagues</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Network Node Discovery</p>
                </div>
              </div>
              {isManagerOrAdmin && (
                <Link href="/dashboard/personnel" className="flex items-center gap-2 px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black border-4 border-black transition-all">
                  <Users className="h-4 w-4" /> Manage Sector
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {employees.length > 0 ? (
                employees.map((emp) => (
                  <Link 
                    key={emp._id} 
                    href={`/dashboard/messages?recipient=${emp._id}`}
                    className="group bg-white border-4 border-black p-4 hover:bg-black transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="w-12 h-12 bg-zinc-100 border-2 border-black flex items-center justify-center font-black text-xl group-hover:bg-white group-hover:text-black">
                        {emp.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="overflow-hidden w-full">
                        <p className="text-[10px] font-black uppercase truncate group-hover:text-white">{emp.name}</p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-zinc-500">{emp.role}</p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full py-12 border-4 border-dashed border-gray-200 text-center">
                  <p className="text-[10px] font-black text-gray-300 uppercase italic">Searching for satellite nodes...</p>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-3 h-12 bg-black"></div>
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tight italic">
                    {isEmployee ? "Active Trajectory" : "Operations Calendar"}
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Chronological Logistics</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white border-8 border-black p-2 shadow-[20px_20px_0px_0px_rgba(0,0,0,0.05)]">
              <CalendarView />
            </div>
          </section>
        </div>
        
        <div className="space-y-8">
          {/* Mission Objectives: Todo */}
          <div className="bg-white border-8 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] flex flex-col min-h-[600px] relative">
            <div className="absolute -top-4 right-8 bg-white border-4 border-black px-4 py-2 flex items-center gap-2 z-20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-black uppercase italic">Live Synchronization</span>
            </div>
            <div className="p-6 border-b-4 border-black bg-black text-white">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                <CheckSquare className="h-5 w-5" /> Mission Roadmap
              </h3>
            </div>
            <div className="flex-1 p-2">
              <TodoApp />
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence Feed: Global Activity */}
      <div className="bg-white border-8 border-black shadow-[25px_25px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="p-8 border-b-8 border-black flex flex-col md:flex-row items-center justify-between bg-black text-white gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-white text-black border-4 border-black shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)]">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-4xl font-black uppercase tracking-tighter italic leading-none">Intelligence Feed</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mt-2">Satellite Node Activity Log</p>
            </div>
          </div>
          <Link href="/dashboard/reports" className="group w-full md:w-auto">
            <div className="flex items-center justify-center gap-3 px-8 py-4 border-4 border-white group-hover:bg-white group-hover:text-black transition-all">
              <span className="text-[10px] font-black uppercase tracking-widest">Access Archives</span>
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </Link>
        </div>
        <div className="divide-y-4 divide-black/5">
          {recentReports.map((report, i) => (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              key={i} 
              className="p-8 flex flex-col md:flex-row items-center justify-between hover:bg-zinc-50 transition-colors gap-6 group"
            >
              <div className="flex items-center gap-6 flex-1 w-full">
                <div className="w-16 h-16 border-4 border-black flex items-center justify-center bg-white group-hover:bg-black group-hover:text-white transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,0.05)]">
                  <FileText className="h-8 w-8" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-2xl font-black uppercase tracking-tight">{report.title}</h3>
                    {i === 0 && <span className="bg-red-600 text-white text-[8px] font-black px-2 py-1 uppercase">Live</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <p className="text-[10px] text-gray-500 font-black uppercase flex items-center gap-2">
                      <Users className="h-3 w-3" /> Node: <span className="text-black">{report.employeeId?.name || "System"}</span>
                    </p>
                    <p className="text-[10px] text-gray-500 font-black uppercase flex items-center gap-2">
                      <CalendarIcon className="h-3 w-3" /> Sync: <span className="text-black">{new Date(report.date).toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button 
                  onClick={() => setSelectedReport(report)}
                  className="w-full md:w-auto px-10 py-5 bg-black text-white text-[10px] font-black uppercase tracking-widest border-4 border-black hover:bg-white hover:text-black transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none"
                >
                  Inspect Packet
                </button>
              </div>
            </motion.div>
          ))}
          {recentReports.length === 0 && (
            <div className="p-32 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-gray-200 mb-6" />
              <p className="text-xl font-black text-gray-300 uppercase tracking-[0.2em]">Waiting for Intelligence Dispatch...</p>
            </div>
          )}
        </div>
        <Link href="/dashboard/reports" className="block w-full py-10 bg-zinc-900 text-white text-center text-[10px] font-black uppercase tracking-[0.6em] hover:bg-black transition-all group">
          <span className="group-hover:translate-x-4 transition-transform inline-block italic">Initialize Full System Audit Sequence &gt;&gt;</span>
        </Link>
      </div>
      {/* Report Details Modal */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReport(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white border-8 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
            >
              <div className="p-8 border-b-4 border-black bg-black text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <FileText className="h-6 w-6 text-yellow-400" />
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight italic">Intelligence Record</h2>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">ID: {selectedReport._id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedReport(null)} className="p-2 border-2 border-white hover:bg-white hover:text-black transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">{selectedReport.title}</h3>
                  <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase text-gray-500">
                    <span className="flex items-center gap-2"><Users className="h-3 w-3" /> Agent: {selectedReport.employeeId?.name}</span>
                    <span className="flex items-center gap-2"><CalendarIcon className="h-3 w-3" /> Timestamp: {new Date(selectedReport.date).toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 border-4 border-black border-dashed">
                  <h4 className="text-[10px] font-black uppercase mb-4 text-black underline decoration-2">Transmitted Content</h4>
                  <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap">{selectedReport.content}</p>
                </div>

                {selectedReport.files && selectedReport.files.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase mb-3 flex items-center gap-2">
                      <Zap className="h-3 w-3 fill-yellow-400 text-yellow-400" /> Attached Data Packets
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedReport.files.map((file: any, idx: number) => (
                        <a 
                          key={idx} 
                          href={file.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 border-2 border-black hover:bg-black hover:text-white transition-all group"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="text-[9px] font-black uppercase truncate flex-1">{file.name || `Packet_${idx+1}`}</span>
                          <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-100 border-t-4 border-black flex justify-end">
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="px-8 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest border-2 border-black hover:bg-white hover:text-black transition-all"
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

