"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Maximize2, 
  Monitor, 
  Activity, 
  ShieldAlert, 
  RefreshCcw,
  Loader2,
  Zap,
  Globe
} from 'lucide-react';

interface LiveStreamViewerProps {
  userId: string;
  userName: string;
}

export const LiveStreamViewer: React.FC<LiveStreamViewerProps> = ({ userId, userName }) => {
  const { socket } = useSocket();
  const [frame, setFrame] = useState<string | null>(null);
  const [status, setStatus] = useState<'connecting' | 'streaming' | 'offline'>('connecting');
  const [latency, setLatency] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timeout = setTimeout(() => {
      if (status === 'connecting') setStatus('offline');
    }, 10000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!socket || !userId) return;

    const handleFrame = (data: { userId: string, frame: string, timestamp: number }) => {
      if (data.userId === userId) {
        setFrame(data.frame);
        setStatus('streaming');
        setLatency(Date.now() - data.timestamp);
      }
    };

    socket.on('monitoring:frame', handleFrame);
    return () => {
      socket.off('monitoring:frame', handleFrame);
    };
  }, [socket, userId]);

  const toggleFullScreen = () => {
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

  if (!mounted) return <div className="aspect-video bg-zinc-950 rounded-2xl" />;

  return (
    <div 
      ref={containerRef} 
      className={`
        relative bg-black group/viewer overflow-hidden transition-all duration-700
        ${isFullscreen ? 'fixed inset-0 z-[1000]' : 'aspect-video w-full rounded-2xl border border-zinc-900 shadow-2xl'}
      `}
    >
      {/* Main Viewport */}
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {status === 'connecting' && (
            <motion.div 
              key="connecting"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 z-20"
            >
              <Loader2 className="w-8 h-8 animate-spin text-primary opacity-30" />
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Syncing Tunnel...</p>
            </motion.div>
          )}
          
          {status === 'offline' && (
            <motion.div 
              key="offline"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6 text-center px-8 z-20"
            >
              <div className="w-16 h-16 bg-destructive/10 rounded-3xl flex items-center justify-center border border-destructive/20">
                <ShieldAlert className="w-8 h-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-tight">Signal Terminated</h3>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest max-w-[200px]">
                  Target node unreachable or transmission protocol failed.
                </p>
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-all shadow-xl"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                Reconnect
              </button>
            </motion.div>
          )}

          {frame && status === 'streaming' && (
            <motion.img
              key="frame"
              src={frame}
              alt="Live Feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full object-contain"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Modern HUD - Appears on Hover */}
      <div className="absolute inset-0 z-30 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/viewer:opacity-100 transition-all duration-500">
        <div className="absolute bottom-0 left-0 right-0 p-8 flex items-center justify-between pointer-events-auto">
          {/* Telemetry Badge */}
          <div className="flex items-center gap-4 bg-zinc-900/90 backdrop-blur-xl border border-white/10 px-5 py-2.5 rounded-2xl">
            <div className={`w-2 h-2 rounded-full ${status === 'streaming' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-600'} animate-pulse`} />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">{userName}</span>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[9px] text-zinc-400 font-medium tabular-nums flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> {latency}ms
                </span>
                <span className="text-[9px] text-zinc-400 font-medium flex items-center gap-1.5">
                  <Globe className="w-3 h-3" /> Secure
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleFullScreen}
              className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center text-white transition-all active:scale-95"
            >
              <Maximize2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Overlay Decoration */}
      <div className="absolute inset-0 border border-white/5 pointer-events-none z-10" />
    </div>
  );
};
