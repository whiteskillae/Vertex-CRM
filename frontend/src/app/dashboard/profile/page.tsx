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
    <div className="min-h-full bg-[#fafafa]">
      {/* Premium Hero Header */}
      <div className="bg-white border-b border-zinc-100 mb-8">
        <div className="max-w-[1400px] mx-auto px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="flex items-center gap-8">
              <div className="relative group">
                <div className="w-32 h-32 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
                  {user?.name?.[0]?.toUpperCase() || <User className="w-12 h-12" />}
                  {/* Subtle glass effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
                </div>
                <button className="absolute -bottom-2 -right-2 p-3 bg-white border border-zinc-100 rounded-2xl text-zinc-600 hover:text-indigo-600 shadow-xl transition-all hover:scale-110">
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">{user?.name || "Member Name"}</h1>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-indigo-100/50">
                    {user?.role || "Member"}
                  </span>
                </div>
                <p className="text-zinc-400 text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-zinc-300" /> {user?.email}
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md">
                    <CheckCircle2 className="w-3 h-3" /> System Verified
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    <Clock className="w-3 h-3" /> Active Since 2023
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-8 py-4 bg-zinc-900 text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-black transition-all shadow-lg shadow-black/10 flex items-center gap-3"
                >
                  <Cpu className="w-4 h-4" /> Edit Profile
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-8 py-4 bg-white border border-zinc-200 text-zinc-500 rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-3"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 pb-20">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Sidebar Metrics */}
          <div className="xl:col-span-4 space-y-8">
            {/* Honor Score Premium Card */}
            <div className="bg-zinc-900 rounded-[2.5rem] p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Performance Index</h3>
                  <Award className="w-5 h-5 text-indigo-400" />
                </div>
                
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-6xl font-bold text-white tracking-tighter">{user?.honorScore?.score || 0}</span>
                  <span className="text-xl font-bold text-zinc-700">/100</span>
                </div>
                <p className="text-xs font-medium text-zinc-500 mb-8 uppercase tracking-widest">Efficiency Grade: A+</p>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase mb-2">
                      <span>Network Reliability</span>
                      <span className="text-indigo-400">98%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '98%' }}
                        className="h-full bg-gradient-to-r from-indigo-600 to-violet-600"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-800/50 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-bold text-zinc-500 uppercase mb-1">Tasks Done</p>
                      <p className="text-lg font-bold text-white">248</p>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-bold text-zinc-500 uppercase mb-1">Uptime</p>
                      <p className="text-lg font-bold text-white">99.9%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick System Info */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-8 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-900 mb-6 flex items-center gap-3">
                <Shield className="w-4 h-4 text-indigo-600" /> Security Manifest
              </h3>
              <div className="space-y-5">
                {[
                  { label: "IP Address", value: "192.168.1.1", status: "Protected" },
                  { label: "Access Level", value: user?.role || "Staff", status: "Verified" },
                  { label: "Device Sync", value: "MacBook Pro", status: "Active" }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b border-zinc-50 last:border-0">
                    <div>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">{item.label}</p>
                      <p className="text-xs font-bold text-zinc-900">{item.value}</p>
                    </div>
                    <span className="px-2 py-1 bg-zinc-50 text-[9px] font-bold text-zinc-500 rounded-md uppercase border border-zinc-100">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Configuration Panel */}
          <div className="xl:col-span-8">
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
              {/* Navigation Tabs */}
              <div className="flex px-4 pt-4 border-b border-zinc-50 bg-[#fafafa]/50">
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
                      flex items-center gap-2.5 px-8 py-5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all rounded-t-3xl
                      ${activeTab === tab.id 
                        ? "bg-white text-indigo-600 border-x border-t border-zinc-100 -mb-[1px]" 
                        : "text-zinc-400 hover:text-zinc-600 hover:bg-white/50"}
                    `}
                  >
                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-indigo-600" : "text-zinc-300"}`} /> 
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest ml-1">Preferred Display Name</label>
                          <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-indigo-600 transition-colors" />
                            <input 
                              disabled={!isEditing}
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                              placeholder="Your full name"
                              className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 pl-12 text-sm font-semibold text-zinc-900 focus:bg-white focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 outline-none transition-all"
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest ml-1">Department Unit</label>
                          <div className="relative group">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-indigo-600 transition-colors" />
                            <input 
                              disabled={!isEditing}
                              placeholder="e.g. Product Design"
                              value={formData.department}
                              onChange={(e) => setFormData({...formData, department: e.target.value})}
                              className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 pl-12 text-sm font-semibold text-zinc-900 focus:bg-white focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 outline-none transition-all"
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
                          className="w-full bg-zinc-50 border border-zinc-100 rounded-[2rem] p-6 text-sm font-medium text-zinc-700 focus:bg-white focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/20 outline-none transition-all resize-none leading-relaxed"
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
                      <div className="bg-[#fafafa] rounded-[2rem] p-8 border border-zinc-100">
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

                      <div className="mt-12 p-8 bg-zinc-50 rounded-[2rem] border border-zinc-100 text-center">
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
