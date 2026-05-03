"use client";

export default function AnalyticsPage() {
  const stats = {
    totalSent: 125430,
    delivered: 118200,
    failed: 7230,
    replies: 1540,
    successRate: 94.2,
  };

  const campaignsData = [
    { name: "Black Friday Sale", sent: 45000, delivered: 43500, failed: 1500, progress: 96 },
    { name: "Eid Promo - VIP Clients", sent: 12000, delivered: 11800, failed: 200, progress: 98 },
    { name: "Cold Outreach B2B", sent: 50000, delivered: 45000, failed: 5000, progress: 90 },
    { name: "Abandoned Cart Reminders", sent: 8430, delivered: 8100, failed: 330, progress: 96 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">Analytics & Reports</h1>
        <p className="text-muted-foreground mt-2" dir="rtl">
          إحصائيات شاملة لأداء الحملات التسويقية ونسب وصول الرسائل.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">Total Sent Messages</h3>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg text-xl">📨</div>
          </div>
          <p className="text-3xl font-bold text-slate-100 mt-4">{stats.totalSent.toLocaleString()}</p>
          <div className="flex items-center mt-2 text-xs text-emerald-400">
            <span>📈 +12.5% from last month</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">Successfully Delivered</h3>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-xl">✅</div>
          </div>
          <p className="text-3xl font-bold text-slate-100 mt-4">{stats.delivered.toLocaleString()}</p>
          <div className="flex items-center mt-2 text-xs text-emerald-400">
            <span>{stats.successRate}% Success Rate</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">Failed Messages</h3>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg text-xl">❌</div>
          </div>
          <p className="text-3xl font-bold text-slate-100 mt-4">{stats.failed.toLocaleString()}</p>
          <div className="flex items-center mt-2 text-xs text-rose-400">
            <span>Numbers may be blocked or invalid</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">Total Replies</h3>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg text-xl">👥</div>
          </div>
          <p className="text-3xl font-bold text-slate-100 mt-4">{stats.replies.toLocaleString()}</p>
          <div className="flex items-center mt-2 text-xs text-slate-400">
            <span>Interactive audience</span>
          </div>
        </div>
      </div>

      {/* Campaigns Performance (CSS Based Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-sm">
           <div className="flex items-center mb-6">
              <span className="text-xl mr-2">📊</span>
              <h2 className="text-xl font-semibold text-slate-100">Campaigns Performance</h2>
           </div>
           
           <div className="space-y-8">
              {campaignsData.map((campaign, idx) => (
                 <div key={idx} className="space-y-2">
                    <div className="flex justify-between text-sm">
                       <span className="font-medium text-slate-200">{campaign.name}</span>
                       <span className="text-slate-400">{campaign.progress}% Delivered</span>
                    </div>
                    {/* Native Progress Bar via Tailwind */}
                    <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex">
                       <div 
                         className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                         style={{ width: `${campaign.progress}%` }}
                       ></div>
                       <div 
                         className="h-full bg-rose-500 rounded-r-full transition-all duration-1000"
                         style={{ width: `${100 - campaign.progress}%` }}
                       ></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                       <span>Sent: {campaign.sent.toLocaleString()}</span>
                       <span className="text-rose-400">Failed: {campaign.failed.toLocaleString()}</span>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Server & Engine Health */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-sm">
           <div className="flex items-center mb-6">
              <span className="text-xl mr-2">⚙️</span>
              <h2 className="text-xl font-semibold text-slate-100">Engine Health</h2>
           </div>

           <div className="space-y-6">
               <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                   <h4 className="text-sm font-medium text-emerald-400 mb-1">WhatsApp Web Sockets</h4>
                   <p className="text-xs text-slate-400">Stable connection across 2 instances. Zero drops in the last 24h.</p>
               </div>
               <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                   <h4 className="text-sm font-medium text-blue-400 mb-1">Queue Memory (Redis)</h4>
                   <p className="text-xs text-slate-400">24MB / 512MB Used. 0 pending jobs in delay queues.</p>
               </div>
               <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
                   <h4 className="text-sm font-medium text-orange-400 mb-1">Daily Limit Health</h4>
                   <p className="text-xs text-slate-400">Reaching 80% of daily safe limit on Main Marketing Line.</p>
               </div>
           </div>
        </div>
      </div>

    </div>
  );
}
