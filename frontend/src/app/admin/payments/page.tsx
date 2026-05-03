"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface PaymentRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  walletNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      const res = await apiFetch("/admin/payments");
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    if (!confirm(`هل أنت متأكد من ${status === 'approved' ? 'الموافقة على' : 'رفض'} هذا الطلب؟`)) return;
    
    setProcessing(id);
    try {
      const res = await apiFetch("/admin/payments/approve", {
        method: "POST",
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        fetchPayments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="p-10 text-center text-emerald-500 font-bold">جاري تحميل طلبات الشحن...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h2 className="text-3xl font-black text-white mb-2">📥 طلبات شحن الرصيد</h2>
        <p className="text-slate-400 font-bold">مراجعة التحويلات الواردة عبر فودافون كاش وتأكيدها.</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-950/50 border-b border-slate-800/60">
              <th className="p-5 text-sm font-black text-slate-400">المستخدم</th>
              <th className="p-5 text-sm font-black text-slate-400">القيمة (نقطة)</th>
              <th className="p-5 text-sm font-black text-slate-400">رقم المحفظة المرسل منه</th>
              <th className="p-5 text-sm font-black text-slate-400">التاريخ</th>
              <th className="p-5 text-sm font-black text-slate-400">الحالة</th>
              <th className="p-5 text-sm font-black text-slate-400 text-center">الإجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="p-5">
                   <div className="font-bold text-white">{p.userEmail}</div>
                   <div className="text-[10px] text-slate-500">ID: {p.userId}</div>
                </td>
                <td className="p-5 font-black text-emerald-400 text-xl tabular-nums">
                    {p.amount.toLocaleString()}
                </td>
                <td className="p-5 font-mono text-slate-300 text-sm">
                  {p.walletNumber}
                </td>
                <td className="p-5 text-xs text-slate-400">
                  {new Date(p.createdAt).toLocaleString('ar-EG')}
                </td>
                <td className="p-5">
                   <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                     p.status === 'pending' ? 'bg-orange-500/10 text-orange-400' :
                     p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                   }`}>
                     {p.status}
                   </span>
                </td>
                <td className="p-5 text-center">
                  {p.status === 'pending' ? (
                    <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleAction(p.id, 'approved')}
                          disabled={!!processing}
                          className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                          title="موافقة"
                        >
                          ✅
                        </button>
                        <button
                          onClick={() => handleAction(p.id, 'rejected')}
                          disabled={!!processing}
                          className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500/20 transition-all border border-rose-500/20"
                          title="رفض"
                        >
                          ❌
                        </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600 font-bold">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && (
          <div className="p-20 text-center text-slate-500 font-black">لا توجد طلبات شحن حالياً.</div>
        )}
      </div>
    </div>
  );
}
