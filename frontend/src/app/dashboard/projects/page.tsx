"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { 
  Plus, Search, Filter, MoreVertical, Calendar, 
  Clock, CircleCheck, AlertCircle, Users, 
  FileText, ExternalLink, Trash2, Edit, 
  BarChart3, Loader2, X, ChevronRight,
  TrendingUp, Activity, Briefcase, Paperclip,
  Target, Send, ImageIcon, Globe, ShieldCheck,
  Download, ArrowRight, UserPlus
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface Project {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'testing' | 'completed' | 'maintenance' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline: string;
  startDate?: string;
  maintenanceDate?: string;
  progress: number;
  members: any[];
  clientInfo?: {
    name: string;
    company: string;
  };
  documentation?: string;
  workflow?: { employeeName: string; taskName: string }[];
  attachments?: { name: string; url: string; type: string }[];
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [workflow, setWorkflow] = useState<{ employeeName: string; taskName: string }[]>([{ employeeName: '', taskName: '' }]);
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const [projRes, statsRes, usersRes] = await Promise.all([
        api.get("projects"),
        api.get("projects/stats"),
        api.get("auth/contacts")
      ]);
      setProjects(projRes.data);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const addWorkflowStep = () => setWorkflow([...workflow, { employeeName: '', taskName: '' }]);
  const removeWorkflowStep = (index: number) => setWorkflow(workflow.filter((_, i) => i !== index));
  const updateWorkflowStep = (index: number, field: string, value: string) => {
    const newWorkflow = [...workflow];
    (newWorkflow[index] as any)[field] = value;
    setWorkflow(newWorkflow);
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('upload', formData);
    return res.data.secure_url;
  };

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    const formData = new FormData(e.currentTarget);
    const rawData = Object.fromEntries(formData);
    
    try {
      const docFile = (e.currentTarget.elements.namedItem('documentationFile') as HTMLInputElement).files?.[0];
      const imageFiles = (e.currentTarget.elements.namedItem('images') as HTMLInputElement).files;
      
      let docUrl = '';
      if (docFile) {
        docUrl = await uploadFile(docFile);
      }

      const attachments = [];
      if (imageFiles) {
        for (let i = 0; i < imageFiles.length; i++) {
          const url = await uploadFile(imageFiles[i]);
          attachments.push({ name: imageFiles[i].name, url, type: 'image' });
        }
      }

      const projectData = {
        title: rawData.title,
        priority: rawData.priority,
        deadline: rawData.deadline,
        startDate: rawData.startDate,
        description: rawData.description,
        clientInfo: {
          name: rawData.clientName as string,
          company: rawData.clientType === 'personal' ? 'Internal Enterprise' : (rawData.clientName as string)
        },
        documentation: docUrl,
        attachments,
        workflow: workflow.filter(w => w.employeeName && w.taskName)
      };

      await api.post("projects", projectData);
      setIsCreateModalOpen(false);
      setWorkflow([{ employeeName: '', taskName: '' }]);
      fetchProjects();
    } catch (err) { 
      console.error(err); 
      alert("Failed to initialize project protocols.");
    } finally {
      setUploading(false);
    }
  };

  const handleAssignTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    
    try {
      await api.post("tasks", {
        ...data,
        projectId: selectedProject?._id
      });
      setIsAssignModalOpen(false);
      alert("Operation Successful: Task assigned to personnel node.");
    }
  };

  if (!mounted) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-brand-emerald';
      case 'in-progress': return 'bg-brand-indigo';
      case 'testing': return 'bg-purple-500';
      case 'maintenance': return 'bg-brand-amber';
      case 'urgent': return 'bg-brand-rose';
      default: return 'bg-zinc-400';
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-12 bg-zinc-50/30">
      <div className="relative">
        <div className="absolute inset-0 bg-black/5 blur-3xl rounded-full" />
        <Loader2 className="animate-spin h-20 w-20 text-black relative z-10" />
      </div>
      <div className="flex flex-col items-center gap-4">
        <span className="text-xs font-bold uppercase tracking-[0.8em] animate-pulse text-zinc-900 italic">Syncing Matrix...</span>
        <div className="w-48 h-1 bg-zinc-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="w-1/2 h-full bg-black"
          />
        </div>
      </div>
    </div>
  );

  const filteredProjects = useMemo(() => {
    return projects.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [projects, searchTerm]);

  return (
    <div className="space-y-10 pb-32">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-950 text-white rounded-2xl shadow-xl">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold uppercase tracking-tight text-zinc-900 leading-none">Manifest</h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-6 h-0.5 bg-zinc-900 rounded-full" />
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">Strategic Asset Management</p>
              </div>
            </div>
          </div>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="group px-8 py-4 bg-zinc-950 text-white rounded-2xl font-bold uppercase text-[10px] flex items-center gap-4 hover:bg-zinc-800 transition-all shadow-lg"
          >
            <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" /> 
            <span>Initialize New Project</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Active Nodes", value: stats?.total || 0, icon: Globe, color: "text-zinc-950", bg: "bg-zinc-100/50" },
          { label: "Critical Priority", value: projects.filter(p => p.priority === 'urgent').length, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Production Load", value: projects.filter(p => p.status === 'in-progress').length, icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Overdue Cycles", value: stats?.overdue || 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="p-8 bg-white rounded-3xl border border-zinc-200/60 shadow-sm flex items-center justify-between group hover:shadow-lg hover:border-zinc-300 transition-all duration-300"
          >
            <div>
              <p className="text-[9px] font-bold uppercase text-zinc-400 mb-2 tracking-widest">{stat.label}</p>
              <h3 className="text-3xl font-bold tracking-tight text-zinc-950 leading-none">{stat.value}</h3>
            </div>
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} transition-transform duration-300`}>
              <stat.icon className="h-6 w-6" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-zinc-100 flex flex-col lg:flex-row gap-6 items-center justify-between bg-zinc-50/30">
          <div className="relative w-full lg:w-[400px]">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input 
              type="text" 
              placeholder="SEARCH ASSET INVENTORY..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-6 py-4 bg-white border border-zinc-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest focus:border-zinc-900 focus:ring-4 focus:ring-zinc-950/5 transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-3 w-full lg:w-auto">
            <button className="flex-1 lg:flex-none px-6 py-4 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center gap-3 text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-black transition-all">
              <Filter className="h-3.5 w-3.5" /> Filter
            </button>
            <button className="flex-1 lg:flex-none px-6 py-4 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center gap-3 text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-black transition-all">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Operation / Asset</th>
                <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Status</th>
                <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Priority</th>
                <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Timeline</th>
                <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredProjects.map((project) => (
                <tr 
                  key={project._id} 
                  onClick={() => setSelectedProject(project)}
                  className="hover:bg-zinc-50/50 cursor-pointer transition-all group"
                >
                  <td className="p-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getStatusColor(project.status)} text-white shadow-sm transition-transform`}>
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold uppercase text-zinc-950 truncate max-w-[280px] tracking-tight">{project.title}</p>
                        <p className="text-[9px] font-semibold text-zinc-400 uppercase mt-1 tracking-widest italic">{project.clientInfo?.company || 'INTERNAL_ENTERPRISE_SYSTEM'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border border-zinc-100 bg-white ${
                      project.status === 'completed' ? 'text-emerald-600' : 
                      project.status === 'urgent' ? 'text-rose-600' : 'text-zinc-500'
                    }`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="p-8">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                      project.priority === 'urgent' ? 'bg-rose-50 text-rose-600' : 
                      project.priority === 'high' ? 'bg-amber-50 text-amber-600' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {project.priority}
                    </span>
                  </td>
                  <td className="p-8">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-zinc-900 italic">
                        <Calendar className="h-3.5 w-3.5 text-zinc-300" /> 
                        {project.deadline ? format(new Date(project.deadline), 'dd MMM yyyy') : 'NO_DEADLINE'}
                      </div>
                      <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">EST_SYNC</p>
                    </div>
                  </td>
                  <td className="p-8 text-right">
                    <div className="w-full max-w-[140px] ml-auto space-y-2">
                      <div className="flex justify-between text-[9px] font-bold uppercase italic tracking-tighter text-zinc-400">
                        <span className="text-zinc-950">{project.progress}%</span>
                        <span>SYNC</span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          whileInView={{ width: `${project.progress}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full ${getStatusColor(project.status)} rounded-full`}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[1500] flex items-center justify-center p-6">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)} />
            <motion.div 
              initial={{scale:0.95, opacity:0, y: 30}} 
              animate={{scale:1, opacity:1, y: 0}} 
              exit={{scale:0.95, opacity:0, y: 30}} 
              className="relative bg-white rounded-[3rem] w-full max-w-5xl max-h-[90vh] overflow-y-auto p-12 shadow-2xl custom-scrollbar"
            >
              <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-10 right-10 p-3 hover:bg-zinc-50 rounded-2xl transition-all text-zinc-400 hover:text-black"><X className="h-7 w-7" /></button>
              
              <div className="mb-12">
                <h2 className="text-4xl font-bold uppercase tracking-tight text-zinc-900 leading-none">Initialize <span className="text-zinc-300">Project Asset</span></h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.5em] mt-4 italic flex items-center gap-3">
                  <div className="w-8 h-0.5 bg-brand-indigo" /> Remote Personnel Deployment Protocol
                </p>
              </div>

              <form onSubmit={handleCreateProject} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="col-span-2 space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1 flex items-center gap-2">
                    <Target className="h-4 w-4" /> Project Strategic Title
                  </label>
                  <input name="title" className="w-full bg-zinc-50 border border-zinc-100 p-6 text-lg font-bold uppercase rounded-2xl outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all" placeholder="ENTER MISSION NAME..." required />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1 flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Client Origin / Sector
                  </label>
                  <select name="clientType" className="w-full bg-zinc-50 border border-zinc-100 p-6 text-sm font-bold uppercase rounded-2xl outline-none focus:border-black transition-all appearance-none bg-white">
                    <option value="client">EXTERNAL_CLIENT_NODE</option>
                    <option value="personal">INTERNAL_ENTERPRISE_ASSET</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Target Client Identity
                  </label>
                  <input name="clientName" className="w-full bg-zinc-50 border border-zinc-100 p-6 text-sm font-bold uppercase rounded-2xl outline-none focus:border-black transition-all" placeholder="IDENTITY_REQUIRED" />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Commencement Cycle
                  </label>
                  <input name="startDate" type="date" className="w-full bg-zinc-50 border border-zinc-100 p-6 text-sm font-bold uppercase rounded-2xl outline-none focus:border-black transition-all" required />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Final Sync Deadline
                  </label>
                  <input name="deadline" type="date" className="w-full bg-zinc-50 border border-zinc-100 p-6 text-sm font-bold uppercase rounded-2xl outline-none focus:border-black transition-all" required />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Operational Priority
                  </label>
                  <select name="priority" className="w-full bg-zinc-50 border border-zinc-100 p-6 text-sm font-bold uppercase rounded-2xl outline-none focus:border-black transition-all appearance-none bg-white">
                    <option value="low">NODE_STABLE (LOW)</option>
                    <option value="medium">NODE_ACTIVE (MEDIUM)</option>
                    <option value="high">NODE_CRITICAL (HIGH)</option>
                    <option value="urgent">IMMEDIATE_INTERVENTION (URGENT)</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Requirement Analysis Doc
                  </label>
                  <div className="relative group">
                    <input name="documentationFile" type="file" className="w-full bg-zinc-50 border border-zinc-100 p-5 text-[10px] font-bold uppercase rounded-2xl cursor-pointer" accept=".pdf,.docx,.ppt,.pptx" />
                    <Paperclip className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-300 pointer-events-none group-hover:text-black transition-colors" />
                  </div>
                </div>

                <div className="col-span-2 space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1 flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Mission Objective Details
                  </label>
                  <textarea name="description" rows={4} className="w-full bg-zinc-50 border border-zinc-100 p-6 text-sm font-bold uppercase rounded-2xl outline-none resize-none focus:border-black transition-all" placeholder="DECRYPT MISSION OBJECTIVES HERE..." />
                </div>

                <div className="col-span-2 space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" /> Related Visual Assets
                  </label>
                  <input name="images" type="file" multiple className="w-full bg-zinc-50 border border-zinc-100 p-5 text-[10px] font-bold uppercase rounded-2xl cursor-pointer" accept="image/*" />
                </div>

                {/* Workflow Section */}
                <div className="col-span-2 pt-12 mt-8 border-t border-zinc-100">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-zinc-100 text-zinc-900 rounded-2xl">
                        <Activity className="h-6 w-6" />
                      </div>
                      <h3 className="text-2xl font-bold uppercase tracking-tight text-zinc-900">Operational Workflow</h3>
                    </div>
                    <button type="button" onClick={addWorkflowStep} className="group px-6 py-3 bg-zinc-900 text-white text-[11px] font-bold uppercase rounded-xl flex items-center gap-3 hover:bg-black transition-all shadow-xl shadow-black/10">
                      <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" /> Add Node Step
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {workflow.map((step, index) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={index} 
                        className="flex gap-4 items-center p-6 bg-zinc-50 rounded-2xl border border-zinc-100"
                      >
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase text-zinc-300 tracking-widest px-1">Personnel Node</label>
                            <input 
                              placeholder="EMPLOYEE_NAME" 
                              className="w-full bg-white border border-zinc-100 p-4 text-[11px] font-bold uppercase rounded-xl outline-none focus:border-black transition-all shadow-sm"
                              value={step.employeeName}
                              onChange={(e) => updateWorkflowStep(index, 'employeeName', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase text-zinc-300 tracking-widest px-1">Target Work Packet</label>
                            <input 
                              placeholder="ASSIGNED_WORK_NAME" 
                              className="w-full bg-white border border-zinc-100 p-4 text-[11px] font-bold uppercase rounded-xl outline-none focus:border-black transition-all shadow-sm"
                              value={step.taskName}
                              onChange={(e) => updateWorkflowStep(index, 'taskName', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="pt-5">
                          {workflow.length > 1 && (
                            <button type="button" onClick={() => removeWorkflowStep(index)} className="p-4 text-zinc-300 hover:text-brand-rose hover:bg-white rounded-xl transition-all shadow-sm">
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={uploading}
                  className="col-span-2 py-8 bg-black text-white font-bold uppercase text-base rounded-3xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/20 flex items-center justify-center gap-5 disabled:opacity-50 mt-10"
                >
                  {uploading ? <Loader2 className="animate-spin h-8 w-8" /> : <Send className="h-8 w-8" />}
                  {uploading ? "TRANSMITTING DATA..." : "INITIALIZE MISSION PROTOCOLS"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-[1500] flex items-center justify-center p-6">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setSelectedProject(null)} />
            <motion.div 
              initial={{scale: 0.9, opacity:0, y: 30}} 
              animate={{scale: 1, opacity:1, y: 0}} 
              exit={{scale: 0.9, opacity:0, y: 30}} 
              className="relative bg-white rounded-3xl w-full max-w-6xl h-[92vh] overflow-y-auto p-16 shadow-2xl custom-scrollbar border border-zinc-100"
            >
              <button onClick={() => setSelectedProject(null)} className="absolute top-12 right-12 p-4 hover:bg-zinc-50 rounded-2xl transition-all text-zinc-400 hover:text-black"><X className="h-8 w-8" /></button>
              
              <div className="flex flex-col lg:flex-row justify-between gap-12 mb-20 border-b border-zinc-100 pb-16">
                <div className="space-y-10 flex-1">
                  <div className="flex items-center gap-6">
                    <span className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] ${getStatusColor(selectedProject.status)} text-white shadow-xl shadow-black/10`}>
                      {selectedProject.status}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-300">NODE_ID: {selectedProject._id}</span>
                  </div>
                  <h2 className="text-6xl font-bold uppercase tracking-tight leading-none text-zinc-900">{selectedProject.title}</h2>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase px-6 py-3.5 bg-zinc-50 rounded-2xl border border-zinc-100 shadow-sm text-zinc-900">
                      <Clock className="h-4 w-4 text-brand-indigo" /> {selectedProject.startDate ? format(new Date(selectedProject.startDate), 'dd MMM yyyy') : 'NO_START'}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase px-6 py-3.5 bg-zinc-50 rounded-2xl border border-zinc-100 shadow-sm text-zinc-900">
                      <Calendar className="h-4 w-4 text-brand-rose" /> {format(new Date(selectedProject.deadline), 'dd MMM yyyy')}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase px-6 py-3.5 bg-zinc-50 rounded-2xl border border-zinc-100 shadow-sm text-zinc-900">
                      <Target className="h-4 w-4 text-brand-amber" /> {selectedProject.priority} Priority
                    </div>
                  </div>
                </div>
                <div className="lg:text-right flex flex-col justify-end">
                  <p className="text-[12px] font-bold uppercase text-zinc-300 mb-4 tracking-[0.4em] px-2">Operational Sync</p>
                  <div className="text-9xl font-bold italic tracking-tighter leading-none text-zinc-900 flex items-baseline">
                    {selectedProject.progress}<span className="text-4xl text-zinc-200 ml-2">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-20">
                <div className="lg:col-span-2 space-y-20">
                  <div className="space-y-8">
                    <h3 className="text-2xl font-bold uppercase tracking-tight flex items-center gap-5 text-zinc-900">
                      <div className="w-10 h-1 bg-black rounded-full" /> Mission Briefing
                    </h3>
                    <div className="p-10 bg-zinc-50/50 rounded-[3rem] border border-zinc-100 relative group overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-950/5 rounded-bl-[10rem] group-hover:scale-150 transition-transform duration-1000" />
                      <p className="text-lg font-bold leading-relaxed text-zinc-700 uppercase whitespace-pre-wrap relative z-10">{selectedProject.description}</p>
                    </div>
                  </div>

                  {selectedProject.workflow && selectedProject.workflow.length > 0 && (
                    <div className="space-y-8">
                      <h3 className="text-2xl font-bold uppercase tracking-tight flex items-center gap-5 text-zinc-900">
                        <div className="w-10 h-1 bg-black rounded-full" /> Operational Grid Workflow
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        {selectedProject.workflow.map((w, i) => (
                          <div key={i} className="group p-8 bg-white border border-zinc-100 rounded-2xl flex justify-between items-center hover:bg-zinc-950 hover:border-black hover:shadow-2xl transition-all duration-500">
                            <div className="flex items-center gap-6">
                              <div className="w-12 h-12 rounded-xl border border-zinc-100 flex items-center justify-center font-bold text-zinc-300 group-hover:border-white/20 group-hover:text-white transition-colors">
                                {String(i + 1).padStart(2, '0')}
                              </div>
                              <span className="text-xs font-bold uppercase tracking-widest text-zinc-900 group-hover:text-white transition-colors">{w.employeeName}</span>
                            </div>
                            <ArrowRight className="h-5 w-5 text-zinc-200 group-hover:translate-x-4 group-hover:text-white transition-all duration-500" />
                            <span className="text-xs font-bold uppercase text-zinc-400 group-hover:text-zinc-500 transition-colors">{w.taskName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                      <h3 className="text-2xl font-bold uppercase tracking-tight flex items-center gap-5 text-zinc-900">
                        <div className="w-10 h-1 bg-black rounded-full" /> Active Node Deployments
                      </h3>
                      {isAdmin && (
                        <button 
                          onClick={() => setIsAssignModalOpen(true)}
                          className="px-8 py-4 bg-zinc-950 text-white text-[10px] font-bold uppercase rounded-2xl hover:scale-105 transition-all shadow-xl shadow-black/10"
                        >
                          <UserPlus className="h-4 w-4 inline mr-2.5" /> Deploy New Node Task
                        </button>
                      )}
                    </div>
                    <div className="p-24 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-[3rem] flex flex-col items-center justify-center opacity-40 text-center group overflow-hidden relative">
                      <Plus className="h-16 w-16 text-zinc-300 mb-8 group-hover:rotate-180 transition-transform duration-1000" />
                      <p className="text-xs font-bold uppercase tracking-[0.5em] text-zinc-400">Establishing Sub-Node Infrastructure...</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-16">
                  <div className="space-y-8">
                    <h3 className="text-xl font-bold uppercase tracking-tight text-zinc-900">Assigned Personnel</h3>
                    <div className="space-y-4">
                      {selectedProject.members?.map((m, i) => (
                        <div key={i} className="p-6 bg-white border border-zinc-100 rounded-3xl flex items-center gap-5 hover:shadow-xl hover:border-black/5 transition-all duration-500 group">
                          <div className="w-12 h-12 bg-zinc-50 text-zinc-900 flex items-center justify-center rounded-2xl font-bold group-hover:bg-black group-hover:text-white transition-all shadow-sm">
                            {m.name[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[12px] font-bold uppercase text-zinc-900">{m.name}</span>
                            <span className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest mt-0.5">{m.role}</span>
                          </div>
                        </div>
                      ))}
                      {selectedProject.members?.length === 0 && (
                        <div className="p-12 bg-zinc-50 rounded-3xl border border-zinc-100 flex flex-col items-center justify-center opacity-30 text-center">
                          <Users className="h-8 w-8 text-zinc-300 mb-4" />
                          <p className="text-[9px] font-bold uppercase text-zinc-400">Grid Vacant</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-8">
                    <h3 className="text-xl font-bold uppercase tracking-tight text-zinc-900">Secure Resources</h3>
                    <div className="space-y-4">
                      {selectedProject.documentation && (
                        <button 
                          onClick={() => window.open(selectedProject.documentation, '_blank')}
                          className="w-full p-8 bg-zinc-50 border border-zinc-100 rounded-3xl text-left flex items-center justify-between group hover:bg-zinc-950 hover:shadow-2xl transition-all duration-500"
                        >
                          <div className="flex items-center gap-5">
                            <div className="p-3 bg-white group-hover:bg-white/10 rounded-xl transition-colors">
                              <FileText className="h-6 w-6 text-zinc-900 group-hover:text-white" />
                            </div>
                            <span className="text-[11px] font-bold uppercase text-zinc-900 group-hover:text-white">Core Mission Protocol</span>
                          </div>
                          <Download className="h-5 w-5 text-zinc-300 group-hover:text-white transition-colors" />
                        </button>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 mt-8">
                        {selectedProject.attachments?.map((att, i) => (
                          <div key={i} className="aspect-square bg-zinc-50 rounded-2xl border border-zinc-100 overflow-hidden group relative shadow-sm">
                            <img src={att.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 cursor-pointer" onClick={() => window.open(att.url, '_blank')} />
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                              <ExternalLink className="text-white h-6 w-6" />
                            </div>
                          </div>
                        ))}
                      </div>

                      {isAdmin && (
                        <button className="w-full p-12 bg-white border-2 border-dashed border-zinc-100 rounded-3xl flex flex-col items-center justify-center opacity-30 hover:opacity-100 hover:border-black transition-all group mt-8">
                          <Plus className="h-10 w-10 text-zinc-300 group-hover:text-black transition-colors" />
                          <span className="text-[9px] font-bold uppercase text-zinc-400 mt-4">Buffer Additional Assets</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Task Assignment Modal */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsAssignModalOpen(false)} />
            <motion.div 
              initial={{scale:0.95, opacity:0, y: 30}} 
              animate={{scale:1, opacity:1, y: 0}} 
              exit={{scale:0.95, opacity:0, y: 30}} 
              className="relative bg-white rounded-[3rem] w-full max-w-xl p-12 shadow-2xl border border-zinc-100"
            >
              <button onClick={() => setIsAssignModalOpen(false)} className="absolute top-10 right-10 p-3 hover:bg-zinc-50 rounded-2xl transition-all text-zinc-400 hover:text-black"><X className="h-7 w-7" /></button>
              
              <div className="mb-12">
                <h2 className="text-3xl font-bold uppercase tracking-tight text-zinc-900 leading-none">Deploy Sub-Node Task</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2 flex items-center gap-3 italic">
                  <div className="w-6 h-0.5 bg-brand-rose" /> Operation: {selectedProject?.title}
                </p>
              </div>

              <form onSubmit={handleAssignTask} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Mission Task Objective</label>
                  <input name="title" className="w-full bg-zinc-50 border border-zinc-100 p-6 text-sm font-bold uppercase rounded-2xl outline-none focus:border-black transition-all shadow-sm" placeholder="TASK_IDENTITY" required />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Assign To Personnel Node</label>
                  <select name="assignedTo" className="w-full bg-zinc-50 border border-zinc-100 p-6 text-sm font-bold uppercase rounded-2xl outline-none focus:border-black transition-all appearance-none bg-white shadow-sm" required>
                    <option value="">SELECT_NODE...</option>
                    {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Priority Class</label>
                    <select name="priority" className="w-full bg-zinc-50 border border-zinc-100 p-6 text-sm font-bold uppercase rounded-2xl outline-none focus:border-black transition-all appearance-none bg-white shadow-sm">
                      <option value="medium">STANDARD_SYNC</option>
                      <option value="high">HIGH_PRIORITY</option>
                      <option value="urgent">URGENT_OVERRIDE</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Node Sync Deadline</label>
                    <input name="dueDate" type="date" className="w-full bg-zinc-50 border border-zinc-100 p-6 text-sm font-bold uppercase rounded-2xl outline-none focus:border-black transition-all shadow-sm" required />
                  </div>
                </div>
                <button type="submit" className="w-full py-7 bg-zinc-950 text-white font-bold uppercase text-xs rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/20 flex items-center justify-center gap-5 mt-8">
                  <Send className="h-6 w-6" /> INITIALIZE DEPLOYMENT
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
