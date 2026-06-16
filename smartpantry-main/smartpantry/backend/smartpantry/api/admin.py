from django.contrib import admin
from .models import PantryItem, Recipe, Expense, Preferences

admin.site.register(PantryItem)
admin.site.register(Recipe)
admin.site.register(Expense)
admin.site.register(Preferences)
