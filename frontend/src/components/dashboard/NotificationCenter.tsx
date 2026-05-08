"use client";

import { useState } from "react";
import { Bell, X, Check, Trash2, ExternalLink, Inbox } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllRead, deleteNotification } = useNotifications();

  const toggleOpen = () => {
    if (!isOpen && unreadCount > 0) {
      markAllRead();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      {/* Bell Trigger */}
      <button
        onClick={toggleOpen}
        className={`
          relative p-3 border-4 border-black transition-all
          ${isOpen ? "bg-black text-white" : "bg-white text-black hover:bg-black hover:text-white"}
        `}
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-3 -right-3 min-w-[24px] h-6 px-1 bg-red-600 text-white text-[10px] font-black flex items-center justify-center border-4 border-white shadow-lg animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile closing */}
            <div 
              className="fixed inset-0 z-[100] lg:hidden" 
              onClick={() => setIsOpen(false)} 
            />
            
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-screen max-w-[350px] sm:max-w-[450px] bg-white border-8 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] z-[110] overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b-8 border-black bg-black text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Inbox className="h-6 w-6 text-yellow-400" />
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tighter italic leading-none">Notifications</h3>
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-1">
                      {unreadCount} UNREAD SIGNALS
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => markAllRead()}
                    title="Mark all as read"
                    className="p-2 border-2 border-zinc-700 hover:bg-white hover:text-black transition-all"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 border-2 border-zinc-700 hover:bg-white hover:text-black transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                {notifications.length > 0 ? (
                  <div className="divide-y-4 divide-black/5">
                    {notifications.map((notif) => (
                      <div 
                        key={notif._id}
                        className={`
                          p-6 transition-colors relative group
                          ${notif.isRead ? "bg-white opacity-60" : "bg-zinc-50"}
                        `}
                      >
                        {!notif.isRead && (
                          <div className="absolute left-0 top-0 bottom-0 w-2 bg-red-600" />
                        )}
                        
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black uppercase tracking-tight mb-1 truncate">
                              {notif.title}
                            </h4>
                            <p className="text-xs font-bold text-zinc-600 leading-tight mb-3">
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-4">
                              <span className="text-[9px] font-black text-zinc-400 uppercase">
                                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                              </span>
                              {notif.link && (
                                <Link 
                                  href={notif.link}
                                  onClick={() => {
                                    setIsOpen(false);
                                    markAsRead(notif._id);
                                  }}
                                  className="text-[9px] font-black uppercase flex items-center gap-1 text-black underline underline-offset-2 hover:bg-black hover:text-white px-1"
                                >
                                  Execute <ExternalLink className="h-2 w-2" />
                                </Link>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!notif.isRead && (
                              <button 
                                onClick={() => markAsRead(notif._id)}
                                className="p-2 border-2 border-black hover:bg-black hover:text-white transition-all bg-white"
                                title="Mark as read"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            )}
                            <button 
                              onClick={() => deleteNotification(notif._id)}
                              className="p-2 border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all bg-white"
                              title="Purge"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-20 text-center">
                    <Inbox className="h-12 w-12 text-zinc-200 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-zinc-300 uppercase italic tracking-widest">
                      Zero Transmission Signals Detected
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t-8 border-black bg-zinc-50">
                <Link 
                  href="/dashboard/logs"
                  onClick={() => setIsOpen(false)}
                  className="block w-full py-3 bg-white border-4 border-black text-center text-[10px] font-black uppercase tracking-[0.3em] hover:bg-black hover:text-white transition-all"
                >
                  View Activity Archives
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
