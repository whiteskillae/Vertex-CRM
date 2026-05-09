"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import { 
  Loader2, Maximize2, ShieldAlert, Clock, 
  RefreshCcw, Play, Pause, Activity, ShieldCheck,
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
  const [lastFrameTime, setLastFrameTime] = useState<number>(Date.now());
  
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Subscription & Frame Handling ──────────────────────────────────────────
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('monitoring:subscribe', userId);

    const handleFrame = (data: { frame: string }) => {
      setFrame(data.frame);
      setStatus('streaming');
      setLastFrameTime(Date.now());
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setStatus('offline');
      }, 5000);
    };

    socket.on('monitoring:frame', handleFrame);

    // Sync fullscreen state with browser events (Fixes ESC key issue)
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);

    return () => {
      socket.emit('monitoring:unsubscribe', userId);
      socket.off('monitoring:frame', handleFrame);
      document.removeEventListener('fullscreenchange', handleFsChange);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [socket, isConnected, userId]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Fullscreen Error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const getWorkingTime = () => {
    const elapsed = Math.floor((Date.now() - lastFrameTime) / 1000);
    return elapsed > 2 ? `${elapsed}s ago` : 'Live';
  };

  return (
    <div 
      ref={containerRef} 
      className={`
        relative bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-900 shadow-2xl transition-all duration-700
        ${isFullscreen ? 'fixed inset-0 z-[1000] rounded-none' : 'aspect-video w-full'}
      `}
    >
      {/* Frame Viewport */}

      {/* Main Viewport */}
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
        <AnimatePresence mode="wait">
          {status === 'connecting' && (
            <motion.div 
              key="connecting"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 text-white z-20"
            >
              <Loader2 className="w-10 h-10 animate-spin text-brand-indigo opacity-30" />
              <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-zinc-500">Syncing Tunnel...</p>
            </motion.div>
          )}
          
          {status === 'offline' && (
            <motion.div 
              key="offline"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5 text-white z-20 max-w-xs text-center px-6"
            >
              <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <ShieldAlert className="w-8 h-8 text-rose-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-tight italic mb-1">Signal Terminated</h3>
                <p className="text-[9px] font-medium text-zinc-500 uppercase tracking-widest leading-relaxed">
                  Target node disconnected or session expired.
                </p>
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="flex items-center gap-2 px-6 py-3 bg-white text-black text-[9px] font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-all shadow-xl"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                Reconnect
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {frame && status === 'streaming' && (
          <motion.img
            src={frame}
            alt="Feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full object-contain"
          />
        )}
        
        {/* Subtle Scanline Effect */}
        {status === 'streaming' && (
          <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.005),rgba(0,0,255,0.01))] bg-[length:100%_2px,3px_100%] opacity-30" />
        )}
      </div>

      {/* Subtle Scanline Effect */}
      {status === 'streaming' && (
        <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.005),rgba(0,0,255,0.01))] bg-[length:100%_2px,3px_100%] opacity-20" />
      )}

      {/* Floating Fullscreen (Only when not in grid) */}
      {isFullscreen && (
        <button 
          onClick={toggleFullscreen}
          className="absolute bottom-10 right-10 p-5 bg-white text-black rounded-2xl z-50 shadow-2xl hover:bg-zinc-100 transition-all"
        >
          <Minimize2 className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};
