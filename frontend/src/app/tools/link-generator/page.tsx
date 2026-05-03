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

interface GroupInfo {
    id: string;
    name: string;
    participantsCount: number;
    link?: string;
    fetching?: boolean;
    error?: string;
}

export default function LinkGeneratorPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [devices, setDevices] = useState<Device[]>([]);
    const [selectedDevice, setSelectedDevice] = useState("");
    const [groups, setGroups] = useState<GroupInfo[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [fetchingGroups, setFetchingGroups] = useState(false);
    const [copiedId, setCopiedId] = useState("");

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

    const handleFetchGroups = async () => {
        if (!selectedDevice) return;
        setFetchingGroups(true);
        setGroups([]);
        try {
            const res = await apiFetch(`/whatsapp/${selectedDevice}/groups`);
            if (res.ok) {
                const data = await res.json();
                // Map to our GroupInfo interface
                const mapped: GroupInfo[] = data.map((g: any) => ({
                    id: g.id,
                    name: g.name || g.subject,
                    participantsCount: g.participantsCount || 0
                }));
                setGroups(mapped);
            } else {
                alert("حدث خطأ أثناء جلب قائمة الجروبات.");
            }
        } catch (e) {
            alert("خطأ في الاتصال بالخادم.");
        }
        setFetchingGroups(false);
    };

    const fetchSingleLink = async (groupId: string) => {
        // Mark this group as fetching
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, fetching: true, error: "" } : g));
        
        try {
            const res = await apiFetch(`/whatsapp/${selectedDevice}/groups/invite-code?groupId=${groupId}`);
            const data = await res.json();
            
            if (res.ok && data.link) {
                setGroups(prev => prev.map(g => g.id === groupId ? { ...g, link: data.link, fetching: false } : g));
            } else {
                setGroups(prev => prev.map(g => g.id === groupId ? { ...g, fetching: false, error: data.error || "فشل الجلب" } : g));
                if (data.error?.includes("admin")) {
                    alert("⚠️ عذراً! استخراج 'رابط الدعوة' يتطلب أن تكون مشرفاً. إذا كنت تريد 'سحب الأرقام' فقط، يرجى الانتقال لأداة (مستخرج الأعضاء).");
                }
            }
        } catch (e) {
            setGroups(prev => prev.map(g => g.id === groupId ? { ...g, fetching: false, error: "خطأ اتصال" } : g));
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(""), 2000);
    };

    if (authLoading || !user || loading) return <div className="flex items-center justify-center min-h-[60vh]">جاري التحميل...</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center flex-col md:flex-row justify-between bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl" />
                <div className="relative z-10 text-right md:text-right w-full flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">🔗 مولد الروابط الذكي</h2>
                        <p className="text-slate-400 font-medium">اعرض مجموعاتك أولاً، ثم استخرج روابط المجموعات التي تديرها بضغطة واحدة.</p>
                    </div>
                    <button 
                        onClick={() => router.push('/tools/group-extractor')}
                        className="px-6 py-2.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl font-black hover:bg-emerald-500 hover:text-slate-900 transition-all text-xs"
                    >
                        سحب أعضاء الجروب بدلاً من الرابط ؟ 👥
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row gap-4 justify-between items-end">
                <div className="w-full md:w-1/2 space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">اختر الجهاز المتصل</label>
                    <select 
                        value={selectedDevice} 
                        onChange={e => setSelectedDevice(e.target.value)}
                        className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-pink-500 transition-all font-bold text-slate-300 text-sm appearance-none cursor-pointer"
                    >
                        {devices.map(d => (
                            <option key={d.id} value={d.sessionId}>{d.name} ({d.phone})</option>
                        ))}
                        {devices.length === 0 && <option value="">لا توجد أجهزة متصلة</option>}
                    </select>
                </div>
                
                <button 
                    onClick={handleFetchGroups}
                    disabled={!selectedDevice || fetchingGroups}
                    className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                    {fetchingGroups ? '⏳ جاري جلب المجموعات...' : '📋 عرض مجموعاتي'}
                </button>
            </div>

            {/* Groups List */}
            {groups.length > 0 && (
                <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 shadow-xl space-y-6">
                    <div className="flex items-center gap-3">
                        <h3 className="text-xl font-black text-white">المجموعات المتاحة</h3>
                        <span className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded-lg text-sm font-bold border border-pink-500/30">
                            {groups.length} مجموعة
                        </span>
                    </div>

                    <div className="bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase sticky top-0 z-10 font-black backdrop-blur-md">
                                    <tr>
                                        <th className="px-6 py-4">اسم الجروب</th>
                                        <th className="px-6 py-4 text-center">الأعضاء</th>
                                        <th className="px-6 py-4">رابط الدعوة</th>
                                        <th className="px-6 py-4 text-center">إجراء</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {groups.map(g => (
                                        <tr key={g.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-200">
                                                {g.name}
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono text-slate-500">
                                                {g.participantsCount}
                                            </td>
                                            <td className="px-6 py-4">
                                                {g.link ? (
                                                    <span className="font-mono text-pink-400 text-[11px] break-all">{g.link}</span>
                                                ) : g.error ? (
                                                    <span className="text-rose-500 text-[10px] font-bold">{g.error}</span>
                                                ) : (
                                                    <span className="text-slate-600 text-[10px]">---</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {g.link ? (
                                                    <button 
                                                        onClick={() => handleCopy(g.link!, g.id)}
                                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${copiedId === g.id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'}`}
                                                    >
                                                        {copiedId === g.id ? 'تم النسخ ✅' : 'نسخ الرابط 📋'}
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => fetchSingleLink(g.id)}
                                                        disabled={g.fetching}
                                                        className="px-4 py-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-500 border border-pink-500/20 rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        {g.fetching ? 'جاري...' : 'جلب الرابط 🪄'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
