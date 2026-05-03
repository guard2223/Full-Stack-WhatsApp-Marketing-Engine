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

interface ScheduledMessage {
    id: string;
    sessionId: string;
    targets: string[];
    message: string;
    scheduledAt: number;
    status: 'pending' | 'sent' | 'failed';
}

export default function ScheduleCampaignPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [devices, setDevices] = useState<Device[]>([]);
    const [selectedDevice, setSelectedDevice] = useState("");
    const [tasks, setTasks] = useState<ScheduledMessage[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form states
    const [numbersText, setNumbersText] = useState("");
    const [messageText, setMessageText] = useState("");
    const [scheduledDateTime, setScheduledDateTime] = useState("");

    useEffect(() => {
        if (!authLoading && !user) { router.push('/login'); return; }
        if (user) fetchData();
    }, [user, authLoading]);

    const fetchData = async () => {
        try {
            const [devRes, taskRes] = await Promise.all([
                apiFetch("/devices"),
                apiFetch("/schedule")
            ]);
            const connected = (await devRes.json()).filter((d: Device) => d.status === 'connected');
            setDevices(connected);
            if (connected.length > 0) setSelectedDevice(connected[0].sessionId);
            
            setTasks(await taskRes.json());
            setLoading(false);
        } catch (err) {
            console.error("Error fetching data", err);
            setLoading(false);
        }
    };

    const handleSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        const targets = numbersText.split('\n').map(n => n.trim()).filter(n => n !== "");
        if (targets.length === 0) return alert("الرجاء إدخال رقم واحد على الأقل.");
        if (!selectedDevice) return alert("الرجاء اختيار جهاز متصل.");
        if (!scheduledDateTime) return alert("الرجاء اختيار موعد الإرسال.");

        const timestamp = new Date(scheduledDateTime).getTime();
        if (timestamp <= Date.now()) return alert("يجب اختيار وقت في المستقبل.");

        setSaving(true);
        try {
            const res = await apiFetch("/schedule", {
                method: "POST",
                body: JSON.stringify({
                    sessionId: selectedDevice,
                    targets,
                    message: messageText,
                    scheduledAt: timestamp
                })
            });

            if (res.ok) {
                alert("📅 تم جدولة الرسالة بنجاح!");
                setNumbersText("");
                setMessageText("");
                setScheduledDateTime("");
                fetchData();
            } else {
                const err = await res.json();
                alert(`❌ خطأ: ${err.error}`);
            }
        } catch (err) {
            alert("خطأ في الاتصال بالخادم.");
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذه الجدولة؟")) return;
        setTasks(tasks.filter(t => t.id !== id));
        await apiFetch(`/schedule/${id}`, { method: "DELETE" });
    };

    if (authLoading || !user || loading) return <div className="flex items-center justify-center min-h-[60vh]">جاري التحميل...</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center flex-col md:flex-row justify-between bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
                <div className="relative z-10 text-right md:text-right w-full">
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">📅 جدولة الرسائل</h2>
                    <p className="text-slate-400 font-medium">اكتب رسالتك، حدد الأرقام، واختر التاريخ والوقت ليقوم النظام بإرسالها تلقائياً بالنيابة عنك.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form */}
                <div className="lg:col-span-5 bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[2rem] p-8 shadow-xl h-fit">
                    <h3 className="text-xl font-black text-white mb-6">⏰ إنشاء جدولة جديدة</h3>
                    <form onSubmit={handleSchedule} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">الجهاز المُرسِل</label>
                            <select 
                                value={selectedDevice} 
                                onChange={e => setSelectedDevice(e.target.value)}
                                className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 transition-all font-bold text-slate-300 appearance-none cursor-pointer text-sm"
                            >
                                {devices.map(d => (
                                    <option key={d.id} value={d.sessionId}>{d.name} ({d.phone})</option>
                                ))}
                                {devices.length === 0 && <option value="">لا توجد أجهزة متصلة</option>}
                            </select>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block flex justify-between">
                                <span>أرقام المستلمين</span>
                                <span className="text-amber-500 bg-amber-500/10 px-2 rounded">رقم بكل سطر</span>
                            </label>
                            <textarea 
                                rows={4} required
                                placeholder="966500000000&#10;966511111111"
                                value={numbersText} onChange={e => setNumbersText(e.target.value)}
                                className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 transition-all font-mono text-slate-300 text-sm resize-none"
                                dir="ltr"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">محتوى الرسالة</label>
                            <textarea 
                                rows={5} required
                                placeholder="مرحباً، يوجد لدينا عرض خاص..."
                                value={messageText} onChange={e => setMessageText(e.target.value)}
                                className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 transition-all font-bold text-white text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">تاريخ ووقت الإرسال</label>
                            <input 
                                type="datetime-local" required
                                value={scheduledDateTime} onChange={e => setScheduledDateTime(e.target.value)}
                                className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500 transition-all font-bold text-slate-300 text-sm"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={saving || !selectedDevice}
                            className="w-full py-4 mt-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black rounded-xl shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? '⏳ جاري الحفظ...' : '📅 اعتماد הגدولة'}
                        </button>
                    </form>
                </div>

                {/* Scheduled List */}
                <div className="lg:col-span-7 space-y-4">
                    <h3 className="text-xl font-black text-white px-2">الرسائل المجدولة ({tasks.length})</h3>
                    {tasks.length === 0 ? (
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[2rem] p-12 text-center flex flex-col justify-center items-center h-[400px]">
                            <span className="text-6xl mb-4 block opacity-50">💤</span>
                            <p className="text-slate-500 font-bold max-w-sm">لا توجد رسائل مجدولة حالياً.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                            {tasks.sort((a,b) => b.scheduledAt - a.scheduledAt).map(task => {
                                const dateObj = new Date(task.scheduledAt);
                                const isPending = task.status === 'pending';
                                
                                return (
                                    <div key={task.id} className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-5 shadow-xl transition-all relative overflow-hidden group hover:border-slate-700">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-lg border ${isPending ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : task.status === 'sent' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                                                    {isPending ? '⏳' : task.status === 'sent' ? '✅' : '❌'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-sm" dir="ltr">{dateObj.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                                    <p className="text-[10px] text-slate-500 font-black tracking-widest">{task.status.toUpperCase()}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-[10px] font-black text-slate-400">
                                                    إلى {task.targets.length} أرقام
                                                </span>
                                                <button onClick={() => handleDelete(task.id)} className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-800/50 hover:bg-rose-500 hover:text-white text-slate-400 transition-colors">
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                                            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-3">{task.message}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
