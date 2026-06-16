/**
 * API client for the Django backend.
 *
 * 1. Run the Django server (see smartpantry-backend/README.md)
 * 2. Set the URL below to match where your Django server runs
 *    (default: http://127.0.0.1:8000)
 */

export const API_BASE = "http://127.0.0.1:8000/api";




const TOKEN_KEY = "smartpantry_jwt";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ===== Auth =====
export const api = {
  register: (email: string, password: string) =>
    request<{ access: string; refresh: string; user: { id: number; email: string } }>(
      "/auth/register/",
      { method: "POST", body: JSON.stringify({ email, password }) },
    ),

  login: (email: string, password: string) =>
    request<{ access: string; refresh: string; user: { id: number; email: string } }>(
      "/auth/login/",
      { method: "POST", body: JSON.stringify({ email, password }) },
    ),

  logout: () =>
    request<void>(
      "/auth/logout/",
      { method: "POST" },
    ),

  // ===== Pantry =====
  listPantry: () => request<any[]>("/pantry/"),
  addPantry: (item: {
    name: string; category: string; quantity: number; unit: string;
    expires_at: string; price_paid?: number;
  }) => request<any>("/pantry/", { method: "POST", body: JSON.stringify(item) }),
  deletePantry: (id: number) => request<void>(`/pantry/${id}/`, { method: "DELETE" }),

  // ===== Recipes =====
  listRecipes: () => request<any[]>("/recipes/"),
  addRecipe: (r: {
    title: string; cuisine?: string; minutes?: number; difficulty?: string;
    tags?: string[]; ingredients?: string[]; steps?: string[]; rating?: number;
  }) => request<any>("/recipes/", { method: "POST", body: JSON.stringify(r) }),
  deleteRecipe: (id: number) => request<void>(`/recipes/${id}/`, { method: "DELETE" }),

  // ===== Expenses =====
  listExpenses: () => request<any[]>("/expenses/"),
  addExpense: (e: { week_offset: number; amount: number; category?: string }) =>
    request<any>("/expenses/", { method: "POST", body: JSON.stringify(e) }),

  // ===== Preferences =====
  getPreferences: () => request<{ diet: string; cuisines: string[]; dislikes: string[] }>("/preferences/"),
  updatePreferences: (p: { diet?: string; cuisines?: string[]; dislikes?: string[] }) =>
    request<any>("/preferences/", { method: "PUT", body: JSON.stringify(p) }),

  // ===== Recipe Discovery (recipe-api.com proxy — key stays server-side) =====
  discoverRecipes: (params: {
    q?: string;
    cuisine?: string;
    dietary?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([k, v]) => [k, String(v)])
      )
    ).toString();
    return request<{
      data: Array<{
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
        ingredients: Array<{ group_name: string; items: Array<{ name: string; quantity: number; unit: string; preparation?: string }> }>;
        instructions: Array<{ step_number: number; phase: string; text: string }>;
      }>;
      total?: number;
    }>(`/discover/recipes/${qs ? "?" + qs : ""}`);
  },

  enrichRecipe: (recipeId: string) =>
    request<any>(`/discover/recipes/${recipeId}/`),
};

/** Quick health check — useful for showing "Backend offline" state in UI */
export async function pingBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/pantry/`);
    return res.status !== 500;
  } catch {
    return false;
  }
}