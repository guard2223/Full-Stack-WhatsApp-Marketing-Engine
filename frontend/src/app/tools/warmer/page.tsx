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

interface WarmingTask {
    id: string;
    devices: string[];
    minDelay: number;
    maxDelay: number;
    status: 'running' | 'stopped';
}

export default function WarmerPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [tasks, setTasks] = useState<WarmingTask[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
    const [minDelay, setMinDelay] = useState(15);
    const [maxDelay, setMaxDelay] = useState(45);

    useEffect(() => {
        if (!authLoading && !user) { router.push('/login'); return; }
        if (user) fetchData();
    }, [user, authLoading]);

    const fetchData = async () => {
        try {
            const [tasksRes, devicesRes] = await Promise.all([
                apiFetch("/warming"),
                apiFetch("/devices")
            ]);
            setTasks(await tasksRes.json());
            const allDevices: Device[] = await devicesRes.json();
            setDevices(allDevices.filter(d => d.status?.toLowerCase() === 'connected'));
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const toggleDeviceSelection = (sessionId: string) => {
        setSelectedDevices(prev => 
            prev.includes(sessionId) ? prev.filter(id => id !== sessionId) : [...prev, sessionId]
        );
    };

    const handleStartTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedDevices.length < 2) {
            alert("يرجى اختيار جهازين على الأقل لبدء التسخين المتبادل.");
            return;
        }
        try {
            const res = await apiFetch("/warming", {
                method: "POST",
                body: JSON.stringify({ devices: selectedDevices, minDelay, maxDelay })
            });
            if (res.ok) {
                setSelectedDevices([]);
                setMinDelay(15);
                setMaxDelay(45);
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const toggleTaskStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'running' ? 'stopped' : 'running';
        setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
        try {
            await apiFetch(`/warming/${id}/status`, {
                method: "PUT",
                body: JSON.stringify({ status: newStatus })
            });
        } catch (err) {
            fetchData();
        }
    };

    const deleteTask = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذه العملية؟")) return;
        setTasks(tasks.filter(t => t.id !== id));
        await apiFetch(`/warming/${id}`, { method: "DELETE" });
    };

    if (authLoading || !user) return <div className="flex items-center justify-center min-h-[60vh]">جاري التحميل...</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center flex-col md:flex-row justify-between bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
                <div className="relative z-10 text-right md:text-right w-full">
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">🔥 تسخين الحسابات (Account Warming)</h2>
                    <p className="text-slate-400 font-medium">حماية أرقامك من الحظر عن طريق تبادل المحادثات الطبيعية بين حساباتك المربوطة.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[2rem] p-8 shadow-xl">
                        <h3 className="text-xl font-black text-white mb-6">➕ بدء تسخين جديد</h3>
                        <form onSubmit={handleStartTask} className="space-y-6">
                            
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">تحديد الأجهزة المشاركة (اختر 2 على الأقل)</label>
                                <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                    {devices.length === 0 && <span className="text-xs text-orange-400 font-bold p-2 bg-orange-500/10 rounded-lg">لا توجد أجهزة متصلة حالياً.</span>}
                                    {devices.map(d => {
                                        const isSelected = selectedDevices.includes(d.sessionId);
                                        return (
                                            <div 
                                                key={d.id} 
                                                onClick={() => toggleDeviceSelection(d.sessionId)}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'bg-orange-500/10 border-orange-500/50' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-slate-600'}`}>
                                                        {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-bold ${isSelected ? 'text-orange-400' : 'text-slate-300'}`}>{d.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono tracking-wider">{d.phone}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">أقل تأخير (ثواني)</label>
                                    <input 
                                        type="number" required min={5}
                                        value={minDelay} onChange={e => setMinDelay(Number(e.target.value))}
                                        className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-orange-500 transition-all font-bold text-white text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">أقصى تأخير (ثواني)</label>
                                    <input 
                                        type="number" required min={10}
                                        value={maxDelay} onChange={e => setMaxDelay(Number(e.target.value))}
                                        className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-orange-500 transition-all font-bold text-white text-sm"
                                    />
                                </div>
                            </div>

                            <button type="submit" disabled={selectedDevices.length < 2} className="w-full py-4 mt-2 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                                بدء التسخين الآمن 🚀
                            </button>
                        </form>
                    </div>
                </div>

                {/* Tasks List */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="text-center py-20 text-slate-500 font-bold">جاري التحميل...</div>
                    ) : tasks.length === 0 ? (
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[2.5rem] p-12 text-center h-full flex flex-col justify-center">
                            <span className="text-6xl mb-6 block">🧊</span>
                            <h3 className="text-lg font-black text-white mb-2">لا يوجد عمليات تسخين الحسابات</h3>
                            <p className="text-slate-500 font-bold text-sm max-w-sm mx-auto leading-relaxed">حدد جهازين على الأقل وابدأ عملية التسخين لحماية أرقامك من حظر واتساب.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {tasks.map(task => {
                                const activeDevices = devices.filter(d => task.devices.includes(d.sessionId));
                                const isRunning = task.status === 'running';
                                
                                return (
                                    <div key={task.id} className={`group bg-slate-900/40 backdrop-blur-xl border ${isRunning ? 'border-orange-500/30' : 'border-slate-800/60'} rounded-3xl p-6 shadow-xl transition-all relative overflow-hidden flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center`}>
                                        
                                        {/* Status Glow */}
                                        <div className={`absolute top-0 right-0 w-2 h-full ${isRunning ? 'bg-orange-500 animate-pulse' : 'bg-slate-700'}`}></div>

                                        <div className="space-y-3 pr-4 flex-1 w-full">
                                            <div className="flex items-center gap-3">
                                                <span className={`flex h-3 w-3 relative`}>
                                                    {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>}
                                                    <span className={`relative inline-flex rounded-full h-3 w-3 ${isRunning ? 'bg-orange-500' : 'bg-slate-700'}`}></span>
                                                </span>
                                                <h4 className="text-lg font-black text-white">تسخين {task.devices.length} أجهزة</h4>
                                                <span className="px-2.5 py-1 rounded-lg bg-slate-950 text-[10px] font-black text-slate-400 border border-slate-800 uppercase tracking-widest">
                                                    تأخير: {task.minDelay}ث - {task.maxDelay}ث
                                                </span>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-2">
                                                {activeDevices.length > 0 ? activeDevices.map(d => (
                                                    <span key={d.id} className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                        {d.name}
                                                    </span>
                                                )) : (
                                                    <span className="text-xs text-rose-500 font-bold">الأجهزة غير متصلة حالياً</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 bg-slate-950/80 p-2 rounded-2xl border border-slate-800 w-full sm:w-auto justify-end">
                                            <button 
                                                onClick={() => toggleTaskStatus(task.id, task.status)}
                                                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${isRunning ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}
                                            >
                                                {isRunning ? 'إيقاف 🛑' : 'تشغيل ▶️'}
                                            </button>
                                            <div className="w-[1px] h-6 bg-slate-800"></div>
                                            <button onClick={() => deleteTask(task.id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 text-slate-500 hover:text-rose-500 transition-all">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
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
