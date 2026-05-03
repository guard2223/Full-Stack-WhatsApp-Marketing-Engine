"use client";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export default function NumberFilterPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [inputNumbers, setInputNumbers] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch("/devices").then(r => r.json()).then(data => {
      setDevices(data.filter((d: any) => d.status === 'connected'));
    });
  }, []);

  const handleFilter = async () => {
    if (!selectedDevice || !inputNumbers) return;
    
    const numbers = inputNumbers.split('\n').map(n => n.trim()).filter(n => n.length > 5);
    if (numbers.length === 0) return;

    setLoading(true);
    setResults([]);
    try {
      const res = await apiFetch(`/whatsapp/${selectedDevice}/filter`, {
        method: "POST",
        body: JSON.stringify({ numbers })
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadExists = () => {
    const text = results.filter(r => r.exists).map(r => r.phone).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exists_on_whatsapp.txt`;
    a.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-black text-white mb-2">🧪 فلترة أرقام الواتساب</h1>
        <p className="text-slate-400 font-bold">تأكد من وجود الأرقام على واتساب قبل بدء حملتك لتوفير رصيدك وحماية حسابك.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[32px] space-y-6 flex flex-col h-full">
            <div className="space-y-4">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">1. اختر جهاز الفحص</label>
                <select 
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white outline-none focus:ring-2 ring-emerald-500/50"
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                >
                    <option value="">-- اختر جهازاً متصلاً --</option>
                    {devices.map(d => (
                    <option key={d.sessionId} value={d.sessionId}>{d.phone} ({d.name})</option>
                    ))}
                </select>
            </div>

            <div className="flex-1 space-y-4">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">2. أدخل الأرقام (رقم في كل سطر)</label>
                <textarea 
                    className="w-full h-80 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 ring-emerald-500/50 custom-scrollbar font-mono text-sm leading-relaxed"
                    placeholder="201012345678&#10;201212345678"
                    value={inputNumbers}
                    onChange={(e) => setInputNumbers(e.target.value)}
                ></textarea>
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">تنبيه: سيتم فحص الأرقام المكتوبة بشكل صحيح فقط.</p>
            </div>

            <button 
                onClick={handleFilter}
                disabled={!selectedDevice || !inputNumbers || loading}
                className="w-full py-4 bg-emerald-500 text-slate-950 font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
            >
                {loading ? "جاري الفحص..." : "بدء عملية الفلترة الآن 🚀"}
            </button>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-[32px] p-8 h-full min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">النتائج الفورية ({results.length})</h3>
                {results.length > 0 && (
                    <button onClick={downloadExists} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-black rounded-xl hover:bg-emerald-500/20 transition-all">
                        تحميل الأرقام المفعلة ✅
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/50 rounded-2xl border border-slate-800/60 flex flex-col">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 p-20 text-center">
                         <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                         <p className="text-emerald-500 font-bold animate-pulse">جاري التحقق من الأرقام على سيرفرات واتساب...</p>
                    </div>
                ) : results.length > 0 ? (
                    <div className="divide-y divide-slate-800/50">
                        {results.map((r, idx) => (
                            <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-900/40 transition-colors">
                                <span className={`text-xs font-black ${r.exists ? 'text-white' : 'text-slate-600'}`}>{r.phone}</span>
                                {r.exists ? (
                                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">على واتساب ✅</span>
                                ) : (
                                    <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-1 rounded-lg">غير موجود ❌</span>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 p-20 text-center">
                         <div className="text-6xl grayscale opacity-30">🔍</div>
                         <p className="font-bold text-sm">سيظهر هنا حالة كل رقم (مفعل أو غير مفعل) بعد بدء العملية.</p>
                    </div>
                )}
            </div>
            
            {results.length > 0 && (
                <div className="mt-6 p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex justify-around items-center">
                    <div className="text-center">
                        <p className="text-[10px] text-slate-500 font-black">موجود</p>
                        <p className="text-lg font-black text-emerald-500">{results.filter(r => r.exists).length}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-800"></div>
                    <div className="text-center">
                        <p className="text-[10px] text-slate-500 font-black">غير موجود</p>
                        <p className="text-lg font-black text-rose-500">{results.filter(r => !r.exists).length}</p>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
