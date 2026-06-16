import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sparkles,
  AlertTriangle,
  ChefHat,
  Wallet,
  ArrowRight,
  TrendingUp,
  Flame,
  Calendar,
  Utensils,
  Plus,
  ShoppingCart,
  CheckCircle,
  HelpCircle,
  Tag,
  Store,
  ChevronRight,
  Star,
  Clock,
  Circle,
  Check,
  ChevronDown,
  Info
} from "lucide-react";
import { useStore } from "@/lib/store";
import { expiryStatus, daysUntil, rankRecipes, forecastExpenses, generateAIRecommendations } from "@/lib/ml";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import DigitalPantryTwin from "@/components/DigitalPantryTwin";
import { ScrollShelf } from "@/components/ui/ScrollShelf";

// Minimal SVG Sparkline generator
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const points = useMemo(() => {
    if (!data || data.length < 2) return "0,17 100,17";
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    return data
      .map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 35 - ((val - min) / range) * 25;
        return `${x},${y}`;
      })
      .join(" ");
  }, [data]);

  return (
    <div className="h-7 w-24 opacity-80 select-none pointer-events-none">
      <svg className="h-full w-full overflow-visible" viewBox="0 0 100 35">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="animate-sparkline"
        />
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const {
    pantry,
    recipes,
    prefs,
    expenses,
    auth,
    shoppingList,
    addShoppingItem,
    toggleShoppingItem,
    addMultipleToShopping
  } = useStore();
  
  const { format } = useCurrency();
  const { toast } = useToast();
  
  // States for interactive UI expansions
  const [activeCardDetail, setActiveCardDetail] = useState<string | null>(null);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<string | null>(null);
  const [newShoppingName, setNewShoppingName] = useState("");

  const ranked = useMemo(() => rankRecipes(recipes, pantry, prefs), [recipes, pantry, prefs]);
  const expiring = useMemo(() => pantry
    .filter((p) => ["urgent", "soon"].includes(expiryStatus(p.expiresAt)))
    .sort((a, b) => daysUntil(a.expiresAt) - daysUntil(b.expiresAt)), [pantry]);
    
  const forecast = useMemo(() => forecastExpenses(expenses, 4), [expenses]);
  const next4 = useMemo(() => forecast.filter((f) => f.forecast).reduce((s, f) => s + f.amount, 0), [forecast]);

  const freshnessScore = useMemo(() => {
    if (pantry.length === 0) return 100;
    const scores = pantry.map((item) => {
      const status = expiryStatus(item.expiresAt);
      if (status === "fresh") return 100;
      if (status === "soon") return 90;
      if (status === "urgent") return 70;
      return 40; // expired
    });
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    return Math.round(avg);
  }, [pantry]);

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  const handle = auth.email?.split("@")[0] ?? auth.phone ?? "culinary enthusiast";

  // AI recommendations
  const aiRecommendations = useMemo(() => generateAIRecommendations(pantry, recipes, expenses), [pantry, recipes, expenses]);

  // Expiration timeline data
  const timelineData = useMemo(() => {
    return [...pantry]
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())
      .slice(0, 8); // show up to 8 items in the timeline scroll
  }, [pantry]);

  // Shopping list with store recommendations and budget estimations
  const shoppingBudgetImpact = useMemo(() => {
    // Estimations based on category defaults
    const costMap: Record<string, number> = { Produce: 2.5, Protein: 7.0, Dairy: 3.5, Pantry: 4.5, Frozen: 5.0, Other: 3.0 };
    return shoppingList.reduce((sum, item) => sum + (costMap[item.category] || 3.0) * item.quantity, 0);
  }, [shoppingList]);

  const stats = useMemo(() => {
    const expiringCount = expiring.length;
    const expiringUrgency = expiringCount > 3 ? "critical" : expiringCount > 0 ? "warning" : "normal";

    // Sparkline history simulation/extraction
    const pantryHistory = [4, 5, 5, 6, 7, pantry.length];
    const expiringHistory = [0, 1, 2, 1, 2, expiringCount];
    const recipesHistory = [1, 2, 2, 3, 3, Math.min(6, ranked.length)];
    const expensesHistory = expenses.slice(-6).map(e => e.amount);
    if (expensesHistory.length < 6) {
      expensesHistory.unshift(...[55, 60, 58, 62].slice(0, 6 - expensesHistory.length));
    }

    return [
      {
        id: "pantry",
        label: "Pantry Inventory",
        value: pantry.length,
        description: "active items",
        icon: Sparkles,
        urgency: "normal",
        delta: "+3 added this wk",
        history: pantryHistory,
        color: "var(--accent-2)",
        detailText: `${pantry.filter(p => p.category === 'Produce').length} produce, ${pantry.filter(p => p.category === 'Protein').length} proteins, ${pantry.filter(p => p.category === 'Dairy').length} dairy.`
      },
      {
        id: "expiring",
        label: "Pantry Health",
        value: `${freshnessScore}%`,
        description: "average freshness",
        icon: AlertTriangle,
        urgency: expiringUrgency,
        delta: "↑ 8% this week",
        history: expiringHistory.map(h => 100 - h * 8),
        color: "var(--accent)",
        detailText: expiringCount > 0 ? `${expiringCount} items expire soon. "Excellent ingredient utilization."` : "All ingredients are perfectly fresh."
      },
      {
        id: "recipes",
        label: "Recipes Ready",
        value: ranked.filter(r => r.score >= 0.85).length,
        description: "high match (>85%)",
        icon: ChefHat,
        urgency: "normal",
        delta: "ready now",
        history: recipesHistory,
        color: "var(--accent-gold)",
        detailText: `Matched against ${recipes.length} total recipes. Tonight's recommendations are optimized.`
      },
      {
        id: "expenses",
        label: "Budget Forecast",
        value: format(next4),
        description: "predicted next 4w",
        icon: Wallet,
        urgency: "normal",
        delta: "optimized spend",
        history: expensesHistory,
        color: "var(--text-1)",
        detailText: "Predicted spending based on past 12 weeks. Spend matches historical seasonal averages."
      }
    ];
  }, [pantry, expiring, ranked, next4, format, freshnessScore, recipes.length, expenses]);

  const handleQuickAddShopping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShoppingName.trim()) return;
    
    // Simple category matching
    let category: "Produce" | "Protein" | "Dairy" | "Pantry" | "Frozen" | "Other" = "Pantry";
    const name = newShoppingName.toLowerCase();
    if (["spinach", "tomato", "tomatoes", "lemon", "lemons", "garlic", "onion", "greens", "apple", "lime"].some(x => name.includes(x))) {
      category = "Produce";
    } else if (["chicken", "beef", "pork", "fish", "eggs", "protein", "meat"].some(x => name.includes(x))) {
      category = "Protein";
    } else if (["milk", "cheese", "butter", "yogurt", "cream"].some(x => name.includes(x))) {
      category = "Dairy";
    }

    addShoppingItem(newShoppingName.trim(), category, 1, "pcs");
    setNewShoppingName("");
    toast({
      title: "Added to list",
      description: `"${newShoppingName}" has been appended to your shopping planner.`,
    });
  };

  return (
    <div className="container py-8 space-y-10 max-w-6xl font-figtree">
      {/* Digital Pantry Twin (Signature Feature) */}
      <section className="space-y-4">
        <div className="space-y-1 text-center md:text-left">
          <span className="label-category text-[var(--accent)] font-bold">Your Kitchen Twin</span>
          <h2 className="font-fraunces text-2xl md:text-3xl font-normal text-[var(--text-1)]">
            Digital <span className="font-fraunces italic font-light text-[var(--accent-gold)]">Pantry Twin</span>
          </h2>
          <p className="text-xs text-[var(--text-2)]">A living visual representation of your actual ingredients, health, and combinations</p>
        </div>
        <DigitalPantryTwin />
      </section>

      {/* 1. Cinematic Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative glass-card border-michelin p-6 md:p-8 overflow-hidden"
      >
        {/* Subtle radial gradient backing the hero */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 via-transparent to-[var(--accent-gold)]/5 pointer-events-none" />
        
        <div className="grid md:grid-cols-12 gap-8 items-center relative z-10">
          {/* Welcome Text Column */}
          <div className="md:col-span-7 space-y-5">
            <div className="space-y-2">
              <span className="label-category text-[var(--accent)] font-bold tracking-widest text-[10px]">
                {greet()} · Chef de Cuisine
              </span>
              <h1 className="font-fraunces text-3xl md:text-5xl font-normal leading-[1.1] tracking-tight text-[var(--text-1)]">
                Welcome home, <span className="font-fraunces italic font-light text-[var(--accent-gold)]">{handle}</span>.
              </h1>
              <p className="text-sm md:text-base text-[var(--text-2)] leading-relaxed max-w-lg mt-2">
                "Your kitchen is performing better than 82% of households this week." Your pantry shows excellent utility.
              </p>
            </div>

            {/* AI Insight Box in Hero */}
            <div className="bg-[var(--surface-raised)]/70 backdrop-blur-sm border border-border/40 rounded-xl p-4 flex items-start gap-3 max-w-xl">
              <Sparkles className="h-5 w-5 text-[var(--accent-gold)] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[var(--accent-gold)] uppercase tracking-wider">AI Kitchen Sommelier</span>
                <p className="text-xs text-[var(--text-2)] leading-relaxed">
                  {aiRecommendations[0]?.desc || "Your pantry health is exceptionally high today. Minimize waste by trying tonight's featured Tuscan Chicken recipe!"}
                </p>
              </div>
            </div>

            {/* Hero Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-sm font-medium text-xs h-9 px-5 transition-transform active:scale-98">
                <Link to="/pantry" className="flex items-center gap-1.5">
                  Restock Pantry <Plus className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <a href="#shopping-planner" className="inline-flex items-center justify-center rounded-lg border border-border bg-[var(--surface)] text-[var(--text-1)] hover:bg-[var(--bg-2)]/60 text-xs font-semibold h-9 px-4 shadow-sm transition-all duration-300">
                Go to Shopping List
              </a>
            </div>
          </div>

          {/* Graphical Health Indicator & Framed Art Column */}
          <div className="md:col-span-5 flex flex-col sm:flex-row items-center justify-center gap-6 md:justify-end">
            {/* Animated Gauge */}
            <div className="relative h-32 w-32 shrink-0 flex items-center justify-center bg-[var(--surface)]/40 rounded-full p-2 border border-border/30 shadow-inner">
              <svg className="h-full w-full -rotate-[220deg]" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  className="stroke-border fill-none opacity-30"
                  strokeWidth="3.5"
                  strokeDasharray="122.5 40"
                  strokeLinecap="round"
                />
                <motion.circle
                  cx="32"
                  cy="32"
                  r="26"
                  className="stroke-[var(--accent)] fill-none"
                  strokeWidth="3.5"
                  strokeDasharray="122.5 40"
                  initial={{ strokeDashoffset: 122.5 }}
                  animate={{ strokeDashoffset: 122.5 - (freshnessScore / 100) * 122.5 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center mt-1">
                <span className="font-fraunces text-3xl font-normal leading-none text-[var(--text-1)]">{freshnessScore}%</span>
                <span className="font-figtree text-[9px] font-bold text-[var(--text-2)] uppercase tracking-widest mt-1">health</span>
              </div>
            </div>

            {/* Culinary Magazine Framed Graphic */}
            <div className="relative group max-w-[150px] aspect-[3/4] border-michelin rounded-lg overflow-hidden shadow-elegant transition-transform duration-300 hover:scale-[1.02]">
              <img
                src="/images/plated_dish_hero.png"
                alt="Michelin Culinary Art"
                className="w-full h-full object-cover grayscale-[20%] group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex items-end p-2.5">
                <span className="font-fraunces italic text-[9px] text-[#FAF7F2]/90 leading-tight">
                  "To cook is to care."
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 2. Premium Metric Cards (Intelligence Panels) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          const isActive = activeCardDetail === s.id;
          
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.5 }}
              whileHover={{ y: -4 }}
              onClick={() => setActiveCardDetail(isActive ? null : s.id)}
              className={`glass-card p-5 cursor-pointer flex flex-col justify-between relative overflow-hidden transition-editorial hover-editorial-card border-b-2`}
              style={{ borderBottomColor: s.color }}
            >
              {/* Overlay shadow based on active state */}
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" style={{ color: s.color }} />
                  <span className="label-category text-[var(--text-2)] text-[10px]">{s.label}</span>
                </div>
                <span className="text-[10px] font-bold text-[var(--accent-gold)]">{s.delta}</span>
              </div>

              <div className="my-4 flex items-baseline justify-between">
                <div>
                  <h2 className="font-fraunces text-4xl font-normal tracking-tight text-[var(--text-1)] font-tabular">{s.value}</h2>
                  <p className="text-[10px] text-[var(--text-2)] mt-0.5">{s.description}</p>
                </div>
                
                {/* SVG sparkline graph */}
                <Sparkline data={s.history} color={s.color} />
              </div>

              {/* Expandable detail tray */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-border/30 pt-3 mt-1"
                  >
                    <p className="text-xs text-[var(--text-2)] leading-relaxed italic bg-[var(--surface-raised)] p-2 rounded-md border border-border/20">
                      {s.detailText}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {!isActive && (
                <div className="w-full text-center text-[9px] text-muted-foreground/60 flex items-center justify-center gap-0.5 mt-1">
                  Click to inspect <ChevronDown className="h-3 w-3" />
                </div>
              )}
            </motion.div>
          );
        })}
      </section>

      {/* 3. Culinary AI Command Center */}
      <section className="glass-card border-michelin p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="space-y-1">
            <span className="label-category text-[var(--accent)] font-bold">AI Command Center</span>
            <h2 className="font-fraunces text-2xl font-normal text-[var(--text-1)]">Culinary Intelligence Panels</h2>
          </div>
          <Badge variant="outline" className="font-figtree text-[10px] px-2.5 py-0.5 bg-[var(--accent-gold)]/5 border-[var(--accent-gold)]/20 text-[var(--accent-gold)]">
            Predictive AI Active
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Panel A: Waste & Expense Forecast */}
          <div className="space-y-4">
            <h3 className="font-fraunces text-base text-[var(--text-1)] flex items-center gap-2">
              <Wallet className="h-4 w-4 text-[var(--accent)]" /> Waste & Spending Forecast
            </h3>
            <div className="bg-[var(--surface-raised)] border border-border/30 rounded-xl p-4 space-y-3 font-figtree">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-2)]">Waste risk valuation:</span>
                <span className="font-semibold text-rose-500">
                  {format(expiring.reduce((sum, item) => sum + (item.pricePaid || 1.5), 0))}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-2)]">Estimated 4w spending:</span>
                <span className="font-semibold text-[var(--text-1)]">{format(next4)}</span>
              </div>
              
              <div className="space-y-1 pt-2">
                <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                  <span>Waste Avoidance:</span>
                  <span>94% efficiency</span>
                </div>
                <Progress value={94} className="h-1 bg-border [&>div]:bg-[var(--accent-2)]" />
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                By consuming ingredients before they expire, you are saving an estimated $14.20 per week compared to national averages.
              </p>
            </div>
          </div>

          {/* Panel B: Ingredient Distribution Map */}
          <div className="space-y-4">
            <h3 className="font-fraunces text-base text-[var(--text-1)] flex items-center gap-2">
              <Utensils className="h-4 w-4 text-[var(--accent-2)]" /> Pantry Categories
            </h3>
            <div className="bg-[var(--surface-raised)] border border-border/30 rounded-xl p-4 space-y-3">
              {pantry.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-6">Pantry is empty</p>
              ) : (
                <div className="space-y-2.5 text-xs font-figtree">
                  {["Produce", "Protein", "Dairy", "Pantry"].map(cat => {
                    const count = pantry.filter(p => p.category === cat).length;
                    const pct = Math.round((count / pantry.length) * 100) || 0;
                    
                    const barColor = 
                      cat === "Produce" ? "bg-[var(--accent-2)]" :
                      cat === "Protein" ? "bg-primary" :
                      cat === "Dairy" ? "bg-[var(--accent-gold)]" : "bg-neutral-400";

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-medium text-[var(--text-1)]">
                          <span>{cat}</span>
                          <span className="text-muted-foreground">{count} item{count !== 1 ? 's' : ''} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Panel C: Smart AI Recommendations */}
          <div className="space-y-4">
            <h3 className="font-fraunces text-base text-[var(--text-1)] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--accent-gold)]" /> Personalized Sommelier Tips
            </h3>
            <div className="space-y-3 max-h-[195px] overflow-y-auto pr-1">
              {aiRecommendations.map((rec, i) => (
                <div key={i} className="bg-[var(--surface-raised)] hover:bg-[var(--surface)] transition-all border border-border/30 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      rec.type === "warning" ? "bg-primary" :
                      rec.type === "optimal" ? "bg-[var(--accent-2)]" : "bg-[var(--accent-gold)]"
                    }`} />
                    <h4 className="text-[11px] font-bold text-[var(--text-1)] uppercase tracking-wider">{rec.title}</h4>
                  </div>
                  <p className="text-[11px] text-[var(--text-2)] leading-relaxed">{rec.desc}</p>
                  {rec.actionText && rec.actionPath && (
                    <Link to={rec.actionPath} className="inline-flex items-center gap-0.5 text-[10px] text-primary font-semibold hover:underline">
                      {rec.actionText} <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Recipe Center - Netflix-Style Carousel */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between border-b border-border/50 pb-3">
          <div className="space-y-1">
            <span className="label-category text-primary font-bold">Chef's Selection</span>
            <h2 className="font-fraunces text-2xl md:text-3xl font-normal text-[var(--text-1)]">
              Tonight's <span className="font-fraunces italic font-light text-[var(--accent-gold)]">Suggestions</span>
            </h2>
            <p className="text-xs text-[var(--text-2)]">Netflix-style horizontal culinary browser, curated by pantry expiration matching</p>
          </div>
          <Link to="/recipes" className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
            Browse All Recipes <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Tonight's Suggestions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {ranked.map((r, i) => {
            const isExpanded = expandedRecipeId === r.id;
            const missingCount = r.missing.length;
            const usesExpiringCount = r.usesExpiring.length;
            const score = Math.round(r.score * 100);

            return (
              <motion.article
                key={r.id}
                className={`w-full glass-card border-michelin overflow-hidden flex flex-col justify-between transition-editorial ${
                  isExpanded ? "ring-1 ring-primary/30 shadow-elegant" : ""
                }`}
              >
                {/* Culinary Image Header */}
                <div className="h-44 w-full relative overflow-hidden bg-muted">
                  <img
                    src="/images/fresh_ingredients.png"
                    alt={r.title}
                    className="w-full h-full object-cover grayscale-[15%] brightness-95"
                  />
                  {/* Floating match percentage badge */}
                  <div className="absolute top-3 right-3 bg-[var(--surface)]/90 backdrop-blur-md rounded-full px-2.5 py-1 text-[11px] font-bold text-[var(--accent-gold)] shadow-sm border border-[var(--accent-gold)]/20 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-[var(--accent-gold)]" />
                    {score}% match
                  </div>

                  {/* Urgency Badge */}
                  {usesExpiringCount > 0 && (
                    <div className="absolute bottom-3 left-3 bg-primary text-primary-foreground rounded-md px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold shadow-md flex items-center gap-1 animate-pulse">
                      <Flame className="h-3 w-3" />
                      Rescue {usesExpiringCount} item{usesExpiringCount > 1 ? "s" : ""}
                    </div>
                  )}
                </div>

                {/* Card Details */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                      <span className="uppercase tracking-widest">{r.cuisine}</span>
                      <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {r.minutes} min</span>
                    </div>
                    <h3 className="font-fraunces text-base font-medium text-[var(--text-1)] leading-snug group-hover:text-primary transition-colors">
                      {r.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--accent-gold)]">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="font-bold">{r.rating}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">({r.difficulty})</span>
                    </div>
                  </div>

                  {/* Pantry Availability indicator */}
                  <div className="bg-[var(--bg-2)]/50 rounded-lg p-2.5 space-y-1.5 text-[11px]">
                    <div className="flex justify-between font-medium">
                      <span className="text-[var(--text-2)]">Ingredients in stock:</span>
                      <span className="text-[var(--accent-2)] font-semibold">
                        {r.ingredients.length - missingCount} / {r.ingredients.length}
                      </span>
                    </div>
                    <Progress value={((r.ingredients.length - missingCount) / r.ingredients.length) * 100} className="h-1 bg-border/40 [&>div]:bg-[var(--accent-2)]" />
                    
                    {missingCount > 0 && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        Missing: <span className="italic">{r.missing.join(", ")}</span>
                      </p>
                    )}
                  </div>

                  {/* Expandable Preparation stepper timeline */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border/30 pt-3 mt-2 overflow-hidden space-y-2.5"
                      >
                        <h4 className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-2)]">Preparation Steps</h4>
                        <ol className="space-y-2 text-xs text-[var(--text-2)] list-decimal pl-4 leading-relaxed font-medium">
                          {r.steps.map((step, idx) => (
                            <li key={idx} className="pl-0.5">{step}</li>
                          ))}
                        </ol>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action Row */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/20">
                    <Button
                      size="sm"
                      onClick={() => setExpandedRecipeId(isExpanded ? null : r.id)}
                      variant="ghost"
                      className="flex-1 text-xs text-muted-foreground border border-border/60 hover:bg-secondary/40 h-8 rounded-lg"
                    >
                      {isExpanded ? "Hide Steps" : "View Steps"}
                    </Button>
                    
                    {missingCount > 0 && (
                      <Button
                        size="sm"
                        onClick={() => {
                          const items = r.missing.map(name => ({ name, category: "Pantry" as const, quantity: 1, unit: "pcs" }));
                          addMultipleToShopping(items);
                          toast({
                            title: "Curated for you",
                            description: `Added ${items.length} ingredients to your grocery list.`,
                          });
                        }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 w-9 rounded-lg p-0 flex items-center justify-center shrink-0"
                        title="Add missing to shopping list"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* 5. Expiry Timeline */}
      <section className="glass-card border-michelin p-6 space-y-5">
        <div className="space-y-1">
          <span className="label-category text-[var(--accent)] font-bold">Culinary Schedule</span>
          <h2 className="font-fraunces text-2xl font-normal text-[var(--text-1)]">Pantry Expiration Timeline</h2>
          <p className="text-xs text-[var(--text-2)]">Visual chronological index of kitchen assets by shelf-life</p>
        </div>

        {timelineData.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-8">Your pantry timeline is empty. Add items to see shelf-life chronologies.</p>
        ) : (
          <div className="relative pt-2">
            {/* The Horizontal Line */}
            <div className="absolute top-[56px] left-0 right-0 h-0.5 bg-border/40 z-0" />
            
            {/* Interactive Timeline nodes */}
            <div className="flex justify-between items-start relative z-10 overflow-x-auto no-scrollbar gap-8 px-4 pt-4 h-48">
              {timelineData.map((item) => {
                const days = daysUntil(item.expiresAt);
                const status = expiryStatus(item.expiresAt);
                const isSelected = selectedTimelineItem === item.id;

                const statusColor = 
                  status === "urgent" ? "bg-rose-500 border-rose-400" :
                  status === "soon" ? "bg-[var(--accent-gold)] border-[var(--accent-gold)]/60" :
                  "bg-[var(--accent-2)] border-[var(--accent-2)]/60";

                return (
                  <div key={item.id} className="flex flex-col items-center shrink-0 relative">
                    {/* Days label */}
                    <span className="text-[10px] font-bold text-[var(--text-2)] mb-2 uppercase">
                      {days <= 0 ? "today" : `${days}d`}
                    </span>

                    {/* Timeline Node dot */}
                    <button
                      type="button"
                      onClick={() => setSelectedTimelineItem(isSelected ? null : item.id)}
                      className={`h-5 w-5 rounded-full border-4 ${statusColor} hover:scale-125 transition-transform shadow-md ${
                        isSelected ? "ring-2 ring-offset-2 ring-[var(--accent)]" : ""
                      }`}
                    />

                    {/* Name Label */}
                    <span className="text-xs font-semibold text-[var(--text-1)] mt-2 text-center max-w-[80px] truncate">
                      {item.name}
                    </span>

                    {/* Interactive overlay card */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          className="absolute top-14 bg-[var(--surface)] border border-border/80 rounded-xl p-3 shadow-elegant z-20 w-44 font-figtree space-y-1.5"
                        >
                          <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase border-b border-border/30 pb-1">
                            <span>{item.category}</span>
                            <span className={status === "urgent" ? "text-rose-500" : "text-inherit"}>{status}</span>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[var(--text-1)]">{item.name}</h4>
                            <p className="text-[10px] text-[var(--text-2)] mt-0.5">Quantity: {item.quantity} {item.unit}</p>
                            {item.pricePaid && (
                              <p className="text-[10px] text-[var(--accent-gold)] font-medium">Value: {format(item.pricePaid)}</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 6. Integrated Intelligent Shopping Planner & Checklist */}
      <section id="shopping-planner" className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Shopping quick add, store match & substitutions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card border-michelin p-5 space-y-4">
            <div className="space-y-1">
              <span className="label-category text-[var(--accent)] font-bold">Planner</span>
              <h3 className="font-fraunces text-xl font-normal text-[var(--text-1)]">Quick Addition</h3>
              <p className="text-xs text-[var(--text-2)]">Instantly add missing culinary ingredients</p>
            </div>

            <form onSubmit={handleQuickAddShopping} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Greek Feta cheese"
                  value={newShoppingName}
                  onChange={(e) => setNewShoppingName(e.target.value)}
                  className="flex-1 rounded-lg border border-border/75 bg-[var(--surface-raised)] text-xs px-3 h-9 text-[var(--text-1)] focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 rounded-lg px-3">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>

          {/* Store Match and budget panel */}
          <div className="glass-card border-michelin p-5 space-y-4 font-figtree">
            <h3 className="font-fraunces text-lg text-[var(--text-1)] flex items-center gap-1.5">
              <Store className="h-4.5 w-4.5 text-[var(--accent-gold)]" /> Preferred Shopping Venue
            </h3>

            <div className="bg-[var(--surface-raised)] border border-border/30 rounded-xl p-3.5 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-2)]">Projected Cost:</span>
                <span className="font-semibold text-[var(--text-1)]">{format(shoppingBudgetImpact)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-2)]">Optimal Venue:</span>
                <span className="font-bold text-[var(--accent-2)]">Whole Foods (92% match)</span>
              </div>

              <div className="border-t border-border/20 pt-2.5 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Substitutions Advisory:</span>
                <p className="text-[10.5px] text-[var(--text-2)] leading-relaxed">
                  Missing <span className="font-semibold">Greek yogurt</span>? You can substitute with <span className="font-semibold">sour cream</span> or coconut cream already in your inventory.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* The Shopping Checklist */}
        <div className="lg:col-span-2 glass-card border-michelin p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="space-y-0.5">
              <h3 className="font-fraunces text-xl font-normal text-[var(--text-1)]">Shopping Checklist</h3>
              <p className="text-xs text-[var(--text-2)]">Checked items immediately transfer to pantry stock</p>
            </div>
            <Badge variant="secondary" className="font-figtree text-[10px] font-bold">
              {shoppingList.length} item{shoppingList.length !== 1 ? 's' : ''} on list
            </Badge>
          </div>

          {shoppingList.length === 0 ? (
            <div className="py-10 text-center space-y-2 border border-dashed border-border rounded-xl bg-[var(--surface-raised)]/30">
              <ShoppingCart className="h-8 w-8 text-muted-foreground/45 mx-auto" />
              <p className="text-xs text-muted-foreground font-semibold">Your shopping list is clear.</p>
              <p className="text-[10px] text-muted-foreground">Add items via the Quick Add panel or suggest a recipe!</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/30 max-h-[300px] overflow-y-auto pr-1">
              {shoppingList.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-3 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleShoppingItem(item.id)}
                      className="text-muted-foreground hover:text-[var(--accent-2)] transition-colors shrink-0 focus:outline-none"
                    >
                      {item.checked ? (
                        <CheckCircle className="h-5 w-5 text-[var(--accent-2)] fill-[var(--accent-2)]/10" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    
                    <span className={`text-xs font-semibold truncate transition-all ${
                      item.checked ? "line-through text-muted-foreground/50" : "text-[var(--text-1)]"
                    }`}>
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--bg-2)] text-[var(--text-2)] border border-border/30">
                      {item.quantity} {item.unit}
                    </span>
                    <span className="text-[9px] text-[var(--accent-gold)] font-medium border border-[var(--accent-gold)]/20 px-2 py-0.5 rounded-full bg-[var(--accent-gold)]/5">
                      {item.category}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
