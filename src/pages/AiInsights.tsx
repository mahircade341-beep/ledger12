import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useLocalData } from '../hooks/useLocalData';
import { useAuth } from '../contexts/AuthContext';
import { getGroqKey, setGroqKey, isValidGroqKey, streamGroqChat, type GroqMessage } from '../lib/groq';

type ViewPeriod = 'daily' | 'weekly' | 'monthly' | 'all';

function fmtTime(ts: number) {
  const pref = localStorage.getItem('dl-time-format') || '12h';
  if (pref === '24h') return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AiInsights() {
  const { userId, profile } = useAuth();
  const { data: transactions } = useLocalData('transactions');
  const { data: products } = useLocalData('products');
  const { data: debtors } = useLocalData('debtors');
  const { data: debtPayments } = useLocalData('debtPayments');
  const { data: payouts } = useLocalData('payouts');

  const [period, setPeriod] = useState<ViewPeriod>('monthly');
  const [apiKey, setApiKey] = useState(getGroqKey() || '');
  const [showKeyInput, setShowKeyInput] = useState(!getGroqKey());
  const [analysis, setAnalysis] = useState<string>('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [abortRef, setAbortRef] = useState<AbortController | null>(null);
  const [followUp, setFollowUp] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const analysisRef = useRef<HTMLDivElement>(null);
  const followUpRef = useRef<HTMLInputElement>(null);

  // ── Date ranges ──
  const getDateRange = (forPeriod?: ViewPeriod) => {
    const now = new Date();
    let start: Date;
    const p = forPeriod || period;
    if (p === 'all') start = new Date(0);
    else if (p === 'daily') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (p === 'weekly') { const day = now.getDay(); start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0, 0, 0, 0); }
    else start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now };
  };

  const { start, end } = getDateRange();

  const filteredTransactions = useMemo(() => transactions.filter((t: any) => t._creationTime >= start.getTime() && t._creationTime <= end.getTime()), [transactions, start, end]);
  const filteredPayouts = useMemo(() => payouts.filter((p: any) => p._creationTime >= start.getTime() && p._creationTime <= end.getTime()), [payouts, start, end]);

  // ── Stats ──
  const grossSales = filteredTransactions.reduce((s: number, t: any) => s + t.total, 0);
  const numTransactions = filteredTransactions.length;
  const avgTicket = numTransactions > 0 ? grossSales / numTransactions : 0;

  const cashTotal = filteredTransactions.filter((t: any) => t.paymentMethod === 'cash').reduce((s: number, t: any) => s + t.total, 0);
  const mpesaTotal = filteredTransactions.filter((t: any) => t.paymentMethod === 'mpesa').reduce((s: number, t: any) => s + t.total, 0);
  const debtTotal = filteredTransactions.filter((t: any) => t.paymentMethod === 'debt').reduce((s: number, t: any) => s + t.total, 0);
  const totalDiscounts = filteredTransactions.reduce((s: number, t: any) => s + (t.discount || 0), 0);
  const totalPayouts = filteredPayouts.reduce((s: number, p: any) => s + p.amount, 0);

  const totalOutstandingDebt = debtors.filter((d: any) => d.status === 'active').reduce((s: number, d: any) => s + d.amount, 0);

  // Profit
  const profitData = useMemo(() => {
    let totalProfit = 0, totalCost = 0, itemsMissing = 0, totalItems = 0;
    filteredTransactions.forEach((tx: any) => {
      (tx.items || []).forEach((item: any) => {
        totalItems++;
        const product = products.find((p: any) => p._id === item.productId || p.name === item.name);
        const wholesale = product?.wholesalePrice || item.wholesalePrice || 0;
        if (wholesale === 0 && item.price > 0) itemsMissing++;
        totalCost += wholesale * item.quantity;
        totalProfit += item.subtotal - (wholesale * item.quantity);
      });
    });
    return { totalProfit, totalCost, margin: grossSales > 0 ? (totalProfit / grossSales) * 100 : 0, itemsMissing, totalItems };
  }, [filteredTransactions, products, grossSales]);

  // Top products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();
    filteredTransactions.forEach((tx: any) => {
      (tx.items || []).forEach((item: any) => {
        const existing = map.get(item.name) || { name: item.name, qty: 0, revenue: 0, profit: 0 };
        existing.qty += item.quantity;
        existing.revenue += item.subtotal;
        const product = products.find((p: any) => p._id === item.productId || p.name === item.name);
        const wholesale = product?.wholesalePrice || item.wholesalePrice || 0;
        existing.profit += item.subtotal - (wholesale * item.quantity);
        map.set(item.name, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filteredTransactions, products]);

  // Slow-moving products (in stock, never sold this period)
  const slowMoving = useMemo(() => {
    const soldNames = new Set<string>();
    filteredTransactions.forEach((tx: any) => (tx.items || []).forEach((item: any) => soldNames.add(item.name)));
    return products.filter((p: any) => !soldNames.has(p.name) && p.quantity > 0).slice(0, 20);
  }, [products, filteredTransactions]);

  // ── Build system prompt ──
  const buildSystemPrompt = (): string => {
    return `You are DukaHub AI, a sharp business analyst for small Kenyan retail shops. Analyze the shop data below and produce a **clear, actionable breakdown** in plain English. Use the 80/20 rule — focus on what matters most to a shop owner.

Format your response with these sections (use markdown):

## 📊 Performance Snapshot
A one-paragraph executive summary of the shop's health this period.

## 🏆 Top Performers
Which products drive the most revenue and profit. Call out winners.

## ⚠️ Watch Out
Risks, discrepancies, missing wholesale prices, slow-moving stock, cash flow issues.

## 💡 Opportunities
Actionable recommendations — e.g. which products to reorder, which to discount, follow up on debtors, adjust pricing.

## 🎯 Quick Wins
3-5 specific things the shop owner can do TODAY to improve profit or cash flow.

---
**Shop Data:**
- Period: ${period}
- Total Sales: ${numTransactions} transactions worth KES ${grossSales.toLocaleString()}
- Average Ticket: KES ${avgTicket.toLocaleString()}
- Cash Collected: KES ${cashTotal.toLocaleString()}
- M-Pesa Collected: KES ${mpesaTotal.toLocaleString()}
- Credit Sales (Debt): KES ${debtTotal.toLocaleString()}
- Total Discounts Given: KES ${totalDiscounts.toLocaleString()}
- Payouts (Expenses): KES ${totalPayouts.toLocaleString()}
- Confirmed Profit: KES ${profitData.totalProfit.toLocaleString()} (${profitData.margin.toFixed(1)}% margin)
- Items Missing Wholesale Price: ${profitData.itemsMissing} of ${profitData.totalItems} items sold
- Total Outstanding Debt: KES ${totalOutstandingDebt.toLocaleString()} across ${debtors.filter((d: any) => d.status === 'active').length} active debtors
- Products in Stock: ${products.length}
- Slow-Moving Products (no sales this period): ${slowMoving.length}
- Low Stock Products (≤5 units): ${products.filter((p: any) => p.quantity > 0 && p.quantity <= 5).length}
- Out of Stock: ${products.filter((p: any) => p.quantity <= 0).length}

**Top Products (by revenue):**
${topProducts.map((p, i) => `${i + 1}. ${p.name} — KES ${p.revenue.toLocaleString()} revenue, ${p.qty} units, KES ${p.profit.toLocaleString()} profit`).join('\n')}

**Active Debtors:**
${debtors.filter((d: any) => d.status === 'active').slice(0, 10).map((d: any) => `- ${d.name}: KES ${d.amount.toLocaleString()}`).join('\n') || 'None'}

**Recent Transactions (last 5):**
${filteredTransactions.slice(-5).map((t: any) => `- ${new Date(t._creationTime).toLocaleDateString()} ${fmtTime(t._creationTime)} | KES ${t.total.toLocaleString()} | ${t.paymentMethod}${t.debtorName ? ' (' + t.debtorName + ')' : ''}`).join('\n')}`;
  };

  // ── Run analysis ──
  const runAnalysis = useCallback(async (customPrompt?: string) => {
    setError('');
    setStreaming(true);

    // Abort any previous request
    if (abortRef) abortRef.abort();
    const controller = new AbortController();
    setAbortRef(controller);

    if (!customPrompt) setAnalysis('');

    const messages: GroqMessage[] = [
      { role: 'system', content: buildSystemPrompt() },
    ];
    if (customPrompt) {
      messages.push({ role: 'user', content: customPrompt });
    } else {
      messages.push({ role: 'user', content: 'Analyze my shop data and give me actionable insights.' });
    }

    let fullText = customPrompt ? analysis : '';
    try {
      for await (const chunk of streamGroqChat(messages, { signal: controller.signal })) {
        if (chunk.done) break;
        fullText += chunk.content;
        setAnalysis(fullText);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Analysis failed. Check your API key and try again.');
    } finally {
      setStreaming(false);
      setAbortRef(null);
    }
  }, [analysis, abortRef, period, filteredTransactions, products, debtors, filteredPayouts, topProducts, slowMoving, profitData, grossSales, numTransactions, avgTicket, cashTotal, mpesaTotal, debtTotal, totalDiscounts, totalPayouts, totalOutstandingDebt]);

  // ── Follow-up question ──
  const handleFollowUp = async () => {
    if (!followUp.trim() || followUpLoading) return;
    setFollowUpLoading(true);
    const question = followUp.trim();
    setFollowUp('');

    setAnalysis(prev => prev + `\n\n---\n\n**You asked:** ${question}\n\n`);
    await runAnalysis(question);
    setFollowUpLoading(false);
  };

  // ── Save key ──
  const handleSaveKey = () => {
    if (!isValidGroqKey(apiKey)) {
      setError('Invalid API key — must start with "gsk_" and be at least 10 characters');
      return;
    }
    setGroqKey(apiKey);
    setShowKeyInput(false);
    setError('');
  };

  useEffect(() => {
    if (analysisRef.current) {
      analysisRef.current.scrollTop = analysisRef.current.scrollHeight;
    }
  }, [analysis]);

  const hasKey = getGroqKey() && isValidGroqKey(getGroqKey() || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">AI Insights</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Powered by Groq · Your shop analyzed by AI in seconds</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-[var(--bg-surface2)] rounded-lg p-1">
            {(['daily', 'weekly', 'monthly', 'all'] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`tab-v2 ${period === p ? 'tab-v2-active' : ''} capitalize text-xs`}>{p}</button>
            ))}
          </div>
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="btn-v2-secondary text-xs h-8"
            title="Groq API Key"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
            {hasKey ? 'Key Set' : 'Set Key'}
          </button>
        </div>
      </div>

      {/* API Key Input */}
      {showKeyInput && (
        <div className="card-v2 border-amber-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Groq API Key</h2>
            </div>
            {hasKey && (
              <button onClick={() => { setShowKeyInput(false); }} className="btn-v2-ghost text-xs">Done</button>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Enter your Groq API key to enable AI analysis. Get one free at{' '}
            <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-[var(--accent-primary)] hover:underline">console.groq.com/keys</a>.
            Your key is stored locally on this device and never sent anywhere except Groq.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input-v2 flex-1 text-sm font-mono"
              placeholder="gsk_..."
            />
            <button onClick={handleSaveKey} className="btn-v2-primary text-xs h-9">Save Key</button>
            {getGroqKey() && (
              <button onClick={() => { setGroqKey(''); setApiKey(''); setShowKeyInput(true); }} className="btn-v2-secondary text-xs h-9">Remove</button>
            )}
          </div>
          {error && <p className="text-xs text-[var(--color-danger)] mt-2">{error}</p>}
        </div>
      )}

      {/* Stats row */}
      {!showKeyInput && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="stat-v2 stat-v2-accent">
            <span className="stat-label-v2">Gross Sales</span>
            <span className="stat-value-v2">KES {grossSales.toLocaleString()}</span>
            <span className="stat-desc-v2">{numTransactions} transactions</span>
          </div>
          <div className="stat-v2">
            <span className="stat-label-v2">Avg. Ticket</span>
            <span className="stat-value-v2 text-[var(--color-info)]">KES {avgTicket.toLocaleString()}</span>
            <span className="stat-desc-v2">{period} average</span>
          </div>
          <div className="stat-v2">
            <span className="stat-label-v2">Profit</span>
            <span className={`stat-value-v2 ${profitData.totalProfit >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>KES {profitData.totalProfit.toLocaleString()}</span>
            <span className="stat-desc-v2">{profitData.margin.toFixed(1)}% margin</span>
          </div>
          <div className="stat-v2">
            <span className="stat-label-v2">Outstanding Debt</span>
            <span className="stat-value-v2 text-[var(--color-warning)]">KES {totalOutstandingDebt.toLocaleString()}</span>
            <span className="stat-desc-v2">{debtors.filter((d: any) => d.status === 'active').length} debtors</span>
          </div>
        </div>
      )}

      {/* AI Analysis Card */}
      <div className="card-v2 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #10B981, #3B82F6, #8B5CF6)' }} />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">AI Shop Analysis</h2>
            {streaming && (
              <span className="flex items-center gap-1.5 text-xs text-purple-400">
                <span className="relative flex w-2 h-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full w-2 h-2 bg-purple-500" />
                </span>
                Thinking...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasKey && !showKeyInput && (
              <button
                onClick={() => runAnalysis()}
                disabled={streaming}
                className="btn-v2-primary text-xs h-8"
              >
                {streaming ? (
                  <span className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                    Analyze Now
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {!hasKey ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🧠</div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">AI-Powered Shop Analysis</h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-4">
              Get instant, actionable insights about your shop — top products, slow movers, profit warnings, pricing tips, and more.
            </p>
            <button onClick={() => setShowKeyInput(true)} className="btn-v2-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              Enter Your Groq API Key to Start
            </button>
            <p className="text-xs text-[var(--text-muted)] mt-3">
              Free API key from <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-[var(--accent-primary)] hover:underline">console.groq.com/keys</a>
            </p>
          </div>
        ) : (
          <>
            {!analysis && !streaming && (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">📊</div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">Ready to analyze</h3>
                <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                  Click <strong>Analyze Now</strong> to get AI-powered insights on your shop's performance, top products, risks, and quick wins.
                </p>
              </div>
            )}

            {error && (
              <div className="alert-v2-error mb-4">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div
              ref={analysisRef}
              className="prose prose-sm max-w-none overflow-y-auto max-h-[600px] pr-2 scrollbar-thin"
              style={{ color: 'var(--text-primary)' }}
            >
              {analysis ? (
                <div dangerouslySetInnerHTML={{ __html: analysis
                  .replace(/### (.*)/g, '<h3 class="text-base font-bold mt-5 mb-2" style="color:var(--text-primary)">$1</h3>')
                  .replace(/## (.*)/g, '<h2 class="text-lg font-bold mt-6 mb-3" style="color:var(--text-primary)">$1</h2>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
                  .replace(/\n- (.*)/g, '<li class="text-sm ml-4" style="color:var(--text-secondary)">$1</li>')
                  .replace(/\n\n/g, '</p><p class="text-sm leading-relaxed mb-3" style="color:var(--text-secondary)">')
                  .replace(/^(.+)$/gm, (match) => {
                    if (match.startsWith('<') || match.startsWith('</p>')) return match;
                    return `<p class="text-sm leading-relaxed mb-3" style="color:var(--text-secondary)">${match}</p>`;
                  })
                }} />
              ) : streaming ? (
                <div className="flex items-center gap-2 py-4">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm text-[var(--text-muted)]">Analyzing your shop data...</span>
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-[var(--text-muted)]">
                  Click "Analyze Now" to get started
                </div>
              )}
            </div>

            {/* Follow-up question */}
            {(analysis || streaming) && (
              <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleFollowUp(); }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={followUpRef}
                    type="text"
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                    className="input-v2 flex-1 text-sm"
                    placeholder="Ask a follow-up question..."
                    disabled={streaming}
                  />
                  <button
                    type="submit"
                    disabled={!followUp.trim() || followUpLoading || streaming}
                    className="btn-v2-primary text-xs h-9 shrink-0"
                  >
                    {followUpLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    )}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>

      {/* Top Products Card */}
      {hasKey && topProducts.length > 0 && (
        <div className="card-v2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Top Products This Period</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--text-muted)] border-b border-[var(--border-color)] text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-2 font-semibold">#</th>
                  <th className="text-left py-2 px-2 font-semibold">Product</th>
                  <th className="text-right py-2 px-2 font-semibold">Units Sold</th>
                  <th className="text-right py-2 px-2 font-semibold">Revenue</th>
                  <th className="text-right py-2 px-2 font-semibold">Profit</th>
                  <th className="text-right py-2 pl-2 font-semibold">Margin</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => {
                  const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
                  return (
                    <tr key={p.name} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-surface2)]/50 transition-colors">
                      <td className="py-2 pr-2 text-xs text-[var(--text-muted)]">{i + 1}</td>
                      <td className="py-2 px-2 font-medium text-[var(--text-primary)]">{p.name}</td>
                      <td className="py-2 px-2 text-right text-[var(--text-secondary)]">{p.qty}</td>
                      <td className="py-2 px-2 text-right text-[var(--color-info)] font-medium">KES {p.revenue.toLocaleString()}</td>
                      <td className={`py-2 px-2 text-right font-medium ${p.profit >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>KES {p.profit.toLocaleString()}</td>
                      <td className={`py-2 pl-2 text-right font-medium ${margin >= 20 ? 'text-[var(--color-success)]' : margin >= 10 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}`}>{margin.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slow-Moving / Data Quality Card */}
      {hasKey && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {slowMoving.length > 0 && (
            <div className="card-v2 border-amber-500/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v3.75m-4.24 0l.75-1.5m8.98 0l.75 1.5M12 9.75l-1.5 3M12 9.75l1.5 3M8.25 3.75l3 3m3-3l-3 3M12 21.75V9.75" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Slow-Moving Stock</h2>
                <span className="badge-v2-warning text-[10px]">{slowMoving.length} items</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-2">Products in stock with no sales this period — review pricing or consider promotions.</p>
              <div className="flex flex-wrap gap-1.5">
                {slowMoving.slice(0, 15).map((p: any) => (
                  <span key={p._id} className="text-xs px-2 py-1 rounded-md bg-[var(--item-bg)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                    {p.name} <span className="text-[var(--color-warning)]">({p.quantity} in stock)</span>
                  </span>
                ))}
                {slowMoving.length > 15 && <span className="text-xs text-[var(--text-muted)] self-center">+{slowMoving.length - 15} more</span>}
              </div>
            </div>
          )}

          {profitData.itemsMissing > 0 && (
            <div className="card-v2 border-amber-500/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Data Quality</h2>
                <span className="badge-v2-warning text-[10px]">{profitData.itemsMissing} issues</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {profitData.itemsMissing} of {profitData.totalItems} items sold are missing wholesale prices. Profit figures are incomplete.
                <br />
                <span className="text-[var(--color-warning)]">Fix: Set wholesale prices in Stock Management to get accurate profit analysis.</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}