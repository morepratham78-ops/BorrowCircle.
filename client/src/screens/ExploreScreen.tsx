import React, { useState, useEffect, useRef } from 'react';
import { Item, Category, User } from '../types';
import { api } from '../services/api';
import {
  Wrench,
  Tv,
  Camera,
  Activity,
  Trees,
  Sparkles,
  Armchair,
  Hammer,
  PartyPopper,
  BookOpen,
  Compass,
  Wheat,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShieldCheck,
  Star,
  SlidersHorizontal,
  Map as MapIcon,
  Grid,
  Truck,
  ArrowUpRight,
  PlusCircle,
  HelpCircle,
  CheckCircle2,
  Clock,
  Zap,
  Award,
  MessageSquare
} from 'lucide-react';

interface ExploreScreenProps {
  user: User;
  selectedCity: string;
  searchQuery: string;
  onSelectItem: (item: Item) => void;
  onNavigateToListing: () => void;
  onNavigateToRentals?: () => void;
  onOpenChat?: (contactId: string) => void;
  wishlistIds: string[];
  onToggleWishlist: (itemId: string) => void;
}

// Icon mapper for categories
const ICON_MAP: Record<string, React.ElementType> = {
  Wrench,
  Tv,
  Camera,
  Activity,
  Trees,
  Sparkles,
  Armchair,
  Hammer,
  PartyPopper,
  BookOpen,
  Compass,
  Wheat
};

// Helper for dynamic distance display
function getDistanceDisplay(item: Item, userArea?: string): string {
  if (userArea && item.area.toLowerCase() === userArea.toLowerCase()) {
    return '0.8 km away';
  }
  const code = (item.id.charCodeAt(0) + item.id.charCodeAt(item.id.length - 1)) % 25;
  const dist = (0.9 + (code * 0.1)).toFixed(1);
  return `${dist} km away`;
}

// Helper for rating and review count
function getRatingAndReviews(item: Item): { rating: string; count: number } {
  const rating = item.owner?.rating ? Number(item.owner.rating).toFixed(1) : '4.9';
  const count = item.owner?.ratingCount || (14 + (item.id.charCodeAt(0) % 25));
  return { rating, count };
}

