import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { expiryStatus, daysUntil, rankRecipes } from "@/lib/ml";
import type { PantryItem } from "@/lib/types";
import { Sparkles, AlertTriangle, ShieldAlert, Check, Activity, Flame, Info, Coins, Trash2, Plus } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link } from "react-router-dom";

// Maps pantry items to visual categories
const mapToVisualCategory = (item: PantryItem): "Produce" | "Dairy" | "Proteins" | "Grains" | "Spices" => {
  const cat = item.category.toLowerCase();
  const name = item.name.toLowerCase();
  
  if (cat === "produce") return "Produce";
  if (cat === "dairy") return "Dairy";
  if (cat === "protein") return "Proteins";
  
  // Custom grains grouping based on pantry keywords
  if (
    name.includes("rice") || 
    name.includes("bread") || 
    name.includes("chia") || 
    name.includes("pasta") || 
    name.includes("grain") || 
    name.includes("oat") || 
    name.includes("flour") ||
    name.includes("sweet potato") ||
    name.includes("quinoa")
  ) {
    return "Grains";
  }
  
  // Spices, oils, seasonings, condiments, and others
  return "Spices";
};

// Generates high-fidelity SVG illustrations for each ingredient
const getIngredientSVG = (name: string) => {
  const lower = name.toLowerCase();
  
  if (lower.includes("tomato")) {
    return (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grad-tomato" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ff5e5e" />
            <stop offset="60%" stopColor="#d92a2a" />
            <stop offset="100%" stopColor="#991111" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="82" rx="32" ry="7" fill="rgba(0,0,0,0.12)" />
        <circle cx="50" cy="50" r="32" fill="url(#grad-tomato)" />
        <ellipse cx="43" cy="42" rx="7" ry="11" fill="rgba(255,255,255,0.4)" transform="rotate(-30, 43, 42)" />
        <path d="M50,18 L50,8 L52,8 L52,18 Z" fill="#4c9141" stroke="#336622" strokeWidth="1" />
        <path d="M50,16 C46,16 40,20 36,23 C42,20 47,18 50,18 C53,18 58,20 64,23 C60,20 54,16 50,16 Z" fill="#4c9141" />
        <path d="M50,16 C50,12 42,8 38,6 C43,10 47,13 50,16 C53,13 57,10 62,6 C58,8 50,12 50,16 Z" fill="#3c7d31" />
      </svg>
    );
  }
  
  if (lower.includes("spinach") || lower.includes("lettuce") || lower.includes("green") || lower.includes("cabbage")) {
    return (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-spinach" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5ea34d" />
            <stop offset="100%" stopColor="#25541c" />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="82" rx="28" ry="6" fill="rgba(0,0,0,0.1)" />
        <path d="M30,58 C20,36 35,18 50,23 C45,33 40,53 30,58 Z" fill="url(#grad-spinach)" opacity="0.85" />
        <path d="M70,58 C80,36 65,18 50,23 C55,33 60,53 70,58 Z" fill="url(#grad-spinach)" opacity="0.9" />
        <path d="M50,72 C30,67 25,42 42,27 C50,19 60,32 55,57 C52,67 51,71 50,72 Z" fill="url(#grad-spinach)" />
        <path d="M50,72 C49,57 46,42 44,29" stroke="#7ad463" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M48,57 C42,53 36,51 32,50" stroke="#7ad463" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M47,45 C41,40 38,35 35,34" stroke="#7ad463" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M49,55 C55,51 60,49 65,48" stroke="#7ad463" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
  }
  
  if (lower.includes("chicken") || lower.includes("turkey") || lower.includes("meat") || lower.includes("pork") || lower.includes("beef")) {
    return (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-meat" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e3a888" />
            <stop offset="100%" stopColor="#ab5e3c" />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="82" rx="34" ry="7" fill="rgba(0,0,0,0.12)" />
        <path d="M16,52 C13,35 26,22 51,27 C76,32 89,37 86,57 C81,72 56,72 36,69 C23,67 19,62 16,52 Z" fill="url(#grad-meat)" />
        <path d="M31,33 C36,39 46,42 61,39" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M26,47 C33,53 49,55 71,49" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
        <path d="M41,61 C49,65 56,64 76,58" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (lower.includes("salmon") || lower.includes("fish") || lower.includes("cod") || lower.includes("tuna") || lower.includes("seafood")) {
    return (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-salmon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff8a75" />
            <stop offset="100%" stopColor="#e04e36" />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="82" rx="34" ry="6" fill="rgba(0,0,0,0.12)" />
        <path d="M21,59 C16,45 21,29 46,22 C71,15 86,25 81,45 C76,62 56,69 36,67 C29,66 23,63 21,59 Z" fill="url(#grad-salmon)" />
        <path d="M31,29 C39,33 47,42 53,55" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M43,25 C51,31 59,42 63,53" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M55,23 C63,29 71,39 73,47" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  
  if (lower.includes("yogurt") || lower.includes("milk") || lower.includes("cream") || lower.includes("sour cream")) {
    return (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-yogurt" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e6f0fa" />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="82" rx="26" ry="5" fill="rgba(0,0,0,0.1)" />
        <path d="M29,32 L35,72 C36,76 39,79 43,79 L57,79 C61,79 64,76 65,72 L71,32 Z" fill="url(#grad-yogurt)" stroke="#b5cde6" strokeWidth="1.5" />
        <ellipse cx="50" cy="32" rx="21" ry="4" fill="#a0c0e0" stroke="#7da4cb" strokeWidth="1.5" />
        <rect x="36" y="45" width="28" height="18" rx="2" fill="#3c74b4" />
        <rect x="40" y="49" width="20" height="4" fill="white" rx="1" />
        <rect x="42" y="56" width="16" height="2" fill="white" rx="0.5" opacity="0.8" />
        <path d="M58,29 L68,9 C70,5 74,5 76,7 C78,9 78,13 74,15 L64,29 Z" fill="#b0b5be" />
      </svg>
    );
  }
  
  if (lower.includes("egg")) {
    return (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grad-egg" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#fff2e0" />
            <stop offset="60%" stopColor="#e3c298" />
            <stop offset="100%" stopColor="#b38959" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="80" rx="20" ry="5" fill="rgba(0,0,0,0.12)" />
        <path d="M50,20 C32,20 30,50 32,64 C34,74 40,78 50,78 C60,78 66,74 68,64 C70,50 68,20 50,20 Z" fill="url(#grad-egg)" />
        <ellipse cx="43" cy="38" rx="4" ry="9" fill="rgba(255,255,255,0.45)" transform="rotate(-15, 43, 38)" />
      </svg>
    );
  }
  
  if (lower.includes("garlic")) {
    return (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="50" cy="80" rx="22" ry="5" fill="rgba(0,0,0,0.08)" />
        <path d="M50,76 C32,76 30,52 42,40 C45,30 48,20 50,20 C52,20 55,30 58,40 C70,52 68,76 50,76 Z" fill="#fcfaf2" stroke="#ded8c8" strokeWidth="1.5" />
        <path d="M50,76 C42,76 38,60 46,40" stroke="#ded8c8" strokeWidth="1.2" fill="none" />
        <path d="M50,76 C58,76 62,60 54,40" stroke="#ded8c8" strokeWidth="1.2" fill="none" />
        <path d="M50,76 L50,20" stroke="#ded8c8" strokeWidth="1" fill="none" />
        <path d="M46,76 L44,81 M50,76 L50,82 M54,76 L56,81" stroke="#a19a86" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  
  if (lower.includes("oil") || lower.includes("vinegar")) {
    return (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-oil" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e3ca3b" />
            <stop offset="100%" stopColor="#b39212" />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="82" rx="20" ry="5" fill="rgba(0,0,0,0.12)" />
        <path d="M35,40 C35,33 44,28 44,20 L44,10 L56,10 L56,20 C56,28 65,33 65,40 L65,74 C65,78 61,82 57,82 L43,82 C39,82 35,78 35,74 Z" fill="rgba(200, 240, 210, 0.2)" stroke="#74b58b" strokeWidth="1.5" />
        <path d="M37,52 C37,52 44,50 50,50 C56,50 63,52 63,52 L63,74 C63,76 61,80 57,80 L43,80 C39,80 37,76 37,74 Z" fill="url(#grad-oil)" />
        <ellipse cx="50" cy="50" rx="13" ry="1.8" fill="#f0df78" opacity="0.6" />
        <path d="M45,10 L45,4 L55,4 L55,10 Z" fill="#9e7041" />
        <path d="M38,44 L38,68" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      </svg>
    );
  }
  
  if (lower.includes("lemon") || lower.includes("lime")) {
    const colorGrad1 = lower.includes("lime") ? "#99e33b" : "#fdf066";
    const colorGrad2 = lower.includes("lime") ? "#66b312" : "#d9a31a";
    const colorOutline = lower.includes("lime") ? "#4d800c" : "#b38914";
    return (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grad-lemon" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor={colorGrad1} />
            <stop offset="100%" stopColor={colorGrad2} />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="80" rx="28" ry="6" fill="rgba(0,0,0,0.12)" />
        <path d="M18,48 C18,28 38,20 50,20 C62,20 82,28 82,48 C82,68 62,76 50,76 C38,76 18,68 18,48 Z" fill="url(#grad-lemon)" stroke={colorOutline} strokeWidth="1" />
        <circle cx="17" cy="48" r="3" fill={colorGrad2} stroke={colorOutline} strokeWidth="1" />
        <circle cx="83" cy="48" r="3" fill={colorGrad2} stroke={colorOutline} strokeWidth="1" />
        <ellipse cx="44" cy="36" rx="8" ry="13" fill="rgba(255,255,255,0.45)" transform="rotate(-40, 44, 36)" />
      </svg>
    );
  }
  
  if (lower.includes("cheese") || lower.includes("parmesan") || lower.includes("cheddar") || lower.includes("mozzarella")) {
    return (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-cheese" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff3a1" />
            <stop offset="100%" stopColor="#f5bb2c" />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="82" rx="32" ry="6" fill="rgba(0,0,0,0.12)" />
        <path d="M16,67 L79,69 L84,39 L54,22 L16,67 Z" fill="url(#grad-cheese)" stroke="#d99914" strokeWidth="1.2" />
        <path d="M54,22 L54,68" stroke="#d99914" strokeWidth="1.2" />
        <circle cx="32" cy="49" r="4.5" fill="#f0ad1a" opacity="0.7" />
        <circle cx="44" cy="37" r="3" fill="#f0ad1a" opacity="0.7" />
        <circle cx="68" cy="52" r="4" fill="#f0ad1a" opacity="0.7" />
        <circle cx="60" cy="45" r="2.5" fill="#f0ad1a" opacity="0.7" />
      </svg>
    );
  }
  
  if (lower.includes("rice") || lower.includes("grain") || lower.includes("flour") || lower.includes("pasta") || lower.includes("oat") || lower.includes("quinoa") || lower.includes("seed")) {
    return (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-sack" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ebd3b0" />
            <stop offset="100%" stopColor="#bfa17c" />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="82" rx="28" ry="6" fill="rgba(0,0,0,0.12)" />
        <path d="M29,42 C29,35 36,29 50,29 C64,29 71,35 71,42 L67,75 C67,78 63,81 57,81 L43,81 C37,81 33,78 33,75 Z" fill="url(#grad-sack)" stroke="#9c7c56" strokeWidth="1.5" />
        <ellipse cx="50" cy="42" rx="19" ry="3" fill="#9c7c56" />
        <rect x="38" y="51" width="24" height="15" rx="1.5" fill="white" stroke="#c0a080" strokeWidth="1" />
        <rect x="42" y="55" width="16" height="3" fill="#9c7c56" rx="0.5" />
        <circle cx="50" cy="63" r="1.5" fill="#9c7c56" />
      </svg>
    );
  }
  
  if (lower.includes("butter")) {
    return (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-butter" x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#fff8cf" />
            <stop offset="100%" stopColor="#ebd473" />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="82" rx="34" ry="5" fill="rgba(0,0,0,0.1)" />
        <path d="M16,73 L84,73 L79,79 L21,79 Z" fill="#ffffff" stroke="#c8d2db" strokeWidth="1" />
        <rect x="26" y="42" width="48" height="26" rx="2" fill="url(#grad-butter)" stroke="#cca725" strokeWidth="1" />
        <path d="M39,42 L39,68 M53,42 L53,68" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
      </svg>
    );
  }

  if (lower.includes("mushroom")) {
    return (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grad-mushroom" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="80%" stopColor="#ebdcd0" />
            <stop offset="100%" stopColor="#cca991" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="82" rx="24" ry="5" fill="rgba(0,0,0,0.1)" />
        <path d="M44,52 L44,77 C44,79 46,81 50,81 C54,81 56,77 56,77 L56,52 Z" fill="#fffaf5" stroke="#dbcdbf" strokeWidth="1" />
        <path d="M23,52 C23,28 77,28 77,52 C77,56 69,59 50,59 C31,59 23,56 23,52 Z" fill="url(#grad-mushroom)" stroke="#b59a85" strokeWidth="1.2" />
      </svg>
    );
  }
  
  if (lower.includes("berry") || lower.includes("blueberries") || lower.includes("strawberries") || lower.includes("raspberries")) {
    return (
      <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="50" cy="82" rx="28" ry="6" fill="rgba(0,0,0,0.1)" />
        <circle cx="37" cy="60" r="13" fill="#3c509c" />
        <circle cx="34" cy="56" r="3.5" fill="rgba(255,255,255,0.3)" />
        <circle cx="63" cy="62" r="12" fill="#d4263e" />
        <circle cx="60" cy="58" r="3.5" fill="rgba(255,255,255,0.4)" />
        <circle cx="50" cy="48" r="14" fill="#4d2f80" />
        <circle cx="47" cy="43" r="3.5" fill="rgba(255,255,255,0.3)" />
      </svg>
    );
  }

  // Fallback Container Jar SVG
  return (
    <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="82" rx="22" ry="5" fill="rgba(0,0,0,0.12)" />
      <path d="M33,26 C33,22 40,22 40,18 L40,12 L60,12 L60,18 C60,22 67,22 67,26 L67,74 C67,78 63,82 58,82 L42,82 C38,82 33,78 33,74 Z" fill="rgba(240, 240, 245, 0.45)" stroke="#aeb4be" strokeWidth="1.5" />
      <path d="M38,12 L38,6 C38,5 40,3 42,3 L58,3 C60,3 62,5 62,6 L62,12 Z" fill="#b0865c" stroke="#87623d" strokeWidth="1" />
      <rect x="38" y="40" width="24" height="20" rx="1.5" fill="#fdfcf7" stroke="#ced0d4" strokeWidth="1" />
      <line x1="42" y1="46" x2="58" y2="46" stroke="#a2a5ad" strokeWidth="1.2" />
      <line x1="44" y1="52" x2="56" y2="52" stroke="#a2a5ad" strokeWidth="1.2" />
      <path d="M35,34 L35,70" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
};

// Calculates dynamic freshness percent for progress bar
const getFreshnessPercent = (expiresAt: string) => {
  const days = daysUntil(expiresAt);
  if (days <= 0) return 0;
  if (days >= 14) return 100;
  return Math.round((days / 14) * 100);
};

export default function DigitalPantryTwin() {
  const { pantry, recipes, prefs } = useStore();
  const { format } = useCurrency();
  const [clickedItem, setClickedItem] = useState<PantryItem | null>(null);

  // Group pantry items dynamically into visual categories
  const categoriesData = useMemo(() => {
    const groups = {
      Produce: [] as PantryItem[],
      Dairy: [] as PantryItem[],
      Proteins: [] as PantryItem[],
      Grains: [] as PantryItem[],
      Spices: [] as PantryItem[]
    };

    pantry.forEach(item => {
      const cat = mapToVisualCategory(item);
      groups[cat].push(item);
    });

    return groups;
  }, [pantry]);

  // Compute Pantry Freshness Index and Health metrics
  const healthMetrics = useMemo(() => {
    if (pantry.length === 0) {
      return { score: 100, total: 0, expired: 0, expiringSoon: 0, totalValue: 0 };
    }

    let totalScore = 0;
    let expiredCount = 0;
    let expiringCount = 0;
    let totalValue = 0;

    pantry.forEach(item => {
      const days = daysUntil(item.expiresAt);
      if (item.pricePaid) {
        totalValue += item.pricePaid;
      }

      if (days <= 0) {
        expiredCount++;
        totalScore += 0;
      } else if (days <= 3) {
        expiringCount++;
        totalScore += 45;
      } else if (days <= 7) {
        totalScore += 85;
      } else {
        totalScore += 100;
      }
    });

    const score = Math.round(totalScore / pantry.length);
    return { score, total: pantry.length, expired: expiredCount, expiringSoon: expiringCount, totalValue };
  }, [pantry]);

  // Get active combo recipe (tonight's chef match)
  const rankedRecipes = useMemo(() => rankRecipes(recipes, pantry, prefs), [recipes, pantry, prefs]);
  const bestRecipe = useMemo(() => rankedRecipes[0] || null, [rankedRecipes]);

  // Checks if item matches the chef recommended combo
  const isRecommendedItem = (item: PantryItem) => {
    if (!bestRecipe) return false;
    const lowerName = item.name.toLowerCase();
    return bestRecipe.ingredients.some(ing => lowerName.includes(ing) || ing.includes(lowerName));
  };

  // Helper to choose progress bar & label colors
  const getFreshnessMeta = (expiresAt: string) => {
    const days = daysUntil(expiresAt);
    if (days <= 0) {
      return { color: "text-rose-500 bg-rose-500/10 border-rose-500/20", bar: "bg-rose-500", text: "Expired" };
    }
    if (days <= 3) {
      return { color: "text-orange-500 bg-orange-500/10 border-orange-500/20", bar: "bg-orange-500", text: `${days}d left` };
    }
    if (days <= 7) {
      return { color: "text-amber-500 bg-amber-500/10 border-amber-500/20", bar: "bg-amber-500", text: `${days}d left` };
    }
    return { color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", bar: "bg-emerald-500", text: "Fresh" };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-figtree">
      {/* 1. LEFT SIDEBAR WIDGETS (Apple/Notion inspired) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        {/* Widget: Pantry Health Monitor */}
        <div className="bg-card border border-[var(--border-color)] rounded-3xl p-6 shadow-elegant flex flex-col justify-between min-h-[260px] relative overflow-hidden transition-editorial">
          {/* Subtle Ambient light behind gauge */}
          <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" /> Health Monitor
              </span>
              <span className="text-xs font-bold text-[var(--text-2)] bg-[var(--bg-2)] px-2 py-0.5 rounded-full">
                Score
              </span>
            </div>

            <div className="flex items-center gap-6 mt-5">
              {/* Circular Freshness Ring */}
              <div className="relative flex items-center justify-center shrink-0">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="34" className="stroke-[var(--border-color)]" strokeWidth="6" fill="transparent" />
                  <circle 
                    cx="40" 
                    cy="40" 
                    r="34" 
                    className="stroke-primary transition-all duration-1000" 
                    strokeWidth="6" 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={2 * Math.PI * 34 * (1 - healthMetrics.score / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xl font-bold font-fraunces text-[var(--text-1)]">{healthMetrics.score}%</span>
                </div>
              </div>

              {/* Quick stats list */}
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-[var(--text-2)]">
                  <span>Total Items:</span>
                  <span className="text-[var(--text-1)]">{healthMetrics.total}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-[var(--text-2)]">
                  <span>Expiring Soon:</span>
                  <span className="text-orange-500 font-bold">{healthMetrics.expiringSoon}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-[var(--text-2)]">
                  <span>Expired Assets:</span>
                  <span className="text-rose-500 font-bold">{healthMetrics.expired}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-[var(--text-2)] border-t border-[var(--border-color)]/50 pt-1 mt-1">
                  <span>Est. Value:</span>
                  <span className="text-[var(--accent-gold)] font-bold">{format(healthMetrics.totalValue)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 text-xs text-[var(--text-2)] bg-[var(--bg-2)]/60 p-3 rounded-2xl border border-[var(--border-color)]/20 leading-relaxed">
            {healthMetrics.expired > 0 ? (
              <span className="text-rose-500 font-semibold flex items-start gap-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> 
                pantry contains {healthMetrics.expired} expired item(s). Click items to manage.
              </span>
            ) : healthMetrics.expiringSoon > 0 ? (
              <span className="text-orange-500 font-semibold flex items-start gap-1">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Ingredients need attention. Sauté spinach or eggs tonight to limit waste.
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-500 font-semibold flex items-center gap-1">
                <Check className="h-3.5 w-3.5 shrink-0" />
                All assets in perfect storage state. Excellent organization!
              </span>
            )}
          </div>
        </div>

        {/* Widget: AI Chef Match Card */}
        {bestRecipe && (
          <div className="bg-gradient-to-br from-[#1E1A15] to-[#0F0D0B] text-[#FAF7F2] border border-[#2E2720] rounded-3xl p-6 shadow-elegant flex flex-col justify-between min-h-[280px] relative overflow-hidden transition-editorial">
            {/* Soft terracotta glow inside dark card */}
            <div className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full bg-primary/15 blur-2xl pointer-events-none" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#2E2720] pb-3">
                <span className="text-[10px] font-bold text-[var(--accent-gold)] uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--accent-gold)]" /> AI Cook Combination
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/40">
                  Combos Active
                </span>
              </div>

              <div>
                <span className="text-[9px] uppercase tracking-wider font-semibold text-[#C7BDAE]">Suggested Recipe</span>
                <h4 className="font-fraunces text-xl font-normal text-[#F8F5EE] mt-0.5 leading-snug">
                  {bestRecipe.title}
                </h4>
                
                {/* List matching ingredients */}
                <div className="mt-3.5 space-y-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-[#C7BDAE] block">Ingredients Available</span>
                  <div className="flex flex-wrap gap-1.5">
                    {pantry.filter(isRecommendedItem).map(item => (
                      <span 
                        key={item.id} 
                        className="text-[9.5px] font-semibold bg-white/5 border border-white/10 hover:border-primary/50 text-[#FAF7F2] px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <span className="h-1 w-1 rounded-full bg-emerald-400" />
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Link 
              to="/recipes" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl py-3 text-center text-xs shadow-lg shadow-primary/20 transition-all block mt-5 hover:-translate-y-0.5"
            >
              Start Cooking Tonight
            </Link>
          </div>
        )}
      </div>

      {/* 2. RIGHT BENTO CONTAINER (Category boxes of ingredient cards) */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {/* Render each of the 5 visual shelves inside a unified bento package */}
        {(Object.keys(categoriesData) as Array<keyof typeof categoriesData>).map((categoryName) => {
          const items = categoriesData[categoryName];
          
          // Get specific color schemes and badges for each category title
          const getCategoryBadge = () => {
            switch(categoryName) {
              case "Produce":
                return { badge: "🥬 Produce", border: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-500" };
              case "Dairy":
                return { badge: "🧀 Dairy & Eggs", border: "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-500" };
              case "Proteins":
                return { badge: "🥩 Proteins", border: "border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-500" };
              case "Grains":
                return { badge: "🌾 Grains & Flours", border: "border-amber-700/20 bg-amber-700/5 text-amber-700 dark:text-amber-600" };
              default:
                return { badge: "🌶️ Spices, Oils & Condiments", border: "border-orange-500/20 bg-orange-500/5 text-orange-600 dark:text-orange-500" };
            }
          };

          const meta = getCategoryBadge();

          return (
            <div 
              key={categoryName}
              className="bg-card border border-[var(--border-color)] rounded-3xl p-5 shadow-elegant space-y-4 transition-editorial"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between border-b border-[var(--border-color)]/60 pb-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${meta.border}`}>
                  {meta.badge}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {items.length} {items.length === 1 ? "item" : "items"} in stock
                </span>
              </div>

              {/* Ingredient Spotify-Style Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.length === 0 ? (
                  <div className="sm:col-span-2 border border-dashed border-[var(--border-color)] rounded-2xl p-6 text-center text-xs text-muted-foreground italic flex flex-col items-center justify-center gap-2">
                    No items stocked. Click "Pantry" tab above to replenish.
                  </div>
                ) : (
                  items.map((item) => {
                    const statusMeta = getFreshnessMeta(item.expiresAt);
                    const percent = getFreshnessPercent(item.expiresAt);
                    const isMatched = isRecommendedItem(item);

                    return (
                      <div
                        key={item.id}
                        onClick={() => setClickedItem(item)}
                        className="group bg-[var(--bg)] hover:bg-[var(--bg-2)] border border-[var(--border-color)] p-3 rounded-2xl flex items-center justify-between gap-3.5 transition-all duration-300 hover:shadow-md cursor-pointer hover:border-primary/30 relative overflow-hidden"
                      >
                        {/* Sparkles AI Badge */}
                        {isMatched && (
                          <span className="absolute top-1.5 right-1.5 text-[8.5px] font-bold bg-[var(--accent-gold)]/12 text-[var(--accent-gold)] border border-[var(--accent-gold)]/30 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 z-10 animate-fade-up">
                            <Sparkles className="h-2 w-2" /> Match
                          </span>
                        )}

                        {/* Left: Illustration Container */}
                        <div className="relative w-14 h-14 bg-card rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-[var(--border-color)] transition-all group-hover:scale-105">
                          {getIngredientSVG(item.name)}
                        </div>

                        {/* Middle: Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <h5 className="font-fraunces text-[14px] font-bold text-[var(--text-1)] truncate group-hover:text-primary transition-colors pr-8">
                            {item.name}
                          </h5>
                          
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                            <span>{item.quantity} {item.unit}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${statusMeta.color}`}>
                              {statusMeta.text}
                            </span>
                          </div>

                          {/* Freshness Bar */}
                          <div className="h-1.2 w-full bg-[var(--bg-2)] rounded-full overflow-hidden mt-1.5">
                            <div 
                              className={`h-full ${statusMeta.bar} transition-all duration-500`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Click Item Detailed Dialog Modal */}
      <Dialog open={clickedItem !== null} onOpenChange={(open) => !open && setClickedItem(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl border border-[var(--border-color)] bg-card shadow-elegant p-6 font-figtree">
          {clickedItem && (() => {
            const status = expiryStatus(clickedItem.expiresAt);
            const daysLeft = daysUntil(clickedItem.expiresAt);
            const isRecommended = isRecommendedItem(clickedItem);
            const capacity = getFreshnessPercent(clickedItem.expiresAt);
            const statusMeta = getFreshnessMeta(clickedItem.expiresAt);

            return (
              <div className="space-y-6">
                <DialogHeader className="flex flex-col gap-1 border-b border-[var(--border-color)]/60 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-[var(--bg-2)] px-2.5 py-0.5 rounded-full">
                      {clickedItem.category}
                    </span>
                    <span className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${statusMeta.color}`}>
                      {statusMeta.text}
                    </span>
                  </div>
                  <DialogTitle className="font-fraunces text-3xl font-normal leading-tight text-[var(--text-1)] mt-2">
                    {clickedItem.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Freshness tracking details & waste predictions
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Visual canister details */}
                  <div className="flex gap-4 items-center bg-[var(--bg-2)]/40 border border-[var(--border-color)]/40 rounded-2xl p-4">
                    <div className="h-16 w-16 shrink-0 bg-card rounded-2xl border border-[var(--border-color)] flex items-center justify-center relative overflow-hidden shadow-sm">
                      {getIngredientSVG(clickedItem.name)}
                    </div>

                    <div className="space-y-1.5 flex-1 text-xs">
                      <div className="flex justify-between border-b border-[var(--border-color)]/40 pb-1">
                        <span className="text-muted-foreground font-semibold">Stock Quantity:</span>
                        <span className="font-bold text-[var(--text-1)]">{clickedItem.quantity} {clickedItem.unit}</span>
                      </div>
                      <div className="flex justify-between border-b border-[var(--border-color)]/40 pb-1">
                        <span className="text-muted-foreground font-semibold">Purchased On:</span>
                        <span className="font-bold text-[var(--text-1)]">
                          {clickedItem.addedAt ? new Date(clickedItem.addedAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "Seed Demo Date"}
                        </span>
                      </div>
                      {clickedItem.pricePaid && (
                        <div className="flex justify-between border-b border-[var(--border-color)]/40 pb-1">
                          <span className="text-muted-foreground font-semibold">Price Paid:</span>
                          <span className="font-bold text-[var(--accent-gold)] flex items-center"><Coins className="h-3 w-3 mr-0.5" />{format(clickedItem.pricePaid)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expiration warnings */}
                  <div className={`p-4 rounded-2xl border flex gap-3.5 ${
                    status === "urgent" || status === "expired"
                      ? "bg-rose-500/8 border-rose-500/15 text-rose-600 dark:text-rose-400"
                      : "bg-emerald-500/8 border-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {status === "urgent" || status === "expired" ? (
                      <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-rose-500" />
                    ) : (
                      <Check className="h-5 w-5 shrink-0 mt-0.5 text-emerald-500" />
                    )}
                    <div className="space-y-0.5 text-xs">
                      <h4 className="font-bold uppercase tracking-wider text-[var(--text-1)]">
                        {status === "urgent" ? "Attention Needed" : status === "expired" ? "Expired Asset" : "Stable Storage"}
                      </h4>
                      <p className="text-[var(--text-2)] leading-relaxed mt-0.5">
                        {status === "urgent" ? `This item expires in ${daysLeft} days. We recommend preparing tonight.` :
                         status === "expired" ? "Expired. Remove from your digital pantry list to clear space." :
                         `You have ${daysLeft} days remaining before expiration risks rise. Store in visual reach.`}
                      </p>
                    </div>
                  </div>

                  {/* Recipe connections inside dialog */}
                  {isRecommended && bestRecipe && (
                    <div className="bg-[var(--accent-gold)]/8 border border-[var(--accent-gold)]/15 rounded-2xl p-4 space-y-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-4.5 w-4.5 text-[var(--accent-gold)]" />
                        <h4 className="font-bold text-[var(--accent-gold)] uppercase tracking-wider">Chef Suggestion Match</h4>
                      </div>
                      <p className="text-[var(--text-2)] leading-relaxed">
                        Matches your <span className="font-semibold text-[var(--text-1)]">{bestRecipe.title}</span> cookbook recommendation. Sauté it tonight alongside companion items.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
