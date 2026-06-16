import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Clock,
  Flame,
  Settings2,
  ShoppingCart,
  ChefHat,
  ChevronRight,
  BookOpen,
  X,
  Compass,
  CheckCircle,
  HelpCircle,
  AlertTriangle
} from "lucide-react";
import { useStore } from "@/lib/store";
import { rankRecipes, predictRating, expiryStatus, daysUntil } from "@/lib/ml";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollShelf } from "@/components/ui/ScrollShelf";
import { RecipeDiscover } from "@/components/RecipeDiscover";

const allCuisines = ["Italian", "Mediterranean", "Greek", "Indian", "Brunch"];

export default function Recipes() {
  const { recipes, pantry, prefs, setPrefs, addMultipleToShopping } = useStore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [draftPrefs, setDraftPrefs] = useState(prefs);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"mine" | "discover">("mine");

  const ranked = useMemo(() => rankRecipes(recipes, pantry, prefs), [recipes, pantry, prefs]);

  // Featured Recipe (Highest match score tonight)
  const featuredRecipe = useMemo(() => ranked[0] || null, [ranked]);

  // Categorized Shelves
  const shelves = useMemo(() => {
    // 1. High match items (score >= 0.7)
    const highMatch = ranked.filter(r => r.score >= 0.7);
    
    // 2. Under 25 Minutes fast options
    const quickEats = ranked.filter(r => r.minutes <= 25);
    
    // 3. International Specialties (e.g. Italian / Mediterranean)
    const globalFlavours = ranked.filter(r => ["Italian", "Mediterranean", "Greek", "Indian"].includes(r.cuisine));

    return {
      highMatch,
      quickEats,
      globalFlavours
    };
  }, [ranked]);

  const tagEmojis: Record<string, string> = {
    vegan: "🥦",
    vegetarian: "🥚",
    pescatarian: "🐟",
    keto: "🥩",
    "low-carb": "🥬",
    glutenfree: "🌾",
    "high-protein": "💪"
  };

  const handleAddMissing = (r: typeof ranked[0]) => {
    const items = r.missing.map((name) => {
      let category: "Produce" | "Protein" | "Dairy" | "Pantry" | "Frozen" | "Other" = "Pantry";
      const lower = name.toLowerCase();
      if (["spinach", "lemon", "lemons", "apple", "apples", "garlic", "onion", "onions", "tomato", "tomatoes", "potato", "potatoes", "cilantro", "mint", "parsley", "herb", "herbs", "mushroom", "mushrooms", "cucumber", "lime"].some(x => lower.includes(x))) {
        category = "Produce";
      } else if (["chicken", "beef", "pork", "fish", "salmon", "shrimp", "egg", "eggs", "tofu", "turkey", "lamb", "meat"].some(x => lower.includes(x))) {
        category = "Protein";
      } else if (["milk", "cheese", "butter", "yogurt", "cream", "feta", "parmesan"].some(x => lower.includes(x))) {
        category = "Dairy";
      }
      return { name, category, quantity: 1, unit: "pcs" };
    });
    
    addMultipleToShopping(items);
    toast({
      title: "Grocery planner updated",
      description: `Added ${items.length} missing ingredients for "${r.title}".`,
    });
  };

  return (
    <div className="container py-8 space-y-10 max-w-6xl font-figtree">
      
      {/* Header toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <p className="label-category text-primary font-bold">Kitchen Gastronomy</p>
          <h1 className="font-fraunces text-3xl md:text-4xl font-normal text-foreground/90">
            Recipes <span className="font-fraunces italic font-light text-[var(--accent-gold)]">for your pantry</span>
          </h1>
          <p className="text-sm text-[var(--text-2)] font-figtree">Explore curated culinary suggestions driven by actual ingredient shelf-life</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab switcher */}
          <div className="flex items-center bg-[var(--surface-raised)] border border-border/60 rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveTab("mine")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "mine"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <ChefHat className="h-3.5 w-3.5" /> My Recipes
            </button>
            <button
              onClick={() => setActiveTab("discover")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "discover"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Compass className="h-3.5 w-3.5" /> Discover
              <span className="ml-0.5 text-[8px] font-black bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] px-1 py-0.5 rounded-sm uppercase tracking-wider">NEW</span>
            </button>
          </div>

          {activeTab === "mine" && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-lg shadow-sm border-border/80 hover:bg-secondary/40 h-10 px-4 text-xs font-semibold">
                  <Settings2 className="h-4 w-4 mr-1.5 text-muted-foreground" /> Taste preferences
                </Button>
              </DialogTrigger>
          <DialogContent className="sm:max-w-[400px] rounded-xl border border-border bg-[var(--surface-raised)] shadow-elegant p-6">
            <DialogHeader>
              <DialogTitle className="font-fraunces text-xl font-normal text-foreground/90">Your culinary profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3 font-figtree">
              <div className="space-y-1.5">
                <Label htmlFor="diet" className="text-xs font-semibold text-foreground/80">Dietary restriction</Label>
                <Select value={draftPrefs.diet} onValueChange={(v) => setDraftPrefs({ ...draftPrefs, diet: v as any })}>
                  <SelectTrigger id="diet" className="rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">No restriction</SelectItem>
                    <SelectItem value="vegetarian">Vegetarian</SelectItem>
                    <SelectItem value="vegan">Vegan</SelectItem>
                    <SelectItem value="pescatarian">Pescatarian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground/80">Preferred cuisines</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {allCuisines.map((c) => {
                    const active = draftPrefs.cuisines.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          setDraftPrefs({
                            ...draftPrefs,
                            cuisines: active
                              ? draftPrefs.cuisines.filter((x) => x !== c)
                              : [...draftPrefs.cuisines, c],
                          })
                        }
                        className={`px-3 py-1 rounded-md text-xs font-medium border transition-smooth ${
                          active 
                            ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                            : "border-border text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dislikes" className="text-xs font-semibold text-foreground/80">Ingredients to avoid</Label>
                <Input
                  id="dislikes"
                  value={draftPrefs.dislikes.join(", ")}
                  onChange={(e) => setDraftPrefs({ ...draftPrefs, dislikes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="e.g. mushrooms, olives"
                  className="rounded-md"
                />
              </div>
              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-sm mt-2 font-medium" 
                onClick={() => { setPrefs(draftPrefs); setOpen(false); }}
              >
                Apply Profile Settings
              </Button>
            </div>
          </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "discover" ? (
        <RecipeDiscover />
      ) : (
        <>
      {/* 1. Featured Recipe Hero Banner */}
      {featuredRecipe && (
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl overflow-hidden shadow-elegant border-michelin h-[350px] md:h-[400px] flex items-end group"
        >
          {/* Hero background image */}
          <div className="absolute inset-0 z-0">
            <img
              src="/images/plated_dish_hero.png"
              alt={featuredRecipe.title}
              className="w-full h-full object-cover filter brightness-75 group-hover:scale-101 transition-transform duration-700"
            />
            {/* Scrim overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          </div>

          {/* Hero Content */}
          <div className="relative z-10 p-6 md:p-10 w-full grid md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-8 space-y-3.5 text-left">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--accent-gold)] bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                <ChefHat className="h-3.5 w-3.5" /> Featured Recipe Choice
              </span>
              
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300 font-semibold uppercase tracking-wider">
                  <span>{featuredRecipe.cuisine}</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5"><Clock className="h-3.5 w-3.5" /> {featuredRecipe.minutes} mins</span>
                  <span>·</span>
                  <span>{featuredRecipe.difficulty}</span>
                </div>
                <h2 className="font-fraunces text-2xl md:text-4xl font-normal text-white tracking-tight leading-snug">
                  {featuredRecipe.title}
                </h2>
              </div>

              {/* Rating and short details */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-[var(--accent-gold)] font-bold">
                  <Star className="h-4.5 w-4.5 fill-current" />
                  {featuredRecipe.rating} / 5 rating
                </span>
                {featuredRecipe.usesExpiring.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-primary font-bold uppercase text-[9px] tracking-widest bg-primary/20 px-2 py-0.5 rounded-md">
                    rescues {featuredRecipe.usesExpiring.length} expiring items
                  </span>
                )}
              </div>
            </div>

            {/* Match Circle & quick CTA */}
            <div className="md:col-span-4 flex flex-col items-start md:items-end gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2.5 flex items-center gap-3 text-white">
                <div className="h-10 w-10 rounded-full bg-[var(--accent-gold)]/25 flex items-center justify-center font-fraunces text-xl font-bold border border-[var(--accent-gold)]/40 text-[var(--accent-gold)]">
                  {Math.round(featuredRecipe.score * 100)}%
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-neutral-300 block font-bold">Pantry Match</span>
                  <span className="text-xs font-semibold block">{featuredRecipe.ingredients.length - featuredRecipe.missing.length} / {featuredRecipe.ingredients.length} ingredients</span>
                </div>
              </div>
              
              <Button
                onClick={() => setExpandedRecipeId(expandedRecipeId === featuredRecipe.id ? null : featuredRecipe.id)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5 text-xs font-bold rounded-lg transition-transform active:scale-98 w-full md:w-auto"
              >
                {expandedRecipeId === featuredRecipe.id ? "Hide preparation steps" : "View preparation method"}
              </Button>
            </div>
          </div>
        </motion.section>
      )}

      {/* Featured Recipe expanded step timeline */}
      <AnimatePresence>
        {featuredRecipe && expandedRecipeId === featuredRecipe.id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="glass-card border-michelin p-6 overflow-hidden space-y-4"
          >
            <div className="flex justify-between items-center border-b border-border/40 pb-2.5">
              <h3 className="font-fraunces text-lg text-[var(--text-1)] flex items-center gap-1.5">
                <BookOpen className="h-4.5 w-4.5 text-primary" /> Cooking Steps & Ingredients Checklist
              </h3>
              <X className="h-5 w-5 cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => setExpandedRecipeId(null)} />
            </div>

            <div className="grid md:grid-cols-3 gap-6 font-figtree">
              {/* Left col: pantry match details */}
              <div className="space-y-3 bg-[var(--surface-raised)] border border-border/30 rounded-xl p-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ingredients breakdown</span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[var(--text-1)]">
                    <span className="font-medium flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[var(--accent-2)]" /> In stock</span>
                    <span className="font-bold">{featuredRecipe.ingredients.length - featuredRecipe.missing.length} items</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--text-2)]">
                    <span className="font-medium flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-neutral-400" /> Missing</span>
                    <span className="font-bold text-rose-500">{featuredRecipe.missing.length} items</span>
                  </div>
                </div>
                {featuredRecipe.missing.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => handleAddMissing(featuredRecipe)}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] h-8 rounded-lg mt-2 font-semibold"
                  >
                    <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Add missing to shopping checklist
                  </Button>
                )}
              </div>

              {/* Right two cols: preparation timeline */}
              <div className="md:col-span-2 space-y-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Instructions timeline</span>
                <ol className="relative border-l border-border/80 pl-6 space-y-4">
                  {featuredRecipe.steps.map((step, idx) => (
                    <li key={idx} className="relative">
                      <span className="absolute -left-[30px] top-0 h-5 w-5 rounded-full bg-[var(--accent-gold)] text-white font-fraunces text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <p className="text-xs md:text-sm text-[var(--text-2)] font-medium leading-relaxed">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Netflix-Style horizontal Category shelves */}
      <div className="space-y-12">

        {/* Shelf I: High Pantry Match (Pantry Treasures) */}
        <section className="space-y-4">
          <div className="space-y-1">
            <span className="label-category text-primary font-bold">Pantry Treasures</span>
            <h2 className="font-fraunces text-xl md:text-2xl font-normal text-[var(--text-1)]">Highest Pantry Match suggestions</h2>
            <p className="text-xs text-[var(--text-2)]">Recipes matching your highest density of fresh ingredients</p>
          </div>
          {renderShelf(shelves.highMatch)}
        </section>

        {/* Shelf II: Gastronomy in a Rush (Under 25 mins) */}
        <section className="space-y-4">
          <div className="space-y-1">
            <span className="label-category text-primary font-bold">Gastronomy in a Rush</span>
            <h2 className="font-fraunces text-xl md:text-2xl font-normal text-[var(--text-1)]">Quick Cook options (≤ 25 min)</h2>
            <p className="text-xs text-[var(--text-2)]">Elegant plates requiring minimal prep and cook time</p>
          </div>
          {renderShelf(shelves.quickEats)}
        </section>

        {/* Shelf III: Global Flavour Curations */}
        <section className="space-y-4">
          <div className="space-y-1">
            <span className="label-category text-primary font-bold">Worldly Cuisines</span>
            <h2 className="font-fraunces text-xl md:text-2xl font-normal text-[var(--text-1)]">International specialties</h2>
            <p className="text-xs text-[var(--text-2)]">Cuisines matching your preferences (Italian, Greek, Indian, Mediterranean)</p>
          </div>
          {renderShelf(shelves.globalFlavours)}
        </section>

      </div>

      {/* Expandable Recipes detailed overlay popup */}
      <Dialog open={expandedRecipeId !== null && expandedRecipeId !== featuredRecipe?.id} onOpenChange={(open) => !open && setExpandedRecipeId(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-xl border border-border bg-[var(--surface-raised)] shadow-elegant p-6 font-figtree">
          {(() => {
            const r = recipes.find(x => x.id === expandedRecipeId);
            if (!r) return null;
            const personal = predictRating(r, prefs);
            const haveList = r.ingredients.filter((ing) => !pantry.map(p => p.name.toLowerCase()).some(p => p.includes(ing) || ing.includes(p)));
            const missingCount = r.ingredients.length - (r.ingredients.length - haveList.length);

            return (
              <div className="space-y-6">
                <DialogHeader className="flex flex-row items-start justify-between border-b border-border/40 pb-4">
                  <div className="space-y-1.5 text-left">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{r.cuisine} · {r.difficulty}</span>
                    <DialogTitle className="font-fraunces text-2xl font-normal leading-tight text-[var(--text-1)]">
                      {r.title}
                    </DialogTitle>
                  </div>
                  <X className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => setExpandedRecipeId(null)} />
                </DialogHeader>

                <div className="space-y-4">
                  {/* Photo header */}
                  <div className="h-44 w-full rounded-xl overflow-hidden relative">
                    <img src="/images/fresh_ingredients.png" alt={r.title} className="w-full h-full object-cover filter brightness-95" />
                    <div className="absolute top-3 right-3 bg-[var(--surface)]/90 px-3 py-1 rounded-full text-xs font-bold text-[var(--accent-gold)] border border-[var(--accent-gold)]/20 shadow-sm flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {personal}/5 rating
                    </div>
                  </div>

                  {/* Ingredients row */}
                  <div className="grid grid-cols-2 gap-4 text-xs bg-[var(--surface)] p-4 border border-border/30 rounded-xl">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block">In Pantry</span>
                      <p className="font-semibold text-[var(--accent-2)]">{r.ingredients.length - missingCount} items</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block">Missing</span>
                      <p className="font-semibold text-rose-500">{missingCount} items</p>
                    </div>
                  </div>

                  {/* Method timeline */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Instructions timeline</span>
                    <ol className="relative border-l border-border/80 pl-6 space-y-3.5">
                      {r.steps.map((step, idx) => (
                        <li key={idx} className="relative">
                          <span className="absolute -left-[28px] top-0.5 h-5 w-5 rounded-full bg-[var(--accent-gold)] text-white font-fraunces text-[9px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <p className="text-xs text-[var(--text-2)] font-semibold leading-relaxed">{step}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {missingCount > 0 && (
                  <Button
                    onClick={() => {
                      const items = r.ingredients.filter(ing => haveList.includes(ing)).map(name => ({ name, category: "Pantry" as any, quantity: 1, unit: "pcs" }));
                      addMultipleToShopping(items);
                      toast({
                        title: "Grocery planner updated",
                        description: `Added missing ingredients to your shopping checklist.`,
                      });
                    }}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-lg text-xs font-bold shadow-sm"
                  >
                    <ShoppingCart className="h-4 w-4 mr-1.5" /> Add missing ingredients to Shopping List
                  </Button>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
      </>
      )}
    </div>
  );

  // Render Horizontal Shelf function
  function renderShelf(itemsList: typeof ranked) {
    if (itemsList.length === 0) {
      return (
        <div className="py-6 text-center text-xs text-muted-foreground italic bg-[var(--surface-raised)]/30 border border-dashed border-border rounded-xl">
          No matching selections in this category.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {itemsList.map((r) => {
          const personal = predictRating(r, prefs);
          const haveCount = r.ingredients.length - r.missing.length;
          const pct = Math.round(r.score * 100);

          return (
            <motion.article
              key={r.id}
              whileHover={{ y: -4 }}
              className="w-full glass-card border-michelin flex flex-col justify-between overflow-hidden transition-editorial hover-editorial-card"
            >
              {/* Photo Header */}
              <div className="h-36 w-full relative overflow-hidden bg-muted">
                <img
                  src="/images/fresh_ingredients.png"
                  alt={r.title}
                  className="w-full h-full object-cover filter brightness-95 grayscale-[10%]"
                />
                
                {/* Match badge overlay */}
                <div className="absolute top-3 right-3 bg-[var(--surface)]/90 backdrop-blur-sm border border-[var(--accent-gold)]/20 px-2 py-0.5 rounded-full text-[10px] font-bold text-[var(--accent-gold)] shadow-sm">
                  {pct}% match
                </div>
              </div>

              {/* Card Details */}
              <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                    <span>{r.cuisine}</span>
                    <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {r.minutes} min</span>
                  </div>
                  <h3 className="font-fraunces text-base font-semibold text-[var(--text-1)] tracking-tight truncate leading-snug">
                    {r.title}
                  </h3>
                  
                  {/* Interactive gold stars */}
                  <div className="flex items-center gap-1.5 text-xs text-[var(--accent-gold)]">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span className="font-bold">{personal}</span>
                    <span className="text-[9.5px] text-muted-foreground font-medium uppercase">({r.difficulty})</span>
                  </div>
                </div>

                {/* Categories progress */}
                <div className="bg-[var(--bg-2)]/50 rounded-lg p-2.5 space-y-1 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Pantry Stock:</span>
                    <span className="text-[var(--accent-2)] font-bold">{haveCount} / {r.ingredients.length}</span>
                  </div>
                  <Progress value={(haveCount / r.ingredients.length) * 100} className="h-1 bg-border/40 [&>div]:bg-[var(--accent-2)]" />
                </div>

                {/* Actions footer */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/20">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedRecipeId(r.id)}
                    className="flex-1 text-[11px] font-bold text-muted-foreground border border-border/60 hover:bg-secondary/40 h-8 rounded-lg"
                  >
                    View Details
                  </Button>
                  
                  {r.missing.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => handleAddMissing(r)}
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
    );
  }
}
