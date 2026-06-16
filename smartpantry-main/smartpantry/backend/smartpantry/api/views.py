from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.conf import settings
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
import urllib.request
import urllib.parse
import json
import re

from .models import PantryItem, Recipe, Expense, Preferences
from .serializers import (
    PantryItemSerializer, RecipeSerializer, ExpenseSerializer, PreferencesSerializer,
)

RECIPE_API_BASE = "https://recipe-api.com/api/v1"
RECIPE_API_KEY = getattr(settings, "RECIPE_API_KEY", "")

# ============ NUTRITION ESTIMATION ENGINE ============
# USDA-based per-100g nutrient profiles for common ingredients.
# Keys match the nutrition.per_serving schema used by recipe-api.com.
_NUTRIENT_DB = {
    # ── Proteins ──────────────────────────────────────────────────
    "chicken": {"calories": 165, "protein_g": 31, "fat_g": 3.6, "carbohydrates_g": 0, "fiber_g": 0, "sugar_g": 0, "saturated_fat_g": 1.0, "sodium_mg": 74, "calcium_mg": 15, "iron_mg": 1.0, "potassium_mg": 256, "vitamin_c_mg": 0, "vitamin_a_mcg": 18},
    "salmon": {"calories": 208, "protein_g": 20, "fat_g": 13, "carbohydrates_g": 0, "fiber_g": 0, "sugar_g": 0, "saturated_fat_g": 3.1, "sodium_mg": 59, "calcium_mg": 12, "iron_mg": 0.8, "potassium_mg": 363, "vitamin_d_mcg": 11, "vitamin_b12_mcg": 3.2},
    "beef": {"calories": 250, "protein_g": 26, "fat_g": 15, "carbohydrates_g": 0, "fiber_g": 0, "sugar_g": 0, "saturated_fat_g": 6.0, "sodium_mg": 72, "calcium_mg": 18, "iron_mg": 2.6, "potassium_mg": 318, "zinc_mg": 5.3},
    "pork": {"calories": 242, "protein_g": 27, "fat_g": 14, "carbohydrates_g": 0, "fiber_g": 0, "sugar_g": 0, "saturated_fat_g": 5.0, "sodium_mg": 62, "calcium_mg": 20, "iron_mg": 1.1, "potassium_mg": 370},
    "shrimp": {"calories": 99, "protein_g": 24, "fat_g": 0.3, "carbohydrates_g": 0.2, "fiber_g": 0, "sugar_g": 0, "saturated_fat_g": 0.1, "sodium_mg": 111, "calcium_mg": 70, "iron_mg": 2.4, "potassium_mg": 259},
    "tuna": {"calories": 144, "protein_g": 30, "fat_g": 1.0, "carbohydrates_g": 0, "fiber_g": 0, "sugar_g": 0, "saturated_fat_g": 0.3, "sodium_mg": 50, "calcium_mg": 16, "iron_mg": 1.3, "potassium_mg": 444, "vitamin_d_mcg": 5.4},
    "egg": {"calories": 155, "protein_g": 13, "fat_g": 11, "carbohydrates_g": 1.1, "fiber_g": 0, "sugar_g": 1.1, "saturated_fat_g": 3.3, "sodium_mg": 124, "calcium_mg": 56, "iron_mg": 1.8, "potassium_mg": 138, "vitamin_a_mcg": 160, "vitamin_d_mcg": 2.0},
    "tofu": {"calories": 76, "protein_g": 8, "fat_g": 4.8, "carbohydrates_g": 1.9, "fiber_g": 0.3, "sugar_g": 0.6, "saturated_fat_g": 0.7, "sodium_mg": 7, "calcium_mg": 350, "iron_mg": 5.4, "potassium_mg": 121},
    "lentil": {"calories": 116, "protein_g": 9, "fat_g": 0.4, "carbohydrates_g": 20, "fiber_g": 7.9, "sugar_g": 1.8, "saturated_fat_g": 0.05, "sodium_mg": 2, "calcium_mg": 19, "iron_mg": 3.3, "potassium_mg": 369, "folate_mcg": 181},
    "bean": {"calories": 127, "protein_g": 8.7, "fat_g": 0.5, "carbohydrates_g": 23, "fiber_g": 6.4, "sugar_g": 0.3, "saturated_fat_g": 0.1, "sodium_mg": 2, "calcium_mg": 28, "iron_mg": 2.9, "potassium_mg": 405},
    # ── Dairy ─────────────────────────────────────────────────────
    "milk": {"calories": 61, "protein_g": 3.2, "fat_g": 3.3, "carbohydrates_g": 4.8, "fiber_g": 0, "sugar_g": 5.1, "saturated_fat_g": 2.1, "sodium_mg": 43, "calcium_mg": 113, "iron_mg": 0.1, "potassium_mg": 150, "vitamin_d_mcg": 1.0, "vitamin_b12_mcg": 0.4},
    "cheese": {"calories": 402, "protein_g": 25, "fat_g": 33, "carbohydrates_g": 1.3, "fiber_g": 0, "sugar_g": 0.5, "saturated_fat_g": 21, "sodium_mg": 621, "calcium_mg": 721, "potassium_mg": 98, "vitamin_a_mcg": 265, "vitamin_b12_mcg": 0.8},
    "butter": {"calories": 717, "protein_g": 0.9, "fat_g": 81, "carbohydrates_g": 0.1, "fiber_g": 0, "sugar_g": 0.1, "saturated_fat_g": 51, "sodium_mg": 576, "calcium_mg": 24, "vitamin_a_mcg": 684, "vitamin_d_mcg": 1.5},
    "cream": {"calories": 340, "protein_g": 2.1, "fat_g": 36, "carbohydrates_g": 2.8, "fiber_g": 0, "sugar_g": 2.8, "saturated_fat_g": 22, "sodium_mg": 38, "calcium_mg": 65},
    "yogurt": {"calories": 59, "protein_g": 3.5, "fat_g": 3.3, "carbohydrates_g": 4.7, "fiber_g": 0, "sugar_g": 4.7, "saturated_fat_g": 2.1, "sodium_mg": 46, "calcium_mg": 121, "potassium_mg": 155},
    # ── Vegetables ────────────────────────────────────────────────
    "tomato": {"calories": 18, "protein_g": 0.9, "fat_g": 0.2, "carbohydrates_g": 3.9, "fiber_g": 1.2, "sugar_g": 2.6, "saturated_fat_g": 0.03, "sodium_mg": 5, "calcium_mg": 10, "iron_mg": 0.3, "potassium_mg": 237, "vitamin_c_mg": 14, "vitamin_a_mcg": 42},
    "onion": {"calories": 40, "protein_g": 1.1, "fat_g": 0.1, "carbohydrates_g": 9.3, "fiber_g": 1.7, "sugar_g": 4.2, "saturated_fat_g": 0.04, "sodium_mg": 4, "calcium_mg": 23, "iron_mg": 0.2, "potassium_mg": 146, "vitamin_c_mg": 7.4},
    "garlic": {"calories": 149, "protein_g": 6.4, "fat_g": 0.5, "carbohydrates_g": 33, "fiber_g": 2.1, "sugar_g": 1.0, "saturated_fat_g": 0.1, "sodium_mg": 17, "calcium_mg": 181, "iron_mg": 1.7, "potassium_mg": 401, "vitamin_c_mg": 31},
    "spinach": {"calories": 23, "protein_g": 2.9, "fat_g": 0.4, "carbohydrates_g": 3.6, "fiber_g": 2.2, "sugar_g": 0.4, "saturated_fat_g": 0.06, "sodium_mg": 79, "calcium_mg": 99, "iron_mg": 2.7, "potassium_mg": 558, "vitamin_c_mg": 28, "vitamin_a_mcg": 469, "vitamin_k_mcg": 483, "folate_mcg": 194},
    "carrot": {"calories": 41, "protein_g": 0.9, "fat_g": 0.2, "carbohydrates_g": 10, "fiber_g": 2.8, "sugar_g": 4.7, "saturated_fat_g": 0.04, "sodium_mg": 69, "calcium_mg": 33, "iron_mg": 0.3, "potassium_mg": 320, "vitamin_c_mg": 5.9, "vitamin_a_mcg": 835},
    "broccoli": {"calories": 34, "protein_g": 2.8, "fat_g": 0.4, "carbohydrates_g": 6.6, "fiber_g": 2.6, "sugar_g": 1.7, "saturated_fat_g": 0.05, "sodium_mg": 33, "calcium_mg": 47, "iron_mg": 0.7, "potassium_mg": 316, "vitamin_c_mg": 89, "vitamin_k_mcg": 102, "folate_mcg": 63},
    "potato": {"calories": 77, "protein_g": 2.0, "fat_g": 0.1, "carbohydrates_g": 17, "fiber_g": 2.2, "sugar_g": 0.8, "saturated_fat_g": 0.02, "sodium_mg": 6, "calcium_mg": 12, "iron_mg": 0.8, "potassium_mg": 421, "vitamin_c_mg": 19.7},
    "pepper": {"calories": 31, "protein_g": 1.0, "fat_g": 0.3, "carbohydrates_g": 6.0, "fiber_g": 2.1, "sugar_g": 4.2, "saturated_fat_g": 0.06, "sodium_mg": 4, "calcium_mg": 10, "potassium_mg": 211, "vitamin_c_mg": 128, "vitamin_a_mcg": 157},
    "mushroom": {"calories": 22, "protein_g": 3.1, "fat_g": 0.3, "carbohydrates_g": 3.3, "fiber_g": 1.0, "sugar_g": 2.0, "saturated_fat_g": 0.04, "sodium_mg": 5, "calcium_mg": 3, "iron_mg": 0.5, "potassium_mg": 318, "vitamin_d_mcg": 0.2},
    "zucchini": {"calories": 17, "protein_g": 1.2, "fat_g": 0.3, "carbohydrates_g": 3.1, "fiber_g": 1.0, "sugar_g": 2.5, "saturated_fat_g": 0.07, "sodium_mg": 8, "calcium_mg": 16, "potassium_mg": 261, "vitamin_c_mg": 17},
    "corn": {"calories": 86, "protein_g": 3.3, "fat_g": 1.4, "carbohydrates_g": 19, "fiber_g": 2.7, "sugar_g": 3.2, "saturated_fat_g": 0.2, "sodium_mg": 15, "calcium_mg": 2, "iron_mg": 0.5, "potassium_mg": 270},
    "lettuce": {"calories": 15, "protein_g": 1.4, "fat_g": 0.2, "carbohydrates_g": 2.9, "fiber_g": 1.3, "sugar_g": 1.2, "saturated_fat_g": 0.03, "sodium_mg": 28, "calcium_mg": 36, "potassium_mg": 194, "vitamin_c_mg": 9.2, "vitamin_a_mcg": 166},
    "avocado": {"calories": 160, "protein_g": 2.0, "fat_g": 15, "carbohydrates_g": 9.0, "fiber_g": 7.0, "sugar_g": 0.7, "saturated_fat_g": 2.1, "sodium_mg": 7, "calcium_mg": 12, "potassium_mg": 485, "vitamin_c_mg": 10, "vitamin_k_mcg": 21},
    # ── Grains & Starches ─────────────────────────────────────────
    "rice": {"calories": 130, "protein_g": 2.7, "fat_g": 0.3, "carbohydrates_g": 28, "fiber_g": 0.4, "sugar_g": 0, "saturated_fat_g": 0.08, "sodium_mg": 1, "calcium_mg": 10, "iron_mg": 0.2, "potassium_mg": 35},
    "pasta": {"calories": 131, "protein_g": 5.0, "fat_g": 1.1, "carbohydrates_g": 25, "fiber_g": 1.8, "sugar_g": 0.6, "saturated_fat_g": 0.2, "sodium_mg": 1, "calcium_mg": 7, "iron_mg": 1.3, "potassium_mg": 44},
    "bread": {"calories": 265, "protein_g": 9.0, "fat_g": 3.2, "carbohydrates_g": 49, "fiber_g": 2.7, "sugar_g": 5.0, "saturated_fat_g": 0.7, "sodium_mg": 491, "calcium_mg": 107, "iron_mg": 3.0, "potassium_mg": 115},
    "flour": {"calories": 364, "protein_g": 10, "fat_g": 1.0, "carbohydrates_g": 76, "fiber_g": 2.7, "sugar_g": 0.3, "saturated_fat_g": 0.2, "sodium_mg": 2, "calcium_mg": 15, "iron_mg": 4.6},
    "oat": {"calories": 389, "protein_g": 17, "fat_g": 7.0, "carbohydrates_g": 66, "fiber_g": 10, "sugar_g": 0, "saturated_fat_g": 1.2, "sodium_mg": 2, "calcium_mg": 54, "iron_mg": 4.7, "potassium_mg": 429},
    "quinoa": {"calories": 120, "protein_g": 4.4, "fat_g": 1.9, "carbohydrates_g": 21, "fiber_g": 2.8, "sugar_g": 0.9, "saturated_fat_g": 0.2, "sodium_mg": 7, "calcium_mg": 17, "iron_mg": 1.5, "potassium_mg": 172},
    # ── Oils & Condiments ─────────────────────────────────────────
    "oil": {"calories": 884, "protein_g": 0, "fat_g": 100, "carbohydrates_g": 0, "fiber_g": 0, "sugar_g": 0, "saturated_fat_g": 14, "sodium_mg": 0, "vitamin_e_mg": 14},
    "olive oil": {"calories": 884, "protein_g": 0, "fat_g": 100, "carbohydrates_g": 0, "fiber_g": 0, "sugar_g": 0, "saturated_fat_g": 13.8, "sodium_mg": 0, "vitamin_k_mcg": 60, "vitamin_e_mg": 14},
    "soy sauce": {"calories": 53, "protein_g": 5.1, "fat_g": 0.1, "carbohydrates_g": 5.6, "fiber_g": 0.8, "sugar_g": 1.7, "saturated_fat_g": 0.01, "sodium_mg": 5493, "calcium_mg": 17, "iron_mg": 1.9, "potassium_mg": 217},
    # ── Fruits ────────────────────────────────────────────────────
    "apple": {"calories": 52, "protein_g": 0.3, "fat_g": 0.2, "carbohydrates_g": 14, "fiber_g": 2.4, "sugar_g": 10, "saturated_fat_g": 0.03, "sodium_mg": 1, "calcium_mg": 6, "potassium_mg": 107, "vitamin_c_mg": 4.6},
    "banana": {"calories": 89, "protein_g": 1.1, "fat_g": 0.3, "carbohydrates_g": 23, "fiber_g": 2.6, "sugar_g": 12, "saturated_fat_g": 0.1, "sodium_mg": 1, "calcium_mg": 5, "potassium_mg": 358, "vitamin_c_mg": 8.7, "vitamin_b6_mg": 0.4},
    "lemon": {"calories": 29, "protein_g": 1.1, "fat_g": 0.3, "carbohydrates_g": 9.3, "fiber_g": 2.8, "sugar_g": 2.5, "saturated_fat_g": 0.04, "sodium_mg": 2, "calcium_mg": 26, "potassium_mg": 138, "vitamin_c_mg": 53},
    "orange": {"calories": 47, "protein_g": 0.9, "fat_g": 0.1, "carbohydrates_g": 12, "fiber_g": 2.4, "sugar_g": 9.4, "saturated_fat_g": 0.02, "sodium_mg": 0, "calcium_mg": 40, "potassium_mg": 181, "vitamin_c_mg": 53},
    "mango": {"calories": 60, "protein_g": 0.8, "fat_g": 0.4, "carbohydrates_g": 15, "fiber_g": 1.6, "sugar_g": 14, "saturated_fat_g": 0.1, "sodium_mg": 1, "calcium_mg": 11, "potassium_mg": 168, "vitamin_c_mg": 36, "vitamin_a_mcg": 54},
    # ── Nuts & Seeds ──────────────────────────────────────────────
    "almond": {"calories": 579, "protein_g": 21, "fat_g": 50, "carbohydrates_g": 22, "fiber_g": 12, "sugar_g": 4.4, "saturated_fat_g": 3.8, "sodium_mg": 1, "calcium_mg": 264, "iron_mg": 3.7, "magnesium_mg": 270, "vitamin_e_mg": 25},
    "peanut": {"calories": 567, "protein_g": 26, "fat_g": 49, "carbohydrates_g": 16, "fiber_g": 8.5, "sugar_g": 4.7, "saturated_fat_g": 6.3, "sodium_mg": 18, "calcium_mg": 92, "iron_mg": 4.6, "magnesium_mg": 168, "potassium_mg": 705},
    "sesame": {"calories": 573, "protein_g": 17, "fat_g": 50, "carbohydrates_g": 23, "fiber_g": 11, "sugar_g": 0.3, "saturated_fat_g": 7.0, "sodium_mg": 11, "calcium_mg": 975, "iron_mg": 14, "magnesium_mg": 351},
}

