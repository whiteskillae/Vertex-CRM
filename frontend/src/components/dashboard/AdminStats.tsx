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
    { label: "Total Entities", value: stats?.totalUsers || 0, icon: Users, change: "+2%" },
    { label: "Tasks Done", value: stats?.completedTasks || 0, icon: Target, change: "Live" },
    { label: "Active Nodes", value: stats?.activeUsers || 0, icon: Activity, change: "Verified" },
    { label: "Pipeline Value", value: `$${(stats?.revenue || 0).toLocaleString()}`, icon: TrendingUp, change: "Est." },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {quickStats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex justify-between items-start mb-2">
              <stat.icon className="h-5 w-5 text-black" />
              <span className="text-[8px] font-black bg-gray-100 text-black px-2 py-0.5 border border-black uppercase">
                {stat.change}
              </span>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{stat.label}</p>
            <h3 className="text-2xl font-black">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Task Distribution */}
        <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-lg font-black uppercase mb-6 flex items-center">
            <Activity className="mr-2 h-5 w-5" /> Operational Load Distribution
          </h3>
          <div className="flex flex-col md:flex-row items-center min-h-[350px]">
            <div className="w-full h-[300px] md:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.taskDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(stats?.taskDistribution || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ border: '2px solid black', borderRadius: '0', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-64 space-y-4 mt-6 md:mt-0">
              {(stats?.taskDistribution || []).map((item: any, i: number) => (
                <div key={i} className="flex items-center p-3 border-2 border-black">
                  <div className="w-4 h-4 mr-3" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-[10px] font-black uppercase">{item.name}</span>
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
