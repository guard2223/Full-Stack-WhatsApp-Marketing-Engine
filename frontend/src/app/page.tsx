"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LandingPage() {
  const { user } = useAuth();

  const features = [
    { title: "إرسال متعدد الأجهزة", icon: "📱", desc: "وزع حملاتك على عشرات الأجهرة في نفس الوقت لضمان أقصى سرعة وأمان." },
    { title: "معاينة حية للجمهور", icon: "👁️", desc: "شاهد أرقام عملائك وتأكد من نشاطهم على واتساب قبل البدء." },
    { title: "توزيع ذكي (Round-Robin)", icon: "🔄", desc: "خوارزمية ذكية توزع الرسائل بالتناوب بين أجهزتك لتجنب الحظر." },
    { title: "إدارة جهات الاتصال", icon: "👥", desc: "نظم قوائم عملائك في مجموعات ذكية لسهولة الاستهداف." },
    { title: "فلترة الأرقام", icon: "🧪", desc: "افحص ملايين الأرقام وتأكد من وجود حساب واتساب مفعل عليها." },
    { title: "دعم فني متواصل", icon: "💬", desc: "فريقنا معك دائماً للمساعدة في إعداد وإطلاق أقوى الحملات." },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30 selection:text-white overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5 h-20 flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">S</div>
            <span className="text-xl font-black tracking-tighter">SADEN WA</span>
          </div>
          <div className="flex items-center gap-6">
            {user ? (
               <Link href="/dashboard" className="px-6 py-2.5 bg-white text-black font-black rounded-full hover:scale-105 active:scale-95 transition-all">لوحة التحكم</Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">دخول</Link>
                <Link href="/signup" className="px-6 py-2.5 bg-white text-black font-black rounded-full hover:scale-105 active:scale-95 transition-all text-sm">ابدأ الآن</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        
        <div className="max-w-5xl mx-auto px-6 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/5 text-blue-400 text-xs font-black uppercase tracking-widest animate-fade-in">
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            برنامج التسويق رقم #1 في الوطن العربي
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.1] bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
             أرسل حملاتك <br /> بذكاء تام.
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-bold leading-relaxed">
            المنصة المتكاملة لإرسال آلاف الرسائل عبر الواتساب باستخدام تقنية التدوير الذكي بين الأجهزة لضمان أعلى وصول وأقل حظر.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
             <Link href="/signup" className="w-full sm:w-auto px-10 py-4 bg-white text-black font-black text-lg rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10">
                ابدأ رحلتك مجاناً
             </Link>
             <Link href="#features" className="w-full sm:w-auto px-10 py-4 bg-slate-900/50 border border-white/10 text-white font-black text-lg rounded-full hover:bg-white/5 transition-all">
                استكشف المميزات
             </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20 space-y-4">
                <h2 className="text-4xl font-black tracking-tight">ماذا يقدم لك سادن وا؟</h2>
                <p className="text-slate-500 font-bold">كل ما تحتاجه للسيطرة على سوق الواتساب في مكان واحد</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((f, i) => (
                    <div key={i} className="group p-8 rounded-[32px] border border-white/5 bg-slate-900/20 hover:bg-slate-900/40 hover:border-white/10 transition-all">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                            {f.icon}
                        </div>
                        <h3 className="text-xl font-black mb-3">{f.title}</h3>
                        <p className="text-slate-500 font-bold text-sm leading-relaxed">{f.desc}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-32 border-t border-white/5 relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/10 blur-[150px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto px-6 text-center space-y-12">
            <div className="space-y-4">
                <h2 className="text-4xl font-black tracking-tight">هل لديك أي استفسار؟</h2>
                <p className="text-slate-400 font-bold">فريق الدعم الفني متاح دائماً لخدمتكم عبر واتساب وتليجرام</p>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <a href="https://wa.me/201026516115" className="flex items-center gap-4 px-8 py-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl hover:bg-emerald-500/20 transition-all group w-full md:w-auto">
                    <span className="text-4xl">📱</span>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">واتساب</p>
                        <p className="text-xl font-black text-white tracking-widest">+20 102 651 6115</p>
                    </div>
                </a>

                <a href="https://t.me/201026516115" className="flex items-center gap-4 px-8 py-6 bg-blue-500/10 border border-blue-500/20 rounded-3xl hover:bg-blue-500/20 transition-all group w-full md:w-auto">
                    <span className="text-4xl">✈️</span>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">تليجرام</p>
                        <p className="text-xl font-black text-white tracking-widest">+20 102 651 6115</p>
                    </div>
                </a>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center">
        <p className="text-slate-600 text-sm font-bold">© 2026 Multiwa - جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
}
