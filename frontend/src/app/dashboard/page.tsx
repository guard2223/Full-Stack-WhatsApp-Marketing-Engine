"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiFetch } from "@/lib/api";

const allFeatures = [
    { title: "رسائل جماعية", desc: "إرسال لعدد كبير بسرعة وتحكم كامل.", icon: "📨", href: "/campaigns/create" },
    { title: "إرسال سريع", desc: "توزيع الرسائل على عدة أرقام.", icon: "⚡", href: "/campaigns/create" },
    { title: "إدارة الاتصال", desc: "تنظيم الأرقام في قوائم ومجموعات.", icon: "👥", href: "/contacts" },
    { title: "فلترة الأرقام", desc: "فحص الأرقام المفعلة على واتساب.", icon: "🧪", href: "/tools/filter" },
    { title: "شات بوت ذكي", desc: "ردود تلقائية متطورة بالكلمات المفتاحية.", icon: "🤖", href: "#" },
    { title: "جدولة الرسائل", desc: "تحديد وقت وتاريخ الإرسال الآلي.", icon: "📅", href: "#" },
    { title: "سحب الجروبات", desc: "استخراج أعضاء الجروبات بلمحة بصري.", icon: "📥", href: "/tools/group-extractor" },
    { title: "تسخين الحساب", desc: "حماية الحساب من الحظر بالنشاط التدريجي.", icon: "🔥", href: "#" },
    { title: "سحب الشات", desc: "استرداد قائمة المحادثات السابقة.", icon: "💬", href: "#" },
    { title: "إضافة جماعية", desc: "إضافة أعضاء للجروبات بشكل آلي.", icon: "➕", href: "#" },
    { title: "أمان متور", desc: "تشفير تام وحماية لبياناتك وحساباتك.", icon: "🔐", href: "#" },
];

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  
  const [stats, setStats] = useState({ campaigns: 0, contacts: 0, devices: 0 });
  const [loading, setLoading] = useState(true);

  const allFeatures = [
    { title: t.bulkMessages, desc: t.bulkMessagesDesc, icon: "📨", href: "/campaigns/create" },
    { title: t.fastSend, desc: t.fastSendDesc, icon: "⚡", href: "/campaigns/create" },
    { title: t.contacts, desc: t.contactsDesc, icon: "👥", href: "/contacts" },
    { title: t.filtering, desc: t.filteringDesc, icon: "🧪", href: "/tools/filter" },
    { title: t.chatbot, desc: t.chatbotDesc, icon: "🤖", href: "#" },
    { title: t.scheduling, desc: t.schedulingDesc, icon: "📅", href: "#" },
    { title: t.extractor, desc: t.groupExtractDesc, icon: "📥", href: "/tools/group-extractor" },
    { title: t.warmer, desc: t.warmingDesc, icon: "🔥", href: "#" },
    { title: t.chatExtract, desc: t.chatExtractDesc, icon: "💬", href: "#" },
    { title: t.bulkAdd, desc: t.bulkAddDesc, icon: "➕", href: "#" },
    { title: t.advancedSecurity, desc: t.advancedSecurityDesc, icon: "🔐", href: "#" },
  ];

  useEffect(() => {
    if (!authLoading && !user) {
        router.push('/login');
        return;
    }

    if (user) {
        Promise.all([
            apiFetch("/campaigns").then(r => r.json()),
            apiFetch("/contacts").then(r => r.json()),
            apiFetch("/devices").then(r => r.json())
        ]).then(([camps, conts, devs]) => {
            const connectedDevs = Array.isArray(devs) ? devs.filter(d => d.status?.toLowerCase() === 'connected').length : 0;
            setStats({ 
                campaigns: Array.isArray(camps) ? camps.length : 0, 
                contacts: Array.isArray(conts) ? conts.length : 0,
                devices: connectedDevs 
            });
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }
  }, [user, authLoading]);

  if (authLoading || !user) return <div className="flex items-center justify-center min-h-[60vh] text-emerald-500 font-bold">{t.verifyingIdentity}</div>;

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-700 fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-white mb-2">🚀 {t.smartDashboard}</h2>
          <p className="text-slate-400 font-bold text-lg">{t.welcome}، <span className="text-emerald-400">{user.email.split('@')[0]}</span>. {t.readyToLaunch}</p>
        </div>
        <div className="flex bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-[24px] px-8 py-4 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 blur-xl rounded-full -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-all"></div>
             <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.availableCredits}</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-black text-white">{user.credits?.toLocaleString()}</p>
                    <span className="text-xs text-emerald-400 font-black uppercase">{t.points}</span>
                </div>
             </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t.serviceStatus} value={`${t.active} 🟢`} icon="📡" color="emerald" pulse />
        <StatCard title={t.totalCampaigns} value={stats.campaigns} icon="🚀" color="blue" />
        <StatCard title={t.contacts} value={stats.contacts} icon="👥" color="indigo" />
        <StatCard title={t.activeDevices} value={stats.devices} icon="📱" color="purple" />
      </div>

      {/* Featured Features Section (Requested) */}
      <div className="space-y-6">
          <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-white px-2">{t.platformFeatures}</h3>
              <Link href="/services" className="text-emerald-400 text-sm font-black hover:underline">{t.viewAll}</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allFeatures.map(f => (
                  <Link href={f.href} key={f.title} className={`p-4 rounded-3xl border border-slate-800 bg-slate-900/20 hover:bg-slate-800/40 transition-all group ${f.href === '#' ? 'cursor-not-allowed opacity-60' : 'hover:scale-105 active:scale-95'}`}>
                      <div className="text-2xl mb-2 group-hover:scale-110 transition-transform inline-block">{f.icon}</div>
                      <h4 className="font-black text-white text-sm mb-1">{f.title}</h4>
                      <p className="text-[10px] text-slate-500 font-bold leading-tight">{f.desc}</p>
                  </Link>
              ))}
          </div>
      </div>

      {/* Footer Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
             <div className="rounded-[32px] border border-slate-800 bg-slate-900/40 p-1 relative overflow-hidden flex flex-col md:flex-row gap-2">
                 <QuickLink href="/devices" icon="📱" title={t.connectDevices} color="from-purple-500/20 to-indigo-500/20" />
                 <QuickLink href="/contacts" icon="👥" title={t.contacts} color="from-emerald-500/20 to-green-500/20" />
                 <QuickLink href="/campaigns/create" icon="🚀" title={t.startCampaign} color="from-blue-500/20 to-cyan-500/20" />
                 <Link href="/services" className="md:w-16 h-16 md:h-auto flex items-center justify-center bg-slate-800/40 hover:bg-emerald-500 rounded-2xl md:rounded-[24px] text-white hover:text-slate-950 transition-all font-black" title={t.viewAll}>➕</Link>
             </div>
        </div>

        <div className="rounded-[32px] border border-slate-800 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 p-8 text-center space-y-4 shadow-2xl">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.needMore}</p>
             <Link href="/recharge" className="block w-full py-4 bg-emerald-500 text-slate-950 font-black rounded-2xl hover:scale-[1.03] active:scale-95 transition-all shadow-lg shadow-emerald-500/20">
                 {t.rechargeNow}
             </Link>
             <p className="text-[10px] text-slate-600 font-bold">{t.rechargeNumber}: 01026516115</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, pulse }: any) {
    const colors: any = {
        emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
        blue: "border-blue-500/20 bg-blue-500/5 text-blue-400",
        indigo: "border-indigo-500/20 bg-indigo-500/5 text-indigo-400",
        purple: "border-purple-500/20 bg-purple-500/5 text-purple-400"
    };

    return (
        <div className={`rounded-3xl border ${colors[color]} p-6 shadow-xl transition-all hover:scale-105`}>
            <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</span>
                <span className="text-xl">{icon}</span>
            </div>
            <div className="flex items-center gap-3">
                {pulse && <span className="flex h-3 w-3 relative"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative h-3 w-3 rounded-full bg-emerald-500"></span></span>}
                <span className="text-2xl font-black text-white">{value}</span>
            </div>
        </div>
    );
}

function QuickLink({ href, icon, title, color }: any) {
    return (
        <Link href={href} className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[22px] bg-gradient-to-br ${color} border border-white/5 hover:border-white/10 transition-all font-black text-white text-sm hover:scale-[1.02]`}>
            <span className="text-xl">{icon}</span>
            <span>{title}</span>
        </Link>
    );
}
