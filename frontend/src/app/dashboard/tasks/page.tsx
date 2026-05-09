"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { uploadToCloudinary } from "@/lib/cloudinary";
import axios from "axios";
import { 
  CircleCheck, Circle, Clock, AlertCircle, Loader2, Plus, Send, Calendar, 
  X, Target, Trash2, RotateCcw, History, FileSpreadsheet, AlertTriangle,
  ChevronDown, ChevronUp, MoreVertical, FileText, ExternalLink, Filter, Search,
  ChevronRight, ArrowRight, User as UserIcon, Edit, Upload
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useTrash } from "@/hooks/useTrash";

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'todo' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: {
    _id: string;
    name: string;
  } | any;
  dueDate?: string;
  reassignmentMessage?: string;
  submission?: string;
  submissionAttachment?: string;
  history: any[];
  createdAt: string;
}

interface Employee {
  _id: string;
  name: string;
  role: string;
  isDeleted?: boolean;
}

export default function TasksPage() {
  const { user } = useAuth();
  const { addToTrash, getByType, removeFromTrash, clearTrash } = useTrash();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      const contactList: Employee[] = Array.isArray(data) ? data : (data?.users || []);
      const filtered = contactList.filter((e) => !e.isDeleted);
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
      const payload: Partial<Task> & { assignedTo?: string } = {
        title: newTitle,
        description: newDescription,
        priority: newPriority as any,
        dueDate: newDueDate
      };

      if (newAssignedTo) {
        payload.assignedTo = newAssignedTo;
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

  const handleDeleteTask = async (task: Task) => {
    if (!confirm(`Move "${task.title}" to archive?`)) return;
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
      case 'urgent': return 'bg-brand-rose/10 text-brand-rose';
      case 'high': return 'bg-brand-amber/10 text-brand-amber';
      case 'medium': return 'bg-brand-indigo/10 text-brand-indigo';
      default: return 'bg-zinc-100 text-zinc-500';
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 uppercase">
            Task <span className="text-zinc-400">Nexus</span>
          </h1>
          <div className="flex items-center gap-3">
            <div className="w-8 h-0.5 bg-zinc-900 rounded-full" />
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest italic flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-zinc-900" /> Operational efficiency active
            </p>
          </div>
        </div>
        
        {isAdminOrManager && (
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-3 px-8 py-4 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-widest rounded-2xl hover:bg-zinc-800 transition-all shadow-lg"
          >
            <Plus className="h-4 w-4" /> Create New Task
          </button>
        )}
      </div>

      {/* Tabs */}
      {/* Tabs */}
      <div className="flex bg-zinc-100/80 p-1.5 rounded-2xl border border-zinc-200/50 w-fit gap-1">
        <button 
          onClick={() => setActiveTab("active")} 
          className={`px-8 py-3 text-[9px] font-bold uppercase tracking-widest transition-all rounded-xl ${
            activeTab === 'active' ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200/50' : 'text-zinc-400 hover:text-zinc-900'
          }`}
        >
          Active Grid ({tasks.length})
        </button>
        <button 
          onClick={() => setActiveTab("trash")} 
          className={`px-8 py-3 text-[9px] font-bold uppercase tracking-widest transition-all rounded-xl ${
            activeTab === 'trash' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'text-zinc-400 hover:text-rose-500'
          }`}
        >
          Archive Hub ({trashedTasks.length})
        </button>
      </div>

      {activeTab === 'active' ? (
        <div className="space-y-6">
          {loading ? (
            <div className="p-40 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin h-12 w-12 text-black mb-6" />
              <p className="text-[10px] font-bold uppercase tracking-[0.8em] text-zinc-300 animate-pulse">Syncing Grid...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-40 text-center bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
              <p className="text-sm font-bold text-zinc-300 uppercase tracking-[0.4em] italic">No active tasks in this sector</p>
            </div>
          ) : (
            tasks.map((task) => (
              <motion.div 
                key={task._id} 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-white rounded-3xl border border-zinc-200/60 p-8 hover:shadow-xl hover:border-zinc-300 transition-all duration-300 relative"
              >
                <div className="flex flex-col lg:flex-row gap-12 relative z-10">
                  {/* Status Side */}
                  <div className="flex lg:flex-col items-center gap-4 lg:w-20">
                    <div className={`w-16 h-16 flex-shrink-0 flex items-center justify-center rounded-2xl shadow-sm ${
                      task.status === 'completed' ? 'bg-emerald-500 text-white' : 
                      task.status === 'review' ? 'bg-indigo-500 text-white' : 'bg-zinc-100 text-zinc-400'
                    }`}>
                      {task.status === 'completed' ? <CircleCheck className="h-8 w-8" /> : 
                       task.status === 'review' ? <Clock className="h-8 w-8" /> : 
                       <Target className="h-8 w-8" />}
                    </div>
                    <div className="flex flex-col lg:items-center text-center">
                      <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-tight">Status</span>
                      <span className="text-[9px] font-bold uppercase text-zinc-900">{task.status}</span>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-6 mb-6">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-zinc-900 uppercase leading-tight">{task.title}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${getPriorityStyle(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-zinc-500 leading-relaxed max-w-4xl">{task.description}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 text-right">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg border border-zinc-100">
                          <UserIcon className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="text-[10px] font-semibold text-zinc-900">{task.assignedTo?.name || 'Unassigned'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] font-semibold text-zinc-400 uppercase tracking-widest">
                          <Calendar className="h-3 w-3" /> {task.dueDate ? format(new Date(task.dueDate), "dd MMM yyyy") : 'No Deadline'}
                        </div>
                      </div>
                    </div>

                    {/* Meta Sections */}
                    <AnimatePresence>
                      {task.status === 'completed' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-6 bg-brand-emerald/5 border border-brand-emerald/20 rounded-3xl flex items-center gap-4">
                          <div className="w-10 h-10 bg-brand-emerald/10 rounded-xl flex items-center justify-center text-brand-emerald">
                            <CircleCheck className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-bold text-brand-emerald uppercase tracking-widest">Mission finalized and approved</span>
                        </motion.div>
                      )}

                      {task.status === 'todo' && task.reassignmentMessage && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-8 bg-brand-rose/5 border border-brand-rose/20 rounded-2xl">
                          <div className="flex items-center gap-3 mb-4">
                            <RotateCcw className="h-5 w-5 text-brand-rose" />
                            <span className="text-xs font-bold uppercase text-brand-rose tracking-widest">Revision instructions</span>
                          </div>
                          <p className="text-sm font-bold text-zinc-600 italic">"{task.reassignmentMessage}"</p>
                        </motion.div>
                      )}

                      {(task.status === 'review' || task.status === 'completed') && (task.submission || task.submissionAttachment) && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-8 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <div className="flex items-center justify-between mb-6">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-3">
                              <ArrowRight className="h-4 w-4" /> Operational Outcomes
                            </span>
                            {task.submissionAttachment && (
                              <a 
                                href={task.submissionAttachment} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-zinc-200 rounded-xl text-[10px] font-bold uppercase hover:bg-black hover:text-white hover:border-black transition-all shadow-sm"
                              >
                                View Evidence <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                          <p className="text-sm font-bold text-zinc-700 italic leading-relaxed">
                            {task.submission ? `"${task.submission}"` : 'No summary provided.'}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submission UI */}
                    <AnimatePresence>
                      {submittingId === task._id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-8 pt-8 border-t border-zinc-100">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 px-1">Submission Notes</label>
                              <textarea 
                                value={submissionText} 
                                onChange={(e) => setSubmissionText(e.target.value)} 
                                placeholder="Detail the results of this assignment..." 
                                className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-medium outline-none focus:border-zinc-900 transition-all min-h-[120px]" 
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 px-1">Evidence Artifact</label>
                              <div className="h-[120px] border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center p-6 hover:bg-zinc-50 transition-all relative cursor-pointer group">
                                <input 
                                  type="file" 
                                  className="absolute inset-0 opacity-0 cursor-pointer" 
                                  onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)} 
                                />
                                <Upload className="h-6 w-6 text-zinc-300 mb-2 transition-all" />
                                <p className="text-[10px] font-bold text-zinc-400">
                                  {submissionFile ? submissionFile.name : 'Upload mission evidence'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-4 items-center">
                            <button onClick={() => setSubmittingId(null)} className="text-[10px] font-bold text-zinc-400 hover:text-rose-500 transition-colors uppercase">Cancel</button>
                            <button onClick={() => handleTaskSubmit(task._id)} disabled={processing} className="px-8 py-3 bg-zinc-950 text-white text-[10px] font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-lg">
                              {processing ? <Loader2 className="animate-spin h-4 w-4" /> : 'Finalize Transmission'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col justify-end gap-3 lg:w-48 border-t lg:border-t-0 lg:border-l border-zinc-100 pt-6 lg:pt-0 lg:pl-10 min-w-[180px]">
                    {isAdminOrManager && (
                      <>
                        {task.status === 'review' && (
                          <div className="flex flex-col gap-2 w-full">
                            <button 
                              onClick={() => handleApprove(task._id)} 
                              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 text-white rounded-xl text-[11px] font-bold uppercase hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                            >
                              <CircleCheck className="h-4 w-4" /> Approve Task
                            </button>
                            <button 
                              onClick={() => setRedoTaskId(task._id)} 
                              className="w-full flex items-center justify-center gap-2 py-3.5 bg-rose-600 text-white rounded-xl text-[11px] font-bold uppercase hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20"
                            >
                              <RotateCcw className="h-4 w-4" /> Reject / Revise
                            </button>
                          </div>
                        )}
                        <div className="flex gap-2 w-full">
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
                            className="flex-1 py-3 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-all text-zinc-500 hover:text-black flex items-center justify-center border border-zinc-100"
                            title="Edit Task"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteTask(task)} 
                            className="flex-1 py-3 bg-zinc-50 rounded-xl hover:bg-rose-50 transition-all text-zinc-500 hover:text-rose-600 flex items-center justify-center border border-zinc-100"
                            title="Archive Task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                    {user?.role === 'employee' && task.status === 'todo' && !submittingId && (
                      <button 
                        onClick={() => setSubmittingId(task._id)} 
                        className="w-full py-4 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-all shadow-xl"
                      >
                        Submit Mission Result
                      </button>
                    )}
                    <button 
                      onClick={() => setSelectedTaskHistory(task.history)} 
                      className="py-3 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-all text-zinc-400 hover:text-zinc-600 flex items-center justify-center border border-zinc-100" 
                      title="View Audit Trail"
                    >
                      <History className="h-4 w-4" />
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
          <div className="p-10 bg-brand-rose/5 rounded-3xl border border-brand-rose/10 flex flex-col md:flex-row md:items-center gap-8">
            <div className="w-20 h-20 bg-brand-rose/10 rounded-3xl flex items-center justify-center text-brand-rose">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-zinc-900 uppercase">Archive Protocol</h4>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Archived tasks are restricted from the live grid</p>
            </div>
            <button onClick={() => { if(confirm("Permanently purge archive?")) clearTrash(); }} className="px-8 py-4 bg-brand-rose text-white text-xs font-bold rounded-2xl hover:scale-105 transition-all shadow-xl shadow-brand-rose/20">Purge Archive</button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {trashedTasks.length === 0 ? (
              <div className="p-32 text-center text-zinc-200">
                <p className="text-sm font-bold uppercase tracking-widest italic">Archive empty</p>
              </div>
            ) : (
              trashedTasks.map((item) => (
                <div key={item.id} className="p-8 bg-white border border-zinc-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-xl transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-200"><Trash2 className="h-6 w-6" /></div>
                    <div>
                      <p className="text-lg font-bold text-zinc-900 uppercase tracking-tight">{item.data.title}</p>
                      <p className="text-[10px] font-bold text-zinc-300 uppercase mt-1 tracking-widest">Archived on {new Date(item.deletedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleRestoreTask(item.id, item.data)} className="px-8 py-4 bg-zinc-900 text-white text-xs font-bold rounded-2xl hover:scale-105 transition-all">Restore</button>
                    <button onClick={() => removeFromTrash(item.id)} className="p-4 bg-zinc-50 rounded-2xl text-zinc-300 hover:text-brand-rose transition-all"><X className="h-5 w-5" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {/* Re-Task Modal */}
        {redoTaskId && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRedoTaskId(null)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-[3rem] w-full max-w-xl p-12 shadow-2xl">
              <h3 className="text-3xl font-bold text-zinc-900 uppercase tracking-tight mb-8">Revise Task</h3>
              <textarea 
                value={redoMessage} 
                onChange={e => setRedoMessage(e.target.value)} 
                placeholder="Provide clear revision instructions..." 
                className="w-full p-8 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-semibold outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all min-h-[200px] mb-10" 
              />
              <div className="flex justify-end gap-6 items-center">
                <button onClick={() => setRedoTaskId(null)} className="text-xs font-bold text-zinc-400 hover:text-black">Cancel</button>
                <button onClick={handleRedo} className="px-10 py-5 bg-black text-white text-xs font-bold rounded-2xl hover:scale-105 transition-all shadow-xl shadow-black/20">Send Revision</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[1500] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 20, opacity: 0 }} className="relative bg-white rounded-[3rem] w-full max-w-2xl p-12 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
              <h2 className="text-4xl font-bold text-zinc-900 uppercase tracking-tight mb-10">{editingTask ? "Update Task" : "New Task"}</h2>
              <form onSubmit={handleSaveTask} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Title</label>
                  <input required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task headline..." className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-6 text-sm font-bold outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Description</label>
                  <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Define the task scope..." className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-6 text-sm font-semibold outline-none min-h-[150px] focus:ring-4 focus:ring-black/5 focus:border-black transition-all" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Assignee</label>
                    <select 
                      required={!editingTask}
                      value={newAssignedTo} 
                      onChange={e => setNewAssignedTo(e.target.value)} 
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-6 text-sm font-bold outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all appearance-none"
                    >
                      <option value="">{editingTask ? "Keep Assignee" : "Select Lead"}</option>
                      {employees.map(e => (
                        <option key={e._id} value={e._id}>
                          {e.name.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Priority</label>
                    <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-6 text-sm font-bold outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all appearance-none">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Deadline</label>
                  <input required type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-6 text-sm font-bold outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all" />
                </div>
                <button disabled={processing} className="w-full py-6 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/30">
                  {processing ? <Loader2 className="animate-spin h-6 w-6 mx-auto" /> : editingTask ? "Update Task Grid" : "Deploy Task"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* History Modal */}
        {selectedTaskHistory && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTaskHistory(null)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-[3rem] w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-10 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 uppercase tracking-tight">Audit Trail</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Timeline events</p>
                </div>
                <button onClick={() => setSelectedTaskHistory(null)} className="p-3 bg-zinc-50 rounded-2xl text-zinc-400 hover:text-black transition-all"><X className="h-6 w-6" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                {selectedTaskHistory.length === 0 ? (
                  <p className="text-center text-zinc-300 italic py-10">No history records.</p>
                ) : (
                  selectedTaskHistory.map((h, i) => (
                    <div key={i} className="flex gap-6 relative">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-zinc-900 rounded-full z-10"></div>
                        {i !== selectedTaskHistory.length - 1 && <div className="w-0.5 flex-1 bg-zinc-100"></div>}
                      </div>
                      <div className="pb-8">
                        <p className="text-xs font-bold text-zinc-900 uppercase">{h.action}</p>
                        <p className="text-[10px] font-bold text-zinc-400 mt-1">{new Date(h.timestamp).toLocaleString()}</p>
                        {h.note && <div className="mt-4 p-4 bg-zinc-50 rounded-2xl text-[11px] font-semibold text-zinc-600 italic">"{h.note}"</div>}
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
