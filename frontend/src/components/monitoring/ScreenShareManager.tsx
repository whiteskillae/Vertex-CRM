"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { MonitoringPrompt } from './MonitoringPrompt';
import { Monitor, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ScreenShareManager = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  const isEmployee = user?.role === 'employee';

  useEffect(() => {
    if (isEmployee && !isSharing) {
      const consent = localStorage.getItem(`screen_share_consent_${user?._id}`);
      if (!consent) {
        setShowPrompt(true);
      } else if (consent === 'accepted') {
        startSharing();
      }
    }
  }, [user, isEmployee]);

  const startSharing = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { max: 1280 },
          height: { max: 720 },
          frameRate: { max: 15 }
        },
        audio: false
      });

      streamRef.current = stream;
      setIsSharing(true);
      localStorage.setItem(`screen_share_consent_${user?._id}`, 'accepted');
      setShowPrompt(false);

      socket?.emit('screen:start', { userId: user?._id });

      // Handle stream end (user clicks "Stop sharing" in browser UI)
      stream.getVideoTracks()[0].onended = () => {
        stopSharing();
      };

    } catch (err: any) {
      console.error('Error sharing screen:', err);
      setError('Permission denied or failed to start stream.');
      setIsSharing(false);
    }
  };

  const stopSharing = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsSharing(false);
    socket?.emit('screen:stop', { userId: user?._id });
    
    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
  };

  const handleDecline = () => {
    localStorage.setItem(`screen_share_consent_${user?._id}`, 'declined');
    setShowPrompt(false);
    socket?.emit('activity:update', { userId: user?._id, status: 'sharing_declined' });
  };

  // Activity Tracking Logic
  useEffect(() => {
    if (!isSharing) return;

    let idleTimer: NodeJS.Timeout;
    const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      socket?.emit('activity:update', { userId: user?._id, status: 'active' });
      idleTimer = setTimeout(() => {
        socket?.emit('activity:update', { userId: user?._id, status: 'idle' });
      }, IDLE_THRESHOLD);
    };

    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);

    resetIdleTimer();

    return () => {
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      clearTimeout(idleTimer);
    };
  }, [isSharing, user, socket]);

  // WebRTC Signaling Logic
  useEffect(() => {
    if (!socket || !isSharing) return;

    const createPeerConnection = (adminId: string) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      streamRef.current?.getTracks().forEach(track => {
        pc.addTrack(track, streamRef.current!);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('screen:candidate', { to: adminId, candidate: event.candidate });
        }
      };

      peerConnections.current.set(adminId, pc);
      return pc;
    };

    socket.on('screen:offer', async ({ from, offer }) => {
      let pc = peerConnections.current.get(from);
      if (!pc) pc = createPeerConnection(from);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.emit('screen:answer', { to: from, answer });
    });

    socket.on('screen:candidate', async ({ from, candidate }) => {
      const pc = peerConnections.current.get(from);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on('admin:message', ({ message }) => {
      setAdminMessage(message);
      setTimeout(() => setAdminMessage(null), 10000);
    });

    // Admin is requesting a stream
    socket.on('screen:request', async ({ from }) => {
      if (!isSharing || !streamRef.current) return;

      const pc = createPeerConnection(from);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket.emit('screen:offer', { to: from, offer });
    });

    return () => {
      socket.off('screen:offer');
      socket.off('screen:candidate');
      socket.off('admin:message');
      socket.off('screen:request');
    };
  }, [socket, isSharing]);

  if (!isEmployee) return null;

  return (
    <>
      <MonitoringPrompt 
        isOpen={showPrompt} 
        onAccept={startSharing} 
        onDecline={handleDecline} 
      />
      
      {/* Persistent Tracking Banner (Prominent "SRM App" style) */}
      <AnimatePresence>
        {isSharing && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[2000] bg-red-600 text-white flex items-center justify-center gap-6 py-2 border-b-4 border-black shadow-[0px_4px_10px_rgba(0,0,0,0.3)]"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white rounded-full animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Monitoring Active</span>
            </div>
            <div className="h-4 w-px bg-white/30" />
            <p className="text-[9px] font-bold uppercase tracking-widest italic opacity-90">
              Your screen is being shared with Mission Control for quality & compliance
            </p>
            <div className="h-4 w-px bg-white/30" />
            <div className="flex items-center gap-2">
              <Monitor className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase">Secure Protocol v2.0</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Message Notification */}
      <AnimatePresence>
        {adminMessage && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed top-24 right-6 z-[600] w-80 bg-black border-4 border-white p-6 shadow-[20px_20px_0px_0px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Admin Command</span>
            </div>
            <p className="text-xs font-bold text-white uppercase tracking-tight leading-relaxed mb-6">
              {adminMessage}
            </p>
            <button 
              onClick={() => setAdminMessage(null)}
              className="w-full py-2 bg-white text-black font-black uppercase text-[10px] border-2 border-black hover:bg-zinc-200 transition-all"
            >
              Acknowledge
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Small Indicator */}
      <AnimatePresence>
        {!isSharing && localStorage.getItem(`screen_share_consent_${user?._id}`) === 'accepted' && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-6 right-6 z-[500] flex items-center gap-3 bg-red-600 text-white px-5 py-3 border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,0.5)] cursor-pointer"
            onClick={startSharing}
          >
            <Monitor className="w-5 h-5 animate-bounce" />
            <span className="text-[10px] font-black uppercase tracking-widest">Resume Session Monitoring</span>
          </motion.div>
        )}
        {isSharing && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-6 right-6 z-[500] flex items-center gap-3 bg-black text-white px-5 py-3 border-4 border-white shadow-[10px_10px_0px_0px_rgba(0,0,0,0.5)]"
          >
            <div className="relative">
              <Monitor className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse border border-white"></span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Tracking Active</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-6 right-6 z-[500] flex items-center gap-3 bg-red-600 text-white px-5 py-3 border-4 border-black"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
            <button onClick={startSharing} className="underline text-[10px] font-black uppercase ml-2">Retry</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
