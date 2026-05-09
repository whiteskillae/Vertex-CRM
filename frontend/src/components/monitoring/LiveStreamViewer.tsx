"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import { 
  Loader2, Maximize2, ShieldAlert, Clock, 
  RefreshCcw, Play, Pause, MessageSquare, 
  HardDrive, Activity, User, ShieldCheck,
  Minimize2, Zap, Wifi, WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveStreamViewerProps {
  userId: string;
  userName: string;
}

export const LiveStreamViewer: React.FC<LiveStreamViewerProps> = ({ userId, userName }) => {
  const { socket, isConnected } = useSocket();
  const [frame, setFrame] = useState<string | null>(null);
  const [status, setStatus] = useState<'connecting' | 'streaming' | 'offline'>('connecting');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastFrameTime, setLastFrameTime] = useState<number>(Date.now());
  
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Subscription & Frame Handling ──────────────────────────────────────────
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log(`[VIEWER] Subscribing to node: ${userId}`);
    socket.emit('monitoring:subscribe', userId);

    const handleFrame = (data: { frame: string }) => {
      if (isPaused) return;
      setFrame(data.frame);
      setStatus('streaming');
      setLastFrameTime(Date.now());
      
      // Clear offline timeout if we get a frame
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setStatus('offline');
      }, 5000); // If no frame for 5s, consider offline
    };

    socket.on('monitoring:frame', handleFrame);

    return () => {
      console.log(`[VIEWER] Unsubscribing from node: ${userId}`);
      socket.emit('monitoring:unsubscribe', userId);
      socket.off('monitoring:frame', handleFrame);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [socket, isConnected, userId, isPaused]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getWorkingTime = () => {
    const elapsed = Math.floor((Date.now() - lastFrameTime) / 1000);
    return elapsed > 0 ? `${elapsed}s ago` : 'Live';
  };

  return (
    <div 
      ref={containerRef} 
      className={`
        relative bg-zinc-950 rounded-[2.5rem] overflow-hidden border-2 border-zinc-900 shadow-2xl transition-all duration-700
        ${isFullscreen ? 'fixed inset-0 z-[1000] rounded-none' : 'aspect-video w-full'}
      `}
    >
      {/* HUD - Top Bar */}
      <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-30 pointer-events-none">
        <div className="flex items-center gap-6 bg-zinc-900/80 backdrop-blur-2xl border border-white/5 p-4 rounded-[2rem] pointer-events-auto shadow-2xl">
          <div className="relative">
            <div className="w-12 h-12 bg-zinc-800 text-white flex items-center justify-center rounded-2xl font-black text-lg border border-white/5 uppercase italic">
              {userName[0]}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-4 border-zinc-900 rounded-full ${status === 'streaming' ? 'bg-brand-emerald' : 'bg-rose-500'} shadow-xl`} />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] leading-none mb-2">Target Node</p>
            <div className="flex items-center gap-3">
              <h4 className="text-sm font-black text-white uppercase tracking-tight italic">{userName}</h4>
              <div className="h-3 w-[1px] bg-white/10" />
              <div className="flex items-center gap-2">
                {status === 'streaming' ? <Wifi className="w-3 h-3 text-brand-emerald" /> : <WifiOff className="w-3 h-3 text-rose-500" />}
                <span className={`text-[10px] font-black uppercase tracking-widest ${status === 'streaming' ? 'text-brand-emerald' : 'text-rose-500'}`}>
                  {status === 'streaming' ? 'Sync_Active' : 'Link_Lost'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pointer-events-auto">
          <div className="bg-zinc-900/80 backdrop-blur-2xl border border-white/5 px-6 py-4 rounded-[1.5rem] flex items-center gap-4 text-white shadow-2xl">
            <Clock className="w-4 h-4 text-zinc-500" />
            <span className="text-xs font-black font-mono text-brand-emerald uppercase tracking-widest">{getWorkingTime()}</span>
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
        <AnimatePresence mode="wait">
          {status === 'connecting' && (
            <motion.div 
              key="connecting"
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center gap-6 text-white z-20"
            >
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-brand-indigo opacity-20" />
                <Zap className="w-8 h-8 text-brand-indigo absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-brand-indigo mb-2">Initializing Uplink</p>
                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest italic">Authenticating Secure Handshake...</p>
              </div>
            </motion.div>
          )}
          
          {status === 'offline' && (
            <motion.div 
              key="offline"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6 text-white z-20 max-w-sm text-center px-10"
            >
              <div className="p-6 bg-rose-500/10 rounded-[2rem] border border-rose-500/20 mb-4">
                <ShieldAlert className="w-12 h-12 text-rose-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tighter italic mb-2">Signal Terminated</h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
                  The target node has ceased transmission or the secure tunnel has collapsed.
                </p>
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="group flex items-center gap-3 mt-6 px-10 py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-brand-indigo hover:text-white transition-all duration-500 shadow-2xl"
              >
                <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-all duration-700" />
                Re-Sync Uplink
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {frame && status === 'streaming' && (
          <motion.img
            src={frame}
            alt="Target Node Feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`w-full h-full object-contain transition-all duration-500 ${isPaused ? 'grayscale blur-sm opacity-50' : 'opacity-100'}`}
          />
        )}
        
        {/* Playback Overlay Controls */}
        <div className="absolute inset-0 bg-zinc-950/40 opacity-0 hover:opacity-100 transition-all duration-500 flex items-center justify-center gap-12 z-40">
          <button 
            onClick={() => setIsPaused(!isPaused)} 
            className="p-8 bg-white text-black rounded-[2rem] shadow-2xl hover:scale-110 active:scale-90 transition-all duration-500 group"
          >
            {isPaused ? (
              <Play className="w-10 h-10 fill-current group-hover:text-brand-emerald transition-colors" />
            ) : (
              <Pause className="w-10 h-10 fill-current group-hover:text-brand-rose transition-colors" />
            )}
          </button>
        </div>

        {/* Scanline Effect */}
        {status === 'streaming' && !isPaused && (
          <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%] opacity-20" />
        )}
      </div>

      {/* HUD - Bottom Bar */}
      <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between z-30 pointer-events-none">
        <div className="flex gap-4 pointer-events-auto">
          <div className="bg-zinc-900/80 backdrop-blur-2xl border border-white/5 p-4 rounded-[1.5rem] flex items-center gap-4 shadow-2xl">
            <Activity className="w-4 h-4 text-brand-emerald" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Network Load</span>
              <span className="text-[10px] font-black text-white uppercase italic tracking-tighter">Adaptive Sync_v4.2</span>
            </div>
          </div>
          <div className="hidden sm:flex bg-zinc-900/80 backdrop-blur-2xl border border-white/5 p-4 rounded-[1.5rem] items-center gap-4 shadow-2xl">
            <ShieldCheck className="w-4 h-4 text-brand-indigo" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Security</span>
              <span className="text-[10px] font-black text-white uppercase italic tracking-tighter">AES-256 Tunnel</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pointer-events-auto">
          <button 
            onClick={toggleFullscreen}
            className="p-5 bg-zinc-900/80 backdrop-blur-2xl border border-white/5 text-white rounded-[1.5rem] hover:bg-white hover:text-black transition-all duration-500 shadow-2xl"
          >
            {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
}
