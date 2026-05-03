"use client";
import Link from "next/link";

const categories = [
  {
    name: "🚀 الحملات والتواصل الجماعي",
    tools: [
      { id: "bulk", title: "رسائل واتساب جماعية", description: "إرسال لعدد كبير من العملاء دفعة واحدة بسرعة وتحكم كامل.", icon: "📨", href: "/campaigns/create" },
      { id: "multi", title: "إرسال سريع من عدة أرقام", description: "توزيع الرسائل على أكثر من رقم لزيادة السرعة وتقليل الضغط.", icon: "⚡", href: "/campaigns/create" },
      { id: "schedule", title: "جدولة الرسائل", description: "تحديد وقت وتاريخ الإرسال ليتم التنفيذ تلقائياً.", icon: "📅", href: "/campaigns/schedule" },
      { id: "content", title: "إدارة المحتوى", description: "حفظ النصوص والصور والقوالب لاستخدامها بسرعة.", icon: "📂", href: "#" },
    ]
  },
  {
    name: "🔍 استخراج وتجهيز البيانات",
    tools: [
      { id: "grp-ext", title: "استخراج أعضاء الجروبات", description: "سحب أعضاء أي جروب وتجهيزهم لحملات تسويقية.", icon: "📥", href: "/tools/group-extractor" },
      { id: "cont-ext", title: "سحب جهات الاتصال", description: "استخراج الأرقام من الحساب بشكل منظم وقابل للتصدير.", icon: "📇", href: "/tools/contact-extractor" },
      { id: "chat-ext", title: "جلب قائمة الشات", description: "استخراج أرقام المحادثات السابقة لإعادة الاستهداف.", icon: "💬", href: "#" },
      { id: "poll-ext", title: "استخراج نتائج الاستبيانات", description: "سحب بيانات المشاركين في التصويت وتحليل النتائج.", icon: "📊", href: "#" },
    ]
  },
  {
    name: "🤝 أتمتة وإدارة الجروبات",
    tools: [
      { id: "grp-add", title: "إضافة أعضاء دفعة واحدة", description: "إضافة عدد كبير من الأعضاء إلى الجروبات بشكل آلي.", icon: "➕", href: "#" },
      { id: "grp-join", title: "الانضمام التلقائي للجروبات", description: "دخول الجروبات تلقائياً عبر روابط الدعوة.", icon: "🚪", href: "/tools/auto-join" },
      { id: "grp-search", title: "البحث عن جروبات", description: "العثور على جروبات مستهدفة حسب كلمات بحث معينة.", icon: "🔎", href: "/tools/group-search" },
      { id: "grp-links", title: "توليد روابط جروبات", description: "إنشاء روابط دعوة جديدة لأي جروب بسهولة.", icon: "🔗", href: "/tools/link-generator" },
      { id: "link-web", title: "استخراج روابط من الويب", description: "جمع روابط جروبات واتساب من مواقع وصفحات مختلفة.", icon: "🌐", href: "#" },
    ]
  },
  {
    name: "🛡️ التحقق والأمان (الحماية)",
    tools: [
      { id: "filter", title: "فلترة أرقام واتساب", description: "فحص الأرقام للتأكد إنها مفعلة قبل بدء الحملة.", icon: "🧪", href: "/tools/filter" },
      { id: "warmer", title: "تسخين الحساب (Warmer)", description: "تشغيل نشاط تدريجي للحساب لتقليل احتمالية الحظر.", icon: "🔥", href: "/tools/warmer" },
      { id: "grp-warmer", title: "تسخين الجروبات", description: "زيادة التفاعل داخل الجروبات بشكل طبيعي وآلي.", icon: "♨️", href: "#" },
      { id: "security", title: "أمان متقدم", description: "حماية البيانات والحسابات بأنظمة تشفير عالية.", icon: "🔐", href: "#" },
    ]
  },
  {
    name: "🤖 الذكاء الاصطناعي والإدارة",
    tools: [
      { id: "chatbot", title: "الشات بوت الذكي", description: "ردود تلقائية حسب كلمات مفتاحية مع نظام سؤال وجواب.", icon: "🤖", href: "/tools/chatbot" },
      { id: "analytics", title: "تقارير وتحليلات", description: "عرض إحصائيات الإرسال ونسب النجاح والفشل.", icon: "📈", href: "/analytics" },
      { id: "contacts", title: "إدارة جهات الاتصال", description: "تنظيم الأرقام في قوائم ومجموعات لتسهيل الاستهداف.", icon: "👥", href: "/contacts" },
    ]
  }
];

export default function ServicesPage() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="relative">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl opacity-50"></div>
        <h1 className="text-4xl font-black text-white mb-4">🛠️ الخدمات والأدوات المتقدمة</h1>
        <p className="text-slate-400 font-bold max-w-2xl leading-relaxed">
            استكشف مجموعة متكاملة من الأدوات المصممة لتعزيز تجربة التسويق عبر الواتساب، من الاستخراج والأتمتة إلى الحماية والذكاء الاصطناعي.
        </p>
      </div>

      <div className="space-y-16">
        {categories.map((category) => (
          <section key={category.name} className="space-y-6">
            <h2 className="text-xl font-black text-emerald-400 flex items-center gap-3 border-r-4 border-emerald-500 pr-4">
              {category.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {category.tools.map((tool) => (
                <Link 
                  key={tool.id} 
                  href={tool.href}
                  className={`group relative p-6 rounded-[24px] border border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 hover:border-emerald-500/30 transition-all duration-300 shadow-2xl overflow-hidden ${tool.href === '#' ? 'cursor-not-allowed grayscale-[0.6] opacity-80' : 'hover:scale-[1.03] active:scale-95'}`}
                >
                  {/* Status indicator for non-linked items */}
                  {tool.href === '#' && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-800 text-[8px] font-black text-slate-500 uppercase tracking-widest z-20">قريباً</div>
                  )}

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl mb-4 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors shadow-lg">
                      {tool.icon}
                    </div>
                    <h3 className="font-black text-white mb-2 group-hover:text-emerald-400 transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed line-clamp-3">
                      {tool.description}
                    </p>
                  </div>
                  
                  {/* Hover visual effect */}
                  <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
