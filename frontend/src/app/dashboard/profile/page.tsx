"use client";

import { useState, useEffect } from "react";
import { 
  User, Mail, Phone, MapPin, Briefcase, 
  Globe, Share2, Link, Save, Shield, 
  Award, Clock, Cpu, CircleCheck,
  Camera, Plus, X, LayoutDashboard,
  ExternalLink, Linkedin, Twitter, Github,
  CheckCircle2, AlertCircle
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
      toast.success("Profile synchronized successfully");
      setIsEditing(false);
    } catch (err) {
      toast.error("Failed to update profile linkage");
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
    <div className="min-h-full bg-zinc-50/50">
      {/* Premium Hero Header */}
      <div className="bg-white border-b border-zinc-100 mb-12">
        <div className="max-w-[1600px] mx-auto px-10 py-16">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-12">
              <div className="relative group">
                <div className="w-44 h-44 bg-zinc-950 rounded-[3.5rem] flex items-center justify-center text-white text-6xl font-bold shadow-2xl shadow-black/20 relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-700">
                  {user?.name?.[0]?.toUpperCase() || <User className="w-20 h-20" />}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
                </div>
                <button className="absolute -bottom-2 -right-2 p-5 bg-white border border-zinc-100 rounded-2xl text-zinc-400 hover:text-zinc-950 shadow-2xl transition-all hover:scale-110">
                  <Camera className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4 text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center gap-5">
                  <h1 className="text-5xl font-bold text-zinc-950 tracking-tight uppercase leading-none">{user?.name || "Member Name"}</h1>
                  <span className="px-5 py-1.5 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full shadow-lg shadow-black/10">
                    {user?.role || "Member"}
                  </span>
                </div>
                <p className="text-zinc-400 text-[13px] font-bold uppercase tracking-widest flex items-center justify-center md:justify-start gap-3 italic">
                  <Mail className="w-4 h-4 text-brand-indigo" /> {user?.email}
                </p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-4">
                  <div className="flex items-center gap-2.5 text-[10px] font-bold text-brand-emerald uppercase tracking-[0.2em] bg-brand-emerald/5 px-4 py-1.5 rounded-full border border-brand-emerald/10 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" /> System Verified
                  </div>
                  <div className="flex items-center gap-2.5 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
                    <Clock className="w-3.5 h-3.5" /> Active Node Since 2023
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 w-full lg:w-auto">
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex-1 lg:flex-none px-12 py-5 bg-zinc-950 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/20 flex items-center justify-center gap-4 border border-white/10"
                >
                  <Cpu className="w-4 h-4" /> Edit Profile Node
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 lg:flex-none px-10 py-5 bg-white border border-zinc-200 text-zinc-500 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all shadow-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 lg:flex-none px-10 py-5 bg-zinc-950 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/20 flex items-center justify-center gap-4 border border-white/10"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Sync Changes
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-10 pb-32">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
          
          {/* Sidebar Metrics */}
          <div className="xl:col-span-4 space-y-12">
            {/* Honor Score Premium Card */}
            <div className="bg-zinc-950 rounded-[3.5rem] p-10 relative overflow-hidden group shadow-2xl shadow-black/30 border border-white/5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-[100px] group-hover:bg-white/10 transition-all duration-1000" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-12">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500">Performance Index</h3>
                  <Award className="w-6 h-6 text-brand-amber" />
                </div>
                
                <div className="flex items-baseline gap-4 mb-3">
                  <span className="text-8xl font-bold text-white tracking-tighter italic">{user?.honorScore?.score || 0}</span>
                  <span className="text-3xl font-bold text-zinc-700">/100</span>
                </div>
                <div className="flex items-center gap-3 mb-12">
                  <div className="w-6 h-1 bg-brand-emerald rounded-full" />
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em] italic">Efficiency Grade: A+</p>
                </div>
                
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">
                      <span>Neural Reliability</span>
                      <span className="text-white">98%</span>
                    </div>
                    <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: '98%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-5">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-white/10 transition-all duration-500">
                      <p className="text-[9px] font-bold text-zinc-500 uppercase mb-2 tracking-widest">Tasks Done</p>
                      <p className="text-2xl font-bold text-white italic">248</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-white/10 transition-all duration-500">
                      <p className="text-[9px] font-bold text-zinc-500 uppercase mb-2 tracking-widest">Node Uptime</p>
                      <p className="text-2xl font-bold text-white italic">99.9%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick System Info */}
            <div className="bg-white rounded-[3.5rem] border border-zinc-100 p-10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-1.5 bg-brand-indigo/30" />
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-950 mb-10 flex items-center gap-4">
                <Shield className="w-5 h-5 text-zinc-400" /> Security Manifest
              </h3>
              <div className="space-y-6">
                {[
                  { label: "IP Address", value: "192.168.1.1", status: "Protected" },
                  { label: "Access Level", value: user?.role || "Staff", status: "Verified" },
                  { label: "Device Sync", value: "Enterprise Terminal", status: "Active" }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-4 border-b border-zinc-50 last:border-0 group cursor-pointer hover:translate-x-2 transition-transform duration-500">
                    <div>
                      <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-[0.2em] mb-1.5">{item.label}</p>
                      <p className="text-sm font-bold text-zinc-950 uppercase italic tracking-tight">{item.value}</p>
                    </div>
                    <span className="px-4 py-1.5 bg-zinc-50 text-[9px] font-bold text-zinc-400 rounded-full uppercase border border-zinc-100 tracking-widest group-hover:bg-zinc-950 group-hover:text-white group-hover:border-black transition-all">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Configuration Panel */}
          <div className="xl:col-span-8">
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-2xl overflow-hidden min-h-[700px] flex flex-col">
              {/* Navigation Tabs */}
              <div className="flex px-4 pt-4 border-b border-zinc-100 bg-zinc-50/50 gap-2">
                {[
                  { id: 'core', label: 'Identity', icon: User },
                  { id: 'contact', label: 'Connectivity', icon: Globe },
                  { id: 'skills', label: 'Expertise', icon: Cpu },
                  { id: 'social', label: 'Networks', icon: Share2 }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-3 px-10 py-5 text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap transition-all rounded-t-[2.5rem]
                      ${activeTab === tab.id 
                        ? "bg-white text-zinc-950 border-x border-t border-zinc-100 shadow-sm -mb-[1px]" 
                        : "text-zinc-400 hover:text-zinc-950 hover:bg-white/50"}
                    `}
                  >
                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-zinc-950" : "text-zinc-300"}`} /> 
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-10 flex-1">
                <AnimatePresence mode="wait">
                  {activeTab === 'core' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="space-y-10"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                          <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-[0.3em] ml-2">Preferred Display Name</label>
                          <div className="relative group">
                            <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 group-focus-within:text-zinc-950 transition-colors" />
                            <input 
                              disabled={!isEditing}
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                              placeholder="Your full name"
                              className="w-full bg-zinc-50 border border-zinc-100 rounded-[1.5rem] p-5 pl-16 text-sm font-bold uppercase tracking-tight text-zinc-950 focus:bg-white focus:ring-8 focus:ring-black/5 focus:border-zinc-950 outline-none transition-all"
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-[0.3em] ml-2">Department Unit</label>
                          <div className="relative group">
                            <Briefcase className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 group-focus-within:text-zinc-950 transition-colors" />
                            <input 
                              disabled={!isEditing}
                              placeholder="e.g. Product Design"
                              value={formData.department}
                              onChange={(e) => setFormData({...formData, department: e.target.value})}
                              className="w-full bg-zinc-50 border border-zinc-100 rounded-[1.5rem] p-5 pl-16 text-sm font-bold uppercase tracking-tight text-zinc-950 focus:bg-white focus:ring-8 focus:ring-black/5 focus:border-zinc-950 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest ml-1">Operational Bio</label>
                        <textarea 
                          disabled={!isEditing}
                          rows={4}
                          value={formData.bio}
                          onChange={(e) => setFormData({...formData, bio: e.target.value})}
                          placeholder="Tell us about your professional background..."
                          className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-6 text-sm font-medium text-zinc-700 focus:bg-white focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 outline-none transition-all resize-none leading-relaxed"
                        />
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest ml-1">Deployment Mode</label>
                        <div className="grid grid-cols-3 gap-4">
                          {['office', 'remote', 'hybrid'].map(mode => (
                            <button
                              key={mode}
                              type="button"
                              disabled={!isEditing}
                              onClick={() => setFormData({...formData, jobType: mode as any})}
                              className={`
                                p-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border
                                ${formData.jobType === mode 
                                  ? "bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-black/10" 
                                  : "bg-zinc-50 text-zinc-400 border-zinc-100 hover:bg-white hover:border-zinc-200"}
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
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="space-y-10"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest ml-1">System Email (Locked)</label>
                          <div className="flex items-center gap-4 bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-zinc-400 text-sm font-semibold">
                            <Mail className="w-4 h-4" /> {user?.email}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest ml-1">Contact Phone</label>
                          <div className="relative group">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-indigo-600 transition-colors" />
                            <input 
                              disabled={!isEditing}
                              value={formData.phone}
                              onChange={(e) => setFormData({...formData, phone: e.target.value})}
                              placeholder="+1 (555) 000-0000"
                              className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 pl-12 text-sm font-semibold text-zinc-900 focus:bg-white focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest ml-1">Country</label>
                          <input 
                            disabled={!isEditing}
                            value={formData.country}
                            onChange={(e) => setFormData({...formData, country: e.target.value})}
                            className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-sm font-semibold text-zinc-900 focus:bg-white focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest ml-1">State / Province</label>
                          <input 
                            disabled={!isEditing}
                            value={formData.state}
                            onChange={(e) => setFormData({...formData, state: e.target.value})}
                            className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-sm font-semibold text-zinc-900 focus:bg-white focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest ml-1">Primary Address</label>
                        <div className="relative group">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-indigo-600 transition-colors" />
                          <input 
                            disabled={!isEditing}
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                            className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 pl-12 text-sm font-semibold text-zinc-900 focus:bg-white focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'skills' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="space-y-10"
                    >
                      <div className="bg-[#fafafa] rounded-2xl p-8 border border-zinc-100">
                        <div className="flex items-center justify-between mb-8">
                          <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-indigo-600" /> Neural Assets
                          </h4>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">{formData.skills.length} Expertise Registered</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-3 mb-10">
                          {formData.skills.map((skill, i) => (
                            <div 
                              key={i} 
                              className="bg-white text-zinc-700 px-5 py-2.5 rounded-xl border border-zinc-100 flex items-center gap-3 group hover:border-indigo-200 transition-all shadow-sm"
                            >
                              <span className="text-[11px] font-bold uppercase tracking-wider">{skill}</span>
                              {isEditing && (
                                <button 
                                  onClick={() => removeSkill(skill)}
                                  className="text-zinc-300 hover:text-red-500 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                          {formData.skills.length === 0 && (
                            <p className="text-zinc-400 text-xs font-medium italic py-4">No skills registered in your neural core.</p>
                          )}
                        </div>

                        {isEditing && (
                          <div className="flex gap-3">
                            <input 
                              value={newSkill}
                              onChange={(e) => setNewSkill(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                              placeholder="Register new skill (e.g. React, Node.js)"
                              className="flex-1 bg-white border border-zinc-200 rounded-2xl p-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 transition-all"
                            />
                            <button 
                              type="button"
                              onClick={addSkill}
                              className="px-6 bg-zinc-900 text-white rounded-2xl hover:bg-black transition-all flex items-center justify-center shadow-lg shadow-black/10"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="bg-indigo-50/50 rounded-2xl p-6 flex items-start gap-4 border border-indigo-100/30">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Shield className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h5 className="text-[10px] font-bold uppercase text-indigo-900 mb-1 tracking-widest">Verification Protocol</h5>
                          <p className="text-[11px] font-medium text-indigo-700/70 leading-relaxed">
                            New skills are periodically audited by system administrators to ensure industrial grade compliance within the Vertex ecosystem.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'social' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="space-y-6">
                        {[
                          { id: 'linkedin', label: 'LinkedIn Professional Profile', icon: Linkedin, color: 'text-blue-600', placeholder: 'linkedin.com/in/username' },
                          { id: 'twitter', label: 'X (Twitter) Handle', icon: Twitter, color: 'text-zinc-900', placeholder: 'twitter.com/username' },
                          { id: 'github', label: 'GitHub Repository', icon: Github, color: 'text-zinc-700', placeholder: 'github.com/username' }
                        ].map(social => (
                          <div key={social.id} className="flex items-center gap-6 group">
                            <div className={`w-14 h-14 bg-white border border-zinc-100 rounded-2xl flex items-center justify-center transition-all group-focus-within:border-indigo-600/20 group-focus-within:shadow-lg shadow-sm`}>
                              <social.icon className={`w-6 h-6 ${social.color}`} />
                            </div>
                            <div className="flex-1 space-y-2">
                              <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest ml-1">{social.label}</label>
                              <div className="relative">
                                <input 
                                  disabled={!isEditing}
                                  placeholder={social.placeholder}
                                  value={(formData.socialLinks as any)[social.id]}
                                  onChange={(e) => setFormData({...formData, socialLinks: {...formData.socialLinks, [social.id]: e.target.value}})}
                                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-sm font-semibold text-zinc-900 focus:bg-white focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 outline-none transition-all"
                                />
                                <ExternalLink className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-12 p-8 bg-zinc-50 rounded-2xl border border-zinc-100 text-center">
                        <Share2 className="w-10 h-10 text-zinc-200 mx-auto mb-4" />
                        <h4 className="text-sm font-bold text-zinc-900 mb-2">Connect Your Digital Identity</h4>
                        <p className="text-xs text-zinc-400 font-medium max-w-sm mx-auto leading-relaxed">
                          Linking your professional networks helps other team members discover your expertise and collaborate more effectively.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
