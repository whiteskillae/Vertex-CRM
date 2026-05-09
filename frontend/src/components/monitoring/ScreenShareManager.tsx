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
  const [hasConsent, setHasConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const isEmployee = user?.role === 'employee';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const consent = localStorage.getItem(`screen_share_consent_${user?._id}`);
      setHasConsent(consent === 'accepted');
      
      if (isEmployee && !isSharing) {
        if (!consent) {
          setShowPrompt(true);
        } else if (consent === 'accepted') {
          startSharing();
        }
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
      setHasConsent(true);
      localStorage.setItem(`screen_share_consent_${user?._id}`, 'accepted');
      setShowPrompt(false);

      socket?.emit('screen:start', { userId: user?._id, userName: user?.name });

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
    setHasConsent(false);
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

    const createPeerConnection = (adminId: string, viewerId: string) => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ]
      });

      const candidateQueue: RTCIceCandidateInit[] = [];

      streamRef.current?.getTracks().forEach(track => {
        pc.addTrack(track, streamRef.current!);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('screen:candidate', { to: adminId, viewerId, candidate: event.candidate });
        }
      };

      const key = `${adminId}-${viewerId}`;
      peerConnections.current.set(key, pc);

      return { pc, candidateQueue };
    };

    socket.on('admin:message', ({ message }) => {
      setAdminMessage(message);
      setTimeout(() => setAdminMessage(null), 10000);
    });

    // Admin is requesting a stream
    socket.on('screen:request', async ({ from, viewerId }) => {
      if (!isSharing || !streamRef.current) return;

      const { pc, candidateQueue } = createPeerConnection(from, viewerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket.emit('screen:offer', { to: from, viewerId, offer });

      // Save candidate queue in a weak map or similar if needed, 
      // but here we can just attach it to the PC object or use a mapping.
      (pc as any)._candidateQueue = candidateQueue;
    });

    socket.on('screen:answer', async ({ from, viewerId, answer }) => {
      const key = `${from}-${viewerId}`;
      const pc = peerConnections.current.get(key);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        const queue = (pc as any)._candidateQueue;
        if (queue) {
          while (queue.length > 0) {
            const cand = queue.shift();
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(e => console.error(e));
          }
        }
      }
    });

    socket.on('screen:candidate', async ({ from, viewerId, candidate }) => {
      const key = `${from}-${viewerId}`;
      const pc = peerConnections.current.get(key);
      if (pc) {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e));
        } else {
          (pc as any)._candidateQueue?.push(candidate);
        }
      }
    });

    return () => {
      socket.off('screen:offer');
      socket.off('screen:answer');
      socket.off('screen:candidate');
      socket.off('admin:message');
      socket.off('screen:request');
    };
  }, [socket, isSharing]);

  // Cleanup on Unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      if (socket && user) {
        socket.emit('screen:stop', { userId: user._id });
      }
    };
  }, [socket, user]);

  if (!isEmployee) return null;

  return (
    <>
      <MonitoringPrompt 
        isOpen={showPrompt} 
        onAccept={startSharing} 
        onDecline={handleDecline} 
      />
      
      {/* Persistent Tracking Banner */}
      <AnimatePresence>
        {isSharing && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[2000] bg-brand-rose text-white flex items-center justify-center gap-8 py-3 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse shadow-sm" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Monitoring Protocol Active</span>
            </div>
            <div className="h-5 w-px bg-white/20" />
            <p className="text-[10px] font-bold opacity-90 tracking-tight">
              Screen stream synchronized with Mission Control
            </p>
            <div className="h-5 w-px bg-white/20" />
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Secure Link 2.4</span>
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
            className="fixed top-24 right-8 z-[600] w-96 bg-white border border-zinc-100 rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-brand-rose/10 text-brand-rose flex items-center justify-center rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-zinc-900">Admin Dispatch</span>
            </div>
            <p className="text-sm font-bold text-zinc-600 leading-relaxed mb-8">
              {adminMessage}
            </p>
            <button 
              onClick={() => setAdminMessage(null)}
              className="w-full py-4 bg-black text-white font-bold rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10"
            >
              Acknowledge Dispatch
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Small Indicator */}
      <AnimatePresence>
        {!isSharing && hasConsent && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-10 right-10 z-[500] flex items-center gap-4 bg-brand-rose text-white px-8 py-4 rounded-3xl shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all"
            onClick={startSharing}
          >
            <Monitor className="w-6 h-6 animate-bounce" />
            <span className="text-xs font-black uppercase tracking-[0.1em]">Resume Monitoring</span>
          </motion.div>
        )}
        {isSharing && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-10 right-10 z-[500] flex items-center gap-4 bg-black text-white px-8 py-4 rounded-3xl shadow-2xl"
          >
            <div className="relative">
              <Monitor className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-emerald rounded-full animate-pulse border-2 border-black shadow-sm"></span>
            </div>
            <span className="text-xs font-black uppercase tracking-[0.1em]">Session Encrypted</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-10 right-10 z-[500] flex items-center gap-4 bg-white border border-brand-rose/20 text-brand-rose px-8 py-4 rounded-3xl shadow-2xl"
          >
            <AlertCircle className="w-6 h-6" />
            <span className="text-xs font-black uppercase tracking-widest">{error}</span>
            <button onClick={startSharing} className="underline text-xs font-bold ml-4">Retry Link</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
