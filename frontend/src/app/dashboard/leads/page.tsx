"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { 
  FileSearch, Plus, Upload, Download, Search, Filter, Mail, Phone, Building, 
  ChevronLeft, ChevronRight, Loader2, Trash2, Edit, X, 
  AlertTriangle, Info, MoreVertical, ExternalLink
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
  const [page, setPage] = useState(1);
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
      const { data } = await api.get(`leads?page=${page}&limit=10&search=${searchTerm}`);
      const leadData = data?.leads || (Array.isArray(data) ? data : []);
      setLeads(leadData);
      setTotalPages(data?.pages || 1);
    } catch (err) {
      console.error("Failed to fetch leads", err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, user]);

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
    if (!confirm(`Move ${lead.name} to local trash hub?`)) return;
    try {
      addToTrash({ id: lead._id, type: "lead", data: lead });
      await api.delete(`leads/${lead._id}`);
      fetchLeads();
      setMessage({ text: "Entity moved to trash hub", type: "success" });
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
    <div className="space-y-6 pb-20 max-w-[1400px] mx-auto px-4 sm:px-0">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic text-black leading-none">Intelligence Leads</h1>
          <p className="text-[10px] uppercase tracking-[0.4em] font-black text-gray-400 mt-2">Sector Database Protocol — Tier 1 Access</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {user?.role === 'admin' && (
            <>
              <button 
                onClick={handleExport}
                className="flex items-center px-6 py-4 bg-white border-4 border-black text-black hover:bg-zinc-50 transition-all text-[10px] font-black uppercase tracking-widest shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                <Download className="mr-2 h-4 w-4" /> Export All
              </button>
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center px-6 py-4 bg-white border-4 border-black text-black hover:bg-zinc-50 transition-all text-[10px] font-black uppercase tracking-widest shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                <Upload className="mr-2 h-4 w-4" /> Bulk Import
              </button>
            </>
          )}
          {user?.role === 'manager' && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center px-6 py-4 bg-black text-white hover:bg-zinc-900 transition-all text-[10px] font-black uppercase tracking-widest shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              <Plus className="mr-2 h-4 w-4" /> New Entry
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-4 border-black overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab("active")}
          className={`px-10 py-4 text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'active' ? 'bg-black text-white' : 'hover:bg-gray-100 text-gray-400'}`}
        >
          Active Sector ({leads.length})
        </button>
        <button 
          onClick={() => setActiveTab("trash")}
          className={`px-10 py-4 text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'trash' ? 'bg-red-600 text-white' : 'hover:bg-red-50 text-red-600'}`}
        >
          Trash Hub ({trashedLeads.length})
        </button>
        {user?.role === 'admin' && (
          <button 
            onClick={() => setActiveTab("personnel")}
            className={`px-10 py-4 text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'personnel' ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-blue-600'}`}
          >
            Personnel Archive ({employees.length})
          </button>
        )}
      </div>

      {activeTab === "active" ? (
        <>
          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search encrypted database..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="w-full pl-14 pr-6 py-5 border-4 border-black focus:outline-none bg-white text-xs font-black uppercase shadow-inner"
              />
            </div>
            <button className="flex items-center justify-center px-8 py-5 bg-white border-4 border-black text-black hover:bg-gray-100 transition-all text-[10px] font-black uppercase tracking-widest">
              <Filter className="mr-2 h-4 w-4" /> Filter Protocols
            </button>
          </div>

          {/* Table */}
          <div className="space-y-4">
            <div className="hidden md:block bg-white border-4 border-black overflow-hidden shadow-[15px_15px_0px_0px_rgba(0,0,0,1)]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="p-5 text-[11px] font-black uppercase tracking-widest">Identification</th>
                    <th className="p-5 text-[11px] font-black uppercase tracking-widest">Contact Node</th>
                    <th className="p-5 text-[11px] font-black uppercase tracking-widest">Assigned Operator</th>
                    <th className="p-5 text-[11px] font-black uppercase tracking-widest text-center">Entity Status</th>
                    <th className="p-5 text-[11px] font-black uppercase tracking-widest text-right">Ops</th>
                  </tr>
                </thead>
                <tbody className="divide-y-4 divide-black/5">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-24 text-center">
                        <Loader2 className="h-12 w-12 animate-spin mx-auto text-black mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em]">Establishing Uplink...</span>
                      </td>
                    </tr>
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-24 text-center uppercase font-black text-xs text-gray-300 italic">No intelligence matching current parameters</td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-5">
                          <p className="text-sm font-black uppercase tracking-tight">{lead.name}</p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center mt-1">
                            <Building className="h-3 w-3 mr-1" /> {lead.company || "Independent Hub"}
                          </p>
                        </td>
                        <td className="p-5">
                          <div className="space-y-1">
                            <div className="flex items-center text-[10px] font-bold text-black"><Mail className="h-3 w-3 mr-2 text-gray-400" /> {lead.email}</div>
                            {lead.phone && <div className="flex items-center text-[10px] font-bold text-gray-500"><Phone className="h-3 w-3 mr-2 text-gray-400" /> {lead.phone}</div>}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-zinc-100 border-2 border-black flex items-center justify-center text-[10px] font-black">
                              {lead.assignedTo?.name?.[0] || "?"}
                            </div>
                            <span className="text-[10px] font-black uppercase">{lead.assignedTo?.name || "UNASSIGNED"}</span>
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          <span className={`px-4 py-1.5 text-[9px] font-black uppercase border-4 ${
                            lead.status === 'closed' ? 'bg-green-50 text-green-700 border-green-600' :
                            lead.status === 'lost' ? 'bg-red-50 text-red-700 border-red-600' :
                            'bg-yellow-50 text-yellow-700 border-yellow-600'
                          }`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex justify-end gap-3">
                            <button 
                              onClick={() => { setSelectedLead(lead); setIsEditModalOpen(true); }}
                              className="p-3 border-4 border-black hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {user?.role === 'admin' && (
                              <button onClick={() => handleDeleteLead(lead)} className="p-3 border-4 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(220,38,38,0.2)] hover:shadow-none"><Trash2 className="h-4 w-4" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {leads.map((lead) => (
                <div key={lead._id} className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-black uppercase leading-none">{lead.name}</h3>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mt-2">{lead.company || "Independent Hub"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4 border-t-2 border-black/5">
                    <button onClick={() => { setSelectedLead(lead); setIsEditModalOpen(true); }} className="flex-1 py-3 border-2 border-black text-[10px] font-black uppercase">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-8">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest italic">Node Selection: {page} / {totalPages}</span>
            <div className="flex gap-3">
              <button disabled={page <= 1} onClick={() => setPage(page-1)} className="p-4 border-4 border-black hover:bg-black hover:text-white disabled:opacity-20 transition-all"><ChevronLeft className="h-6 w-6" /></button>
              <button disabled={page >= totalPages} onClick={() => setPage(page+1)} className="p-4 border-4 border-black hover:bg-black hover:text-white disabled:opacity-20 transition-all"><ChevronRight className="h-6 w-6" /></button>
            </div>
          </div>
        </>
      ) : activeTab === "trash" ? (
        /* TRASH HUB */
        <div className="space-y-6">
          <div className="p-6 bg-red-50 border-4 border-red-600 shadow-[10px_10px_0px_0px_rgba(220,38,38,0.1)] flex flex-col md:flex-row md:items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-black uppercase text-red-800">Local Trash Hub Protocol Activated</p>
              <p className="text-[10px] font-bold text-red-600 uppercase mt-1">Items here are stored locally on this node.</p>
            </div>
            <button onClick={() => { if(confirm("Purge all trashed entities permanently?")) clearTrash(); }} className="px-6 py-3 bg-red-600 text-white text-[10px] font-black uppercase border-4 border-black hover:bg-red-700 transition-all">Emergency Clear Hub</button>
          </div>

          <div className="bg-white border-4 border-black shadow-[15px_15px_0px_0px_rgba(220,38,38,0.05)] divide-y-4 divide-black/5">
            {trashedLeads.map((item) => (
              <div key={item.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-red-50/20 transition-colors gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-gray-100 border-4 border-black text-gray-400 flex items-center justify-center"><Trash2 className="h-6 w-6" /></div>
                  <div>
                    <p className="text-lg font-black uppercase italic leading-none">{item.data.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 italic">Purged: {new Date(item.deletedAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleRestoreLead(item.id, item.data)} className="flex items-center px-6 py-3 bg-black text-white text-[10px] font-black uppercase border-4 border-black hover:bg-green-600 transition-all">Restore Entity</button>
                  <button onClick={() => removeFromTrash(item.id)} className="p-3 border-4 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all"><X className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* PERSONNEL ARCHIVE */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((emp) => (
            <div key={emp._id} className="bg-white border-8 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all hover:translate-x-2 hover:translate-y-2 relative">
              <div className="absolute top-0 right-0 w-24 h-2 bg-blue-600" />
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-black text-white flex items-center justify-center text-2xl font-black italic border-4 border-black">
                  {emp.name?.[0]?.toUpperCase()}
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase text-gray-400 block mb-1">Authorization</span>
                  <span className="px-2 py-0.5 bg-zinc-100 border-2 border-black text-[8px] font-black uppercase">{emp.role}</span>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-black uppercase italic leading-none">{emp.name}</h3>
                <p className="text-[10px] font-bold text-gray-500 flex items-center gap-2"><Mail className="h-3 w-3" /> {emp.email}</p>
                <div className="pt-4 flex gap-2">
                  <button 
                    onClick={() => handleAnalyse(emp)}
                    className="flex-1 py-3 bg-blue-600 text-white text-[9px] font-black uppercase border-4 border-black hover:bg-white hover:text-blue-600 transition-all"
                  >
                    Analyse Node
                  </button>
                  <button 
                    onClick={() => router.push(`/dashboard/messages?contactId=${emp._id}`)}
                    className="flex-1 py-3 bg-black text-white text-[9px] font-black uppercase border-4 border-black hover:bg-white hover:text-black transition-all"
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} className="relative bg-white border-8 border-black w-full max-w-lg p-8 shadow-[25px_25px_0px_0px_rgba(220,38,38,1)]">
              <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-8 border-b-8 border-black pb-4">Authorize Entity</h2>
              <form onSubmit={handleAddLead} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase block mb-2 tracking-widest">Full Legal Name</label>
                  <input required value={newLead.name} onChange={(e) => setNewLead({...newLead, name: e.target.value})} className="w-full border-4 border-black p-5 text-sm font-black uppercase outline-none focus:bg-yellow-50 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase block mb-2 tracking-widest">Email Node</label>
                    <input required type="email" value={newLead.email} onChange={(e) => setNewLead({...newLead, email: e.target.value})} className="w-full border-4 border-black p-5 text-sm font-black outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase block mb-2 tracking-widest">Phone ID</label>
                    <input value={newLead.phone} onChange={(e) => setNewLead({...newLead, phone: e.target.value})} className="w-full border-4 border-black p-5 text-sm font-black outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase block mb-2 tracking-widest">Assign Intel</label>
                  <select value={newLead.assignedTo} onChange={(e) => setNewLead({...newLead, assignedTo: e.target.value})} className="w-full border-4 border-black p-5 text-sm font-black uppercase outline-none bg-white">
                    <option value="">SELF_ASSIGNMENT</option>
                    {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name.toUpperCase()}</option>)}
                  </select>
                </div>
                <button disabled={isSubmitting} className="w-full py-6 bg-black text-white text-[11px] font-black uppercase tracking-widest border-4 border-black">Authorize Entry</button>
              </form>
            </motion.div>
          </div>
        )}

        {isEditModalOpen && selectedLead && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} className="relative bg-white border-8 border-black w-full max-w-lg p-8 shadow-[25px_25px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-8 border-b-8 border-black pb-4">Update Entry</h2>
              <form onSubmit={handleUpdateLead} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase block mb-2 tracking-widest">Name</label>
                  <input required value={selectedLead.name} onChange={(e) => setSelectedLead({...selectedLead, name: e.target.value})} className="w-full border-4 border-black p-5 text-sm font-black uppercase outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase block mb-2 tracking-widest">Status</label>
                    <select value={selectedLead.status} onChange={(e) => setSelectedLead({...selectedLead, status: e.target.value as any})} className="w-full border-4 border-black p-5 text-sm font-black uppercase outline-none focus:bg-zinc-50 transition-all appearance-none bg-white">
                      <option value="new">NEW</option>
                      <option value="contacted">CONTACTED</option>
                      <option value="qualified">QUALIFIED</option>
                      <option value="closed">CLOSED</option>
                      <option value="lost">LOST</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase block mb-2 tracking-widest">Assign Intel</label>
                    <select value={(typeof selectedLead.assignedTo === 'object' ? selectedLead.assignedTo?._id : selectedLead.assignedTo) || ""} onChange={(e) => setSelectedLead({...selectedLead, assignedTo: e.target.value})} className="w-full border-4 border-black p-5 text-sm font-black uppercase outline-none focus:bg-zinc-50 transition-all appearance-none bg-white">
                      <option value="">UNASSIGNED</option>
                      {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
                <button disabled={isSubmitting} className="w-full py-6 bg-black text-white text-[11px] font-black uppercase tracking-widest border-4 border-black">Update Protocol</button>
              </form>
            </motion.div>
          </div>
        )}

        {isImportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsImportModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} className="relative bg-white border-8 border-black w-full max-w-md p-10 shadow-[25px_25px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-8">Bulk Ingestion</h2>
              <form onSubmit={handleImport} className="space-y-6">
                <div className="border-8 border-dashed border-black p-10 text-center hover:bg-gray-50 transition-all cursor-pointer relative">
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-[11px] font-black uppercase tracking-widest">Drop Intel Matrix</p>
                  {importFile && <p className="mt-4 text-xs font-bold text-green-600">{importFile.name}</p>}
                </div>
                <button disabled={isSubmitting || !importFile} className="w-full py-5 bg-black text-white text-[11px] font-black uppercase tracking-widest border-4 border-black">Execute Ingestion</button>
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
            className={`fixed bottom-12 right-12 p-6 border-8 shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] z-[200] ${message.type === 'success' ? 'bg-white border-green-600 text-green-700' : 'bg-white border-red-600 text-red-700'}`}
          >
            <p className="text-sm font-black uppercase italic tracking-tight">{message.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Node Analysis Modal */}
      <AnimatePresence>
        {analysisNode && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAnalysisNode(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-4xl bg-white border-8 border-black shadow-[30px_30px_0px_0px_rgba(0,0,0,1)] p-12 overflow-y-auto max-h-[90vh] custom-scrollbar">
              <button onClick={() => setAnalysisNode(null)} className="absolute top-6 right-6 p-2 hover:bg-zinc-100 border-4 border-black transition-all"><X className="h-6 w-6" /></button>
              <div className="flex flex-col md:flex-row gap-12">
                <div className="md:w-1/3">
                  <div className="w-32 h-32 bg-black text-white flex items-center justify-center text-5xl font-black italic border-8 border-black mb-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)]">{analysisNode.name?.[0]?.toUpperCase()}</div>
                  <h2 className="text-3xl font-black uppercase italic leading-none mb-2">{analysisNode.name}</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">{analysisNode.role}</p>
                  <div className="space-y-4 border-t-8 border-black pt-6">
                    <div><span className="text-[8px] font-black uppercase text-gray-400 block mb-1">Email Node</span><span className="text-xs font-bold uppercase">{analysisNode.email}</span></div>
                    <div><span className="text-[8px] font-black uppercase text-gray-400 block mb-1">Phone ID</span><span className="text-xs font-bold uppercase">{analysisNode.phone || 'N/A'}</span></div>
                  </div>
                </div>
                <div className="flex-1">
                  {analyzing ? (
                    <div className="h-full flex flex-col items-center justify-center p-20"><Loader2 className="h-12 w-12 animate-spin text-black mb-4" /><p className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Scanning Mission History...</p></div>
                  ) : analysisData ? (
                    <div className="space-y-8">
                      <div className="bg-black text-white p-8 flex items-center justify-between border-4 border-black">
                        <div><p className="text-[10px] font-black uppercase tracking-[0.5em] mb-2 text-zinc-500">Tactical Performance Score</p><h4 className="text-6xl font-black italic">{analysisData.stats.score}<span className="text-xl text-zinc-600">/100</span></h4></div>
                        <div className="w-20 h-20 border-4 border-white flex items-center justify-center rotate-12"><Info className="h-10 w-10" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 border-4 border-black"><p className="text-[8px] font-black uppercase text-gray-400 mb-2">Task Efficiency</p><div className="flex items-end gap-2"><span className="text-2xl font-black">{analysisData.stats.taskRate}%</span><span className="text-[10px] font-bold text-gray-400 mb-1">({analysisData.stats.doneTasks}/{analysisData.stats.totalTasks})</span></div></div>
                        <div className="p-6 border-4 border-black"><p className="text-[8px] font-black uppercase text-gray-400 mb-2">Intelligence Reports</p><div className="flex items-end gap-2"><span className="text-2xl font-black">{analysisData.stats.totalReports}</span><span className="text-[10px] font-bold text-gray-400 mb-1">SUBMITTED</span></div></div>
                      </div>
                      <div className="space-y-4 pt-4 border-t-4 border-black">
                        <h5 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><FileSearch className="h-4 w-4" /> Recent Mission Logs</h5>
                        <div className="space-y-2">
                          {analysisData.reports.slice(0, 5).map((r: { _id: string; missionType?: string; status: string }) => (
                            <div key={r._id} className="p-4 border-2 border-black flex justify-between items-center text-[10px] font-bold uppercase italic">
                              <span>Mission: {r.missionType || 'INTEL'}</span>
                              <span className={r.status === 'done' ? 'text-green-600' : 'text-orange-500'}>{r.status}</span>
                            </div>
                          ))}
                          {analysisData.reports.length === 0 && <p className="text-[10px] italic text-gray-400">No mission logs found on current frequency.</p>}
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