# Canonical key aliases for matching ingredient names
_ALIASES = {
    "breast": "chicken", "thigh": "chicken", "drumstick": "chicken", "wings": "chicken",
    "ground beef": "beef", "steak": "beef", "mince": "beef",
    "bacon": "pork", "ham": "pork", "sausage": "pork",
    "prawns": "shrimp", "scallop": "shrimp",
    "cheddar": "cheese", "mozzarella": "cheese", "parmesan": "cheese", "feta": "cheese",
    "heavy cream": "cream", "sour cream": "cream", "whipping cream": "cream",
    "coconut oil": "oil", "vegetable oil": "oil", "canola oil": "oil",
    "capsicum": "pepper", "bell pepper": "pepper", "chili": "pepper",
    "chilli": "pepper", "jalapeño": "pepper",
    "courgette": "zucchini",
    "macaroni": "pasta", "spaghetti": "pasta", "penne": "pasta", "noodle": "pasta",
    "chickpea": "bean", "black bean": "bean", "kidney bean": "bean",
    "lime": "lemon",
    "pumpkin": "potato", "sweet potato": "potato", "yam": "potato",
    "kale": "spinach", "swiss chard": "spinach", "collard": "spinach",
    "walnut": "almond", "cashew": "almond", "pistachio": "almond", "pecan": "almond",
}

