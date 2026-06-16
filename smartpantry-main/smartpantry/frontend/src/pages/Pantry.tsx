import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Search, Sparkles, AlertTriangle, Salad, Egg, GlassWater, Package, Snowflake, HelpCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { daysUntil, expiryStatus } from "@/lib/ml";
import type { PantryItem } from "@/lib/types";
import { useCurrency } from "@/lib/currency";

const categories: PantryItem["category"][] = ["Produce", "Protein", "Dairy", "Pantry", "Frozen", "Other"];

const categoryIcons: Record<PantryItem["category"], any> = {
  Produce: Salad,
  Protein: Egg,
  Dairy: GlassWater,
  Pantry: Package,
  Frozen: Snowflake,
  Other: HelpCircle
};

export default function Pantry() {
  const { pantry, addPantry, removePantry } = useStore();
  const { format, currency } = useCurrency();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const [draft, setDraft] = useState({
    name: "", category: "Produce" as PantryItem["category"], quantity: 1, unit: "pcs", expiresAt: "", pricePaid: 0,
  });

  const filtered = useMemo(() => {
    return pantry
      .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
      .filter((p) => filter === "all" || p.category === filter)
      .sort((a, b) => daysUntil(a.expiresAt) - daysUntil(b.expiresAt));
  }, [pantry, q, filter]);

  const pantryStats = useMemo(() => {
    const total = pantry.length;
    const soon = pantry.filter((p) => expiryStatus(p.expiresAt) === "soon").length;
    const urgentOrExpired = pantry.filter((p) => ["urgent", "expired"].includes(expiryStatus(p.expiresAt))).length;
    return { total, soon, urgentOrExpired };
  }, [pantry]);

  const submit = () => {
    if (!draft.name || !draft.expiresAt) return;
    addPantry({
      ...draft,
      pricePaid: draft.pricePaid ? +(draft.pricePaid / currency.rate).toFixed(4) : 0,
      expiresAt: new Date(draft.expiresAt).toISOString(),
    });
    setDraft({ name: "", category: "Produce", quantity: 1, unit: "pcs", expiresAt: "", pricePaid: 0 });
    setOpen(false);
  };

  return (
    <div className="container py-8 space-y-6 max-w-6xl">
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1 font-figtree">
          <p className="label-category text-primary">Inventory</p>
          <h1 className="font-fraunces text-3xl md:text-4xl font-medium tracking-tight text-foreground/90 leading-tight">Your Pantry</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Keep track of your stock · ingredients automatically sort by remaining shelf life</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-lg font-medium text-xs h-10 transition-transform active:scale-95">
              <Plus className="h-4 w-4 mr-1.5" /> Add ingredient
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-2xl border border-border bg-[var(--surface-raised)] shadow-elegant">
            <DialogHeader>
              <DialogTitle className="font-fraunces text-lg font-normal tracking-tight text-foreground/90">Add to pantry</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-3 font-figtree">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-foreground/80">Name</Label>
                <Input 
                  id="name"
                  value={draft.name} 
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })} 
                  placeholder="Cherry tomatoes" 
                  className="rounded-md border-border/75 bg-background/50 h-10 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-semibold text-foreground/80">Category</Label>
                  <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v as PantryItem["category"] })}>
                    <SelectTrigger id="category" className="rounded-md border-border/75 bg-background/50 h-10 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expiry" className="text-xs font-semibold text-foreground/80">Expires on</Label>
                  <Input 
                    id="expiry"
                    type="date" 
                    value={draft.expiresAt} 
                    onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} 
                    className="rounded-md border-border/75 bg-background/50 h-10 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qty" className="text-xs font-semibold text-foreground/80">Quantity</Label>
                  <Input 
                    id="qty"
                    type="number" 
                    value={draft.quantity} 
                    onChange={(e) => setDraft({ ...draft, quantity: +e.target.value })} 
                    className="rounded-md border-border/75 bg-background/50 h-10 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit" className="text-xs font-semibold text-foreground/80">Unit</Label>
                  <Input 
                    id="unit"
                    value={draft.unit} 
                    onChange={(e) => setDraft({ ...draft, unit: e.target.value })} 
                    className="rounded-md border-border/75 bg-background/50 h-10 text-xs"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="price" className="text-xs font-semibold text-foreground/80">Price paid ({currency.symbol}, optional)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={draft.pricePaid || ""}
                    onChange={(e) => setDraft({ ...draft, pricePaid: +e.target.value })}
                    placeholder={`e.g. ${Math.round(2 * currency.rate)}`}
                    className="rounded-md border-border/75 bg-background/50 h-10 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Stored in your local currency ({currency.code}).
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 border-t border-border/60 pt-4 mt-2">
              <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-md text-xs font-semibold">Cancel</Button>
              <Button onClick={submit} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-sm text-xs font-medium px-4">Save item</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Top Inventory Health Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-border/50 shadow-soft flex items-center justify-between hover:border-[var(--accent)]/20 transition-all duration-300">
          <div className="min-w-0">
            <span className="font-figtree text-[9px] font-bold uppercase tracking-wider text-[var(--text-2)]">Total Stock</span>
            <p className="font-fraunces text-2xl font-bold text-[var(--text-1)] mt-0.5 leading-none">{pantryStats.total}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-border/50 shadow-soft flex items-center justify-between hover:border-[var(--accent-gold)]/20 transition-all duration-300">
          <div className="min-w-0">
            <span className="font-figtree text-[9px] font-bold uppercase tracking-wider text-[var(--text-2)]">Expiring Soon</span>
            <p className="font-fraunces text-2xl font-bold text-[var(--accent-gold)] mt-0.5 leading-none">{pantryStats.soon}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-border/50 shadow-soft flex items-center justify-between hover:border-red-500/20 transition-all duration-300">
          <div className="min-w-0">
            <span className="font-figtree text-[9px] font-bold uppercase tracking-wider text-[var(--text-2)]">Critical Status</span>
            <p className="font-fraunces text-2xl font-bold text-[#C84040] mt-0.5 leading-none">{pantryStats.urgentOrExpired}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-[#C84040]/10 text-[#C84040] flex items-center justify-center shrink-0">
            <Trash2 className="h-4.5 w-4.5" />
          </div>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Horizontal Category Scroll Tabs (Editorial Underline style) */}
        <div className="flex items-center gap-6 overflow-x-auto pb-1 scrollbar-none flex-1 max-w-full border-b border-border/40">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`pb-2 text-xs font-medium transition-all duration-150 shrink-0 ${
              filter === "all"
                ? "font-fraunces italic font-bold text-primary border-b-2 border-primary"
                : "font-figtree text-[var(--text-2)] hover:text-[var(--text-1)]"
            }`}
          >
            All Items
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`pb-2 text-xs font-medium transition-all duration-150 shrink-0 flex items-center gap-1 ${
                filter === c
                  ? "font-fraunces italic font-bold text-primary border-b-2 border-primary"
                  : "font-figtree text-[var(--text-2)] hover:text-[var(--text-1)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-2)]/70" />
          <Input 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            placeholder="Search pantry items..." 
            className="pl-9 rounded-lg bg-secondary/15 border-border/80 focus:bg-background transition-colors h-10 text-xs font-figtree" 
          />
        </div>
      </div>

      {/* Items list card */}
      <div className="glass-card rounded-2xl border border-border/60 overflow-hidden shadow-soft">
        <div className="divide-y divide-border/45">
          {filtered.length === 0 && (
            <div className="p-12 text-center space-y-2">
              <p className="font-figtree text-sm font-semibold text-foreground/80">No pantry items found</p>
              <p className="text-xs text-muted-foreground">Try clearing filters or add your first item to get started.</p>
            </div>
          )}
          
          <AnimatePresence initial={false}>
            {filtered.map((p, i) => {
              const status = expiryStatus(p.expiresAt);
              const d = daysUntil(p.expiresAt);
              const CatIcon = categoryIcons[p.category] || HelpCircle;
              
              // Zebra Row & Hover border style
              const zebraClass = i % 2 === 1 ? "bg-[var(--bg-2)]/40" : "bg-transparent";
              
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-center justify-between gap-4 p-4 transition-all duration-200 border-l-2 border-l-transparent hover:border-l-primary group ${zebraClass}`}
                >
                  {/* Item Details */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border ${
                      p.category === "Produce" ? "border-[var(--accent-2)]/25 bg-[var(--accent-2)]/5 text-[var(--accent-2)]" :
                      p.category === "Protein" ? "border-primary/25 bg-primary/5 text-primary" :
                      p.category === "Dairy" ? "border-blue-500/25 bg-blue-500/5 text-blue-500" :
                      p.category === "Pantry" ? "border-[var(--accent-gold)]/25 bg-[var(--accent-gold)]/5 text-[var(--accent-gold)]" :
                      p.category === "Frozen" ? "border-indigo-500/25 bg-indigo-500/5 text-indigo-500" :
                      "border-slate-500/25 bg-slate-500/5 text-slate-500"
                    }`}>
                      <CatIcon className="h-4 w-4" />
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                        <h3 className="font-fraunces text-sm font-semibold text-[var(--text-1)] truncate">{p.name}</h3>
                        <span className="font-figtree text-[9px] font-bold text-[var(--text-2)] uppercase tracking-wider">{p.category}</span>
                      </div>
                      <p className="text-xs text-[var(--text-2)] mt-0.5 font-medium font-figtree">{p.quantity} {p.unit}</p>
                    </div>
                  </div>

                  {/* Expiry and actions */}
                  <div className="flex items-center gap-4 sm:gap-8 shrink-0">
                    {/* Price */}
                    <div className="hidden sm:block text-right w-20">
                      <p className="text-xs font-semibold text-[var(--text-1)] font-fraunces">
                        {p.pricePaid ? format(p.pricePaid) : <span className="text-muted-foreground/20">—</span>}
                      </p>
                      <p className="text-[9px] text-[var(--text-2)] mt-0.5 uppercase tracking-wider font-bold font-figtree">paid</p>
                    </div>

                    {/* Expiry status */}
                    <div className="text-right w-24">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border font-figtree ${
                        status === "urgent" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                        status === "soon" ? "bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] border-[var(--accent-gold)]/20" :
                        status === "expired" ? "bg-red-950/20 text-[#C84040] border-red-900/30" :
                        "bg-[var(--bg-2)]/60 text-[var(--text-2)] border-border"
                      }`}>
                        {status === "expired" ? "expired" : d <= 0 ? "today" : `${d}d left`}
                      </span>
                    </div>

                    {/* Actions */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removePantry(p.id)} 
                      className="opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity h-8 w-8 text-[var(--text-2)] hover:text-red-500 hover:bg-red-500/10 rounded-md"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
