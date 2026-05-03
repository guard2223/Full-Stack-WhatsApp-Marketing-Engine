"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function AdminReportsPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCampaigns: 0,
    totalSent: 0,
    totalCreditsCharged: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all data to compute stats
        const usersResp = await apiFetch("/admin/users");
        const appCampaignsResp = await apiFetch("/admin/campaigns");
        const paymentsResp = await apiFetch("/admin/payments");

        const users = await usersResp.json();
        const campaigns = await appCampaignsResp.json();
        const payments = await paymentsResp.json();

        setStats({
          totalUsers: Array.isArray(users) ? users.length : 0,
          totalCampaigns: Array.isArray(campaigns) ? campaigns.length : 0,
          totalSent: Array.isArray(campaigns) ? campaigns.reduce((acc: number, c: any) => acc + (c.totalSent || 0), 0) : 0,
          totalCreditsCharged: Array.isArray(payments) ? payments.filter((p: any) => p.status === 'approved').reduce((acc: number, p: any) => acc + p.amount, 0) : 0,
          activeUsers: Array.isArray(users) ? users.filter((u: any) => u.credits > 0).length : 0,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-10 text-center text-emerald-500 font-bold">جاري استخراج التقارير...</div>;

  return (
    <div className="space-y-10 animate-in zoom-in-95 duration-500">
      <div>
        <h2 className="text-3xl font-black text-white mb-2">📋 تقارير النظام والإحصائيات</h2>
        <p className="text-slate-400 font-bold">ملخص شامل لأداء المنصة والعمليات المالية والحملات التسويقية.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="إجمالي الرسائل المرسلة" value={stats.totalSent.toLocaleString()} icon="📨" color="indigo" />
          <StatCard title="إجمالي المبيعات (نقاط)" value={stats.totalCreditsCharged.toLocaleString()} icon="💰" color="emerald" />
          <StatCard title="إجمالي المستخدمين" value={stats.totalUsers.toLocaleString()} icon="👥" color="blue" />
          <StatCard title="مستخدمين نشطين" value={stats.activeUsers.toLocaleString()} icon="🔥" color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-xl">
               <h3 className="text-xl font-black text-white mb-6">📊 أداء الحملات</h3>
               <div className="space-y-4">
                   <div className="flex justify-between items-center bg-slate-950/50 p-4 rounded-2xl">
                       <span className="text-slate-400 font-bold">عدد الحملات الكلي</span>
                       <span className="text-2xl font-black text-white">{stats.totalCampaigns}</span>
                   </div>
                   <div className="flex justify-between items-center bg-slate-950/50 p-4 rounded-2xl">
                       <span className="text-slate-400 font-bold">رسائل لكل مستخدم (متوسط)</span>
                       <span className="text-xl font-black text-white">
                           {stats.totalUsers > 0 ? (stats.totalSent / stats.totalUsers).toFixed(1) : 0}
                       </span>
                   </div>
               </div>
           </div>

           <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-xl flex flex-col justify-center">
                 <div className="text-center space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">تحديث البيانات</p>
                    <p className="text-sm text-slate-400">تعتمد التقارير على البيانات اللحظية من النظام.</p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="mt-4 px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all"
                    >
                        تحديث التقرير 🔄
                    </button>
                 </div>
           </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
    const colors: any = {
        indigo: "from-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/20",
        emerald: "from-emerald-500/20 to-green-500/20 text-emerald-400 border-emerald-500/20",
        blue: "from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/20",
        orange: "from-orange-500/20 to-yellow-500/20 text-orange-400 border-orange-500/20"
    };

    return (
        <div className={`rounded-3xl border ${colors[color]} bg-gradient-to-br p-6 shadow-xl relative group overflow-hidden`}>
            <div className={`absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/10 transition-all duration-700`}></div>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-black/20 rounded-xl text-2xl">{icon}</div>
                </div>
                <p className="text-4xl font-black text-white tabular-nums mb-1">{value}</p>
                <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">{title}</p>
            </div>
        </div>
    );
}