_NUTRIENT_KEYS = [
    "calories", "protein_g", "fat_g", "carbohydrates_g", "fiber_g", "sugar_g",
    "saturated_fat_g", "sodium_mg", "calcium_mg", "iron_mg", "magnesium_mg",
    "potassium_mg", "zinc_mg", "vitamin_a_mcg", "vitamin_c_mg", "vitamin_d_mcg",
    "vitamin_e_mg", "vitamin_k_mcg", "vitamin_b6_mg", "vitamin_b12_mcg", "folate_mcg",
]


def _estimate_nutrition(recipe_data: dict) -> dict:
    """
    Build an estimated per_serving nutrition dict from the recipe's ingredient list.
    Returns a dict with all _NUTRIENT_KEYS populated (None where unknown) and
    an 'estimated' flag set to True so the frontend can show a badge.
    """
    ingredients = recipe_data.get("ingredients", [])
    # Flatten all ingredient item names
    raw_names = []
    for group in ingredients:
        for item in group.get("items", []):
            raw_names.append(item.get("name", "").lower())

    # Accumulate totals weighted by a rough quantity-to-grams mapping
    totals = {k: 0.0 for k in _NUTRIENT_KEYS}
    matched = 0

    # Try to parse "yields" servings count from meta
    yields_str = recipe_data.get("meta", {}).get("yields", "")
    try:
        servings = max(1, int(re.search(r"\d+", yields_str).group()))
    except (AttributeError, ValueError):
        servings = 4  # default assumption

    for name in raw_names:
        # Find the best matching DB key
        profile = None
        name_lower = name.lower()
        # Direct key match
        for db_key in _NUTRIENT_DB:
            if db_key in name_lower:
                profile = _NUTRIENT_DB[db_key]
                break
        # Alias match
        if not profile:
            for alias, db_key in _ALIASES.items():
                if alias in name_lower:
                    profile = _NUTRIENT_DB.get(db_key)
                    break
        if not profile:
            continue
        matched += 1
        # Assume ~100–150g of each ingredient contributes to the dish
        scale = 1.2  # 120g equivalent per ingredient mention
        for k in _NUTRIENT_KEYS:
            totals[k] += (profile.get(k) or 0) * scale

    if matched == 0:
        # No recognisable ingredients — return sensible generic values
        return {
            "calories": 350, "protein_g": 20, "fat_g": 12,
            "carbohydrates_g": 40, "fiber_g": 5, "sugar_g": 6,
            "saturated_fat_g": 4, "sodium_mg": 600,
            "calcium_mg": None, "iron_mg": None, "magnesium_mg": None,
            "potassium_mg": None, "zinc_mg": None,
            "vitamin_a_mcg": None, "vitamin_c_mg": None, "vitamin_d_mcg": None,
            "vitamin_e_mg": None, "vitamin_k_mcg": None,
            "vitamin_b6_mg": None, "vitamin_b12_mcg": None, "folate_mcg": None,
            "_estimated": True,
        }

    per_serving = {k: round(totals[k] / servings, 1) if totals[k] > 0 else None for k in _NUTRIENT_KEYS}
    per_serving["_estimated"] = True
    return per_serving


