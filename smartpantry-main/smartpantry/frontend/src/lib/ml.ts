import type { PantryItem, Recipe, Preferences, Expense } from "./types";

export const daysUntil = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

export const expiryStatus = (iso: string): "fresh" | "soon" | "urgent" | "expired" => {
  const d = daysUntil(iso);
  if (d < 0) return "expired";
  if (d <= 1) return "urgent";
  if (d <= 4) return "soon";
  return "fresh";
};

/**
 * Simulated ML ranking: blends ingredient coverage, expiry urgency,
 * preference alignment, and base community rating.
 */
export type RankedRecipe = Recipe & {
  score: number;
  matchPct: number;
  usesExpiring: string[];
  missing: string[];
};

export function rankRecipes(
  recipes: Recipe[],
  pantry: PantryItem[],
  prefs: Preferences,
): RankedRecipe[] {
  const pantryNames = pantry.map((p) => p.name.toLowerCase());
  const urgent = new Set(
    pantry.filter((p) => ["urgent", "soon"].includes(expiryStatus(p.expiresAt))).map((p) => p.name.toLowerCase()),
  );

  return recipes
    .map((r) => {
      const matched = r.ingredients.filter((i) => pantryNames.some((p) => p.includes(i) || i.includes(p)));
      const missing = r.ingredients.filter((i) => !pantryNames.some((p) => p.includes(i) || i.includes(p)));
      const matchPct = matched.length / r.ingredients.length;
      const usesExpiring = r.ingredients.filter((i) => Array.from(urgent).some((u) => u.includes(i) || i.includes(u)));

      const expiryBoost = usesExpiring.length * 0.18;
      const cuisineBoost = prefs.cuisines.includes(r.cuisine) ? 0.15 : 0;
      const dietPenalty =
        prefs.diet === "vegetarian" && !r.tags.includes("vegetarian") ? -0.25 :
        prefs.diet === "vegan" && !r.tags.includes("vegan") ? -0.4 : 0;
      const dislikePenalty = r.ingredients.some((i) => prefs.dislikes.some((d) => i.includes(d.toLowerCase()))) ? -0.5 : 0;
      const ratingBoost = (r.rating - 4) * 0.1;

      const score = Math.max(0, Math.min(1, matchPct * 0.55 + expiryBoost + cuisineBoost + ratingBoost + dietPenalty + dislikePenalty));

      return { ...r, score, matchPct, usesExpiring, missing };
    })
    .sort((a, b) => b.score - a.score);
}

/** Simple Holt-Winters-lite forecast: trend + seasonality from last 12 weeks. */
export function forecastExpenses(history: Expense[], weeksAhead = 4): { week: number; amount: number; forecast: boolean }[] {
  const sorted = [...history].sort((a, b) => a.weekOffset - b.weekOffset);
  const values = sorted.map((e) => e.amount);
  const n = values.length;
  if (n === 0) return [];

  // Linear trend via least squares
  const xs = values.map((_, i) => i);
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = values.reduce((s, v) => s + v, 0) / n;
  const slope =
    xs.reduce((s, x, i) => s + (x - meanX) * (values[i] - meanY), 0) /
    xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
  const intercept = meanY - slope * meanX;

  // Seasonal residuals (period 4)
  const residuals = values.map((v, i) => v - (intercept + slope * i));
  const seasonal = Array.from({ length: 4 }).map((_, k) => {
    const items = residuals.filter((_, i) => i % 4 === k);
    return items.reduce((s, v) => s + v, 0) / Math.max(1, items.length);
  });

  const past = sorted.map((e) => ({ week: e.weekOffset, amount: e.amount, forecast: false }));
  const future = Array.from({ length: weeksAhead }).map((_, k) => {
    const i = n + k;
    const base = intercept + slope * i + seasonal[i % 4];
    return { week: k + 1, amount: Math.max(20, Math.round(base)), forecast: true };
  });
  return [...past, ...future];
}

