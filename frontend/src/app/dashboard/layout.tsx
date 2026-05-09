"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  BarChart3,
  LogOut,
  Menu,
  X,
  MessageSquare,
  FileSearch,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Bell,
  User,
  Settings,
  Loader2,
  HardDrive,
  History,
  Video,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import toast, { Toaster } from 'react-hot-toast';

const ScreenShareManager = dynamic(() => import("@/components/monitoring/ScreenShareManager").then(mod => mod.ScreenShareManager), { ssr: false });
const NotificationCenter = dynamic(() => import("@/components/dashboard/NotificationCenter"), { ssr: false });

import { useNotifications } from "@/hooks/useNotifications";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  hasAlert?: boolean;
  adminOnly?: boolean;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { socket } = useSocket();

  // Sidebar state
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Notification state from hook
  const { notifications } = useNotifications();

  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";

  // Real-time Monitoring Alerts for Admin
  useEffect(() => {
    if (socket && isAdmin) {
      const handleStreamStart = (data: any) => {
        if (data.status === 'sharing') {
          toast.success(`Personnel Alert: ${data.userName || 'Someone'} has initiated a live stream.`, {
            icon: '📡',
            duration: 6000,
            style: {
              borderRadius: '16px',
              background: '#000',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 'bold',
              border: '2px solid #27272a'
            }
          });
        }
      };

      socket.on('monitoring:update', handleStreamStart);
      return () => {
        socket.off('monitoring:update', handleStreamStart);
      };
    }
  }, [socket, isAdmin]);

  const hasUnreadTasks = notifications.some(n => !n.isRead && n.type === 'task_reassigned');
  const hasUnreadMessages = notifications.some(n => !n.isRead && n.type === 'new_message');

  const navItems: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Personal Hub", href: "/dashboard/profile", icon: User },
    ...(!isEmployee
      ? [
          { name: "Leads", href: "/dashboard/leads", icon: FileSearch, adminOnly: true },
          {
            name: "Personnel",
            href: "/dashboard/personnel",
            icon: Users,
            hasAlert: false,
          }
        ]
      : []),
    {
      name: "Tasks",
      href: "/dashboard/tasks",
      icon: CheckSquare,
      hasAlert: hasUnreadTasks,
    },
    { name: "Projects", href: "/dashboard/projects", icon: ScrollText },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    {
      name: "Messages",
      href: "/dashboard/messages",
      icon: MessageSquare,
      hasAlert: hasUnreadMessages,
    },
    { name: "AI Assistant", href: "/dashboard/ai", icon: ShieldCheck },
    ...(isAdmin
      ? [
          { name: "Storage", href: "/dashboard/storage", icon: HardDrive, adminOnly: true },
          { name: "Secure Vault", href: "/dashboard/vault", icon: Settings, adminOnly: true },
          { name: "Monitoring", href: "/dashboard/monitoring", icon: Video, adminOnly: true },
          { name: "Activity Logs", href: "/dashboard/logs", icon: History, adminOnly: true }
        ]
      : []),
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin h-8 w-8 text-black" />
      </div>
    );
  }

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="h-screen bg-[#fafafa] flex flex-col lg:flex-row overflow-hidden font-sans">
      <Toaster position="top-right" />
      
      {/* Mobile Header */}
      <header className="lg:hidden bg-white text-black px-6 py-4 flex items-center justify-between border-b border-zinc-200 z-[100] shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-black text-white flex items-center justify-center font-black text-sm rounded-xl">V</div>
          <h1 className="font-bold text-base tracking-tight">Vertex CRM</h1>
        </div>
        <div className="flex items-center gap-4">
          <NotificationCenter />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 hover:bg-zinc-100 rounded-xl transition-all"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative top-0 left-0 bottom-0 z-[110] lg:z-40 bg-white border-r border-zinc-100 flex flex-col h-full
          transition-all duration-500 ease-in-out shadow-2xl lg:shadow-none shrink-0
          ${collapsed ? "w-28" : "w-80"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className={`p-10 flex items-center shrink-0 ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-zinc-950 text-white flex items-center justify-center font-black text-2xl rounded-[1.5rem] shadow-2xl shadow-black/30">V</div>
              <div>
                <h2 className="text-lg font-black tracking-tighter text-zinc-950 uppercase italic">Vertex</h2>
                <p className="text-[9px] text-brand-indigo font-black uppercase tracking-[0.4em] italic">Enterprise_Core</p>
              </div>
            </div>
          )}
          {collapsed && <div className="w-14 h-14 bg-zinc-950 text-white flex items-center justify-center font-black text-2xl rounded-[1.5rem] shadow-2xl shadow-black/20">V</div>}
          
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-10 h-10 text-zinc-300 hover:text-zinc-950 hover:bg-zinc-50 rounded-2xl transition-all ml-4"
          >
            {collapsed ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
          </button>
        </div>

        <div className={`px-8 py-4 shrink-0 ${collapsed ? "flex justify-center" : ""}`}>
          <div className={`bg-zinc-50/50 rounded-[2rem] p-5 border border-zinc-100 flex items-center ${collapsed ? "justify-center" : "gap-5"} group cursor-pointer hover:bg-white hover:border-zinc-200 transition-all duration-500`}>
            <div className="w-12 h-12 bg-white border border-zinc-100 text-zinc-950 flex items-center justify-center font-black text-xl rounded-[1.2rem] shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              {user.name?.[0]?.toUpperCase()}
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-black text-zinc-950 truncate uppercase tracking-tight italic">{user.name}</p>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand-emerald rounded-full animate-pulse" />
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{user.role}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-10 space-y-2 px-6 custom-scrollbar">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  relative flex items-center transition-all group rounded-[1.5rem]
                  ${collapsed ? "justify-center p-5" : "px-6 py-4 gap-5"}
                  ${active
                    ? "bg-zinc-950 text-white shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)]"
                    : "text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50"
                  }
                `}
              >
                <item.icon className={`h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110 ${active ? "text-white" : "text-zinc-300 group-hover:text-zinc-950"}`} />
                {!collapsed && (
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] flex-1 italic">
                    {item.name}
                  </span>
                )}
                {item.hasAlert && (
                  <span className={`
                    flex-shrink-0 h-2.5 w-2.5 bg-brand-rose rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)]
                    ${collapsed ? "absolute top-4 right-4 border-2 border-white" : ""}
                  `} />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-8 border-t border-zinc-100 space-y-4 shrink-0">
          <button
            onClick={() => logout()}
            className={`w-full flex items-center gap-5 p-5 text-brand-rose font-black uppercase tracking-[0.3em] text-[10px] italic hover:bg-rose-50 rounded-[1.5rem] transition-all ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="text-xs">Terminate Session</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#fafafa] relative h-full overflow-hidden">
        <header className="hidden lg:flex items-center justify-between px-12 py-8 bg-white/80 backdrop-blur-3xl sticky top-0 z-30 shrink-0 border-b border-zinc-100/50">
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.5em] italic">Vertex_Core</span>
            <div className="w-1.5 h-1.5 bg-zinc-200 rounded-full" />
            <span className="text-xs font-black text-zinc-950 uppercase tracking-widest italic">{pathname.split('/').pop()?.replace(/-/g, ' ') || 'Overview'}</span>
          </div>
          <div className="flex items-center gap-12">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em] leading-none mb-2 italic">Node_Time</span>
              <span className="text-sm font-black text-zinc-950 tracking-[0.2em] italic">
                {typeof window !== 'undefined' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '00:00:00'}
              </span>
            </div>
            <div className="h-10 w-[1px] bg-zinc-100"></div>
            <NotificationCenter />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 scroll-smooth">
          <div className="max-w-[1600px] mx-auto p-8 md:p-10 lg:p-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {children}
            </motion.div>
          </div>
          <ScreenShareManager />
        </div>
      </main>
    </div>
  );
}
