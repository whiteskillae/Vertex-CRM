"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { MonitoringPrompt } from './MonitoringPrompt';
import { Monitor, AlertCircle, ShieldCheck, Zap, Activity, StopCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FRAME_RATE = 2; 
const QUALITY = 0.35; 

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

  const stopStreaming = useCallback(() => {
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
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { max: 1280 }, height: { max: 720 }, frameRate: { max: 10 } },
        audio: false
      });

      streamRef.current = stream;
      stream.getTracks()[0].onended = () => stopStreaming();

      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      if (!canvasRef.current) canvasRef.current = document.createElement('canvas');

      setIsSharing(true);
      setHasConsent(true);
      setShowPrompt(false);
      socket?.emit('monitoring:start', { userName: user?.name });

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
          const frame = canvas.toDataURL('image/webp', QUALITY);
          socket.emit('monitoring:frame', { frame });
        }
      }, 1000 / FRAME_RATE);

    } catch (err: any) {
      setError(err.name === 'NotAllowedError' ? 'Permission denied' : 'Startup failed');
      setIsSharing(false);
    }
  };

  useEffect(() => {
    if (!isEmployee || !socket || !isConnected) return;
    let idleTimer: NodeJS.Timeout;
    const IDLE_THRESHOLD = 300000;
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      socket.emit('activity:update', { status: 'active', metadata: { lastActive: new Date() } });
      idleTimer = setTimeout(() => socket.emit('activity:update', { status: 'idle' }), IDLE_THRESHOLD);
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

  useEffect(() => {
    if (!socket) return;
    const handleAdminMessage = ({ message }: { message: string }) => {
      setAdminMessage(message);
      setTimeout(() => setAdminMessage(null), 10000);
    };
    socket.on('admin:message', handleAdminMessage);
    return () => { socket.off('admin:message', handleAdminMessage); };
  }, [socket]);

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
            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 right-10 z-[200] w-full max-w-sm px-6"
          >
            <div className="bg-zinc-950 border border-brand-indigo/30 p-5 rounded-3xl shadow-2xl flex items-start gap-4 backdrop-blur-xl">
              <ShieldCheck className="w-5 h-5 text-brand-indigo mt-1" />
              <p className="text-[11px] font-medium text-white leading-relaxed">{adminMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-8 right-8 z-[150] flex flex-col items-end gap-3">
        <AnimatePresence>
          {isSharing && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-3 px-4 py-2 bg-zinc-950/90 backdrop-blur-xl rounded-full border border-emerald-500/30 shadow-xl"
            >
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-white uppercase tracking-widest italic">Live_Streaming</span>
              <div className="h-3 w-[1px] bg-white/10" />
              <button onClick={stopStreaming} className="text-[9px] font-bold text-zinc-400 hover:text-rose-500 transition-colors uppercase">Stop</button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={isSharing ? undefined : startStreaming}
          disabled={isSharing}
          className={`
            group relative flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-500 shadow-xl overflow-hidden
            ${isSharing 
              ? 'bg-zinc-950 border border-white/5 text-zinc-500' 
              : 'bg-white border border-zinc-100 text-zinc-900 hover:border-zinc-950 hover:shadow-2xl'
            }
          `}
        >
          <div className={`p-2.5 rounded-xl transition-all duration-500 ${isSharing ? 'bg-zinc-900' : 'bg-zinc-50'}`}>
            {isSharing ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <Monitor className="w-4 h-4" />}
          </div>
          
          <div className="text-left">
            <p className="text-[9px] font-bold uppercase tracking-widest leading-none mb-1">
              {isSharing ? 'Monitoring Active' : 'Screen Share'}
            </p>
            <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-tight">
              {isSharing ? 'Secure Uplink' : 'Start Mirroring'}
            </h4>
          </div>
        </button>

        {error && (
          <div className="px-4 py-2 bg-rose-500 text-white text-[8px] font-bold uppercase tracking-widest rounded-full shadow-lg flex items-center gap-2">
            <AlertCircle className="w-3 h-3" /> {error}
          </div>
        )}
      </div>
    </>
  );
};
