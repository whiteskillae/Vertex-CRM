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
import { ScreenShareManager } from "@/components/monitoring/ScreenShareManager";
import NotificationCenter from "@/components/dashboard/NotificationCenter";
import { useNotifications } from "@/hooks/useNotifications";
import toast, { Toaster } from 'react-hot-toast';

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
    <div className="h-screen bg-[#f8f9fa] flex flex-col lg:flex-row overflow-hidden font-sans">
      <Toaster position="top-right" />
      
      {/* Mobile Header */}
      <header className="lg:hidden bg-white text-black px-6 py-4 flex items-center justify-between border-b border-zinc-200 z-[100] shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-xs rounded-lg">V</div>
          <h1 className="font-bold text-sm tracking-tight">Vertex CRM</h1>
        </div>
        <div className="flex items-center gap-4">
          <NotificationCenter />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-all"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative top-0 left-0 bottom-0 z-[110] lg:z-40 bg-white border-r border-zinc-200 flex flex-col h-full
          transition-all duration-300 ease-in-out shadow-xl lg:shadow-none shrink-0
          ${collapsed ? "w-20" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className={`p-6 flex items-center shrink-0 ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-black text-white flex items-center justify-center font-bold text-xl rounded-xl shadow-lg shadow-black/10">V</div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-zinc-900">Vertex CRM</h2>
                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Enterprise</p>
              </div>
            </div>
          )}
          {collapsed && <div className="w-9 h-9 bg-black text-white flex items-center justify-center font-bold text-xl rounded-xl">V</div>}
          
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-8 h-8 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-all ml-2"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <div className={`px-4 py-6 shrink-0 ${collapsed ? "flex justify-center" : ""}`}>
          <div className={`bg-zinc-50 rounded-2xl p-3 border border-zinc-100 flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-bold text-lg rounded-xl shrink-0 shadow-sm">
              {user.name?.[0]?.toUpperCase()}
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-zinc-900 truncate">{user.name}</p>
                <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">{user.role}</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3 custom-scrollbar">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  relative flex items-center transition-all group rounded-xl
                  ${collapsed ? "justify-center p-3" : "px-4 py-3 gap-3"}
                  ${active
                    ? "bg-black text-white shadow-lg shadow-black/10"
                    : "text-zinc-600 hover:text-black hover:bg-zinc-100"
                  }
                `}
              >
                <item.icon className={`h-5 w-5 flex-shrink-0 ${active ? "text-white" : "text-zinc-500 group-hover:text-black"}`} />
                {!collapsed && (
                  <span className="text-[13px] font-medium tracking-tight flex-1">
                    {item.name}
                  </span>
                )}
                {item.hasAlert && (
                  <span className={`
                    flex-shrink-0 h-2 w-2 bg-red-500 rounded-full
                    ${collapsed ? "absolute top-2 right-2 border-2 border-white" : ""}
                  `} />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-4 border-t border-zinc-100 space-y-1 shrink-0">
          <button
            onClick={() => logout()}
            className={`w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="text-[13px] font-medium">Log Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#f8f9fa] relative h-full overflow-hidden">
        <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-30 shrink-0 border-b border-zinc-200/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-400">Vertex</span>
            <span className="text-xs font-medium text-zinc-300">/</span>
            <span className="text-xs font-bold text-zinc-900 capitalize">{pathname.split('/').pop() || 'Dashboard'}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest leading-none mb-1">System Time</span>
              <span className="text-xs font-bold text-zinc-900">
                {typeof window !== 'undefined' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </span>
            </div>
            <div className="h-8 w-[1px] bg-zinc-200"></div>
            <NotificationCenter />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          <div className="max-w-[1600px] mx-auto p-6 md:p-8 lg:p-10">
            {children}
          </div>
          <ScreenShareManager />
        </div>
      </main>
    </div>
  );
}
