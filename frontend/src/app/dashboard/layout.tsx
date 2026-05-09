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
  Globe
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import toast, { Toaster } from 'react-hot-toast';

const ScreenShareManager = dynamic(() => import("@/components/monitoring/ScreenShareManager").then(mod => mod.ScreenShareManager), { ssr: false });
const NotificationCenter = dynamic(() => import("@/components/dashboard/NotificationCenter"), { ssr: false });

import { useNotifications } from "@/hooks/useNotifications";

const ClockDisplay = () => {
  const [time, setTime] = useState("00:00");
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);
  return <>{time}</>;
};

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

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { notifications } = useNotifications();

  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";

  useEffect(() => {
    if (socket && isAdmin) {
      const handleStreamStart = (data: any) => {
        if (data.status === 'sharing') {
          toast.success(`Personnel Alert: ${data.userName || 'Someone'} has initiated a live stream.`, {
            icon: '📡',
            duration: 6000,
            style: {
              borderRadius: '12px',
              background: '#09090b',
              color: '#fff',
              fontSize: '11px',
              fontWeight: '600',
              border: '1px solid #27272a'
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
          { name: "Personnel", href: "/dashboard/personnel", icon: Users }
        ]
      : []),
    { name: "Tasks", href: "/dashboard/tasks", icon: CheckSquare, hasAlert: hasUnreadTasks },
    { name: "Projects", href: "/dashboard/projects", icon: ScrollText },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    { name: "Messages", href: "/dashboard/messages", icon: MessageSquare, hasAlert: hasUnreadMessages },
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
        <Loader2 className="animate-spin h-6 w-6 text-zinc-200" />
      </div>
    );
  }

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="h-screen bg-[#fafafa] flex flex-col lg:flex-row overflow-hidden">
      <Toaster position="top-right" />
      
      {/* Mobile Header */}
      <header className="lg:hidden bg-white px-6 py-4 flex items-center justify-between border-b border-zinc-100 z-[100] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-950 text-white flex items-center justify-center font-bold text-sm rounded-lg">V</div>
          <h1 className="font-bold text-sm tracking-tight uppercase">Vertex CRM</h1>
        </div>
        <div className="flex items-center gap-4">
          <NotificationCenter />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 hover:bg-zinc-50 rounded-lg transition-all"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative top-0 left-0 bottom-0 z-[110] lg:z-40 bg-white border-r border-zinc-100 flex flex-col h-full
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-24" : "w-72"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className={`p-6 flex items-center shrink-0 ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-950 text-white flex items-center justify-center font-bold text-lg rounded-lg">V</div>
              <div>
                <h2 className="text-xs font-bold tracking-tight text-zinc-950 uppercase italic leading-none">Vertex</h2>
                <p className="text-[7px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Enterprise Core</p>
              </div>
            </div>
          )}
          {collapsed && <div className="w-8 h-8 bg-zinc-950 text-white flex items-center justify-center font-bold text-lg rounded-lg">V</div>}
          
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-7 h-7 text-zinc-300 hover:text-zinc-950 hover:bg-zinc-50 rounded-lg transition-all"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className={`px-6 py-2 shrink-0 ${collapsed ? "flex justify-center" : ""}`}>
          <div className={`bg-zinc-50/50 rounded-2xl p-4 border border-zinc-100 flex items-center ${collapsed ? "justify-center" : "gap-4"} group cursor-pointer hover:bg-white hover:border-zinc-200 transition-all`}>
            <div className="w-10 h-10 bg-white border border-zinc-100 text-zinc-950 flex items-center justify-center font-bold text-base rounded-lg shrink-0 shadow-sm">
              {user.name?.[0]?.toUpperCase()}
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-[11px] font-bold text-zinc-950 truncate uppercase tracking-tight italic">{user.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{user.role}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-8 space-y-1 px-4 custom-scrollbar">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  relative flex items-center transition-all group rounded-xl
                  ${collapsed ? "justify-center p-3.5" : "px-5 py-3 gap-4"}
                  ${active
                    ? "bg-zinc-950 text-white shadow-lg shadow-black/10"
                    : "text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50"
                  }
                `}
              >
                <item.icon className={`h-4 w-4 flex-shrink-0 transition-transform ${active ? "text-white" : "text-zinc-300 group-hover:text-zinc-950"}`} />
                {!collapsed && (
                  <span className="text-[10px] font-bold uppercase tracking-widest flex-1 italic">
                    {item.name}
                  </span>
                )}
                {item.hasAlert && (
                  <span className={`
                    flex-shrink-0 h-1.5 w-1.5 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.3)]
                    ${collapsed ? "absolute top-3 right-3" : ""}
                  `} />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-6 border-t border-zinc-100 shrink-0">
          <button
            onClick={() => logout()}
            className={`w-full flex items-center gap-4 p-3.5 text-rose-500 font-bold uppercase tracking-widest text-[9px] italic hover:bg-rose-50 rounded-xl transition-all ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Terminate Session</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#fafafa] relative overflow-hidden">
        <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-white border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest italic">Nexus Protocol</span>
            <div className="w-1 h-1 bg-zinc-200 rounded-full" />
            <span className="text-[9px] font-bold text-zinc-950 uppercase tracking-widest italic">{pathname.split('/').pop()?.replace(/-/g, ' ') || 'Overview'}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[7px] font-bold text-zinc-300 uppercase tracking-widest leading-none mb-1">System Clock</span>
              <span className="text-[11px] font-bold text-zinc-950 tracking-widest tabular-nums">
                <ClockDisplay />
              </span>
            </div>
            <div className="h-6 w-[1px] bg-zinc-100"></div>
            <NotificationCenter />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <div className="p-6 md:p-8 lg:p-10">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
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

const ClockDisplay = () => {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);
  return <>{time || "00:00"}</>;
};

const NotificationCenter = () => {
  return (
    <button className="relative p-2.5 bg-zinc-50 text-zinc-400 rounded-xl hover:bg-zinc-950 hover:text-white transition-all group">
      <Bell className="h-4 w-4" />
      <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-500 rounded-full border-2 border-white group-hover:border-zinc-950 transition-all"></span>
    </button>
  );
};
