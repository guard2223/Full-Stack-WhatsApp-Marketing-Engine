"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiFetch } from "@/lib/api";

export default function ContactsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContact, setNewContact] = useState({ name: "", phone: "", group: language === 'ar' ? "عام" : "General" });
  const [bulkInput, setBulkInput] = useState("");
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk'>('individual');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) fetchContacts();
  }, [user, authLoading]);

  const fetchContacts = async () => {
    try {
      const res = await apiFetch("/contacts");
      const data = await res.json();
      setContacts(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const msg = language === 'ar' ? "هل أنت متأكد من حذف جهة الاتصال هذه؟" : "Are you sure you want to delete this contact?";
    if (!confirm(msg)) return;
    await apiFetch(`/contacts/${id}`, { method: "DELETE" });
    fetchContacts();
  };

  const handleAddIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.phone) return;
    const res = await apiFetch("/contacts", {
      method: "POST",
      body: JSON.stringify(newContact),
    });
    if (res.ok) { setNewContact({ name: "", phone: "", group: language === 'ar' ? "عام" : "General" }); fetchContacts(); }
  };

  const handleAddBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkInput.split('\n').filter(l => l.trim());
    const contactsToAdd = lines.map(line => {
      const parts = line.split(',');
      return { 
        name: parts[1] ? parts[1].trim() : (language === 'ar' ? "بدون اسم" : "Unnamed"), 
        phone: parts[0].trim(), 
        group: parts[2] ? parts[2].trim() : (language === 'ar' ? "عام" : "General") 
      };
    });
    const res = await apiFetch("/contacts/bulk", { method: "POST", body: JSON.stringify({ contacts: contactsToAdd }) });
    if (res.ok) { setBulkInput(""); fetchContacts(); }
  };

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  // Group contacts by group name
  const filtered = contacts.filter(c =>
    !search || c.phone.includes(search) || (c.name && c.name.includes(search))
  );
  const grouped = filtered.reduce<Record<string, any[]>>((acc, c) => {
    const key = c.group || (language === 'ar' ? 'عام' : 'General');
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});
  const groupNames = Object.keys(grouped).sort();

  if (authLoading || !user) return (
    <div className="flex items-center justify-center min-h-[60vh] text-emerald-500 font-bold">{t.verifyingIdentity}</div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden gap-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="relative z-10 text-center md:text-right">
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">{t.manageContacts}</h2>
          <p className="text-slate-400 font-medium">{t.manageContactsDesc}</p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <span className="px-5 py-2 bg-slate-950/80 border border-slate-800 rounded-2xl text-emerald-400 font-black text-sm">
            {contacts.length} {language === 'ar' ? 'جهة اتصال' : 'Contacts'}
          </span>
          <span className="px-5 py-2 bg-slate-950/80 border border-slate-800 rounded-2xl text-purple-400 font-black text-sm">
            {groupNames.length} {language === 'ar' ? 'مجموعة' : 'Groups'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[2rem] p-8 shadow-2xl">
            {/* Tabs */}
            <div className="flex bg-slate-950 p-1.5 rounded-2xl mb-8 space-x-1">
              <button
                onClick={() => setActiveTab('individual')}
                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'individual' ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
              >{t.singleAdd}</button>
              <button
                onClick={() => setActiveTab('bulk')}
                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'bulk' ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
              >{t.bulkUpload}</button>
            </div>

            {activeTab === 'individual' ? (
              <form onSubmit={handleAddIndividual} className="space-y-4">
                {[
                  { label: t.clientName, key: "name", placeholder: language === 'ar' ? "الأستاذ محمد..." : "John Doe...", required: false },
                  { label: t.phoneNumber, key: "phone", placeholder: "01012345678", required: true },
                  { label: t.group, key: "group", placeholder: language === 'ar' ? "عام" : "General", required: false },
                ].map(f => (
                  <div key={f.key} className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{f.label}</label>
                    <input
                      type="text" required={f.required}
                      value={(newContact as any)[f.key]}
                      onChange={e => setNewContact({ ...newContact, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full px-5 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl focus:outline-none focus:border-emerald-500 transition-all font-bold text-white placeholder:text-slate-700 text-sm"
                    />
                  </div>
                ))}
                <button className="w-full py-4 mt-2 bg-emerald-500 text-slate-950 font-black rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                  {t.saveClient}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAddBulk} className="space-y-4">
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-dashed border-slate-800">
                  <p className="text-[10px] text-slate-500 font-bold mb-3 leading-relaxed">
                    {language === 'ar' ? (
                        <>* كل سطر: <span className="text-emerald-500">رقم, الاسم, المجموعة</span><br />مثال: 01012345678, محمد, VIP</>
                    ) : (
                        <>* Each line: <span className="text-emerald-500">Number, Name, Group</span><br />Example: 01012345678, John, VIP</>
                    )}
                  </p>
                  <textarea
                    rows={8} value={bulkInput}
                    onChange={e => setBulkInput(e.target.value)}
                    placeholder={language === 'ar' ? "01012345678, محمد, عام..." : "01012345678, John, General..."}
                    className="w-full bg-transparent border-none focus:ring-0 text-white font-bold placeholder:text-slate-800 resize-none font-mono text-sm"
                  />
                </div>
                <button className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-all">
                  {language === 'ar' ? 'بدء الاستيراد الذكي 🚀' : 'Start Smart Import 🚀'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Grouped Contact List */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[2.5rem] overflow-hidden shadow-2xl">
            {/* Search bar */}
            <div className="p-6 border-b border-slate-800/60 bg-slate-900/20">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full px-5 py-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-white font-bold placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all text-sm"
              />
            </div>

            {/* Accordion Groups */}
            <div className="overflow-y-auto max-h-[620px] divide-y divide-slate-800/30">
              {loading ? (
                <div className="py-20 text-center text-slate-500 font-bold">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
              ) : groupNames.length === 0 ? (
                <div className="py-20 text-center">
                  <span className="text-5xl block mb-4">😶‍🌫️</span>
                  <p className="font-bold text-slate-500">{language === 'ar' ? 'لا يوجد جهات اتصال مضافة حالياً' : 'No contacts added yet'}</p>
                </div>
              ) : (
                groupNames.map(group => {
                  const members = grouped[group];
                  const isOpen = openGroups.has(group);
                  return (
                    <div key={group}>
                      {/* Group Header — clickable */}
                      <button
                        onClick={() => toggleGroup(group)}
                        className={`w-full flex items-center justify-between px-8 py-5 hover:bg-slate-800/20 transition-all group ${language === 'ar' ? 'text-right' : 'text-left'}`}
                      >
                        <div className={`flex items-center gap-4 ${language === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}>
                           <span className={`px-4 py-1.5 rounded-xl text-xs font-black border transition-all ${isOpen ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                             {members.length}
                           </span>
                           <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                             <p className="font-black text-white text-base">{group}</p>
                             <p className="text-xs text-slate-500 font-bold">{members.length} {language === 'ar' ? 'عضو' : 'Members'}</p>
                           </div>
                           {/* Animated chevron */}
                           <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-emerald-500/20 text-emerald-400 rotate-90' : 'bg-slate-800 text-slate-500 group-hover:text-white'}`}>
                             <svg className={`w-4 h-4 transition-transform duration-300 ${language === 'ar' ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                             </svg>
                           </div>
                        </div>
                      </button>

                      {/* Members list — slides open */}
                      {isOpen && (
                        <div className="bg-slate-950/30 border-t border-slate-800/30">
                          <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                            <thead>
                              <tr className="text-[9px] font-black tracking-widest text-slate-600 uppercase bg-slate-950/40">
                                <th className="px-10 py-3">{language === 'ar' ? 'الاسم' : 'Name'}</th>
                                <th className="px-10 py-3">{language === 'ar' ? 'رقم الهاتف' : 'Phone'}</th>
                                <th className="px-10 py-3"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/20">
                              {members.map((c, i) => (
                                <tr key={i} className="hover:bg-slate-800/20 transition-all group/row">
                                  <td className="px-10 py-4 font-bold text-white text-sm">{c.name || '—'}</td>
                                  <td className="px-10 py-4 text-slate-400 font-mono text-sm tracking-wider" dir="ltr">
                                    {c.phone}
                                  </td>
                                  <td className={`px-10 py-4 opacity-0 group-hover/row:opacity-100 transition-opacity ${language === 'ar' ? 'text-left' : 'text-right'}`}>
                                    <button
                                      onClick={() => handleDelete(c.id)}
                                      className="text-rose-500 hover:text-rose-400 font-black text-[10px] uppercase px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition-all"
                                    >
                                      {language === 'ar' ? 'حذف' : 'Delete'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
