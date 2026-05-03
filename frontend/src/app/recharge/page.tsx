"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

interface PaymentRequest {
  id: string;
  amount: number;
  walletNumber: string;
  status: string;
  createdAt: number;
}

export default function RechargePage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [amount, setAmount] = useState<string>("1000");
  const [wallet, setWallet] = useState<string>("");
  const [history, setHistory] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [payMethod, setPayMethod] = useState<'vodafone' | 'usdt'>('vodafone');

  const fetchHistory = async () => {
    try {
      const res = await apiFetch("/payments/my");
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !wallet) return alert(language === 'ar' ? "يرجى إكمال البيانات" : "Please complete the data");
    
    setLoading(true);
    try {
      const res = await apiFetch("/payments/request", {
        method: "POST",
        body: JSON.stringify({ 
            amount, 
            walletNumber: wallet,
            method: payMethod 
        }),
      });
      if (res.ok) {
        alert(language === 'ar' ? "تم إرسال الطلب بنجاح. سيتم مراجعته وإضافة الرصيد فور التأكد من التحويل." : "Request sent successfully. Credits will be added once transfer is confirmed.");
        setWallet("");
        fetchHistory();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
      <div className={language === 'ar' ? 'text-right' : 'text-left'}>
        <h2 className="text-3xl font-black text-white mb-2">{t.rechargeTitle}</h2>
        <p className="text-slate-400 font-bold">{t.rechargeDesc}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Recharge Form */}
        <div className="rounded-[2.5rem] border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
            
            <div className="p-5 rounded-3xl bg-slate-950/50 border border-slate-800/50 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.currentBalance}</p>
                    <p className="text-3xl font-black text-white">{user?.credits?.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-2xl">💰</div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">{t.choosePayment}</label>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => setPayMethod('vodafone')}
                        className={`py-3 rounded-2xl font-black text-xs transition-all border ${payMethod === 'vodafone' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                    >
                        {t.vodafoneCash}
                    </button>
                    <button 
                        onClick={() => setPayMethod('usdt')}
                        className={`py-3 rounded-2xl font-black text-xs transition-all border ${payMethod === 'usdt' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                    >
                        {t.usdtPayment}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">{t.amountPoints}</label>
                   <input 
                     type="number" 
                     value={amount}
                     onChange={(e) => setAmount(e.target.value)}
                     className={`w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:ring-2 ring-emerald-500/50 outline-none transition-all font-black text-xl ${language === 'ar' ? 'text-right' : 'text-left'}`}
                     placeholder="5000"
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">{t.walletNumber}</label>
                   <input 
                     type="text" 
                     value={wallet}
                     onChange={(e) => setWallet(e.target.value)}
                     className={`w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:ring-2 ring-emerald-500/50 outline-none transition-all font-mono ${language === 'ar' ? 'text-right' : 'text-left'}`}
                     placeholder={payMethod === 'vodafone' ? "010xxxxxxxx" : "Transaction Hash / TXID"}
                   />
                </div>

                <div className={`p-5 rounded-2xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed shadow-inner ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    {payMethod === 'vodafone' ? (
                        <p>{t.paymentMethodVodafone}</p>
                    ) : (
                        <div className="space-y-2">
                            <p>{t.paymentMethodUSDT}</p>
                            <div className="p-2 bg-slate-900 rounded-lg border border-white/5 font-mono text-[10px] text-blue-400 break-all select-all text-center">
                                TCL6JyauUS1KiNKBdH6o4VnD77EQQwT2T2
                            </div>
                        </div>
                    )}
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className={`w-full py-5 rounded-[1.5rem] bg-gradient-to-r ${payMethod === 'vodafone' ? 'from-emerald-400 to-green-600' : 'from-blue-500 to-indigo-600'} text-slate-950 font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50`}
                >
                  {loading ? (language === 'ar' ? "⏳ جاري الإرسال..." : "⏳ Sending...") : t.confirmRecharge}
                </button>
            </form>
        </div>

        {/* History */}
        <div className="space-y-4">
            <h3 className="text-xl font-black text-white px-2">{t.recentOrders}</h3>
            <div className="space-y-3">
                {history.map(h => (
                    <div key={h.id} className="rounded-3xl border border-slate-800/60 bg-slate-900/20 p-5 flex justify-between items-center group hover:bg-slate-800/40 transition-all">
                        <div>
                           <p className="font-black text-white text-xl">{h.amount.toLocaleString()} <span className="text-[10px] text-slate-500">{t.points}</span></p>
                           <p className="text-[10px] text-slate-500 font-bold" dir="ltr">
                                {new Date(h.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                                    year: 'numeric', month: 'long', day: 'numeric'
                                })}
                           </p>
                        </div>
                        <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                            h.status === 'pending' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                            h.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                            {h.status === 'pending' ? (language === 'ar' ? 'قيد المراجعة' : 'Pending') : 
                             h.status === 'approved' ? (language === 'ar' ? 'تم الشحن' : 'Approved') : (language === 'ar' ? 'مرفوض' : 'Rejected')}
                        </span>
                    </div>
                ))}
                {history.length === 0 && (
                    <div className="p-16 text-center bg-slate-900/10 border border-dashed border-slate-800 rounded-[2.5rem]">
                        <p className="text-slate-600 font-black italic">{t.noOperations}</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
 }
