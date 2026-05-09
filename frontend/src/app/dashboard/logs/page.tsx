"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
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
  Search,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Eye,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`logs?page=${page}&limit=50&search=${search}&actionType=${actionFilter}`);
      setLogs(data.logs || []);
      setTotalPages(data.pages);
    } catch (err) {
      console.error("Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (type: string) => {
    switch(type) {
      case 'delete': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      case 'create': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'update': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'auth': return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
      default: return 'text-zinc-500 bg-white/5 border-white/10';
    }
  };

  const getDeviceIcon = (device: string) => {
    if (device?.toLowerCase().includes('mobile')) return <Smartphone className="h-3 w-3" />;
    if (device?.toLowerCase().includes('tablet')) return <Tablet className="h-3 w-3" />;
    return <Monitor className="h-3 w-3" />;
  };

  return (
    <div className="space-y-10 pb-24 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-zinc-100 pb-12">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3.5 bg-zinc-950 text-white rounded-2xl shadow-xl shadow-black/10">
              <ScrollText className="h-7 w-7" />
            </div>
            <div className="h-0.5 w-12 bg-zinc-900 rounded-full" />
          </div>
          <h1 className="text-5xl font-bold uppercase tracking-tight text-zinc-900 leading-none">Security Audit</h1>
          <p className="text-[10px] uppercase tracking-[0.5em] font-bold text-zinc-400 mt-4 italic flex items-center gap-3">
             System-Wide Telemetry / Access Control Logs
          </p>
        </div>

        <div className="flex items-center gap-4">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 transition-colors group-focus-within:text-zinc-950" />
                <input 
                    type="text" 
                    placeholder="Search actions or pages..." 
                    className="pl-11 pr-6 py-4 bg-white border border-zinc-100 rounded-2xl text-[11px] font-bold uppercase tracking-wider w-[300px] focus:outline-none focus:ring-4 focus:ring-zinc-950/5 focus:border-zinc-950 transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                />
            </div>

            <select 
                className="px-6 py-4 bg-white border border-zinc-100 rounded-2xl text-[11px] font-bold uppercase tracking-wider focus:outline-none focus:ring-4 focus:ring-zinc-950/5 focus:border-zinc-950 transition-all appearance-none cursor-pointer"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
            >
                <option value="">All Actions</option>
                <option value="auth">Authentications</option>
                <option value="create">Creations</option>
                <option value="update">Modifications</option>
                <option value="delete">Deletions</option>
                <option value="view">Page Views</option>
            </select>

            <button 
                onClick={fetchLogs}
                className="p-4 bg-white border border-zinc-100 rounded-2xl hover:bg-zinc-950 hover:text-white transition-all shadow-sm group active:scale-95"
            >
                <RefreshCcw className={`h-5 w-5 text-zinc-400 group-hover:text-white ${loading ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      <div className="bg-zinc-950 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
           <Shield className="h-64 w-64 text-white" />
        </div>
        
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 mb-6 px-6 py-4 bg-white/5 rounded-2xl text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 border border-white/5 relative z-10">
          <div className="col-span-1">Timestamp</div>
          <div className="col-span-2">User / Identity</div>
          <div className="col-span-2">Action / Target</div>
          <div className="col-span-2">Page / Entry</div>
          <div className="col-span-3">Network & Device Info</div>
          <div className="col-span-2 text-right">Activity Status</div>
        </div>
        
        <div className="space-y-2 font-mono text-[11px] relative z-10">
          {loading && logs.length === 0 ? (
            <div className="flex items-center gap-4 py-32 justify-center flex-col opacity-40">
               <Loader2 className="h-10 w-10 animate-spin text-white" />
               <p className="uppercase tracking-[0.4em] text-zinc-400 text-[10px] font-bold">Synchronizing Encrypted Audit Nodes...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-32 text-center opacity-30 italic">
               <p className="uppercase tracking-widest text-zinc-400">Zero entry points detected in current frequency.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {logs.map((log: any, i) => (
                    <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.01 }}
                    key={log._id} 
                    className="grid grid-cols-12 gap-4 items-center p-4 rounded-2xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5"
                    >
                        {/* Time */}
                        <div className="col-span-1">
                            <span className="text-zinc-600 font-bold opacity-60 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                {format(new Date(log.timestamp || log.createdAt), "HH:mm:ss")}
                            </span>
                        </div>

                        {/* User */}
                        <div className="col-span-2">
                            <div className="flex items-center gap-3">
                                <div className="h-7 w-7 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                                    {log.user?.name?.[0] || 'R'}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-zinc-100 font-bold truncate group-hover:text-white transition-colors">{log.user?.name || 'ROOT'}</p>
                                    <p className="text-[8px] text-zinc-600 font-bold uppercase truncate">{log.user?.role || 'SYSTEM'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Action */}
                        <div className="col-span-2">
                            <div className="flex flex-col gap-1">
                                <span className={`w-fit px-2 py-0.5 rounded-md text-[8px] font-bold uppercase border ${getActionColor(log.actionType)}`}>
                                    {log.action}
                                </span>
                                <span className="text-zinc-600 text-[8px] font-bold uppercase truncate">{log.entity || 'protocol'}</span>
                            </div>
                        </div>

                        {/* Page */}
                        <div className="col-span-2">
                            <div className="flex items-center gap-2 text-zinc-400 overflow-hidden">
                                <Eye className="h-3 w-3 flex-shrink-0 text-zinc-600" />
                                <span className="truncate text-[9px] group-hover:text-zinc-200 transition-colors">{log.page || '/root'}</span>
                            </div>
                        </div>

                        {/* Network/Device */}
                        <div className="col-span-3">
                            <div className="flex items-center gap-4 text-[9px]">
                                <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-lg border border-white/5 text-zinc-400">
                                    <Globe className="h-3 w-3 text-zinc-600" />
                                    <span className="font-bold">{log.ip?.replace('::ffff:', '') || '0.0.0.0'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-zinc-500 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-1.5">
                                        {getDeviceIcon(log.device)}
                                        <span className="uppercase">{log.browser?.split(' ')?.[0] || 'NET'}</span>
                                    </div>
                                    <div className="h-1 w-1 bg-zinc-800 rounded-full" />
                                    <span className="uppercase">{log.os || 'UNKNOWN'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Status/Info */}
                        <div className="col-span-2 text-right">
                            <div className="flex items-center justify-end gap-3">
                                {log.changes && (
                                    <div className="px-2 py-1 bg-emerald-400/5 text-emerald-400/60 text-[8px] font-bold rounded-lg border border-emerald-400/10 flex items-center gap-1.5">
                                        <RefreshCcw className="h-2.5 w-2.5" />
                                        DATA_SYNCED
                                    </div>
                                )}
                                <div className="h-2 w-2 rounded-full bg-zinc-800 group-hover:bg-emerald-500 transition-colors shadow-[0_0_8px_rgba(16,185,129,0)] group-hover:shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                            </div>
                        </div>
                    </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
        <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-[0.3em]">
          Displaying Fragment {page} <span className="mx-2 text-zinc-200">/</span> {totalPages} Chunks Available
        </p>
        <div className="flex gap-4">
          <button 
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="flex items-center gap-2 px-8 py-4 bg-white border border-zinc-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-950 hover:text-white disabled:opacity-20 transition-all shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <button 
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="flex items-center gap-2 px-8 py-4 bg-white border border-zinc-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-950 hover:text-white disabled:opacity-20 transition-all shadow-sm"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-10 bg-zinc-50 rounded-3xl border border-zinc-100 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
        <div className="p-4 bg-white rounded-2xl shadow-sm">
           <Shield className="h-6 w-6 text-zinc-950" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase text-zinc-900 tracking-wider">Administrative Integrity Notice</p>
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest leading-relaxed max-w-2xl">
            Activity logs are immutable and cryptographically linked to prevent modification. 
            Vertex system protocols mandate a 100% transparent audit trail for all administrative actions.
          </p>
        </div>
      </div>
    </div>
  );
}
