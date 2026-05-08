"use client";

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useSocket } from '@/context/SocketContext';

export interface Notification {
  _id: string;
  type: 'task_submission' | 'task_reassigned' | 'new_message' | 'announcement' | 'general';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('notifications');
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      // Re-calculate unread count if the deleted one was unread
      const deletedWasUnread = notifications.find(n => n._id === id && !n.isRead);
      if (deletedWasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notif: Notification) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Play subtle notification sound if enabled
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {}); // Browser might block auto-play
      } catch (e) {}
    };

    socket.on('notification', handleNewNotification);

    return () => {
      socket.off('notification', handleNewNotification);
    };
  }, [socket]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllRead,
    deleteNotification,
    refresh: fetchNotifications
  };
};
