"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/context/SocketContext';
import { 
  Loader2, Maximize2, ShieldAlert, Clock, 
  RefreshCcw, Play, Pause, MessageSquare, 
  HardDrive, Activity, User, ShieldCheck,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveStreamViewerProps {
  userId: string;
  userName: string;
}

export const LiveStreamViewer: React.FC<LiveStreamViewerProps> = ({ userId, userName }) => {
  const { socket } = useSocket();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState<'connecting' | 'streaming' | 'offline'>('connecting');
  const [sessionData, setSessionData] = useState<{startTime: string, lastReload: string, resolution: string, bitrate: string} | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!socket || !socket.id) return;
    
    const viewerId = socket.id;

    const startWatching = async () => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      const candidateQueue: RTCIceCandidateInit[] = [];

      pc.ontrack = (event) => {
        console.log('Stream track received:', event.streams[0]);
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          // Force play safely
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => {
              if (e.name !== 'AbortError') {
                console.error('Video play failed:', e);
              }
            });
          }
          setStatus('streaming');
          setSessionData({
            startTime: new Date().toISOString(),
            lastReload: new Date().toLocaleTimeString(),
            resolution: '1920x1080',
            bitrate: '2.5 Mbps'
          });
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('screen:candidate', { to: userId, viewerId, candidate: event.candidate });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          setStatus('offline');
        }
      };

      pcRef.current = pc;
      
      socket.on('screen:offer', async (data) => {
        if (data.from === userId && data.viewerId === viewerId && pcRef.current) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            socket.emit('screen:answer', { to: userId, viewerId, answer });
            
            while (candidateQueue.length > 0) {
              const cand = candidateQueue.shift();
              if (cand) await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
            }
          } catch (e) {
            console.error('Error handling offer:', e);
          }
        }
      });

      socket.on('screen:candidate', async (data) => {
        if (data.from === userId && data.viewerId === viewerId && pcRef.current) {
          if (pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(e => console.error(e));
          } else {
            candidateQueue.push(data.candidate);
          }
        }
      });

    socket.emit('screen:request', { to: userId, viewerId });

    const handleStatusUpdate = (data: { userId: string, status: string }) => {
      if (data.userId === userId && (data.status === 'online' || data.status === 'offline')) {
        setStatus('offline');
        pcRef.current?.close();
      }
    };

    socket.on('monitoring:update', handleStatusUpdate);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
      if (typeof document !== 'undefined') {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
      }

    return () => {
      pcRef.current?.close();
      socket.off('screen:offer');
      socket.off('screen:candidate');
      socket.off('monitoring:update', handleStatusUpdate);
      if (typeof document !== 'undefined') {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      }
    };
  }, [socket, userId]);

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  const getWorkingTime = () => {
    if (!sessionData) return '00:00:00';
    const start = new Date(sessionData.startTime).getTime();
    const now = new Date().getTime();
    const diff = Math.floor((now - start) / 1000);
    const h = Math.floor(diff / 3600).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative bg-black border-8 border-black overflow-hidden group flex flex-col transition-all duration-500 ${isFullscreen ? 'w-screen h-screen border-0' : 'aspect-video shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]'}`}
    >
      {/* Top Overlay Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-30 pointer-events-none">
        <div className="flex items-center gap-4 bg-black/80 backdrop-blur-xl border-4 border-black p-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] pointer-events-auto">
          <div className="relative">
            <div className="w-10 h-10 bg-white text-black flex items-center justify-center border-2 border-black font-black">
              {userName[0].toUpperCase()}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-black rounded-full ${status === 'streaming' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-white leading-none mb-1">{userName}</p>
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-green-500" />
              <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Signal: Stable | 1080p</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pointer-events-auto">
          <div className="bg-black/80 backdrop-blur-xl border-4 border-black p-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4 text-white">
            <div className="flex flex-col items-end">
              <span className="text-[7px] font-black uppercase text-zinc-500 tracking-[0.2em]">Session Duration</span>
              <span className="text-xs font-black font-mono text-green-500">{getWorkingTime()}</span>
            </div>
            <Clock className="w-5 h-5 text-white/50" />
          </div>
        </div>
      </div>

      {/* Main Stream Area */}
      <div className="relative flex-1 bg-zinc-950 flex items-center justify-center overflow-hidden">
        <AnimatePresence>
          {status === 'connecting' && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-white z-20 bg-zinc-950/80"
            >
              <div className="w-20 h-20 border-8 border-white border-t-transparent rounded-full animate-spin mb-6" />
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Establishing Secure Link</h3>
              <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.4em] mt-2">Bypassing Node Firewalls...</p>
            </motion.div>
          )}
          
          {status === 'offline' && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-zinc-500 z-20"
            >
              <ShieldAlert className="w-24 h-24 mb-6 opacity-20" />
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Signal Terminated</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] mt-2">Remote Node Disconnected</p>
              <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 border-4 border-white text-white text-[10px] font-black uppercase hover:bg-white hover:text-black transition-all">Re-sync Connection</button>
            </motion.div>
          )}
        </AnimatePresence>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-contain transition-all duration-700 ${status === 'streaming' && !isPaused ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        />

        {/* Video Controls Hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-10 z-10">
          <button onClick={() => setIsPaused(!isPaused)} className="w-20 h-20 bg-white text-black border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center">
            {isPaused ? <Play className="w-10 h-10 fill-current" /> : <Pause className="w-10 h-10 fill-current" />}
          </button>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="bg-black border-t-8 border-black p-6 flex items-center justify-between z-30">
        <div className="flex gap-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-900 border-2 border-white/10 text-white">
              <RefreshCcw className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Last Node Reload</span>
              <span className="text-xs font-black text-white uppercase">{sessionData?.lastReload || '--:--:--'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-900 border-2 border-white/10 text-green-500">
              <Activity className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Live Bandwidth</span>
              <span className="text-xs font-black text-white uppercase">{sessionData?.bitrate || '0.0 Mbps'}</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="p-3 bg-zinc-900 border-2 border-white/10 text-blue-500">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Resolution</span>
              <span className="text-xs font-black text-white uppercase">{sessionData?.resolution || 'Detecting...'}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button className="flex items-center gap-3 px-6 py-3 bg-white text-black text-[10px] font-black uppercase hover:bg-zinc-200 transition-all border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)]">
            <MessageSquare className="w-4 h-4" /> Personnel Comms
          </button>
          <button 
            onClick={toggleFullscreen}
            className="p-4 bg-zinc-900 text-white border-2 border-white/20 hover:bg-white hover:text-black transition-all flex items-center justify-center"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Fullscreen Overlay Banner */}
      {isFullscreen && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-2 border-x-4 border-b-4 border-black font-black uppercase text-[10px] tracking-[0.5em] z-50 animate-bounce">
          Admin Overwatch Active
        </div>
      )}
    </div>
  );
};
