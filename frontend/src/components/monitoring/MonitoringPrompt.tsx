"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Monitor, CheckCircle2, XCircle } from 'lucide-react';

interface MonitoringPromptProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const MonitoringPrompt: React.FC<MonitoringPromptProps> = ({ isOpen, onAccept, onDecline }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white border-8 border-black w-full max-w-lg p-10 shadow-[30px_30px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-black text-white flex items-center justify-center border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)]">
                <Shield className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none italic">Security Protocol</h2>
                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] mt-1 font-bold">Standard Work Tracking</p>
              </div>
            </div>

            <div className="space-y-6 mb-10">
              <div className="flex gap-4 p-4 border-4 border-black bg-zinc-50">
                <Monitor className="w-6 h-6 flex-shrink-0" />
                <p className="text-sm font-bold uppercase tracking-tight leading-relaxed">
                  To maintain operational transparency and verify task compliance, this session requires active screen monitoring.
                </p>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-zinc-600">
                  <CheckCircle2 className="w-4 h-4 text-green-600" /> Real-time activity streaming
                </li>
                <li className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-zinc-600">
                  <CheckCircle2 className="w-4 h-4 text-green-600" /> Active/Idle time logging
                </li>
                <li className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-zinc-600">
                  <CheckCircle2 className="w-4 h-4 text-green-600" /> Secure Admin visibility
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <button
                onClick={onDecline}
                className="group flex items-center justify-center gap-3 py-5 border-4 border-black font-black uppercase text-sm hover:bg-black hover:text-white transition-all"
              >
                <XCircle className="w-5 h-5 group-hover:animate-pulse" /> No, Decline
              </button>
              <button
                onClick={onAccept}
                className="group flex items-center justify-center gap-3 py-5 bg-black text-white border-4 border-black font-black uppercase text-sm hover:bg-white hover:text-black transition-all shadow-[10px_10px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-none"
              >
                <Monitor className="w-5 h-5 group-hover:scale-110 transition-transform" /> Yes, Authorize
              </button>
            </div>

            <p className="mt-8 text-center text-[9px] font-bold text-zinc-400 uppercase tracking-widest italic">
              Your choice will be logged and reported to administration.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
