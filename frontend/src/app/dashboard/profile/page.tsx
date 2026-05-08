"use client";

import { useState, useEffect } from "react";
import { 
  User, Mail, Phone, MapPin, Briefcase, 
  Linkedin, Twitter, Github, Save, Shield, 
  Award, Clock, Globe, Cpu, CheckCircle2,
  Camera, Plus, X, LayoutDashboard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('core'); // core, contact, skills, social

  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    jobType: user?.jobType || "office",
    bio: user?.bio || "",
    country: user?.country || "",
    state: user?.state || "",
    address: user?.address || "",
    department: user?.department || "",
    skills: user?.skills || [],
    socialLinks: {
      linkedin: user?.socialLinks?.linkedin || "",
      twitter: user?.socialLinks?.twitter || "",
      github: user?.socialLinks?.github || ""
    }
  });

  const [newSkill, setNewSkill] = useState("");

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data } = await api.put('auth/update-profile', formData);
      updateUser(data);
      toast.success("Industrial Profile Synchronized");
      setIsEditing(false);
    } catch (err) {
      toast.error("Profile Linkage Failed");
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (newSkill && !formData.skills.includes(newSkill)) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill] }));
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b-8 border-black bg-white flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 bg-black border-4 border-black flex items-center justify-center text-white text-4xl font-black italic overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              {user?.name?.[0].toUpperCase()}
            </div>
            <button className="absolute -bottom-2 -right-2 p-2 bg-white border-4 border-black text-black hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-none mb-2">Personnel Hub</h1>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest">{user?.role}</span>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-3 h-3" /> Security Level: Verified
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-8 py-4 bg-white border-4 border-black text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3"
            >
              <Cpu className="w-4 h-4" /> Initialize Uplink
            </button>
          ) : (
            <>
              <button 
                onClick={() => setIsEditing(false)}
                className="px-8 py-4 bg-zinc-200 border-4 border-black text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zinc-300 transition-all"
              >
                Abort
              </button>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="px-8 py-4 bg-black text-white border-4 border-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all shadow-[10px_10px_0px_0px_rgba(0,0,0,0.3)] flex items-center gap-3"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" /> : <Save className="w-4 h-4" />}
                Synchronize Data
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 max-w-[1400px] mx-auto">
          
          {/* Left Panel: Bio & Stats */}
          <div className="xl:col-span-4 space-y-10">
            {/* Honor Score Card */}
            <div className="bg-black text-white p-8 border-4 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
              <Award className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 opacity-10 rotate-12" />
              <div className="relative z-10">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-6">Industrial Honor Score</h3>
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-7xl font-black italic tracking-tighter leading-none">{user?.honorScore?.score || 0}</span>
                  <span className="text-xl font-black text-zinc-600 mb-2">/ 100</span>
                </div>
                <div className="h-4 bg-zinc-900 border-2 border-white/10 rounded-none overflow-hidden mb-6">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${user?.honorScore?.score || 0}%` }}
                    className="h-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-zinc-900 border-2 border-white/5">
                    <p className="text-[8px] font-black text-zinc-500 uppercase mb-1">Efficiency</p>
                    <p className="text-sm font-black text-white uppercase">High Performance</p>
                  </div>
                  <div className="p-3 bg-zinc-900 border-2 border-white/5">
                    <p className="text-[8px] font-black text-zinc-500 uppercase mb-1">Reliability</p>
                    <p className="text-sm font-black text-white uppercase">Grade-A Link</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white border-4 border-black p-8 shadow-[15px_15px_0px_0px_rgba(0,0,0,0.1)]">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <Clock className="w-4 h-4" /> Temporal Metrics
              </h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b-2 border-black/5">
                  <span className="text-[10px] font-black text-zinc-400 uppercase">Joined Grid</span>
                  <span className="text-xs font-black uppercase text-black">OCT 2023</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b-2 border-black/5">
                  <span className="text-[10px] font-black text-zinc-400 uppercase">Last Synchronization</span>
                  <span className="text-xs font-black uppercase text-green-600">Active Now</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b-2 border-black/5">
                  <span className="text-[10px] font-black text-zinc-400 uppercase">System Clearance</span>
                  <span className="text-xs font-black uppercase text-black">Standard Level</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Fields */}
          <div className="xl:col-span-8 bg-white border-4 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b-4 border-black overflow-x-auto no-scrollbar">
              {[
                { id: 'core', label: 'Core Identity', icon: User },
                { id: 'contact', label: 'Contact Grid', icon: Globe },
                { id: 'skills', label: 'Neural Skills', icon: Cpu },
                { id: 'social', label: 'Network Links', icon: Linkedin }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-3 px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all
                    ${activeTab === tab.id ? "bg-black text-white" : "hover:bg-zinc-100 text-zinc-400"}
                  `}
                >
                  <tab.icon className="w-4 h-4" /> {tab.label}
                </button>
              ))}
            </div>

            <div className="p-10">
              <AnimatePresence mode="wait">
                {activeTab === 'core' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Full Name</label>
                        <input 
                          disabled={!isEditing}
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full bg-zinc-50 border-4 border-black p-4 text-sm font-black uppercase tracking-tight focus:bg-white transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Department Unit</label>
                        <input 
                          disabled={!isEditing}
                          placeholder="e.g. CORE ARCHITECTURE"
                          value={formData.department}
                          onChange={(e) => setFormData({...formData, department: e.target.value})}
                          className="w-full bg-zinc-50 border-4 border-black p-4 text-sm font-black uppercase tracking-tight focus:bg-white transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Operational Role / Bio</label>
                      <textarea 
                        disabled={!isEditing}
                        rows={4}
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        className="w-full bg-zinc-50 border-4 border-black p-4 text-sm font-bold tracking-tight focus:bg-white transition-all outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Work Environment Mode</label>
                      <div className="grid grid-cols-3 gap-4">
                        {['office', 'remote', 'hybrid'].map(mode => (
                          <button
                            key={mode}
                            disabled={!isEditing}
                            onClick={() => setFormData({...formData, jobType: mode as any})}
                            className={`
                              p-4 border-4 border-black text-[10px] font-black uppercase tracking-widest transition-all
                              ${formData.jobType === mode ? "bg-black text-white" : "bg-zinc-50 text-zinc-400 hover:bg-zinc-100"}
                            `}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'contact' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Global Comms (Email)</label>
                        <div className="flex items-center gap-4 bg-zinc-100 border-4 border-black/10 p-4 text-zinc-400 text-sm font-black uppercase">
                          <Mail className="w-4 h-4" /> {user?.email}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Direct Link (Phone)</label>
                        <input 
                          disabled={!isEditing}
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="w-full bg-zinc-50 border-4 border-black p-4 text-sm font-black uppercase tracking-tight focus:bg-white transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Country Location</label>
                        <input 
                          disabled={!isEditing}
                          value={formData.country}
                          onChange={(e) => setFormData({...formData, country: e.target.value})}
                          className="w-full bg-zinc-50 border-4 border-black p-4 text-sm font-black uppercase tracking-tight focus:bg-white transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">State / Province</label>
                        <input 
                          disabled={!isEditing}
                          value={formData.state}
                          onChange={(e) => setFormData({...formData, state: e.target.value})}
                          className="w-full bg-zinc-50 border-4 border-black p-4 text-sm font-black uppercase tracking-tight focus:bg-white transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Physical Data Center (Address)</label>
                      <input 
                        disabled={!isEditing}
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="w-full bg-zinc-50 border-4 border-black p-4 text-sm font-black uppercase tracking-tight focus:bg-white transition-all outline-none"
                      />
                    </div>
                  </motion.div>
                )}

                {activeTab === 'skills' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="p-8 border-4 border-zinc-100 bg-zinc-50/50">
                      <h4 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-black" /> Skills Repository
                      </h4>
                      
                      <div className="flex flex-wrap gap-3 mb-8">
                        {formData.skills.map((skill, i) => (
                          <div 
                            key={i} 
                            className="bg-black text-white px-4 py-2 border-2 border-black flex items-center gap-3 group"
                          >
                            <span className="text-[10px] font-black uppercase tracking-widest">{skill}</span>
                            {isEditing && (
                              <button 
                                onClick={() => removeSkill(skill)}
                                className="text-white/40 hover:text-white transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        {formData.skills.length === 0 && (
                          <p className="text-zinc-400 text-[10px] font-black uppercase italic tracking-[0.3em] py-4">No Neural Assets Detected</p>
                        )}
                      </div>

                      {isEditing && (
                        <div className="flex gap-4">
                          <input 
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                            placeholder="ADD NEW NEURAL ASSET..."
                            className="flex-1 bg-white border-4 border-black p-4 text-[10px] font-black uppercase tracking-widest outline-none"
                          />
                          <button 
                            onClick={addSkill}
                            className="px-6 bg-black text-white border-4 border-black hover:bg-zinc-800 transition-all"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-6 bg-yellow-50 border-l-8 border-yellow-400 flex items-start gap-4">
                      <Shield className="w-6 h-6 text-yellow-600 mt-1" />
                      <div>
                        <h5 className="text-[10px] font-black uppercase text-yellow-800 mb-1 tracking-widest">Asset Verification</h5>
                        <p className="text-[9px] font-bold text-yellow-700 uppercase leading-tight">
                          Neural skills are automatically audited by system administrators to maintain industrial grade compliance.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'social' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="space-y-6">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-600 flex items-center justify-center border-4 border-black text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                          <Linkedin className="w-6 h-6" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">LinkedIn Uplink</label>
                          <input 
                            disabled={!isEditing}
                            placeholder="linkedin.com/in/username"
                            value={formData.socialLinks.linkedin}
                            onChange={(e) => setFormData({...formData, socialLinks: {...formData.socialLinks, linkedin: e.target.value}})}
                            className="w-full bg-zinc-50 border-4 border-black p-4 text-sm font-black focus:bg-white transition-all outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-zinc-900 flex items-center justify-center border-4 border-black text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                          <Twitter className="w-6 h-6" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">X (Twitter) Link</label>
                          <input 
                            disabled={!isEditing}
                            placeholder="twitter.com/username"
                            value={formData.socialLinks.twitter}
                            onChange={(e) => setFormData({...formData, socialLinks: {...formData.socialLinks, twitter: e.target.value}})}
                            className="w-full bg-zinc-50 border-4 border-black p-4 text-sm font-black focus:bg-white transition-all outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-zinc-800 flex items-center justify-center border-4 border-black text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                          <Github className="w-6 h-6" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">GitHub Repository</label>
                          <input 
                            disabled={!isEditing}
                            placeholder="github.com/username"
                            value={formData.socialLinks.github}
                            onChange={(e) => setFormData({...formData, socialLinks: {...formData.socialLinks, github: e.target.value}})}
                            className="w-full bg-zinc-50 border-4 border-black p-4 text-sm font-black focus:bg-white transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
