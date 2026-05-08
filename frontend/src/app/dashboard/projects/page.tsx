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
  Target, Send
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
  maintenanceDate?: string;
  progress: number;
  members: any[];
  clientInfo?: {
    name: string;
    company: string;
  };
  documentation?: string;
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

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    
    try {
      await api.post("projects", data);
      setIsCreateModalOpen(false);
      fetchProjects();
    } catch (err) { console.error(err); }
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
    <div className="h-full flex flex-col items-center justify-center gap-4 opacity-30">
      <Loader2 className="animate-spin h-12 w-12" />
      <span className="text-xs font-black uppercase tracking-[0.3em]">Synchronizing Project Matrix...</span>
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-5xl font-black uppercase italic tracking-tighter flex items-center gap-4">
            <Briefcase className="h-10 w-10" /> Operational Manifest
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-loose">
            Strategic project oversight and deployment management.
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-8 py-5 bg-black text-white border-4 border-black font-black uppercase text-sm flex items-center gap-3 hover:bg-white hover:text-black transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
          >
            <Plus className="h-5 w-5" /> Initialize Project
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Assets", value: stats?.total || 0, icon: Target, color: "bg-black" },
          { label: "Critical Priority", value: projects.filter(p => p.priority === 'urgent').length, icon: AlertCircle, color: "bg-red-600" },
          { label: "In Production", value: projects.filter(p => p.status === 'in-progress').length, icon: Activity, color: "bg-blue-500" },
          { label: "Overdue Nodes", value: stats?.overdue || 0, icon: Clock, color: "bg-orange-500" },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400 mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black">{stat.value}</h3>
            </div>
            <div className={`p-4 border-4 border-black text-white ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters & List */}
      <div className="bg-white border-4 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="p-6 border-b-4 border-black flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search assets..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border-2 border-black text-xs font-black uppercase focus:outline-none focus:bg-white transition-all"
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none px-6 py-3 border-2 border-black flex items-center justify-center gap-2 text-xs font-black uppercase hover:bg-black hover:text-white transition-all">
              <Filter className="h-4 w-4" /> Filter
            </button>
            <button className="flex-1 md:flex-none px-6 py-3 border-2 border-black flex items-center justify-center gap-2 text-xs font-black uppercase hover:bg-black hover:text-white transition-all">
              <BarChart3 className="h-4 w-4" /> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black text-white border-b-4 border-black">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Operation / Asset</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Status</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Priority</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Timeline</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-black/5">
              {projects.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase())).map((project) => (
                <tr 
                  key={project._id} 
                  onClick={() => setSelectedProject(project)}
                  className="hover:bg-zinc-50 cursor-pointer transition-all group"
                >
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 border-4 border-black flex items-center justify-center ${getStatusColor(project.status)} text-white`}>
                        <Briefcase className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase truncate max-w-[200px]">{project.title}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">{project.clientInfo?.company || 'Internal Project'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={`px-4 py-2 border-2 border-black text-[10px] font-black uppercase ${getStatusColor(project.status)} text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="p-6">
                    <span className={`px-4 py-2 border-2 border-black text-[10px] font-black uppercase ${project.priority === 'urgent' ? 'bg-red-600 text-white' : 'bg-white'}`}>
                      {project.priority}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase">
                        <Calendar className="h-3 w-3" /> {project.deadline ? format(new Date(project.deadline), 'dd MMM yyyy') : 'No Deadline'}
                      </div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">ESTIMATED COMPLETION</p>
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="w-full max-w-[140px] ml-auto space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase">
                        <span>{project.progress}%</span>
                      </div>
                      <div className="h-3 border-2 border-black bg-zinc-100 overflow-hidden">
                        <div 
                          className="h-full bg-black transition-all duration-1000" 
                          style={{ width: `${project.progress}%` }} 
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
            <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="relative bg-white border-4 border-black w-full max-w-2xl p-10 shadow-[30px_30px_0px_0px_rgba(0,0,0,1)]">
              <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-6 right-6"><X className="h-6 w-6" /></button>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-8">Initialize New Asset</h2>
              <form onSubmit={handleCreateProject} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase block mb-2">Project Title</label>
                  <input name="title" className="w-full border-4 border-black p-4 text-sm font-bold uppercase outline-none focus:bg-zinc-50" required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase block mb-2">Priority</label>
                  <select name="priority" className="w-full border-4 border-black p-4 text-sm font-bold uppercase outline-none bg-white">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase block mb-2">Deadline</label>
                  <input name="deadline" type="date" className="w-full border-4 border-black p-4 text-sm font-bold uppercase outline-none" required />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase block mb-2">Description</label>
                  <textarea name="description" rows={4} className="w-full border-4 border-black p-4 text-sm font-bold uppercase outline-none resize-none focus:bg-zinc-50" />
                </div>
                <button type="submit" className="col-span-2 py-5 bg-black text-white font-black uppercase text-sm border-4 border-black hover:bg-white hover:text-black transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]">
                  Execute Protocol
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProject(null)} />
            <motion.div initial={{x:100, opacity:0}} animate={{x:0, opacity:1}} exit={{x:100, opacity:0}} className="relative bg-white border-4 border-black w-full max-w-4xl h-[90vh] overflow-y-auto p-10 shadow-[30px_30px_0px_0px_rgba(0,0,0,1)] custom-scrollbar">
              <button onClick={() => setSelectedProject(null)} className="absolute top-6 right-6"><X className="h-6 w-6" /></button>
              
              <div className="flex flex-col md:flex-row justify-between gap-8 mb-12">
                <div className="space-y-4">
                  <span className={`px-4 py-2 border-4 border-black text-[10px] font-black uppercase ${getStatusColor(selectedProject.status)} text-white`}>
                    {selectedProject.status}
                  </span>
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter">{selectedProject.title}</h2>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase px-4 py-2 bg-zinc-100 border-2 border-black">
                      <Clock className="h-4 w-4" /> Due {format(new Date(selectedProject.deadline), 'dd MMM yyyy')}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase px-4 py-2 bg-zinc-100 border-2 border-black">
                      <Target className="h-4 w-4" /> {selectedProject.priority} Priority
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Execution Progress</p>
                  <div className="text-5xl font-black">{selectedProject.progress}%</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="md:col-span-2 space-y-10">
                  <div className="space-y-4">
                    <h3 className="text-lg font-black uppercase italic tracking-tight border-b-4 border-black pb-2 flex items-center gap-3">
                      <FileText className="h-5 w-5" /> Mission Parameters
                    </h3>
                    <p className="text-sm font-bold leading-loose text-gray-600 uppercase">{selectedProject.description}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b-4 border-black pb-2">
                      <h3 className="text-lg font-black uppercase italic tracking-tight flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5" /> Sub-Tasks
                      </h3>
                      {isAdmin && (
                        <button 
                          onClick={() => setIsAssignModalOpen(true)}
                          className="px-4 py-2 bg-black text-white text-[10px] font-black uppercase border-2 border-black hover:bg-white hover:text-black transition-all"
                        >
                          Assign Work
                        </button>
                      )}
                    </div>
                    <div className="space-y-4">
                      {/* Tasks would be fetched here, for now empty state placeholder */}
                      <div className="p-8 border-4 border-black border-dashed flex flex-col items-center justify-center opacity-30 text-center">
                        <Plus className="h-8 w-8 mb-4" />
                        <p className="text-xs font-black uppercase">No Active Sub-Tasks Linked</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-10">
                  <div className="space-y-4">
                    <h3 className="text-lg font-black uppercase italic tracking-tight border-b-4 border-black pb-2 flex items-center gap-3">
                      <Users className="h-5 w-5" /> Assigned Personnel
                    </h3>
                    <div className="space-y-3">
                      {selectedProject.members?.map((m, i) => (
                        <div key={i} className="p-4 border-2 border-black flex items-center gap-3">
                          <div className="w-8 h-8 bg-black text-white flex items-center justify-center text-[10px] font-black">{m.name[0]}</div>
                          <span className="text-[10px] font-black uppercase">{m.name}</span>
                        </div>
                      ))}
                      {selectedProject.members?.length === 0 && <p className="text-[10px] font-bold text-gray-400 italic uppercase">No personnel deployed</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-black uppercase italic tracking-tight border-b-4 border-black pb-2 flex items-center gap-3">
                      <Paperclip className="h-5 w-5" /> Resources
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      <button className="p-4 border-2 border-black text-left flex items-center justify-between hover:bg-zinc-50 transition-all">
                        <span className="text-[10px] font-black uppercase">Documentation.pdf</span>
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button className="p-4 border-2 border-black text-left flex items-center justify-between hover:bg-zinc-50 transition-all opacity-50 cursor-not-allowed">
                        <span className="text-[10px] font-black uppercase italic">Add Resource +</span>
                      </button>
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
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAssignModalOpen(false)} />
            <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="relative bg-white border-4 border-black w-full max-w-lg p-10 shadow-[30px_30px_0px_0px_rgba(0,0,0,1)]">
              <button onClick={() => setIsAssignModalOpen(false)} className="absolute top-6 right-6"><X className="h-6 w-6" /></button>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-8">Deploy Personnel Task</h2>
              <form onSubmit={handleAssignTask} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase block mb-2">Task Objective</label>
                  <input name="title" className="w-full border-4 border-black p-4 text-sm font-bold uppercase outline-none" required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase block mb-2">Assign To Node</label>
                  <select name="assignedTo" className="w-full border-4 border-black p-4 text-sm font-bold uppercase outline-none bg-white" required>
                    <option value="">Select Personnel...</option>
                    {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase block mb-2">Priority</label>
                  <select name="priority" className="w-full border-4 border-black p-4 text-sm font-bold uppercase outline-none bg-white">
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase block mb-2">Deadline</label>
                  <input name="dueDate" type="date" className="w-full border-4 border-black p-4 text-sm font-bold uppercase outline-none" required />
                </div>
                <button type="submit" className="w-full py-5 bg-black text-white font-black uppercase text-sm border-4 border-black hover:bg-white hover:text-black transition-all">
                  Initialize Task
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