def _tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {"id": user.id, "email": user.email},
    }


# ============ AUTH (Email + Password) ============

def _set_auth_cookies(response, tokens):
    # Set access token cookie (7 days)
    response.set_cookie(
        key="access_token",
        value=tokens["access"],
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
        max_age=7 * 24 * 60 * 60,
    )
    # Set refresh token cookie (30 days)
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh"],
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
        max_age=30 * 24 * 60 * 60,
    )

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""
    if not email or "@" not in email:
        return Response({"error": "Valid email required"}, status=400)
    if len(password) < 6:
        return Response({"error": "Password must be at least 6 characters"}, status=400)
    if User.objects.filter(username=email).exists():
        return Response({"error": "An account with this email already exists"}, status=400)

    user = User.objects.create_user(username=email, email=email, password=password)
    Preferences.objects.create(user=user)
    
    tokens = _tokens_for(user)
    response = Response(tokens)
    _set_auth_cookies(response, tokens)
    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""
    user = authenticate(username=email, password=password)
    if not user:
        return Response({"error": "Invalid email or password"}, status=400)
    
    tokens = _tokens_for(user)
    response = Response(tokens)
    _set_auth_cookies(response, tokens)
    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    response = Response({"detail": "Logged out successfully"})
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return response


# ============ PER-USER DATA ============

