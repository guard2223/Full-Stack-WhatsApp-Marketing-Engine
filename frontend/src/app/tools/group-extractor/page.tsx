"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface GroupInfo {
    id: string;
    name: string;
    participantsCount: number;
}

export default function GroupExtractorPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [fetchingGroups, setFetchingGroups] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [selectedGroupName, setSelectedGroupName] = useState("");

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) {
        apiFetch("/devices").then(r => r.json()).then(data => {
            const connected = data.filter((d: any) => d.status?.toLowerCase() === 'connected');
            setDevices(connected);
            if (connected.length > 0) setSelectedDevice(connected[0].sessionId);
        });
    }
  }, [user, authLoading]);

  const handleFetchGroups = async () => {
    if (!selectedDevice) return;
    setFetchingGroups(true);
    setGroups([]);
    setParticipants([]);
    setSelectedGroupName("");
    try {
      const res = await apiFetch(`/whatsapp/${selectedDevice}/groups`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.map((g: any) => ({
            id: g.id,
            name: g.name || g.subject,
            participantsCount: g.participantsCount || 0
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingGroups(false);
    }
  };

  const extractParticipants = async (group: GroupInfo) => {
    setSelectedGroupName(group.name);
    setExtracting(true);
    setParticipants([]);
    try {
      const res = await apiFetch(`/whatsapp/${selectedDevice}/groups/${group.id}/participants`);
      if (res.ok) {
        const data = await res.json();
        setParticipants(data.participants || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExtracting(false);
    }
  };

  const downloadResults = () => {
    const text = participants.map(p => p.phone).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participants-${selectedGroupName || 'group'}.txt`;
    a.click();
  };

  const handleCopyAll = () => {
      const text = participants.map(p => p.phone).join('\n');
      navigator.clipboard.writeText(text);
      alert("تم نسخ جميع الأرقام!");
  };

  if (authLoading || !user) return <div className="flex items-center justify-center min-h-[60vh]">جاري التحميل...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 w-full">
          <h1 className="text-3xl font-black text-white mb-2">📥 مستخرج أعضاء الجروبات</h1>
          <p className="text-slate-400 font-bold">اختر الجهاز، اعرض مجموعاتك، ثم اسحب الأرقام بلمحة بصر.</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 shadow-xl">
        <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">الجهاز النشط</label>
            <select 
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-3.5 text-white outline-none focus:ring-2 ring-emerald-500/50 font-bold"
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
            >
                <option value="">-- اختر جهازاً --</option>
                {devices.map(d => (
                    <option key={d.sessionId} value={d.sessionId}>{d.phone} ({d.name})</option>
                ))}
            </select>
        </div>
        <button 
            onClick={handleFetchGroups}
            disabled={!selectedDevice || fetchingGroups}
            className="w-full py-4 bg-emerald-500 text-slate-950 font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
            {fetchingGroups ? "⏳ جاري جلب المجموعات..." : "📋 عرض مجموعاتي"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Groups Table */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[32px] p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-black text-white px-2">1. قائمة المجموعات ({groups.length})</h3>
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl overflow-hidden h-[500px]">
                <div className="h-full overflow-y-auto custom-scrollbar">
                    {groups.length > 0 ? (
                        <table className="w-full text-right text-xs">
                            <thead className="bg-slate-900 sticky top-0 font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                                <tr>
                                    <th className="px-4 py-3">الاسم</th>
                                    <th className="px-4 py-3 text-center">الأعضاء</th>
                                    <th className="px-4 py-3 text-center">إجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {groups.map(g => (
                                    <tr key={g.id} className={`hover:bg-emerald-500/5 transition-colors ${selectedGroupName === g.name ? 'bg-emerald-500/10' : ''}`}>
                                        <td className="px-4 py-4 font-bold text-slate-300 truncate max-w-[150px]">{g.name}</td>
                                        <td className="px-4 py-4 text-center font-mono text-slate-500">{g.participantsCount}</td>
                                        <td className="px-4 py-4 text-center">
                                            <button 
                                                onClick={() => extractParticipants(g)}
                                                className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg font-black hover:bg-emerald-500 hover:text-slate-900 transition-all text-[10px]"
                                            >
                                                سحب 🔥
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                            <span className="text-4xl">📋</span>
                            <p className="font-bold">اضغط على عرض المجموعات للبدء</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Right: Participants Results */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[32px] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-black text-white">2. الأعضاء المستخرجين</h3>
                {participants.length > 0 && (
                    <div className="flex gap-2">
                        <button onClick={handleCopyAll} className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-colors" title="نسخ الكل">📋</button>
                        <button onClick={downloadResults} className="px-4 py-1.5 bg-emerald-500 text-slate-950 text-xs font-black rounded-lg hover:scale-105 transition-all">تحميل TXT</button>
                    </div>
                )}
            </div>

            <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl overflow-hidden h-[500px] p-4">
                {extracting ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-emerald-500 font-bold animate-pulse">جاري استخراج الأرقام...</p>
                    </div>
                ) : participants.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 overflow-y-auto h-full custom-scrollbar pr-2">
                        {participants.map((p, idx) => (
                            <div key={idx} className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between group">
                                <span className="text-xs font-bold text-slate-400">{p.phone}</span>
                                <button 
                                    onClick={() => navigator.clipboard.writeText(p.phone)}
                                    className="opacity-0 group-hover:opacity-100 text-[10px] text-emerald-500 transition-all"
                                >
                                    نسخ
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                        <span className="text-4xl">👥</span>
                        <p className="font-bold">اختر جروب من الجدول لسحب أعضائه</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
