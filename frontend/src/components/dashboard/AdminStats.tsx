"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, Users, Target, Activity, Loader2 } from "lucide-react";

const COLORS = ['#000000', '#444444', '#888888'];

export default function AdminStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    return () => abortController.abort();
  }, []);

  if (loading) return (
    <div className="h-[400px] flex items-center justify-center bg-gray-50 border-2 border-black border-dashed">
      <Loader2 className="animate-spin h-8 w-8 text-black" />
    </div>
  );

  const quickStats = [
    { label: "Total Entities", value: stats?.totalUsers || 0, icon: Users, change: "+2%", color: "border-black" },
    { label: "Tasks Done", value: stats?.completedTasks || 0, icon: Target, change: "Live", color: "border-black" },
    { label: "Active Nodes", value: stats?.activeUsers || 0, icon: Activity, change: "Verified", color: "border-black" },
    { label: "Active Streams", value: stats?.streamingCount || 0, icon: Zap, change: "Real-time", color: "border-yellow-400" },
  ];

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-white border-4 ${stat.color} p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group hover:-translate-y-1 transition-transform`}
          >
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-2 bg-black text-white">
                <stat.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-black bg-zinc-100 text-black px-2 py-1 border-2 border-black uppercase italic">
                {stat.change}
              </span>
            </div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest relative z-10">{stat.label}</p>
            <h3 className="text-4xl font-black mt-1 relative z-10">{stat.value}</h3>
            
            {/* Background Accent */}
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <stat.icon className="h-24 w-24" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Operational Efficiency: Task History */}
        <div className="bg-white border-8 border-black p-8 shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[450px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tighter italic leading-none">Operational Load</h3>
              <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mt-1">30-Day Velocity Audit</p>
            </div>
            <TrendingUp className="h-6 w-6 text-zinc-300" />
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.taskHistory || []}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#888' }}
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#888' }} />
                <Tooltip 
                  contentStyle={{ border: '4px solid black', borderRadius: '0', fontWeight: '900', fontSize: '10px', textTransform: 'uppercase' }}
                  cursor={{ stroke: 'black', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="total" stroke="#000" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="completed" stroke="#ccc" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Distribution Pie */}
        <div className="bg-white border-8 border-black p-8 shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[450px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tighter italic leading-none">Sector Allocation</h3>
              <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mt-1">Real-time Task Partitioning</p>
            </div>
            <Activity className="h-6 w-6 text-zinc-300" />
          </div>
          <div className="flex-1 flex flex-col md:flex-row items-center justify-around gap-8 min-h-0">
            <div className="w-full h-full max-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.taskDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={10}
                    dataKey="value"
                    stroke="none"
                  >
                    {(stats?.taskDistribution || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ border: '4px solid black', borderRadius: '0', fontWeight: '900', fontSize: '10px', textTransform: 'uppercase' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-48 space-y-3">
              {(stats?.taskDistribution || []).map((item: any, i: number) => (
                <div key={i} className="flex items-center p-3 border-4 border-black bg-zinc-50 group hover:bg-black hover:text-white transition-colors">
                  <div className="w-3 h-3 mr-3 border-2 border-black" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-[10px] font-black uppercase tracking-tighter">{item.name}</span>
                  <span className="ml-auto text-xs font-black">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
