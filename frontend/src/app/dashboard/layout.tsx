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
const ClockDisplay = dynamic(() => import("@/components/dashboard/ClockDisplay").then(mod => mod.ClockDisplay), { ssr: false });

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

  const hasUnreadTasks = notifications.some(n => !n.isRead && (n.type.startsWith('task_') || n.type.startsWith('mission_')));
  const hasUnreadMessages = notifications.some(n => !n.isRead && (n.type === 'new_message' || n.type === 'chat_message' || n.type === 'announcement'));

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
    <div className="h-screen flex bg-background overflow-hidden selection:bg-primary selection:text-primary-foreground">
      <Toaster position="top-right" />
      
      {/* Sidebar - ChatGPT Style */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-300 ease-in-out lg:relative
          ${collapsed ? "w-[var(--sidebar-collapsed-width)]" : "w-[var(--sidebar-width)]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="h-16 flex items-center px-6 border-b border-border">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center font-bold rounded-lg shrink-0">V</div>
              {!collapsed && (
                <span className="font-semibold tracking-tight uppercase text-sm">Vertex CRM</span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all group relative
                    ${active 
                      ? "bg-secondary text-foreground font-medium" 
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    }
                    ${collapsed ? "justify-center" : ""}
                  `}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                  {!collapsed && <span className="text-sm truncate">{item.name}</span>}
                  {item.hasAlert && (
                    <div className="absolute right-3 w-1.5 h-1.5 bg-destructive rounded-full" />
                  )}
                  {collapsed && active && (
                    <div className="absolute left-0 w-1 h-4 bg-primary rounded-r-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Section & Logout */}
          <div className="p-4 border-t border-border">
            <div className={`flex items-center gap-3 mb-4 ${collapsed ? "justify-center" : ""}`}>
              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border border-border">
                {user.name?.[0]?.toUpperCase()}
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold truncate">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-tight">{user.role}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => logout()}
              className={`w-full flex items-center gap-3 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all ${collapsed ? "justify-center" : ""}`}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span className="text-xs font-medium">Log out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-background/50 backdrop-blur-md z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileOpen(!mobileOpen)} 
              className="lg:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-semibold">
              <span>{pathname.split('/').pop()?.replace(/-/g, ' ') || 'Overview'}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider tabular-nums">
                <ClockDisplay />
              </span>
            </div>
            <div className="w-px h-4 bg-border" />
            <NotificationCenter />
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto bg-background custom-scrollbar">
          <div className="max-w-[1600px] mx-auto p-8 lg:p-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </div>
          <ScreenShareManager />
        </main>
      </div>
    </div>
  );
}
