from django.db import models
from django.contrib.auth.models import User


CATEGORY_CHOICES = [
    ("Produce", "Produce"), ("Protein", "Protein"), ("Dairy", "Dairy"),
    ("Pantry", "Pantry"), ("Frozen", "Frozen"), ("Other", "Other"),
]


class PantryItem(models.Model):
    user = models.ForeignKey(User, related_name="pantry", on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="Other")
    quantity = models.FloatField(default=1)
    unit = models.CharField(max_length=20, default="pcs")
    expires_at = models.DateField()
    price_paid = models.FloatField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)


class Recipe(models.Model):
    user = models.ForeignKey(User, related_name="recipes", on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    cuisine = models.CharField(max_length=80, default="Other")
    minutes = models.IntegerField(default=20)
    difficulty = models.CharField(max_length=20, default="Easy")
    tags = models.JSONField(default=list, blank=True)
    ingredients = models.JSONField(default=list, blank=True)
    steps = models.JSONField(default=list, blank=True)
    rating = models.FloatField(default=4.0)
    created_at = models.DateTimeField(auto_now_add=True)


class Expense(models.Model):
    user = models.ForeignKey(User, related_name="expenses", on_delete=models.CASCADE)
    week_offset = models.IntegerField()
    amount = models.FloatField()
    category = models.CharField(max_length=80, default="Groceries")
    created_at = models.DateTimeField(auto_now_add=True)


class Preferences(models.Model):
    user = models.OneToOneField(User, related_name="preferences", on_delete=models.CASCADE)
    diet = models.CharField(max_length=20, default="any")
    cuisines = models.JSONField(default=list, blank=True)
    dislikes = models.JSONField(default=list, blank=True)
