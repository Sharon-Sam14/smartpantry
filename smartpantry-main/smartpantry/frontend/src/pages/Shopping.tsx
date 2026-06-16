import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingCart, Plus, Trash2, CheckCircle, 
  Circle, PlusCircle, ArrowRight, ArrowLeftSquare, Inbox,
  Compass, Store, Tag, Navigation, MapPin, Loader2, Info
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ShoppingItem } from "@/lib/types";

const categories: ShoppingItem["category"][] = [
  "Produce", "Protein", "Dairy", "Pantry", "Frozen", "Other"
];

const categoryColors: Record<ShoppingItem["category"], string> = {
  Produce: "border-[var(--accent-2)]/25 bg-[var(--accent-2)]/5 text-[var(--accent-2)]",
  Protein: "border-primary/20 bg-primary/5 text-primary",
  Dairy: "border-[var(--accent-gold)]/20 bg-[var(--accent-gold)]/5 text-[var(--accent-gold)]",
  Pantry: "border-[var(--accent-gold)]/25 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]",
  Frozen: "border-[#5E7A8C]/20 bg-[#5E7A8C]/5 text-[#5E7A8C]",
  Other: "border-[#8C7E74]/25 bg-[#8C7E74]/5 text-[#8C7E74]"
};

interface NearbyStore {
  id: string;
  name: string;
  specialty: string;
  distance: string;
  status: string;
  deal: string;
  address: string;
  lat: number;
  lng: number;
}

const NEARBY_STORES: NearbyStore[] = [
  {
    id: "s1",
    name: "Whole Foods Market",
    specialty: "Organic Produce & Premium Proteins",
    distance: "0.6 miles",
    status: "Open · Closes at 10 PM",
    deal: "Save $5 on orders over $40",
    address: "450 Fresh Meadow Way, Heights",
    lat: 37.7749,
    lng: -122.4194
  },
  {
    id: "s2",
    name: "Trader Joe's",
    specialty: "Snacks, Cheese, Dairy & Pantry",
    distance: "1.1 miles",
    status: "Open · Closes at 9 PM",
    deal: "10% off organic greek yogurt",
    address: "820 Olive Tree Blvd, Downtown",
    lat: 37.7833,
    lng: -122.4167
  },
  {
    id: "s3",
    name: "Safeway",
    specialty: "Budget Staples, Bakery & Frozen",
    distance: "1.8 miles",
    status: "Open 24 Hours",
    deal: "Buy 1 Get 1 free on select bread",
    address: "1200 Broadway Ave, Northside",
    lat: 37.7699,
    lng: -122.4312
  }
];

