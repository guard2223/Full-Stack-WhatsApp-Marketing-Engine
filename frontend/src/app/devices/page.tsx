"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiFetch } from "@/lib/api";

export default function DevicesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  
  const [devices, setDevices] = useState<any[]>([]);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollError, setPollError] = useState<string | null>(null);

  const activeSessionRef = useRef<string | null>(null);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  const fetchDevices = async () => {
    try {
      const res = await apiFetch("/devices");
      const data = await res.json();
      setDevices(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
        router.push('/login');
        return;
    }

    if (user) {
        fetchDevices();
        const interval = setInterval(() => {
            if (activeSessionRef.current) {
                checkStatus(activeSessionRef.current);
            }
        }, 5000);
        return () => clearInterval(interval);
    }
  }, [user, authLoading]);

  const checkStatus = async (sessionId: string) => {
    try {
      setPollError(null);
      const res = await apiFetch(`/whatsapp/status/${sessionId}`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (data.connected) {
        setQrCode(null);
        setActiveSession(null);
        fetchDevices();
      } else {
        const qrRes = await apiFetch(`/whatsapp/qr/${sessionId}`);
        if (!qrRes.ok) throw new Error(`QR Error ${qrRes.status}`);
        const qrData = await qrRes.json();
        setQrCode(qrData.qr);
      }
    } catch (err: any) {
      console.error("Polling error:", err);
      setPollError(err.message);
    }
  };

  const handleConnect = async () => {
    const sessionId = `session-${user?.id}-${Date.now()}`;
    await apiFetch("/whatsapp/connect", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    });
    setActiveSession(sessionId);
    setQrCode(null);
  };

  const handleDelete = async (sessionId: string) => {
    const msg = language === 'ar' 
        ? "هل أنت متأكد من حذف هذا الجهاز؟ سيتم تسجيل الخروج ومسح كافة البيانات المتعلقة به."
        : "Are you sure you want to delete this device? It will be logged out and all related data cleared.";
    
    if (!confirm(msg)) return;

    try {
        let res = await apiFetch(`/devices/${sessionId}`, { method: 'DELETE' });
        if (res.status === 404) {
            res = await apiFetch(`/whatsapp/delete/${sessionId}`, { method: 'DELETE' });
        }

        if (res.ok) {
            fetchDevices();
            if (activeSession === sessionId) {
               setActiveSession(null);
               setQrCode(null);
            }
            alert(language === 'ar' ? "✅ تم حذف الجهاز بنجاح" : "✅ Device deleted successfully");
        } else {
            const errData = await res.json().catch(() => ({}));
            alert(language === 'ar' ? `❌ فشل الحذف: ${errData.error || 'خطأ غير معروف'}` : `❌ Delete failed: ${errData.error || 'Unknown error'}`);
        }
    } catch (err: any) {
        alert(language === 'ar' ? "⚠️ حدث خطأ في الاتصال بالسيرفر." : "⚠️ Server connection error.");
    }
  };

  if (authLoading || !user) return <div className="flex items-center justify-center min-h-[60vh] text-emerald-500 font-bold">{t.verifyingIdentity}</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row items-center justify-between bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden gap-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="relative z-10 text-center md:text-right">
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">{t.deviceManagement}</h2>
          <p className="text-slate-400 font-medium">{t.deviceManagementDesc}</p>
        </div>
        <button 
          onClick={handleConnect}
          disabled={!!activeSession}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-purple-500/20 transition-all transform hover:-translate-y-1 relative z-10 disabled:opacity-50"
        >
          {activeSession ? (language === 'ar' ? "⏳ جاري الربط..." : "⏳ Connecting...") : t.connectNewDevice}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[2.5rem] p-8 shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-6">{t.currentlyConnected}</h3>
          <div className="space-y-4">
            {devices.map((dev) => (
              <div key={dev.id} className="p-6 rounded-2xl bg-slate-950/50 border border-slate-800 flex flex-col md:flex-row items-center justify-between group hover:border-emerald-500/30 transition-all gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${dev.status === 'connected' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {dev.status === 'connected' ? '🟢' : '🔴'}
                  </div>
                  <div>
                    <h4 className="font-bold text-white uppercase">{dev.sessionId}</h4>
                    <p className="text-xs text-slate-500 font-bold">{dev.phone || (language === 'ar' ? 'غير مسجل' : 'Not registered')}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                    <button 
                        onClick={() => handleDelete(dev.sessionId)}
                        className="px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl text-[10px] font-black border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/5"
                    >
                        {t.deleteDevice}
                    </button>
                </div>
              </div>
            ))}
            {devices.length === 0 && (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-3xl">
                <p className="text-slate-500 font-bold">{language === 'ar' ? 'لم تقم بربط أي أجهزة بعد.' : 'No devices connected yet.'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center justify-center min-h-[400px]">
          {activeSession ? (
            <div className="text-center space-y-6">
              <h3 className="text-xl font-bold text-white">{language === 'ar' ? 'امسح الكود عبر واتساب هاتفك' : 'Scan the code via your WhatsApp phone'}</h3>
              {qrCode ? (
                <div className="bg-white p-6 rounded-3xl shadow-2xl ring-8 ring-white/10 mx-auto w-fit">
                   <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`} alt="QR" className="w-[200px] h-[200px]" />
                </div>
              ) : (
                <div className="w-[200px] h-[200px] bg-slate-950 rounded-2xl flex items-center justify-center mx-auto border border-slate-800 animate-pulse relative">
                   <p className="text-[10px] font-bold text-slate-500">{language === 'ar' ? 'جاري تحميل الكود...' : 'Loading QR...'}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4 opacity-50">
               <div className="text-8xl">📲</div>
               <p className="font-bold text-slate-400">{t.qrCodePlaceholder}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
