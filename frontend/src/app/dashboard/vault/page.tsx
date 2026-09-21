"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { 
  ShieldCheck, Lock, Eye, EyeOff, Trash2, 
  Plus, Search, Loader2, Key, FileText, X,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VaultEntry {
  _id: string;
  title: string;
  category: string;
  content: string;
  description: string;
  createdAt: string;
}

export default function VaultPage() {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleEntries, setVisibleEntries] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchVault = async () => {
    try {
      const { data } = await api.get("vault");
      setEntries(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => { fetchVault(); }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    try {
      await api.post("vault", data);
      setIsModalOpen(false);
      fetchVault();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to PERMANENTLY purge this entry?")) return;
    try {
      await api.delete(`vault/${id}`);
      fetchVault();
    } catch (err) { console.error(err); }
  };

  const toggleVisibility = (id: string) => {
    const next = new Set(visibleEntries);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setVisibleEntries(next);
  };

  if (!mounted) return null;

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center p-32 opacity-40">
      <Loader2 className="animate-spin h-12 w-12 text-black mb-4" />
      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-400">accessing encrypted sector...</p>
    </div>
  );

  return (
    <div className="space-y-12 pb-24 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-zinc-100 pb-12">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3.5 bg-zinc-950 text-white rounded-2xl shadow-xl shadow-black/10">
              <Lock className="h-7 w-7" />
            </div>
            <div className="h-0.5 w-12 bg-rose-500 rounded-full" />
          </div>
          <h1 className="text-5xl font-bold uppercase tracking-tight text-zinc-900 leading-none">The Vault</h1>
          <p className="text-[10px] uppercase tracking-[0.5em] font-bold text-zinc-400 mt-4 italic flex items-center gap-3">
             Secure Repository / Level 5 Clearance
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-4 px-10 py-5 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/20"
        >
          <Plus className="h-5 w-5" /> <span>Secure New Record</span>
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-950 rounded-3xl p-8 flex items-center gap-6 shadow-2xl shadow-black/10 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <ShieldCheck className="h-32 w-32 text-white" />
        </div>
        <div className="p-4 bg-rose-500/10 rounded-2xl">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">System Security Advisory</p>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
            Data encrypted via AES-256 Protocol. All administrative access patterns are logged and audited in real-time.
          </p>
        </div>
      </motion.div>

      <div className="relative group max-w-2xl mx-auto">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" />
        <input 
          type="text" 
          placeholder="SEARCH ENCRYPTED ARCHIVES..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-zinc-100 rounded-2xl p-6 pl-16 text-[10px] font-bold uppercase tracking-[0.2em] outline-none focus:border-zinc-900 transition-all shadow-xl shadow-black/[0.02]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {entries.filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase())).map((entry, i) => (
          <motion.div 
            key={entry._id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-[3rem] border border-zinc-100 p-10 hover:shadow-2xl transition-all duration-500 group relative"
          >
            <div className="flex justify-between items-start mb-10">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-zinc-50 rounded-[1.5rem] flex items-center justify-center text-zinc-300 group-hover:bg-zinc-950 group-hover:text-white transition-all duration-500 shadow-sm">
                  {entry.category === 'credential' ? <Key className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-tight text-zinc-900">{entry.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">{entry.category}</span>
                    <div className="w-1 h-1 bg-zinc-200 rounded-full" />
                    <span className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest">ID_{entry._id.substring(entry._id.length - 6)}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(entry._id)}
                className="p-4 bg-zinc-50 text-zinc-300 rounded-2xl hover:bg-brand-rose hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-sm"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mb-8">
              <div className={`p-8 rounded-2xl font-mono text-sm break-all transition-all duration-500 border ${
                visibleEntries.has(entry._id) 
                  ? 'bg-zinc-50 border-zinc-100 text-zinc-900 shadow-inner' 
                  : 'bg-zinc-950 border-zinc-950 text-zinc-950 select-none overflow-hidden blur-[2px] opacity-10'
              }`}>
                {visibleEntries.has(entry._id) ? entry.content : "••••••••••••••••••••••••••••••••••••••••••••••••"}
              </div>
              <button 
                onClick={() => toggleVisibility(entry._id)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-2xl transition-all duration-300 shadow-xl ${
                  visibleEntries.has(entry._id) 
                    ? 'bg-zinc-950 text-white hover:scale-110' 
                    : 'bg-white text-zinc-400 border border-zinc-100 hover:text-zinc-950 hover:scale-110'
                }`}
              >
                {visibleEntries.has(entry._id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <p className="text-[10px] font-bold text-zinc-400 uppercase leading-relaxed italic px-2">
              {entry.description || "NO STRATEGIC DESCRIPTION PROVIDED BY ORIGIN NODE."}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[1500] flex items-center justify-center p-6">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
            <motion.div 
              initial={{scale:0.95, opacity:0, y: 30}} animate={{scale:1, opacity:1, y: 0}} exit={{scale:0.95, opacity:0, y: 30}} 
              className="relative bg-white rounded-[3.5rem] w-full max-w-xl p-12 shadow-2xl border border-zinc-100"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 p-4 hover:bg-zinc-50 rounded-2xl text-zinc-300 hover:text-black transition-all">
                <X className="h-8 w-8" />
              </button>

              <div className="mb-12">
                <h2 className="text-3xl font-bold uppercase tracking-tight text-zinc-900 leading-none">New Entry</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.4em] mt-4 italic flex items-center gap-3">
                  <div className="w-8 h-0.5 bg-rose-500" /> Secure Encryption Protocol
                </p>
              </div>

              <form onSubmit={handleCreate} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Archive Title</label>
                  <input name="title" className="w-full bg-zinc-50 border border-zinc-100 p-6 text-[11px] font-bold uppercase rounded-2xl outline-none focus:border-zinc-900 transition-all" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Tactical Category</label>
                  <select name="category" className="w-full bg-zinc-50 border border-zinc-100 p-6 text-[11px] font-bold uppercase rounded-2xl outline-none focus:border-zinc-900 transition-all appearance-none bg-white cursor-pointer">
                    <option value="credential">CREDENTIAL / PASSWORD</option>
                    <option value="api_key">API KEY / TOKEN</option>
                    <option value="private_note">PRIVATE TACTICAL NOTE</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Sensitive Content (ENCRYPTED)</label>
                  <textarea name="content" rows={3} className="w-full bg-zinc-50 border border-zinc-100 p-6 text-sm font-mono rounded-2xl outline-none focus:border-zinc-900 transition-all resize-none" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Public Description</label>
                  <input name="description" className="w-full bg-zinc-50 border border-zinc-100 p-6 text-[11px] font-bold uppercase rounded-2xl outline-none focus:border-zinc-900 transition-all" />
                </div>
                <button type="submit" className="w-full py-6 bg-zinc-950 text-white text-[11px] font-bold uppercase tracking-[0.4em] rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/20 flex items-center justify-center gap-4">
                  <ShieldCheck className="h-5 w-5" />
                  Execute Encryption Protocol
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
