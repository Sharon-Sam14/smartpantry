import type { PantryItem, Recipe, Expense } from "@/lib/types";

const today = new Date();
const days = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

export const seedPantry: PantryItem[] = [
  { id: "p1", name: "Tomatoes", category: "Produce", quantity: 6, unit: "pcs", expiresAt: days(2), addedAt: days(-3), pricePaid: 2.4 },
  { id: "p2", name: "Spinach", category: "Produce", quantity: 1, unit: "bunch", expiresAt: days(1), addedAt: days(-2), pricePaid: 1.8 },
  { id: "p3", name: "Chicken breast", category: "Protein", quantity: 500, unit: "g", expiresAt: days(3), addedAt: days(-1), pricePaid: 6.5 },
  { id: "p4", name: "Greek yogurt", category: "Dairy", quantity: 500, unit: "g", expiresAt: days(5), addedAt: days(-4), pricePaid: 3.2 },
  { id: "p5", name: "Basmati rice", category: "Pantry", quantity: 1, unit: "kg", expiresAt: days(180), addedAt: days(-30), pricePaid: 4.0 },
  { id: "p6", name: "Eggs", category: "Dairy", quantity: 8, unit: "pcs", expiresAt: days(7), addedAt: days(-2), pricePaid: 3.5 },
  { id: "p7", name: "Garlic", category: "Produce", quantity: 1, unit: "bulb", expiresAt: days(14), addedAt: days(-5), pricePaid: 0.6 },
  { id: "p8", name: "Olive oil", category: "Pantry", quantity: 500, unit: "ml", expiresAt: days(300), addedAt: days(-60), pricePaid: 9.0 },
  { id: "p9", name: "Lemons", category: "Produce", quantity: 4, unit: "pcs", expiresAt: days(6), addedAt: days(-3), pricePaid: 1.6 },
  { id: "p10", name: "Parmesan", category: "Dairy", quantity: 150, unit: "g", expiresAt: days(20), addedAt: days(-7), pricePaid: 5.5 },
];

