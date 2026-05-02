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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { motion, AnimatePresence } from "framer-motion";
import { ScreenShareManager } from "@/components/monitoring/ScreenShareManager";

// ── Types ──────────────────────────────────────────────────────────────────────
interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  hasAlert?: boolean;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, updateUser } = useAuth();
  const { socket } = useSocket();

  // Sidebar state — collapsed vs expanded
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Notification state
  const [hasNewTasks, setHasNewTasks] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Profile edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";

  // ── Fetch notification statuses ─────────────────────────────────────────────
  const fetchNotificationStatus = useCallback(async () => {
    if (!user) return;
    try {
      const [tasksRes, msgsRes] = await Promise.all([
        api.get("tasks"),
        api.get("messages"),
      ]);

      const lastTasksRead = user.lastReadTasksAt
        ? new Date(user.lastReadTasksAt)
        : new Date(0);

      const tasks = tasksRes.data?.tasks || [];
      const msgs = msgsRes.data || [];

      setHasNewTasks(
        Array.isArray(tasks) &&
          tasks.some((t: { createdAt: string }) => new Date(t.createdAt) > lastTasksRead)
      );
      setHasNewMessages(
        Array.isArray(msgs) && msgs.some((m: { isSeen: boolean; receiverId: string | { _id: string } }) => {
          const receiverId = typeof m.receiverId === 'string' ? m.receiverId : m.receiverId?._id;
          return !m.isSeen && receiverId === user._id;
        })
      );
    } catch {
      // Non-blocking — notifications are cosmetic
    }
  }, [user]);

  const fetchPendingCount = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await api.get("auth/pending");
      setPendingCount(data?.length || 0);
    } catch {
      // Ignore
    }
  }, [isAdmin]);

  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditPhone(user.phone || "");
      setEditBio(user.bio || "");
      fetchNotificationStatus();
      fetchPendingCount();
    }
  }, [user, fetchNotificationStatus, fetchPendingCount]);

  // ── Socket real-time notifications ─────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onNotification = (notif: { type: string }) => {
      if (notif.type === "task_reassigned" || notif.type === "task_submission") {
        setHasNewTasks(true);
      }
    };
    const onNewMessage = () => setHasNewMessages(true);

    socket.on("notification", onNotification);
    socket.on("new_message", onNewMessage);

    return () => {
      socket.off("notification", onNotification);
      socket.off("new_message", onNewMessage);
    };
  }, [socket]);

  // ── Nav Items — role-based ─────────────────────────────────────────────────
  const navItems: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    // Leads: admin/manager only — employees never see this
    ...(!isEmployee
      ? [
          { name: "Leads", href: "/dashboard/leads", icon: FileSearch, adminOnly: true },
          {
            name: "Personnel",
            href: "/dashboard/personnel",
            icon: Users,
            hasAlert: isAdmin && pendingCount > 0,
          }
        ]
      : []),
    {
      name: "Tasks",
      href: "/dashboard/tasks",
      icon: CheckSquare,
      hasAlert: hasNewTasks,
    },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    {
      name: "Messages",
      href: "/dashboard/messages",
      icon: MessageSquare,
      hasAlert: hasNewMessages,
    },
    // Admin Only Intelligence Hubs
    ...(isAdmin
      ? [
          { name: "Storage", href: "/dashboard/storage", icon: HardDrive, adminOnly: true },
          { name: "Monitoring", href: "/dashboard/monitoring", icon: Video, adminOnly: true },
          { name: "Activity Logs", href: "/dashboard/logs", icon: ScrollText, adminOnly: true }
        ]
      : []),
  ];

  // ── Profile Update ─────────────────────────────────────────────────────────
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const { data } = await api.put("auth/update-profile", {
        name: editName,
        phone: editPhone,
        bio: editBio,
      });
      updateUser(data);
      setEditOpen(false);
    } catch {
      // Handle silently
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* ── Mobile Header ── */}
      <header className="lg:hidden bg-black text-white px-6 py-4 flex items-center justify-between border-b-8 border-black sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-black text-xs border-2 border-white">C</div>
          <h1 className="font-black text-sm uppercase tracking-widest italic">Mission Control</h1>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 border-4 border-white hover:bg-white hover:text-black transition-all"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 bg-white border-r-8 border-black flex flex-col
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-24" : "w-72"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo Section */}
        <div className={`p-6 border-b-8 border-black bg-black text-white flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white text-black flex items-center justify-center font-black text-xl border-2 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]">M</div>
              <div>
                <h2 className="text-lg font-black tracking-tighter uppercase italic leading-none">Control Hub</h2>
                <p className="text-[8px] text-zinc-500 uppercase tracking-[0.3em] mt-1">Tier 1 Access</p>
              </div>
            </div>
          )}
          {collapsed && <div className="w-10 h-10 bg-white text-black flex items-center justify-center font-black text-xl border-2 border-white">M</div>}
          
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-8 h-8 bg-white text-black border-2 border-black hover:bg-zinc-200 transition-all ml-2"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* User Quick Info */}
        <div className={`p-6 border-b-4 border-black bg-zinc-50 ${collapsed ? "flex justify-center" : ""}`}>
          {!collapsed ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-black text-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black uppercase tracking-tight truncate">{user.name}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{user.role}</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-lg border-2 border-black">
              {user.name?.[0]?.toUpperCase()}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-8 space-y-2 px-4 custom-scrollbar">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  relative flex items-center transition-all group
                  ${collapsed ? "justify-center p-4 border-4" : "px-5 py-4 gap-4 border-4"}
                  ${active
                    ? "bg-black text-white border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] scale-[1.02]"
                    : "text-black border-transparent hover:border-black hover:bg-zinc-50"
                  }
                `}
              >
                <item.icon className={`h-5 w-5 flex-shrink-0 ${active ? "text-white" : "text-black"}`} />
                {!collapsed && (
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] flex-1">
                    {item.name}
                  </span>
                )}
                {/* Alert indicator */}
                {item.hasAlert && (
                  <span className={`
                    flex-shrink-0 h-3 w-3 bg-red-600 animate-pulse
                    ${collapsed ? "absolute top-0 right-0 border-2 border-white" : ""}
                  `} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="mt-auto p-4 border-t-8 border-black space-y-2">
          <button
            onClick={() => setEditOpen(true)}
            className={`w-full flex items-center gap-4 p-4 border-4 border-black hover:bg-black hover:text-white transition-all ${collapsed ? "justify-center" : ""}`}
            title="Update Protocol"
          >
            <Settings className="h-5 w-5" />
            {!collapsed && <span className="text-[10px] font-black uppercase tracking-widest">Profile Hub</span>}
          </button>
          <button
            onClick={() => logout()}
            className={`w-full flex items-center gap-4 p-4 border-4 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="text-[10px] font-black uppercase tracking-widest">Terminate Session</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden relative">
        {/* Background Decorative Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '40px 40px' }}></div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-16 custom-scrollbar relative z-10">
          {children}
          <ScreenShareManager />
        </div>
      </main>

      {/* ── Edit Profile Modal ── */}
      <AnimatePresence>
        {editOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setEditOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white border-4 border-black w-full max-w-md p-8 shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]"
            >
              <button
                onClick={() => setEditOpen(false)}
                className="absolute top-4 right-4"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-2xl font-black uppercase tracking-tighter mb-6">Edit Profile</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="text-xs font-black uppercase block mb-1">Name</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border-2 border-black p-3 text-sm outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase block mb-1">Phone</label>
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full border-2 border-black p-3 text-sm outline-none"
                    placeholder="+91 00000 00000"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase block mb-1">Bio</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={3}
                    className="w-full border-2 border-black p-3 text-sm outline-none resize-none"
                    placeholder="Brief description..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full py-4 bg-black text-white font-black uppercase text-sm border-2 border-black hover:bg-white hover:text-black transition-all disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : "Save Changes"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
