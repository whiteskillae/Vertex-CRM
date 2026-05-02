"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/context/SocketContext';
import { Loader2, Maximize2, ShieldAlert } from 'lucide-react';

interface LiveStreamViewerProps {
  userId: string;
  userName: string;
}

export const LiveStreamViewer: React.FC<LiveStreamViewerProps> = ({ userId, userName }) => {
  const { socket } = useSocket();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState<'connecting' | 'streaming' | 'offline'>('connecting');

  useEffect(() => {
    if (!socket) return;

    const startWatching = async () => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      pc.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          setStatus('streaming');
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
      
      // Request stream from employee
      socket.emit('screen:request', { to: userId, viewerId });
    };

    socket.on('screen:offer', async (data) => {
      if (data.from === userId && data.viewerId === viewerId && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit('screen:answer', { to: userId, viewerId, answer });
      }
    });

    socket.on('screen:candidate', async (data) => {
      if (data.from === userId && data.viewerId === viewerId && pcRef.current) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    startWatching();

    return () => {
      pcRef.current?.close();
      socket.off('screen:offer');
      socket.off('screen:answer');
      socket.off('screen:candidate');
    };
  }, [socket, userId]);

  return (
    <div className="relative aspect-video bg-black border-4 border-black overflow-hidden group">
      {status === 'connecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mb-2" />
          <p className="text-[10px] font-black uppercase tracking-widest">Establishing Link...</p>
        </div>
      )}
      
      {status === 'offline' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-zinc-500">
          <ShieldAlert className="w-8 h-8 mb-2" />
          <p className="text-[10px] font-black uppercase tracking-widest">Signal Lost</p>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-contain ${status === 'streaming' ? 'opacity-100' : 'opacity-0'}`}
      />

      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 border border-white/20">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-[9px] font-black text-white uppercase tracking-widest">LIVE: {userName}</span>
      </div>

      <button className="absolute bottom-4 right-4 p-2 bg-white text-black border-2 border-black opacity-0 group-hover:opacity-100 transition-opacity">
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  );
};