export const seedRecipes: Recipe[] = [
  {
    id: "r1",
    title: "Tuscan Chicken with Wilted Spinach",
    cuisine: "Italian",
    minutes: 30,
    difficulty: "Easy",
    tags: ["high-protein", "gluten-free"],
    ingredients: ["chicken breast", "spinach", "garlic", "lemons", "olive oil", "parmesan"],
    steps: [
      "Sear seasoned chicken in olive oil until golden.",
      "Add minced garlic and a squeeze of lemon.",
      "Wilt spinach in the same pan and shave parmesan on top.",
    ],
    rating: 4.7,
  },
  {
    id: "r2",
    title: "Garlic Tomato Rice Bowl",
    cuisine: "Mediterranean",
    minutes: 25,
    difficulty: "Easy",
    tags: ["vegetarian"],
    ingredients: ["tomatoes", "basmati rice", "garlic", "olive oil"],
    steps: [
      "Toast garlic in olive oil until fragrant.",
      "Add diced tomatoes and simmer 8 minutes.",
      "Fold in cooked rice and finish with herbs.",
    ],
    rating: 4.4,
  },
  {
    id: "r3",
    title: "Lemon Yogurt Egg Pancakes",
    cuisine: "Brunch",
    minutes: 15,
    difficulty: "Easy",
    tags: ["breakfast", "vegetarian"],
    ingredients: ["eggs", "greek yogurt", "lemons"],
    steps: [
      "Whisk eggs, yogurt and lemon zest.",
      "Cook small pancakes in a hot non-stick pan.",
      "Serve with a drizzle of honey.",
    ],
    rating: 4.6,
  },
  {
    id: "r4",
    title: "Spinach & Parmesan Frittata",
    cuisine: "Italian",
    minutes: 20,
    difficulty: "Easy",
    tags: ["vegetarian", "high-protein"],
    ingredients: ["eggs", "spinach", "parmesan", "olive oil"],
    steps: [
      "Sauté spinach in olive oil.",
      "Pour beaten eggs over, top with parmesan.",
      "Finish under the grill for 4 minutes.",
    ],
    rating: 4.5,
  },
  {
    id: "r5",
    title: "Lemon Chicken & Rice Skillet",
    cuisine: "Greek",
    minutes: 40,
    difficulty: "Medium",
    tags: ["high-protein", "one-pan"],
    ingredients: ["chicken breast", "basmati rice", "lemons", "garlic", "olive oil"],
    steps: [
      "Brown chicken, set aside.",
      "Toast rice with garlic, deglaze with lemon juice and stock.",
      "Nest chicken back in and cover until rice is tender.",
    ],
    rating: 4.8,
  },
  {
    id: "r6",
    title: "Tomato Yogurt Curry",
    cuisine: "Indian",
    minutes: 35,
    difficulty: "Medium",
    tags: ["vegetarian"],
    ingredients: ["tomatoes", "greek yogurt", "garlic", "basmati rice", "olive oil"],
    steps: [
      "Bloom spices in oil with garlic.",
      "Add tomatoes; simmer until jammy.",
      "Stir in yogurt off the heat. Serve over rice.",
    ],
    rating: 4.3,
  },
  {
    id: "r7",
    title: "Coconut Chickpea Curry",
    cuisine: "Indian",
    minutes: 20,
    difficulty: "Easy",
    tags: ["vegan", "vegetarian", "gluten-free"],
    ingredients: ["chickpeas", "spinach", "garlic", "olive oil", "tomatoes"],
    steps: [
      "Sauté minced garlic in olive oil in a deep pot.",
      "Add diced tomatoes and pre-cooked chickpeas.",
      "Simmer for 10 minutes, stir in spinach until wilted, and serve hot."
    ],
    rating: 4.6,
  },
  {
    id: "r8",
    title: "Keto Garlic Butter Salmon",
    cuisine: "Mediterranean",
    minutes: 15,
    difficulty: "Easy",
    tags: ["keto", "low-carb", "pescatarian", "high-protein"],
    ingredients: ["salmon", "garlic", "butter", "lemons"],
    steps: [
      "Melt butter in a pan and sear salmon fillets on both sides.",
      "Add minced garlic and squeeze lemon juice over the top.",
      "Baste salmon with the garlic butter sauce until cooked through."
    ],
    rating: 4.9,
  },
  {
    id: "r9",
    title: "Avocado Tomato Flatbread",
    cuisine: "Mediterranean",
    minutes: 10,
    difficulty: "Easy",
    tags: ["vegan", "vegetarian"],
    ingredients: ["tomatoes", "avocado", "garlic", "olive oil"],
    steps: [
      "Toast flatbread in a pan or oven until crispy.",
      "Mash avocado with lemon juice and spread over the flatbread.",
      "Top with sliced tomatoes, minced garlic, and a drizzle of olive oil."
    ],
    rating: 4.5,
  },
  {
    id: "r10",
    title: "Roasted Sweet Potato Tacos",
    cuisine: "Mexican",
    minutes: 30,
    difficulty: "Medium",
    tags: ["vegetarian", "gluten-free"],
    ingredients: ["sweet potatoes", "avocado", "lime", "spinach"],
    steps: [
      "Toss cubed sweet potatoes in oil and roast at 400°F (200°C) for 20 minutes.",
      "Warm corn tortillas in a skillet.",
      "Fill tortillas with sweet potatoes, spinach, and sliced avocado with lime juice."
    ],
    rating: 4.7,
  },
  {
    id: "r11",
    title: "Lemon Herb Baked Cod",
    cuisine: "Mediterranean",
    minutes: 20,
    difficulty: "Easy",
    tags: ["pescatarian", "high-protein", "low-carb"],
    ingredients: ["cod", "lemons", "garlic", "olive oil"],
    steps: [
      "Place cod fillets in a baking dish and brush with olive oil.",
      "Top with minced garlic and thin lemon slices.",
      "Bake at 375°F (190°C) for 15 minutes until fish flakes easily."
    ],
    rating: 4.4,
  },
  {
    id: "r12",
    title: "Keto Garlic Butter Mushrooms",
    cuisine: "French",
    minutes: 12,
    difficulty: "Easy",
    tags: ["keto", "low-carb", "vegetarian"],
    ingredients: ["mushrooms", "garlic", "butter"],
    steps: [
      "Clean mushrooms and slice them in halves.",
      "Melt butter in a skillet and cook mushrooms until golden.",
      "Add minced garlic, stir for 2 minutes, and season to taste."
    ],
    rating: 4.8,
  },
  {
    id: "r13",
    title: "Chicken Lettuce Wraps",
    cuisine: "Asian",
    minutes: 18,
    difficulty: "Easy",
    tags: ["keto", "low-carb", "high-protein"],
    ingredients: ["chicken breast", "garlic", "lettuce", "spring onions"],
    steps: [
      "Sauté minced chicken and garlic in a hot skillet.",
      "Stir in chopped spring onions and seasoning.",
      "Spoon the chicken mixture into crisp lettuce cups and serve."
    ],
    rating: 4.7,
  },
  {
    id: "r14",
    title: "Chia Seed Berry Pudding",
    cuisine: "Brunch",
    minutes: 5,
    difficulty: "Easy",
    tags: ["vegan", "vegetarian", "breakfast"],
    ingredients: ["chia seeds", "greek yogurt", "berries"],
    steps: [
      "Stir chia seeds into Greek yogurt (or plant-based milk).",
      "Let sit in the fridge for 2 hours or overnight to thicken.",
      "Top with fresh berries and serve."
    ],
    rating: 4.3,
  },
];

export const seedExpenses: Expense[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `e${i}`,
  weekOffset: -11 + i,
  amount: 60 + Math.round(Math.sin(i / 1.6) * 14 + i * 1.2 + Math.random() * 6),
  category: "Groceries",
}));
