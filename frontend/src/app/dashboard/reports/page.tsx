"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { uploadToCloudinary } from "@/lib/cloudinary";
import axios from "axios";
import { 
  FileText, 
  Plus, 
  Loader2, 
  Calendar,
  User as UserIcon,
  X,
  Trash2,
  Filter,
  Search,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  MessageCircle,
  CircleCheck,
  Eye,
  Send,
  Activity
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeen, setFilterSeen] = useState("all");
  const router = useRouter();

  const [workLog, setWorkLog] = useState<string[]>([""]);

  useEffect(() => {
    const controller = new AbortController();
    const userData = localStorage.getItem("user");
    if (userData) setUser(JSON.parse(userData));
    fetchData(controller);
    return () => controller.abort();
  }, []);

  const fetchData = async (controller?: AbortController) => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterSeen !== 'all') params.append('isSeen', filterSeen);
      if (filterEmployee !== 'all') params.append('employeeId', filterEmployee);

      const [reportsRes, tasksRes, employeesRes] = await Promise.all([
        api.get(`reports?${params.toString()}`, { signal: controller?.signal }),
        api.get("tasks", { signal: controller?.signal }),
        api.get("auth/contacts", { signal: controller?.signal })
      ]);
      
      const reportData = reportsRes.data?.reports || (Array.isArray(reportsRes.data) ? reportsRes.data : []);
      const taskData = tasksRes.data?.tasks || (Array.isArray(tasksRes.data) ? tasksRes.data : []);
      const employeeData = Array.isArray(employeesRes.data) ? employeesRes.data : (employeesRes.data?.users || []);

      setReports(reportData);
      setEmployees(employeeData.filter((u: any) => !u.isDeleted));
      setTasks(taskData.filter((t: any) => t.status !== 'completed'));
    } catch (err: any) {
      if (!axios.isCancel(err) && err.name !== "AbortError") {
        console.error("Failed to fetch reports/tasks", err);
        setReports([]);
        setTasks([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedReportIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Purge ${selectedReportIds.length} intelligence records permanently?`)) return;
    try {
      await api.delete("reports", {
        data: { ids: selectedReportIds },
      });
      setSelectedReportIds([]);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleAddWorkLine = () => setWorkLog([...workLog, ""]);
  const handleUpdateWorkLine = (index: number, value: string) => {
    const newLog = [...workLog];
    newLog[index] = value;
    setWorkLog(newLog);
  };
  const handleRemoveWorkLine = (index: number) => {
    if (workLog.length === 1) {
      setWorkLog([""]);
      return;
    }
    setWorkLog(workLog.filter((_, i) => i !== index));
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const uploadedFiles = await Promise.all(
        files.map(async (f) => {
          const url = await uploadToCloudinary(f);
          return {
            url,
            name: f.name,
            type: f.name.split('.').pop()
          };
        })
      );

      const reportData = {
        title: title || (selectedTask ? tasks.find(t => t._id === selectedTask)?.title : "General Intel"),
        content,
        taskId: selectedTask || null,
        files: uploadedFiles,
        workLog: workLog.filter(line => line.trim() !== "")
      };

      await api.post("reports", reportData);
      setIsModalOpen(false);
      setTitle("");
      setContent("");
      setSelectedTask("");
      setFiles([]);
      fetchData();
    } catch (err: any) {
      console.error('Report submit error:', err);
      setError(err.response?.data?.message || err.message || "Transmission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm('Purge this report from history?')) return;
    try {
      await api.delete(`reports/${id}`);
      setReports(reports.filter((r: any) => r._id !== id));
    } catch (err) { console.error(err); }
  };

  const handleDeleteFile = async (reportId: string, fileUrl: string) => {
    if (!confirm('Permanently purge this artifact evidence?')) return;
    try {
      await api.post('reports/delete-file', { reportId, fileUrl });
      setReports(prev => prev.map(r => {
        if (r._id === reportId) {
          return { ...r, files: r.files.filter((f: any) => f.url !== fileUrl) };
        }
        return r;
      }));
    } catch (err) { console.error("Failed to delete file", err); }
  };

  const handleMarkDone = async (id: string) => {
    try {
      await api.patch(`reports/${id}/done`);
      setReports(prev => prev.map(r => r._id === id ? { ...r, status: 'done' } : r));
    } catch (err) { console.error(err); }
  };

  const handleMarkSeen = async (id: string) => {
    try {
      await api.patch(`reports/${id}/seen`);
      setReports(prev => prev.map(r => r._id === id ? { ...r, isSeen: true } : r));
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center p-32 opacity-40">
      <Loader2 className="animate-spin h-12 w-12 text-black mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">establishing data link...</p>
    </div>
  );

  const isEmployee = user?.role === 'employee';

  return (
    <div className="space-y-12 pb-24">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-1.5 bg-zinc-950 rounded-full"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Intelligence Archive</span>
          </div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-950 uppercase italic"
          >
            Strategic <span className="text-zinc-200 not-italic font-light">Nexus</span>
          </motion.h1>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400 italic flex items-center gap-3">
            <div className="w-8 h-[1px] bg-zinc-200" /> Vault Protocol Active // {reports.length} Records
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          {user?.role !== 'employee' && (
            <div className="flex flex-wrap gap-3 p-2 bg-zinc-50 rounded-[2rem] border border-zinc-100">
              <div className="relative">
                <select 
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="bg-white border border-zinc-100 rounded-[1.5rem] pl-6 pr-10 py-4 text-[9px] font-black uppercase tracking-widest outline-none focus:border-zinc-950 transition-all appearance-none shadow-sm min-w-[180px]"
                >
                  <option value="all">ALL_NODES</option>
                  {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name.toUpperCase()}</option>)}
                </select>
                <Filter className="absolute right-4 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-300 pointer-events-none" />
              </div>

              {user?.role === 'admin' && (
                <>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-white border border-zinc-100 rounded-[1.5rem] px-6 py-4 text-[9px] font-black uppercase tracking-widest outline-none focus:border-zinc-950 transition-all appearance-none shadow-sm"
                  >
                    <option value="all">ANY_STATUS</option>
                    <option value="pending">PENDING</option>
                    <option value="done">VERIFIED</option>
                  </select>
                  <select 
                    value={filterSeen}
                    onChange={(e) => setFilterSeen(e.target.value)}
                    className="bg-white border border-zinc-100 rounded-[1.5rem] px-6 py-4 text-[9px] font-black uppercase tracking-widest outline-none focus:border-zinc-950 transition-all appearance-none shadow-sm"
                  >
                    <option value="all">ANY_VISIBILITY</option>
                    <option value="true">READ</option>
                    <option value="false">UNREAD</option>
                  </select>
                </>
              )}
            </div>
          )}

          <div className="flex gap-4">
            {selectedReportIds.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-3 px-8 py-5 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-3xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-rose-900/20"
              >
                <Trash2 className="h-4 w-4" /> Purge ({selectedReportIds.length})
              </button>
            )}
            {isEmployee && (
              <button 
                onClick={() => { setError(null); setIsModalOpen(true); }}
                className="flex items-center gap-4 px-10 py-5 bg-zinc-950 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-3xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/20 group"
              >
                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-500" /> 
                <span>Dispatch Intel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {reports
          .filter(r => filterEmployee === 'all' || r.employeeId?._id === filterEmployee || r.employeeId === filterEmployee)
          .map((report, i) => (
          <motion.div
            key={report._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`group bg-white rounded-[3rem] border transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col p-10 relative overflow-hidden ${
              selectedReportIds.includes(report._id) ? 'border-rose-500 ring-4 ring-rose-500/5' : 'border-zinc-100 shadow-sm'
            }`}
          >
            {/* Background Accent */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-zinc-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 blur-3xl pointer-events-none" />

            <div className="space-y-10 relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={selectedReportIds.includes(report._id)}
                      onChange={() => handleToggleSelect(report._id)}
                      className="w-6 h-6 rounded-xl border-2 border-zinc-100 accent-zinc-950 cursor-pointer transition-all"
                    />
                  </div>
                  <div className="w-16 h-16 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-center text-zinc-300 group-hover:bg-zinc-950 group-hover:text-white group-hover:rotate-12 transition-all duration-700">
                    <FileText className="h-8 w-8" />
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-black uppercase text-zinc-300 block tracking-[0.4em] mb-2 italic">
                    PKT_{report._id.substring(report._id.length - 6)}
                  </span>
                  {report.status === 'done' ? (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-full border border-emerald-100 italic">
                      <Check className="h-3 w-3" /> Verified
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-600 text-[9px] font-black uppercase rounded-full border border-amber-100 italic">
                      <Activity className="h-3 w-3 animate-pulse" /> Pending
                    </div>
                  )}
                </div>
              </div>
              
              <div className="min-h-[140px] space-y-4">
                <h3 className="text-2xl font-black uppercase tracking-tighter text-zinc-950 italic group-hover:text-zinc-950 transition-colors leading-tight">
                  {report.title}
                </h3>
                <p className="text-[13px] text-zinc-500 font-bold leading-relaxed line-clamp-4 italic">
                  {report.content}
                </p>
              </div>

              {report.workLog && report.workLog.length > 0 && (
                <div className="bg-zinc-50/50 rounded-[2.5rem] p-8 space-y-4 border border-zinc-100 group-hover:bg-white group-hover:border-zinc-200 transition-all">
                  <p className="text-[9px] font-black uppercase text-zinc-400 tracking-[0.3em] mb-4 flex items-center gap-3">
                    <div className="w-6 h-[1px] bg-zinc-200" /> Operational Log
                  </p>
                  <div className="space-y-3">
                    {report.workLog.slice(0, 3).map((line: string, idx: number) => (
                      <div key={idx} className="flex gap-4 text-[11px] font-bold text-zinc-600 border-l-2 border-zinc-200 pl-5 py-0.5">
                        <span className="text-zinc-300 font-black tracking-widest">{(idx + 1).toString().padStart(2, '0')}</span>
                        {line}
                      </div>
                    ))}
                  </div>
                  {report.workLog.length > 3 && (
                    <p className="text-[9px] font-black text-zinc-300 uppercase pl-10">+{report.workLog.length - 3} Overflow Sequences</p>
                  )}
                </div>
              )}

              {report.files && report.files.length > 0 && (
                <div className="pt-4 space-y-4">
                  <p className="text-[9px] font-black uppercase text-zinc-400 tracking-[0.3em] flex items-center gap-3">
                    <div className="w-6 h-[1px] bg-zinc-200" /> Evidence Artifacts
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {report.files.map((f: any, idx: number) => (
                      <div key={idx} className="group/file relative">
                        <div className="px-5 py-2.5 bg-white border border-zinc-100 rounded-xl text-[10px] font-black uppercase text-zinc-500 flex items-center gap-3 group-hover/file:border-zinc-950 group-hover/file:text-zinc-950 transition-all shadow-sm">
                          {f.type}
                          {(user?.role === 'admin' || report.employeeId?._id === user?._id) && (
                            <button onClick={() => handleDeleteFile(report._id, f.url)} className="text-zinc-200 hover:text-rose-600 transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-6 pt-10 border-t border-zinc-100 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-950 text-white flex items-center justify-center rounded-2xl text-xl font-black shadow-lg shadow-black/10 group-hover:rotate-6 transition-transform">
                      {report.employeeId?.name?.[0] || '?'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black uppercase text-zinc-950 italic tracking-tighter">{report.employeeId?.name || 'Unknown_Node'}</span>
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] mt-1">{new Date(report.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {!report.isSeen && user?.role === 'admin' && (
                    <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse shadow-lg shadow-rose-500/20" />
                  )}
                </div>
              </div>
            </div>

            {/* Hover Actions */}
            <div className="mt-12 pt-8 border-t border-zinc-50 flex gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 relative z-10">
              <button 
                onClick={() => router.push(`/dashboard/messages?contactId=${report.employeeId?._id || report.employeeId}`)}
                className="flex-1 px-6 py-5 bg-zinc-950 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10"
              >
                Uplink <MessageCircle className="h-4 w-4" />
              </button>
              
              {user?.role === 'admin' && report.status !== 'done' && (
                <button 
                  onClick={() => handleMarkDone(report._id)}
                  className="flex-1 px-6 py-5 bg-emerald-500 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/10"
                >
                  Verify <Check className="h-4 w-4" />
                </button>
              )}

              {user?.role === 'admin' && !report.isSeen && (
                <button 
                  onClick={() => handleMarkSeen(report._id)}
                  className="p-5 bg-white border border-zinc-100 text-zinc-950 rounded-[1.5rem] hover:bg-zinc-50 hover:scale-110 active:scale-95 transition-all shadow-sm"
                >
                  <Eye className="h-5 w-5" />
                </button>
              )}

              {(user?.role === 'admin' || report.employeeId?._id === user?._id) && (
                <button
                  onClick={() => handleDeleteReport(report._id)}
                  className="p-5 bg-white border border-zinc-100 text-rose-500 rounded-[1.5rem] hover:bg-rose-50 hover:border-rose-100 hover:scale-110 active:scale-95 transition-all shadow-sm"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="py-48 flex flex-col items-center justify-center text-center space-y-10 bg-zinc-50/50 rounded-[5rem] border-2 border-dashed border-zinc-100 relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-zinc-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
          <div className="p-16 bg-white rounded-full shadow-2xl border border-zinc-50 relative z-10 group-hover:scale-110 transition-transform duration-700">
            <FileText className="h-32 w-32 text-zinc-100 group-hover:text-zinc-200 transition-colors" />
            <div className="absolute inset-0 blur-3xl bg-zinc-950/5 rounded-full scale-0 group-hover:scale-150 transition-transform duration-1000" />
          </div>
          <div className="space-y-6 relative z-10">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-zinc-300 italic">Archive Sector Empty</h2>
            <p className="text-[11px] text-zinc-400 uppercase font-black tracking-[0.6em] italic">Waiting for incoming intelligence broadcast packets...</p>
          </div>
        </div>
      )}

      {/* New Report Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[1500] flex items-center justify-center p-6 sm:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-zinc-950/90 backdrop-blur-2xl" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="relative bg-white rounded-[4rem] w-full max-w-6xl p-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-y-auto max-h-[90vh] custom-scrollbar border border-white/20"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-12 right-12 p-5 hover:bg-zinc-50 rounded-[2rem] transition-all text-zinc-300 hover:text-zinc-950 z-50">
                <X className="h-10 w-10" />
              </button>

              <div className="mb-20 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-1.5 bg-zinc-950 rounded-full"></div>
                  <span className="text-[11px] font-black uppercase tracking-[0.5em] text-zinc-400">Transmission sequence</span>
                </div>
                <h2 className="text-5xl font-black uppercase tracking-tighter text-zinc-950 italic leading-none">Intelligence <span className="text-zinc-200 not-italic font-light">Dispatch</span></h2>
                <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.6em] italic flex items-center gap-4">
                   Protocol: Strategic Tactical Observation Log
                </p>
              </div>
              
              <form onSubmit={handleSubmitReport} className="space-y-16">
                {error && (
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-rose-50 border border-rose-100 p-10 rounded-[2.5rem] flex items-center gap-8 shadow-sm">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <AlertCircle className="h-8 w-8 text-rose-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-rose-600 uppercase tracking-tighter italic">Transmission Interrupted</h3>
                      <p className="text-[11px] font-bold text-rose-400 uppercase mt-2 tracking-widest">{error}</p>
                    </div>
                  </motion.div>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                  <div className="space-y-12">
                    <div className="space-y-4">
                      <label className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 px-2 italic">Observation Header</label>
                      <input 
                        required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ENTER MISSION IDENTITY..."
                        className="w-full bg-zinc-50 border border-zinc-100 p-8 text-sm font-black uppercase rounded-3xl outline-none focus:bg-white focus:border-zinc-950 transition-all shadow-sm"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 px-2 italic">Target Sector / Task</label>
                      <div className="relative">
                        <select 
                          value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-100 p-8 text-sm font-black uppercase rounded-3xl outline-none focus:bg-white focus:border-zinc-950 transition-all appearance-none shadow-sm"
                        >
                          <option value="">GENERAL_OBSERVATION_STREAM</option>
                          {tasks.map(task => <option key={task._id} value={task._id}>{task.title.toUpperCase()}</option>)}
                        </select>
                        <ChevronRight className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-300 rotate-90 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 px-2 italic">Evidence Artifact Buffer</label>
                      <div className="relative group">
                        <input type="file" multiple onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        <div className="w-full bg-zinc-50 border-2 border-dashed border-zinc-100 rounded-[3rem] p-20 flex flex-col items-center justify-center group-hover:bg-zinc-100 group-hover:border-zinc-200 transition-all duration-700">
                          <Plus className="h-16 w-16 text-zinc-200 mb-6 group-hover:rotate-90 transition-transform duration-700" />
                          <p className="text-[11px] font-black uppercase text-zinc-400 tracking-[0.4em] text-center italic leading-relaxed">
                            {files.length > 0 ? `${files.length} Fragments Staged` : 'Inject Multimedia Artifacts'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-12">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-2">
                        <label className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 italic">Sequential Record Feed</label>
                        <button type="button" onClick={handleAddWorkLine} className="text-[10px] font-black uppercase text-zinc-950 hover:underline flex items-center gap-3 bg-zinc-50 px-4 py-2 rounded-full border border-zinc-100 shadow-sm transition-all hover:bg-white">
                          <Plus className="h-3.5 w-3.5" /> Append Protocol
                        </button>
                      </div>
                      <div className="space-y-5 max-h-[400px] overflow-y-auto pr-6 custom-scrollbar">
                        {workLog.map((line, idx) => (
                          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} key={idx} className="flex gap-4 items-center group/line">
                            <div className="flex-1 relative">
                              <span className="absolute left-8 top-1/2 -translate-y-1/2 text-[11px] font-black text-zinc-200 italic tracking-widest">{(idx + 1).toString().padStart(2, '0')}</span>
                              <input 
                                type="text" value={line} onChange={(e) => handleUpdateWorkLine(idx, e.target.value)} placeholder="DOCUMENT SUB-PROTOCOL ACTION..."
                                className="w-full bg-zinc-50 border border-zinc-100 pl-16 pr-8 py-6 text-[12px] font-black uppercase rounded-2xl outline-none focus:bg-white focus:border-zinc-950 transition-all shadow-sm"
                              />
                            </div>
                            <button type="button" onClick={() => handleRemoveWorkLine(idx)} className="p-5 text-zinc-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover/line:opacity-100">
                              <X className="h-6 w-6" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 px-2 italic">Intelligence Findings Deep Dive</label>
                      <textarea 
                        required value={content} onChange={(e) => setContent(e.target.value)} rows={8}
                        placeholder="ENTER EXTENSIVE OPERATIONAL FINDINGS..."
                        className="w-full bg-zinc-50 border border-zinc-100 p-10 text-[12px] font-bold uppercase rounded-[3rem] outline-none focus:bg-white focus:border-zinc-950 transition-all shadow-sm resize-none min-h-[300px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8 pt-16 border-t border-zinc-100">
                  <button 
                    type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-8 bg-zinc-50 text-zinc-400 text-[11px] font-black uppercase tracking-[0.5em] rounded-[2.5rem] hover:bg-zinc-100 transition-all shadow-sm italic"
                  >
                    Abort Dispatch
                  </button>
                  <button 
                    disabled={submitting}
                    className="flex-[2] py-8 bg-zinc-950 text-white text-[12px] font-black uppercase tracking-[0.5em] rounded-[2.5rem] hover:scale-[1.02] active:scale-95 transition-all shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] flex items-center justify-center gap-6 disabled:opacity-50 group italic"
                  >
                    {submitting ? <Loader2 className="animate-spin h-7 w-7" /> : <Send className="h-7 w-7 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                    {submitting ? "SYNCHRONIZING..." : "Initiate Final Transmission"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
