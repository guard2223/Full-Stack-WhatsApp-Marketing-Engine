"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPortalPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Protect the route
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  const adminSections = [
    {
      title: "إدارة المستخدمين",
      description: "تحكم في حسابات المستخدمين، شحن الرصيد يدوياً، وتعديل الصلاحيات.",
      icon: "🛡️",
      href: "/admin/users",
      color: "from-blue-500 to-indigo-600 shadow-blue-500/20"
    },
    {
      title: "كل حملات النظام",
      description: "مراقبة كافة الحملات التي تتم عبر المنصة لجميع المستخدمين لحظة بلحظة.",
      icon: "📡",
      href: "/admin/campaigns",
      color: "from-emerald-500 to-green-600 shadow-emerald-500/20"
    },
    {
      title: "طلبات الشحن",
      description: "مراجعة والموافقة على طلبات شحن الرصيد عبر فودافون كاش.",
      icon: "📥",
      href: "/admin/payments",
      color: "from-orange-500 to-amber-600 shadow-orange-500/20"
    },
    {
      title: "تقارير النظام",
      description: "إحصائيات شاملة لإجمالي الرسائل، النشاط، والمبيعات الكلية.",
      icon: "📋",
      href: "/admin/reports",
      color: "from-purple-500 to-pink-600 shadow-purple-500/20"
    }
  ];

  if (!user || user.role !== 'admin') {
    return <div className="p-20 text-center text-slate-500 font-bold">جاري التحقق من الصلاحيات...</div>;
  }

  return (
    <div className="space-y-12 animate-in fade-in zoom-in-95 duration-700">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black text-white tracking-tight">بوابة الإدارة المركزية</h1>
        <p className="text-xl text-slate-400 font-bold max-w-2xl mx-auto leading-relaxed">
          أهلاً بك في نظام التحكم الشامل لمنصة Multiwa. اختر القسم الذي تود إدارته لبدء العمل.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {adminSections.map((section) => (
          <Link 
            key={section.href} 
            href={section.href}
            className="group relative overflow-hidden rounded-[32px] border border-slate-800 bg-slate-900/40 backdrop-blur-xl p-8 transition-all hover:scale-[1.03] hover:border-slate-700 active:scale-95 shadow-2xl"
          >
            {/* Background Glow */}
            <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${section.color} blur-[100px] opacity-10 group-hover:opacity-30 transition-opacity`}></div>
            
            <div className="flex flex-col h-full">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${section.color} shadow-xl flex items-center justify-center text-3xl mb-6 transform group-hover:rotate-6 transition-transform`}>
                {section.icon}
              </div>
              
              <h3 className="text-2xl font-black text-white mb-3 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">
                {section.title}
              </h3>
              
              <p className="text-slate-400 font-bold leading-relaxed text-sm mb-8">
                {section.description}
              </p>
              
              <div className="mt-auto flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-widest bg-emerald-500/5 self-start px-3 py-1.5 rounded-lg border border-emerald-500/10">
                <span>دخول القسم</span>
                <span className="text-lg">←</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
