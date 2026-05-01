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
      <div className="min-h-screen flex items-center justify-center bg-black p-6">
        <div className="text-center space-y-6">
          <AlertCircle className="h-24 w-24 text-red-600 mx-auto animate-pulse" />
          <h1 className="text-6xl font-black text-white uppercase italic tracking-tighter">Access Denied</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.5em]">Storage Vault Restricted to Admin Nodes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 max-w-[1400px] mx-auto px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter italic text-black leading-none">Storage Vault</h1>
          <p className="text-[10px] uppercase tracking-[0.4em] font-black text-gray-400 mt-3">Centralized Asset Intelligence — Cloudinary Sync Active</p>
        </div>
        <div className="flex items-center gap-4 p-4 bg-zinc-100 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <HardDrive className="h-8 w-8 text-black" />
          <div>
            <p className="text-[10px] font-black uppercase text-gray-500">Total Assets Tracked</p>
            <p className="text-2xl font-black">{files.length}</p>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
          <input 
            type="text" 
            placeholder="LOCATE ASSET BY TITLE OR OWNER..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-6 border-8 border-black text-lg font-black uppercase outline-none focus:bg-zinc-50 transition-all placeholder:text-gray-300"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
          <select 
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="w-full pl-16 pr-6 py-6 border-8 border-black text-lg font-black uppercase outline-none appearance-none bg-white focus:bg-zinc-50 transition-all"
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
        <div className="p-40 flex flex-col items-center justify-center border-8 border-black bg-white shadow-[20px_20px_0px_0px_rgba(0,0,0,0.05)]">
          <Loader2 className="animate-spin h-16 w-16 text-black mb-6" />
          <p className="text-xs font-black uppercase tracking-[0.5em]">Establishing Vault Connection...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="p-32 text-center border-8 border-black bg-white opacity-40 italic">
          <p className="text-2xl font-black uppercase tracking-widest">No assets detected in this sector</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredFiles.map((file, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white border-8 border-black p-8 hover:shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] transition-all group relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-4 bg-zinc-100 border-4 border-black group-hover:bg-black group-hover:text-white transition-all">
                      {getFileIcon(file.url)}
                    </div>
                    <span className="text-[9px] font-black uppercase px-3 py-1 bg-black text-white italic">
                      {file.source}
                    </span>
                  </div>

                  <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2 line-clamp-2 leading-none">
                    {file.sourceTitle}
                  </h3>
                  
                  <div className="space-y-2 mb-8">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                      <span className="font-black text-black">Owner:</span> {file.owner}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                      <span className="font-black text-black">Stored:</span> {format(new Date(file.createdAt), "dd MMM yyyy HH:mm")}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <a 
                    href={file.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-3 py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest border-4 border-black hover:bg-zinc-800 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none"
                  >
                    View <ExternalLink className="h-4 w-4" />
                  </a>
                  <button 
                    onClick={() => handleDelete(file)}
                    disabled={deletingId === file.url}
                    className="p-4 border-4 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-[6px_6px_0px_0px_rgba(220,38,38,0.1)] active:shadow-none disabled:opacity-50"
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
