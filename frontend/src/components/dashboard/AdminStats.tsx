"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, Users, Target, Activity, Loader2, Zap } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";

const COLORS = ['#18181b', '#10b981', '#6366f1', '#f43f5e', '#8b5cf6'];

export default function AdminStats() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const abortController = new AbortController();
    const fetchStats = async () => {
      try {
        const { data } = await api.get("auth/stats", { signal: abortController.signal });
        setStats(data);
      } catch (err: any) {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.error("Failed to fetch stats", err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStats();

    if (socket && isAdmin) {
      const handleUpdate = (data: any) => {
        if (data.status === 'sharing') {
          setStats((prev: any) => ({ ...prev, streamingCount: (prev?.streamingCount || 0) + 1 }));
        } else if (data.status === 'offline' || data.status === 'online') {
          setStats((prev: any) => ({ ...prev, streamingCount: Math.max(0, (prev?.streamingCount || 0) - 1) }));
        }
      };

      socket.on('monitoring:update', handleUpdate);
      return () => {
        socket.off('monitoring:update', handleUpdate);
        abortController.abort();
      };
    }

    return () => abortController.abort();
  }, [socket, isAdmin]);

    if (!mounted) return null;

  if (loading) return (
    <div className="h-[300px] flex items-center justify-center bg-white rounded-2xl border border-zinc-100 shadow-sm">
      <Loader2 className="animate-spin h-8 w-8 text-zinc-200" />
    </div>
  );

  const quickStats = [
    { label: "Total Personnel", value: stats?.totalUsers || 0, icon: Users, change: "+2.5%", color: "text-zinc-900", bg: "bg-zinc-50" },
    { label: "Tasks Done", value: stats?.completedTasks || 0, icon: Target, change: "Live", color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Active Nodes", value: stats?.activeUsers || 0, icon: Activity, change: "Stable", color: "text-indigo-600", bg: "bg-indigo-50" },
    ...(isAdmin ? [{ label: "Live Streams", value: stats?.streamingCount || 0, icon: Zap, change: "Live", color: "text-rose-600", bg: "bg-rose-50" }] : []),
  ];

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${quickStats.length} gap-5`}>
        {quickStats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl border border-zinc-100 p-7 shadow-sm hover:shadow-lg transition-all duration-300 group relative"
          >
            <div className="flex justify-between items-start mb-5">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-all duration-300 group-hover:scale-110 shadow-sm`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <span className={`text-[8px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-widest ${stat.bg} ${stat.color} border border-black/5`}>
                {stat.change}
              </span>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">{stat.label}</p>
              <h3 className="text-3xl font-bold text-zinc-950 tabular-nums tracking-tight italic">{stat.value.toLocaleString()}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Performance Graph */}
        <div className="bg-white rounded-3xl border border-zinc-100 p-8 shadow-sm flex flex-col h-[480px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight italic uppercase">System Velocity</h3>
              <p className="text-[9px] font-semibold text-zinc-400 mt-1 uppercase tracking-widest">30-day operation analysis</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-zinc-950" />
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Total</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Done</span>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.taskHistory || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.05}/>
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.05}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(val) => val.split('-').slice(2).join('/')}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }}
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: 'none', 
                    borderRadius: '16px', 
                    padding: '12px' 
                  }}
                  itemStyle={{ color: '#fff', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', padding: '2px 0' }}
                  labelStyle={{ color: '#71717a', fontSize: '8px', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase' }}
                />
                <Area type="monotone" dataKey="total" stroke="#18181b" strokeWidth={2.5} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} fill="url(#colorCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sector Allocation */}
        <div className="bg-white rounded-3xl border border-zinc-100 p-8 shadow-sm flex flex-col h-[480px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight italic uppercase">Sector Allocation</h3>
              <p className="text-[9px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">Resource distribution across nodes</p>
            </div>
            <Activity className="h-5 w-5 text-zinc-100" />
          </div>
          <div className="flex-1 flex flex-col md:flex-row items-center justify-around gap-8 min-h-0">
            <div className="w-full h-full max-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.taskDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                    animationDuration={2000}
                  >
                    {(stats?.taskDistribution || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={8} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '16px', padding: '12px' }}
                    itemStyle={{ color: '#fff', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-60 space-y-3">
              {(stats?.taskDistribution || []).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 border border-zinc-100 hover:bg-white hover:shadow-md transition-all duration-300 group/item">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest truncate max-w-[100px]">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-zinc-950 italic">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
