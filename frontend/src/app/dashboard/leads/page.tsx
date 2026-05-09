"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { 
  FileSearch, Plus, Upload, Download, Search, Filter, Mail, Phone, Building, 
  ChevronLeft, ChevronRight, Loader2, Trash2, Edit, X, Check,
  AlertTriangle, Info, MoreVertical, ExternalLink, Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useTrash } from "@/hooks/useTrash";
import * as XLSX from "xlsx";

type Tab = "active" | "trash" | "personnel";

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'closed' | 'lost';
  assignedTo?: {
    _id: string;
    name: string;
  } | any;
  createdAt: string;
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  isDeleted?: boolean;
}

export default function LeadsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { addToTrash, getByType, removeFromTrash, clearTrash } = useTrash();

  const [activeTab, setActiveTab] = useState<Tab>("active");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const [totalPages, setTotalPages] = useState(1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [analysisNode, setAnalysisNode] = useState<Employee | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    source: "Direct",
    status: "new",
    assignedTo: ""
  });

  // Debounced search logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== "") {
        fetchLeads();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, page]);

  useEffect(() => {
    if (searchTerm === "") {
      fetchLeads();
    }
  }, [searchTerm, page]);

  // ── Employee guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (user && user.role === 'employee') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const fetchLeads = useCallback(async () => {
    if (!user || user.role === 'employee') return;
    try {
      setLoading(true);
      const { data } = await api.get(`leads?page=${page}&limit=10&search=${debouncedSearchTerm}`);
      const leadData = data?.leads || (Array.isArray(data) ? data : []);
      setLeads(leadData);
      setTotalPages(data?.pages || 1);
    } catch (err) {
      console.error("Failed to fetch leads", err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearchTerm, user]);

  const fetchEmployees = useCallback(async () => {
    try {
      const { data } = await api.get("auth/contacts");
      const list: Employee[] = Array.isArray(data) ? data : (data?.users || []);
      setEmployees(list.filter((u) => !u.isDeleted));
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    if (user?.role !== 'employee') fetchEmployees();
  }, [fetchLeads, fetchEmployees, user]);

  const handleExport = () => {
    if (leads.length === 0) return;
    const exportData = leads.map(l => ({
      ID: l._id,
      Name: l.name,
      Email: l.email,
      Phone: l.phone || "N/A",
      Company: l.company || "Independent Hub",
      Status: l.status.toUpperCase(),
      Source: l.source,
      "Created At": new Date(l.createdAt).toLocaleString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Active_Leads");
    XLSX.writeFile(wb, `leads_intelligence_${Date.now()}.xlsx`);
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("leads", newLead);
      setIsAddModalOpen(false);
      setNewLead({ name: "", email: "", phone: "", company: "", source: "Direct", status: "new", assignedTo: "" });
      fetchLeads();
      setMessage({ text: "Lead authorized successfully", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || "Transmission failed", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("file", importFile);
    try {
      const { data } = await api.post("leads/import", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setMessage({ text: data.message, type: "success" });
      setIsImportModalOpen(false);
      setImportFile(null);
      fetchLeads();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || "Ingestion failed", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    if (!confirm(`Move ${lead.name} to archive?`)) return;
    try {
      addToTrash({ id: lead._id, type: "lead", data: lead });
      await api.delete(`leads/${lead._id}`);
      fetchLeads();
      setMessage({ text: "Entity moved to archive", type: "success" });
    } catch {
      setMessage({ text: "Deauthorization failed", type: "error" });
    }
  };
  
  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setIsSubmitting(true);
    try {
      await api.put(`leads/${selectedLead._id}`, selectedLead);
      setIsEditModalOpen(false);
      setSelectedLead(null);
      fetchLeads();
      setMessage({ text: "Entity updated successfully", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || "Update failed", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreLead = async (trashId: string, leadData: any) => {
    setIsSubmitting(true);
    try {
      const cleanData = { ...leadData };
      delete cleanData._id; delete cleanData.createdAt; delete cleanData.updatedAt;
      await api.post("leads", cleanData);
      removeFromTrash(trashId);
      fetchLeads();
      setMessage({ text: "Entity restored to active sector", type: "success" });
    } catch (err) {
      setMessage({ text: "Restoration failed", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyse = async (emp: Employee) => {
    setAnalysisNode(emp);
    setAnalyzing(true);
    try {
      const { data } = await api.get(`auth/profile/${emp._id}`);
      setAnalysisData({
        stats: {
          score: data.honorScore?.score || 0,
          taskRate: data.totalTasks > 0 ? ((data.honorScore?.tasksCompleted / data.totalTasks) * 100).toFixed(0) : 0,
          doneTasks: data.honorScore?.tasksCompleted || 0,
          totalTasks: data.totalTasks || 0,
          totalReports: data.honorScore?.reportsSubmitted || 0
        },
        reports: data.recentTasks || []
      });
    } catch (err) {
      console.error("Analysis failed", err);
      setMessage({ text: "Failed to gather node intelligence", type: "error" });
    } finally {
      setAnalyzing(false);
    }
  };

  const trashedLeads = getByType("lead");

  return (
    <div className="space-y-16 pb-32">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12">
        <div className="space-y-4">
          <h1 className="text-5xl font-black tracking-tight text-zinc-950 uppercase leading-none">
            Leads <span className="text-zinc-300">Database</span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="w-10 h-1 bg-brand-indigo rounded-full" />
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] italic flex items-center gap-3">
              <FileSearch className="h-4 w-4 text-brand-indigo" /> Enterprise intelligence nexus
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          {user?.role === 'admin' && (
            <>
              <button 
                onClick={handleExport}
                className="flex items-center gap-4 px-8 py-5 bg-white border border-zinc-200 text-zinc-950 text-[10px] font-black uppercase tracking-widest rounded-[2rem] hover:bg-zinc-50 hover:shadow-xl transition-all shadow-sm"
              >
                <Download className="h-4 w-4" /> Export Intel
              </button>
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-4 px-8 py-5 bg-white border border-zinc-200 text-zinc-950 text-[10px] font-black uppercase tracking-widest rounded-[2rem] hover:bg-zinc-50 hover:shadow-xl transition-all shadow-sm"
              >
                <Upload className="h-4 w-4" /> Bulk Import
              </button>
            </>
          )}
          {user?.role === 'manager' && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-4 px-10 py-5 bg-zinc-950 text-white text-[11px] font-black uppercase tracking-widest rounded-[2rem] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/20"
            >
              <Plus className="h-5 w-5" /> Add New Lead
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {/* Tabs */}
      <div className="flex bg-zinc-100/50 p-2 rounded-[2.5rem] border border-zinc-100 shadow-inner overflow-x-auto no-scrollbar gap-2 w-fit">
        <button 
          onClick={() => setActiveTab("active")}
          className={`px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-[2rem] whitespace-nowrap ${
            activeTab === 'active' ? 'bg-white text-zinc-950 shadow-xl' : 'text-zinc-400 hover:text-zinc-950'
          }`}
        >
          Active Nexus ({leads.length})
        </button>
        <button 
          onClick={() => setActiveTab("trash")}
          className={`px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-[2rem] whitespace-nowrap ${
            activeTab === 'trash' ? 'bg-brand-rose text-white shadow-xl shadow-brand-rose/20' : 'text-brand-rose hover:bg-rose-50/50'
          }`}
        >
          Archive Hub ({trashedLeads.length})
        </button>
        {user?.role === 'admin' && (
          <button 
            onClick={() => setActiveTab("personnel")}
            className={`px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-[2rem] whitespace-nowrap ${
              activeTab === 'personnel' ? 'bg-brand-indigo text-white shadow-xl shadow-brand-indigo/20' : 'text-brand-indigo hover:bg-brand-indigo/5'
            }`}
          >
            Node Records ({employees.length})
          </button>
        )}
      </div>

      {activeTab === "active" ? (
        <>
          {/* Search & Filters */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="relative flex-1 group">
              <Search className="absolute left-8 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-300 group-focus-within:text-black transition-colors" />
              <input 
                type="text" 
                placeholder="SEARCH ENCRYPTED INTEL..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="w-full pl-20 pr-8 py-6 bg-white border border-zinc-200 rounded-[2.5rem] focus:outline-none focus:ring-8 focus:ring-black/5 focus:border-black text-[11px] font-black uppercase tracking-widest transition-all shadow-sm"
              />
            </div>
            <button className="flex items-center justify-center px-10 py-6 bg-white border border-zinc-200 rounded-[2.5rem] text-zinc-500 hover:text-black hover:border-black transition-all text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">
              <Filter className="mr-4 h-5 w-5" /> Filter Protocols
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-[4rem] border border-zinc-100 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="p-10 text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400">Identification</th>
                    <th className="p-10 text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400">Contact Node</th>
                    <th className="p-10 text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400">Assigned Operator</th>
                    <th className="p-10 text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 text-center">Entity Status</th>
                    <th className="p-10 text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-40 text-center">
                        <Loader2 className="h-12 w-12 animate-spin mx-auto text-black mb-6" />
                        <span className="text-[10px] font-black uppercase tracking-[0.8em] text-zinc-300 animate-pulse">Syncing Database...</span>
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-40 text-center uppercase font-black text-xs text-zinc-300 italic tracking-[0.4em]">No intelligence records found</td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr key={lead._id} className="hover:bg-zinc-50/50 transition-all group cursor-pointer">
                        <td className="p-10">
                          <p className="text-lg font-black text-zinc-950 uppercase tracking-tight group-hover:text-black transition-colors">{lead.name}</p>
                          <p className="text-[10px] font-black text-zinc-400 uppercase flex items-center mt-2.5 tracking-[0.2em] italic">
                            <Building className="h-4 w-4 mr-2.5 text-zinc-300" /> {lead.company || "Independent Hub"}
                          </p>
                        </td>
                        <td className="p-10">
                          <div className="space-y-2.5">
                            <div className="flex items-center text-[12px] font-black text-zinc-950 italic"><Mail className="h-4 w-4 mr-3 text-zinc-300" /> {lead.email}</div>
                            {lead.phone && <div className="flex items-center text-[10px] font-black text-zinc-400 uppercase tracking-widest"><Phone className="h-4 w-4 mr-3 text-zinc-300" /> {lead.phone}</div>}
                          </div>
                        </td>
                        <td className="p-10">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-zinc-100 border border-zinc-200 rounded-2xl flex items-center justify-center text-[12px] font-black text-zinc-400 group-hover:bg-zinc-950 group-hover:text-white transition-all shadow-sm">
                              {lead.assignedTo?.name?.[0] || "?"}
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-zinc-950">{lead.assignedTo?.name || "UNASSIGNED"}</span>
                          </div>
                        </td>
                        <td className="p-10 text-center">
                          <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-zinc-100 bg-white shadow-sm ${
                            lead.status === 'closed' ? 'text-brand-emerald' :
                            lead.status === 'lost' ? 'text-brand-rose' :
                            'text-brand-amber'
                          }`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="p-10 text-right">
                          <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                            <button 
                              onClick={() => { setSelectedLead(lead); setIsEditModalOpen(true); }}
                              className="p-4 bg-white border border-zinc-200 rounded-[1.5rem] text-zinc-400 hover:text-black hover:border-black hover:shadow-xl transition-all shadow-sm"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            {user?.role === 'admin' && (
                              <button onClick={() => handleDeleteLead(lead)} className="p-4 bg-white border border-zinc-200 rounded-[1.5rem] text-zinc-400 hover:text-brand-rose hover:border-brand-rose hover:shadow-xl transition-all shadow-sm"><Trash2 className="h-5 w-5" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-zinc-300 tracking-[0.2em] italic">Fragment: {page} / {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page-1)} className="p-4 bg-white border border-zinc-100 rounded-2xl hover:bg-zinc-50 disabled:opacity-30 transition-all shadow-sm"><ChevronLeft className="h-6 w-6" /></button>
              <button disabled={page >= totalPages} onClick={() => setPage(page+1)} className="p-4 bg-white border border-zinc-100 rounded-2xl hover:bg-zinc-50 disabled:opacity-30 transition-all shadow-sm"><ChevronRight className="h-6 w-6" /></button>
            </div>
          </div>
        </>
      ) : activeTab === "trash" ? (
        /* TRASH HUB */
        <div className="space-y-6">
          <div className="p-10 bg-brand-rose/5 rounded-[2.5rem] border border-brand-rose/10 flex flex-col md:flex-row md:items-center gap-8">
            <div className="w-20 h-20 bg-brand-rose/10 rounded-3xl flex items-center justify-center text-brand-rose">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-black text-zinc-900 uppercase">Archive Protocol</h4>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Archived leads are restricted from the live grid</p>
            </div>
            <button onClick={() => { if(confirm("Permanently purge lead archive?")) clearTrash(); }} className="px-8 py-4 bg-brand-rose text-white text-xs font-bold rounded-2xl hover:scale-105 transition-all shadow-xl shadow-brand-rose/20">Purge Archive</button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {trashedLeads.length === 0 ? (
              <div className="p-32 text-center text-zinc-200">
                <p className="text-sm font-black uppercase tracking-widest italic">Archive empty</p>
              </div>
            ) : (
              trashedLeads.map((item) => (
                <div key={item.id} className="p-8 bg-white border border-zinc-100 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-xl transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-200"><Trash2 className="h-6 w-6" /></div>
                    <div>
                      <p className="text-lg font-black text-zinc-900 uppercase tracking-tight">{item.data.name}</p>
                      <p className="text-[10px] font-bold text-zinc-300 uppercase mt-1 tracking-widest">Archived on {new Date(item.deletedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleRestoreLead(item.id, item.data)} className="px-8 py-4 bg-zinc-900 text-white text-xs font-bold rounded-2xl hover:scale-105 transition-all">Restore Entity</button>
                    <button onClick={() => removeFromTrash(item.id)} className="p-4 bg-zinc-50 rounded-2xl text-zinc-300 hover:text-brand-rose transition-all"><X className="h-5 w-5" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* PERSONNEL ARCHIVE */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {employees.map((emp) => (
            <div key={emp._id} className="group bg-white rounded-[2.5rem] border border-zinc-100 p-8 hover:shadow-2xl hover:border-black/5 transition-all duration-500 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-1.5 bg-brand-indigo/30" />
              <div className="flex items-start justify-between mb-8">
                <div className="w-16 h-16 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-center text-3xl font-black text-zinc-900 group-hover:bg-black group-hover:text-white transition-all shadow-sm">
                  {emp.name?.[0]?.toUpperCase()}
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase text-zinc-300 block mb-1.5 tracking-widest">Access Node</span>
                  <span className="px-3 py-1 bg-zinc-100 rounded-full text-[9px] font-black uppercase text-zinc-500">{emp.role}</span>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">{emp.name}</h3>
                <p className="text-xs font-bold text-zinc-400 flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {emp.email}</p>
                <div className="pt-6 flex gap-3">
                  <button 
                    onClick={() => handleAnalyse(emp)}
                    className="flex-1 py-4 bg-brand-indigo text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-brand-indigo/20"
                  >
                    Analyse Node
                  </button>
                  <button 
                    onClick={() => router.push(`/dashboard/messages?contactId=${emp._id}`)}
                    className="flex-1 py-4 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all"
                  >
                    Message
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[1500] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 20, opacity: 0 }} className="relative bg-white rounded-[3rem] w-full max-w-xl p-12 shadow-2xl overflow-hidden">
              <h2 className="text-4xl font-black text-zinc-900 uppercase tracking-tight mb-10">Authorize Entity</h2>
              <form onSubmit={handleAddLead} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Full Legal Name</label>
                  <input required value={newLead.name} onChange={(e) => setNewLead({...newLead, name: e.target.value})} placeholder="ENTER FULL NAME..." className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-6 text-sm font-bold uppercase outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Email Node</label>
                    <input required type="email" value={newLead.email} onChange={(e) => setNewLead({...newLead, email: e.target.value})} placeholder="NODE@EMAIL.COM" className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-6 text-sm font-bold outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Phone ID</label>
                    <input value={newLead.phone} onChange={(e) => setNewLead({...newLead, phone: e.target.value})} placeholder="+00 000 000" className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-6 text-sm font-bold outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Assign Intel Operator</label>
                  <select value={newLead.assignedTo} onChange={(e) => setNewLead({...newLead, assignedTo: e.target.value})} className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-6 text-sm font-bold uppercase outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all appearance-none bg-white">
                    <option value="">SELF_ASSIGNMENT</option>
                    {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name.toUpperCase()}</option>)}
                  </select>
                </div>
                <button disabled={isSubmitting} className="w-full py-6 bg-black text-white text-xs font-black uppercase tracking-widest rounded-[2rem] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/30">
                  {isSubmitting ? <Loader2 className="animate-spin h-6 w-6 mx-auto" /> : "Authorize Entry"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isEditModalOpen && selectedLead && (
          <div className="fixed inset-0 z-[1500] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 20, opacity: 0 }} className="relative bg-white rounded-[3rem] w-full max-w-xl p-12 shadow-2xl overflow-hidden">
              <h2 className="text-4xl font-black text-zinc-900 uppercase tracking-tight mb-10">Update Record</h2>
              <form onSubmit={handleUpdateLead} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Name</label>
                  <input required value={selectedLead.name} onChange={(e) => setSelectedLead({...selectedLead, name: e.target.value})} className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-6 text-sm font-bold uppercase outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Status Protocol</label>
                    <select value={selectedLead.status} onChange={(e) => setSelectedLead({...selectedLead, status: e.target.value as any})} className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-6 text-sm font-bold uppercase outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all appearance-none bg-white">
                      <option value="new">NEW</option>
                      <option value="contacted">CONTACTED</option>
                      <option value="qualified">QUALIFIED</option>
                      <option value="closed">CLOSED</option>
                      <option value="lost">LOST</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Operator Assignment</label>
                    <select value={(typeof selectedLead.assignedTo === 'object' ? selectedLead.assignedTo?._id : selectedLead.assignedTo) || ""} onChange={(e) => setSelectedLead({...selectedLead, assignedTo: e.target.value})} className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-6 text-sm font-bold uppercase outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all appearance-none bg-white">
                      <option value="">UNASSIGNED</option>
                      {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
                <button disabled={isSubmitting} className="w-full py-6 bg-black text-white text-xs font-black uppercase tracking-widest rounded-[2rem] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/30">
                  {isSubmitting ? <Loader2 className="animate-spin h-6 w-6 mx-auto" /> : "Update Protocol"}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isImportModalOpen && (
          <div className="fixed inset-0 z-[1500] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsImportModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 20, opacity: 0 }} className="relative bg-white rounded-[3rem] w-full max-w-md p-12 shadow-2xl overflow-hidden">
              <h2 className="text-3xl font-black text-zinc-900 uppercase tracking-tight mb-8">Bulk Ingestion</h2>
              <form onSubmit={handleImport} className="space-y-8">
                <div className="h-[200px] border-2 border-dashed border-zinc-200 rounded-[2rem] flex flex-col items-center justify-center p-10 hover:bg-zinc-50 hover:border-black transition-all relative cursor-pointer group">
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
                  <Upload className="h-12 w-12 text-zinc-200 mb-4 group-hover:scale-110 group-hover:text-black transition-all" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-black">Drop Intel Matrix</p>
                  {importFile && <p className="mt-4 text-[10px] font-bold text-brand-emerald bg-brand-emerald/10 px-3 py-1 rounded-full">{importFile.name}</p>}
                </div>
                <button disabled={isSubmitting || !importFile} className="w-full py-6 bg-black text-white text-xs font-black uppercase tracking-widest rounded-[2rem] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/30">
                  Execute Ingestion
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Message Toast */}
      <AnimatePresence>
        {message.text && (
          <motion.div 
            initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
            className={`fixed bottom-12 right-12 p-6 rounded-3xl border shadow-2xl z-[200] flex items-center gap-4 ${
              message.type === 'success' ? 'bg-white border-brand-emerald text-brand-emerald shadow-brand-emerald/10' : 'bg-white border-brand-rose text-brand-rose shadow-brand-rose/10'
            }`}
          >
            <div className={`w-8 h-8 flex items-center justify-center rounded-full ${message.type === 'success' ? 'bg-brand-emerald/10' : 'bg-brand-rose/10'}`}>
              {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
            <p className="text-xs font-black uppercase tracking-tight italic pr-4">{message.text}</p>
            <button onClick={() => setMessage({ text: "", type: "" })} className="p-1 hover:bg-zinc-50 rounded-lg transition-colors"><X className="h-4 w-4 text-zinc-400" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Node Analysis Modal */}
      <AnimatePresence>
        {analysisNode && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAnalysisNode(null)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl p-12 overflow-y-auto max-h-[90vh] custom-scrollbar border border-zinc-100">
              <button onClick={() => setAnalysisNode(null)} className="absolute top-10 right-10 p-3 hover:bg-zinc-50 rounded-2xl transition-all text-zinc-400 hover:text-black"><X className="h-7 w-7" /></button>
              <div className="flex flex-col md:flex-row gap-16">
                <div className="md:w-1/3">
                  <div className="w-36 h-36 bg-zinc-50 border border-zinc-100 rounded-[2.5rem] flex items-center justify-center text-6xl font-black text-zinc-900 mb-8 shadow-sm group-hover:bg-black group-hover:text-white transition-all">{analysisNode.name?.[0]?.toUpperCase()}</div>
                  <h2 className="text-3xl font-black uppercase tracking-tight text-zinc-900 leading-none mb-3">{analysisNode.name}</h2>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-[0.3em] mb-10">{analysisNode.role}</p>
                  <div className="space-y-6 pt-8 border-t border-zinc-100">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-zinc-300 block tracking-widest">Network Address</span>
                      <span className="text-sm font-bold text-zinc-900">{analysisNode.email}</span>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-zinc-300 block tracking-widest">Mobile Node</span>
                      <span className="text-sm font-bold text-zinc-900">{analysisNode.phone || 'NO DATA'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  {analyzing ? (
                    <div className="h-full flex flex-col items-center justify-center p-32">
                      <Loader2 className="h-12 w-12 animate-spin text-black mb-6" />
                      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-300">Gathering Intel...</p>
                    </div>
                  ) : analysisData ? (
                    <div className="space-y-10">
                      <div className="bg-zinc-950 rounded-[2.5rem] p-10 flex items-center justify-between text-white shadow-2xl shadow-black/20">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-4 text-zinc-500">Node Honor Score</p>
                          <h4 className="text-7xl font-black italic tracking-tighter">{analysisData.stats.score}<span className="text-2xl text-zinc-700 ml-2">/100</span></h4>
                        </div>
                        <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center backdrop-blur-xl">
                          <Activity className="h-10 w-10 text-brand-indigo" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-8 bg-zinc-50 rounded-3xl border border-zinc-100">
                          <p className="text-[10px] font-black uppercase text-zinc-400 mb-3 tracking-widest">Efficiency Vector</p>
                          <div className="flex items-end gap-3">
                            <span className="text-3xl font-black text-zinc-900">{analysisData.stats.taskRate}%</span>
                            <span className="text-[10px] font-bold text-zinc-400 mb-1.5">({analysisData.stats.doneTasks}/{analysisData.stats.totalTasks})</span>
                          </div>
                        </div>
                        <div className="p-8 bg-zinc-50 rounded-3xl border border-zinc-100">
                          <p className="text-[10px] font-black uppercase text-zinc-400 mb-3 tracking-widest">Intel Feed Output</p>
                          <div className="flex items-end gap-3">
                            <span className="text-3xl font-black text-zinc-900">{analysisData.stats.totalReports}</span>
                            <span className="text-[10px] font-bold text-zinc-400 mb-1.5 uppercase">Packets</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <h5 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-3 text-zinc-900">
                          <div className="w-8 h-1 bg-black rounded-full" /> Recent Node Activity
                        </h5>
                        <div className="space-y-3">
                          {analysisData.reports.slice(0, 5).map((r: { _id: string; missionType?: string; status: string }) => (
                            <div key={r._id} className="p-5 bg-white border border-zinc-100 rounded-2xl flex justify-between items-center hover:shadow-md transition-all group">
                              <span className="text-xs font-bold text-zinc-900 group-hover:text-black transition-colors">Mission: {r.missionType || 'INTEL_DATA_SYNC'}</span>
                              <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${r.status === 'done' ? 'bg-brand-emerald/10 text-brand-emerald' : 'bg-brand-amber/10 text-brand-amber'}`}>
                                {r.status}
                              </span>
                            </div>
                          ))}
                          {analysisData.reports.length === 0 && <p className="text-xs font-bold text-zinc-300 italic py-10 text-center uppercase tracking-widest">No active logs found</p>}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
