"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { language } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError(language === 'ar' ? "كلمات المرور غير متطابقة" : "Passwords do not match");
    }
    
    setLoading(true);
    setError("");
    console.log("Attempting signup for:", email);
    try {
      const res = await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      if (res.ok && data.token) {
        console.log("Signup success, logging in...");
        login(data.token, data.user);
        // Redirection is handled by AuthContext.login
      } else {
        console.warn("Signup rejected:", data.error);
        setError(data.error || (language === 'ar' ? "فشل إنشاء الحساب" : "Signup failed"));
      }
    } catch (err) {
      console.error("Signup critical error:", err);
      setError(language === 'ar' ? "خطأ في الاتصال بالسيرفر. تأكد من تشغيل السيرفر." : "Server connection error. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/80 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
          
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
                <span className="text-slate-950 font-black text-3xl">M</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">إنشاء حساب جديد</h1>
            <p className="text-slate-400 font-medium text-sm">ابدأ حملاتك التسويقية في دقائق</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-widest">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-bold text-white placeholder:text-slate-600"
                placeholder="name@company.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-widest">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-bold text-white placeholder:text-slate-600"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-widest">تأكيد كلمة المرور</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-bold text-white placeholder:text-slate-600"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-rose-500 text-xs font-bold bg-rose-500/10 p-4 rounded-xl text-center border border-rose-500/20">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all transform hover:-translate-y-1 disabled:opacity-50"
            >
              {loading ? "⏳ جاري التسجيل..." : "ابدأ الآن مجاناً 🚀"}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-800/60 pt-8">
            <p className="text-slate-500 text-sm font-medium">
              لديك حساب بالفعل؟{" "}
              <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-bold underline underline-offset-4">تسجيل الدخول</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
