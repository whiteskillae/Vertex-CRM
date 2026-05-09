"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { MonitoringPrompt } from './MonitoringPrompt';
import { Monitor, AlertCircle, ShieldCheck, Zap, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FRAME_RATE = 2; // Low FPS for monitoring stability (frames per second)
const QUALITY = 0.4; // 0.1 to 1.0

export const ScreenShareManager = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isEmployee = user?.role === 'employee';

  // ── Frame Capture & Streaming Logic ────────────────────────────────────────
  const stopStreaming = useCallback(() => {
    console.log('[MONITORING] Terminating stream sequence...');
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    
    streamRef.current = null;
    setIsSharing(false);
    socket?.emit('monitoring:stop');
  }, [socket]);

  const startStreaming = async () => {
    try {
      setError(null);
      console.log('[MONITORING] Initializing screen capture sequence...');
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { max: 1280 },
          height: { max: 720 },
          frameRate: { max: 10 }
        },
        audio: false
      });

      streamRef.current = stream;
      
      // Handle manual stop (user clicks "Stop Sharing" in browser bar)
      stream.getTracks()[0].onended = () => {
        stopStreaming();
      };

      // Set up hidden video element for frame extraction
      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // Set up hidden canvas for frame processing
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }

      setIsSharing(true);
      setHasConsent(true);
      setShowPrompt(false);
      
      socket?.emit('monitoring:start', { userName: user?.name });

      // Frame Extraction Loop (Reliable monitoring method)
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current || !socket || !isConnected) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;
        const context = canvas.getContext('2d');

        if (context && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to compressed WebP for minimal bandwidth usage
          const frame = canvas.toDataURL('image/webp', QUALITY);
          socket.emit('monitoring:frame', { frame });
        }
      }, 1000 / FRAME_RATE);

    } catch (err: any) {
      console.error('[MONITORING] Startup Error:', err);
      setError(err.name === 'NotAllowedError' ? 'Permission denied by user' : 'Failed to initialize uplink');
      setIsSharing(false);
    }
  };

  // ── Activity Tracking ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEmployee || !socket || !isConnected) return;

    let idleTimer: NodeJS.Timeout;
    const IDLE_THRESHOLD = 300000; // 5 minutes

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      socket.emit('activity:update', { status: 'active', metadata: { lastActive: new Date() } });
      idleTimer = setTimeout(() => {
        socket.emit('activity:update', { status: 'idle' });
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
  }, [isEmployee, socket, isConnected]);

  // ── Admin Message Listener ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handleAdminMessage = ({ message }: { message: string }) => {
      setAdminMessage(message);
      setTimeout(() => setAdminMessage(null), 10000);
    };
    socket.on('admin:message', handleAdminMessage);
    return () => { socket.off('admin:message', handleAdminMessage); };
  }, [socket]);

  // Initial prompt for employees
  useEffect(() => {
    if (isEmployee && !hasConsent && !showPrompt) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isEmployee, hasConsent, showPrompt]);

  if (!isEmployee) return null;

  return (
    <>
      <AnimatePresence>
        {showPrompt && (
          <MonitoringPrompt 
            isOpen={showPrompt}
            onAccept={startStreaming} 
            onDecline={() => setShowPrompt(false)} 
          />
        )}

        {adminMessage && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] w-full max-w-lg px-8"
          >
            <div className="bg-zinc-950 border-2 border-brand-indigo p-6 rounded-[2rem] shadow-2xl flex items-start gap-6">
              <div className="p-3 bg-brand-indigo/20 rounded-2xl">
                <ShieldCheck className="w-6 h-6 text-brand-indigo" />
              </div>
              <div className="flex-1">
                <h4 className="text-[10px] font-black text-brand-indigo uppercase tracking-[0.3em] mb-2">Command Center Broadcast</h4>
                <p className="text-sm font-bold text-white leading-relaxed">{adminMessage}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-10 right-10 z-[150] flex flex-col items-end gap-6">
        {error && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-6 py-3 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-2xl flex items-center gap-3 border-2 border-rose-400"
          >
            <AlertCircle className="w-4 h-4" /> {error}
          </motion.div>
        )}

        <button
          onClick={isSharing ? stopStreaming : startStreaming}
          className={`
            group relative p-8 rounded-[2.5rem] transition-all duration-700 shadow-2xl overflow-hidden
            ${isSharing 
              ? 'bg-zinc-950 border-2 border-brand-emerald text-brand-emerald' 
              : 'bg-white border border-zinc-100 text-zinc-400 hover:text-zinc-950'
            }
          `}
        >
          {isSharing && (
            <motion.div 
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-brand-emerald/10"
            />
          )}
          
          <div className="relative z-10 flex items-center gap-6">
            <div className={`p-4 rounded-2xl transition-all duration-500 ${isSharing ? 'bg-brand-emerald/20 rotate-12' : 'bg-zinc-50'}`}>
              {isSharing ? <Zap className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
            </div>
            
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1">
                {isSharing ? 'Uplink Established' : 'Satellite Hub'}
              </p>
              <h4 className="text-xs font-black uppercase tracking-tight italic">
                {isSharing ? 'Live_Transmission' : 'Initiate Mirroring'}
              </h4>
            </div>

            {isSharing && (
              <div className="flex gap-1.5 ml-4">
                {[1, 2, 3].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ height: [4, 12, 4] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1 bg-brand-emerald rounded-full"
                  />
                ))}
              </div>
            )}
          </div>
        </button>

        {isSharing && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 px-6 py-3 bg-zinc-950/80 backdrop-blur-xl rounded-2xl border border-white/5"
          >
            <Activity className="w-4 h-4 text-brand-indigo animate-pulse" />
            <span className="text-[9px] font-black text-white uppercase tracking-widest italic">
              Bitrate: <span className="text-zinc-400">Adaptive</span> // Sync: <span className="text-brand-emerald">Optimal</span>
            </span>
          </motion.div>
        )}
      </div>
    </>
  );
};
