"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { 
  HardDrive, Trash2, Search, FileText, Image as ImageIcon, 
  FileSpreadsheet, Music, Video, ExternalLink, Loader2,
  AlertCircle, Filter, Download, ArrowUpDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";

interface StorageFile {
  id: string;
  source: string;
  sourceTitle: string;
  url: string;
  owner: string;
  createdAt: string;
}

export default function StoragePage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("storage");
      setFiles(data);
    } catch (err) {
      console.error("Storage fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDelete = async (file: StorageFile) => {
    if (!confirm("PERMANENT PURGE: This will delete the file from the database AND Cloudinary. Are you sure?")) return;
    
    setDeletingId(file.url);
    try {
      await api.delete("storage", { data: { url: file.url, source: file.source, id: file.id } });
      setFiles(prev => prev.filter(f => f.url !== file.url));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to purge file from storage.");
    } finally {
      setDeletingId(null);
    }
  };

  const getFileIcon = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext!)) return <ImageIcon className="h-6 w-6" />;
    if (['pdf'].includes(ext!)) return <FileText className="h-6 w-6" />;
    if (['xlsx', 'xls', 'csv'].includes(ext!)) return <FileSpreadsheet className="h-6 w-6" />;
    if (['mp3', 'wav', 'm4a'].includes(ext!)) return <Music className="h-6 w-6" />;
    if (['mp4', 'mov'].includes(ext!)) return <Video className="h-6 w-6" />;
    return <FileText className="h-6 w-6" />;
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.sourceTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         f.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterSource === 'all' || f.source === filterSource;
    return matchesSearch && matchesFilter;
  });

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md p-12 bg-white rounded-[3.5rem] border border-zinc-100 shadow-2xl text-center space-y-8">
          <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto">
            <AlertCircle className="h-10 w-10 text-rose-500 animate-pulse" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black uppercase tracking-tight text-zinc-900 leading-none">Security Alert</h1>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] leading-relaxed">
              Storage Vault Access Restricted. Admin Node Synchronization Required.
            </p>
          </div>
          <div className="h-1 w-12 bg-rose-500 rounded-full mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-24 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-zinc-100 pb-12">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3.5 bg-zinc-950 text-white rounded-2xl shadow-xl shadow-black/10">
              <HardDrive className="h-7 w-7" />
            </div>
            <div className="h-0.5 w-12 bg-indigo-500 rounded-full" />
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tight text-zinc-900 leading-none">Storage Vault</h1>
          <p className="text-[10px] uppercase tracking-[0.5em] font-black text-zinc-400 mt-4 italic flex items-center gap-3">
             Asset Intelligence / Cloudinary Sync
          </p>
        </div>

        <div className="flex items-center gap-6 px-10 py-6 bg-zinc-50 rounded-[2.5rem] border border-zinc-100/50 shadow-sm">
           <Activity className="h-6 w-6 text-zinc-400" />
           <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Total Monitored Assets</p>
              <p className="text-xl font-black text-zinc-950">{files.length}</p>
           </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-8 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" />
          <input 
            type="text" 
            placeholder="LOCATE ASSET BY TITLE OR OWNER..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-zinc-100 rounded-[2rem] p-6 pl-16 text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:border-zinc-900 transition-all shadow-xl shadow-black/[0.02]"
          />
        </div>
        <div className="lg:col-span-4 relative group">
          <Filter className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" />
          <select 
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="w-full bg-white border border-zinc-100 rounded-[2rem] p-6 pl-16 text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:border-zinc-900 transition-all shadow-xl shadow-black/[0.02] appearance-none cursor-pointer"
          >
            <option value="all">ALL SOURCES</option>
            <option value="Task">TASKS</option>
            <option value="Message">MESSAGES</option>
            <option value="Report">REPORTS</option>
          </select>
        </div>
      </div>

      {/* Files Grid */}
      {loading ? (
        <div className="py-40 flex flex-col items-center justify-center opacity-40">
          <Loader2 className="animate-spin h-12 w-12 text-black mb-6" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400">Establishing Vault Linkage...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="py-40 flex flex-col items-center justify-center bg-white rounded-[3.5rem] border border-dashed border-zinc-200">
          <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
            <Search className="h-8 w-8 text-zinc-200" />
          </div>
          <p className="text-[11px] font-black text-zinc-300 uppercase tracking-[0.3em]">No assets detected in this sector</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredFiles.map((file, idx) => (
              <motion.div 
                key={file.id || idx}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="bg-white rounded-[3rem] border border-zinc-100 p-10 hover:shadow-2xl transition-all duration-500 group relative flex flex-col h-full"
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-8">
                    <div className="w-16 h-16 bg-zinc-50 rounded-[1.5rem] flex items-center justify-center text-zinc-400 group-hover:bg-zinc-950 group-hover:text-white transition-all duration-500 shadow-sm">
                      {getFileIcon(file.url)}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 bg-zinc-950 text-white rounded-full">
                      {file.source}
                    </span>
                  </div>

                  <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 mb-4 line-clamp-2 leading-[1.1]">
                    {file.sourceTitle}
                  </h3>
                  
                  <div className="space-y-3 mb-10">
                    <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      <div className="w-1 h-1 bg-indigo-500 rounded-full" />
                      <span className="text-zinc-300">Owner:</span> <span className="text-zinc-600 font-black">{file.owner}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      <div className="w-1 h-1 bg-zinc-200 rounded-full" />
                      <span className="text-zinc-300">Stored:</span> <span className="text-zinc-600 font-black">{format(new Date(file.createdAt), "dd MMM yyyy")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-auto">
                  <a 
                    href={file.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-4 py-5 bg-zinc-50 text-zinc-900 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-zinc-950 hover:text-white transition-all shadow-sm"
                  >
                    View Asset <ExternalLink className="h-4 w-4" />
                  </a>
                  <button 
                    onClick={() => handleDelete(file)}
                    disabled={deletingId === file.url}
                    className="p-5 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm disabled:opacity-50"
                  >
                    {deletingId === file.url ? <Loader2 className="animate-spin h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
