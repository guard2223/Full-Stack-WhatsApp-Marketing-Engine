"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiFetch } from "@/lib/api";

export default function CampaignsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
        router.push('/login');
        return;
    }

    if (user) {
        fetchCampaigns();
        const interval = setInterval(fetchCampaigns, 5000); // Live updates
        return () => clearInterval(interval);
    }
  }, [user, authLoading]);

  const fetchCampaigns = async () => {
    try {
      const res = await apiFetch("/campaigns");
      const data = await res.json();
      setCampaigns(data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch campaigns", err);
      setLoading(false);
    }
  };

  const handleLaunchCampaign = async (id: string) => {
    try {
      await apiFetch(`/campaigns/${id}/start`, { method: "POST" });
      fetchCampaigns();
    } catch (err) {
      alert(language === 'ar' ? "فشل إطلاق الحملة" : "Failed to launch campaign");
    }
  };

  if (authLoading || !user) return <div className="flex items-center justify-center min-h-[60vh] text-emerald-500 font-bold italic animate-pulse">{t.verifyingIdentity}</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row items-center justify-between bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden gap-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="relative z-10 text-center md:text-right">
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">{t.campaignManagement}</h2>
          <p className="text-slate-400 font-medium">{t.manageCampaignsDesc}</p>
        </div>
        <Link 
          href="/campaigns/create"
          className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all transform hover:-translate-y-1 relative z-10 flex items-center gap-3"
        >
          <span>{t.startNewCampaign}</span>
          <span className="text-xl">✨</span>
        </Link>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800/60 bg-slate-900/20 flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="text-xl font-bold text-white">{t.pastActiveCampaigns}</h3>
            <div className="flex gap-2">
                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black rounded-full border border-blue-500/20">{t.count}: {campaigns.length}</span>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded-full border border-emerald-500/20">{t.credits}: {user.credits}</span>
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 text-[10px] font-black tracking-widest uppercase">
                <th className={`px-8 py-5 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.campaignName}</th>
                <th className={`px-8 py-5 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.campaignStatus}</th>
                <th className={`px-8 py-5 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.progress}</th>
                <th className={`px-8 py-5 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.targets}</th>
                <th className={`px-8 py-5 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.launchDate}</th>
                <th className={`px-8 py-5 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {campaigns.map((camp) => (
                <tr key={camp.id} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="px-8 py-6">
                    <div className={`flex items-center gap-3 ${language === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🚀</div>
                        <span className="font-black text-white text-lg">{camp.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black shadow-sm border ${
                      camp.status === 'running' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 animate-pulse' :
                      camp.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      camp.status === 'paused' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                      'bg-slate-800/40 text-slate-400 border border-slate-700/50'
                    }`}>
                      {camp.status === 'running' ? t.running :
                       camp.status === 'completed' ? t.completed :
                       camp.status === 'paused' ? (language === 'ar' ? 'متوقفة' : 'Paused') : (language === 'ar' ? 'مسودة' : 'Draft')}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="w-full max-w-[120px] space-y-2">
                        <div className={`flex justify-between text-[10px] font-black text-slate-500 ${language === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}>
                            <span>{camp.progress || 0}%</span>
                            <span dir="ltr">{camp.totalSent || 0} / {camp.targetCount || 0}</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800/50">
                            <div 
                                className="bg-gradient-to-r from-emerald-500 to-green-500 h-full rounded-full transition-all duration-1000"
                                style={{ width: `${camp.progress}%` }}
                            ></div>
                        </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-slate-300 font-black">
                    {camp.targetCount} <span className="text-[10px] text-slate-600">
                        {language === 'ar' ? (camp.targetCount >= 3 && camp.targetCount <= 10 ? 'عملاء' : 'عميل') : t.customers}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-slate-500 text-sm font-bold" dir="ltr">
                    {new Date(camp.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </td>
                  <td className="px-8 py-6">
                    {camp.status === 'draft' || camp.status === 'paused' ? (
                      <button 
                         onClick={() => handleLaunchCampaign(camp.id)}
                         className="px-6 py-2.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white font-black rounded-xl border border-emerald-500/20 transition-all flex items-center gap-2 group-hover:shadow-lg group-hover:shadow-emerald-500/20"
                      >
                         <span>{language === 'ar' ? 'إطلاق الآن' : 'Launch Now'}</span>
                         <span className="text-xl animate-bounce">⚡</span>
                      </button>
                    ) : camp.status === 'running' ? (
                      <div className="flex items-center gap-2 text-emerald-500 font-black text-xs bg-emerald-500/5 px-4 py-2 rounded-xl border border-emerald-500/10">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                        <span>{t.running}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-blue-400 font-black text-xs bg-blue-500/5 px-4 py-2 rounded-xl border border-blue-500/10">
                        <span>✅ {t.completed}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && !loading && (
                  <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-4 opacity-40">
                              <span className="text-6xl">📭</span>
                              <p className="font-bold text-slate-300">{language === 'ar' ? 'لا يوجد حملات مضافة حالياً' : 'No campaigns added yet'}</p>
                              <Link href="/campaigns/create" className="text-emerald-400 font-black hover:underline">{language === 'ar' ? 'أطلق أول حملة لك الآن!' : 'Launch your first campaign now!'}</Link>
                          </div>
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
