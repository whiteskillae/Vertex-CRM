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
  Check,
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
    <div className="h-full flex flex-col items-center justify-center p-32">
      <Loader2 className="animate-spin h-10 w-10 text-zinc-200 mb-4" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Establishing link...</p>
    </div>
  );

  const isEmployee = user?.role === 'employee';

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-24">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-zinc-100 pb-10">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 uppercase">
            Strategic <span className="text-zinc-300">Nexus</span>
          </h1>
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2 italic">
            <Activity className="h-3.5 w-3.5 text-zinc-300" /> Vault Intelligence // {reports.length} Packets
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {user?.role !== 'employee' && (
            <div className="flex flex-wrap gap-2 p-1.5 bg-zinc-50 rounded-2xl border border-zinc-100">
              <select 
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="bg-white border border-zinc-200 rounded-xl px-4 py-2 text-[9px] font-bold uppercase tracking-widest outline-none focus:border-zinc-950 transition-all shadow-sm"
              >
                <option value="all">ALL NODES</option>
                {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name.toUpperCase()}</option>)}
              </select>

              {user?.role === 'admin' && (
                <>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-white border border-zinc-200 rounded-xl px-4 py-2 text-[9px] font-bold uppercase tracking-widest outline-none focus:border-zinc-950 transition-all shadow-sm"
                  >
                    <option value="all">ANY STATUS</option>
                    <option value="pending">PENDING</option>
                    <option value="done">VERIFIED</option>
                  </select>
                </>
              )}
            </div>
          )}

          <div className="flex gap-3">
            {selectedReportIds.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-6 py-3 bg-rose-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Purge ({selectedReportIds.length})
              </button>
            )}
            {isEmployee && (
              <button 
                onClick={() => { setError(null); setIsModalOpen(true); }}
                className="flex items-center gap-2 px-8 py-3.5 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-black/10"
              >
                <Plus className="h-4 w-4" /> Dispatch Intel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {reports
          .filter(r => filterEmployee === 'all' || r.employeeId?._id === filterEmployee || r.employeeId === filterEmployee)
          .map((report, i) => (
          <motion.div
            key={report._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group bg-white rounded-3xl border transition-all duration-300 p-8 flex flex-col relative overflow-hidden ${
              selectedReportIds.includes(report._id) ? 'border-rose-300 ring-2 ring-rose-500/5' : 'border-zinc-100 shadow-sm'
            }`}
          >
            <div className="space-y-6 relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <input 
                    type="checkbox" 
                    checked={selectedReportIds.includes(report._id)}
                    onChange={() => handleToggleSelect(report._id)}
                    className="w-5 h-5 rounded-lg border-zinc-200 accent-zinc-950 cursor-pointer"
                  />
                  <div className="w-12 h-12 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-center text-zinc-300 group-hover:bg-zinc-950 group-hover:text-white transition-all">
                    <FileText className="h-6 w-6" />
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[8px] font-bold uppercase text-zinc-300 block tracking-widest mb-1.5">
                    ID_{report._id.substring(report._id.length - 6)}
                  </span>
                  {report.status === 'done' ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-bold uppercase rounded-full border border-emerald-100 italic">
                      <Check className="h-3 w-3" /> Verified
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-[8px] font-bold uppercase rounded-full border border-amber-100 italic">
                      <Activity className="h-3 w-3 animate-pulse" /> Pending
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-lg font-bold uppercase tracking-tight text-zinc-950 italic">
                  {report.title}
                </h3>
                <p className="text-[12px] text-zinc-500 font-semibold leading-relaxed line-clamp-3">
                  {report.content}
                </p>
              </div>

              {report.workLog && report.workLog.length > 0 && (
                <div className="bg-zinc-50/50 rounded-2xl p-6 space-y-3 border border-zinc-100">
                  <p className="text-[8px] font-bold uppercase text-zinc-400 tracking-widest mb-2 flex items-center gap-2">
                    Operational Log
                  </p>
                  <div className="space-y-2">
                    {report.workLog.slice(0, 2).map((line: string, idx: number) => (
                      <div key={idx} className="flex gap-3 text-[10px] font-bold text-zinc-600 border-l-2 border-zinc-200 pl-4 py-0.5">
                        <span className="text-zinc-300 font-bold tracking-widest">{idx + 1}</span>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-50 border border-zinc-100 text-zinc-950 flex items-center justify-center rounded-xl text-lg font-bold shadow-sm">
                    {report.employeeId?.name?.[0] || '?'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-zinc-950 italic">{report.employeeId?.name || 'Unknown'}</span>
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{new Date(report.date).toLocaleDateString()}</span>
                  </div>
                </div>
                {!report.isSeen && user?.role === 'admin' && (
                  <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-lg" />
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <button 
                  onClick={() => router.push(`/dashboard/messages?contactId=${report.employeeId?._id || report.employeeId}`)}
                  className="flex-1 py-3 bg-zinc-950 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all"
                >
                  Uplink <MessageCircle className="h-3.5 w-3.5" />
                </button>
                
                {user?.role === 'admin' && report.status !== 'done' && (
                  <button 
                    onClick={() => handleMarkDone(report._id)}
                    className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all"
                  >
                    Verify <Check className="h-3.5 w-3.5" />
                  </button>
                )}

                {(user?.role === 'admin' || report.employeeId?._id === user?._id) && (
                  <button
                    onClick={() => handleDeleteReport(report._id)}
                    className="p-3 bg-white border border-zinc-100 text-rose-500 rounded-xl hover:bg-rose-50 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="py-32 flex flex-col items-center justify-center text-center space-y-6 bg-zinc-50/50 rounded-[2.5rem] border-2 border-dashed border-zinc-100">
          <FileText className="h-16 w-16 text-zinc-100" />
          <div className="space-y-2">
            <h2 className="text-xl font-bold uppercase text-zinc-300 italic">Archive Empty</h2>
            <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest italic">Waiting for incoming intelligence packets...</p>
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[1500] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[2.5rem] w-full max-w-4xl p-10 shadow-2xl overflow-y-auto max-h-[90vh] border border-zinc-100"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 p-3 hover:bg-zinc-50 rounded-xl transition-all text-zinc-400 hover:text-zinc-950">
                <X className="h-6 w-6" />
              </button>

              <div className="mb-10 space-y-2">
                <h2 className="text-3xl font-bold uppercase tracking-tight text-zinc-900 italic">Intel Dispatch</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2 italic">
                  Establishing secure transmission sequence...
                </p>
              </div>
              
              <form onSubmit={handleSubmitReport} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 px-1">Header Identity</label>
                      <input 
                        required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="MISSION TITLE"
                        className="w-full bg-zinc-50 border border-zinc-100 p-4 text-[11px] font-bold uppercase rounded-xl outline-none focus:border-zinc-950 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 px-1">Target Task</label>
                      <select 
                        value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-100 p-4 text-[11px] font-bold uppercase rounded-xl outline-none focus:border-zinc-950 transition-all bg-white"
                      >
                        <option value="">GENERAL OBSERVATION</option>
                        {tasks.map(task => <option key={task._id} value={task._id}>{task.title.toUpperCase()}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 px-1">Evidence Buffer</label>
                      <div className="relative group">
                        <input type="file" multiple onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        <div className="w-full bg-zinc-50 border-2 border-dashed border-zinc-100 rounded-2xl p-12 flex flex-col items-center justify-center group-hover:bg-zinc-100 transition-all">
                          <Plus className="h-8 w-8 text-zinc-200 mb-2" />
                          <p className="text-[9px] font-bold uppercase text-zinc-400 tracking-widest text-center">
                            {files.length > 0 ? `${files.length} Files Staged` : 'Upload Artifacts'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Sequential Log</label>
                        <button type="button" onClick={handleAddWorkLine} className="text-[8px] font-bold uppercase text-zinc-900 flex items-center gap-1 px-2 py-1 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-all">
                          <Plus className="h-3 w-3" /> Append
                        </button>
                      </div>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {workLog.map((line, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input 
                              type="text" value={line} onChange={(e) => handleUpdateWorkLine(idx, e.target.value)} placeholder="PROTOCOL ACTION"
                              className="flex-1 bg-zinc-50 border border-zinc-100 p-4 text-[10px] font-bold uppercase rounded-xl outline-none focus:border-zinc-950 transition-all"
                            />
                            <button type="button" onClick={() => handleRemoveWorkLine(idx)} className="p-3 text-zinc-300 hover:text-rose-500 transition-all">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 px-1">Observation Findings</label>
                      <textarea 
                        required value={content} onChange={(e) => setContent(e.target.value)} rows={6}
                        placeholder="ENTER FINDINGS..."
                        className="w-full bg-zinc-50 border border-zinc-100 p-6 text-[11px] font-bold uppercase rounded-2xl outline-none focus:border-zinc-950 transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-10 border-t border-zinc-100">
                  <button 
                    type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-zinc-50 text-zinc-400 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-100 transition-all italic"
                  >
                    Abort
                  </button>
                  <button 
                    disabled={submitting}
                    className="flex-[2] py-4 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-3 disabled:opacity-50 italic"
                  >
                    {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
                    {submitting ? "SYNCHRONIZING..." : "Initiate Transmission"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 bg-rose-500 text-white rounded-xl shadow-2xl z-[2000] flex items-center gap-3">
            <AlertCircle className="h-4 w-4" />
            <p className="text-[10px] font-bold uppercase tracking-widest">{error}</p>
            <button onClick={() => setError(null)} className="ml-2"><X className="h-3.5 w-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