/** Predict a personalized rating for a recipe (0-5). */
export function predictRating(recipe: Recipe, prefs: Preferences): number {
  let r = recipe.rating;
  if (prefs.cuisines.includes(recipe.cuisine)) r += 0.3;
  if (prefs.diet === "vegetarian" && recipe.tags.includes("vegetarian")) r += 0.2;
  if (recipe.ingredients.some((i) => prefs.dislikes.some((d) => i.includes(d.toLowerCase())))) r -= 0.6;
  return Math.max(0, Math.min(5, +r.toFixed(1)));
}

export interface AIRecommendation {
  type: "warning" | "tip" | "optimal";
  title: string;
  desc: string;
  actionText?: string;
  actionPath?: string;
}

export function generateAIRecommendations(
  pantry: PantryItem[],
  recipes: Recipe[],
  expenses: Expense[]
): AIRecommendation[] {
  const recs: AIRecommendation[] = [];

  // 1. Expiry savings recommendation
  const urgentItems = pantry.filter(
    (p) => expiryStatus(p.expiresAt) === "urgent" || expiryStatus(p.expiresAt) === "expired"
  );
  if (urgentItems.length > 0) {
    const totalLostValue = urgentItems.reduce((sum, item) => sum + (item.pricePaid ?? 0), 0);
    if (totalLostValue > 0) {
      recs.push({
        type: "warning",
        title: "Expiry Waste Warning",
        desc: `You have ${urgentItems.length} item(s) expiring or expired with a combined purchase value of $${totalLostValue.toFixed(2)}. Plan a meal tonight to rescue them!`,
        actionText: "See Tonight's Recipes",
        actionPath: "/recipes"
      });
    }
  }

  // 2. Optimal Shopping Window Recommendation
  const activeItems = pantry.filter((p) => expiryStatus(p.expiresAt) !== "expired");
  if (activeItems.length > 0) {
    const totalDays = activeItems.reduce((sum, item) => sum + Math.max(0, daysUntil(item.expiresAt)), 0);
    const avgDays = totalDays / activeItems.length;
    let shopInDays = Math.max(1, Math.round(avgDays - 2));
    if (shopInDays > 7) shopInDays = 7;
    recs.push({
      type: "optimal",
      title: "Optimal Shopping Window",
      desc: `Based on your inventory's remaining shelf-life, your optimal next shopping window is in ${shopInDays} days to restock fresh ingredients.`,
      actionText: "View Shopping List",
      actionPath: "/shopping"
    });
  } else {
    recs.push({
      type: "optimal",
      title: "Pantry Restock Recommended",
      desc: "Your pantry is currently empty. We recommend planning a shopping run to stock up on daily staples.",
      actionText: "Build Shopping List",
      actionPath: "/shopping"
    });
  }

  // 3. Balance score & variety analysis
  const categoryCounts: Record<string, number> = {};
  pantry.forEach((item) => {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  });
  const totalPantry = pantry.length;
  if (totalPantry > 0) {
    const producePct = ((categoryCounts["Produce"] || 0) / totalPantry) * 100;
    const proteinPct = ((categoryCounts["Protein"] || 0) / totalPantry) * 100;
    if (producePct < 20) {
      recs.push({
        type: "tip",
        title: "Boost Green Balance",
        desc: "Produce makes up less than 20% of your current pantry. Adding fresh vegetables or leafy greens will improve your health score.",
        actionText: "Add Produce",
        actionPath: "/shopping"
      });
    } else if (proteinPct < 15) {
      recs.push({
        type: "tip",
        title: "Protein Variety Advisory",
        desc: "Your kitchen variety score shows low protein stock. We suggest adding chicken, eggs, or legumes to your next list.",
        actionText: "Add Proteins",
        actionPath: "/shopping"
      });
    } else {
      recs.push({
        type: "tip",
        title: "Kitchen Variety Balanced",
        desc: "Great variety! You have a healthy blend of fresh produce, proteins, and pantry staples in stock.",
      });
    }
  }

  return recs;
}
