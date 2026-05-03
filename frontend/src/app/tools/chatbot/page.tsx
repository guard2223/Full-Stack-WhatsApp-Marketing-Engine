"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

type MatchType = 'exact' | 'contains';

interface ChatbotRule {
    id: string;
    keyword: string;
    matchType: MatchType;
    replyMessage: string;
    deviceId: string;
    isActive: boolean;
}

interface Device {
    id: string;
    sessionId: string;
    phone: string;
    name: string;
}

export default function ChatbotPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [rules, setRules] = useState<ChatbotRule[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);

    const [newRule, setNewRule] = useState({
        matchType: "exact" as MatchType,
        deviceId: "all",
        delay: 0,
        mediaUrl: "",
        startTime: "",
        endTime: "",
        isGroupEnabled: false
    });
    const [keywords, setKeywords] = useState<string[]>([""]);
    const [replies, setReplies] = useState<string[]>([""]);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) { router.push('/login'); return; }
        if (user) {
            fetchData();
        }
    }, [user, authLoading]);

    const fetchData = async () => {
        try {
            const [rulesRes, devicesRes] = await Promise.all([
                apiFetch("/chatbot"),
                apiFetch("/devices")
            ]);
            setRules(await rulesRes.json());
            setDevices(await devicesRes.json());
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleAddRule = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalKeywords = keywords.map(k => k.trim()).filter(k => k !== "").join(", ");
        const finalReplies = replies.map(r => r.trim()).filter(r => r !== "").join(" | ");

        if (!finalKeywords || !finalReplies) return alert("يرجى إضافة كلمة مفتاحية ورد واحد على الأقل.");

        try {
            const res = await apiFetch("/chatbot", {
                method: "POST",
                body: JSON.stringify({
                    ...newRule,
                    keyword: finalKeywords,
                    replyMessage: finalReplies
                })
            });
            if (res.ok) {
                setKeywords([""]);
                setReplies([""]);
                setNewRule({ 
                    matchType: "exact", 
                    deviceId: "all",
                    delay: 0,
                    mediaUrl: "",
                    startTime: "",
                    endTime: "",
                    isGroupEnabled: false
                });
                setShowAdvanced(false);
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const addKeywordField = () => setKeywords([...keywords, ""]);
    const updateKeyword = (idx: number, val: string) => {
        const next = [...keywords];
        next[idx] = val;
        setKeywords(next);
    };
    const removeKeyword = (idx: number) => setKeywords(keywords.filter((_, i) => i !== idx));

    const addReplyField = () => setReplies([...replies, ""]);
    const updateReply = (idx: number, val: string) => {
        const next = [...replies];
        next[idx] = val;
        setReplies(next);
    };
    const removeReply = (idx: number) => setReplies(replies.filter((_, i) => i !== idx));

    const toggleRuleActive = async (id: string, currentStatus: boolean) => {
        setRules(rules.map(r => r.id === id ? { ...r, isActive: !currentStatus } : r));
        try {
            await apiFetch(`/chatbot/${id}`, {
                method: "PUT",
                body: JSON.stringify({ isActive: !currentStatus })
            });
        } catch (err) {
            fetchData(); // revert on fail
        }
    };

    const deleteRule = async (id: string) => {
        if (!confirm("هل تريد بالتأكيد حذف هذه القاعدة؟")) return;
        setRules(rules.filter(r => r.id !== id));
        await apiFetch(`/chatbot/${id}`, { method: "DELETE" });
    };

    if (authLoading || !user) return <div className="flex items-center justify-center min-h-[60vh]">جاري التحميل...</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header */}
            <div className="flex items-center flex-col md:flex-row justify-between bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
                <div className="relative z-10 text-right md:text-right w-full">
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">🤖 الشات بوت الذكي</h2>
                    <p className="text-slate-400 font-medium">رد آلي ذكي على عملائك بناءً على الكلمات المفتاحية التي يرسلونها.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Rule Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[2rem] p-8 shadow-xl">
                        <h3 className="text-xl font-black text-white mb-6">➕ إضافة قاعدة جديدة</h3>
                        <form onSubmit={handleAddRule} className="space-y-6">
                            
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الجهاز المنفذ</label>
                                <select 
                                    className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-purple-500 transition-all font-bold text-slate-300 text-sm appearance-none cursor-pointer"
                                    value={newRule.deviceId} onChange={e => setNewRule({...newRule, deviceId: e.target.value})}
                                >
                                    <option value="all">🌐 الرد من جميع الأجهزة المتصلة</option>
                                    {devices.map(d => (
                                        <option key={d.id} value={d.sessionId}>{d.name} ({d.phone})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الكلمات المفتاحية</label>
                                    <button type="button" onClick={addKeywordField} className="text-[10px] font-black text-purple-400 hover:text-purple-300 transition-colors bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                                        + إضافة كلمة
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {keywords.map((kw, i) => (
                                        <div key={i} className="relative group">
                                            <input 
                                                type="text" required placeholder="مثال: السعر"
                                                value={kw} onChange={e => updateKeyword(i, e.target.value)}
                                                className="w-full px-5 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-purple-500 transition-all font-bold text-white text-sm"
                                            />
                                            {keywords.length > 1 && (
                                                <button type="button" onClick={() => removeKeyword(i)} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-rose-500 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">نوع التطابق</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setNewRule({...newRule, matchType: 'exact'})} className={`py-3 rounded-xl text-xs font-black transition-all border ${newRule.matchType === 'exact' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : 'bg-slate-950/50 text-slate-500 border-slate-800 hover:border-slate-700'}`}>
                                        تطابق تام
                                    </button>
                                    <button type="button" onClick={() => setNewRule({...newRule, matchType: 'contains'})} className={`py-3 rounded-xl text-xs font-black transition-all border ${newRule.matchType === 'contains' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : 'bg-slate-950/50 text-slate-500 border-slate-800 hover:border-slate-700'}`}>
                                        يحتوي الكلمة
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ردود الروبوت (استخدم {'{name}'} للاسم)</label>
                                    <button type="button" onClick={addReplyField} className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                                        + إضافة رد
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {replies.map((rp, i) => (
                                        <div key={i} className="relative group">
                                            <textarea 
                                                required rows={2} placeholder="اكتب الرد هنا..."
                                                value={rp} onChange={e => updateReply(i, e.target.value)}
                                                className="w-full px-5 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition-all font-bold text-white text-sm resize-none"
                                            />
                                            {replies.length > 1 && (
                                                <button type="button" onClick={() => removeReply(i)} className="absolute left-2 top-3 text-slate-600 hover:text-rose-500 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="text-xs font-black text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                                >
                                    {showAdvanced ? '▼ إخفاء الخيارات المتقدمة' : '▶ خيارات متقدمة (وسائط، تأخير، مواعيد)'}
                                </button>
                                
                                {showAdvanced && (
                                    <div className="mt-4 space-y-4 p-4 bg-slate-950/30 rounded-2xl border border-slate-800/50 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">رابط الوسائط (صورة/فيديو/ملف)</label>
                                            <input 
                                                type="url" placeholder="https://..."
                                                value={newRule.mediaUrl} onChange={e => setNewRule({...newRule, mediaUrl: e.target.value})}
                                                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-purple-500 font-bold text-white text-xs"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">تأخير الرد (ثواني)</label>
                                                <input 
                                                    type="number" min="0" max="60"
                                                    value={newRule.delay} onChange={e => setNewRule({...newRule, delay: parseInt(e.target.value)})}
                                                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-purple-500 font-bold text-white text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1.5 flex flex-col justify-end">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" checked={newRule.isGroupEnabled} onChange={e => setNewRule({...newRule, isGroupEnabled: e.target.checked})} />
                                                    <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[15px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                                    <span className="mr-2 text-[10px] font-black text-slate-400">تفعيل للجروبات</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">بداية العمل</label>
                                                <input 
                                                    type="time"
                                                    value={newRule.startTime} onChange={e => setNewRule({...newRule, startTime: e.target.value})}
                                                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-purple-500 font-bold text-white text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">نهاية العمل</label>
                                                <input 
                                                    type="time"
                                                    value={newRule.endTime} onChange={e => setNewRule({...newRule, endTime: e.target.value})}
                                                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-purple-500 font-bold text-white text-xs"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="w-full py-4 mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                                حفظ و تفعيل الروبوت ⚡
                            </button>
                        </form>
                    </div>
                </div>

                {/* Rules List */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="text-center py-20 text-slate-500 font-bold">جاري تحميل قواعد الذكاء الاصطناعي...</div>
                    ) : rules.length === 0 ? (
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[2.5rem] p-12 text-center">
                            <span className="text-6xl mb-6 block">😴</span>
                            <h3 className="text-xl font-black text-white mb-2">الشات بوت نائم الآن</h3>
                            <p className="text-slate-500 font-bold text-sm max-w-sm mx-auto">قم بإضافة قواعد جديدة من القائمة الجانبية ليبدأ البوت في الرد التلقائي على العملاء نيابة عنك.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {rules.map(rule => (
                                <div key={rule.id} className={`group bg-slate-900/40 backdrop-blur-xl border ${rule.isActive ? 'border-purple-500/30' : 'border-slate-800/60'} rounded-3xl p-6 shadow-xl transition-all hover:bg-slate-800/40 relative overflow-hidden flex flex-col md:flex-row gap-6 justify-between items-start md:items-center`}>
                                    
                                    <div className={`absolute top-0 right-0 w-2 h-full ${rule.isActive ? 'bg-purple-500' : 'bg-slate-700'}`}></div>

                                    <div className="space-y-4 pr-6 flex-1 w-full">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {rule.keyword.split(/[,\n]/).filter(k => k.trim() !== "").map((k, idx) => (
                                                <span key={idx} className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-400 font-black text-sm border border-purple-500/20 shadow-sm">
                                                    {k.trim()}
                                                </span>
                                            ))}
                                            <span className="px-2.5 py-1 rounded-lg bg-slate-950 text-[10px] font-black text-slate-400 border border-slate-800 uppercase tracking-widest mr-2">
                                                {rule.matchType === 'exact' ? 'تطابق تام' : 'يحتوي الكلمة'}
                                            </span>
                                            {rule.isGroupEnabled && (
                                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-[10px] font-black text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">مجموعات ✅</span>
                                            )}
                                            {rule.delay > 0 && (
                                                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-[10px] font-black text-amber-400 border border-amber-500/20 uppercase tracking-widest">تأخير {rule.delay}ث</span>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">ردود الروبوت المحتملة:</p>
                                            <div className="grid grid-cols-1 gap-2">
                                                {rule.replyMessage.split('|').filter(r => r.trim() !== "").map((r, idx) => (
                                                    <div key={idx} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50 text-sm font-bold text-slate-300 flex items-start gap-3">
                                                        <span className="text-purple-500 mt-1">●</span>
                                                        {r.trim()}
                                                    </div>
                                                ))}
                                            </div>
                                            {rule.mediaUrl && (
                                                <p className="text-[10px] font-black text-emerald-500 mt-2">📎 مرفق وسائط: {rule.mediaUrl.split('/').pop()}</p>
                                            )}
                                            {rule.startTime && (
                                                <p className="text-[10px] font-black text-blue-400 mt-1">🕒 ساعات العمل: {rule.startTime} إلى {rule.endTime}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 bg-slate-950/80 p-2 rounded-2xl border border-slate-800 w-full md:w-auto justify-end">
                                        <label className="relative inline-flex items-center cursor-pointer px-4">
                                            <input type="checkbox" className="sr-only peer" checked={rule.isActive} onChange={() => toggleRuleActive(rule.id, rule.isActive)} />
                                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[18px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                                            <span className="mr-3 text-xs font-black text-slate-400 peer-checked:text-purple-400">{rule.isActive ? 'مُفعل' : 'مُعطل'}</span>
                                        </label>
                                        <div className="w-[1px] h-8 bg-slate-800"></div>
                                        <button onClick={() => deleteRule(rule.id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>

                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
