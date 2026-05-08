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

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-4">
            <Lock className="h-10 w-10 text-red-600" /> Secure Vault
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Encrypted Repository — Admin Level 5 Access Only
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-8 py-4 bg-red-600 text-white font-black uppercase text-xs border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
        >
          Secure New Entry
        </button>
      </div>

      <div className="bg-black text-white p-6 border-4 border-black flex items-center gap-4 shadow-[10px_10px_0px_0px_rgba(220,38,38,0.2)]">
        <AlertTriangle className="h-6 w-6 text-red-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">
          Warning: All data in this vault is encrypted using AES-256. Unauthorized access attempts are logged.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
        <input 
          type="text" 
          placeholder="Search encrypted records..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-white border-4 border-black p-5 pl-14 text-sm font-black uppercase outline-none focus:bg-zinc-50 transition-all shadow-[10px_10px_0px_0px_rgba(0,0,0,0.05)]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {entries.filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase())).map((entry) => (
          <div key={entry._id} className="bg-white border-4 border-black p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:border-red-600 transition-colors group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-zinc-100 border-2 border-black">
                  {entry.category === 'credential' ? <Key className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase">{entry.title}</h3>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{entry.category}</p>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(entry._id)}
                className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mb-4">
              <div className={`p-4 border-2 border-black font-mono text-xs break-all transition-all ${visibleEntries.has(entry._id) ? 'bg-zinc-50' : 'bg-black text-black select-none'}`}>
                {visibleEntries.has(entry._id) ? entry.content : "••••••••••••••••••••••••••••••••"}
              </div>
              <button 
                onClick={() => toggleVisibility(entry._id)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white border-2 border-black hover:bg-black hover:text-white transition-all"
              >
                {visibleEntries.has(entry._id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            </div>

            <p className="text-[10px] font-bold text-zinc-500 uppercase leading-relaxed italic">
              {entry.description || "No tactical description provided."}
            </p>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} className="relative bg-white border-4 border-black w-full max-w-lg p-10 shadow-[25px_25px_0px_0px_rgba(0,0,0,1)]">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6"><X className="h-6 w-6" /></button>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-8 flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-red-600" /> New Secure Record
              </h2>
              <form onSubmit={handleCreate} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase block mb-2">Record Title</label>
                  <input name="title" className="w-full border-4 border-black p-4 text-sm font-bold uppercase outline-none focus:bg-zinc-50" required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase block mb-2">Category</label>
                  <select name="category" className="w-full border-4 border-black p-4 text-sm font-bold uppercase outline-none bg-white">
                    <option value="credential">Credential / Password</option>
                    <option value="api_key">API Key / Token</option>
                    <option value="private_note">Private Tactical Note</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase block mb-2">Sensitive Content</label>
                  <textarea name="content" rows={3} className="w-full border-4 border-black p-4 text-sm font-bold outline-none resize-none focus:bg-zinc-50" required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase block mb-2">Description (Public)</label>
                  <input name="description" className="w-full border-4 border-black p-4 text-sm font-bold uppercase outline-none focus:bg-zinc-50" />
                </div>
                <button type="submit" className="w-full py-5 bg-red-600 text-white font-black uppercase text-sm border-4 border-black hover:bg-black transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]">
                  Execute Encryption
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
