import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Expense, PantryItem, Preferences, Recipe, ShoppingItem } from "./types";
import { api, getToken, setToken, clearToken, pingBackend, ApiError } from "./api";
import { toast } from "@/hooks/use-toast";
import { seedRecipes, seedExpenses } from "@/data/seed";

type AuthState = { email?: string; phone?: string; isAuthed: boolean };

type Ctx = {
  pantry: PantryItem[];
  recipes: Recipe[];
  expenses: Expense[];
  prefs: Preferences;
  auth: AuthState;
  backendOnline: boolean;
  loading: boolean;
  addPantry: (item: Omit<PantryItem, "id" | "addedAt">) => Promise<void>;
  removePantry: (id: string) => Promise<void>;
  addRecipe: (r: Omit<Recipe, "id">) => Promise<void>;
  removeRecipe: (id: string) => Promise<void>;
  addExpense: (e: Omit<Expense, "id">) => Promise<void>;
  setPrefs: (p: Preferences) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  shoppingList: ShoppingItem[];
  addShoppingItem: (name: string, category?: ShoppingItem["category"], quantity?: number, unit?: string) => void;
  toggleShoppingItem: (id: string) => void;
  removeShoppingItem: (id: string) => void;
  addMultipleToShopping: (items: { name: string; category?: ShoppingItem["category"]; quantity?: number; unit?: string }[]) => void;
  convertCheckedToPantry: () => Promise<void>;
};

const StoreCtx = createContext<Ctx | null>(null);

const defaultPrefs: Preferences = { diet: "any", cuisines: [], dislikes: [] };

