"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

const navigation = [
  { name: "dashboard", href: "/dashboard", icon: "📊" },
  { name: "devices", href: "/devices", icon: "📱" },
  { name: "contacts", href: "/contacts", icon: "👥" },
  { name: "newCampaign", href: "/campaigns/create", icon: "🚀" },
  { name: "campaignHistory", href: "/campaigns", icon: "🕒" },
  { name: "analytics", href: "/analytics", icon: "📈" },
  { name: "recharge", href: "/recharge", icon: "💳" },
  { name: "extractor", href: "/tools/contact-extractor", icon: "📲" },
  { name: "chatbot", href: "/tools/chatbot", icon: "🤖" },
  { name: "warmer", href: "/tools/warmer", icon: "🔥" },
  { name: "linkGen", href: "/tools/link-generator", icon: "🔗" },
  { name: "autoJoin", href: "/tools/auto-join", icon: "🚪" },
];

const adminNavigation = [
  { name: "adminUsers", href: "/admin/users", icon: "🛡️" },
  { name: "adminCampaigns", href: "/admin/campaigns", icon: "📡" },
  { name: "adminPayments", href: "/admin/payments", icon: "📥" },
  { name: "adminReports", href: "/admin/reports", icon: "📋" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  // Hide sidebar on landing page and auth pages
  if (pathname === "/" || pathname === "/login" || pathname === "/signup") return null;

  return (
    <div className="hidden md:flex bg-black/40 backdrop-blur-3xl border-l border-white/5 flex-col w-[260px] h-screen sticky top-0 px-4 py-8 z-50">
      <div className="flex items-center justify-between px-3 mb-10">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-white font-black text-xl">S</span>
            </div>
            <div>
                <h1 className="text-xl font-black tracking-tighter text-white">SADEN WA</h1>
                <p className="text-[9px] font-black text-blue-500 tracking-widest uppercase opacity-80">PRO v4.1</p>
            </div>
        </div>

        {/* Language Switcher */}
        <button 
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-[10px] font-black text-slate-400 transition-all active:scale-95"
        >
            {language === 'ar' ? 'EN' : 'AR'}
        </button>
      </div>

      <nav className="flex-1 space-y-1 relative overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-white/10 text-white border border-white/10"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className={`text-lg transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span>
              <span className="font-bold text-[13px]">{t[item.name]}</span>
            </Link>
          );
        })}

        {user?.role === 'admin' && (
          <>
            <div className={`pt-4 pb-2 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              {language === 'ar' ? 'إدارة النظام' : 'SYSTEM MANAGEMENT'}
            </div>
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 shadow-md border border-emerald-500/20"
                      : `text-slate-400 hover:text-white hover:bg-slate-800/30 ${language === 'ar' ? 'hover:translate-x-[-4px]' : 'hover:translate-x-[4px]'}`
                  }`}
                >
                  <span className={`text-xl transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span>
                  <span className="font-bold text-[14px]">{t[item.name]}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="mt-auto space-y-4">

        {/* User Info & Logout */}
        <div className="flex items-center justify-between px-2 pt-4 border-t border-white/5">
            <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-400 truncate max-w-[120px]">{user?.email}</span>
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">{user?.role}</span>
            </div>
            <button 
                onClick={logout}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 flex items-center gap-2 transition-all group"
            >
                <span className="text-sm font-black">{t.logout}</span>
                <span className="text-lg group-hover:scale-110 transition-transform">🚪</span>
            </button>
        </div>
      </div>
    </div>
  );
}
