"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    console.log("Attempting login for:", email);
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      if (res.ok && data.token) {
        console.log("Login API success, updating context...");
        login(data.token, data.user);
        // AuthContext now handles the redirect to /dashboard
      } else {
        console.warn("Login API rejected or missing token:", data.error || "No token received");
        setError(data.error || (language === 'ar' ? "فشل تسجيل الدخول: لم يتم استلام رمز الدخول" : "Login failed: No token received"));
      }
    } catch (err) {
      console.error("Login critical error:", err);
      setError("Cannot connect to server. Make sure the backend is running on port 4000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      <div className="w-full max-w-[400px] relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-500/20">
                <span className="text-slate-950 font-black text-3xl">S</span>
            </div>
            <h1 className="text-3xl font-black text-white">تسجيل الدخول</h1>
            <p className="text-slate-500 text-sm mt-2 font-bold">أهلاً بك مجدداً في Saden WA</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/60 p-8 rounded-[32px] shadow-2xl space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold text-center animate-shake">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">البريد الإلكتروني</label>
              <input
                type="email"
                required
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-3.5 text-white focus:ring-2 ring-emerald-500/40 outline-none transition-all placeholder:text-slate-700"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">كلمة المرور</label>
              <input
                type="password"
                required
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-3.5 text-white focus:ring-2 ring-emerald-500/40 outline-none transition-all placeholder:text-slate-700"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-emerald-400 to-green-600 text-slate-950 font-black rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "جاري الدخول..." : "دخول الآن 🚀"}
            </button>
          </form>

          <div className="text-center pt-4 border-t border-slate-800/60">
            <p className="text-sm text-slate-500 font-bold">
              ليس لديك حساب؟{" "}
              <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                 إنشاء حساب جديد
              </Link>
            </p>
          </div>
        </div>
        
        <p className="text-center text-slate-600 text-[10px] mt-8 font-bold uppercase tracking-widest">
            Saden WA Engine &copy; 2026 - Advanced Marketing Tools
        </p>
      </div>
    </div>
  );
}
