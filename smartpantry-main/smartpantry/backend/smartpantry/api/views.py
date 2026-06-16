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

from .models import PantryItem, Recipe, Expense, Preferences
from .serializers import (
    PantryItemSerializer, RecipeSerializer, ExpenseSerializer, PreferencesSerializer,
)

RECIPE_API_BASE = "https://recipe-api.com/api/v1"
RECIPE_API_KEY = getattr(settings, "RECIPE_API_KEY", "")


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
            return Response(data)
    except urllib.error.HTTPError as e:
        return Response({"error": e.reason}, status=e.code)
    except Exception as e:
        return Response({"error": str(e)}, status=502)
