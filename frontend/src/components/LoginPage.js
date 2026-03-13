import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom"; // Added Link
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, ArrowRight, ShieldCheck, Orbit } from "lucide-react";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Student");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      navigate("/chat");
    } catch (err) {
      setError("Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const accentColor = role === "Student" ? "indigo" : "emerald";

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-200 flex overflow-hidden font-sans">
      
      {/* Brand Section - Desktop Only (40% width) */}
      <div className="hidden lg:flex w-[40%] flex-col items-center justify-center border-r border-slate-900/80 bg-[#030712] relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-${accentColor}-500/10 blur-[120px] rounded-full`}></div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6 relative z-10"
        >
          <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 shadow-2xl group">
            <Orbit className={`w-16 h-16 text-${accentColor}-400 group-hover:rotate-12 transition-transform duration-500`} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Campus <span className={`text-${accentColor}-500`}>Copilot</span>
          </h1>
        </motion.div>
      </div>

      {/* Login Section - Takes up remaining space */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#020617]">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-sm space-y-10"
        >
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
             <Orbit className={`w-10 h-10 text-${accentColor}-400`} />
             <span className="font-bold text-2xl">Campus Copilot</span>
          </div>

          <div className="space-y-1 text-center lg:text-left">
            <h3 className="text-3xl font-bold text-white tracking-tight">Sign In</h3>
            <p className="text-slate-500 text-sm">Welcome back to your workstation.</p>
          </div>

          {/* Role Toggle */}
          <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-xl relative shadow-inner">
            <button
              type="button"
              onClick={() => setRole("Student")}
              className={`flex-1 py-2.5 text-sm font-medium z-10 transition-colors duration-300 ${role === "Student" ? "text-white" : "text-slate-500"}`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => setRole("Professor")}
              className={`flex-1 py-2.5 text-sm font-medium z-10 transition-colors duration-300 ${role === "Professor" ? "text-white" : "text-slate-500"}`}
            >
              Professor
            </button>
            <motion.div 
              animate={{ x: role === "Student" ? "0%" : "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute top-1 left-1 bottom-1 w-[calc(50%-4px)] bg-slate-800 border border-slate-700/50 rounded-lg shadow-sm"
            />
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/40 border border-slate-800 focus:border-slate-600 focus:ring-1 focus:ring-slate-700 rounded-xl py-4 pl-12 pr-4 outline-none transition-all placeholder:text-slate-700 text-sm"
                  placeholder="name@university.edu"
                  required
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/40 border border-slate-800 focus:border-slate-600 focus:ring-1 focus:ring-slate-700 rounded-xl py-4 pl-12 pr-4 outline-none transition-all placeholder:text-slate-700 text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full py-4 bg-${accentColor}-600 hover:bg-${accentColor}-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-${accentColor}-900/20`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          <div className="pt-4 text-center space-y-4">
            <p className="text-sm text-slate-500">
              Don't have an account?{" "}
              <Link to="/register" className={`text-${accentColor}-400 hover:underline transition-all`}>
                Register here
              </Link>
            </p>
            <p className="text-[10px] text-slate-700 uppercase tracking-widest">
              By signing in, you agree to the Campus Copilot terms of service.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage; 