export type PantryItem = {
  id: string;
  name: string;
  category: "Produce" | "Protein" | "Dairy" | "Pantry" | "Frozen" | "Other";
  quantity: number;
  unit: string;
  expiresAt: string; // ISO
  addedAt: string;
  pricePaid?: number;
};

export type Recipe = {
  id: string;
  title: string;
  cuisine: string;
  minutes: number;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  ingredients: string[];
  steps: string[];
  rating: number; // base community rating 0-5
};

export type Expense = {
  id: string;
  weekOffset: number; // negative = past
  amount: number;
  category: string;
};

export type Preferences = {
  diet: "any" | "vegetarian" | "vegan" | "pescatarian";
  cuisines: string[];
  dislikes: string[];
};

export type ShoppingItem = {
  id: string;
  name: string;
  category: "Produce" | "Protein" | "Dairy" | "Pantry" | "Frozen" | "Other";
  quantity: number;
  unit: string;
  checked: boolean;
};
