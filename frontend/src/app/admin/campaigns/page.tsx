"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Campaign {
  id: string;
  name: string;
  userId: string;
  targetGroup: string;
  targetCount: number;
  status: string;
  progress: number;
  totalSent: number;
  totalFailed: number;
  createdAt: number;
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    try {
      const res = await apiFetch("/admin/campaigns");
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  if (loading) return <div className="p-10 text-center text-emerald-500 font-bold">جاري تحميل جميع الحملات...</div>;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
      <div>
         <h2 className="text-3xl font-black text-white mb-2">📡 مراقبة الحملات (نظام)</h2>
         <p className="text-slate-400 font-semibold">استعراض كافة الحملات الجارية والمنتهية لجميع مستخدمي المنصة.</p>
      </div>

      <div className="grid gap-6">
        {campaigns.map((c) => (
          <div key={c.id} className="rounded-3xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl p-6 shadow-xl relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-1.5 h-full ${
                c.status === 'running' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                c.status === 'completed' ? 'bg-blue-500' : 'bg-slate-700'
            }`}></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">{c.name}</h3>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        c.status === 'running' ? 'bg-emerald-500/10 text-emerald-400' :
                        c.status === 'completed' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-500'
                    }`}>
                        {c.status}
                    </span>
                </div>
                <div className="flex gap-4 text-xs text-slate-500 font-bold">
                    <span>👤 مالك الحملة: <span className="text-slate-300">ID {c.userId}</span></span>
                    <span>📑 المجموعة: <span className="text-slate-300">{c.targetGroup}</span></span>
                    <span>📅 التاريخ: {new Date(c.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1">الإرسال</p>
                    <p className="text-2xl font-black text-white tabular-nums">{c.totalSent} <span className="text-xs text-slate-600">/ {c.targetCount}</span></p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1">الفشل</p>
                    <p className="text-2xl font-black text-rose-500 tabular-nums">{c.totalFailed}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
                 <div className="flex justify-between items-end">
                    <p className="text-xs font-black text-slate-400">تقدم الحملة</p>
                    <p className="text-xs font-black text-emerald-400">{c.progress}%</p>
                 </div>
                 <div className="h-2 w-full bg-slate-950/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        c.status === 'running' ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 animate-pulse' : 'bg-slate-700'
                      }`}
                      style={{ width: `${c.progress}%` }}
                    ></div>
                 </div>
            </div>
          </div>
        ))}

        {campaigns.length === 0 && (
          <div className="p-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
              <p className="text-slate-500 font-black text-xl">لا توجد حملات مسجلة في النظام حالياً.</p>
          </div>
        )}
      </div>
    </div>
  );
}