export const ExploreScreen: React.FC<ExploreScreenProps> = ({
  user,
  selectedCity,
  searchQuery,
  onSelectItem,
  onNavigateToListing,
  onNavigateToRentals,
  onOpenChat,
  wishlistIds,
  onToggleWishlist
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sections, setSections] = useState<{
    nearYou: Item[];
    popular: Item[];
    recentlyAdded: Item[];
    budgetFriendly: Item[];
    topRated?: Item[];
    freshRecommendations?: Item[];
  }>({
    nearYou: [],
    popular: [],
    recentlyAdded: [],
    budgetFriendly: [],
    topRated: [],
    freshRecommendations: []
  });
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [activeBookings, setActiveBookings] = useState<any[]>([]);

  // Recently Viewed Items Tracking (Priority #4)
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('bc_recently_viewed');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleSelectItemWithHistory = (item: Item) => {
    try {
      const updated = [item.id, ...recentlyViewedIds.filter((id) => id !== item.id)].slice(0, 10);
      setRecentlyViewedIds(updated);
      localStorage.setItem('bc_recently_viewed', JSON.stringify(updated));
    } catch {}
    onSelectItem(item);
  };

  // Filters
  const [selectedCondition, setSelectedCondition] = useState<string>('ALL');
  const [deliveryFilter, setDeliveryFilter] = useState(false);
  const [priceFilter, setPriceFilter] = useState<'ALL' | 'UNDER_75' | '75_150' | 'ABOVE_150'>('ALL');
  const [availableTodayFilter, setAvailableTodayFilter] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState<'ALL' | '2KM' | '5KM'>('ALL');
  const [ratingFilter, setRatingFilter] = useState<'ALL' | '4_5'>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'lowest_price' | 'highest_price' | 'popular' | 'distance'>('newest');

  // Carousel refs
  const nearYouRef = useRef<HTMLDivElement>(null);
  const popularRef = useRef<HTMLDivElement>(null);
  const budgetRef = useRef<HTMLDivElement>(null);
  const topRatedRef = useRef<HTMLDivElement>(null);
  const recentRef = useRef<HTMLDivElement>(null);

  // Fetch categories, sections and live rental activity
  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await api.getCategories();
        setCategories(catRes.categories || []);

        const secRes = await api.getSections(selectedCity);
        if (secRes.sections) {
          setSections({
            nearYou: Array.isArray(secRes.sections.nearYou) ? secRes.sections.nearYou : [],
            popular: Array.isArray(secRes.sections.popular) ? secRes.sections.popular : [],
            budgetFriendly: Array.isArray(secRes.sections.budgetFriendly) ? secRes.sections.budgetFriendly : [],
            topRated: Array.isArray(secRes.sections.topRated) ? secRes.sections.topRated : [],
            freshRecommendations: Array.isArray(secRes.sections.freshRecommendations)
              ? secRes.sections.freshRecommendations
              : (Array.isArray(secRes.sections.recentlyAdded) ? secRes.sections.recentlyAdded : []),
            recentlyAdded: Array.isArray(secRes.sections.recentlyAdded)
              ? secRes.sections.recentlyAdded
              : (Array.isArray(secRes.sections.freshRecommendations) ? secRes.sections.freshRecommendations : [])
          });
        }

        // Live Rental Activity for user
        const bookRes = await api.getBookings('borrower');
        if (bookRes.bookings) {
          const live = bookRes.bookings.filter((b: any) =>
            ['CONFIRMED', 'ACTIVE', 'READY_FOR_PICKUP', 'PENDING', 'EXTENSION_REQUESTED'].includes(b.status)
          );
          setActiveBookings(live);
        }
      } catch (err) {
        console.error('Failed to load explore data', err);
      }
    };
    fetchData();
  }, [selectedCity]);

  // Search trigger when query, category, or filters change
  useEffect(() => {
    const runSearch = async () => {
      if (
        !searchQuery &&
        !selectedCategory &&
        selectedCondition === 'ALL' &&
        !deliveryFilter &&
        !availableTodayFilter &&
        distanceFilter === 'ALL' &&
        ratingFilter === 'ALL' &&
        priceFilter === 'ALL' &&
        sortOrder === 'newest'
      ) {
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const params: Record<string, string> = {
          city: selectedCity === 'All India' ? 'All' : selectedCity
        };
        if (searchQuery) params.q = searchQuery;
        if (selectedCategory) params.category = selectedCategory;
        if (selectedCondition !== 'ALL') params.condition = selectedCondition;
        if (deliveryFilter) params.deliveryOnly = 'true';
        if (priceFilter === 'UNDER_75') params.maxPrice = '75';
        if (priceFilter === '75_150') {
          params.minPrice = '75';
          params.maxPrice = '150';
        }
        if (priceFilter === 'ABOVE_150') params.minPrice = '150';
        if (sortOrder !== 'newest' && sortOrder !== 'distance') params.sort = sortOrder;

        const res = await api.searchItems(params);
        let items = res.items || [];

        // Apply rating filter
        if (ratingFilter === '4_5') {
          items = items.filter((it: any) => (it.owner?.rating ? Number(it.owner.rating) >= 4.5 : true));
        }

        // Apply distance filter
        if (distanceFilter === '2KM') {
          items = items.filter((it: any) =>
            it.area.toLowerCase() === user.area.toLowerCase() || it.area.toLowerCase().includes('indiranagar')
          );
        }

        // Apply sort by distance
        if (sortOrder === 'distance') {
          items.sort((a: any, b: any) => {
            const aDist = a.area.toLowerCase() === user.area.toLowerCase() ? 0.8 : 2.5;
            const bDist = b.area.toLowerCase() === user.area.toLowerCase() ? 0.8 : 2.5;
            return aDist - bDist;
          });
        }

        setSearchResults(items);
      } catch (err) {
        console.error('Search failed', err);
      }
    };

    runSearch();
  }, [searchQuery, selectedCategory, selectedCondition, deliveryFilter, priceFilter, availableTodayFilter, distanceFilter, ratingFilter, sortOrder, selectedCity]);

  const scrollCarousel = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const allKnownItems = [
    ...(sections.popular || []),
    ...(sections.nearYou || []),
    ...(sections.freshRecommendations || []),
    ...(sections.recentlyAdded || []),
    ...(sections.budgetFriendly || []),
    ...(sections.topRated || []),
    ...(searchResults || [])
  ].filter((it, idx, arr) => idx === arr.findIndex((x) => x.id === it.id));

  const recentlyViewedItems = recentlyViewedIds
    .map((id) => allKnownItems.find((it) => it.id === id))
    .filter((it): it is Item => Boolean(it));

  return (
    <div className="space-y-8 pb-16">
      {/* 1. OLX-Style Hyperlocal Marketplace Hero Section */}
      <div className="relative rounded-2xl bg-[#002f34] text-white p-6 sm:p-8 lg:p-10 shadow-sm overflow-hidden border border-[#003d44]">
        {/* Ambient background glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#23e5db]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Value Proposition, Trust Signals & CTAs */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-xs font-bold text-[#23e5db] uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-[#23e5db]" />
              <span>Hyperlocal Equipment Sharing • {selectedCity}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight font-['Roboto',sans-serif]">
              Borrow Anything in Your Neighborhood in Minutes.
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl font-normal">
              Why spend thousands buying tools, cameras, projectors, or camping gear you only need for a few hours? Access 1,200+ equipment items from verified neighbors with flat ₹15 platform fee, dual-OTP handover security, and zero security deposit.
            </p>

            {/* Trust Indicators Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xs">
                <ShieldCheck className="w-4 h-4 text-[#23e5db] shrink-0" />
                <span className="text-[11px] font-bold text-slate-200">Verified Lenders</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xs">
                <Clock className="w-4 h-4 text-[#23e5db] shrink-0" />
                <span className="text-[11px] font-bold text-slate-200">Dual-OTP Safety</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xs">
                <Zap className="w-4 h-4 text-[#23e5db] shrink-0" />
                <span className="text-[11px] font-bold text-slate-200">Instant Refund</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xs">
                <Award className="w-4 h-4 text-[#23e5db] shrink-0" />
                <span className="text-[11px] font-bold text-slate-200">₹15 Flat Fee</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  const el = document.getElementById('marketplace-catalog');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3 rounded-lg bg-[#23e5db] hover:bg-[#1fd3ca] text-[#002f34] text-xs sm:text-sm font-black shadow-md transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider hover:shadow-lg active:scale-95"
              >
                <span>Explore Rentals</span>
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                onClick={onNavigateToListing}
                className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/30 text-white text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider backdrop-blur-sm active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-[#23e5db]" />
                <span>+ List Equipment</span>
              </button>
            </div>
          </div>

          {/* Right Column: Dynamic Equipment Showcase Collage */}
          <div className="hidden lg:flex lg:col-span-5 relative justify-center items-center">
            <div className="relative w-full max-w-sm h-72">
              {/* Card 1: Bosch Drill (Top-left) */}
              <div className="absolute -top-1 left-0 w-48 bg-white rounded-xl shadow-2xl p-2.5 border border-slate-200 transform -rotate-3 hover:rotate-0 hover:scale-105 hover:z-30 transition-all duration-300">
                <div className="relative h-20 rounded-lg overflow-hidden bg-slate-100 mb-1.5">
                  <img
                    src="https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80"
                    alt="Bosch Drill"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[8px] font-black uppercase">
                    ⚡ Available Today
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 truncate">Bosch 18V Drill</span>
                  <span className="text-xs font-black text-[#002f34] shrink-0">₹50/hr</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Indiranagar • 1.2 km</span>
                  <span className="font-bold text-amber-600">⭐ 4.9</span>
                </div>
              </div>

              {/* Card 2: Sony Alpha A7 IV (Top-right) */}
              <div className="absolute top-6 -right-2 w-52 bg-white rounded-xl shadow-2xl p-2.5 border border-slate-200 transform rotate-4 hover:rotate-0 hover:scale-105 hover:z-30 transition-all duration-300">
                <div className="relative h-24 rounded-lg overflow-hidden bg-slate-100 mb-1.5">
                  <img
                    src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80"
                    alt="Sony Alpha A7 IV"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-[#ffce32] text-[#002f34] text-[8px] font-black uppercase">
                    FEATURED
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 truncate">Sony Alpha A7 IV</span>
                  <span className="text-xs font-black text-[#002f34] shrink-0">₹180/hr</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Koramangala • 2.4 km</span>
                  <span className="font-bold text-amber-600">⭐ 5.0</span>
                </div>
              </div>

              {/* Card 3: DJI Mini 3 Pro Drone (Bottom-center) */}
              <div className="absolute bottom-0 left-6 w-56 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-2.5 border border-teal-200/80 hover:scale-105 hover:z-30 transition-all duration-300">
                <div className="flex items-center gap-2">
                  <img
                    src="https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=300&q=80"
                    alt="DJI Drone"
                    className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-slate-900 truncate">DJI Mini 3 Pro 4K</span>
                      <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                    </div>
                    <div className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <span className="font-black text-[#002f34]">₹150/hr</span>
                      <span>•</span>
                      <span>₹1,200/day</span>
                    </div>
                  </div>
                  <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                    Dual-OTP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1.5. Live Rental Activity Center (Priority #4: Rental Activity Dashboard) */}
      {activeBookings.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-teal-600/30 p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="text-base sm:text-lg font-black text-[#003B3B] tracking-tight">
                Your Live Rental Activity
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                {activeBookings.length} Active
              </span>
            </div>
            {onNavigateToRentals && (
              <button
                onClick={onNavigateToRentals}
                className="text-xs font-bold text-[#003B3B] hover:text-[#16D9CC] flex items-center gap-1 cursor-pointer"
              >
                <span>View All Rentals</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeBookings.slice(0, 3).map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-xl bg-[#F5F7F8] border border-[#E5E9ED] hover:border-teal-400 transition-all flex flex-col justify-between space-y-2.5"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={b.item?.images?.[0]?.url || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=300&q=80'}
                    alt={b.item?.title}
                    className="w-12 h-12 rounded-lg object-cover bg-white border border-[#E5E9ED] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-[#102A2A] truncate">{b.item?.title}</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                        {b.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#718096] mt-0.5 flex items-center gap-2">
                      <span>Lender: {b.lender?.name || 'Verified Lender'}</span>
                      <span>•</span>
                      <span className="font-bold text-[#003B3B]">₹{b.hourlyRate}/hr</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5E9ED] flex items-center justify-between text-xs font-bold">
                  {onOpenChat && (
                    <button
                      onClick={() => onOpenChat(b.lenderId)}
                      className="text-[#003B3B] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                      <span>Coordinate Handover</span>
                    </button>
                  )}
                  {onNavigateToRentals && (
                    <button
                      onClick={onNavigateToRentals}
                      className="px-2.5 py-1 rounded bg-[#003B3B] text-white hover:bg-[#002b2b] text-[11px] font-bold cursor-pointer"
                    >
                      OTP / Actions
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1.6. Recently Viewed Equipment Shelf (Priority #4: Smart Discovery) */}
      {recentlyViewedItems.length > 0 && !isSearching && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#102A2A] flex items-center gap-2">
                <span>Recently Viewed Equipment</span>
                <Clock className="w-4 h-4 text-[#718096]" />
              </h3>
              <p className="text-xs text-[#718096]">Resume where you left off</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollCarousel(recentRef, 'left')}
                className="p-1.5 rounded-full bg-white border border-[#E5E9ED] hover:bg-slate-100 text-slate-600 shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollCarousel(recentRef, 'right')}
                className="p-1.5 rounded-full bg-white border border-[#E5E9ED] hover:bg-slate-100 text-slate-600 shadow-2xs cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={recentRef}
            className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2"
          >
            {recentlyViewedItems.map((item) => (
              <div key={item.id} className="w-68 sm:w-72 shrink-0">
                <EquipmentCard
                  item={item}
                  onSelect={() => handleSelectItemWithHistory(item)}
                  isWishlisted={wishlistIds.includes(item.id)}
                  onToggleWishlist={() => onToggleWishlist(item.id)}
                  userArea={user.area}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. 12 Official Equipment Categories */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">Explore by Category</h3>
            <p className="text-xs sm:text-sm text-slate-500">Discover verified equipment available to rent in your neighborhood</p>
          </div>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 underline cursor-pointer"
            >
              Clear Category Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {categories.map((cat) => {
            const Icon = ICON_MAP[cat.icon] || Wrench;
            const isSelected = selectedCategory === cat.slug;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(isSelected ? null : cat.slug)}
                className={`p-4 sm:p-5 rounded-2xl text-left transition-all duration-200 border cursor-pointer flex flex-col justify-between min-h-[120px] sm:min-h-[130px] group hover:-translate-y-0.5 ${
                  isSelected
                    ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/30 shadow-sm'
                    : 'bg-white border-slate-200/80 hover:border-teal-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-[#002f34] text-[#23e5db]' : 'bg-teal-50 text-teal-700 group-hover:bg-teal-100'
                  }`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {cat._count?.items || 12}
                  </span>
                </div>
                <div className="text-sm sm:text-base font-bold text-slate-800 leading-tight group-hover:text-teal-800 transition-colors">
                  {cat.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Comprehensive Filter Controls Bar */}
      <div id="marketplace-catalog" className="pt-5 border-t border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Price Range Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-500 mr-1 flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <span>Price:</span>
            </span>
            {[
              { id: 'ALL', label: 'All Prices' },
              { id: 'UNDER_75', label: 'Under ₹75/hr' },
              { id: '75_150', label: '₹75 – ₹150/hr' },
              { id: 'ABOVE_150', label: '₹150+/hr' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPriceFilter(p.id as any)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                  priceFilter === p.id
                    ? 'bg-[#002f34] text-white border-[#002f34] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Grid vs Map Toggle */}
          <div className="flex rounded-xl bg-slate-200/80 p-1 text-sm font-bold shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'map' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span>Map View</span>
            </button>
          </div>
        </div>

        {/* Second Row of Filters: Distance, Rating, Availability, Delivery, Condition, Sort, Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Distance Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-xl">
              <span className="text-xs font-bold text-slate-500 px-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                <span>Radius:</span>
              </span>
              {[
                { id: 'ALL', label: 'All' },
                { id: '2KM', label: '< 2 km' },
                { id: '5KM', label: '< 5 km' }
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDistanceFilter(d.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    distanceFilter === d.id
                      ? 'bg-[#003B3B] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Rating Filter Pill */}
            <button
              onClick={() => setRatingFilter(ratingFilter === '4_5' ? 'ALL' : '4_5')}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                ratingFilter === '4_5'
                  ? 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-400/40 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Star className={`w-4 h-4 ${ratingFilter === '4_5' ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
              <span>⭐ 4.5+ Rated</span>
            </button>

            {/* Available Today Toggle */}
            <button
              onClick={() => setAvailableTodayFilter(!availableTodayFilter)}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                availableTodayFilter
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/40'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Zap className={`w-4 h-4 ${availableTodayFilter ? 'text-emerald-600 fill-emerald-600' : 'text-slate-400'}`} />
              <span>Available Today</span>
            </button>

            {/* Doorstep Delivery Toggle */}
            <button
              onClick={() => setDeliveryFilter(!deliveryFilter)}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                deliveryFilter
                  ? 'bg-teal-50 text-teal-800 border-teal-300 ring-1 ring-teal-400/40'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Truck className={`w-4 h-4 ${deliveryFilter ? 'text-teal-600' : 'text-slate-400'}`} />
              <span>Doorstep Delivery</span>
            </button>

            {/* Condition Dropdown */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-700">
              <span className="font-semibold text-slate-500">Condition:</span>
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="bg-transparent border-none outline-none font-bold text-slate-800 cursor-pointer text-sm"
              >
                <option value="ALL">All Conditions</option>
                <option value="EXCELLENT">Like New / Excellent</option>
                <option value="VERY_GOOD">Very Good</option>
                <option value="GOOD">Good</option>
              </select>
            </div>

            {/* Active Filters Reset */}
            {(priceFilter !== 'ALL' || availableTodayFilter || deliveryFilter || selectedCondition !== 'ALL' || selectedCategory || distanceFilter !== 'ALL' || ratingFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setPriceFilter('ALL');
                  setAvailableTodayFilter(false);
                  setDeliveryFilter(false);
                  setSelectedCondition('ALL');
                  setSelectedCategory(null);
                  setDistanceFilter('ALL');
                  setRatingFilter('ALL');
                }}
                className="px-3 py-2 text-sm text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-700">
            <span className="font-semibold text-slate-500">Sort by:</span>
            <select
              value={sortOrder}
              onChange={(e: any) => setSortOrder(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-[#002f34] cursor-pointer text-sm"
            >
              <option value="newest">Recently Added</option>
              <option value="distance">Distance: Nearest First</option>
              <option value="lowest_price">Price: Low to High</option>
              <option value="highest_price">Price: High to Low</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Map View Visualization */}
      {viewMode === 'map' && (
        <div className="rounded-3xl bg-slate-100 border border-slate-200 p-6 relative overflow-hidden min-h-[360px] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-teal-600" />
              <span className="text-sm font-bold text-slate-900">
                Interactive Hyperlocal Equipment Map ({selectedCity})
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">Approximate neighborhood pins for privacy</span>
          </div>

          {/* Graphical Map Representation */}
          <div className="relative w-full h-64 bg-emerald-50/50 rounded-2xl border border-teal-200 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* Neighborhood Pins */}
            <div className="absolute top-1/4 left-1/3 flex flex-col items-center cursor-pointer group">
              <div className="px-2 py-1 rounded-lg bg-teal-600 text-white text-[10px] font-bold shadow-md group-hover:scale-105 transition-transform">
                Indiranagar • 6 items
              </div>
              <div className="w-3 h-3 bg-teal-600 rotate-45 -mt-1.5" />
            </div>

            <div className="absolute top-1/2 right-1/3 flex flex-col items-center cursor-pointer group">
              <div className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold shadow-md group-hover:scale-105 transition-transform">
                Koramangala • 4 items
              </div>
              <div className="w-3 h-3 bg-emerald-600 rotate-45 -mt-1.5" />
            </div>

            <div className="absolute bottom-1/4 left-1/2 flex flex-col items-center cursor-pointer group">
              <div className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold shadow-md group-hover:scale-105 transition-transform">
                HSR Layout • 5 items
              </div>
              <div className="w-3 h-3 bg-blue-600 rotate-45 -mt-1.5" />
            </div>

            <p className="text-xs text-teal-800 font-semibold bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-xs">
              Showing active lender clusters in {selectedCity}. Click an equipment card below to view details and book.
            </p>
          </div>
        </div>
      )}

      {/* 5. SEARCH RESULTS VIEW (If searching) */}
      {isSearching ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#002f34] tracking-tight">
                {searchQuery ? (
                  <>
                    Search Results for <span className="underline decoration-[#23e5db] decoration-2">&ldquo;{searchQuery}&rdquo;</span>
                  </>
                ) : (
                  'Filtered Equipment'
                )}
                <span className="text-xs font-normal text-slate-500 ml-2">({searchResults.length} results)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Sorted by best word match, equipment specifications, and proximity in {selectedCity}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSelectedCondition('ALL');
                setDeliveryFilter(false);
                setIsSearching(false);
              }}
              className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs text-[#002f34] font-bold transition-all cursor-pointer shadow-xs"
            >
              Reset Filters
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-md border border-slate-200">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-[#002f34]">No equipment found matching &ldquo;{searchQuery}&rdquo;</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Try searching with popular keywords below or check spelling:
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-md mx-auto">
                {['Drill', 'Camera', 'Sony', 'Projector', 'Tent', 'Pressure Washer', 'Drone'].map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => {
                      if (searchQuery !== kw) {
                        const evt = new CustomEvent('search_select', { detail: kw });
                        window.dispatchEvent(evt);
                      }
                    }}
                    className="px-3 py-1 rounded-full bg-slate-100 hover:bg-[#002f34] hover:text-white text-xs font-semibold text-[#002f34] transition-colors cursor-pointer"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {searchResults.map((item) => (
                <EquipmentCard
                  key={item.id}
                  item={item}
                  onSelect={() => handleSelectItemWithHistory(item)}
                  isWishlisted={wishlistIds.includes(item.id)}
                  onToggleWishlist={() => onToggleWishlist(item.id)}
                  userArea={user.area}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 6. NORMAL DASHBOARD CAROUSELS */
        <div className="space-y-10">
          {/* Section A: Available Near You */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-[#002f34] flex items-center gap-2">
                  <span>Available Near You in {selectedCity}</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Pick up today within 15–20 minutes in your neighborhood</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollCarousel(nearYouRef, 'left')}
                  className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 shadow-xs cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scrollCarousel(nearYouRef, 'right')}
                  className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 shadow-xs cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div
              ref={nearYouRef}
              className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-3"
            >
              {sections.nearYou.map((item) => (
                <div key={item.id} className="w-72 shrink-0">
                  <EquipmentCard
                    item={item}
                    onSelect={() => handleSelectItemWithHistory(item)}
                    isWishlisted={wishlistIds.includes(item.id)}
                    onToggleWishlist={() => onToggleWishlist(item.id)}
                    userArea={user.area}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Popular in Your Area */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-[#002f34]">Most Borrowed Equipment</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Frequently rented tools and gear with highest verified ratings</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollCarousel(popularRef, 'left')}
                  className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 shadow-xs cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scrollCarousel(popularRef, 'right')}
                  className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 shadow-xs cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div
              ref={popularRef}
              className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-3"
            >
              {sections.popular.map((item) => (
                <div key={item.id} className="w-72 shrink-0">
                  <EquipmentCard
                    item={item}
                    onSelect={() => handleSelectItemWithHistory(item)}
                    isWishlisted={wishlistIds.includes(item.id)}
                    onToggleWishlist={() => onToggleWishlist(item.id)}
                    userArea={user.area}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section C: Budget-Friendly Rentals (under ₹75/hr) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-[#002f34]">Budget-Friendly Rentals</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Under ₹75 per hour — low cost DIY & home improvement gear</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollCarousel(budgetRef, 'left')}
                  className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 shadow-xs cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scrollCarousel(budgetRef, 'right')}
                  className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 shadow-xs cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div
              ref={budgetRef}
              className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-3"
            >
              {sections.budgetFriendly.map((item) => (
                <div key={item.id} className="w-72 shrink-0">
                  <EquipmentCard
                    item={item}
                    onSelect={() => handleSelectItemWithHistory(item)}
                    isWishlisted={wishlistIds.includes(item.id)}
                    onToggleWishlist={() => onToggleWishlist(item.id)}
                    userArea={user.area}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section D: Top-Rated Equipment */}
          {sections.topRated && sections.topRated.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-[#002f34]">Top-Rated Equipment</h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">Highest verified neighbor feedback and reliability scores</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => scrollCarousel(topRatedRef, 'left')}
                    className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 shadow-xs cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => scrollCarousel(topRatedRef, 'right')}
                    className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 shadow-xs cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div
                ref={topRatedRef}
                className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-3"
              >
                {sections.topRated.map((item) => (
                  <div key={item.id} className="w-72 shrink-0">
                    <EquipmentCard
                      item={item}
                      onSelect={() => handleSelectItemWithHistory(item)}
                      isWishlisted={wishlistIds.includes(item.id)}
                      onToggleWishlist={() => onToggleWishlist(item.id)}
                      userArea={user.area}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section E: OLX Signature "Fresh recommendations" Grid */}
          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-[#002f34] tracking-tight font-['Roboto',sans-serif]">
                  Fresh recommendations
                </h3>
                <p className="text-xs text-slate-500">
                  New equipment listings in your area (strictly non-duplicate)
                </p>
              </div>
            </div>

            {(() => {
              const freshItems = (Array.isArray(sections.freshRecommendations) && sections.freshRecommendations.length > 0)
                ? sections.freshRecommendations
                : (Array.isArray(sections.recentlyAdded) && sections.recentlyAdded.length > 0)
                  ? sections.recentlyAdded
                  : [];

              if (freshItems.length === 0) {
                return (
                  <div className="py-12 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                    <p className="text-slate-500 font-medium text-sm">No fresh recommendations available right now in this location.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {freshItems.map((item) => (
                    <EquipmentCard
                      key={item.id}
                      item={item}
                      onSelect={() => handleSelectItemWithHistory(item)}
                      isWishlisted={wishlistIds.includes(item.id)}
                      onToggleWishlist={() => onToggleWishlist(item.id)}
                      userArea={user.area}
                    />
                  ))}
                </div>
              );
            })()}

            {/* OLX-Style Centered "Load more" Button */}
            <div className="text-center pt-8 pb-4">
              <button
                type="button"
                className="px-8 py-3 rounded border-2 border-[#002f34] bg-white hover:bg-slate-50 text-[#002f34] font-black text-sm tracking-wide transition-all cursor-pointer font-['Roboto',sans-serif]"
              >
                Load more
              </button>
            </div>
          </div>

          {/* Top Verified Neighborhood Lenders Spotlight */}
          <div className="bg-gradient-to-br from-[#003B3B] to-[#002525] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg">
            <div className="relative z-10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16D9CC]/20 text-[#16D9CC] text-xs font-bold border border-[#16D9CC]/30 mb-2">
                    <Award className="w-3.5 h-3.5" />
                    <span>Community Trust Network</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Top Verified Lenders in {selectedCity}
                  </h3>
                  <p className="text-xs sm:text-sm text-teal-100/80 mt-1 max-w-xl">
                    Borrow directly from neighbors with 100% ID verification, dual-OTP handover records, and exceptional reviews.
                  </p>
                </div>
                {onNavigateToListing && (
                  <button
                    onClick={onNavigateToListing}
                    className="px-4 py-2.5 rounded-xl bg-[#16D9CC] hover:bg-[#13c0b5] text-[#003B3B] font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Become a Verified Lender</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    name: 'Rahul Sharma',
                    area: 'Indiranagar, Bengaluru',
                    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
                    itemsCount: '6 tools listed',
                    rating: '4.9',
                    reviews: 28,
                    responseRate: '15 min response',
                    badge: 'Super Lender'
                  },
                  {
                    name: 'Priya Patel',
                    area: 'Koramangala, Bengaluru',
                    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
                    itemsCount: '4 appliances',
                    rating: '4.8',
                    reviews: 19,
                    responseRate: '10 min response',
                    badge: 'Fast Responder'
                  },
                  {
                    name: 'Amit Verma',
                    area: 'HSR Layout, Bengaluru',
                    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
                    itemsCount: '8 camera gears',
                    rating: '5.0',
                    reviews: 34,
                    responseRate: '5 min response',
                    badge: 'Pro Equipment'
                  }
                ].map((lender, idx) => (
                  <div
                    key={idx}
                    className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:border-[#16D9CC]/50 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={lender.avatar}
                          alt={lender.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-[#16D9CC]"
                        />
                        <span className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-500 rounded-full text-white">
                          <CheckCircle2 className="w-3 h-3 fill-current" />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-white truncate">{lender.name}</h4>
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#16D9CC]/20 text-[#16D9CC] border border-[#16D9CC]/30 shrink-0">
                            {lender.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-teal-200/80 truncate mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0 text-[#16D9CC]" />
                          <span>{lender.area}</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center py-2 px-3 rounded-lg bg-black/20 text-xs">
                      <div>
                        <div className="text-[10px] text-teal-200/70">Rating & Reviews</div>
                        <div className="font-bold text-white flex items-center justify-center gap-1 mt-0.5">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{lender.rating}</span>
                          <span className="text-[10px] text-teal-200/60 font-normal">({lender.reviews})</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-teal-200/70">Response Time</div>
                        <div className="font-bold text-[#16D9CC] text-xs mt-0.5">{lender.responseRate}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[11px] text-teal-100/90 font-medium">{lender.itemsCount}</span>
                      {onOpenChat && (
                        <button
                          onClick={() => onOpenChat('user_rahul')}
                          className="text-[#16D9CC] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Inquire Equipment</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* OLX-Style Multi-Column Footer Banner */}
          <div className="pt-10 border-t border-slate-200 text-xs text-slate-600 space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <div className="font-black text-[#002f34] uppercase tracking-wider mb-2">POPULAR LOCATIONS</div>
                <ul className="space-y-1 text-[11px] text-slate-500">
                  <li className="hover:text-[#002f34] cursor-pointer">Bengaluru</li>
                  <li className="hover:text-[#002f34] cursor-pointer">Mumbai</li>
                  <li className="hover:text-[#002f34] cursor-pointer">Delhi NCR</li>
                  <li className="hover:text-[#002f34] cursor-pointer">Pune</li>
                  <li className="hover:text-[#002f34] cursor-pointer">Hyderabad</li>
                </ul>
              </div>

              <div>
                <div className="font-black text-[#002f34] uppercase tracking-wider mb-2">TRENDING CATEGORIES</div>
                <ul className="space-y-1 text-[11px] text-slate-500">
                  <li className="hover:text-[#002f34] cursor-pointer">Power Tools & Drills</li>
                  <li className="hover:text-[#002f34] cursor-pointer">Cameras & Lenses</li>
                  <li className="hover:text-[#002f34] cursor-pointer">Camping Tents & Gear</li>
                  <li className="hover:text-[#002f34] cursor-pointer">Home Cleaning Appliances</li>
                  <li className="hover:text-[#002f34] cursor-pointer">Lawn & Garden Equipment</li>
                </ul>
              </div>

              <div>
                <div className="font-black text-[#002f34] uppercase tracking-wider mb-2">ABOUT BORROWCIRCLE</div>
                <ul className="space-y-1 text-[11px] text-slate-500">
                  <li className="hover:text-[#002f34] cursor-pointer">How Hyperlocal Sharing Works</li>
                  <li className="hover:text-[#002f34] cursor-pointer">Dual-OTP Security System</li>
                  <li className="hover:text-[#002f34] cursor-pointer">15-Min Inspection Window</li>
                  <li className="hover:text-[#002f34] cursor-pointer">Eco CO₂ Savings Tracker</li>
                  <li className="hover:text-[#002f34] cursor-pointer">Careers & Press</li>
                </ul>
              </div>

              <div>
                <div className="font-black text-[#002f34] uppercase tracking-wider mb-2">LEGAL & TRUST</div>
                <ul className="space-y-1 text-[11px] text-slate-500">
                  <li className="hover:text-[#002f34] cursor-pointer">Digital Rental Agreement</li>
                  <li className="hover:text-[#002f34] cursor-pointer">Aadhaar Identity Verification</li>
                  <li className="hover:text-[#002f34] cursor-pointer">Community Guarantee Protection</li>
                  <li className="hover:text-[#002f34] cursor-pointer">Terms of Service</li>
                  <li className="hover:text-[#002f34] cursor-pointer">Privacy Policy</li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500">
              <span className="font-bold text-[#002f34]">BorrowCircle India • Hyperlocal Peer-to-Peer Rental Marketplace</span>
              <span>All rights reserved © 2026 BorrowCircle</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable Professional OLX-Style Equipment Card (Zero Overlap, Clean Proportions, Large & Readable)
export const EquipmentCard: React.FC<{
  item: Item;
  onSelect: () => void;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
  userArea?: string;
}> = ({ item, onSelect, isWishlisted, onToggleWishlist, userArea }) => {
  const categorySlug = item.category?.slug || '';
  const fallbackByCategory: Record<string, string> = {
    'tools-hardware': 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&w=800&q=80',
    'cameras-photography': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
    'electronics': 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
    'travel-equipment': 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80',
    'home-appliances': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    'sports-fitness': 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
    'construction-equipment': 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=800&q=80',
    'gardening-equipment': 'https://images.unsplash.com/photo-1622372738946-62e02505feb3?auto=format&fit=crop&w=800&q=80',
    'event-equipment': 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80'
  };
  const defaultImage = fallbackByCategory[categorySlug] || 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&w=800&q=80';

  const primaryImage =
    item.images?.find((img) => img.isPrimary)?.url ||
    item.images?.[0]?.url ||
    defaultImage;

  const distance = getDistanceDisplay(item, userArea);
  const { rating, count } = getRatingAndReviews(item);

  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-2xl border border-slate-200 hover:border-teal-400 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden group cursor-pointer h-full min-h-[465px]"
    >
      {/* 1. Card Media Container - Large & Cinematic */}
      <div className="relative h-56 sm:h-60 w-full bg-slate-100 overflow-hidden shrink-0">
        <img
          src={primaryImage}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = defaultImage;
          }}
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5 z-10">
          <span className="px-2.5 py-1 rounded-md bg-[#ffce32] text-[#002f34] text-xs font-black uppercase tracking-wider shadow-xs">
            FEATURED
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-600/95 text-white text-xs font-bold tracking-tight shadow-xs flex items-center gap-1 backdrop-blur-xs">
            <Zap className="w-3 h-3 fill-current" />
            <span>Available today</span>
          </span>
        </div>

        {/* Wishlist Heart Button - Easy Tap Target */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist();
          }}
          className="absolute top-3 right-3 p-2.5 rounded-full bg-white/95 text-[#002f34] hover:text-rose-600 hover:scale-110 shadow-sm transition-all cursor-pointer z-10"
          title="Save to Wishlist"
        >
          <Heart className={`w-5 h-5 transition-transform active:scale-75 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>
      </div>

      {/* 2. Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Price Typography */}
          <div className="flex items-baseline justify-between gap-1 flex-wrap">
            <div className="text-2xl sm:text-3xl font-black text-[#003B3B] tracking-tight">
              ₹ {item.hourlyRate}
              <span className="text-sm font-semibold text-slate-500 ml-1">/hr</span>
            </div>
            {item.dailyRate ? (
              <span className="text-xs sm:text-sm font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                ₹{item.dailyRate}/day
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Zero Deposit
              </span>
            )}
          </div>

          {/* Product Name */}
          <h4 className="mt-1.5 text-base sm:text-lg font-bold text-[#102A2A] group-hover:text-teal-700 transition-colors line-clamp-2 min-h-[3rem] leading-snug">
            {item.title}
          </h4>

          {/* Location & Distance */}
          <div className="mt-2 flex items-center gap-1.5 text-xs sm:text-sm text-[#718096] font-medium">
            <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="truncate">{item.area}, {item.city}</span>
            <span className="text-slate-300">•</span>
            <span className="text-teal-700 font-bold shrink-0">{distance}</span>
          </div>
        </div>

        {/* Rating & Verified Owner Info */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-medium">
          <div className="flex items-center gap-1.5 text-slate-700 truncate max-w-[150px]">
            <span className="truncate font-bold text-slate-900">{item.owner?.name?.split(' ')[0] || 'Lender'}</span>
            <span className="inline-flex items-center gap-0.5 text-xs text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-amber-900 font-bold bg-amber-50 px-2.5 py-1 rounded-lg text-xs sm:text-sm shrink-0 border border-amber-200/80">
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>{rating}</span>
            <span className="text-amber-700/80 font-normal text-xs">({count})</span>
          </div>
        </div>
      </div>

      {/* 3. Card Bottom Bar: Quick Specs & Delivery Mode */}
      <div className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase flex items-center justify-between border-t border-slate-100 bg-slate-50/80 shrink-0">
        <span className="font-extrabold text-slate-700">{item.condition} • MIN {item.minHours}H</span>
        <span className="text-teal-800 font-black">{item.isDeliveryAvailable ? '⚡ DOORSTEP DELIVERY' : 'LOCAL PICKUP'}</span>
      </div>
    </div>
  );
};
