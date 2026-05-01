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
      case 'delete': return 'text-red-600 bg-red-50 border-red-200';
      case 'create': return 'text-green-600 bg-green-50 border-green-200';
      case 'update': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'import': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">System Activity Logs</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-400">Immutable Audit Trail</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="p-2 border-2 border-black hover:bg-black hover:text-white transition-all"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-black text-green-500 p-6 border-4 border-zinc-800 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] font-mono text-xs overflow-x-auto">
        <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-2">
          <Terminal className="h-4 w-4" />
          <span className="uppercase tracking-widest font-black text-[10px]">Security Event Stream</span>
        </div>
        
        <div className="space-y-3">
          {loading && logs.length === 0 ? (
            <div className="flex items-center gap-2 animate-pulse">
              <span className="text-zinc-600">[QUERYING]</span> Establishing secure link to audit node...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-zinc-600 italic">No security events recorded in this cycle.</div>
          ) : (
            logs.map((log: any) => (
              <motion.div 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                key={log._id} 
                className="flex flex-col md:flex-row md:items-center gap-2 border-b border-zinc-900 pb-2 hover:bg-zinc-900 transition-colors"
              >
                <span className="text-zinc-600 whitespace-nowrap">[{new Date(log.createdAt).toLocaleString()}]</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getActionColor(log.action)}`}>
                  {log.action}
                </span>
                <span className="text-zinc-400 uppercase font-bold">[{log.entity}]</span>
                <span className="text-white">
                  {log.user?.name || 'Unknown User'} 
                  <span className="text-zinc-500 mx-2">ID: {log.user?._id?.substring(0,8)}</span>
                </span>
                <span className="text-zinc-500 truncate italic">
                  - {JSON.stringify(log.details?.url || log.details || "")}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4">
        <p className="text-[10px] font-bold uppercase text-gray-400">Sequence {page} of {totalPages}</p>
        <div className="flex gap-2">
          <button 
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="p-2 border-2 border-black hover:bg-black hover:text-white disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button 
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="p-2 border-2 border-black hover:bg-black hover:text-white disabled:opacity-30 transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4 bg-red-50 border-2 border-red-200 flex gap-4 items-start">
        <Shield className="h-5 w-5 text-red-600 mt-1" />
        <div>
          <p className="text-xs font-black uppercase text-red-700">Administrative Notice</p>
          <p className="text-[10px] font-medium text-red-600 uppercase tracking-wider mt-1">
            Activity logs are immutable and cannot be deleted or modified by any user role. This ensures a transparent audit trail for all system modifications.
          </p>
        </div>
      </div>
    </div>
  );
}
