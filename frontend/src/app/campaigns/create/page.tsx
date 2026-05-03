"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiFetch } from "@/lib/api";

export default function CreateCampaign() {
  const { user, isLoading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: "",
    targetGroup: language === 'ar' ? "عام" : "General",
    deviceSessions: [] as string[],
    messageText: "",
    minDelay: 20,
    maxDelay: 60,
    sourceType: 'database' as 'database' | 'whatsapp_group' | 'manual',
    sourceId: ''
  });
  
  const [manualNumbersText, setManualNumbersText] = useState("");
  const [devices, setDevices] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [liveGroups, setLiveGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingGroups, setFetchingGroups] = useState(false);
  const [error, setError] = useState("");
  const [targetCount, setTargetCount] = useState(0);
  const [previewContacts, setPreviewContacts] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
        router.push('/login');
        return;
    }

    if (user) {
        apiFetch("/devices").then(r => r.json()).then(data => {
            setDevices(data);
            // Auto-select first active device if none selected
            const active = data.find((d: any) => d.status === 'connected');
            if (active && formData.deviceSessions.length === 0) {
                setFormData(prev => ({ ...prev, deviceSessions: [active.sessionId] }));
            }
        }).catch(console.error);

        apiFetch("/contacts").then(r => r.json()).then(data => {
            setContacts(data);
        }).catch(console.error);
    }
  }, [user, authLoading]);

  // Handle source/device changes to fetch groups (Uses the first selected device for group list)
  useEffect(() => {
    if (formData.deviceSessions.length > 0 && formData.sourceType === 'whatsapp_group') {
        fetchLiveGroups(formData.deviceSessions[0]);
    }
  }, [formData.deviceSessions[0], formData.sourceType]);

  const fetchLiveGroups = async (sessionId: string) => {
    setFetchingGroups(true);
    try {
        const res = await apiFetch(`/whatsapp/${sessionId}/groups`);
        const data = await res.json();
        setLiveGroups(data || []);
        // Auto-select first group if none selected
        if (data && data.length > 0 && !formData.sourceId) {
            setFormData(prev => ({ ...prev, sourceId: data[0].id }));
            // Trigger preview/count for this group
            setIsPreviewLoading(true);
            fetchGroupMemberCount(sessionId, data[0].id);
        }
    } catch (e) {
        console.error("Failed to fetch groups", e);
    } finally {
        setFetchingGroups(false);
    }
  };

  const fetchGroupMemberCount = async (sessionId: string, groupId: string) => {
    try {
        const res = await apiFetch(`/whatsapp/${sessionId}/groups/${groupId}/participants`);
        const data = await res.json();
        if (data.participants) {
            setTargetCount(data.participants.length);
            setPreviewContacts(data.participants.map((p: any) => ({
                id: p.id,
                phone: p.phone || p.id.split('@')[0],
                status: 'pending'
            })));
        }
    } catch (e) {
        console.error("Failed to fetch group count", e);
    } finally {
        setIsPreviewLoading(false);
    }
  };

  const handleFilterPreview = async () => {
    if (formData.deviceSessions.length === 0) return setError(language === 'ar' ? "الرجاء اختيار جهاز للتحقق من خلاله" : "Please select a device for verification");
    setIsFiltering(true);
    try {
        const numbers = previewContacts.slice(0, 50).map(c => c.phone); // Filter first 50 for safety
        const res = await apiFetch(`/whatsapp/${formData.deviceSessions[0]}/filter`, {
            method: 'POST',
            body: JSON.stringify({ numbers })
        });
        const results = await res.json();
        
        setPreviewContacts(prev => prev.map(c => {
            const found = results.find((r: any) => r.phone === c.phone);
            if (found) {
                return { ...c, status: found.exists ? 'active' : 'invalid' };
            }
            return c;
        }));
    } catch (e) {
        console.error("Filtering failed", e);
    } finally {
        setIsFiltering(false);
    }
  };

  const handleTestSend = async (contact: any) => {
    if (formData.deviceSessions.length === 0) return setError(language === 'ar' ? "الرجاء اختيار جهاز للإرسال منه" : "Please select a device for sending");
    if (!formData.messageText) return setError(language === 'ar' ? "الرجاء كتابة نص الرسالة أولاً" : "Please write the message text first");
    
    try {
        const res = await apiFetch(`/whatsapp/${formData.deviceSessions[0]}/send`, {
            method: 'POST',
            body: JSON.stringify({
                to: contact.id || contact.phone,
                text: `[TEST] ${formData.messageText}`
            })
        });
        const data = await res.json();
        if (data.success) {
            alert(language === 'ar' ? "✅ تم إرسال رسالة التجربة بنجاح!" : "✅ Test message sent successfully!");
        } else {
            alert((language === 'ar' ? "❌ فشل إرسال التجربة: " : "❌ Test send failed: ") + (data.error || (language === 'ar' ? "خطأ غير معروف" : "Unknown error")));
        }
    } catch (e) {
        alert(language === 'ar' ? "❌ خطأ في الاتصال بالسيستم" : "❌ Connection error");
    }
  };

  const convertGroupToManual = () => {
    if (previewContacts.length === 0) return;
    const numbers = previewContacts.map(c => c.phone).join('\n');
    setManualNumbersText(numbers);
    setFormData(prev => ({ ...prev, sourceType: 'manual' }));
    alert(language === 'ar' ? "✅ تم تحويل الأرقام إلى القائمة اليدوية بنجاح!" : "✅ Numbers converted to manual list successfully!");
  };

  // Recalculate target count
  useEffect(() => {
    if (formData.sourceType === 'database') {
        const filtered = contacts.filter(c => (c.group || (language === 'ar' ? 'عام' : 'General')) === formData.targetGroup);
        setTargetCount(filtered.length);
        setPreviewContacts(filtered.slice(0, 100)); // Sample preview
    } else if (formData.sourceType === 'whatsapp_group' && formData.sourceId) {
        // Find group in local list first for quick update
        const group = liveGroups.find(g => g.id === formData.sourceId);
        if (group && group.participantsCount > 0) {
            setTargetCount(group.participantsCount);
        }
        
        if (!isPreviewLoading && formData.deviceSessions.length > 0) {
            setIsPreviewLoading(true);
            setPreviewContacts([]); // Clear old preview!
            fetchGroupMemberCount(formData.deviceSessions[0], formData.sourceId);
        }
    } else if (formData.sourceType === 'manual') {
        const lines = manualNumbersText.split(/[\n,]/).filter(line => line.trim().length > 5);
        setTargetCount(lines.length);
        setPreviewContacts(lines.slice(0, 100).map(l => ({ phone: l.trim(), status: 'pending' })));
    } else {
        setTargetCount(0);
        setPreviewContacts([]);
    }
  }, [formData.sourceType, formData.targetGroup, formData.sourceId, formData.deviceSessions, contacts, liveGroups, manualNumbersText]);

  const toggleDevice = (sessionId: string) => {
      setFormData(prev => {
          const sessions = [...prev.deviceSessions];
          if (sessions.includes(sessionId)) {
              return { ...prev, deviceSessions: sessions.filter(s => s !== sessionId) };
          } else {
              return { ...prev, deviceSessions: [...sessions, sessionId] };
          }
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.deviceSessions.length === 0) return setError(language === 'ar' ? "الرجاء اختيار جهاز واحد على الأقل للإرسال منه" : "Please select at least one device for sending");
    if (!formData.messageText) return setError(language === 'ar' ? "الرجاء كتابة نص الرسالة" : "Please write the message text");
    if (targetCount === 0 && formData.sourceType !== 'whatsapp_group') {
        return setError(language === 'ar' ? "مجموعة المستهدفين المختارة فارغة أو الأرقام غير صالحة" : "Target audience is empty or numbers are invalid");
    }
    
    setLoading(true);
    setError("");
    
    try {
      const payload: any = { 
        ...formData, 
        targetCount
      };

      if (formData.sourceType === 'manual') {
          payload.manualNumbers = manualNumbersText.split(/[\n,]/).map(l => l.trim()).filter(l => l.length > 5);
      }

      const res = await apiFetch("/campaigns", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (data.id) {
        router.push("/campaigns");
      } else {
        setError(data.error || (language === 'ar' ? "فشل إنشاء الحملة" : "Failed to create campaign"));
      }
    } catch (err) {
      setError(language === 'ar' ? "خطأ في الاتصال بالسيرفر" : "Server connection error");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return <div className="flex items-center justify-center min-h-[60vh] text-emerald-500 font-bold italic animate-pulse">{t.verifyingIdentity}</div>;

  const dbGroups = Array.from(new Set(contacts.map(c => c.group || (language === 'ar' ? "عام" : "General"))));

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white mb-2 tracking-tight">{t.launchProCampaign}</h2>
          <p className="text-slate-400 font-bold text-lg">{t.launchProDesc}</p>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[24px] px-8 py-4 flex items-center gap-4 shadow-2xl">
            <span className="text-2xl">💰</span>
            <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.availableCredits}</p>
                <p className="text-2xl font-black text-white">{user.credits?.toLocaleString()}</p>
            </div>
        </div>
      </div>

      {/* Process Steps Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StepInfo number="1" title={t.step1} desc={t.step1Desc} icon="📱" />
          <StepInfo number="2" title={t.step2} desc={t.step2Desc} icon="👥" />
          <StepInfo number="3" title={t.step3} desc={t.step3Desc} icon="🎯" />
      </div>

      <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/80 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between px-2 gap-2">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t.usedDevices}</label>
                <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">{t.chooseMultiple}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map(dev => {
                const isSelected = formData.deviceSessions.includes(dev.sessionId);
                return (
                  <div 
                    key={dev.id}
                    onClick={() => toggleDevice(dev.sessionId)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all relative overflow-hidden group ${
                      isSelected 
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20' 
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 relative z-10 transition-transform group-hover:scale-[1.02]">
                      <div className="relative">
                        <span className="text-2xl">{dev.status === 'connected' ? '🟢' : '🔴'}</span>
                        {isSelected && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold border-2 border-slate-900">✓</div>
                        )}
                      </div>
                      <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                        <h4 className="font-bold text-white text-sm">{dev.name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold">{dev.phone || (language === 'ar' ? 'غير متصل' : 'Offline')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {devices.length === 0 && <p className="text-slate-500 font-bold col-span-full py-4 text-center border-2 border-dashed border-slate-800 rounded-2xl">{language === 'ar' ? 'لا يوجد أجهزة مرتبطة حالياً' : 'No devices connected yet'}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-400 mr-2 uppercase tracking-widest">{t.campaignNameLabel}</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-bold text-white placeholder:text-slate-700"
              placeholder={t.campaignExample}
            />
          </div>

          <div className="space-y-5">
            <label className="text-sm font-bold text-slate-400 mr-2 uppercase tracking-widest">{t.audienceSource}</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <button
                  type="button"
                  onClick={() => setFormData({...formData, sourceType: 'database'})}
                  className={`py-4 px-4 rounded-2xl border font-bold transition-all flex flex-col items-center gap-1 text-center ${
                    formData.sourceType === 'database' 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                    : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
               >
                  <span className="text-xl">📁</span>
                  <span className="text-xs">{t.systemCategories}</span>
               </button>
               <button
                  type="button"
                  onClick={() => setFormData({...formData, sourceType: 'whatsapp_group'})}
                  className={`py-4 px-4 rounded-2xl border font-bold transition-all flex flex-col items-center gap-1 text-center ${
                    formData.sourceType === 'whatsapp_group' 
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                    : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
               >
                  <span className="text-xl">💬</span>
                  <span className="text-xs">{t.liveGroups}</span>
               </button>
               <button
                  type="button"
                  onClick={() => setFormData({...formData, sourceType: 'manual'})}
                  className={`py-4 px-4 rounded-2xl border font-bold transition-all flex flex-col items-center gap-1 text-center ${
                    formData.sourceType === 'manual' 
                    ? 'bg-purple-500/20 border-purple-500 text-purple-400' 
                    : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
               >
                  <span className="text-xl">⌨️</span>
                  <span className="text-xs">{t.manualEntry}</span>
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-400 mr-2 uppercase tracking-widest">
                {formData.sourceType === 'database' && (language === 'ar' ? '🎯 اختر تصنيف الأرقام المسجلة' : '🎯 Select Registered Category')}
                {formData.sourceType === 'whatsapp_group' && (language === 'ar' ? '📱 اختر جروب واتساب مباشر' : '📱 Select Live WhatsApp Group')}
                {formData.sourceType === 'manual' && (language === 'ar' ? '✍️ ضع الأرقام يدويًا' : '✍️ Enter Numbers Manually')}
              </label>
              
              {formData.sourceType === 'database' && (
                <div className="relative">
                  <select
                    value={formData.targetGroup}
                    onChange={(e) => setFormData({ ...formData, targetGroup: e.target.value })}
                    className={`w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-bold text-white appearance-none cursor-pointer ${language === 'ar' ? 'text-right' : 'text-left'}`}
                  >
                    {dbGroups.map(g => <option key={g} value={g}>{g}</option>)}
                    {dbGroups.length === 0 && <option value={language === 'ar' ? "عام" : "General"}>{language === 'ar' ? "لا يوجد تصنيفات (عام)" : "No categories (General)"}</option>}
                  </select>
                  <div className={`absolute ${language === 'ar' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 pointer-events-none text-slate-500`}>▼</div>
                </div>
              )}

              {formData.sourceType === 'whatsapp_group' && (
                <div className="relative">
                  <select
                    value={formData.sourceId}
                    onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
                    disabled={fetchingGroups || formData.deviceSessions.length === 0}
                    className={`w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold text-white appearance-none cursor-pointer disabled:opacity-50 ${language === 'ar' ? 'text-right' : 'text-left'} ${formData.deviceSessions.length === 0 && 'border-amber-500/50'}`}
                  >
                    <option value="">{fetchingGroups ? (language === 'ar' ? "⏳ جاري جلب الجروبات..." : "⏳ Fetching groups...") : (formData.deviceSessions.length > 0 ? (language === 'ar' ? "--- اختر الجروب ---" : "--- Select Group ---") : (language === 'ar' ? "⚠️ يرجى اختيار جهاز أولاً" : "⚠️ Please select a device first"))}</option>
                    {liveGroups.map(g => (
                        <option key={g.id} value={g.id}>
                            {g.name} ({g.participantsCount} {language === 'ar' ? 'عضو' : 'Members'})
                        </option>
                    ))}
                  </select>
                  <div className={`absolute ${language === 'ar' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 pointer-events-none text-slate-500`}>▼</div>
                </div>
              )}

              {formData.sourceType === 'manual' && (
                <textarea
                  rows={4}
                  value={manualNumbersText}
                  onChange={(e) => setManualNumbersText(e.target.value)}
                  className={`w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-bold text-white placeholder:text-slate-700 resize-none font-mono ${language === 'ar' ? 'text-right' : 'text-left'}`}
                  placeholder={language === 'ar' ? "201010958154\n201280102040\n(رقم في كل سطر)" : "201010958154\n201280102040\n(Number per line)"}
                ></textarea>
              )}
            </div>

            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center gap-4 h-full relative overflow-hidden">
                <div className={`absolute top-0 ${language === 'ar' ? 'right-0' : 'left-0'} w-2 h-full bg-emerald-500 opacity-20`}></div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">👥</span>
                        <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{language === 'ar' ? 'إجمالي المستهدفين' : 'Total Targets'}</p>
                            <p className="text-xl font-black text-white">{targetCount === 0 && formData.sourceType === 'whatsapp_group' ? (language === 'ar' ? 'جاري الحساب...' : 'Calculating...') : `${targetCount} ${t.customers}`}</p>
                        </div>
                    </div>
                </div>
                <div className="pt-4 border-t border-slate-800/50 flex justify-between items-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{t.expectedCost}</p>
                    <p className="text-lg font-black text-emerald-400">{ (targetCount * 10).toLocaleString() } {t.points}</p>
                </div>
            </div>
          </div>

          {(previewContacts.length > 0 || isPreviewLoading) && (
            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 space-y-4">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t.audiencePreview}</h4>
                  <div className="flex flex-wrap items-center gap-2">
                     <span className="text-[10px] font-bold text-slate-500">{language === 'ar' ? `مشاهدة أول ${Math.min(previewContacts.length, 100)} رقم` : `Previewing first ${Math.min(previewContacts.length, 100)} numbers`}</span>
                     <button
                        type="button"
                        onClick={handleFilterPreview}
                        disabled={isFiltering || isPreviewLoading || formData.deviceSessions.length === 0}
                        className="text-[10px] font-black text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                     >
                        {isFiltering ? (language === 'ar' ? "⏳ جاري الفلترة..." : "⏳ Filtering...") : t.checkActivity}
                     </button>
                      <button
                        type="button"
                        onClick={convertGroupToManual}
                        disabled={isPreviewLoading || previewContacts.length === 0 || formData.sourceType === 'manual'}
                        className={`text-xs font-black px-6 py-2.5 rounded-full transition-all flex items-center gap-2 ${
                            formData.sourceType !== 'manual' 
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 scale-105 animate-pulse' 
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {formData.sourceType !== 'manual' ? t.importForReview : (language === 'ar' ? 'تم الاستيراد ✅' : 'Imported ✅')}
                      </button>
                  </div>
               </div>
               
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {isPreviewLoading ? (
                    <div className="col-span-full py-4 text-center text-slate-600 animate-pulse font-bold italic">{language === 'ar' ? 'جاري جلب قائمة الأرقام من واتساب...' : 'Fetching numbers from WhatsApp...'}</div>
                  ) : (
                    previewContacts.slice(0, 100).map((c, i) => (
                        <div key={i} className={`bg-slate-900 border rounded-lg p-3 flex items-center justify-between transition-all group/item ${
                            c.status === 'active' ? 'border-emerald-500/50 bg-emerald-500/5' : 
                            c.status === 'invalid' ? 'border-rose-500/50 bg-rose-500/5' : 'border-slate-800/50'
                        }`}>
                           <div className={`flex flex-col ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                               <span className={`text-[10px] font-mono ${
                                   c.status === 'active' ? 'text-emerald-400' : 
                                   c.status === 'invalid' ? 'text-rose-400' : 'text-slate-300'
                               }`}>{c.phone}</span>
                               <span className="text-[8px] text-slate-600 font-bold uppercase">
                                 {c.status === 'pending' ? (language === 'ar' ? 'بانتظار الفحص' : 'Pending') : 
                                  c.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : 
                                  (language === 'ar' ? 'غير صالح' : 'Invalid')}
                               </span>
                           </div>
                           <div className="flex items-center gap-2">
                               <button 
                                 type="button"
                                 onClick={() => handleTestSend(c)}
                                 className="opacity-0 group-hover/item:opacity-100 bg-emerald-500 text-white text-[8px] font-black px-2 py-1 rounded hover:bg-emerald-400 transition-all"
                               >
                                 {language === 'ar' ? 'تجربة 📩' : 'Test 📩'}
                               </button>
                               <span className="text-[10px] grayscale group-hover/item:grayscale-0 transition-all">
                                   {c.status === 'active' ? '✅' : c.status === 'invalid' ? '❌' : '⏳'}
                               </span>
                           </div>
                        </div>
                    ))
                  )}
               </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-400 mr-2 uppercase tracking-widest">{t.messageText}</label>
            <textarea
              required
              rows={5}
              value={formData.messageText}
              onChange={(e) => setFormData({ ...formData, messageText: e.target.value })}
              className={`w-full px-6 py-4 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-bold text-white placeholder:text-slate-700 resize-none ${language === 'ar' ? 'text-right' : 'text-left'}`}
              placeholder={t.messagePlaceholder}
            ></textarea>
          </div>

          <div className="bg-slate-950/50 border border-slate-800 rounded-[2rem] p-8 space-y-6">
             <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-4">
                <h4 className="font-black text-white flex items-center gap-2">
                  {t.antiBanSettings}
                </h4>
                <div className="flex gap-2">
                    <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{language === 'ar' ? 'تحميل مجدول' : 'Scheduled Load'}</span>
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{language === 'ar' ? 'الأمان: عالي' : 'Security: High'}</span>
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <div className="flex justify-between items-center px-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">{t.minDelay}</label>
                      <span className="text-emerald-400 font-black">{formData.minDelay} {t.seconds}</span>
                   </div>
                   <input 
                      type="range" min="20" max="120" 
                      value={formData.minDelay}
                      onChange={(e) => setFormData({...formData, minDelay: Number(e.target.value)})}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" 
                   />
                </div>
                <div className="space-y-4">
                   <div className="flex justify-between items-center px-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">{t.maxDelay}</label>
                      <span className="text-cyan-400 font-black">{formData.maxDelay} {t.seconds}</span>
                   </div>
                   <input 
                      type="range" min="10" max="180" 
                      value={formData.maxDelay}
                      onChange={(e) => setFormData({...formData, maxDelay: Number(e.target.value)})}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" 
                   />
                </div>
             </div>
          </div>

          {error && <p className="text-rose-500 text-sm font-bold bg-rose-500/10 p-4 rounded-xl text-center border border-rose-500/20">{error}</p>}

          <div className="flex gap-4 pt-4">
              {formData.sourceType === 'manual' ? (
                <button
                    type="submit"
                    disabled={loading || formData.deviceSessions.length === 0 || targetCount === 0}
                    className="flex-1 py-5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
                >
                    {loading ? (language === 'ar' ? "⏳ جاري الإطلاق..." : "⏳ Launching...") : (language === 'ar' ? "انطلق عبر الأجهزة المختارة 🚀" : "Launch via selected devices 🚀")}
                </button>
              ) : (
                <div className="flex-1 p-5 bg-slate-800/40 border border-slate-700/50 rounded-2xl text-center">
                    <p className="text-slate-400 font-bold mb-1">{t.stepRemaining}</p>
                    <p className="text-[10px] text-slate-500 font-black uppercase">{t.mustImport}</p>
                </div>
              )}
             <button
               type="button"
               onClick={() => router.back()}
               className="px-8 py-5 border border-slate-800 text-slate-400 hover:bg-slate-800/50 font-bold rounded-2xl transition-all"
             >
               {language === 'ar' ? 'إلغاء' : 'Cancel'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StepInfo({ number, title, desc, icon }: any) {
    const { language } = useLanguage();
    return (
        <div className="bg-slate-900/30 backdrop-blur-xl border border-white/5 p-5 rounded-[24px] flex items-center gap-4 group hover:bg-white/5 transition-all">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-lg group-hover:scale-110 transition-transform">
                {number}
            </div>
            <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                <h4 className="font-black text-white text-sm mb-0.5">{icon} {title}</h4>
                <p className="text-[10px] text-slate-500 font-bold leading-tight">{desc}</p>
            </div>
        </div>
    );
}
