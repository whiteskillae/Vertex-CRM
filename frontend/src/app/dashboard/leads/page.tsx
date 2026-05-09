"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { 
  FileSearch, Plus, Upload, Download, Search, Filter, Mail, Phone, Building, 
  ChevronLeft, ChevronRight, Loader2, Trash2, Edit, X, Check,
  AlertTriangle, Info, MoreVertical, ExternalLink, Activity, ChevronRight as ChevronRightIcon
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
  const [totalPages, setTotalPages] = useState(1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [analysisNode, setAnalysisNode] = useState<Employee | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    source: "Direct",
    status: "new",
    assignedTo: ""
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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

  useEffect(() => {
    if (user && user.role === 'employee') {
      router.replace('/dashboard');
    }
  }, [user, router]);

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
      setMessage({ text: "Entity restored successfully", type: "success" });
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

  if (!mounted) return null;

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-24">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-zinc-100 pb-10">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 uppercase">
            Leads <span className="text-zinc-300">Nexus</span>
          </h1>
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <FileSearch className="h-3.5 w-3.5 text-zinc-300" /> Database Management & Intelligence
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {user?.role === 'admin' && (
            <>
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-6 py-3.5 bg-white border border-zinc-200 text-zinc-600 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-50 transition-all shadow-sm"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3.5 bg-white border border-zinc-200 text-zinc-600 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-50 transition-all shadow-sm"
              >
                <Upload className="h-3.5 w-3.5" /> Bulk
              </button>
            </>
          )}
          {user?.role === 'manager' && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-8 py-3.5 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-black/10"
            >
              <Plus className="h-4 w-4" /> New Lead
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-50 p-1.5 rounded-2xl border border-zinc-100 w-fit gap-1">
        {[
          { id: "active", label: "Active", count: leads.length },
          { id: "trash", label: "Archive", count: trashedLeads.length },
          { id: "personnel", label: "Personnel", count: employees.length, adminOnly: true }
        ].map((tab) => (
          (tab.adminOnly ? user?.role === 'admin' : true) && (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`px-8 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-xl whitespace-nowrap ${
                activeTab === tab.id 
                ? 'bg-white text-zinc-950 shadow-sm border border-zinc-100' 
                : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              {tab.label} <span className="ml-1 opacity-50 text-[8px]">({tab.count})</span>
            </button>
          )
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "active" ? (
          <motion.div key="active" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search intelligence records..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  className="w-full pl-12 pr-6 py-4 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:border-zinc-950 text-[11px] font-semibold uppercase tracking-widest transition-all shadow-sm"
                />
              </div>
              <button className="flex items-center justify-center px-8 py-4 bg-white border border-zinc-200 rounded-2xl text-zinc-400 hover:text-zinc-950 hover:border-zinc-950 transition-all text-[10px] font-bold uppercase tracking-widest shadow-sm">
                <Filter className="mr-3 h-4 w-4" /> Protocols
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50/50 border-b border-zinc-100">
                      <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Identification</th>
                      <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Contact</th>
                      <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Assignment</th>
                      <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Status</th>
                      <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="p-24 text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-zinc-200 mb-4" />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-300">Establishing Data Link...</span>
                        </td>
                      </tr>
                    ) : leads.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-24 text-center text-[10px] font-bold text-zinc-300 uppercase tracking-widest">No records found</td>
                      </tr>
                    ) : (
                      leads.map((lead) => (
                        <tr key={lead._id} className="hover:bg-zinc-50/30 transition-all group">
                          <td className="p-6">
                            <p className="text-sm font-bold text-zinc-950 uppercase tracking-tight">{lead.name}</p>
                            <p className="text-[9px] font-semibold text-zinc-400 uppercase mt-1 flex items-center gap-2">
                              <Building className="h-3 w-3" /> {lead.company || "Independent"}
                            </p>
                          </td>
                          <td className="p-6">
                            <div className="space-y-1">
                              <div className="text-[11px] font-bold text-zinc-900 italic flex items-center gap-2"><Mail className="h-3 w-3 text-zinc-300" /> {lead.email}</div>
                              {lead.phone && <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Phone className="h-3 w-3 text-zinc-300" /> {lead.phone}</div>}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-zinc-50 border border-zinc-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-zinc-400 group-hover:bg-zinc-950 group-hover:text-white transition-all">
                                {lead.assignedTo?.name?.[0] || "?"}
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-900">{lead.assignedTo?.name || "UNASSIGNED"}</span>
                            </div>
                          </td>
                          <td className="p-6 text-center">
                            <span className={`px-4 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest border border-zinc-100 bg-white ${
                              lead.status === 'closed' ? 'text-emerald-500' :
                              lead.status === 'lost' ? 'text-rose-500' :
                              'text-amber-500'
                            }`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="p-6 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => { setSelectedLead(lead); setIsEditModalOpen(true); }} className="p-2.5 bg-white border border-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-950 transition-all shadow-sm"><Edit className="h-4 w-4" /></button>
                              {user?.role === 'admin' && (
                                <button onClick={() => handleDeleteLead(lead)} className="p-2.5 bg-white border border-zinc-100 rounded-lg text-zinc-400 hover:text-rose-500 transition-all shadow-sm"><Trash2 className="h-4 w-4" /></button>
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

            <div className="flex items-center justify-between px-4">
              <span className="text-[9px] font-bold uppercase text-zinc-300 tracking-widest">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(page-1)} className="p-3 bg-white border border-zinc-100 rounded-xl hover:bg-zinc-50 disabled:opacity-30 transition-all shadow-sm"><ChevronLeft className="h-5 w-5" /></button>
                <button disabled={page >= totalPages} onClick={() => setPage(page+1)} className="p-3 bg-white border border-zinc-100 rounded-xl hover:bg-zinc-50 disabled:opacity-30 transition-all shadow-sm"><ChevronRight className="h-5 w-5" /></button>
              </div>
            </div>
          </motion.div>
        ) : activeTab === "trash" ? (
          <motion.div key="trash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="p-8 bg-rose-50 rounded-3xl border border-rose-100 flex items-center gap-6">
              <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-zinc-900 uppercase">Archive Hub</h4>
                <p className="text-[10px] font-semibold text-rose-600 uppercase tracking-widest mt-1">Deauthorized entities awaiting purge</p>
              </div>
              <button onClick={() => { if(confirm("Permanently purge archive?")) clearTrash(); }} className="px-6 py-3 bg-rose-500 text-white text-[10px] font-bold rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/10">Purge All</button>
            </div>

            <div className="grid gap-3">
              {trashedLeads.length === 0 ? (
                <div className="p-24 text-center border-2 border-dashed border-zinc-100 rounded-3xl text-zinc-300">
                  <p className="text-[10px] font-bold uppercase tracking-widest italic">Archive empty</p>
                </div>
              ) : (
                trashedLeads.map((item) => (
                  <div key={item.id} className="p-6 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between gap-4 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-300"><Trash2 className="h-5 w-5" /></div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900 uppercase">{item.data.name}</p>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase mt-1 tracking-widest">Removed {new Date(item.deletedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRestoreLead(item.id, item.data)} className="px-5 py-2.5 bg-zinc-950 text-white text-[10px] font-bold rounded-xl hover:bg-zinc-800 transition-all">Restore</button>
                      <button onClick={() => removeFromTrash(item.id)} className="p-2.5 bg-zinc-50 rounded-xl text-zinc-400 hover:text-rose-500 transition-all"><X className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="personnel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {employees.map((emp) => (
              <div key={emp._id} className="group bg-white rounded-3xl border border-zinc-100 p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-center text-2xl font-bold text-zinc-900 group-hover:bg-zinc-950 group-hover:text-white transition-all shadow-sm">
                    {emp.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-zinc-50 border border-zinc-100 rounded-full text-[9px] font-bold uppercase text-zinc-500">{emp.role}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-zinc-950 uppercase tracking-tight">{emp.name}</h3>
                  <p className="text-[11px] font-semibold text-zinc-400 flex items-center gap-2 italic"><Mail className="h-3.5 w-3.5" /> {emp.email}</p>
                  <div className="pt-4 flex gap-2">
                    <button onClick={() => handleAnalyse(emp)} className="flex-1 py-3 bg-zinc-950 text-white text-[9px] font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-all shadow-lg">Analyse</button>
                    <button onClick={() => router.push(`/dashboard/messages?contactId=${emp._id}`)} className="flex-1 py-3 bg-white border border-zinc-100 text-zinc-600 text-[9px] font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-50 transition-all">Message</button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[1500] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl w-full max-w-xl p-10 shadow-2xl overflow-hidden border border-zinc-100">
              <h2 className="text-3xl font-bold text-zinc-900 uppercase tracking-tight mb-8">New Entity</h2>
              <form onSubmit={handleAddLead} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 px-1">Legal Identity</label>
                  <input required value={newLead.name} onChange={(e) => setNewLead({...newLead, name: e.target.value})} placeholder="FULL NAME" className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-4 text-[11px] font-bold uppercase outline-none focus:border-zinc-950 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 px-1">Email Node</label>
                    <input required type="email" value={newLead.email} onChange={(e) => setNewLead({...newLead, email: e.target.value})} placeholder="EMAIL" className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-4 text-[11px] font-bold outline-none focus:border-zinc-950 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 px-1">Phone ID</label>
                    <input value={newLead.phone} onChange={(e) => setNewLead({...newLead, phone: e.target.value})} placeholder="+00" className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-4 text-[11px] font-bold outline-none focus:border-zinc-950 transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 px-1">Assign Operator</label>
                  <select value={newLead.assignedTo} onChange={(e) => setNewLead({...newLead, assignedTo: e.target.value})} className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-4 text-[11px] font-bold uppercase outline-none focus:border-zinc-950 transition-all appearance-none bg-white">
                    <option value="">SELF_ASSIGNMENT</option>
                    {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name.toUpperCase()}</option>)}
                  </select>
                </div>
                <button disabled={isSubmitting} className="w-full py-4 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-all shadow-xl shadow-black/10">
                  {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Authorize Entry"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Analysis Modal */}
      <AnimatePresence>
        {analysisNode && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAnalysisNode(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-10 overflow-y-auto max-h-[90vh] border border-zinc-100">
              <button onClick={() => setAnalysisNode(null)} className="absolute top-8 right-8 p-3 hover:bg-zinc-50 rounded-xl transition-all text-zinc-400 hover:text-zinc-950"><X className="h-6 w-6" /></button>
              <div className="flex flex-col md:flex-row gap-12">
                <div className="md:w-1/3">
                  <div className="w-24 h-24 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-center text-4xl font-bold text-zinc-900 mb-6">{analysisNode.name?.[0]?.toUpperCase()}</div>
                  <h2 className="text-2xl font-bold uppercase tracking-tight text-zinc-900 leading-none mb-2">{analysisNode.name}</h2>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-8">{analysisNode.role}</p>
                  <div className="space-y-4 pt-6 border-t border-zinc-100">
                    <div>
                      <span className="text-[8px] font-bold uppercase text-zinc-300 block tracking-widest">Network Node</span>
                      <span className="text-xs font-semibold text-zinc-900">{analysisNode.email}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  {analyzing ? (
                    <div className="h-full flex flex-col items-center justify-center p-24">
                      <Loader2 className="h-8 w-8 animate-spin text-zinc-200 mb-4" />
                      <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-300">Gathering Intelligence...</p>
                    </div>
                  ) : analysisData ? (
                    <div className="space-y-8">
                      <div className="bg-zinc-950 rounded-3xl p-8 flex items-center justify-between text-white">
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-widest mb-2 text-zinc-500">Honor Score</p>
                          <h4 className="text-5xl font-bold italic tracking-tighter">{analysisData.stats.score}<span className="text-xl text-zinc-700 ml-1">/100</span></h4>
                        </div>
                        <Activity className="h-8 w-8 text-indigo-500 opacity-50" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <p className="text-[8px] font-bold uppercase text-zinc-400 mb-2 tracking-widest">Efficiency</p>
                          <span className="text-2xl font-bold text-zinc-900">{analysisData.stats.taskRate}%</span>
                        </div>
                        <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <p className="text-[8px] font-bold uppercase text-zinc-400 mb-2 tracking-widest">Output</p>
                          <span className="text-2xl font-bold text-zinc-900">{analysisData.stats.totalReports}</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 flex items-center gap-2">
                          <div className="w-6 h-0.5 bg-black rounded-full" /> Activity Log
                        </h5>
                        <div className="space-y-2">
                          {analysisData.reports.slice(0, 5).map((r: any) => (
                            <div key={r._id} className="p-4 bg-white border border-zinc-100 rounded-xl flex justify-between items-center text-[11px] font-semibold text-zinc-900">
                              <span>Mission: {r.missionType || 'DATA_SYNC'}</span>
                              <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${r.status === 'done' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                {r.status}
                              </span>
                            </div>
                          ))}
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

      {/* Toast Message */}
      <AnimatePresence>
        {message.text && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl border shadow-2xl z-[2000] flex items-center gap-3 bg-white ${
              message.type === 'success' ? 'border-emerald-100 text-emerald-600' : 'border-rose-100 text-rose-600'
            }`}
          >
            {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <p className="text-[10px] font-bold uppercase tracking-widest">{message.text}</p>
            <button onClick={() => setMessage({ text: "", type: "" })} className="ml-2"><X className="h-3.5 w-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
