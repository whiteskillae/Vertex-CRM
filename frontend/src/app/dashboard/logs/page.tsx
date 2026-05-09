"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { 
  ScrollText, 
  User, 
  Clock, 
  Terminal, 
  Shield, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCcw,
  Search
} from "lucide-react";
import { motion } from "framer-motion";

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`logs?page=${page}&limit=20`);
      setLogs(data.logs);
      setTotalPages(data.pages);
    } catch (err) {
      console.error("Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch(action) {
      case 'delete': return 'text-rose-500 bg-rose-50/50 border-rose-100';
      case 'create': return 'text-emerald-500 bg-emerald-50/50 border-emerald-100';
      case 'update': return 'text-indigo-500 bg-indigo-50/50 border-indigo-100';
      case 'import': return 'text-amber-500 bg-amber-50/50 border-amber-100';
      default: return 'text-zinc-500 bg-zinc-50/50 border-zinc-100';
    }
  };

  return (
    <div className="space-y-10 pb-24 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-zinc-100 pb-12">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3.5 bg-zinc-950 text-white rounded-2xl shadow-xl shadow-black/10">
              <ScrollText className="h-7 w-7" />
            </div>
            <div className="h-0.5 w-12 bg-zinc-900 rounded-full" />
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tight text-zinc-900 leading-none">Audit Trail</h1>
          <p className="text-[10px] uppercase tracking-[0.5em] font-black text-zinc-400 mt-4 italic flex items-center gap-3">
             System Activity / Immutable Records
          </p>
        </div>

        <button 
          onClick={fetchLogs}
          className="p-5 bg-white border border-zinc-100 rounded-3xl hover:bg-zinc-950 hover:text-white transition-all shadow-sm hover:scale-105 active:scale-95 group"
        >
          <RefreshCcw className={`h-6 w-6 text-zinc-400 group-hover:text-white ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-zinc-950 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
           <Terminal className="h-40 w-40 text-white" />
        </div>
        
        <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-8 relative z-10">
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-zinc-500">
             <Terminal className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Security Event Stream</p>
            <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-1 italic font-mono">NODE_LINK_ESTABLISHED :: FETCHING_LOGS_CHUNK_{page}</p>
          </div>
        </div>
        
        <div className="space-y-4 font-mono text-[11px] relative z-10">
          {loading && logs.length === 0 ? (
            <div className="flex items-center gap-4 py-20 justify-center flex-col opacity-40">
               <Loader2 className="h-8 w-8 animate-spin text-white" />
               <p className="uppercase tracking-[0.4em] text-zinc-400 text-[10px] font-black">Decrypting audit node data...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center opacity-30 italic">
               <p className="uppercase tracking-widest text-zinc-400">No security events recorded in this cycle.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log: any, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  key={log._id} 
                  className="flex flex-col xl:flex-row xl:items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5"
                >
                  <span className="text-zinc-600 font-bold whitespace-nowrap opacity-60">[{format(new Date(log.createdAt), "HH:mm:ss")}]</span>
                  
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border whitespace-nowrap ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-zinc-400 uppercase font-black tracking-widest text-[9px] min-w-[80px]">[{log.entity}]</span>
                    
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-zinc-100 font-bold truncate">
                        {log.user?.name || 'ROOT'} 
                      </span>
                      <span className="text-zinc-700 text-[9px] font-bold">UID_{log.user?._id?.substring(0,6)}</span>
                    </div>

                    <div className="h-1 w-1 bg-zinc-800 rounded-full hidden xl:block" />
                    
                    <span className="text-zinc-500 truncate italic opacity-60 group-hover:opacity-100 transition-opacity">
                      {JSON.stringify(log.details?.url || log.details || "SYSTEM_OPERATIONAL").substring(0, 100)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.3em]">
          Displaying Fragment {page} <span className="mx-2 text-zinc-200">/</span> {totalPages} Chunks Available
        </p>
        <div className="flex gap-4">
          <button 
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="flex items-center gap-2 px-8 py-4 bg-white border border-zinc-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-950 hover:text-white disabled:opacity-20 transition-all shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <button 
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="flex items-center gap-2 px-8 py-4 bg-white border border-zinc-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-950 hover:text-white disabled:opacity-20 transition-all shadow-sm"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-10 bg-zinc-50 rounded-[2.5rem] border border-zinc-100 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
        <div className="p-4 bg-white rounded-2xl shadow-sm">
           <Shield className="h-6 w-6 text-zinc-950" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-black uppercase text-zinc-900 tracking-wider">Administrative Integrity Notice</p>
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest leading-relaxed max-w-2xl">
            Activity logs are immutable and cryptographically linked to prevent modification. 
            Vertex system protocols mandate a 100% transparent audit trail for all administrative actions.
          </p>
        </div>
      </div>
    </div>
  );
}
