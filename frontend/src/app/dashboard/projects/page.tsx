"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { 
  Plus, Search, Filter, MoreVertical, Calendar, 
  Clock, CheckCircle2, AlertCircle, Users, 
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
    } catch (err) { console.error(err); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'testing': return 'bg-purple-500';
      case 'maintenance': return 'bg-orange-500';
      case 'urgent': return 'bg-red-600';
      default: return 'bg-gray-400';
    }
  };

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center gap-8 opacity-30">
      <Loader2 className="animate-spin h-20 w-20 text-black" />
      <span className="text-sm font-black uppercase tracking-[0.8em] animate-pulse">Establishing Project Matrix...</span>
    </div>
  );

  return (
    <div className="space-y-12 pb-24">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row gap-8 items-start justify-between bg-white p-10 border-8 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-black text-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)]">
              <Briefcase className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Manifest</h1>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.5em] mt-2 italic">Strategic Asset Management</p>
            </div>
          </div>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="group relative px-10 py-6 bg-black text-white border-4 border-black font-black uppercase text-sm flex items-center gap-4 hover:bg-white hover:text-black transition-all shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] active:shadow-none translate-y-0 active:translate-y-2"
          >
            <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform" /> 
            <span>Initialize New Project</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: "Active Nodes", value: stats?.total || 0, icon: Globe, color: "bg-black" },
          { label: "Critical Priority", value: projects.filter(p => p.priority === 'urgent').length, icon: AlertCircle, color: "bg-red-600" },
          { label: "Production Load", value: projects.filter(p => p.status === 'in-progress').length, icon: Activity, color: "bg-blue-500" },
          { label: "Overdue Cycles", value: stats?.overdue || 0, icon: Clock, color: "bg-orange-500" },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="p-8 bg-white border-8 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between group hover:-translate-y-2 transition-transform"
          >
            <div>
              <p className="text-[10px] font-black uppercase text-zinc-400 mb-2 tracking-widest">{stat.label}</p>
              <h3 className="text-5xl font-black italic tracking-tighter">{stat.value}</h3>
            </div>
            <div className={`p-5 border-4 border-black text-white ${stat.color} shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] group-hover:rotate-12 transition-transform`}>
              <stat.icon className="h-8 w-8" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Container */}
      <div className="bg-white border-8 border-black shadow-[25px_25px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="p-8 border-b-8 border-black flex flex-col md:flex-row gap-8 items-center justify-between bg-zinc-50">
          <div className="relative w-full md:w-[500px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-300" />
            <input 
              type="text" 
              placeholder="FILTER PROJECT NODES..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-6 py-5 border-4 border-black text-[12px] font-black uppercase focus:outline-none focus:bg-white transition-all shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.05)] placeholder:text-zinc-300"
            />
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button className="flex-1 md:flex-none px-10 py-5 border-4 border-black bg-white flex items-center justify-center gap-3 text-xs font-black uppercase hover:bg-black hover:text-white transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none translate-y-0 active:translate-y-1">
              <Filter className="h-5 w-5" /> Filter
            </button>
            <button className="flex-1 md:flex-none px-10 py-5 border-4 border-black bg-white flex items-center justify-center gap-3 text-xs font-black uppercase hover:bg-black hover:text-white transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none translate-y-0 active:translate-y-1">
              <BarChart3 className="h-5 w-5" /> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black text-white">
                <th className="p-8 text-[11px] font-black uppercase tracking-[0.3em] border-r-4 border-white/10">Operation / Asset</th>
                <th className="p-8 text-[11px] font-black uppercase tracking-[0.3em] border-r-4 border-white/10">Status</th>
                <th className="p-8 text-[11px] font-black uppercase tracking-[0.3em] border-r-4 border-white/10">Priority</th>
                <th className="p-8 text-[11px] font-black uppercase tracking-[0.3em] border-r-4 border-white/10">Timeline</th>
                <th className="p-8 text-[11px] font-black uppercase tracking-[0.3em] text-right">Execution</th>
              </tr>
            </thead>
            <tbody className="divide-y-8 divide-black/5 bg-[#fafafa]">
              {projects.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase())).map((project) => (
                <tr 
                  key={project._id} 
                  onClick={() => setSelectedProject(project)}
                  className="hover:bg-white cursor-pointer transition-all group relative border-b-4 border-black/5"
                >
                  <td className="p-8">
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 border-4 border-black flex items-center justify-center ${getStatusColor(project.status)} text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] group-hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.2)] transition-all`}>
                        <Briefcase className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-lg font-black uppercase truncate max-w-[300px] tracking-tighter leading-none">{project.title}</p>
                        <p className="text-[9px] font-black text-zinc-400 uppercase mt-2 tracking-widest">{project.clientInfo?.company || 'INTERNAL_ENTERPRISE_SYSTEM'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <span className={`px-6 py-3 border-4 border-black text-[10px] font-black uppercase ${getStatusColor(project.status)} text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] group-hover:shadow-none transition-all`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="p-8">
                    <span className={`px-6 py-3 border-4 border-black text-[10px] font-black uppercase ${project.priority === 'urgent' ? 'bg-red-600 text-white' : 'bg-white'} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`}>
                      {project.priority}
                    </span>
                  </td>
                  <td className="p-8">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3 text-[11px] font-black uppercase italic">
                        <Calendar className="h-4 w-4 text-zinc-400" /> 
                        {project.deadline ? format(new Date(project.deadline), 'dd MMM yyyy') : 'NO_DEADLINE'}
                      </div>
                      <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-[0.3em]">ESTIMATED_SYNC_CYCLE</p>
                    </div>
                  </td>
                  <td className="p-8 text-right">
                    <div className="w-full max-w-[180px] ml-auto space-y-3">
                      <div className="flex justify-between text-[11px] font-black uppercase italic tracking-tighter">
                        <span>{project.progress}% SYNCED</span>
                      </div>
                      <div className="h-4 border-4 border-black bg-zinc-200 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${project.progress}%` }}
                          className="h-full bg-black" 
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)} />
            <motion.div 
              initial={{scale:0.9, opacity:0, y: 50}} 
              animate={{scale:1, opacity:1, y: 0}} 
              exit={{scale:0.9, opacity:0, y: 50}} 
              className="relative bg-white border-8 border-black w-full max-w-5xl max-h-[90vh] overflow-y-auto p-12 shadow-[40px_40px_0px_0px_rgba(0,0,0,1)] custom-scrollbar"
            >
              <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-8 right-8 p-3 hover:bg-black hover:text-white transition-all border-4 border-black"><X className="h-8 w-8" /></button>
              
              <div className="mb-12 border-b-8 border-black pb-8">
                <h2 className="text-5xl font-black uppercase italic tracking-tighter text-black leading-none">Initialize Project Asset</h2>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.6em] mt-4 italic">Remote Personnel Grid Deployment Protocol</p>
              </div>

              <form onSubmit={handleCreateProject} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="col-span-2 space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Target className="h-4 w-4" /> Project Strategic Title
                  </label>
                  <input name="title" className="w-full border-4 border-black p-6 text-lg font-black uppercase outline-none focus:bg-zinc-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] placeholder:text-zinc-200" placeholder="ENTER MISSION NAME..." required />
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Client Origin / Sector
                  </label>
                  <select name="clientType" className="w-full border-4 border-black p-6 text-sm font-black uppercase outline-none bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <option value="client">EXTERNAL_CLIENT_NODE</option>
                    <option value="personal">INTERNAL_ENTERPRISE_ASSET</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Users className="h-4 w-4" /> Target Client Identity
                  </label>
                  <input name="clientName" className="w-full border-4 border-black p-6 text-sm font-black uppercase outline-none focus:bg-zinc-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" placeholder="IDENTITY_REQUIRED" />
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Commencement Cycle
                  </label>
                  <input name="startDate" type="date" className="w-full border-4 border-black p-6 text-sm font-black uppercase outline-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" required />
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Final Sync Deadline
                  </label>
                  <input name="deadline" type="date" className="w-full border-4 border-black p-6 text-sm font-black uppercase outline-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" required />
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Operational Priority
                  </label>
                  <select name="priority" className="w-full border-4 border-black p-6 text-sm font-black uppercase outline-none bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <option value="low">NODE_STABLE (LOW)</option>
                    <option value="medium">NODE_ACTIVE (MEDIUM)</option>
                    <option value="high">NODE_CRITICAL (HIGH)</option>
                    <option value="urgent">IMMEDIATE_INTERVENTION (URGENT)</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Requirement Analysis Doc (PDF/DOCX/PPT)
                  </label>
                  <div className="relative group">
                    <input name="documentationFile" type="file" className="w-full border-4 border-black p-5 text-[11px] font-black uppercase bg-zinc-50 cursor-pointer shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" accept=".pdf,.docx,.ppt,.pptx" />
                    <Paperclip className="absolute right-5 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-300 pointer-events-none" />
                  </div>
                </div>

                <div className="col-span-2 space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Mission Objective Details
                  </label>
                  <textarea name="description" rows={4} className="w-full border-4 border-black p-6 text-sm font-black uppercase outline-none resize-none focus:bg-zinc-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" placeholder="DECRYPT MISSION OBJECTIVES HERE..." />
                </div>

                <div className="col-span-2 space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" /> Related Visual Assets (Multiple Upload)
                  </label>
                  <input name="images" type="file" multiple className="w-full border-4 border-black p-5 text-[11px] font-black uppercase bg-zinc-50 cursor-pointer shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" accept="image/*" />
                </div>

                {/* Workflow Section */}
                <div className="col-span-2 border-t-8 border-black pt-12 mt-8">
                  <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-black text-white border-4 border-black">
                        <Activity className="h-6 w-6" />
                      </div>
                      <h3 className="text-3xl font-black uppercase italic tracking-tighter">Operational Workflow</h3>
                    </div>
                    <button type="button" onClick={addWorkflowStep} className="group px-8 py-4 bg-black text-white text-[12px] font-black uppercase border-4 border-black flex items-center gap-3 hover:bg-white hover:text-black transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                      <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" /> Add Node Step
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {workflow.map((step, index) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={index} 
                        className="flex gap-6 items-center p-6 bg-zinc-50 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]"
                      >
                        <div className="flex-1 grid grid-cols-2 gap-8">
                          <div className="space-y-2">
                            <label className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Personnel Node</label>
                            <input 
                              placeholder="EMPLOYEE_NAME" 
                              className="w-full border-4 border-black p-4 text-[12px] font-black uppercase outline-none focus:bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                              value={step.employeeName}
                              onChange={(e) => updateWorkflowStep(index, 'employeeName', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Target Work Packet</label>
                            <input 
                              placeholder="ASSIGNED_WORK_NAME" 
                              className="w-full border-4 border-black p-4 text-[12px] font-black uppercase outline-none focus:bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                              value={step.taskName}
                              onChange={(e) => updateWorkflowStep(index, 'taskName', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="pt-6">
                          {workflow.length > 1 && (
                            <button type="button" onClick={() => removeWorkflowStep(index)} className="p-4 border-4 border-black bg-white hover:bg-red-600 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none translate-y-0 active:translate-y-1">
                              <Trash2 className="h-6 w-6" />
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
                  className="col-span-2 py-8 bg-black text-white font-black uppercase text-xl border-4 border-black hover:bg-white hover:text-black transition-all shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] active:shadow-none translate-y-0 active:translate-y-2 flex items-center justify-center gap-6 disabled:opacity-50 mt-10"
                >
                  {uploading ? <Loader2 className="animate-spin h-10 w-10" /> : <Send className="h-10 w-10" />}
                  {uploading ? "TRANSMITTING ENCRYPTED ASSETS..." : "INITIALIZE MISSION PROTOCOLS"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setSelectedProject(null)} />
            <motion.div 
              initial={{x:100, opacity:0}} 
              animate={{x:0, opacity:1}} 
              exit={{x:100, opacity:0}} 
              className="relative bg-white border-8 border-black w-full max-w-6xl h-[95vh] overflow-y-auto p-16 shadow-[40px_40px_0px_0px_rgba(0,0,0,1)] custom-scrollbar"
            >
              <button onClick={() => setSelectedProject(null)} className="absolute top-10 right-10 p-4 border-4 border-black hover:bg-black hover:text-white transition-all"><X className="h-10 w-10" /></button>
              
              <div className="flex flex-col lg:flex-row justify-between gap-12 mb-16 border-b-8 border-black pb-12">
                <div className="space-y-8 flex-1">
                  <div className="flex items-center gap-6">
                    <span className={`px-8 py-3 border-4 border-black text-[12px] font-black uppercase ${getStatusColor(selectedProject.status)} text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`}>
                      {selectedProject.status}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400">Node_ID: {selectedProject._id}</span>
                  </div>
                  <h2 className="text-7xl font-black uppercase italic tracking-tighter leading-none text-black">{selectedProject.title}</h2>
                  <div className="flex flex-wrap gap-6">
                    <div className="flex items-center gap-4 text-[11px] font-black uppercase px-6 py-3 bg-zinc-100 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                      <Clock className="h-5 w-5 text-blue-500" /> Commenced: {selectedProject.startDate ? format(new Date(selectedProject.startDate), 'dd MMM yyyy') : 'NO_DATE'}
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-black uppercase px-6 py-3 bg-zinc-100 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                      <Calendar className="h-5 w-5 text-red-500" /> Deadline: {format(new Date(selectedProject.deadline), 'dd MMM yyyy')}
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-black uppercase px-6 py-3 bg-zinc-100 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                      <Target className="h-5 w-5 text-purple-500" /> {selectedProject.priority} Priority
                    </div>
                  </div>
                </div>
                <div className="lg:text-right flex flex-col justify-end">
                  <p className="text-[12px] font-black uppercase text-zinc-400 mb-4 tracking-[0.4em]">Grid Sync Progress</p>
                  <div className="text-9xl font-black italic tracking-tighter leading-none">{selectedProject.progress}%</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                <div className="lg:col-span-2 space-y-16">
                  <div className="space-y-6">
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter border-b-8 border-black pb-4 flex items-center gap-5">
                      <FileText className="h-8 w-8" /> Mission Briefing
                    </h3>
                    <div className="p-10 bg-zinc-50 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,0.05)]">
                      <p className="text-lg font-bold leading-relaxed text-zinc-700 uppercase whitespace-pre-wrap">{selectedProject.description}</p>
                    </div>
                  </div>

                  {selectedProject.workflow && selectedProject.workflow.length > 0 && (
                    <div className="space-y-6">
                      <h3 className="text-3xl font-black uppercase italic tracking-tighter border-b-8 border-black pb-4 flex items-center gap-5">
                        <Activity className="h-8 w-8" /> Operational Grid Workflow
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        {selectedProject.workflow.map((w, i) => (
                          <div key={i} className="group p-8 border-4 border-black flex justify-between items-center bg-white hover:bg-black hover:text-white transition-all shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center gap-6">
                              <div className="w-12 h-12 border-4 border-black flex items-center justify-center font-black group-hover:border-white">
                                {i + 1}
                              </div>
                              <span className="text-sm font-black uppercase tracking-widest">{w.employeeName}</span>
                            </div>
                            <ArrowRight className="h-6 w-6 group-hover:translate-x-4 transition-transform" />
                            <span className="text-sm font-black uppercase opacity-60">{w.taskName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-8">
                    <div className="flex justify-between items-center border-b-8 border-black pb-4">
                      <h3 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-5">
                        <CheckCircle2 className="h-8 w-8" /> Active Node Deployments
                      </h3>
                      {isAdmin && (
                        <button 
                          onClick={() => setIsAssignModalOpen(true)}
                          className="px-8 py-4 bg-black text-white text-[12px] font-black uppercase border-4 border-black hover:bg-white hover:text-black transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                        >
                          <UserPlus className="h-5 w-5 inline mr-2" /> Deploy New Node Task
                        </button>
                      )}
                    </div>
                    <div className="p-20 border-8 border-black border-dashed flex flex-col items-center justify-center opacity-20 text-center bg-zinc-50 group">
                      <Plus className="h-20 w-20 mb-8 group-hover:rotate-180 transition-transform duration-1000" />
                      <p className="text-xl font-black uppercase tracking-[0.5em]">Establishing Sub-Node Infrastructure...</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-16">
                  <div className="space-y-6">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter border-b-8 border-black pb-4 flex items-center gap-4">
                      <Users className="h-6 w-6" /> Assigned Personnel Nodes
                    </h3>
                    <div className="space-y-4">
                      {selectedProject.members?.map((m, i) => (
                        <div key={i} className="p-6 border-4 border-black flex items-center gap-5 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
                          <div className="w-12 h-12 bg-black text-white flex items-center justify-center border-4 border-black font-black text-xl">{m.name[0]}</div>
                          <div className="flex flex-col">
                            <span className="text-[12px] font-black uppercase">{m.name}</span>
                            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{m.role}</span>
                          </div>
                        </div>
                      ))}
                      {selectedProject.members?.length === 0 && (
                        <div className="p-10 border-4 border-black border-dashed flex flex-col items-center justify-center opacity-30 text-center">
                          <Users className="h-8 w-8 mb-4" />
                          <p className="text-[10px] font-black uppercase">Grid Vacant</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter border-b-8 border-black pb-4 flex items-center gap-4">
                      <Paperclip className="h-6 w-6" /> Secure Resources
                    </h3>
                    <div className="space-y-4">
                      {selectedProject.documentation && (
                        <button 
                          onClick={() => window.open(selectedProject.documentation, '_blank')}
                          className="w-full p-6 border-4 border-black text-left flex items-center justify-between hover:bg-black hover:text-white transition-all bg-zinc-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] group"
                        >
                          <div className="flex items-center gap-4">
                            <FileText className="h-6 w-6" />
                            <span className="text-[11px] font-black uppercase tracking-tighter">Core Mission Protocol.pdf</span>
                          </div>
                          <Download className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        {selectedProject.attachments?.map((att, i) => (
                          <div key={i} className="aspect-square border-4 border-black overflow-hidden group relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <img src={att.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform cursor-pointer" onClick={() => window.open(att.url, '_blank')} />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="text-white h-8 w-8" />
                            </div>
                          </div>
                        ))}
                      </div>

                      {isAdmin && (
                        <button className="w-full p-8 border-4 border-black border-dashed text-center flex flex-col items-center justify-center hover:bg-zinc-50 transition-all opacity-40 group mt-6">
                          <Plus className="h-10 w-10 mb-4 group-hover:rotate-90 transition-transform" />
                          <span className="text-[10px] font-black uppercase italic">Buffer Additional Assets</span>
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
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsAssignModalOpen(false)} />
            <motion.div 
              initial={{scale:0.9, opacity:0, y: 50}} 
              animate={{scale:1, opacity:1, y: 0}} 
              exit={{scale:0.9, opacity:0, y: 50}} 
              className="relative bg-white border-8 border-black w-full max-w-xl p-12 shadow-[30px_30px_0px_0px_rgba(0,0,0,1)]"
            >
              <button onClick={() => setIsAssignModalOpen(false)} className="absolute top-8 right-8 p-3 border-4 border-black hover:bg-black hover:text-white transition-all"><X className="h-8 w-8" /></button>
              
              <div className="mb-10 border-b-8 border-black pb-6">
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">Deploy Sub-Node Task</h2>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.4em] mt-2 italic">Operation: {selectedProject?.title}</p>
              </div>

              <form onSubmit={handleAssignTask} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest block">Mission Task Objective</label>
                  <input name="title" className="w-full border-4 border-black p-5 text-sm font-black uppercase outline-none focus:bg-zinc-50 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" placeholder="TASK_IDENTITY" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest block">Assign To Personnel Node</label>
                  <select name="assignedTo" className="w-full border-4 border-black p-5 text-sm font-black uppercase outline-none bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" required>
                    <option value="">SELECT_NODE...</option>
                    {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest block">Priority Class</label>
                    <select name="priority" className="w-full border-4 border-black p-5 text-sm font-black uppercase outline-none bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                      <option value="medium">STANDARD_SYNC</option>
                      <option value="high">HIGH_PRIORITY</option>
                      <option value="urgent">URGENT_OVERRIDE</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest block">Node Sync Deadline</label>
                    <input name="dueDate" type="date" className="w-full border-4 border-black p-5 text-sm font-black uppercase outline-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" required />
                  </div>
                </div>
                <button type="submit" className="w-full py-6 bg-black text-white font-black uppercase text-sm border-4 border-black hover:bg-white hover:text-black transition-all shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:shadow-none translate-y-0 active:translate-y-2 flex items-center justify-center gap-4">
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
