export default function Premium() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Premium</h1>
          <p className="page-subtitle">Everything is free — no premium needed</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto">
        <div className="card border-emerald-500/20 text-center py-16">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-3xl shadow-xl shadow-emerald-500/20 mb-4">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-emerald-400 mt-4">All Features Unlocked</h2>
          <p className="text-slate-400 mt-3 max-w-md mx-auto">
            DukaLedger Pro is now completely free. All features — POS, Inventory, Daftari, Cash Drawer, and Insights — are available to every user.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <span className="badge-cyan">POS Terminal</span>
            <span className="badge-emerald">Inventory</span>
            <span className="badge-amber">Daftari</span>
            <span className="badge-cyan">Cash Drawer</span>
            <span className="badge-emerald">Insights</span>
          </div>
        </div>
      </div>
    </div>
  );
}
