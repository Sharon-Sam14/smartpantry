import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, ChefHat, X, Flame, Zap, Droplets,
  Wheat, Search, Loader2, Plus, CheckCircle, AlertCircle,
  BookOpen, Leaf, Clock, Compass
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";

// ── ISO 8601 duration → human readable ──────────────────────
function parseDuration(iso: string | undefined): string {
  if (!iso) return "—";
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return iso;
  const h = m[1] ? `${m[1]}h ` : "";
  const min = m[2] ? `${m[2]}min` : "";
  return (h + min).trim() || iso;
}

// ── Types ────────────────────────────────────────────────────
type CatalogRecipe = {
  id: string;
  name: string;
  description: string;
  category: string;
  cuisine: string;
  difficulty: string;
  tags: string[];
  meta: { total_time: string; yields: string; active_time?: string };
  dietary: { flags: string[]; not_suitable_for: string[] };
  nutrition: { per_serving: Record<string, number | null>; sources: string[] };
  ingredients: Array<{
    group_name: string;
    items: Array<{ name: string; quantity: number; unit: string; preparation?: string }>;
  }>;
  instructions: Array<{ step_number: number; phase: string; text: string }>;
};

// ── Macronutrient visual bar ──────────────────────────────────
function MacroBar({ label, value, unit, color, icon }: {
  label: string; value: number | null; unit: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/20 last:border-0">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${color} shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold text-[var(--text-2)]">{label}</span>
      </div>
      <span className="text-sm font-bold text-[var(--text-1)] tabular-nums">
        {value !== null && value !== undefined ? `${Number(value).toFixed(1)}${unit}` : "—"}
      </span>
    </div>
  );
}

