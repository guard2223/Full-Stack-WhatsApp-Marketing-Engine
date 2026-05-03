"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export default function LicensePage() {
    const [status, setStatus] = useState<any>(null);
    const [key, setKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const fetchStatus = async () => {
        const res = await apiFetch("/license/status");
        if (res.ok) {
            const data = await res.json();
            setStatus(data);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: "", text: "" });

        try {
            const res = await apiFetch("/license/activate", {
                method: "POST",
                body: JSON.stringify({ key })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: "success", text: data.message });
                setTimeout(() => window.location.href = "/dashboard", 2000);
            } else {
                setMessage({ type: "error", text: data.error });
            }
        } catch (err) {
            setMessage({ type: "error", text: "خطأ في الاتصال بالسيرفر" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -z-10 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] -z-10 animate-pulse"></div>

            <div className="max-w-md w-full space-y-8 text-center">
                {/* Logo Area */}
                <div className="space-y-4">
                    <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-3 hover:rotate-12 transition-transform duration-500">
                        <span className="text-4xl font-black italic">S</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white via-blue-100 to-slate-400 bg-clip-text text-transparent">سادن وا | Saden WA</h1>
                </div>

                {/* Status Card */}
                <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/50 p-8 rounded-[2.5rem] shadow-3xl space-y-6">
                    {status?.expired ? (
                        <div className="space-y-2">
                            <div className="text-rose-500 text-6xl mb-4">🔒</div>
                            <h2 className="text-2xl font-black text-rose-500">انتهت فترة التجربة</h2>
                            <p className="text-slate-400 font-medium">يرجى إدخال كود التفعيل لمتابعة استخدام المنصة.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-blue-500 text-6xl mb-4">⏳</div>
                            <h2 className="text-2xl font-black text-white">فترة تجريبية نشطة</h2>
                            <p className="text-slate-400 font-medium">متبقي لك <span className="text-blue-400 font-black">{status?.daysLeft}</span> يوم على انتهاء التجربة.</p>
                        </div>
                    )}

                    <form onSubmit={handleActivate} className="space-y-4 pt-4">
                        <div className="space-y-2 text-right">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">كود التفعيل</label>
                            <input 
                                type="text" 
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                placeholder="XXXX-XXXX-XXXX-XXXX"
                                className="w-full bg-black/50 border border-slate-800 rounded-2xl px-6 py-4 text-center font-mono tracking-[0.2em] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                                required
                            />
                        </div>

                        {message.text && (
                            <div className={`p-4 rounded-xl text-xs font-bold ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                {message.text}
                            </div>
                        )}

                        <button 
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? "جاري التحقق..." : "تفعيل النسخة الآن 🔥"}
                        </button>
                    </form>
                </div>

                <div className="pt-8">
                    <p className="text-slate-500 text-xs font-bold">
                        للحصول على كود التفعيل، تواصل مع الدعم الفني
                    </p>
                </div>
            </div>
        </div>
    );
}
