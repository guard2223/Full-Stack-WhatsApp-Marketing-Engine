"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface User {
  id: string;
  email: string;
  credits: number;
  role: string;
  createdAt: number;
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await apiFetch("/admin/users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateCredits = async (userId: string, currentCredits: number) => {
    const amountStr = prompt("أدخل عدد النقاط المراد إضافتها (أو طرحها باستخدام رقم سالب):", "100");
    if (!amountStr) return;
    
    const amount = parseInt(amountStr);
    if (isNaN(amount)) return alert("يرجى إدخال رقم صحيح");

    setUpdating(userId);
    try {
      const res = await apiFetch("/admin/credits", {
        method: "POST",
        body: JSON.stringify({ userId, credits: amount }),
      });
      if (res.ok) {
        alert("تم تحديث الرصيد بنجاح");
        fetchUsers();
      } else {
        alert("فشل تحديث الرصيد");
      }
    } catch (err) {
      console.error(err);
      alert("خطأ في الاتصال بالسيرفر");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="p-10 text-center text-emerald-500 font-bold">جاري تحميل المستخدمين...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black text-white mb-2">🛡️ إدارة المستخدمين</h2>
        <p className="text-slate-400">تحكم في صلاحيات وأرصدة المستخدمين المسجلين في المنصة.</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-950/50 border-b border-slate-800/60">
              <th className="p-5 text-sm font-black text-slate-400">البريد الإلكتروني</th>
              <th className="p-5 text-sm font-black text-slate-400">الرتبة</th>
              <th className="p-5 text-sm font-black text-slate-400">الرصيد الحالي</th>
              <th className="p-5 text-sm font-black text-slate-400">تاريخ التسجيل</th>
              <th className="p-5 text-sm font-black text-slate-400 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-800/20 transition-colors group">
                <td className="p-5">
                   <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">{u.email}</div>
                   <div className="text-[10px] text-slate-500 mt-0.5">ID: {u.id}</div>
                </td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                    u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-5 font-black text-white text-lg tabular-nums">
                    {u.credits?.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">نقطة</span>
                </td>
                <td className="p-5 text-sm text-slate-400 font-medium">
                  {new Date(u.createdAt).toLocaleDateString('ar-EG')}
                </td>
                <td className="p-5 text-center">
                  <button
                    onClick={() => handleUpdateCredits(u.id, u.credits)}
                    disabled={updating === u.id}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 text-xs font-black transition-all disabled:opacity-50"
                  >
                    {updating === u.id ? "جاري التحديث..." : "➕ إضافة نقاط"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-20 text-center text-slate-500 font-bold">لا يوجد مستخدمين مسجلين بعد.</div>
        )}
      </div>
    </div>
  );
}
