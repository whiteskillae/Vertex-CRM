"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Target, 
  Activity, 
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface StatsProps {
  stats: {
    totalUsers?: number;
    completedTasks?: number;
    activeUsers?: number;
    streamingCount?: number;
    totalLeads?: number;
    activeProjects?: number;
  } | null;
  isAdmin?: boolean;
}

export const AdminStats: React.FC<StatsProps> = ({ stats, isAdmin }) => {
  const displayStats = [
    { 
      label: "Personnel", 
      value: stats?.totalUsers || 0, 
      icon: Users, 
      color: "indigo",
      trend: "+12%"
    },
    { 
      label: "Completed", 
      value: stats?.completedTasks || 0, 
      icon: CheckCircle2, 
      color: "emerald",
      trend: "+8%"
    },
    { 
      label: "Active Nodes", 
      value: stats?.activeUsers || 0, 
      icon: Activity, 
      color: "amber",
      trend: "Stable"
    },
    { 
      label: "Live Streams", 
      value: stats?.streamingCount || 0, 
      icon: Zap, 
      color: "rose",
      trend: "Live"
    }
  ];

  const getColorClasses = (color: string) => {
    switch(color) {
      case 'emerald': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'rose': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'indigo': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'amber': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {displayStats.map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="premium-card p-6 bg-card"
        >
          <div className="flex items-center justify-between mb-5">
            <div className={`p-2.5 rounded-xl border ${getColorClasses(stat.color)}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 border border-border/50 rounded-lg">
              <TrendingUp className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tabular-nums">{stat.trend}</span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-bold tracking-tight tabular-nums">{stat.value.toLocaleString()}</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{stat.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