export default function Shopping() {
  const { 
    shoppingList, 
    addShoppingItem, 
    toggleShoppingItem, 
    removeShoppingItem 
  } = useStore();
  
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ShoppingItem["category"]>("Other");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("pcs");
  
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [stores, setStores] = useState<NearbyStore[]>(NEARBY_STORES);
  const [selectedStore, setSelectedStore] = useState<NearbyStore>(NEARBY_STORES[0]);

  // Geolocation & coordinates states
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locPermission, setLocPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [locLoading, setLocLoading] = useState(false);

  // Haversine formula to compute actual distance in miles
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3958.8; // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Fetch real stores using OpenStreetMap Overpass API
  const fetchNearbyStores = async (lat: number, lng: number) => {
    setLocLoading(true);
    try {
      // Find supermarkets, groceries, convenience stores, and marketplaces in a wider 10km radius
      const query = `[out:json][timeout:15];
        (
          node(around:10000,${lat},${lng})[shop=supermarket];
          way(around:10000,${lat},${lng})[shop=supermarket];
          node(around:10000,${lat},${lng})[shop=grocery];
          way(around:10000,${lat},${lng})[shop=grocery];
          node(around:10000,${lat},${lng})[shop=convenience];
          way(around:10000,${lat},${lng})[shop=convenience];
          node(around:10000,${lat},${lng})[shop=department_store];
          way(around:10000,${lat},${lng})[shop=department_store];
          node(around:10000,${lat},${lng})[amenity=marketplace];
          way(around:10000,${lat},${lng})[amenity=marketplace];
        );
        out center 15;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Overpass API error");
      const data = await res.json();
      
      if (data.elements && data.elements.length > 0) {
        const mapped: NearbyStore[] = data.elements.map((el: any, idx: number) => {
          const name = el.tags.name || "Local Supermarket";
          const storeLat = el.lat || (el.center && el.center.lat) || lat;
          const storeLon = el.lon || (el.center && el.center.lon) || lng;
          const dist = calculateDistance(lat, lng, storeLat, storeLon);
          
          let specialty = "General Groceries & Daily Needs";
          let deal = "Save 5% on fresh products";
          
          // Specialize deals and tags based on name matches (including Indian brands)
          const lowerName = name.toLowerCase();
          if (lowerName.includes("whole foods")) {
            specialty = "Organic Produce & Premium Proteins";
            deal = "Save $5 on orders over $40";
          } else if (lowerName.includes("trader joe")) {
            specialty = "Unique Snacks & Specialty Dairy";
            deal = "10% off organic Greek yogurt";
          } else if (lowerName.includes("safeway") || lowerName.includes("kroger") || lowerName.includes("supermarket")) {
            specialty = "Budget Staples & Bakery Items";
            deal = "Buy 1 Get 1 free select bread";
          } else if (lowerName.includes("target") || lowerName.includes("walmart")) {
            specialty = "Pantry, Household & Frozen Foods";
            deal = "Spend $50, get $10 gift card";
          } else if (lowerName.includes("reliance") || lowerName.includes("jiomart")) {
            specialty = "Fruits, Vegetables & Daily Staples";
            deal = "Flat 5% off on Reliance Smart Card";
          } else if (lowerName.includes("d-mart") || lowerName.includes("dmart")) {
            specialty = "Bulk Staples & Household Goods";
            deal = "Flat 10% discount below MRP";
          } else if (lowerName.includes("more")) {
            specialty = "Fresh Produce & Quality Staples";
            deal = "5% cashback on store voucher";
          } else if (lowerName.includes("spencer")) {
            specialty = "Gourmet & Imported Food Staples";
            deal = "10% off fresh bakery items";
          } else if (lowerName.includes("big bazaar")) {
            specialty = "Mega Grocery & Household Store";
            deal = "Save ₹50 on first order of ₹500";
          } else if (lowerName.includes("fresh")) {
            specialty = "Fresh Produce & Green Salads";
            deal = "15% off fresh salad bags";
          }
          
          const street = el.tags["addr:street"] || "";
          const num = el.tags["addr:housenumber"] || "";
          const address = street ? `${num} ${street}`.trim() : "Nearby location";
          
          return {
            id: `real-${el.id || idx}`,
            name,
            specialty,
            distance: `${dist.toFixed(1)} miles`,
            status: "Open",
            deal,
            address,
            lat: storeLat,
            lng: storeLon
          };
        });
        
        mapped.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
        setStores(mapped);
        setSelectedStore(mapped[0]);
        
        toast({
          title: "Locations Loaded",
          description: `Found ${mapped.length} local grocery stores near your position.`,
        });
      } else {
        toast({
          title: "No local stores found",
          description: "No supermarkets found in OpenStreetMap coordinates. Using default local list.",
        });
        setStores(NEARBY_STORES);
        setSelectedStore(NEARBY_STORES[0]);
      }
    } catch (err) {
      console.warn("Overpass query failed", err);
      toast({
        title: "API Error",
        description: "Could not query OpenStreetMap. Using default local list.",
        variant: "destructive"
      });
      setStores(NEARBY_STORES);
      setSelectedStore(NEARBY_STORES[0]);
    } finally {
      setLocLoading(false);
    }
  };

  // IP Geolocation fallback when GPS fails or is denied/unsupported
  const requestIPLocation = async () => {
    setLocLoading(true);
    try {
      let res;
      try {
        // Fetch via server-side Django proxy (bypasses browser adblockers and tracker shields)
        res = await fetch(`${API_BASE}/geolocate/`);
      } catch (err) {
        console.warn("Backend proxy geolocate failed, trying direct client fetch...", err);
        // Fallback to direct client request
        res = await fetch("https://freeipapi.com/api/json");
      }
      
      if (!res.ok) throw new Error("IP location service query failed");
      const data = await res.json();
      
      if (data.latitude && data.longitude) {
        const { latitude, longitude, cityName } = data;
        setUserCoords({ lat: latitude, lng: longitude });
        setLocPermission("granted");
        fetchNearbyStores(latitude, longitude);
        toast({
          title: cityName ? `Estimated Location: ${cityName}` : "Estimated Location",
          description: "Located nearby grocery stores using network IP address.",
        });
      } else {
        throw new Error("Invalid geolocation format from IP service");
      }
    } catch (err) {
      console.warn("IP Geolocation fallback failed", err);
      setLocPermission("denied");
      setLocLoading(false);
      toast({
        title: "Location Unavailable",
        description: "Could not locate you automatically. Using default mock list.",
      });
      setStores(NEARBY_STORES);
      setSelectedStore(NEARBY_STORES[0]);
    }
  };

  // Request browser GPS coords
  const requestLocation = () => {
    if (!navigator.geolocation) {
      requestIPLocation();
      return;
    }
    
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setLocPermission("granted");
        fetchNearbyStores(latitude, longitude);
      },
      (error) => {
        console.warn("GPS Geolocation failed. Trying IP-based location...", error);
        requestIPLocation();
      },
      { timeout: 7000 }
    );
  };

  // Auto-request geolocation on mount
  useEffect(() => {
    requestLocation();
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    addShoppingItem(name.trim(), category, quantity, unit);
    setName("");
    setQuantity(1);
    setUnit("pcs");
    
    toast({
      title: "Item added",
      description: `"${name}" added to shopping list.`,
    });
  };

  // Group items by category
  const groupedItems = categories.reduce((acc, cat) => {
    acc[cat] = shoppingList.filter(item => item.category === cat);
    return acc;
  }, {} as Record<ShoppingItem["category"], ShoppingItem[]>);

  const totalCount = shoppingList.length;

  // Calculate dynamic matching score for a store based on items in shopping list
  const getMatchScore = (store: NearbyStore, list: typeof shoppingList) => {
    if (list.length === 0) return 0;
    
    // Category match rates for stores
    const categoryWeights: Record<string, Record<string, number>> = {
      "Whole Foods Market": { Produce: 0.98, Protein: 0.95, Dairy: 0.88, Pantry: 0.80, Frozen: 0.70, Other: 0.75 },
      "Trader Joe's": { Produce: 0.85, Protein: 0.80, Dairy: 0.95, Pantry: 0.92, Frozen: 0.75, Other: 0.85 },
      "Safeway": { Produce: 0.75, Protein: 0.85, Dairy: 0.80, Pantry: 0.88, Frozen: 0.95, Other: 0.90 }
    };
    
    // Fallback weights for dynamically loaded real stores
    const storeName = store.name.toLowerCase();
    let weights: Record<string, number> = { Produce: 0.85, Protein: 0.85, Dairy: 0.85, Pantry: 0.85, Frozen: 0.85, Other: 0.80 };
    
    if (storeName.includes("whole foods") || storeName.includes("organic")) {
      weights = categoryWeights["Whole Foods Market"];
    } else if (storeName.includes("trader joe") || storeName.includes("specialty")) {
      weights = categoryWeights["Trader Joe's"];
    } else if (storeName.includes("safeway") || storeName.includes("kroger") || storeName.includes("target")) {
      weights = categoryWeights["Safeway"];
    }
    
    let totalScore = 0;
    list.forEach(item => {
      totalScore += weights[item.category] || 0.8;
    });
    
    return Math.round((totalScore / list.length) * 100);
  };

  // Projected coordinates mapping onto the 300x300 map SVG
  const projectedStores = useMemo(() => {
    if (!userCoords || stores.some(s => s.id.startsWith("s"))) {
      // Return static positions if using mock backup locations
      const positions: Record<string, { x: number; y: number }> = {
        s1: { x: 70, y: 70 },
        s2: { x: 220, y: 100 },
        s3: { x: 250, y: 220 }
      };
      return stores.map(s => ({
        ...s,
        svgX: positions[s.id]?.x || 150,
        svgY: positions[s.id]?.y || 150
      }));
    }
    
    // Find max difference to fit bounds between 40 and 260
    let maxDiff = 0.003; // minimum window boundary
    stores.forEach(s => {
      const dLat = Math.abs(s.lat - userCoords.lat);
      const dLng = Math.abs(s.lng - userCoords.lng);
      if (dLat > maxDiff) maxDiff = dLat;
      if (dLng > maxDiff) maxDiff = dLng;
    });
    
    // Scale factor from center (150, 150)
    const scale = 95 / maxDiff;
    
    return stores.map(s => {
      // Map longitude to x-axis, latitude to y-axis (inverted)
      const svgX = 150 + (s.lng - userCoords.lng) * scale;
      const svgY = 150 - (s.lat - userCoords.lat) * scale;
      
      return {
        ...s,
        svgX: Math.max(40, Math.min(260, svgX)),
        svgY: Math.max(40, Math.min(260, svgY))
      };
    });
  }, [stores, userCoords]);

  // Find currently selected store projection coordinates
  const activeProjection = useMemo(() => {
    return projectedStores.find(p => p.id === selectedStore.id) || { svgX: 150, svgY: 150 };
  }, [projectedStores, selectedStore]);

  return (
    <div className="container py-8 space-y-6 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1 font-figtree">
          <p className="label-category text-primary">Groceries</p>
          <h1 className="font-fraunces text-3xl md:text-4xl font-medium tracking-tight text-foreground/90">
            Shopping <span className="font-fraunces italic font-normal text-[var(--accent-gold)]">List</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Plan your grocery run · checking items automatically transfers them to your pantry</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start font-figtree">
        {/* Quick Add & Suggestions Column */}
        <section className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
          {/* Quick Add Form */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-fraunces text-lg font-medium tracking-tight text-foreground/90">Quick Add</h2>
            
            <form onSubmit={handleAdd} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="item-name" className="text-xs font-semibold text-foreground/80">Item name</Label>
                <Input 
                  id="item-name"
                  placeholder="e.g. Fresh Tomatoes" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-md border-border/65 bg-background/50 h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="item-category" className="text-xs font-semibold text-foreground/80">Category</Label>
                <Select 
                  value={category} 
                  onValueChange={(v) => setCategory(v as ShoppingItem["category"])}
                >
                  <SelectTrigger id="item-category" className="rounded-md border-border/65 bg-background/50 h-10 text-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="item-quantity" className="text-xs font-semibold text-foreground/80">Qty</Label>
                  <Input 
                    id="item-quantity"
                    type="number" 
                    min="0.1" 
                    step="any"
                    value={quantity} 
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="rounded-md border-border/65 bg-background/50 h-10 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="item-unit" className="text-xs font-semibold text-foreground/80">Unit</Label>
                  <Input 
                    id="item-unit"
                    placeholder="pcs" 
                    value={unit} 
                    onChange={(e) => setUnit(e.target.value)}
                    className="rounded-md border-border/65 bg-background/50 h-10 text-xs"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm font-medium text-xs h-10 transition-transform active:scale-95">
                <Plus className="h-4 w-4 mr-1.5" /> Add to list
              </Button>
            </form>
          </div>

          {/* Suggested Grocery Stores */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-fraunces text-base font-medium tracking-tight text-foreground/90 flex items-center gap-1.5">
                <Compass className="h-4.5 w-4.5 text-primary animate-pulse" /> Suggested stores
              </h2>
              {locLoading ? (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 shrink-0 font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Locating...
                </span>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={requestLocation}
                  className="text-xs text-primary hover:bg-primary/10 h-7 px-2 shrink-0 rounded-md font-semibold"
                >
                  {locPermission === "granted" ? "Sync GPS" : "Find Near Me"}
                </Button>
              )}
            </div>
            
            <div className="space-y-3.5">
              {stores.map(store => {
                const score = getMatchScore(store, shoppingList);
                return (
                  <div 
                    key={store.id} 
                    onClick={() => {
                      setSelectedStore(store);
                      setIsMapOpen(true);
                    }}
                    className="p-4 border border-border/75 bg-[var(--surface)] hover:border-primary/30 hover:shadow-sm transition-all duration-300 rounded-xl space-y-3 group cursor-pointer relative overflow-hidden"
                  >
                    {/* Hover Glow using Terracotta instead of neon green */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    
                    <div className="flex items-start justify-between gap-3 relative z-10">
                      <div className="min-w-0 space-y-0.5">
                        <h3 className="font-fraunces text-sm font-medium text-foreground/90 group-hover:text-primary transition-colors flex items-center gap-1.5 truncate">
                          <Store className="h-4 w-4 text-muted-foreground shrink-0" /> {store.name}
                        </h3>
                        <p className="text-[10.5px] text-muted-foreground truncate">{store.specialty}</p>
                      </div>
                      
                      {/* Match Progress Ring */}
                      {totalCount > 0 ? (
                        <div className="relative h-8 w-8 shrink-0 flex items-center justify-center">
                          <svg className="h-full w-full -rotate-90">
                            <circle cx="16" cy="16" r="12" stroke="var(--border-color)" strokeWidth="2.5" fill="transparent" />
                            <circle 
                              cx="16" cy="16" r="12" 
                              stroke="currentColor" 
                              className={score >= 90 ? "text-[var(--accent-2)]" : score >= 80 ? "text-[var(--accent-gold)]" : "text-primary"} 
                              strokeWidth="2.5" 
                              fill="transparent" 
                              strokeDasharray={2 * Math.PI * 12}
                              strokeDashoffset={2 * Math.PI * 12 * (1 - score / 100)}
                            />
                          </svg>
                          <span className="absolute text-[8.5px] font-bold text-foreground font-tabular">{score}%</span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-muted-foreground shrink-0 font-medium">{store.distance}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] relative z-10">
                      <span className="text-muted-foreground/80">{store.status}</span>
                      {totalCount > 0 && (
                        <span className="text-muted-foreground font-semibold text-[9px]">{store.distance} away</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-[9.5px] bg-[var(--accent-2)]/10 border border-[var(--accent-2)]/20 text-[var(--accent-2)] px-2 py-1 rounded-md relative z-10 font-medium">
                      <Tag className="h-3 w-3 shrink-0" />
                      <span className="font-semibold truncate">{store.deal}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <Button 
              onClick={() => setIsMapOpen(true)}
              className="w-full bg-[var(--bg-2)] border border-border/80 text-foreground hover:bg-[var(--bg-2)]/80 rounded-lg text-xs font-semibold h-10 transition-all"
            >
              <Navigation className="h-3.5 w-3.5 mr-1" /> Open Map Explorer
            </Button>
          </div>
        </section>

        {/* Shopping List Grid */}
        <section className="lg:col-span-2 space-y-4">
          {totalCount > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground bg-[var(--bg-2)]/40 rounded-lg px-4 py-2 border border-border/85">
              <span className="font-semibold">{totalCount} item{totalCount !== 1 ? "s" : ""} on list</span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--accent-2)]">Items move to pantry upon ticking</span>
            </div>
          )}

          {totalCount === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="rounded-2xl border border-dashed border-border bg-card/30 p-16 text-center flex flex-col items-center justify-center space-y-4"
            >
              <div className="h-14 w-14 rounded-full bg-secondary/80 flex items-center justify-center mb-1 text-muted-foreground/75">
                <Inbox className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-fraunces text-base font-medium text-foreground/85">Your list is empty</h3>
                <p className="text-muted-foreground text-xs max-w-xs leading-normal">
                  Add items using the quick add form or navigate to the <strong>Recipes</strong> page to auto-add missing ingredients.
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {categories.map(cat => {
                const items = groupedItems[cat];
                if (items.length === 0) return null;
                
                return (
                  <motion.div 
                    key={cat}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-border/40">
                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${categoryColors[cat]}`}>
                        {cat}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground/75 uppercase tracking-wider">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                    </div>

                    <ul className="divide-y divide-border/40 font-figtree">
                      <AnimatePresence initial={false}>
                        {items.map(item => (
                          <motion.li 
                            key={item.id}
                            layout
                            exit={{ opacity: 0, x: -10 }}
                            className="flex items-center justify-between py-2.5 group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <button 
                                type="button"
                                onClick={() => toggleShoppingItem(item.id)}
                                className="text-muted-foreground hover:text-[var(--accent-2)] transition-smooth shrink-0"
                              >
                                {item.checked ? (
                                  <CheckCircle className="h-4.5 w-4.5 text-[var(--accent-2)] fill-[var(--accent-2)]/10" />
                                ) : (
                                  <Circle className="h-4.5 w-4.5" />
                                )}
                              </button>
                              
                              <span className={`text-sm font-medium truncate transition-all duration-300 ${
                                item.checked 
                                  ? "line-through text-muted-foreground/50 opacity-60" 
                                  : "text-foreground/80"
                              }`}>
                                {item.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 font-figtree">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--bg-2)] text-muted-foreground/85 border border-border/40 ${
                                item.checked ? "opacity-40" : ""
                              }`}>
                                {item.quantity} {item.unit}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => {
                                  removeShoppingItem(item.id);
                                  toast({
                                    title: "Item removed",
                                    description: `"${item.name}" was deleted.`,
                                  });
                                }}
                                className="h-8 w-8 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-md opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* View Map Route Dialog */}
      <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
        <DialogContent className="sm:max-w-[780px] max-h-[85vh] overflow-hidden rounded-2xl border border-border/80 shadow-elegant p-0 gap-0">
          <div className="grid md:grid-cols-5 h-[520px]">
            {/* Sidebar - Store Selection */}
            <div className="md:col-span-2 border-r border-border p-5 overflow-y-auto bg-card flex flex-col justify-between h-full font-figtree">
              <div className="space-y-4">
                <DialogHeader className="space-y-1">
                  <DialogTitle className="font-fraunces text-lg font-medium tracking-tight flex items-center gap-1.5">
                    <Navigation className="h-4.5 w-4.5 text-primary animate-pulse" /> Shopping Routes
                  </DialogTitle>
                </DialogHeader>
                
                {userCoords ? (
                  <p className="text-[10px] text-[var(--accent-2)] font-bold uppercase tracking-wider flex items-center gap-1 leading-normal">
                    <span className="h-2 w-2 rounded-full bg-[var(--accent-2)] animate-ping" /> GPS Active
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground leading-normal">
                    Click "Find Near Me" in sidebar to activate GPS routing.
                  </p>
                )}
                
                <div className="space-y-2.5">
                  {projectedStores.map(store => {
                    const active = selectedStore.id === store.id;
                    const score = getMatchScore(store, shoppingList);
                    return (
                      <button
                        key={store.id}
                        type="button"
                        onClick={() => setSelectedStore(store)}
                        className={`w-full text-left p-3 rounded-xl border transition-all space-y-1.5 ${
                          active 
                            ? "bg-primary/5 border-primary shadow-sm" 
                            : "border-border/80 hover:bg-secondary/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 font-figtree">
                          <h3 className="font-fraunces text-sm font-medium text-foreground/90 truncate max-w-[120px]">{store.name}</h3>
                          <span className="text-[9.5px] font-semibold text-muted-foreground shrink-0">{store.distance}</span>
                        </div>
                        <p className="text-[10.5px] text-muted-foreground leading-tight truncate font-figtree">{store.address}</p>
                        <div className="flex items-center justify-between text-[9px] pt-1 font-figtree">
                          <span className="font-bold text-[var(--accent-2)] truncate max-w-[110px]">{store.deal}</span>
                          {totalCount > 0 && (
                            <span className="font-bold text-foreground/80 shrink-0">{score}% match</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[9px] text-muted-foreground border-t border-border/60 pt-3 flex items-center justify-between font-mono">
                <span>Coords: {userCoords ? `${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}` : "Mock Mode"}</span>
                {locLoading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
              </div>
            </div>
            
            {/* Vector Map Area - Styled Warm Editorial */}
            <div className="md:col-span-3 h-full relative bg-[#1E1A15] overflow-hidden flex flex-col justify-between">
              {/* Radar Grid Pattern Overlay */}
              <div className="absolute inset-0 bg-[#1E1A15]/90 pointer-events-none z-0">
                <div className="w-full h-full" style={{ 
                  backgroundImage: `radial-gradient(circle, rgba(200, 98, 42, 0.08) 1.5px, transparent 1.5px)`, 
                  backgroundSize: '24px 24px' 
                }} />
              </div>
              
              {/* SVG Vector HUD Radar Map */}
              <svg className="w-full h-full absolute inset-0 z-10 select-none" viewBox="0 0 300 300">
                <defs>
                  {/* Radar Gradient for sweep */}
                  <linearGradient id="radarSweep" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--accent-gold)" stopOpacity="0" />
                    <stop offset="100%" stopColor="var(--accent-gold)" stopOpacity="0.25" />
                  </linearGradient>
                </defs>

                {/* Radar sweep lines */}
                <circle cx="150" cy="150" r="10" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.4" className="animate-ping" style={{ animationDuration: '3.5s' }} />
                <circle cx="150" cy="150" r="40" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.2" />
                <circle cx="150" cy="150" r="80" fill="none" stroke="var(--accent-gold)" strokeWidth="0.5" opacity="0.15" />
                <circle cx="150" cy="150" r="120" fill="none" stroke="var(--accent-gold)" strokeWidth="0.5" opacity="0.08" />
                
                {/* Horizontal & Vertical Crosshairs */}
                <line x1="150" y1="0" x2="150" y2="300" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.1" />
                <line x1="0" y1="150" x2="300" y2="150" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.1" />

                {/* Diagonal HUD crosshairs */}
                <line x1="43" y1="43" x2="257" y2="257" stroke="var(--accent-gold)" strokeWidth="0.5" opacity="0.06" strokeDasharray="2 2" />
                <line x1="257" y1="43" x2="43" y2="257" stroke="var(--accent-gold)" strokeWidth="0.5" opacity="0.06" strokeDasharray="2 2" />

                {/* Outer Bearing Compass Markers */}
                <text x="150" y="12" textAnchor="middle" fill="hsl(var(--primary))" opacity="0.5" fontSize="8" className="font-mono font-bold">N</text>
                <text x="150" y="295" textAnchor="middle" fill="hsl(var(--primary))" opacity="0.5" fontSize="8" className="font-mono font-bold">S</text>
                <text x="290" y="153" textAnchor="middle" fill="hsl(var(--primary))" opacity="0.5" fontSize="8" className="font-mono font-bold">E</text>
                <text x="10" y="153" textAnchor="middle" fill="hsl(var(--primary))" opacity="0.5" fontSize="8" className="font-mono font-bold">W</text>

                {/* Sweeping Radar Line */}
                <motion.line 
                  x1="150" y1="150" x2="270" y2="150"
                  stroke="url(#radarSweep)"
                  strokeWidth="2.5"
                  style={{ transformOrigin: "150px 150px" }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                />

                {/* Animated Glowing Breathing Route Path */}
                <motion.path 
                  key={selectedStore.id}
                  d={`M 150 150 L ${activeProjection.svgX} ${activeProjection.svgY}`}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ 
                    pathLength: 1,
                    opacity: [0.5, 1, 0.5] 
                  }}
                  transition={{ 
                    pathLength: { duration: 0.7, ease: "easeOut" },
                    opacity: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                  }}
                />
                
                {/* User Pin / Home Location */}
                <g transform="translate(150, 150)">
                  <circle r="22" fill="none" stroke="var(--accent-gold)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" className="animate-[spin_10s_linear_infinite]" />
                  <circle r="14" fill="var(--accent-gold)" fillOpacity="0.15" className="animate-pulse" />
                  <circle r="4" fill="var(--accent-gold)" stroke="var(--bg)" strokeWidth="1.5" />
                </g>
                
                {/* Store Pins */}
                {projectedStores.map(store => {
                  const isActive = selectedStore.id === store.id;
                  return (
                    <motion.g 
                      key={store.id} 
                      transform={`translate(${store.svgX}, ${store.svgY})`} 
                      className="cursor-pointer" 
                      onClick={() => setSelectedStore(store)}
                      whileHover={{ scale: 1.15 }}
                      animate={isActive ? { y: [0, -3, 0] } : {}}
                      transition={isActive ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : {}}
                    >
                      {/* Glowing pin pulse */}
                      {isActive && (
                        <circle r="22" fill="hsl(var(--primary))" fillOpacity="0.25" className="animate-ping" style={{ animationDuration: '2s' }} />
                      )}
                      
                      <circle r="13" fill={isActive ? "hsl(var(--primary))" : "#2E2720"} stroke={isActive ? "#ffffff" : "var(--border-color)"} strokeWidth="1.5" />
                      
                      {/* First letter of the store */}
                      <text 
                        y="3" 
                        textAnchor="middle" 
                        fill={isActive ? "#ffffff" : "var(--text-2)"} 
                        className="text-[9px] font-sans font-black select-none pointer-events-none"
                      >
                        {store.name[0]}
                      </text>
                      
                      {/* Name Label */}
                      <text 
                        y="-16" 
                        textAnchor="middle" 
                        fill={isActive ? "hsl(var(--primary))" : "var(--text-2)"} 
                        className="text-[7.5px] font-sans font-bold uppercase select-none pointer-events-none tracking-wider bg-slate-950/70"
                      >
                        {store.name.split(" ")[0]}
                      </text>
                    </motion.g>
                  );
                })}
              </svg>
              
              {/* Route calculation card Overlay */}
              <div className="absolute top-4 right-4 bg-[#261F18]/90 backdrop-blur-md border border-[var(--border-color)] rounded-xl p-3 shadow-md max-w-[210px] z-20 space-y-1 pointer-events-none font-figtree">
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Active Route</p>
                <h4 className="text-xs font-bold text-foreground truncate">{selectedStore.name}</h4>
                <p className="text-[10px] text-[var(--accent-2)] font-semibold flex items-center gap-1.5">
                  <Navigation className="h-3 w-3 rotate-45" /> {selectedStore.distance} (
                  {selectedStore.id.startsWith("s") 
                    ? selectedStore.id === "s1" ? "12 min walk" : selectedStore.id === "s2" ? "22 min walk" : "35 min walk"
                    : `${Math.round(parseFloat(selectedStore.distance) * 15)} min walk`
                  })
                </p>
              </div>
              
              {/* Navigate Detail Footer */}
              <div className="p-4 bg-[#261F18] border-t border-[var(--border-color)] backdrop-blur z-20 flex flex-wrap items-center justify-between gap-3 font-figtree">
                <div className="space-y-0.5 max-w-[200px]">
                  <h4 className="text-xs font-bold text-foreground truncate">{selectedStore.name}</h4>
                  <p className="text-[9.5px] text-muted-foreground truncate">{selectedStore.address}</p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedStore.lat},${selectedStore.lng}`;
                    window.open(url, "_blank");
                    toast({
                      title: "Google Maps Opened",
                      description: `Directions to ${selectedStore.name} loaded.`
                    });
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs flex items-center gap-1.5 h-9 px-4 font-semibold transition-transform active:scale-95 shadow-sm"
                >
                  <MapPin className="h-3.5 w-3.5" /> Navigate
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
