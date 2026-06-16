"""Run with: python manage.py shell < seed.py"""
from api.models import Recipe

Recipe.objects.all().delete()

recipes = [
    {"title": "Tuscan Chicken with Wilted Spinach", "cuisine": "Italian", "minutes": 30,
     "difficulty": "Easy", "tags": ["high-protein", "gluten-free"],
     "ingredients": ["chicken breast", "spinach", "garlic", "lemons", "olive oil", "parmesan"],
     "steps": ["Sear chicken.", "Add garlic + lemon.", "Wilt spinach, top with parmesan."],
     "rating": 4.7},
    {"title": "Garlic Tomato Rice Bowl", "cuisine": "Mediterranean", "minutes": 25,
     "difficulty": "Easy", "tags": ["vegetarian"],
     "ingredients": ["tomatoes", "basmati rice", "garlic", "olive oil"],
     "steps": ["Toast garlic.", "Simmer tomatoes.", "Fold in rice."],
     "rating": 4.4},
    {"title": "Lemon Yogurt Egg Pancakes", "cuisine": "Brunch", "minutes": 15,
     "difficulty": "Easy", "tags": ["breakfast", "vegetarian"],
     "ingredients": ["eggs", "greek yogurt", "lemons"],
     "steps": ["Whisk all.", "Cook small pancakes.", "Drizzle honey."],
     "rating": 4.6},
]

for r in recipes:
    Recipe.objects.create(**r)

print(f"Seeded {Recipe.objects.count()} recipes")
