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
  CheckCircle2,
  Eye,
  CheckCircle
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
  
  // New Report Form
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

  // Tactical Work Log State
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

  const handleAddWorkLine = () => {
    setWorkLog([...workLog, ""]);
  };

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
    } catch (err) {
      console.error(err);
    }
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
    } catch (err) {
      console.error("Failed to delete file", err);
      alert("Failed to purge artifact from record");
    }
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
      <Loader2 className="animate-spin h-12 w-12 text-black mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em]">establishing data link...</p>
    </div>
  );

  const isEmployee = user?.role === 'employee';

  return (
    <div className="space-y-8 pb-20 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic text-black leading-none">Intelligence Archives</h1>
          <p className="text-[10px] uppercase tracking-[0.4em] font-black text-gray-400 mt-2">Centralized Data Nexus — Vault Protocol</p>
        </div>

        {user?.role !== 'employee' && (
          <div className="flex flex-wrap gap-4 flex-1">
            <div className="relative flex-1 max-w-[250px]">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select 
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="w-full bg-white border-4 border-black pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:bg-yellow-50 transition-all appearance-none"
              >
                <option value="all">ALL_MISSION_ASSOCIATES</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.name.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {user?.role === 'admin' && (
              <>
                <div className="relative flex-1 max-w-[200px]">
                  <CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-white border-4 border-black pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:bg-green-50 transition-all appearance-none"
                  >
                    <option value="all">STATUS: ALL</option>
                    <option value="pending">PENDING</option>
                    <option value="done">DONE</option>
                  </select>
                </div>
                <div className="relative flex-1 max-w-[200px]">
                  <Eye className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select 
                    value={filterSeen}
                    onChange={(e) => setFilterSeen(e.target.value)}
                    className="w-full bg-white border-4 border-black pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:bg-blue-50 transition-all appearance-none"
                  >
                    <option value="all">VISIBILITY: ALL</option>
                    <option value="true">SEEN</option>
                    <option value="false">UNSEEN</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          {selectedReportIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-3 px-8 py-4 bg-red-600 text-white text-[11px] font-black uppercase tracking-widest border-4 border-black hover:bg-red-700 transition-all shadow-[8px_8px_0px_0px_rgba(220,38,38,0.2)] active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              <Trash2 className="h-5 w-5" /> Purge Selected ({selectedReportIds.length})
            </button>
          )}
          {isEmployee && (
            <button 
              onClick={() => { setError(null); setIsModalOpen(true); }}
              className="flex items-center gap-3 px-8 py-4 bg-black text-white text-[11px] font-black uppercase tracking-widest border-4 border-black hover:bg-zinc-900 transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              <Plus className="h-5 w-5" /> Dispatch New Intel
            </button>
          )}
        </div>
      </div>

      {/* Database Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {reports
          .filter(r => filterEmployee === 'all' || r.employeeId?._id === filterEmployee || r.employeeId === filterEmployee)
          .map((report, i) => (
          <motion.div
            key={report._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-white border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between group hover:-translate-y-1 transition-all ${selectedReportIds.includes(report._id) ? 'bg-red-50/50 ring-4 ring-red-600 ring-inset' : ''}`}
          >
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={selectedReportIds.includes(report._id)}
                      onChange={() => handleToggleSelect(report._id)}
                      className="w-6 h-6 accent-black border-4 border-black cursor-pointer"
                    />
                  </div>
                  <div className="w-12 h-12 bg-black text-white flex items-center justify-center border-4 border-black group-hover:bg-green-600 transition-colors">
                    <FileText className="h-6 w-6" />
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-black uppercase text-gray-300 block tracking-widest mb-1">
                    ID: {report._id.substring(report._id.length - 8)}
                  </span>
                  {report.status === 'done' ? (
                    <div className="flex items-center justify-end gap-1 text-[10px] font-black uppercase text-green-600">
                      <CheckCircle2 className="h-4 w-4" /> MISSION_DONE
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1 text-[8px] font-black uppercase text-green-600">
                      <ShieldCheck className="h-3 w-3" /> Encrypted_Node
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter line-clamp-1 border-b-4 border-black pb-2 mb-4">
                  {report.title}
                </h3>
                <p className="text-xs text-gray-500 font-bold leading-relaxed line-clamp-4">
                  {report.content}
                </p>
              </div>

              {report.workLog && report.workLog.length > 0 && (
                <div className="bg-zinc-50 border-2 border-black p-4 space-y-2">
                  <p className="text-[8px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">Tactical Record Log</p>
                  {report.workLog.map((line: string, idx: number) => (
                    <div key={idx} className="flex gap-2 text-[10px] font-bold text-black border-l-2 border-black pl-3 py-1">
                      <span className="opacity-30">#{(idx + 1).toString().padStart(2, '0')}</span>
                      {line}
                    </div>
                  ))}
                </div>
              )}

              {report.files && report.files.length > 0 && (
                <div className="pt-4 space-y-3">
                  <p className="text-[8px] font-black uppercase text-gray-400 tracking-[0.2em]">Artifact Evidence ({report.files.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {report.files.map((f: any, idx: number) => (
                      <div key={idx} className="group/file relative flex items-center">
                        <div className="px-3 py-1.5 bg-zinc-50 border-2 border-black text-[9px] font-black uppercase flex items-center gap-2 group-hover/file:bg-black group-hover/file:text-white transition-all">
                          {f.type}
                          {(user?.role === 'admin' || report.employeeId?._id === user?._id) && (
                            <button 
                              onClick={() => handleDeleteFile(report._id, f.url)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-6 border-t-2 border-black/5">
                <div className="flex items-center gap-3 text-[10px] font-black uppercase text-black">
                  <div className="w-6 h-6 bg-gray-100 flex items-center justify-center rounded-full"><UserIcon className="h-3 w-3" /></div>
                  Origin: {report.employeeId?.name || 'Unknown Node'}
                </div>
                <div className="flex items-center gap-3 text-[10px] font-black uppercase text-gray-400">
                  <div className="w-6 h-6 bg-gray-50 flex items-center justify-center rounded-full"><Calendar className="h-3 w-3" /></div>
                  Logged: {new Date(report.date).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t-4 border-black flex flex-wrap gap-3">
              <button 
                onClick={() => router.push(`/dashboard/messages?contactId=${report.employeeId?._id || report.employeeId}`)}
                className="flex-1 flex items-center justify-center gap-3 py-4 bg-black text-white text-[10px] font-black uppercase border-4 border-black hover:bg-white hover:text-black transition-all"
              >
                Message <MessageCircle className="h-4 w-4" />
              </button>
              
              {user?.role === 'admin' && report.status !== 'done' && (
                <button 
                  onClick={() => handleMarkDone(report._id)}
                  className="flex-1 flex items-center justify-center gap-3 py-4 bg-green-600 text-white text-[10px] font-black uppercase border-4 border-black hover:bg-white hover:text-green-600 transition-all shadow-[4px_4px_0px_0px_rgba(22,163,74,0.1)]"
                >
                  Mark Done <CheckCircle2 className="h-4 w-4" />
                </button>
              )}

              {user?.role === 'admin' && !report.isSeen && (
                <button 
                  onClick={() => handleMarkSeen(report._id)}
                  className="p-4 border-4 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
                  title="Mark as Seen"
                >
                  <Eye className="h-5 w-5" />
                </button>
              )}

              {(user?.role === 'admin' || report.employeeId?._id === user?._id) && (
                <button
                  onClick={() => handleDeleteReport(report._id)}
                  className="p-4 border-4 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(220,38,38,0.1)] active:shadow-none"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="p-48 text-center flex flex-col items-center gap-8 bg-white border-8 border-dashed border-gray-100">
          <div className="p-10 bg-gray-50 border-4 border-gray-100 rounded-full animate-pulse">
            <FileText className="h-20 w-20 text-gray-200" />
          </div>
          <div className="space-y-3">
            <p className="text-xl text-gray-300 uppercase font-black tracking-[0.4em]">Archive Vacuum Detected</p>
            <p className="text-[10px] text-gray-200 uppercase font-black tracking-widest">Waiting for incoming intelligence data packets</p>
          </div>
        </div>
      )}

      {/* New Report Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="relative bg-white border-8 border-black w-full max-w-4xl p-12 shadow-[40px_40px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-4 bg-black"></div>
              <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 p-3 hover:bg-black hover:text-white border-4 border-transparent hover:border-black transition-all">
                <X className="h-8 w-8" />
              </button>

              <div className="mb-12">
                <h2 className="text-5xl font-black uppercase tracking-tighter italic leading-none">Transmission Dispatch</h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.6em] mt-3">Protocol: Tactical Intel Log</p>
              </div>
              
              <form onSubmit={handleSubmitReport} className="space-y-10">
                {error && (
                  <div className="bg-red-50 border-8 border-red-600 p-8 shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] flex items-center gap-6">
                    <AlertCircle className="h-10 w-10 text-red-600 flex-shrink-0" />
                    <div>
                      <h3 className="text-xl font-black text-red-600 uppercase italic tracking-tighter">Transmission Error</h3>
                      <p className="text-[11px] font-black text-red-800 uppercase tracking-widest mt-1">{error}</p>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-[0.2em] mb-3">Intelligence Title</label>
                      <input 
                        required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="LOG_DESIGNATION"
                        className="w-full bg-white border-4 border-black p-6 text-sm font-black uppercase focus:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-[0.2em] mb-3">Target Mission Associate</label>
                      <select 
                        value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)}
                        className="w-full bg-white border-4 border-black p-6 text-sm font-black uppercase focus:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] outline-none transition-all appearance-none"
                      >
                        <option value="">GENERAL_DEPLOYMENT</option>
                        {tasks.map(task => (
                          <option key={task._id} value={task._id}>{task.title}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-[0.2em] mb-3">Evidence Matrix (Max 20MB)</label>
                      <div className="relative group">
                        <input type="file" multiple onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        <div className="w-full bg-white border-4 border-black p-10 flex flex-col items-center justify-center group-hover:bg-zinc-50 transition-all border-dashed">
                          <Plus className="h-10 w-10 text-gray-200 mb-4 group-hover:scale-125 transition-transform" />
                          <p className="text-[10px] font-black uppercase text-gray-400">
                            {files.length > 0 ? `${files.length} ARTIFACTS STAGED` : 'SCAN FILES INTO LOG'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-[11px] font-black uppercase tracking-[0.2em]">Tactical Work Record</label>
                        <button 
                          type="button" 
                          onClick={handleAddWorkLine}
                          className="px-3 py-1 bg-black text-white text-[9px] font-black uppercase border-2 border-black hover:bg-white hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                        >
                          + Add Line Entry
                        </button>
                      </div>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {workLog.map((line, idx) => (
                          <div key={idx} className="flex gap-3">
                            <div className="flex-1 relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300">#{idx + 1}</span>
                              <input 
                                type="text" 
                                value={line} 
                                onChange={(e) => handleUpdateWorkLine(idx, e.target.value)}
                                placeholder="DOCUMENT ACTION ITEM..."
                                className="w-full bg-white border-4 border-black pl-12 pr-4 py-4 text-[10px] font-black uppercase focus:bg-yellow-50 outline-none transition-all"
                              />
                            </div>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveWorkLine(idx)}
                              className="px-4 border-4 border-black hover:bg-red-600 hover:text-white transition-all text-gray-400"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-[0.2em] mb-3">Mission Intelligence (Global Findings)</label>
                      <textarea 
                        required value={content} onChange={(e) => setContent(e.target.value)} rows={6}
                        placeholder="ENTER DETAILED OBSERVATIONS..."
                        className="w-full bg-white border-4 border-black p-6 text-[10px] font-black uppercase focus:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] outline-none transition-all resize-none min-h-[200px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 pt-10 border-t-8 border-black">
                  <button 
                    type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-6 border-4 border-black text-black text-[11px] font-black uppercase tracking-[0.5em] hover:bg-gray-100 transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]"
                  >
                    Abort Dispatch
                  </button>
                  <button 
                    disabled={submitting}
                    className="flex-[2] py-6 bg-black text-white text-[11px] font-black uppercase tracking-[0.5em] hover:bg-white hover:text-black border-4 border-black transition-all shadow-[12px_12px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none"
                  >
                    {submitting ? "SYNCHRONIZING..." : "Execute Transmission Protocol"}
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