// ── Nutrition Panel ───────────────────────────────────────────
function NutritionPanel({ nutrition }: { nutrition: CatalogRecipe["nutrition"] }) {
  const n = nutrition.per_serving;
  const vitamins = [
    { key: "vitamin_a_mcg", label: "Vitamin A", unit: "mcg" },
    { key: "vitamin_c_mg", label: "Vitamin C", unit: "mg" },
    { key: "vitamin_d_mcg", label: "Vitamin D", unit: "mcg" },
    { key: "vitamin_e_mg", label: "Vitamin E", unit: "mg" },
    { key: "vitamin_k_mcg", label: "Vitamin K", unit: "mcg" },
    { key: "vitamin_b6_mg", label: "B6", unit: "mg" },
    { key: "vitamin_b12_mcg", label: "B12", unit: "mcg" },
    { key: "folate_mcg", label: "Folate", unit: "mcg" },
  ];
  const minerals = [
    { key: "calcium_mg", label: "Calcium", unit: "mg" },
    { key: "iron_mg", label: "Iron", unit: "mg" },
    { key: "magnesium_mg", label: "Magnesium", unit: "mg" },
    { key: "potassium_mg", label: "Potassium", unit: "mg" },
    { key: "sodium_mg", label: "Sodium", unit: "mg" },
    { key: "zinc_mg", label: "Zinc", unit: "mg" },
  ];

  return (
    <div className="space-y-4">
      {/* Calorie hero */}
      <div className="flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-[var(--accent-gold)]/10 to-primary/10 rounded-xl border border-[var(--accent-gold)]/20">
        <Flame className="h-5 w-5 text-[var(--accent-gold)]" />
        <span className="font-fraunces text-3xl font-bold text-[var(--text-1)]">
          {n.calories !== null && n.calories !== undefined ? Math.round(n.calories as number) : "—"}
        </span>
        <span className="text-sm text-muted-foreground font-medium">kcal / serving</span>
      </div>

      {/* Macros */}
      <div className="bg-[var(--surface-raised)] border border-border/30 rounded-xl p-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Macronutrients</p>
        <MacroBar label="Protein" value={n.protein_g as number} unit="g" color="bg-blue-500/10 text-blue-400" icon={<Zap className="h-4 w-4" />} />
        <MacroBar label="Carbohydrates" value={n.carbohydrates_g as number} unit="g" color="bg-amber-500/10 text-amber-400" icon={<Wheat className="h-4 w-4" />} />
        <MacroBar label="Fat (total)" value={n.fat_g as number} unit="g" color="bg-rose-500/10 text-rose-400" icon={<Droplets className="h-4 w-4" />} />
        <MacroBar label="Saturated Fat" value={n.saturated_fat_g as number} unit="g" color="bg-rose-500/10 text-rose-300" icon={<Droplets className="h-3.5 w-3.5" />} />
        <MacroBar label="Fiber" value={n.fiber_g as number} unit="g" color="bg-green-500/10 text-green-400" icon={<Leaf className="h-4 w-4" />} />
        <MacroBar label="Sugar" value={n.sugar_g as number} unit="g" color="bg-pink-500/10 text-pink-400" icon={<Flame className="h-3.5 w-3.5" />} />
      </div>

      {/* Vitamins */}
      <div className="bg-[var(--surface-raised)] border border-border/30 rounded-xl p-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Vitamins</p>
        <div className="grid grid-cols-2 gap-x-4">
          {vitamins.map(v => (
            <div key={v.key} className="flex justify-between items-center py-1 border-b border-border/10 last:border-0">
              <span className="text-[11px] text-muted-foreground">{v.label}</span>
              <span className="text-[11px] font-bold text-[var(--text-1)] tabular-nums">
                {n[v.key] !== null && n[v.key] !== undefined ? `${Number(n[v.key]).toFixed(1)}${v.unit}` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Minerals */}
      <div className="bg-[var(--surface-raised)] border border-border/30 rounded-xl p-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Minerals</p>
        <div className="grid grid-cols-2 gap-x-4">
          {minerals.map(m => (
            <div key={m.key} className="flex justify-between items-center py-1 border-b border-border/10 last:border-0">
              <span className="text-[11px] text-muted-foreground">{m.label}</span>
              <span className="text-[11px] font-bold text-[var(--text-1)] tabular-nums">
                {n[m.key] !== null && n[m.key] !== undefined ? `${Number(n[m.key]).toFixed(1)}${m.unit}` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {nutrition.sources?.length > 0 && (
        <p className="text-[10px] text-muted-foreground text-center italic">
          Source: {nutrition.sources.join(", ")}
        </p>
      )}
    </div>
  );
}

// ── Catalog Recipe Card ───────────────────────────────────────
function CatalogCard({
  recipe,
  onViewDetail,
  onAddToLibrary,
  added,
}: {
  recipe: CatalogRecipe;
  onViewDetail: () => void;
  onAddToLibrary: () => void;
  added: boolean;
}) {
  const cal = recipe.nutrition?.per_serving?.calories;

  return (
    <motion.article
      whileHover={{ y: -4 }}
      className="glass-card border-michelin flex flex-col justify-between overflow-hidden transition-editorial hover-editorial-card"
    >
      {/* Header band */}
      <div className="h-2 w-full bg-gradient-to-r from-primary via-[var(--accent-gold)] to-primary/40" />

      <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          <div className="flex justify-between text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
            <span>{recipe.cuisine}</span>
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />{parseDuration(recipe.meta?.total_time)}
            </span>
          </div>

          <h3 className="font-fraunces text-base font-semibold text-[var(--text-1)] tracking-tight leading-snug line-clamp-2">
            {recipe.name}
          </h3>
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{recipe.description}</p>
        </div>

        {/* Diet badges */}
        <div className="flex flex-wrap gap-1">
          {recipe.dietary?.flags?.slice(0, 3).map(f => (
            <Badge key={f} variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-semibold rounded-md">
              {f}
            </Badge>
          ))}
          {cal !== null && cal !== undefined && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-semibold rounded-md text-[var(--accent-gold)] border-[var(--accent-gold)]/30">
              <Flame className="h-2.5 w-2.5 mr-0.5" />{Math.round(cal as number)} kcal
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/20">
          <Button
            size="sm"
            variant="ghost"
            onClick={onViewDetail}
            className="flex-1 text-[11px] font-bold text-muted-foreground border border-border/60 hover:bg-secondary/40 h-8 rounded-lg"
          >
            <BookOpen className="h-3.5 w-3.5 mr-1" /> Nutrition
          </Button>
          <Button
            size="sm"
            onClick={onAddToLibrary}
            disabled={added}
            className={`h-8 rounded-lg px-3 text-[11px] font-bold shrink-0 transition-all ${
              added
                ? "bg-green-600/20 text-green-400 border border-green-600/30 cursor-default"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {added ? <CheckCircle className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            {added ? "Saved" : "Add"}
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

// ── Main Discover Panel ──────────────────────────────────────
const DIETARY_OPTIONS = [
  { value: "__all__", label: "Any diet" },
  { value: "Vegetarian", label: "Vegetarian" },
  { value: "Vegan", label: "Vegan" },
  { value: "Gluten-Free", label: "Gluten-Free" },
  { value: "Dairy-Free", label: "Dairy-Free" },
  { value: "High-Protein", label: "High-Protein" },
];

const CUISINE_OPTIONS = [
  { value: "__all__", label: "All cuisines" },
  { value: "Italian", label: "Italian" },
  { value: "Indian", label: "Indian" },
  { value: "Mexican", label: "Mexican" },
  { value: "American", label: "American" },
  { value: "Mediterranean", label: "Mediterranean" },
  { value: "French", label: "French" },
  { value: "Japanese", label: "Japanese" },
  { value: "Chinese", label: "Chinese" },
  { value: "Thai", label: "Thai" },
];

export function RecipeDiscover() {
  const { addRecipe } = useStore();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState("__all__");
  const [dietary, setDietary] = useState("__all__");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CatalogRecipe[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Detail drawer
  const [detailRecipe, setDetailRecipe] = useState<CatalogRecipe | null>(null);
  const [enrichLoading, setEnrichLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const resp = await api.discoverRecipes({
        q: query,
        cuisine: cuisine === "__all__" ? "" : cuisine,
        dietary: dietary === "__all__" ? "" : dietary,
        limit: 12,
      });
      setResults(resp.data ?? []);
    } catch (e: any) {
      if (e?.status === 503) {
        setError("Recipe API key not configured on the server. Add RECIPE_API_KEY to the backend .env file.");
      } else {
        setError(e?.message ?? "Failed to reach Recipe API. Is the Django backend running?");
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, cuisine, dietary]);

  const handleAddToLibrary = useCallback(async (r: CatalogRecipe) => {
    // Flatten grouped ingredients into a string array
    const ingredients = r.ingredients.flatMap(g =>
      g.items.map(i => `${i.name}${i.preparation ? ` (${i.preparation})` : ""}`)
    );
    const steps = r.instructions
      .sort((a, b) => a.step_number - b.step_number)
      .map(s => s.text);

    try {
      await addRecipe({
        title: r.name,
        cuisine: r.cuisine,
        minutes: (() => {
          const m = r.meta?.total_time?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
          if (!m) return 30;
          return (parseInt(m[1] ?? "0") * 60) + parseInt(m[2] ?? "0");
        })(),
        difficulty: r.difficulty === "Intermediate" ? "Medium" : (r.difficulty as any) ?? "Easy",
        tags: r.tags,
        ingredients,
        steps,
        rating: 4.5,
      });
      setAddedIds(prev => new Set([...prev, r.id]));
      toast({
        title: "Recipe saved to your library! 🎉",
        description: `"${r.name}" is now in your SmartPantry recipe collection.`,
      });
    } catch {
      toast({ title: "Error", description: "Could not save recipe. Is the backend running?", variant: "destructive" });
    }
  }, [addRecipe, toast]);

  const handleViewDetail = useCallback(async (r: CatalogRecipe) => {
    // If we already have rich nutrition data (>2 keys), use it directly
    if (r.nutrition?.per_serving && Object.keys(r.nutrition.per_serving).length > 2) {
      setDetailRecipe(r);
      return;
    }
    setDetailRecipe(r); // open immediately with what we have
    setEnrichLoading(true);
    try {
      const resp = await api.enrichRecipe(r.id);
      // Recipe API wraps single-recipe response in { data: {...}, usage: {...} }
      const full: CatalogRecipe = resp?.data ?? resp;
      setDetailRecipe(full);
    } catch {
      // keep showing what we have
    } finally {
      setEnrichLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <div className="glass-card border-michelin p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Compass className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold text-primary uppercase tracking-widest">Powered by Recipe API</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder='Search 25,000+ recipes e.g. "pasta", "chicken curry"…'
              className="pl-9 rounded-lg h-10"
            />
          </div>
          <Select value={cuisine} onValueChange={setCuisine}>
            <SelectTrigger className="w-full sm:w-44 rounded-lg h-10">
              <SelectValue placeholder="All cuisines" />
            </SelectTrigger>
            <SelectContent>
              {CUISINE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dietary} onValueChange={setDietary}>
            <SelectTrigger className="w-full sm:w-44 rounded-lg h-10">
              <SelectValue placeholder="Any diet" />
            </SelectTrigger>
            <SelectContent>
              {DIETARY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5 rounded-lg font-semibold text-sm shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-1.5">Search</span>
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Find any recipe from a catalog of 25,000+ — add it directly to your SmartPantry library with one click.
          Nutrition data from USDA FoodData Central.
        </p>
      </div>

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400"
        >
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Could not reach Recipe API</p>
            <p className="text-xs mt-0.5 opacity-80">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Searching the catalog…</p>
        </div>
      ) : results.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {results.map(r => (
            <CatalogCard
              key={r.id}
              recipe={r}
              onViewDetail={() => handleViewDetail(r)}
              onAddToLibrary={() => handleAddToLibrary(r)}
              added={addedIds.has(r.id)}
            />
          ))}
        </motion.div>
      ) : searched && !error ? (
        <div className="py-16 text-center text-sm text-muted-foreground italic bg-[var(--surface-raised)]/30 border border-dashed border-border rounded-xl">
          No recipes found for your search. Try different keywords or filters.
        </div>
      ) : !searched ? (
        <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
          <ChefHat className="h-12 w-12 opacity-20" />
          <div className="text-center space-y-1">
            <p className="font-semibold text-sm text-foreground/60">25,000+ chef-written recipes at your fingertips</p>
            <p className="text-xs">Search above to discover recipes and add them to your SmartPantry library</p>
          </div>
        </div>
      ) : null}

      {/* Detail Drawer */}
      <AnimatePresence>
        {detailRecipe && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setDetailRecipe(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="bg-[var(--surface-raised)] border border-border rounded-2xl shadow-elegant w-full max-w-2xl max-h-[90vh] overflow-y-auto font-figtree"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 bg-[var(--surface-raised)]/95 backdrop-blur border-b border-border/40 p-5 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {detailRecipe.cuisine} · {detailRecipe.difficulty} · {parseDuration(detailRecipe.meta?.total_time)}
                  </p>
                  <h2 className="font-fraunces text-xl font-normal text-[var(--text-1)] leading-tight">
                    {detailRecipe.name}
                  </h2>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {detailRecipe.dietary?.flags?.map(f => (
                      <Badge key={f} variant="secondary" className="text-[9px] px-1.5 h-4 rounded-md">{f}</Badge>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setDetailRecipe(null)}
                  className="h-8 w-8 rounded-lg hover:bg-secondary/50 flex items-center justify-center shrink-0 mt-0.5"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-5 space-y-6">
                {/* Description */}
                {detailRecipe.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{detailRecipe.description}</p>
                )}

                {/* Nutrition panel */}
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
                    Nutrition per serving · 32 USDA nutrients
                    {enrichLoading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                  </p>
                  {detailRecipe.nutrition ? (
                    <NutritionPanel nutrition={detailRecipe.nutrition} />
                  ) : (
                    <div className="text-xs text-muted-foreground italic py-4 text-center">
                      {enrichLoading ? "Loading nutrition data…" : "Nutrition data unavailable"}
                    </div>
                  )}
                </div>

                {/* Ingredients */}
                {detailRecipe.ingredients?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Ingredients</p>
                    <div className="space-y-3">
                      {detailRecipe.ingredients.map((group, gi) => (
                        <div key={gi} className="bg-[var(--surface)] border border-border/30 rounded-xl p-3">
                          {group.group_name && (
                            <p className="text-xs font-bold text-primary mb-2">{group.group_name}</p>
                          )}
                          <ul className="space-y-1">
                            {group.items.map((item, ii) => (
                              <li key={ii} className="flex items-center gap-2 text-xs text-[var(--text-2)]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-gold)] shrink-0" />
                                <span className="font-semibold text-[var(--text-1)]">{item.quantity} {item.unit}</span>
                                <span>{item.name}</span>
                                {item.preparation && <span className="text-muted-foreground">({item.preparation})</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Instructions */}
                {detailRecipe.instructions?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Instructions</p>
                    <ol className="relative border-l border-border/80 pl-6 space-y-4">
                      {detailRecipe.instructions
                        .sort((a, b) => a.step_number - b.step_number)
                        .map(step => (
                          <li key={step.step_number} className="relative">
                            <span className="absolute -left-[30px] top-0 h-5 w-5 rounded-full bg-[var(--accent-gold)] text-white font-fraunces text-[10px] flex items-center justify-center font-bold">
                              {step.step_number}
                            </span>
                            {step.phase && (
                              <span className="text-[9px] font-bold text-primary uppercase tracking-widest block mb-0.5">
                                {step.phase}
                              </span>
                            )}
                            <p className="text-xs text-[var(--text-2)] font-medium leading-relaxed">{step.text}</p>
                          </li>
                        ))}
                    </ol>
                  </div>
                )}

                {/* Add to library CTA */}
                <Button
                  onClick={() => { handleAddToLibrary(detailRecipe); setDetailRecipe(null); }}
                  disabled={addedIds.has(detailRecipe.id)}
                  className={`w-full h-11 rounded-xl font-bold text-sm shadow-sm ${
                    addedIds.has(detailRecipe.id)
                      ? "bg-green-600/20 text-green-400 border border-green-600/30 cursor-default"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {addedIds.has(detailRecipe.id) ? (
                    <><CheckCircle className="h-4 w-4 mr-2" /> Saved to your library</>
                  ) : (
                    <><ShoppingCart className="h-4 w-4 mr-2" /> Add to SmartPantry library</>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

