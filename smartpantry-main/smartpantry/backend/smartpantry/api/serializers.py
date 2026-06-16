from rest_framework import serializers
from .models import PantryItem, Recipe, Expense, Preferences


class PantryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PantryItem
        fields = ["id", "name", "category", "quantity", "unit",
                  "expires_at", "price_paid", "added_at"]
        read_only_fields = ["id", "added_at"]


class RecipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recipe
        fields = ["id", "title", "cuisine", "minutes", "difficulty",
                  "tags", "ingredients", "steps", "rating", "created_at"]
        read_only_fields = ["id", "created_at"]


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = ["id", "week_offset", "amount", "category", "created_at"]
        read_only_fields = ["id", "created_at"]


class PreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Preferences
        fields = ["diet", "cuisines", "dislikes"]
