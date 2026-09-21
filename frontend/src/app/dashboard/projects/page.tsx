"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { 
  Plus, Search, Filter, Calendar, 
  Clock, AlertCircle, Users, 
  FileText, ExternalLink, Trash2,
  BarChart3, Loader2, X,
  Activity, Briefcase, Paperclip,
  Target, Send, ImageIcon, Globe,
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
  progress: number;
  members: any[];
  clientInfo?: { name: string; company: string; };
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
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const [projRes, statsRes, usersRes] = await Promise.all([
        api.get("projects"),
        api.get("projects/stats"),
        api.get("auth/contacts")
      ]);
      setProjects(projRes.data);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    const formData = new FormData(e.currentTarget);
    const rawData = Object.fromEntries(formData);
    try {
      const projectData = {
        title: rawData.title,
        priority: rawData.priority,
        deadline: rawData.deadline,
        startDate: rawData.startDate,
        description: rawData.description,
        clientInfo: {
          name: rawData.clientName as string,
          company: rawData.clientType === 'personal' ? 'Internal' : (rawData.clientName as string)
        },
        workflow: workflow.filter(w => w.employeeName && w.taskName)
      };
      await api.post("projects", projectData);
      setIsCreateModalOpen(false);
      fetchProjects();
    } catch (err) { console.error(err); } finally { setUploading(false); }
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Mission Manifest...</p>
      </div>
    );
  }

  const filteredProjects = projects.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-12">
      {/* Header & Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Project Manifest</h1>
          <p className="text-muted-foreground text-sm max-w-lg">Strategic oversight and lifecycle management for enterprise assets.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Initialize Project
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Load", value: stats?.total || 0, icon: Briefcase, color: "zinc" },
          { label: "High Priority", value: projects.filter(p => p.priority === 'urgent' || p.priority === 'high').length, icon: AlertCircle, color: "rose" },
          { label: "In Production", value: projects.filter(p => p.status === 'in-progress').length, icon: Activity, color: "indigo" },
          { label: "Overdue Cycles", value: stats?.overdue || 0, icon: Clock, color: "amber" },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="premium-card p-6 bg-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl border border-border ${stat.color === 'rose' ? 'bg-rose-50 text-rose-600' : stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : stat.color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-muted text-foreground'}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold tracking-tight tabular-nums">{stat.value}</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Table */}
      <div className="premium-card bg-card overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/5">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Filter by title..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-background border border-border rounded-xl text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/10 border-b border-border">
                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Strategic Asset</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Priority</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Deadline</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProjects.map((project) => (
                <tr 
                  key={project._id} 
                  onClick={() => setSelectedProject(project)}
                  className="hover:bg-muted/10 cursor-pointer transition-all group"
                >
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold truncate max-w-[200px]">{project.title}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">{project.clientInfo?.company || 'Internal Node'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight ${
                      project.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-muted text-muted-foreground'
                    }`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="p-6">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight ${
                      project.priority === 'urgent' ? 'bg-rose-50 text-rose-600' : project.priority === 'high' ? 'bg-amber-50 text-amber-600' : 'bg-muted text-muted-foreground'
                    }`}>
                      {project.priority}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      {(() => {
                        if (!project.deadline) return 'Standby';
                        const d = new Date(project.deadline);
                        return isNaN(d.getTime()) ? 'Invalid Date' : format(d, 'dd MMM yyyy');
                      })()}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[10px] font-bold tabular-nums">{project.progress}%</span>
                      <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${project.progress}%` }} />
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)} />
            <motion.div 
              initial={{scale:0.95, opacity:0, y: 20}} animate={{scale:1, opacity:1, y: 0}}
              className="relative bg-card border border-border rounded-[2.5rem] w-full max-w-4xl p-10 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-bold tracking-tight">Initialize Mission</h2>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-muted rounded-xl transition-all"><X className="w-6 h-6" /></button>
              </div>

              <form onSubmit={handleCreateProject} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Asset Title</label>
                  <input name="title" className="w-full p-4 bg-muted border border-border rounded-2xl text-sm outline-none focus:ring-1 focus:ring-primary transition-all" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Timeline Cycle</label>
                  <input name="deadline" type="date" className="w-full p-4 bg-muted border border-border rounded-2xl text-sm outline-none transition-all" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Priority Rank</label>
                  <select name="priority" className="w-full p-4 bg-muted border border-border rounded-2xl text-sm outline-none transition-all">
                    <option value="low">Standard</option>
                    <option value="medium">Active</option>
                    <option value="high">Critical</option>
                    <option value="urgent">Immediate</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Operational Briefing</label>
                  <textarea name="description" rows={4} className="w-full p-4 bg-muted border border-border rounded-2xl text-sm outline-none transition-all resize-none" />
                </div>
                <button type="submit" disabled={uploading} className="md:col-span-2 py-5 bg-primary text-primary-foreground font-bold uppercase text-xs tracking-widest rounded-3xl hover:opacity-90 transition-all flex items-center justify-center gap-3">
                  {uploading ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
                  Deploy Mission Node
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setSelectedProject(null)} />
            <motion.div 
              initial={{scale: 0.95, opacity:0, y: 20}} animate={{scale: 1, opacity:1, y: 0}}
              className="relative bg-card border border-border rounded-[2.5rem] w-full max-w-6xl h-[90vh] overflow-y-auto p-12 shadow-2xl custom-scrollbar"
            >
              <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
                <div className="space-y-6 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-bold uppercase tracking-tight">{selectedProject.status}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">NODE_ID: {selectedProject._id}</span>
                  </div>
                  <h2 className="text-5xl font-bold tracking-tight leading-none">{selectedProject.title}</h2>
                  <div className="flex flex-wrap gap-3">
                    <div className="px-4 py-2 bg-muted border border-border rounded-xl text-xs font-bold flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> 
                      {(() => {
                        if (!selectedProject.deadline) return 'No Date';
                        const d = new Date(selectedProject.deadline);
                        return isNaN(d.getTime()) ? 'Invalid Date' : format(d, 'dd MMM yyyy');
                      })()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-2">Sync Status</p>
                  <div className="text-8xl font-bold tracking-tighter text-foreground">{selectedProject.progress}%</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                <div className="lg:col-span-2 space-y-12">
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold border-l-4 border-primary pl-4">Mission Briefing</h3>
                    <div className="p-8 bg-muted/30 rounded-[2rem] border border-border">
                      <p className="text-base leading-relaxed text-muted-foreground">{selectedProject.description}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-12">
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold border-l-4 border-primary pl-4">Assigned Personnel</h3>
                    <div className="space-y-3">
                      {selectedProject.members?.map((m, i) => (
                        <div key={i} className="p-4 bg-muted/50 border border-border rounded-2xl flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary text-primary-foreground flex items-center justify-center rounded-xl font-bold text-sm">{m.name[0]}</div>
                          <div>
                            <p className="text-sm font-bold">{m.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">{m.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
