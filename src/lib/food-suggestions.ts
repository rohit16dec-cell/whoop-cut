import type { DietType } from "@/lib/diet.functions";

// Curated ingredient list grouped by category. `veg: true` means suitable for
// vegetarians. `egg: true` marks egg-based items (allowed for eggetarians).
export type FoodSuggestion = {
  name: string;
  category: string;
  veg: boolean;
  egg?: boolean;
};

export const FOOD_SUGGESTIONS: FoodSuggestion[] = [
  // Grains & carbs
  { name: "Rice", category: "Grains", veg: true },
  { name: "Brown rice", category: "Grains", veg: true },
  { name: "Roti", category: "Grains", veg: true },
  { name: "Oats", category: "Grains", veg: true },
  { name: "Quinoa", category: "Grains", veg: true },
  { name: "Bread", category: "Grains", veg: true },
  { name: "Pasta", category: "Grains", veg: true },
  { name: "Poha", category: "Grains", veg: true },

  // Legumes & pulses
  { name: "Dal (lentils)", category: "Legumes", veg: true },
  { name: "Chickpeas", category: "Legumes", veg: true },
  { name: "Rajma", category: "Legumes", veg: true },
  { name: "Black beans", category: "Legumes", veg: true },
  { name: "Moong", category: "Legumes", veg: true },
  { name: "Tofu", category: "Legumes", veg: true },
  { name: "Soy chunks", category: "Legumes", veg: true },

  // Dairy
  { name: "Paneer", category: "Dairy", veg: true },
  { name: "Milk", category: "Dairy", veg: true },
  { name: "Curd / Yogurt", category: "Dairy", veg: true },
  { name: "Greek yogurt", category: "Dairy", veg: true },
  { name: "Cheese", category: "Dairy", veg: true },
  { name: "Whey protein", category: "Dairy", veg: true },

  // Vegetables
  { name: "Spinach", category: "Vegetables", veg: true },
  { name: "Broccoli", category: "Vegetables", veg: true },
  { name: "Cauliflower", category: "Vegetables", veg: true },
  { name: "Potato", category: "Vegetables", veg: true },
  { name: "Sweet potato", category: "Vegetables", veg: true },
  { name: "Tomato", category: "Vegetables", veg: true },
  { name: "Bell pepper", category: "Vegetables", veg: true },
  { name: "Carrot", category: "Vegetables", veg: true },
  { name: "Mushroom", category: "Vegetables", veg: true },

  // Fruits
  { name: "Banana", category: "Fruits", veg: true },
  { name: "Apple", category: "Fruits", veg: true },
  { name: "Berries", category: "Fruits", veg: true },
  { name: "Orange", category: "Fruits", veg: true },
  { name: "Mango", category: "Fruits", veg: true },

  // Nuts & seeds
  { name: "Almonds", category: "Nuts & Seeds", veg: true },
  { name: "Peanuts", category: "Nuts & Seeds", veg: true },
  { name: "Walnuts", category: "Nuts & Seeds", veg: true },
  { name: "Chia seeds", category: "Nuts & Seeds", veg: true },
  { name: "Flax seeds", category: "Nuts & Seeds", veg: true },
  { name: "Peanut butter", category: "Nuts & Seeds", veg: true },

  // Eggs
  { name: "Eggs (whole)", category: "Eggs", veg: false, egg: true },
  { name: "Egg whites", category: "Eggs", veg: false, egg: true },

  // Poultry
  { name: "Chicken breast", category: "Poultry", veg: false },
  { name: "Chicken thigh", category: "Poultry", veg: false },
  { name: "Turkey", category: "Poultry", veg: false },

  // Red meat
  { name: "Mutton", category: "Red Meat", veg: false },
  { name: "Beef", category: "Red Meat", veg: false },
  { name: "Pork", category: "Red Meat", veg: false },
  { name: "Lamb", category: "Red Meat", veg: false },
  { name: "Bacon", category: "Red Meat", veg: false },

  // Seafood
  { name: "Salmon", category: "Seafood", veg: false },
  { name: "Tuna", category: "Seafood", veg: false },
  { name: "Fish (white)", category: "Seafood", veg: false },
  { name: "Prawns", category: "Seafood", veg: false },
  { name: "Crab", category: "Seafood", veg: false },
];

export function filterByDiet(diet: DietType): FoodSuggestion[] {
  if (diet === "non-vegetarian") return FOOD_SUGGESTIONS;
  if (diet === "eggetarian")
    return FOOD_SUGGESTIONS.filter((f) => f.veg || f.egg);
  return FOOD_SUGGESTIONS.filter((f) => f.veg);
}
