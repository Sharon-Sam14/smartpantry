import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { TrendingUp, Wallet, AlertTriangle, Sparkles } from "lucide-react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart, CartesianGrid, BarChart, Bar, Cell } from "recharts";
import { useStore } from "@/lib/store";
import { forecastExpenses, expiryStatus, daysUntil, generateAIRecommendations } from "@/lib/ml";
import { useCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";

const colors: Record<string, string> = {
  Produce: "#5C9E72",    // Sage Green
  Protein: "#C8622A",    // Terracotta
  Dairy: "#B8943A",      // Aged Gold
  Pantry: "#A47C48",     // Warm Ochre
  Frozen: "#5E7A8C",     // Muted Slate Blue
  Other: "#8C7E74"       // Walnut/Taupe
};

export default function Insights() {
  const { expenses, pantry, recipes } = useStore();
  const { format, convert, currency } = useCurrency();

  const aiRecommendations = useMemo(() => generateAIRecommendations(pantry, recipes, expenses), [pantry, recipes, expenses]);

  const categoryCosts = useMemo(() => {
    const costMap: Record<string, number> = {
      Produce: 0, Protein: 0, Dairy: 0, Pantry: 0, Frozen: 0, Other: 0
    };
    pantry.forEach(p => {
      const val = p.pricePaid ? convert(p.pricePaid) : 0;
      if (p.category in costMap) {
        costMap[p.category] += val;
      } else {
        costMap.Other += val;
      }
    });
    return Object.entries(costMap).map(([name, value]) => ({
      name,
      value: Math.round(value)
    })).filter(item => item.value > 0);
  }, [pantry, convert]);

  const data = useMemo(() => {
    const forecasted = forecastExpenses(expenses, 4);
    return forecasted.map((d) => {
      const val = Math.round(convert(d.amount));
      // Connect predicted line to the last history point (w0)
      const isCurrentWeek = !d.forecast && d.week === 0;
      return {
        label: d.forecast ? `+${d.week}w` : `w${d.week}`,
        actual: d.forecast ? null : val,
        predicted: (d.forecast || isCurrentWeek) ? val : null,
        combined: val,
      };
    });
  }, [expenses, convert]);

  const totalForecast = useMemo(() => data.filter((d) => d.predicted !== null).reduce((s, d) => s + (d.predicted ?? 0), 0), [data]);

  const recentAvg = useMemo(() => expenses.slice(-4).reduce((s, e) => s + e.amount, 0) / 4, [expenses]);

  const trend = useMemo(() => {
    if (recentAvg === 0) return 0;
    return ((totalForecast / 4 - recentAvg) / recentAvg) * 100;
  }, [totalForecast, recentAvg]);

  const wasteRisk = useMemo(() => pantry.filter((p) => ["urgent", "expired"].includes(expiryStatus(p.expiresAt))), [pantry]);

  const wasteValue = useMemo(() => wasteRisk.reduce((s, p) => s + (p.pricePaid ?? 0), 0), [wasteRisk]);

  return (
    <div className="container py-8 space-y-6 max-w-6xl">
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <p className="label-category text-muted-foreground">ML Insights</p>
          <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground/90">
            Your kitchen, <span className="font-fraunces italic font-normal text-primary">predicted.</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl font-figtree">A lightweight model trends your grocery spending history and forecasts the next 4 weeks</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-3 gap-5">
        {[
          { icon: Wallet, label: "Forecast next 4 weeks", value: format(totalForecast), accent: false, border: "" },
          { icon: TrendingUp, label: "Trend vs recent avg", value: `${trend >= 0 ? "+" : ""}${trend.toFixed(1)}%`, accent: trend > 5, border: trend > 5 ? "border-l-4 border-l-[var(--accent-gold)]" : "" },
          { icon: AlertTriangle, label: "Waste risk value", value: format(wasteValue), accent: wasteValue > 0, border: wasteValue > 0 ? "border-l-4 border-l-primary" : "" },
        ].map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`glass-card p-5 transition-editorial hover-editorial-card flex flex-col justify-between ${c.border}`}
          >
            <div className="flex items-center justify-between">
              <span className="label-category text-muted-foreground">{c.label}</span>
              <c.icon className={`h-4 w-4 ${c.accent ? "text-primary" : "text-muted-foreground/60"}`} />
            </div>
            <p className="font-fraunces font-tabular text-3xl font-normal tracking-tight mt-3 text-foreground/90">{c.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Forecast chart */}
      <section className="glass-card p-6 transition-editorial space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <h2 className="font-fraunces text-lg font-medium tracking-tight text-foreground/90">Grocery spend forecast</h2>
            <p className="text-xs text-muted-foreground font-figtree">Trend + 4-period seasonality · Solid is recorded, dashed is predicted</p>
          </div>
          <Sparkles className="h-4 w-4 text-[var(--accent-gold)]" />
        </div>
        
        <div className="h-[280px] w-full mt-2 font-figtree">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis 
                dataKey="label" 
                stroke="var(--text-2)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={6}
              />
              <YAxis 
                stroke="var(--text-2)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(v) => `${currency.symbol}${v}`} 
                dx={-4}
              />
              <Tooltip
                contentStyle={{ 
                  background: "var(--surface-raised)", 
                  border: "1px solid var(--border-color)", 
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                labelStyle={{ color: "var(--text-2)", fontWeight: 600 }}
                itemStyle={{ color: "var(--text-1)" }}
                formatter={(v: number, name: string) => {
                  const displayName = name === "actual" ? "Recorded Spend" : "Forecasted Spend";
                  return [`${currency.symbol}${v.toLocaleString()}`, displayName];
                }}
              />
              <ReferenceLine 
                x="w0" 
                stroke="var(--text-2)" 
                strokeOpacity={0.4}
                strokeDasharray="3 3" 
                label={{ 
                  value: "now", 
                  position: "top", 
                  fill: "var(--text-2)", 
                  fontSize: 9,
                  fontWeight: 600,
                  offset: 4
                }} 
              />
              <Area type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#g1)" name="actual" />
              <Area type="monotone" dataKey="predicted" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="4 4" fill="url(#g1)" name="predicted" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Pantry health */}
      <section className="glass-card p-6 transition-editorial space-y-4">
        <div className="space-y-0.5">
          <h2 className="font-fraunces text-lg font-medium tracking-tight text-foreground/90">Pantry health status</h2>
          <p className="text-xs text-muted-foreground font-figtree">Scan of items ordered by proximity to expiry date</p>
        </div>

        <div className="divide-y divide-border/40 font-figtree">
          {pantry.length === 0 && (
            <div className="py-6 text-center text-xs text-muted-foreground italic">No pantry items currently in stock.</div>
          )}
          
          {pantry.slice().sort((a, b) => daysUntil(a.expiresAt) - daysUntil(b.expiresAt)).map((p) => {
            const d = daysUntil(p.expiresAt);
            const pct = Math.max(0, Math.min(100, ((30 - Math.min(30, d)) / 30) * 100));
            const status = expiryStatus(p.expiresAt);
            return (
              <div key={p.id} className="grid grid-cols-[1.5fr_2fr_auto] sm:grid-cols-[1fr_3fr_auto] gap-4 items-center py-2.5 first:pt-0 last:pb-0">
                <span className="text-xs font-semibold text-foreground/80 truncate">{p.name}</span>
                <div className="h-1.5 rounded-full bg-[var(--bg-2)] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      status === "urgent" || status === "expired" ? "bg-primary" :
                      status === "soon" ? "bg-[var(--accent-gold)]" : "bg-[var(--accent-2)]"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground/80 font-tabular w-12 text-right">
                  {status === "expired" ? "expired" : d <= 0 ? "today" : `${d}d`}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Category Cost Distribution Chart */}
      <section className="glass-card p-6 transition-editorial space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <h2 className="font-fraunces text-lg font-medium tracking-tight text-foreground/90">Category value distribution</h2>
            <p className="text-xs text-muted-foreground font-figtree">Financial breakdown of current inventory across categories ({currency.symbol})</p>
          </div>
          <Sparkles className="h-4 w-4 text-[var(--accent-gold)]" />
        </div>
        
        <div className="h-[220px] w-full font-figtree">
          {categoryCosts.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
              No priced pantry items to compute cost distribution.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryCosts} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                <XAxis type="number" stroke="var(--text-2)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="var(--text-2)" fontSize={10} tickLine={false} axisLine={false} width={65} />
                <Tooltip
                  cursor={{ fill: 'var(--border-color)' }}
                  contentStyle={{ 
                    background: "var(--surface-raised)", 
                    border: "1px solid var(--border-color)", 
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                  formatter={(v: number) => [`${currency.symbol}${v}`, "Total Value"]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                  {categoryCosts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[entry.name] || "var(--accent-2)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* AI Recommendations Panel */}
      <section className="glass-card p-6 transition-editorial space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <h2 className="font-fraunces text-lg font-medium tracking-tight text-foreground/90">AI Predictive Recommendations</h2>
            <p className="text-xs text-muted-foreground font-figtree">Heuristic forecasting and variety balance advice tailored to your kitchen</p>
          </div>
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        </div>

        <div className="grid md:grid-cols-3 gap-5 font-figtree">
          {aiRecommendations.length === 0 ? (
            <div className="col-span-3 py-6 text-center text-xs text-muted-foreground italic">
              AI has no warnings or balancing tips for your kitchen right now.
            </div>
          ) : (
            aiRecommendations.map((rec, i) => {
              const border = 
                rec.type === "warning" ? "border-l-4 border-l-primary" :
                rec.type === "optimal" ? "border-l-4 border-l-[var(--accent-gold)]" :
                "border-l-4 border-l-[var(--accent-2)]";

              return (
                <div 
                  key={rec.title}
                  className={`p-5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] shadow-sm space-y-3.5 flex flex-col justify-between ${border}`}
                >
                  <div className="space-y-1.5">
                    <h3 className="font-fraunces text-sm font-medium text-foreground/90">{rec.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{rec.desc}</p>
                  </div>
                  {rec.actionText && rec.actionPath && (
                    <Button asChild size="sm" variant="ghost" className="h-7 text-[10px] text-primary hover:text-primary/90 hover:bg-primary/5 w-fit rounded-md px-2 mt-1 self-start font-semibold">
                      <Link to={rec.actionPath}>
                        {rec.actionText} →
                      </Link>
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
