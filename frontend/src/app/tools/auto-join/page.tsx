"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

interface Device {
    id: string;
    sessionId: string;
    phone: string;
    name: string;
    status: 'connected' | 'disconnected';
}

export default function AutoJoinPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [devices, setDevices] = useState<Device[]>([]);
    const [selectedDevice, setSelectedDevice] = useState("");
    const [linksText, setLinksText] = useState("");
    const [delay, setDelay] = useState(15);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) { router.push('/login'); return; }
        if (user) fetchDevices();
    }, [user, authLoading]);

    const fetchDevices = async () => {
        try {
            const res = await apiFetch("/devices");
            const data: Device[] = await res.json();
            const connected = data.filter(d => d.status?.toLowerCase() === 'connected');
            setDevices(connected);
            if (connected.length > 0) setSelectedDevice(connected[0].sessionId);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching devices", err);
            setLoading(false);
        }
    };

    const handleStartJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Parse links
        const rawLinks = linksText.split('\n').map(l => l.trim()).filter(l => l !== "");
        // Basic validation
        const validLinks = rawLinks.filter(l => l.includes("chat.whatsapp.com/"));

        if (validLinks.length === 0) {
            alert("الرجاء إدخال رابط واحد صحيح على الأقل (يحتوي على chat.whatsapp.com)");
            return;
        }

        if (!selectedDevice) {
            alert("الرجاء اختيار جهاز متصل.");
            return;
        }

        setRunning(true);
        try {
            const res = await apiFetch(`/whatsapp/${selectedDevice}/groups/join-bulk`, {
                method: "POST",
                body: JSON.stringify({ links: validLinks, delay })
            });

            if (res.ok) {
                alert(`🚀 تم بدء الانضمام التلقائي لـ ${validLinks.length} جروب في الخلفية!`);
                setLinksText("");
            } else {
                const err = await res.json();
                alert(`❌ حدث خطأ: ${err.error}`);
            }
        } catch (err) {
            alert("❌ خطأ في الاتصال بالخادم.");
        }
        setRunning(false);
    };

    if (authLoading || !user || loading) return <div className="flex items-center justify-center min-h-[60vh]">جاري التحميل...</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center flex-col md:flex-row justify-between bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="relative z-10 text-right md:text-right w-full">
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">🚪 الانضمام التلقائي للجروبات</h2>
                    <p className="text-slate-400 font-medium">أضف قائمة بروابط مجموعات الواتساب وسيقوم النظام بالانضمام لها تلقائياً باستخدام جهازك بفاصل زمني آمن لتجنب الحظر.</p>
                </div>
            </div>

            {/* Main Form */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[2rem] p-8 shadow-xl">
                <form onSubmit={handleStartJoin} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">الجهاز المُستخدم للإنضمام</label>
                            <select 
                                value={selectedDevice} 
                                onChange={e => setSelectedDevice(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-emerald-500 transition-all font-bold text-slate-300 appearance-none cursor-pointer"
                            >
                                {devices.map(d => (
                                    <option key={d.id} value={d.sessionId}>{d.name} ({d.phone})</option>
                                ))}
                                {devices.length === 0 && <option value="">لا توجد أجهزة متصلة</option>}
                            </select>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">الفاصل الزمني (بالثواني)</label>
                            <input 
                                type="number" min={10} required
                                value={delay} onChange={e => setDelay(Number(e.target.value))}
                                className="w-full px-5 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-emerald-500 transition-all font-bold text-white"
                                placeholder="مثال: 15"
                            />
                            <p className="text-[10px] text-slate-500 font-bold mt-1">يُنصح بـ 15 ثانية على الأقل لتجنب حظر الرقم.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block flex justify-between">
                            <span>روابط الدعوة للجروبات</span>
                            <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">رابط واحد في كل سطر</span>
                        </label>
                        <textarea 
                            rows={8} required
                            placeholder="https://chat.whatsapp.com/INVITE_CODE_1&#10;https://chat.whatsapp.com/INVITE_CODE_2"
                            value={linksText} onChange={e => setLinksText(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-emerald-500 transition-all font-bold text-slate-300 resize-y leading-relaxed"
                            style={{ direction: 'ltr', textAlign: 'left' }}
                        />
                        <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                            <span>الروابط الصالحة المكتشفة: {linksText.split('\n').filter(l => l.includes('chat.whatsapp.com/')).length} رابط</span>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={running || !selectedDevice || !linksText.trim()}
                            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                        >
                            {running ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    جاري الإرسال للمحرك...
                                </>
                            ) : (
                                <>🚀 بدء الانضمام التلقائي</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
