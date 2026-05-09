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

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const GRADIENTS = [
  { start: '#6366f1', end: '#a5b4fc' },
  { start: '#10b981', end: '#6ee7b7' },
  { start: '#f59e0b', end: '#fcd34d' },
  { start: '#ef4444', end: '#fca5a5' },
  { start: '#8b5cf6', end: '#c4b5fd' },
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
    <div className="h-[400px] flex items-center justify-center bg-white rounded-3xl border border-zinc-100 shadow-sm">
      <Loader2 className="animate-spin h-8 w-8 text-zinc-300" />
    </div>
  );

  const quickStats = [
    { label: "Total Entities", value: stats?.totalUsers || 0, icon: Users, change: "+2.5%", color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Tasks Done", value: stats?.completedTasks || 0, icon: Target, change: "Live", color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Active Nodes", value: stats?.activeUsers || 0, icon: Activity, change: "Stable", color: "text-amber-600", bg: "bg-amber-50" },
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
            className="bg-white rounded-3xl border border-zinc-100 p-6 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-colors group-hover:scale-110 duration-300`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${stat.bg} ${stat.color}`}>
                {stat.change}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-3xl font-bold mt-1 text-zinc-900 tabular-nums">{stat.value.toLocaleString()}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Operational Efficiency: Task History */}
        <div className="bg-white rounded-[2rem] border border-zinc-100 p-8 shadow-sm flex flex-col h-[480px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Operational Velocity</h3>
              <p className="text-xs text-zinc-400 mt-1">30-day performance trend analysis</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-[10px] font-medium text-zinc-500 uppercase">Total</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-200" />
                <span className="text-[10px] font-medium text-zinc-500 uppercase">Completed</span>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.taskHistory || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {GRADIENTS.map((grad, i) => (
                    <linearGradient key={i} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={grad.start} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={grad.start} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(val) => val.split('-').slice(2).join('/')}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                  contentStyle={{ 
                    backgroundColor: '#000', 
                    border: 'none', 
                    borderRadius: '16px', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    padding: '12px' 
                  }}
                  itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}
                  labelStyle={{ color: '#6366f1', fontSize: '10px', fontWeight: '900', marginBottom: '4px', textTransform: 'uppercase' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#6366f1" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                  animationDuration={2000}
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  fill="transparent" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Distribution Pie */}
        <div className="bg-white rounded-[2rem] border border-zinc-100 p-8 shadow-sm flex flex-col h-[480px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Sector Allocation</h3>
              <p className="text-xs text-zinc-400 mt-1">Resource distribution across departments</p>
            </div>
            <Activity className="h-5 w-5 text-zinc-300" />
          </div>
          <div className="flex-1 flex flex-col md:flex-row items-center justify-around gap-8 min-h-0">
            <div className="w-full h-full max-h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.taskDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={10}
                    dataKey="value"
                    stroke="none"
                    animationDuration={2000}
                  >
                    {(stats?.taskDistribution || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={12} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#000', 
                      border: 'none', 
                      borderRadius: '16px', 
                      padding: '12px' 
                    }}
                    itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-56 space-y-3">
              {(stats?.taskDistribution || []).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:bg-white hover:shadow-lg hover:shadow-black/5 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-wider truncate max-w-[100px]">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-zinc-900 tabular-nums">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
