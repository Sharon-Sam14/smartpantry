from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    register, login, logout_view, geolocate,
    PantryViewSet, RecipeViewSet, ExpenseViewSet, PreferencesView,
    recipe_discover, recipe_enrich,
)

router = DefaultRouter()
router.register("pantry", PantryViewSet, basename="pantry")
router.register("recipes", RecipeViewSet, basename="recipes")
router.register("expenses", ExpenseViewSet, basename="expenses")

urlpatterns = [
    path("auth/register/", register),
    path("auth/login/", login),
    path("auth/logout/", logout_view),
    path("preferences/", PreferencesView.as_view()),
    path("geolocate/", geolocate),
    path("discover/recipes/", recipe_discover),
    path("discover/recipes/<str:recipe_id>/", recipe_enrich),
    path("", include(router.urls)),
]
