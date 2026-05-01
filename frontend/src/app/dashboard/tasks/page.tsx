"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { uploadToCloudinary } from "@/lib/cloudinary";
import axios from "axios";
import { 
  CheckCircle2, Circle, Clock, AlertCircle, Loader2, Plus, Send, Calendar, 
  X, Target, Trash2, RotateCcw, History, FileSpreadsheet, AlertTriangle,
  ChevronDown, ChevronUp, MoreVertical, FileText, ExternalLink, Filter, Search,
  ChevronRight, ArrowRight, User as UserIcon, Edit, Upload
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useTrash } from "@/hooks/useTrash";

export default function TasksPage() {
  const { user } = useAuth();
  const { addToTrash, getByType, removeFromTrash, clearTrash } = useTrash();

  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "trash">("active");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [selectedTaskHistory, setSelectedTaskHistory] = useState<any[] | null>(null);
  
  const [redoTaskId, setRedoTaskId] = useState<string | null>(null);
  const [redoMessage, setRedoMessage] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssignedTo, setNewAssignedTo] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [processing, setProcessing] = useState(false);

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("tasks");
      const taskData = data?.tasks || (Array.isArray(data) ? data : []);
      setTasks(taskData);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const contacts = await api.get('auth/contacts');
      const data = contacts.data;
      const contactList = Array.isArray(data) ? data : (data?.users || []);
      // Reverting to less restrictive filter as requested/manually edited by user
      const filtered = contactList.filter((e: any) => !e.isDeleted);
      setEmployees(filtered);
    } catch (err) {
      console.error("Failed to fetch contacts", err);
      setEmployees([]);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchEmployees();
      api.post("auth/mark-read", { field: "tasks" });
    }
  }, [user, fetchTasks, fetchEmployees]);

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const payload: any = {
        title: newTitle,
        description: newDescription,
        priority: newPriority,
        dueDate: newDueDate
      };

      if (newAssignedTo) {
        payload.assignedTo = newAssignedTo;
      } else if (!editingTask) {
        // Only require assignedTo for new tasks if not editing
        payload.assignedTo = "";
      }

      if (editingTask) await api.put(`tasks/${editingTask._id}`, payload);
      else await api.post("tasks", payload);

      setIsModalOpen(false);
      resetForm();
      fetchTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setEditingTask(null);
    setNewTitle("");
    setNewDescription("");
    setNewAssignedTo("");
    setNewPriority("medium");
    setNewDueDate("");
  };

  const handleStatusUpdate = async (taskId: string, status: string) => {
    try {
      await api.put(`tasks/${taskId}`, { status });
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  const handleTaskSubmit = async (taskId: string) => {
    if (!submissionText.trim()) return alert("Submission notes required.");
    setProcessing(true);
    try {
      let attachmentUrl = null;
      if (submissionFile) {
        attachmentUrl = await uploadToCloudinary(submissionFile);
      }
      await api.post(`tasks/${taskId}/submit`, {
        submission: submissionText,
        attachmentUrl
      });
      setSubmittingId(null);
      setSubmissionText("");
      setSubmissionFile(null);
      fetchTasks();
    } catch (err) { console.error(err); }
    finally { setProcessing(false); }
  };

  const handleApprove = async (taskId: string) => {
    try {
      await api.post(`tasks/${taskId}/approve`);
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  const handleRedo = async () => {
    if (!redoMessage.trim()) return alert("Revision instructions required.");
    try {
      await api.post(`tasks/${redoTaskId}/reassign`, { message: redoMessage });
      setRedoTaskId(null);
      setRedoMessage("");
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  const handleDeleteTask = async (task: any) => {
    if (!confirm(`Move "${task.title}" to local trash hub?`)) return;
    try {
      addToTrash({ id: task._id, type: "task", data: task });
      await api.delete(`tasks/${task._id}`);
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  const handleRestoreTask = async (trashId: string, taskData: any) => {
    setProcessing(true);
    try {
      const cleanData = { ...taskData };
      delete cleanData._id; delete cleanData.createdAt; delete cleanData.updatedAt;
      await api.post("tasks", cleanData);
      removeFromTrash(trashId);
      fetchTasks();
    } catch (err) { console.error(err); }
    finally { setProcessing(false); }
  };

  const trashedTasks = getByType("task");

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case 'urgent': return 'bg-red-50 text-red-700 border-red-600';
      case 'high': return 'bg-orange-50 text-orange-700 border-orange-600';
      case 'medium': return 'bg-blue-50 text-blue-700 border-blue-600';
      default: return 'bg-gray-50 text-gray-700 border-gray-600';
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-[1400px] mx-auto px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic text-black leading-none">Mission Control</h1>
          <p className="text-[10px] uppercase tracking-[0.4em] font-black text-gray-400 mt-2">Operational Lifecycle — Strategic Tasking Hub</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isAdminOrManager && (
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center px-8 py-4 bg-black text-white text-[11px] font-black uppercase tracking-[0.3em] border-4 border-black hover:bg-zinc-900 transition-all shadow-[10px_10px_0px_0px_rgba(220,38,38,0.2)] active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              <Plus className="mr-3 h-5 w-5" /> Provision New Mission
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-4 border-black overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab("active")} 
          className={`px-10 py-4 text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'active' ? 'bg-black text-white' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
        >
          Active Assignments ({tasks.length})
        </button>
        <button 
          onClick={() => setActiveTab("trash")} 
          className={`px-10 py-4 text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'trash' ? 'bg-red-600 text-white' : 'text-red-600 hover:bg-red-50'}`}
        >
          Trash Hub ({trashedTasks.length})
        </button>
      </div>

      {activeTab === 'active' ? (
        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="p-32 flex flex-col items-center justify-center border-4 border-black bg-white shadow-[10px_10px_0px_0px_rgba(0,0,0,0.05)]">
              <Loader2 className="animate-spin h-12 w-12 text-black mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">establishing downlink...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-24 text-center border-4 border-black bg-white opacity-40 italic">
              <p className="text-sm font-black uppercase tracking-widest">No active deployments detected in this sector</p>
            </div>
          ) : (
            tasks.map((task) => (
              <motion.div 
                key={task._id} 
                layout
                className="bg-white border-4 border-black p-6 md:p-8 hover:shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] transition-all group overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Phase Indicator */}
                  <div className="flex lg:flex-col items-center gap-4">
                    <div className={`w-16 h-16 flex-shrink-0 border-4 border-black flex items-center justify-center ${task.status === 'completed' ? 'bg-black text-white' : 'bg-white text-black'}`}>
                      {task.status === 'completed' ? <CheckCircle2 className="h-8 w-8" /> : task.status === 'review' ? <Clock className="h-8 w-8 animate-pulse" /> : <Target className="h-8 w-8" />}
                    </div>
                    <div className="flex flex-col lg:items-center">
                      <span className="text-[8px] font-black uppercase text-gray-400">Phase</span>
                      <span className="text-[10px] font-black uppercase">{task.status}</span>
                    </div>
                  </div>

                  {/* Intelligence Data */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-none">{task.title}</h3>
                          <span className={`px-3 py-1 text-[9px] font-black uppercase border-2 ${getPriorityStyle(task.priority)}`}>{task.priority}</span>
                          {new Date(task.dueDate) < new Date() && task.status !== 'completed' && (
                            <span className="text-[9px] font-black uppercase bg-red-600 text-white px-2 py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">OVERDUE</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 font-bold leading-relaxed max-w-3xl">{task.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-black bg-yellow-50 px-3 py-1 border-2 border-yellow-500">
                          <UserIcon className="h-3 w-3" /> {task.assignedTo?.name || 'GLOBAL_TASK'}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400">
                          <Calendar className="h-3 w-3" /> Deadline: {task.dueDate ? format(new Date(task.dueDate), "dd MMM yyyy") : 'UNSET'}
                        </div>
                      </div>
                    </div>

                    {/* Mission Success Indicator */}
                    {task.status === 'completed' && (
                      <div className="mt-6 px-4 py-3 bg-green-50 border-2 border-green-600 flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(22,163,74,0.1)]">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-[10px] font-black uppercase text-green-700 tracking-widest">Protocol: Mission Successfully Concluded / Approved</span>
                      </div>
                    )}

                    {/* Revision Feedback for Redo */}
                    {task.status === 'todo' && task.reassignmentMessage && (
                      <div className="mt-6 p-6 bg-orange-50 border-4 border-orange-500 shadow-[8px_8px_0px_0px_rgba(249,115,22,0.1)]">
                        <div className="flex items-center gap-2 mb-3">
                          <RotateCcw className="h-4 w-4 text-orange-600 animate-spin-slow" />
                          <span className="text-[9px] font-black uppercase text-orange-600 tracking-widest">Revision Intelligence Received</span>
                        </div>
                        <p className="text-sm font-bold text-orange-900 leading-relaxed italic">"{task.reassignmentMessage}"</p>
                        <p className="text-[8px] font-black uppercase text-orange-400 mt-3">Action Required: Refine mission objectives based on admin feedback above.</p>
                      </div>
                    )}

                    {/* Operational Feedback Section */}
                    {(task.status === 'review' || task.status === 'completed') && (task.submission || task.submissionAttachment) && (
                      <div className="mt-8 p-6 bg-zinc-900 text-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-zinc-800 pb-4">
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2">
                            <ArrowRight className="h-3 w-3" /> Mission Outcomes Data
                          </span>
                          {task.submissionAttachment && (
                            <a 
                              href={task.submissionAttachment} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-white text-black text-[9px] font-black uppercase border-2 border-white hover:bg-black hover:text-white transition-all flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none"
                            >
                              View Mission Artifact <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        {task.submission ? (
                          <p className="text-sm font-bold leading-relaxed italic">"{task.submission}"</p>
                        ) : (
                          <p className="text-[10px] font-black uppercase text-zinc-600 italic">No textual transmission included</p>
                        )}
                      </div>
                    )}

                    {/* Employee Operations Console */}
                    <AnimatePresence>
                      {submittingId === task._id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-8 pt-8 border-t-4 border-black border-dashed">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-widest block">Operational Report (Text Only)</label>
                              <textarea 
                                value={submissionText} 
                                onChange={(e) => setSubmissionText(e.target.value)} 
                                placeholder="Describe the outcome of this deployment..." 
                                className="w-full p-6 border-4 border-black text-sm font-bold outline-none min-h-[150px] focus:bg-zinc-50 transition-all" 
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-widest block text-zinc-400 italic">Artifact Evidence (PDF/XLSX/PNG) — OPTIONAL</label>
                              <div className="h-[150px] border-4 border-black border-dashed flex flex-col items-center justify-center p-8 hover:bg-zinc-50 transition-all relative cursor-pointer group">
                                <input 
                                  type="file" 
                                  className="absolute inset-0 opacity-0 cursor-pointer" 
                                  onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)} 
                                />
                                <Upload className="h-10 w-10 text-gray-300 mb-3 group-hover:scale-110 transition-transform" />
                                <p className="text-[10px] font-black uppercase text-center text-gray-500">
                                  {submissionFile ? submissionFile.name : 'Drop Artifact or Scan Drive'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-6 items-center">
                            <button onClick={() => setSubmittingId(null)} className="text-[11px] font-black uppercase underline hover:text-red-600 transition-colors">Abort Submission</button>
                            <button onClick={() => handleTaskSubmit(task._id)} disabled={processing} className="px-10 py-4 bg-black text-white text-[11px] font-black uppercase tracking-widest border-4 border-black hover:bg-zinc-900 transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
                              {processing ? <Loader2 className="animate-spin h-5 w-5" /> : 'Execute Transmission'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Strategy Actions */}
                  <div className="flex flex-row lg:flex-col justify-end gap-3 lg:w-48">
                    {isAdminOrManager && (
                      <>
                        {task.status === 'review' && (
                          <div className="flex lg:flex-col gap-3 w-full">
                            <button onClick={() => handleApprove(task._id)} className="flex-1 flex items-center justify-center gap-2 px-4 py-4 bg-green-600 text-white text-[10px] font-black uppercase border-4 border-black hover:bg-green-700 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none">
                              <CheckCircle2 className="h-4 w-4" /> Finalize
                            </button>
                            <button onClick={() => setRedoTaskId(task._id)} className="flex-1 flex items-center justify-center gap-2 px-4 py-4 bg-orange-500 text-white text-[10px] font-black uppercase border-4 border-black hover:bg-orange-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none">
                              <RotateCcw className="h-4 w-4" /> Re-Task
                            </button>
                          </div>
                        )}
                        <div className="flex gap-3 w-full">
                          <button 
                            onClick={() => { 
                              setEditingTask(task); 
                              setNewTitle(task.title); 
                              setNewDescription(task.description || ""); 
                              const assigneeId = typeof task.assignedTo === 'object' ? task.assignedTo?._id : task.assignedTo;
                              setNewAssignedTo(assigneeId || ""); 
                              setNewPriority(task.priority); 
                              setNewDueDate(task.dueDate ? task.dueDate.split('T')[0] : ""); 
                              setIsModalOpen(true); 
                            }} 
                            className="flex-1 p-3 border-4 border-black hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none"
                          >
                            <Edit className="h-5 w-5 mx-auto" />
                          </button>
                          <button 
                            onClick={() => handleDeleteTask(task)} 
                            className="flex-1 p-3 border-4 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(220,38,38,0.1)] hover:shadow-none"
                          >
                            <Trash2 className="h-5 w-5 mx-auto" />
                          </button>
                        </div>
                      </>
                    )}
                    {user?.role === 'employee' && task.status === 'todo' && !submittingId && (
                      <button onClick={() => setSubmittingId(task._id)} className="w-full py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] border-4 border-black hover:bg-zinc-900 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none">
                        Report Outcomes
                      </button>
                    )}
                    <button onClick={() => setSelectedTaskHistory(task.history)} className="p-3 border-4 border-gray-200 text-gray-400 hover:border-black hover:text-black transition-all" title="View Audit Logs">
                      <History className="h-5 w-5 mx-auto" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        /* TRASH HUB */
        <div className="space-y-6">
          <div className="p-6 bg-red-50 border-4 border-red-600 flex flex-col md:flex-row md:items-center gap-6 shadow-[10px_10px_0px_0px_rgba(220,38,38,0.1)]">
            <AlertTriangle className="h-10 w-10 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-black uppercase text-red-800 tracking-widest">Local Deployment Archive Protocol</p>
              <p className="text-[11px] font-bold text-red-600 uppercase mt-1">Trashed missions are restricted from the live grid. Purging is permanent.</p>
            </div>
            <button onClick={() => { if(confirm("Permanently delete all archived data?")) clearTrash(); }} className="px-8 py-4 bg-red-600 text-white text-[10px] font-black uppercase border-4 border-black hover:bg-red-700 transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">Clear Archive Hub</button>
          </div>
          
          {trashedTasks.length === 0 ? (
            <div className="p-24 text-center border-4 border-black bg-white opacity-40 italic">
              <p className="text-sm font-black uppercase tracking-widest">Archive is currently empty</p>
            </div>
          ) : (
            trashedTasks.map((item) => (
              <div key={item.id} className="p-6 border-4 border-black bg-white flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-red-50/10 transition-all shadow-[10px_10px_0px_0px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-gray-100 border-4 border-black text-gray-400 flex items-center justify-center"><Trash2 className="h-5 w-5" /></div>
                  <div>
                    <p className="text-lg font-black uppercase italic leading-none">{item.data.title}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 italic">Purged: {new Date(item.deletedAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleRestoreTask(item.id, item.data)} className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase border-4 border-black hover:bg-green-600 hover:border-green-600 transition-all">Restore Mission</button>
                  <button onClick={() => removeFromTrash(item.id)} className="p-3 border-4 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all"><X className="h-5 w-5" /></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals Container */}
      <AnimatePresence>
        {/* Re-Task Modal */}
        {redoTaskId && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRedoTaskId(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white border-8 border-black w-full max-w-lg p-10 shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-6 border-b-8 border-black pb-4">Issue Revision</h3>
              <textarea 
                value={redoMessage} 
                onChange={e => setRedoMessage(e.target.value)} 
                placeholder="Specify instructions for mission refinement..." 
                className="w-full p-6 border-4 border-black text-sm font-bold outline-none min-h-[150px] mb-8 focus:bg-zinc-50 transition-all" 
              />
              <div className="flex justify-end gap-6 items-center">
                <button onClick={() => setRedoTaskId(null)} className="text-[11px] font-black uppercase underline">Abort</button>
                <button onClick={handleRedo} className="px-10 py-5 bg-black text-white text-[11px] font-black uppercase tracking-widest border-4 border-black hover:bg-zinc-900 transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">Send Instructions</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} className="relative bg-white border-8 border-black w-full max-w-xl p-8 shadow-[25px_25px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-8 border-b-8 border-black pb-4">{editingTask ? "Update Mission" : "Authorize Mission"}</h2>
              <form onSubmit={handleSaveTask} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest block">Mission Title</label>
                  <input required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="ENTER TITLE..." className="w-full border-4 border-black p-5 text-sm font-black uppercase outline-none focus:bg-zinc-50 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest block">Description</label>
                  <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="DEFINE SCOPE..." className="w-full border-4 border-black p-5 text-sm font-bold outline-none min-h-[120px] focus:bg-zinc-50 transition-all" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest block">
                      {editingTask ? "Current Lead / Reassignment" : "Primary Node (Assigned To)"}
                    </label>
                    <select 
                      required={!editingTask}
                      value={newAssignedTo} 
                      onChange={e => setNewAssignedTo(e.target.value)} 
                      className="w-full border-4 border-black p-5 text-sm font-black uppercase outline-none focus:bg-zinc-50 transition-all appearance-none bg-white"
                    >
                      <option value="">{editingTask ? "KEEP CURRENT ASSIGNEE" : "SELECT_PERSONNEL"}</option>
                      {employees.map(e => (
                        <option key={e._id} value={e._id}>
                          {e.name.toUpperCase()} ({e.role})
                        </option>
                      ))}
                    </select>
                    {editingTask && (
                      <p className="text-[8px] font-black uppercase text-gray-400 mt-1">
                        Currently: {typeof editingTask.assignedTo === 'object' ? editingTask.assignedTo?.name?.toUpperCase() : "Unassigned"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest block">Priority Vector</label>
                    <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="w-full border-4 border-black p-5 text-sm font-black uppercase outline-none focus:bg-zinc-50 transition-all appearance-none bg-white">
                      <option value="low">LOW</option>
                      <option value="medium">MEDIUM</option>
                      <option value="high">HIGH</option>
                      <option value="urgent">URGENT</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest block">Deadline Protocol</label>
                  <input required type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="w-full border-4 border-black p-5 text-sm font-black outline-none focus:bg-zinc-50 transition-all" />
                </div>
                <button disabled={processing} className="w-full py-6 bg-black text-white text-[11px] font-black uppercase tracking-[0.3em] border-4 border-black hover:bg-white hover:text-black transition-all shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)]">
                  {processing ? <Loader2 className="animate-spin h-6 w-6 mx-auto" /> : editingTask ? "Update Records" : "Deploy Strategic Unit"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Audit Log / History Modal */}
        {selectedTaskHistory && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTaskHistory(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white border-8 border-black w-full max-w-lg max-h-[80vh] flex flex-col shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]">
              <div className="p-8 border-b-8 border-black flex items-center justify-between bg-black text-white">
                <div>
                  <h3 className="text-2xl font-black uppercase italic leading-none">Audit Logs</h3>
                  <p className="text-[10px] uppercase tracking-[0.3em] mt-1 opacity-60">Historical Event Feed</p>
                </div>
                <button onClick={() => setSelectedTaskHistory(null)} className="p-2 hover:bg-white/20 transition-all"><X className="h-6 w-6" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {selectedTaskHistory.length === 0 ? (
                  <p className="text-center text-gray-300 italic py-10">No history available for this mission.</p>
                ) : (
                  selectedTaskHistory.map((h, i) => (
                    <div key={i} className="flex gap-4 border-l-4 border-black pl-6 relative">
                      <div className="absolute -left-2 top-0 w-3 h-3 bg-black rounded-full"></div>
                      <div>
                        <p className="text-xs font-black uppercase">{h.action}</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1">{new Date(h.timestamp).toLocaleString()}</p>
                        {h.note && <div className="mt-2 p-3 bg-gray-50 border-2 border-gray-100 text-[11px] font-bold italic">"{h.note}"</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
