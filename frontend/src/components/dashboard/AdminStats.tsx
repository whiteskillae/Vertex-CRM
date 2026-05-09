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
const GRADIENTS = [
  { start: '#18181b', end: '#3f3f46' },
  { start: '#10b981', end: '#34d399' },
  { start: '#6366f1', end: '#818cf8' },
  { start: '#f43f5e', end: '#fb7185' },
  { start: '#8b5cf6', end: '#a78bfa' },
];

export default function AdminStats() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return (
    <div className="h-[400px] flex items-center justify-center bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm">
      <Loader2 className="animate-spin h-10 w-10 text-zinc-200" />
    </div>
  );

  const quickStats = [
    { label: "Total Entities", value: stats?.totalUsers || 0, icon: Users, change: "+2.5%", color: "text-zinc-900", bg: "bg-zinc-50" },
    { label: "Tasks Done", value: stats?.completedTasks || 0, icon: Target, change: "Live", color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Active Nodes", value: stats?.activeUsers || 0, icon: Activity, change: "Stable", color: "text-indigo-600", bg: "bg-indigo-50" },
    ...(isAdmin ? [{ label: "Active Streams", value: stats?.streamingCount || 0, icon: Zap, change: "Live", color: "text-rose-600", bg: "bg-rose-50" }] : []),
  ];

  return (
    <div className="space-y-10">
      {/* Quick Stats */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${quickStats.length} gap-6`}>
        {quickStats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-[2.5rem] border border-zinc-100 p-8 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-zinc-50/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 shadow-sm`}>
                <stat.icon className="h-7 w-7" />
              </div>
              <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-[0.2em] ${stat.bg} ${stat.color} border border-black/5`}>
                {stat.change}
              </span>
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-2">{stat.label}</p>
              <h3 className="text-4xl font-bold text-zinc-950 tabular-nums tracking-tighter italic">{stat.value.toLocaleString()}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Operational Efficiency: Task History */}
        <div className="bg-white rounded-[3rem] border border-zinc-100 p-10 shadow-sm flex flex-col h-[520px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700">
            <Activity className="w-40 h-40" />
          </div>
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div>
              <h3 className="text-xl font-bold text-zinc-950 tracking-tight italic uppercase">Operational Velocity</h3>
              <p className="text-[10px] font-bold text-zinc-400 mt-2 uppercase tracking-widest">30-day performance trend analysis</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-950" />
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Total</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Completed</span>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.taskHistory || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#cbd5e1' }}
                  tickFormatter={(val) => val.split('-').slice(2).join('/')}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#cbd5e1' }} />
                <Tooltip 
                  cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: 'none', 
                    borderRadius: '24px', 
                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)',
                    padding: '16px' 
                  }}
                  itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', padding: '4px 0' }}
                  labelStyle={{ color: '#a1a1aa', fontSize: '9px', fontWeight: '900', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.2em' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#18181b" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                  animationDuration={2500}
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                  animationDuration={3000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Distribution Pie */}
        <div className="bg-white rounded-[3rem] border border-zinc-100 p-10 shadow-sm flex flex-col h-[520px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700">
            <Zap className="w-40 h-40" />
          </div>
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div>
              <h3 className="text-xl font-bold text-zinc-950 tracking-tight italic uppercase">Sector Allocation</h3>
              <p className="text-[10px] font-bold text-zinc-400 mt-2 uppercase tracking-widest">Resource distribution across departments</p>
            </div>
            <Zap className="h-6 w-6 text-zinc-950 animate-pulse" />
          </div>
          <div className="flex-1 flex flex-col md:flex-row items-center justify-around gap-12 min-h-0 relative z-10">
            <div className="w-full h-full max-h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.taskDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={85}
                    outerRadius={120}
                    paddingAngle={12}
                    dataKey="value"
                    stroke="none"
                    animationDuration={2500}
                  >
                    {(stats?.taskDistribution || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={16} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: 'none', 
                      borderRadius: '24px', 
                      padding: '16px' 
                    }}
                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-64 space-y-4">
              {(stats?.taskDistribution || []).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-zinc-50 border border-zinc-100 hover:bg-white hover:shadow-xl hover:shadow-black/[0.03] transition-all duration-500 group/item">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 rounded-full shadow-inner transition-transform group-hover/item:scale-125" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest truncate max-w-[120px]">{item.name}</span>
                  </div>
                  <span className="text-sm font-black text-zinc-950 tabular-nums italic">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
  );
}