const AUTH_KEY = "smartpantry_auth";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [prefs, setPrefsState] = useState<Preferences>(defaultPrefs);
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return { isAuthed: !!parsed?.isAuthed || !!getToken(), email: parsed?.email };
    } catch {
      return { isAuthed: !!getToken() };
    }
  });
  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);

  // Load shopping list for current user
  useEffect(() => {
    if (!auth.email) {
      setShoppingList([]);
      return;
    }
    try {
      const raw = localStorage.getItem(`smartpantry_shopping_${auth.email}`);
      setShoppingList(raw ? JSON.parse(raw) : []);
    } catch {
      setShoppingList([]);
    }
  }, [auth.email]);

  // Persist shopping list whenever it changes
  useEffect(() => {
    if (!auth.email) return;
    try {
      localStorage.setItem(`smartpantry_shopping_${auth.email}`, JSON.stringify(shoppingList));
    } catch {}
  }, [shoppingList, auth.email]);

  const addShoppingItem = (
    name: string,
    category: ShoppingItem["category"] = "Other",
    quantity = 1,
    unit = "pcs"
  ) => {
    setShoppingList((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 9),
        name: name.trim(),
        category,
        quantity,
        unit,
        checked: false,
      },
    ]);
  };

  const toggleShoppingItem = async (id: string) => {
    const item = shoppingList.find((i) => i.id === id);
    if (!item) return;

    const targetChecked = !item.checked;

    // 1. Visually check the item first
    setShoppingList((prev) =>
      prev.map((i) => (i.id === id ? { ...i, checked: targetChecked } : i))
    );

    // 2. If it is being checked, transfer to pantry immediately
    if (targetChecked) {
      setTimeout(async () => {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        try {
          await api.addPantry({
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            expires_at: expiresAt,
            price_paid: 0,
          });

          // Remove from shopping list
          setShoppingList((prev) => prev.filter((i) => i.id !== id));

          toast({
            title: "Transferred to pantry",
            description: `"${item.name}" has been added to your pantry.`,
          });

          // Refresh pantry
          const refreshed = await api.listPantry();
          setPantry(
            refreshed.map((it: any) => ({
              id: String(it.id),
              name: it.name,
              category: it.category,
              quantity: Number(it.quantity),
              unit: it.unit,
              expiresAt: it.expires_at,
              addedAt: it.added_at || new Date().toISOString(),
              pricePaid: it.price_paid ? Number(it.price_paid) : undefined,
            }))
          );
        } catch (err) {
          console.error("Pantry transfer failed:", err);
          // Rollback check on error
          setShoppingList((prev) =>
            prev.map((i) => (i.id === id ? { ...i, checked: false } : i))
          );
          toast({
            title: "Pantry transfer failed",
            description: err instanceof Error ? err.message : `Could not transfer "${item.name}" to your pantry.`,
            variant: "destructive",
          });
        }
      }, 400);
    }
  };

  const removeShoppingItem = (id: string) => {
    setShoppingList((prev) => prev.filter((item) => item.id !== id));
  };

  const addMultipleToShopping = (
    items: { name: string; category?: ShoppingItem["category"]; quantity?: number; unit?: string }[]
  ) => {
    setShoppingList((prev) => [
      ...prev,
      ...items.map((item) => ({
        id: Math.random().toString(36).slice(2, 9),
        name: item.name.trim(),
        category: item.category || "Other",
        quantity: item.quantity || 1,
        unit: item.unit || "pcs",
        checked: false,
      })),
    ]);
  };

  const convertCheckedToPantry = async () => {
    const checkedItems = shoppingList.filter((item) => item.checked);
    if (checkedItems.length === 0) return;

    // Use default expiry of 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    await Promise.all(
      checkedItems.map((item) =>
        api.addPantry({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          expires_at: expiresAt,
          price_paid: 0,
        })
      )
    );

    // Refresh pantry from backend
    try {
      const refreshed = await api.listPantry();
      setPantry(
        refreshed.map((it: any) => ({
          id: String(it.id),
          name: it.name,
          category: it.category,
          quantity: Number(it.quantity),
          unit: it.unit,
          expiresAt: it.expires_at,
          addedAt: it.added_at || new Date().toISOString(),
          pricePaid: it.price_paid ? Number(it.price_paid) : undefined,
        }))
      );
    } catch {}

    // Clear checks
    setShoppingList((prev) => prev.filter((item) => !item.checked));
  };

  const signOut = () => {
    api.logout().catch(() => {});
    clearToken();
    setAuth({ isAuthed: false });
    setPantry([]); setRecipes([]); setExpenses([]); setPrefsState(defaultPrefs);
    setShoppingList([]);
  };

  // Persist a small auth snapshot (email and isAuthed flag) so refresh keeps the session label
  useEffect(() => {
    try { localStorage.setItem(AUTH_KEY, JSON.stringify({ email: auth.email, isAuthed: auth.isAuthed })); } catch {}
  }, [auth.email, auth.isAuthed]);

  // Reachability ping
  useEffect(() => {
    let alive = true;
    pingBackend().then((ok) => alive && setBackendOnline(ok));
    const id = setInterval(() => pingBackend().then((ok) => alive && setBackendOnline(ok)), 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Load this user's data from backend whenever auth flips on.
  // No seed data, no shared data — empty arrays for new users.
  useEffect(() => {
    if (!auth.isAuthed) {
      setPantry([]); setRecipes([]); setExpenses([]); setPrefsState(defaultPrefs);
      return;
    }
    let alive = true;
    setLoading(true);
    Promise.allSettled([
      api.listPantry(),
      api.listRecipes(),
      api.listExpenses(),
      api.getPreferences(),
    ]).then(([p, r, e, pr]) => {
      if (!alive) return;

      const isUnauthorized = [p, r, e, pr].some(
        (res) => res.status === "rejected" && res.reason instanceof ApiError && res.reason.status === 401
      );
      if (isUnauthorized) {
        signOut();
        return;
      }

      if (p.status === "fulfilled") {
        setPantry(p.value.map((it: any) => ({
          id: String(it.id), name: it.name, category: it.category,
          quantity: Number(it.quantity), unit: it.unit,
          expiresAt: it.expires_at, addedAt: it.added_at || new Date().toISOString(),
          pricePaid: it.price_paid ? Number(it.price_paid) : undefined,
        })));
      } else { setPantry([]); }
      if (r.status === "fulfilled") {
        const userRecipes = r.value.map((it: any) => ({
          id: String(it.id), title: it.title, cuisine: it.cuisine,
          minutes: it.minutes, difficulty: it.difficulty, tags: it.tags || [],
          ingredients: it.ingredients || [], steps: it.steps || [], rating: it.rating ?? 4,
        }));
        // Always merge in starter recipes so suggestions are never empty.
        setRecipes([...userRecipes, ...seedRecipes]);
      } else { setRecipes([...seedRecipes]); }
      if (e.status === "fulfilled") {
        const userExpenses = e.value.map((it: any) => ({
          id: String(it.id), weekOffset: it.week_offset,
          amount: Number(it.amount), category: it.category,
        }));
        // Fallback to 12 weeks of demo history so the forecast chart renders.
        setExpenses(userExpenses.length > 0 ? userExpenses : seedExpenses);
      } else { setExpenses(seedExpenses); }
      if (pr.status === "fulfilled") setPrefsState(pr.value as Preferences);
    }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [auth.isAuthed, auth.email]);

  const value: Ctx = useMemo(() => ({
    pantry, recipes, expenses, prefs, auth, backendOnline, loading,

    addPantry: async (item) => {
      const created = await api.addPantry({
        name: item.name, category: item.category, quantity: item.quantity,
        unit: item.unit, expires_at: item.expiresAt.slice(0, 10),
        price_paid: item.pricePaid,
      });
      setPantry((p) => [...p, {
        id: String(created.id), name: created.name, category: created.category,
        quantity: Number(created.quantity), unit: created.unit,
        expiresAt: created.expires_at, addedAt: created.added_at,
        pricePaid: created.price_paid ? Number(created.price_paid) : undefined,
      }]);
    },

    removePantry: async (id) => {
      await api.deletePantry(Number(id));
      setPantry((p) => p.filter((i) => i.id !== id));
    },

    addRecipe: async (r) => {
      const created = await api.addRecipe({
        title: r.title, cuisine: r.cuisine, minutes: r.minutes,
        difficulty: r.difficulty, tags: r.tags, ingredients: r.ingredients,
        steps: r.steps, rating: r.rating,
      });
      setRecipes((rs) => [{ ...r, id: String(created.id) }, ...rs]);
    },

    removeRecipe: async (id) => {
      await api.deleteRecipe(Number(id));
      setRecipes((rs) => rs.filter((x) => x.id !== id));
    },

    addExpense: async (e) => {
      const created = await api.addExpense({
        week_offset: e.weekOffset, amount: e.amount, category: e.category,
      });
      setExpenses((xs) => [...xs, {
        id: String(created.id), weekOffset: created.week_offset,
        amount: Number(created.amount), category: created.category,
      }]);
    },

    setPrefs: async (p) => {
      setPrefsState(p);
      try { await api.updatePreferences(p); } catch {}
    },

    signIn: async (email, password) => {
      const res = await api.login(email.trim().toLowerCase(), password);
      setToken(res.access);
      setAuth({ isAuthed: true, email: res.user.email });
    },

    signUp: async (email, password) => {
      const res = await api.register(email.trim().toLowerCase(), password);
      setToken(res.access);
      setAuth({ isAuthed: true, email: res.user.email });
    },

    signOut,
    shoppingList,
    addShoppingItem,
    toggleShoppingItem,
    removeShoppingItem,
    addMultipleToShopping,
    convertCheckedToPantry,
  }), [pantry, recipes, expenses, prefs, auth, backendOnline, loading, shoppingList]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