class PantryViewSet(viewsets.ModelViewSet):
    serializer_class = PantryItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PantryItem.objects.filter(user=self.request.user).order_by("expires_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class RecipeViewSet(viewsets.ModelViewSet):
    serializer_class = RecipeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Recipe.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Expense.objects.filter(user=self.request.user).order_by("week_offset")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)




class PreferencesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        prefs, _ = Preferences.objects.get_or_create(user=request.user)
        return Response(PreferencesSerializer(prefs).data)

    def put(self, request):
        prefs, _ = Preferences.objects.get_or_create(user=request.user)
        ser = PreferencesSerializer(prefs, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


@api_view(["GET"])
@permission_classes([AllowAny])
def geolocate(request):
    try:
        req = urllib.request.Request(
            "https://freeipapi.com/api/json",
            headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            return Response(data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ============ RECIPE API PROXY ============

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recipe_discover(request):
    """
    Proxy GET /api/v1/recipes to recipe-api.com, forwarding query params.
    The API key is injected server-side so it never reaches the browser.
    """
    if not RECIPE_API_KEY:
        return Response({"error": "Recipe API key not configured on server."}, status=503)

    # Forward safe query params
    allowed_params = ["cuisine", "dietary", "category", "limit", "offset", "q", "tags"]
    params = {k: v for k, v in request.GET.items() if k in allowed_params}
    qs = urllib.parse.urlencode(params)
    url = f"{RECIPE_API_BASE}/recipes" + (f"?{qs}" if qs else "")

    try:
        req = urllib.request.Request(
            url,
            headers={
                "X-API-Key": RECIPE_API_KEY,
                "User-Agent": "SmartPantry/1.0",
                "Accept": "application/json",
            }
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            return Response(data)
    except urllib.error.HTTPError as e:
        return Response({"error": e.reason}, status=e.code)
    except Exception as e:
        return Response({"error": str(e)}, status=502)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recipe_enrich(request, recipe_id):
    """
    Proxy GET /api/v1/recipes/{id} — fetches full nutrition + structured steps
    for a single recipe from the catalog.

    If the upstream API returns an empty nutrition.per_serving block, we
    transparently inject ingredient-based estimates computed by _estimate_nutrition().
    The injected block carries an _estimated=True flag so the frontend can
    display an appropriate "Estimated" badge.
    """
    if not RECIPE_API_KEY:
        return Response({"error": "Recipe API key not configured on server."}, status=503)

    url = f"{RECIPE_API_BASE}/recipes/{recipe_id}"
    try:
        req = urllib.request.Request(
            url,
            headers={
                "X-API-Key": RECIPE_API_KEY,
                "User-Agent": "SmartPantry/1.0",
                "Accept": "application/json",
            }
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())

        # recipe-api.com wraps single-recipe response in { data: {...}, usage: {...} }
        recipe_obj = data.get("data", data) if isinstance(data, dict) else data

        # ── Inject estimated nutrition when per_serving is missing or empty ──
        nutrition = recipe_obj.get("nutrition") if isinstance(recipe_obj, dict) else None
        per_serving = nutrition.get("per_serving") if isinstance(nutrition, dict) else None

        if not per_serving:
            estimated = _estimate_nutrition(recipe_obj)
            if isinstance(nutrition, dict):
                nutrition["per_serving"] = estimated
                nutrition["sources"] = nutrition.get("sources") or ["SmartPantry ingredient estimate (USDA basis)"]
            else:
                if isinstance(recipe_obj, dict):
                    recipe_obj["nutrition"] = {
                        "per_serving": estimated,
                        "sources": ["SmartPantry ingredient estimate (USDA basis)"],
                    }
            # Propagate back to outer wrapper if present
            if "data" in data and isinstance(data, dict):
                data["data"] = recipe_obj
            else:
                data = recipe_obj

        return Response(data)

    except urllib.error.HTTPError as e:
        return Response({"error": e.reason}, status=e.code)
    except Exception as e:
        return Response({"error": str(e)}, status=502)
