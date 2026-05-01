"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import {
  LogIn, Loader2, Mail, Lock, ShieldCheck, UserPlus, Users, Eye, EyeOff, KeyRound
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";

type Tab = "employee" | "admin";
type EmpMode = "login" | "register" | "otp";

export default function LoginPage() {
  const { login } = useAuth();

  const [tab, setTab] = useState<Tab>("employee");
  const [empMode, setEmpMode] = useState<EmpMode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Admin fields
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Employee fields
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [empName, setEmpName] = useState("");
  const [otp, setOtp] = useState("");

  const setErr = (msg: string) => setError(msg);
  const clearErr = () => setError("");

  // ── Admin Login (Direct — no OTP) ──────────────────────────────────────────
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearErr();
    try {
      const { data } = await api.post("auth/login", {
        email: adminEmail,
        password: adminPassword,
        role: "admin",
      });
      // Admin gets a token directly — no OTP step
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data));
        login(data);
      } else {
        setErr("Unexpected response from server. Please try again.");
      }
    } catch (err: any) {
      setErr(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  // ── Employee Login (OTP step 1) ─────────────────────────────────────────────
  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearErr();
    try {
      const { data } = await api.post("auth/login", {
        email: empEmail,
        password: empPassword,
        role: "employee",
      });
      // If dev mode returns a devOtp, show it
      if (data.devOtp) {
        setErr(`DEV: Your OTP is ${data.devOtp}`);
      }
      setEmpMode("otp");
    } catch (err: any) {
      setErr(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Employee Register ───────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (empPassword.length < 6) {
      return setErr("Password must be at least 6 characters");
    }
    setLoading(true);
    clearErr();
    try {
      await api.post("auth/employee-register", {
        name: empName,
        email: empEmail,
        password: empPassword,
      });
      setEmpMode("otp");
      setErr(""); // clear, success will show on OTP screen
    } catch (err: any) {
      setErr(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Verification ────────────────────────────────────────────────────────
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearErr();
    try {
      const { data } = await api.post("auth/verify-otp", {
        email: empEmail,
        otp,
      });
      if (data.pendingApproval) {
        setEmpMode("login");
        setErr("✓ Email verified! Your account is pending admin approval.");
      } else if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data));
        login(data);
      }
    } catch (err: any) {
      setErr(err.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    clearErr();
    try {
      const { data } = await api.post("auth/google-login", {
        token: credentialResponse.credential,
      });

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data));
        login(data);
      } else if (data.status === "pending") {
        setErr("✓ Google account linked! Your account is pending admin approval.");
      }
    } catch (err: any) {
      setErr(err.response?.data?.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = /✓|verified|created|approved|sent/i.test(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">

        {/* Brand Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-2xl mb-4">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-black uppercase">CRM Core</h1>
          <p className="mt-1 text-xs text-gray-400 uppercase tracking-[0.3em] font-bold">Enterprise Security Portal</p>
        </motion.div>

        {/* Tab Switcher */}
        <div className="flex border-b-2 border-gray-200 mb-6">
          {(["employee", "admin"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); clearErr(); setEmpMode("login"); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                tab === t ? "border-b-4 border-black text-black" : "text-gray-400 hover:text-black"
              }`}
            >
              {t === "employee" ? <Users className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              {t}
            </button>
          ))}
        </div>

        <motion.div layout className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <AnimatePresence mode="wait">

            {/* ── ADMIN PANEL ── */}
            {tab === "admin" && (
              <motion.form
                key="admin"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                onSubmit={handleAdminLogin}
                className="space-y-5"
              >
                <div className="bg-black text-white text-[10px] font-bold p-3 uppercase tracking-wider text-center">
                  Administrator Access — Direct Authentication
                </div>

                <div>
                  <label className="block text-xs font-black uppercase mb-2 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black bg-white text-black font-medium"
                    placeholder="admin@company.com"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase mb-2 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black bg-white text-black font-medium"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center py-4 bg-black text-white hover:bg-gray-900 border-2 border-black transition-all font-black uppercase tracking-widest text-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <><LogIn className="mr-2 h-4 w-4" /> Admin Login</>}
                </button>
              </motion.form>
            )}

            {/* ── EMPLOYEE LOGIN ── */}
            {tab === "employee" && empMode === "login" && (
              <motion.form
                key="emp-login"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                onSubmit={handleEmployeeLogin}
                className="space-y-5"
              >
                <div>
                  <label className="block text-xs font-black uppercase mb-2 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </label>
                  <input
                    type="email"
                    required
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none bg-white text-black font-medium"
                    placeholder="employee@example.com"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase mb-2 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={empPassword}
                      onChange={(e) => setEmpPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border-2 border-black focus:outline-none bg-white text-black font-medium"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center py-4 bg-black text-white hover:bg-gray-900 border-2 border-black transition-all font-black uppercase tracking-widest text-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <><KeyRound className="mr-2 h-4 w-4" /> Request OTP</>}
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold">
                    <span className="bg-white px-2 text-gray-400 font-black">Or secure connect</span>
                  </div>
                </div>

                <div className="flex justify-center w-full">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setErr("Google Authentication failed. Check your browser or connection.")}
                    useOneTap
                    shape="square"
                    theme="outline"
                    width="400"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => { setEmpMode("register"); clearErr(); }}
                  className="w-full text-center text-[10px] font-bold uppercase text-gray-500 hover:text-black transition-colors underline"
                >
                  New employee? Create account
                </button>
              </motion.form>
            )}

            {/* ── EMPLOYEE REGISTER ── */}
            {tab === "employee" && empMode === "register" && (
              <motion.form
                key="emp-register"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-black uppercase mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none bg-white text-black font-medium"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-2">Work Email</label>
                  <input
                    type="email"
                    required
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none bg-white text-black font-medium"
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-2">Password (min. 6 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-black focus:outline-none bg-white text-black font-medium"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center py-4 bg-black text-white border-2 border-black transition-all font-black uppercase tracking-widest text-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <><UserPlus className="mr-2 h-4 w-4" /> Create Account</>}
                </button>
                <button
                  type="button"
                  onClick={() => { setEmpMode("login"); clearErr(); }}
                  className="w-full text-center text-[10px] font-bold uppercase text-gray-500 hover:text-black underline"
                >
                  ← Back to login
                </button>
              </motion.form>
            )}

            {/* ── OTP VERIFY ── */}
            {tab === "employee" && empMode === "otp" && (
              <motion.form
                key="emp-otp"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                onSubmit={handleVerifyOTP}
                className="space-y-6"
              >
                <div className="p-4 bg-blue-50 border-2 border-blue-200 text-xs font-medium text-blue-800 text-center">
                  A 6-digit code was sent to <strong>{empEmail}</strong>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase mb-2 text-center">Enter OTP Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    pattern="\d{6}"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-4 border-2 border-black focus:outline-none bg-white text-black text-center text-3xl tracking-[0.5em] font-black"
                    placeholder="000000"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full flex items-center justify-center py-4 bg-black text-white border-2 border-black transition-all font-black uppercase tracking-widest text-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Verify & Login"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEmpMode("login"); clearErr(); setOtp(""); }}
                  className="w-full text-center text-[10px] font-bold uppercase text-gray-500 hover:text-black underline"
                >
                  ← Back to login
                </button>
              </motion.form>
            )}

          </AnimatePresence>

          {/* Status Banner */}
          {error && (
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`mt-5 text-xs font-bold p-3 border-2 text-center ${
                isSuccess
                  ? "text-green-700 bg-green-50 border-green-600"
                  : "text-red-700 bg-red-50 border-red-600"
              }`}
            >
              {error}
            </motion.div>
          )}
        </motion.div>

        <p className="mt-6 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          © {new Date().getFullYear()} CRM Systems — Enterprise Edition
        </p>
      </div>
    </div>
  );
}
