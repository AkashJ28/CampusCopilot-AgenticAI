import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, Lock, LogOut, Cpu, Send 
} from "lucide-react";
import ChangePasswordModal from "./ChangePasswordModal";

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastMetadata, setLastMetadata] = useState(null);
  const [currentThought, setCurrentThought] = useState("");
  
  const navigate = useNavigate();
  const getUser = () => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  };
  
  const userRef = useRef(getUser());
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(scrollToBottom, [messages, isLoading, currentThought]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = userRef.current;

    if (!token || !user) {
      navigate("/login");
    } else {
      setMessages([
        {
          from: "copilot",
          text: `Welcome, ${user?.name || "User"}!`,
        },
      ]);
    }
  }, [navigate]);

  const renderMessageContent = (text) => {
    if (typeof text !== 'string') {
        try { text = JSON.stringify(text); } catch(e) { text = String(text); }
    }
    if (text.includes("- ") || text.includes("* ")) {
        const lines = text.split('\n');
        return (
            <div className="space-y-2 mt-2">
                {lines.map((line, i) => {
                    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                        return (
                            <motion.div 
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              key={i} className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/30 text-slate-300 flex items-start"
                            >
                                <span className="text-indigo-400 mr-3 mt-1">•</span>
                                <span className="leading-relaxed">{line.replace(/^[-*]\s*/, '')}</span>
                            </motion.div>
                        );
                    }
                    return <p key={i} className="mb-2 text-slate-400 leading-relaxed">{line}</p>;
                })}
            </div>
        );
    }
    return <div className="whitespace-pre-wrap leading-relaxed text-slate-300">{text}</div>;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = { from: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/chat`,
        { message: input },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      let finalReply = response.data.reply;
      setMessages((prev) => [...prev, { from: "copilot", text: finalReply || "" }]);
      if (response.data.metadata) setLastMetadata(response.data.metadata);
      
    } catch (error) {
      setMessages((prev) => [...prev, { from: "copilot", text: "System encountered an error.", isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let interval;
    if (isLoading) {
      const thoughts = ["Analyzing...", "Searching records...", "Generating..."];
      let i = 0;
      interval = setInterval(() => {
        i = (i + 1) % thoughts.length;
        setCurrentThought(thoughts[i]);
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  if (!userRef.current) return null;
  const accentColor = userRef.current.role === "Student" ? "indigo" : "emerald";

  return (
    /* w-screen used to eliminate side gutters */
    <div className="flex h-screen w-screen bg-[#020617] text-slate-200 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-20 lg:w-72 bg-[#030712] border-r border-slate-900 flex flex-col z-30">
        <div className="p-6 mb-4 flex items-center justify-center lg:justify-start border-b border-slate-900/50">
          <div className={`w-10 h-10 rounded-xl bg-${accentColor}-600/20 border border-${accentColor}-500/30 flex items-center justify-center text-${accentColor}-400`}>
            <Cpu size={20} />
          </div>
          <h1 className="hidden lg:block ml-4 text-xl font-bold text-white tracking-tight">Campus<span className={`text-${accentColor}-500`}>Copilot</span></h1>
        </div>
        
        <div className="flex-1 px-4 py-4">
            <div className="hidden lg:block p-4 rounded-2xl bg-slate-900/30 border border-slate-800/50 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                Session Active
            </div>
        </div>

        <div className="p-4 border-t border-slate-900 space-y-2">
          {/* Settings changed to Change Password */}
          <button onClick={() => setIsModalOpen(true)} className="w-full flex items-center justify-center lg:justify-start px-3 py-3 text-slate-500 hover:bg-slate-900 hover:text-white rounded-xl transition-all group">
            <Lock size={18} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="hidden lg:block ml-3 font-medium text-sm">Change Password</span>
          </button>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="w-full flex items-center justify-center lg:justify-start px-3 py-3 text-rose-500/70 hover:bg-rose-500/5 hover:text-rose-400 rounded-xl transition-all group">
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="hidden lg:block ml-3 font-medium text-sm">Disconnect</span>
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative min-w-0">
        
        {/* Header - Node Edge and Encrypted removed */}
        <header className="h-14 bg-black/20 backdrop-blur-md border-b border-white/5 flex items-center px-8 z-20">
          <div className="flex items-center gap-6 text-[10px] font-mono tracking-widest text-slate-500">
            {lastMetadata?.total_latency_sec && (
              <div className="flex items-center gap-2">
                <Activity size={14} />
                <span>LATENCY: {lastMetadata.total_latency_sec.toFixed(2)}s</span>
              </div>
            )}
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 space-y-10 z-10 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-10">
            <AnimatePresence>
              {messages.map((msg, index) => {
                const isUser = msg.from === "user";
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={index} 
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mr-4 mt-1 shrink-0">
                            <Cpu size={14} className={`text-${accentColor}-400`} />
                        </div>
                    )}
                    <div className={`max-w-[85%] px-6 py-4 shadow-xl leading-relaxed ${
                        isUser 
                          ? `bg-${accentColor}-600 text-white rounded-2xl rounded-tr-none` 
                          : msg.isError 
                            ? "bg-rose-950/20 border border-rose-900/30 text-rose-200 rounded-2xl rounded-tl-none"
                            : "bg-slate-900/50 border border-slate-800/50 text-slate-300 rounded-2xl rounded-tl-none"
                      }`}
                    >
                      {isUser ? msg.text : renderMessageContent(msg.text)}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start ml-12">
                <div className="bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-xl font-mono text-[11px] text-slate-500 flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                    {currentThought}
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-10" />
          </div>
        </div>

        {/* Input Field */}
        <div className="p-6 lg:p-10 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent z-20">
          <div className="max-w-4xl mx-auto relative group">
            <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 focus-within:border-slate-700 transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Message Campus Copilot..."
                disabled={isLoading}
                className="flex-1 bg-transparent px-5 py-3 text-slate-200 placeholder-slate-600 focus:outline-none text-sm"
              />
              <button 
                onClick={handleSend} 
                disabled={isLoading || !input.trim()}
                className={`bg-${accentColor}-600 hover:bg-${accentColor}-500 disabled:bg-slate-800 disabled:text-slate-600 text-white p-3 rounded-xl transition-all ml-2`}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {isModalOpen && <ChangePasswordModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

export default ChatPage;