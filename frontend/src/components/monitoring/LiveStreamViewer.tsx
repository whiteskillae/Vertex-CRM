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
    const candidateQueue: RTCIceCandidateInit[] = [];

    const startWatching = async () => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ]
      });

      pc.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().catch(e => console.error('Play error:', e));
          setStatus('streaming');
          setSessionData({
            startTime: new Date().toISOString(),
            lastReload: new Date().toLocaleTimeString(),
            resolution: '1280x720',
            bitrate: '1.2 Mbps'
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
            console.error('Offer error:', e);
          }
        }
      });

      socket.on('screen:candidate', async (data) => {
        if (data.from === userId && data.viewerId === viewerId && pcRef.current) {
          if (pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
          } else {
            candidateQueue.push(data.candidate);
          }
        }
      });

      socket.emit('screen:request', { to: userId, viewerId });
    };

    startWatching();

    return () => {
      pcRef.current?.close();
      socket.off('screen:offer');
      socket.off('screen:candidate');
    };
  }, [socket, userId]);

  return (
    <div 
      ref={containerRef} 
      className={`relative bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-200 shadow-2xl transition-all duration-500 ${isFullscreen ? 'w-screen h-screen rounded-none' : 'aspect-video'}`}
    >
      {/* Stream Overlay */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-30 pointer-events-none">
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl pointer-events-auto">
          <div className="relative">
            <div className="w-10 h-10 bg-white/10 text-white flex items-center justify-center rounded-xl font-bold border border-white/10">
              {userName[0].toUpperCase()}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-zinc-950 rounded-full ${status === 'streaming' ? 'bg-brand-emerald' : 'bg-brand-rose'} animate-pulse`} />
          </div>
          <div>
            <p className="text-xs font-bold text-white tracking-tight leading-none mb-1">{userName}</p>
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-brand-emerald" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Live Stream</span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-2xl flex items-center gap-3 text-white pointer-events-auto">
          <Clock className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-bold font-mono text-brand-emerald">{getWorkingTime()}</span>
        </div>
      </div>

      {/* Main Stream */}
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
        <AnimatePresence>
          {status === 'connecting' && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 text-white z-20"
            >
              <Loader2 className="w-10 h-10 animate-spin text-brand-indigo" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Establishing Peer Connection...</p>
            </motion.div>
          )}
          
          {status === 'offline' && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 text-white z-20"
            >
              <ShieldAlert className="w-12 h-12 text-brand-rose mb-2" />
              <h3 className="text-lg font-bold">Signal Terminated</h3>
              <p className="text-xs text-zinc-400">Node disconnected or sharing stopped.</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-6 py-2.5 bg-white text-black text-xs font-bold rounded-xl hover:bg-zinc-200 transition-all"
              >
                Re-sync Node
              </button>
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
        
        {/* Hover Controls */}
        <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-10 z-10">
          <button onClick={() => setIsPaused(!isPaused)} className="p-6 bg-white text-black rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all">
            {isPaused ? <Play className="w-8 h-8 fill-current" /> : <Pause className="w-8 h-8 fill-current" />}
          </button>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between z-30 pointer-events-none">
        <div className="flex gap-4 pointer-events-auto">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl flex items-center gap-3">
            <Activity className="w-4 h-4 text-brand-emerald" />
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Bandwidth</span>
              <span className="text-[10px] font-bold text-white uppercase">{sessionData?.bitrate || '0.0 Mbps'}</span>
            </div>
          </div>
          <div className="hidden sm:flex bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl items-center gap-3">
            <Maximize2 className="w-4 h-4 text-brand-indigo" />
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Resolution</span>
              <span className="text-[10px] font-bold text-white uppercase">{sessionData?.resolution || '720p'}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pointer-events-auto">
          <button 
            onClick={toggleFullscreen}
            className="p-3.5 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl hover:bg-white hover:text-black transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
