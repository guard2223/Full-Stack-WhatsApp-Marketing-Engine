"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiFetch } from "@/lib/api";

interface Device {
    id: string;
    sessionId: string;
    phone: string;
    name: string;
    status: 'connected' | 'disconnected';
}

interface RawContact {
    id: string;
    phone: string;
    name: string;
    isBusiness: boolean;
}

export default function ContactExtractorPage() {
    const { user, isLoading: authLoading } = useAuth();
    const { t, language } = useLanguage();
    const router = useRouter();

    const [devices, setDevices] = useState<Device[]>([]);
    const [selectedDevice, setSelectedDevice] = useState("");
    const [contacts, setContacts] = useState<RawContact[]>([]);
    const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
    
    const [loading, setLoading] = useState(true);
    const [fetching, setFetching] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    
    const [saveGroup, setSaveGroup] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) { router.push('/login'); return; }
        if (user) {
            fetchDevices();
        }
    }, [user, authLoading]);

    const fetchDevices = async () => {
        try {
            const res = await apiFetch("/devices");
            const data: Device[] = await res.json();
            const connected = data.filter(d => d.status?.toLowerCase() === 'connected');
            setDevices(connected);
            if (connected.length > 0) setSelectedDevice(connected[0].sessionId);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching devices", err);
            setLoading(false);
        }
    };

    const handleExtract = async () => {
        if (!selectedDevice) {
            alert(language === 'ar' ? "الرجاء اختيار جهاز أولاً" : "Please select a device first");
            return;
        }
        
        console.log("Extracting contacts for device:", selectedDevice);
        setFetching(true);
        setContacts([]);
        setSelectedContacts(new Set());
        
        try {
            // Strategy: Try primary endpoint first
            let res = await apiFetch(`/whatsapp/${selectedDevice}/contacts`);
            
            // If primary fails with 404, try alternative
            if (res.status === 404) {
                console.log("Primary endpoint not found, trying alternative...");
                res = await apiFetch(`/whatsapp/${selectedDevice}/all-contacts`);
            }

            if (res.ok) {
                const data = await res.json();
                console.log("Contacts fetched successfully:", data.length);
                if (data.length === 0) {
                    alert(language === 'ar' ? "لم يتم العثور على جهات اتصال في هذا الجهاز." : "No contacts found on this device.");
                }
                setContacts(data);
                setSelectedContacts(new Set(data.map((c: RawContact) => c.phone)));
            } else {
                const errData = await res.json().catch(() => ({}));
                console.error("Extraction failed response:", res.status, errData);
                alert((language === 'ar' ? "فشل السحب: " : "Extraction failed: ") + (errData.error || res.statusText));
            }
        } catch (e) {
            console.error("Critical Extraction error:", e);
            alert(language === 'ar' ? "❌ خطأ في الاتصال بالخادم. تأكد من أن الجهاز متصل بالسيرفر." : "❌ Server connection error. Make sure the device is connected to the server.");
        }
        setFetching(false);
    };

    const toggleSelection = (phone: string) => {
        const newSet = new Set(selectedContacts);
        if (newSet.has(phone)) newSet.delete(phone);
        else newSet.add(phone);
        setSelectedContacts(newSet);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedContacts(new Set(filteredContacts.map(c => c.phone)));
        else setSelectedContacts(new Set());
    };

    const handleSaveToCRM = async () => {
        if (selectedContacts.size === 0) return alert(language === 'ar' ? "الرجاء تحديد جهة اتصال واحدة على الأقل." : "Please select at least one contact.");
        if (!saveGroup.trim()) return alert(language === 'ar' ? "الرجاء إدخال اسم المجموعة لحفظ جهات الاتصال فيها." : "Please enter a group name.");

        setSaving(true);
        
        const payload = Array.from(selectedContacts).map(phone => {
            const c = contacts.find(cx => cx.phone === phone);
            return {
                name: c?.name || (language === 'ar' ? "جهة اتصال مسحوبة" : "Extracted Contact"),
                phone: phone,
                group: saveGroup.trim()
            };
        });

        try {
            const res = await apiFetch("/contacts/bulk", {
                method: "POST",
                body: JSON.stringify({ contacts: payload })
            });

            if (res.ok) {
                const msg = language === 'ar' 
                    ? `✅ تم حفظ ${payload.length} جهة اتصال بنجاح في مجموعة "${saveGroup}"` 
                    : `✅ Saved ${payload.length} contacts successfully in group "${saveGroup}"`;
                alert(msg);
                router.push('/contacts');
            } else {
                const err = await res.json();
                alert(`❌ ${language === 'ar' ? 'فشل الحفظ' : 'Save failed'}: ${err.error}`);
            }
        } catch (e) {
            alert(language === 'ar' ? "❌ خطأ في الاتصال." : "❌ Connection error.");
        }
        setSaving(false);
    };

    const filteredContacts = contacts.filter(c => 
        (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm)
    );

    if (authLoading || !user || loading) return <div className="flex items-center justify-center min-h-[60vh] text-blue-500 font-bold italic animate-pulse">{t.verifyingIdentity}</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header */}
            <div className={`flex items-center flex-col md:flex-row justify-between bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                <div className={`absolute top-0 ${language === 'ar' ? 'right-0' : 'left-0'} w-32 h-32 bg-blue-500/10 rounded-full blur-3xl`} />
                <div className="relative z-10 w-full">
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">{t.extractContacts}</h2>
                    <p className="text-slate-400 font-medium">{t.extractDesc}</p>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row gap-4 justify-between items-end">
                <div className="w-full md:w-1/2 space-y-2">
                    <label className={`text-xs font-black text-slate-500 uppercase tracking-widest block ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.selectDevice}</label>
                    <div className="relative">
                        <select 
                            value={selectedDevice} 
                            onChange={e => setSelectedDevice(e.target.value)}
                            className={`w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all font-bold text-slate-300 text-sm appearance-none cursor-pointer ${language === 'ar' ? 'text-right' : 'text-left'}`}
                        >
                            {devices.map(d => (
                                <option key={d.id} value={d.sessionId}>{d.name} ({d.phone})</option>
                            ))}
                            {devices.length === 0 && <option value="">{language === 'ar' ? 'لا توجد أجهزة متصلة' : 'No connected devices'}</option>}
                        </select>
                        <div className={`absolute ${language === 'ar' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 pointer-events-none text-slate-500`}>▼</div>
                    </div>
                    {devices.length === 0 && !loading && (
                        <p className={`text-[10px] font-bold text-rose-400 mt-2 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                            ⚠️ {language === 'ar' ? 'يجب ربط جهاز واتساب وتوصيله أولاً لتتمكن من السحب.' : 'You must link and connect a WhatsApp device first to extract contacts.'}
                            <button onClick={() => router.push('/devices')} className="mx-2 underline hover:text-rose-300">{language === 'ar' ? 'اذهب لربط جهاز' : 'Go to devices'}</button>
                        </p>
                    )}
                </div>
                
                <button 
                    onClick={handleExtract}
                    disabled={!selectedDevice || fetching}
                    className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                    {fetching ? t.extracting : t.startExtraction}
                </button>
            </div>

            {/* Results */}
            {contacts.length > 0 && (
                <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 shadow-xl space-y-6">
                    <div className={`flex flex-col md:flex-row justify-between gap-4 items-center ${language === 'ar' ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                        <div className={`flex items-center gap-3 w-full md:w-auto ${language === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}>
                            <h3 className="text-xl font-black text-white">{language === 'ar' ? 'نتائج السحب' : 'Extraction Results'}</h3>
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-bold border border-blue-500/30">
                                {contacts.length} {language === 'ar' ? 'جهة اتصال' : 'Contacts'}
                            </span>
                        </div>
                        <input 
                            type="text"
                            placeholder={language === 'ar' ? 'بحث في النتائج...' : 'Search results...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full md:w-64 px-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 text-sm text-white ${language === 'ar' ? 'text-right' : 'text-left'}`}
                        />
                    </div>

                    <div className="bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                            <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} text-sm`}>
                                <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase sticky top-0 z-10 font-black backdrop-blur-md">
                                    <tr>
                                        <th className="px-6 py-4 w-16 text-center">
                                            <input 
                                                type="checkbox" 
                                                onChange={handleSelectAll}
                                                checked={filteredContacts.length > 0 && selectedContacts.size === filteredContacts.length}
                                                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 cursor-pointer" 
                                            />
                                        </th>
                                        <th className="px-6 py-4">{language === 'ar' ? 'الاسم' : 'Name'}</th>
                                        <th className="px-6 py-4">{language === 'ar' ? 'رقم الواتساب' : 'Phone'}</th>
                                        <th className="px-6 py-4 text-center">{language === 'ar' ? 'النوع' : 'Type'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {filteredContacts.map(c => {
                                        const isChecked = selectedContacts.has(c.phone);
                                        return (
                                            <tr key={c.phone} 
                                                onClick={() => toggleSelection(c.phone)}
                                                className={`hover:bg-slate-800/30 transition-colors cursor-pointer ${isChecked ? 'bg-blue-500/5' : ''}`}
                                            >
                                                <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isChecked}
                                                        onChange={() => toggleSelection(c.phone)}
                                                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 cursor-pointer" 
                                                    />
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-200">
                                                    {c.name || (language === 'ar' ? 'بدون اسم' : 'Unnamed')}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-slate-400 font-medium tracking-wide" dir="ltr">
                                                    +{c.phone}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {c.isBusiness ? (
                                                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-black uppercase">
                                                            {language === 'ar' ? 'حساب أعمال' : 'Business'}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-black uppercase">
                                                            {language === 'ar' ? 'عادي' : 'Standard'}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredContacts.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-bold italic">
                                                {language === 'ar' ? 'لا توجد نتائج مطابقة للبحث' : 'No matching results found'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Action Bar */}
            {contacts.length > 0 && selectedContacts.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-[600px] bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-4 animate-in slide-in-from-bottom-10 z-50">
                    <div className="flex-1 w-full">
                        <input 
                            type="text" required
                            placeholder={language === 'ar' ? "اسم المجموعة (مثال: عملاء واتساب)" : "Group Name (e.g. WhatsApp Clients)"}
                            value={saveGroup} onChange={e => setSaveGroup(e.target.value)}
                            className={`w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-bold text-white text-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
                        />
                    </div>
                    <button 
                        onClick={handleSaveToCRM}
                        disabled={saving || !saveGroup.trim()}
                        className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg transition-all disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
                    >
                        {saving ? (language === 'ar' ? '⏳ جاري الحفظ...' : '⏳ Saving...') : `${language === 'ar' ? '📥 حفظ' : '📥 Save'} ${selectedContacts.size} ${language === 'ar' ? 'جهة اتصال' : 'Contacts'}`}
                    </button>
                </div>
            )}
        </div>
    );
}
