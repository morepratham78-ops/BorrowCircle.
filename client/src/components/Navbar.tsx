import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import {
  Share2,
  MapPin,
  Search,
  Heart,
  Bell,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Award,
  CheckCheck,
  X,
  Settings,
  MessageSquare,
  Plus,
  Clock,
  Repeat
} from 'lucide-react';
import { api } from '../services/api';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  wishlistCount: number;
  onNavigate: (tab: string) => void;
  activeTab: string;
  onOpenProfile?: () => void;
  onOpenWishlist?: () => void;
  onSwitchMode?: (mode: 'BORROWER' | 'LENDER') => void;
  unreadMessageCount?: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

const INDIAN_CITIES = [
  'All India', 'Bengaluru', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad',
  'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat',
  'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane'
];

const CATEGORY_SHORTCUTS = [
  'Tools & Hardware',
  'Cameras & Lenses',
  'Electronics',
  'Camping & Travel',
  'Home Appliances',
  'Sports & Fitness',
  'Construction',
  'Gardening',
  'Party & Events'
];

// Rich subcategory suggestions for equipment queries (User Request #3 & #10)
const SMART_SUBCATEGORIES: Record<string, string[]> = {
  camera: ['DSLR Cameras', 'Mirrorless Cameras', 'Camera Lenses', 'Action Cameras & GoPros'],
  drill: ['Cordless Drills', 'Hammer Drills', 'Impact Drivers', 'Rotary Drills & Bits'],
  projector: ['4K Home Theater Projectors', 'Portable Outdoor Projectors', 'Projector Screens & Tripods'],
  camp: ['4-Person Camping Tents', 'Trekking Backpacks', 'Sleeping Bags & Mats', 'Portable Camp Stoves'],
  tent: ['4-Person Camping Tents', 'Family Dome Tents', 'Waterproof Camping Tarps'],
  drone: ['4K Camera Drones', 'DJI Mini Drones', 'FPV Racing Drones', 'Drone Spare Batteries'],
  clean: ['High Pressure Washers', 'Carpet Vacuum Cleaners', 'Steam Cleaners'],
  washer: ['Car Pressure Washers', 'High Pressure Jet Washers', 'Patio Cleaners'],
  audio: ['Bluetooth Party Speakers', 'PA Sound Systems', 'Wireless Lapel Mics', 'DJ Mixers'],
  speaker: ['JBL PartyBox Speakers', 'PA Sound Systems', 'Outdoor Waterproof Speakers'],
  tool: ['Power Drills & Drivers', 'Circular Saws', 'Angle Grinders', 'Tool Kits & Sets'],
  saw: ['Circular Saws', 'Jigsaws', 'Miter Saws', 'Reciprocating Saws'],
  lawn: ['Lawn Mowers', 'Hedge Trimmers', 'Leaf Blowers', 'Garden Tillers']
};

function getSmartSubcategories(query: string): string[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  for (const [key, list] of Object.entries(SMART_SUBCATEGORIES)) {
    if (q.includes(key) || key.includes(q)) {
      return list;
    }
  }
  return [];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  selectedCity,
  onCityChange,
  searchQuery,
  onSearchChange,
  wishlistCount,
  onNavigate,
  activeTab,
  onOpenProfile,
  onOpenWishlist,
  onSwitchMode,
  unreadMessageCount = 0
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [suggestItems, setSuggestItems] = useState<any[]>([]);
  const [suggestCategories, setSuggestCategories] = useState<any[]>([]);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      if (res.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (_err) {
      // Silently fail
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search suggestions with debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestItems([]);
      setSuggestCategories([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.getSuggestions(searchQuery, selectedCity);
        setSuggestItems(res.items || []);
        setSuggestCategories(res.categories || []);
      } catch (_e) {
        // silent
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCity]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (_err) {}
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'BOOKING': return '📦';
      case 'PAYMENT': return '💸';
      case 'OTP': return '🔐';
      case 'REVIEW': return '⭐';
      case 'SYSTEM': return '🔔';
      default: return '📢';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* 1. Main OLX-style Navigation Bar */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-3 py-2">
          
          {/* Logo & Brand in OLX signature dark navy styling */}
          <div
            className="flex items-center gap-2.5 cursor-pointer shrink-0"
            onClick={() => onNavigate('explore')}
          >
            <div className="w-10 h-10 rounded-xl bg-[#002f34] flex items-center justify-center text-[#23e5db] shadow-xs">
              <Share2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black tracking-tight text-[#002f34] uppercase font-['Roboto',sans-serif]">
                  BORROW<span className="text-[#00a49f]">CIRCLE</span>
                </span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#ffce32] text-[#002f34]">
                  INDIA
                </span>
              </div>
            </div>
          </div>

          {/* 2. Distinct Dual-Box Search - Generous Height & Readability */}
          <div className="flex-1 max-w-3xl flex items-center gap-3">
            {/* Box 1: Location Selector with Single Styled Arrow & Border */}
            <div className="relative shrink-0 hidden md:flex items-center">
              <div className="flex items-center gap-2 h-12 px-3.5 rounded-xl border-2 border-[#002f34] bg-white text-base font-bold text-[#002f34] hover:bg-slate-50 transition-colors shadow-xs">
                <MapPin className="w-5 h-5 text-teal-600 shrink-0" />
                <select
                  value={selectedCity}
                  onChange={(e) => onCityChange(e.target.value)}
                  aria-label="Select City"
                  className="appearance-none bg-transparent border-none outline-none cursor-pointer font-bold text-sm sm:text-base text-[#002f34] pr-1"
                >
                  <option value={user.city || 'Bengaluru'}>📍 {user.area ? `${user.area}, ` : ''}{user.city || 'Bengaluru'}</option>
                  {INDIAN_CITIES.map((city) => (
                    <option key={city} value={city}>{city === 'All India' ? '🇮🇳 All India (National)' : `${city}, India`}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#002f34] shrink-0 pointer-events-none" />
              </div>
            </div>

            {/* Box 2: Main Search Input with Dedicated Navy Button & Autocomplete */}
            <div ref={searchBoxRef} className="relative flex-1 min-w-[260px] max-w-[480px]">
              <div className="flex items-center h-12 rounded-xl border-2 border-[#002f34] overflow-hidden bg-white focus-within:ring-2 focus-within:ring-[#002f34]/30 transition-all shadow-xs">
                <input
                  type="text"
                  placeholder="Find Drills, Cameras, Projectors, Camping Gear..."
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsSearchFocused(false);
                      if (activeTab !== 'explore') onNavigate('explore');
                    }
                  }}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    if (activeTab !== 'explore') onNavigate('explore');
                  }}
                  className="w-full h-full pl-4 pr-2 text-base text-[#002f34] placeholder:text-sm placeholder:text-slate-400 focus:outline-none font-medium"
                />

                {/* Clear (X) Button */}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      onSearchChange('');
                      setSuggestItems([]);
                      setSuggestCategories([]);
                    }}
                    className="p-1.5 text-slate-400 hover:text-[#002f34] transition-colors cursor-pointer mr-1 shrink-0"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  className="w-[54px] h-full bg-[#002f34] hover:bg-[#003d44] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  onClick={() => {
                    setIsSearchFocused(false);
                    if (activeTab !== 'explore') onNavigate('explore');
                  }}
                  title="Search Marketplace"
                >
                  <Search className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Autocomplete / Instant Suggestions Dropdown */}
              {isSearchFocused && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md border border-slate-200 shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                  {!searchQuery.trim() ? (
                    /* Popular Keywords when input is empty */
                    <div className="p-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        POPULAR SEARCHES
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {['Drill', 'Sony Camera', 'Projector', 'Camping Tent', 'Pressure Washer', 'Drone', 'Circular Saw', 'Microscope'].map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => {
                              onSearchChange(term);
                              setIsSearchFocused(false);
                              if (activeTab !== 'explore') onNavigate('explore');
                            }}
                            className="px-2.5 py-1 text-xs rounded bg-slate-100 hover:bg-[#002f34] hover:text-white text-slate-700 transition-colors cursor-pointer font-medium"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Results while typing */
                    <div>
                      {/* Rich Subcategory Suggestions (e.g. DSLR Cameras, Mirrorless Cameras for 'Camera') */}
                      {getSmartSubcategories(searchQuery).length > 0 && (
                        <div className="p-2.5 bg-teal-50/70 border-b border-teal-100">
                          <div className="text-[10px] font-bold text-teal-800 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-teal-600" />
                            <span>SUGGESTED SUBCATEGORIES</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 px-1">
                            {getSmartSubcategories(searchQuery).map((subcat) => (
                              <button
                                key={subcat}
                                type="button"
                                onClick={() => {
                                  onSearchChange(subcat);
                                  setIsSearchFocused(false);
                                  if (activeTab !== 'explore') onNavigate('explore');
                                }}
                                className="px-2.5 py-1 text-xs rounded-full bg-white hover:bg-[#002f34] hover:text-white text-teal-900 border border-teal-200 transition-colors cursor-pointer font-semibold shadow-xs"
                              >
                                {subcat}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Matching Categories */}
                      {suggestCategories.length > 0 && (
                        <div className="p-2 bg-slate-50">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                            CATEGORIES
                          </div>
                          {suggestCategories.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                onSearchChange(cat.name);
                                setIsSearchFocused(false);
                                if (activeTab !== 'explore') onNavigate('explore');
                              }}
                              className="w-full text-left px-2 py-1.5 text-xs text-[#002f34] font-bold hover:bg-slate-200/60 rounded flex items-center justify-between cursor-pointer"
                            >
                              <span>in <span className="underline">{cat.name}</span></span>
                              <span className="text-[10px] text-slate-400 font-normal">Category</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Matching Equipment Items */}
                      {suggestItems.length > 0 ? (
                        <div className="p-2 space-y-1">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                            MATCHING EQUIPMENT
                          </div>
                          {suggestItems.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                onSearchChange(item.title);
                                setIsSearchFocused(false);
                                if (activeTab !== 'explore') onNavigate('explore');
                              }}
                              className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                            >
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-10 h-10 object-cover rounded bg-slate-100 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h5 className="text-xs font-semibold text-slate-800 truncate">
                                  {item.title}
                                </h5>
                                <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                  <span className="font-extrabold text-[#002f34]">₹{item.hourlyRate}/hr</span>
                                  <span>•</span>
                                  <span className="truncate">{item.area}, {item.city}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500">
                          Press <span className="font-bold text-[#002f34]">Enter</span> or click search to find &ldquo;{searchQuery}&rdquo; across all listings
                        </div>
                      )}

                      {/* View all footer */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSearchFocused(false);
                          if (activeTab !== 'explore') onNavigate('explore');
                        }}
                        className="w-full p-2.5 text-center text-xs font-bold text-[#002f34] hover:bg-slate-50 border-t border-slate-100 cursor-pointer block"
                      >
                        See all results for &ldquo;{searchQuery}&rdquo; →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 3. Right Action Icons & Mode Switcher */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Account Mode Quick Switcher Pill (Desktop) */}
            {onSwitchMode && (
              <button
                onClick={() => onSwitchMode(user.accountMode === 'LENDER' ? 'BORROWER' : 'LENDER')}
                className="hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-[#E5E9ED] bg-[#F5F7F8] hover:bg-slate-100 hover:border-[#003B3B] text-xs font-black text-[#003B3B] transition-all cursor-pointer shadow-2xs"
                title="Click to toggle Borrower and Lender Mode"
              >
                <Repeat className="w-3.5 h-3.5 text-[#16D9CC]" />
                <span>{user.accountMode === 'LENDER' ? 'Lender Mode' : 'Borrower Mode'}</span>
              </button>
            )}

            {/* Direct Chat / Messages */}
            <button
              onClick={() => onNavigate('messages')}
              className="relative p-2.5 text-[#002f34] hover:bg-slate-100 rounded-full transition-colors hidden sm:flex cursor-pointer"
              title="Chat with Neighbors"
            >
              <MessageSquare className="w-6 h-6" />
              {unreadMessageCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-xs">
                  {unreadMessageCount}
                </span>
              )}
            </button>

            {/* Wishlist */}
            <button
              onClick={() => (onOpenWishlist ? onOpenWishlist() : onNavigate('explore'))}
              className="relative p-2.5 text-[#002f34] hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Saved Items"
            >
              <Heart className="w-6 h-6" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-xs">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                }}
                className="relative p-2.5 text-[#002f34] hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-88 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <span className="text-sm font-bold text-[#002f34]">
                      Notifications ({unreadCount})
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-teal-700 font-bold hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-400 font-medium">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3.5 text-left hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!n.isRead ? 'bg-teal-50/50' : ''}`}
                          onClick={() => {
                            if (n.link?.includes('booking')) onNavigate('rentals');
                            setShowNotifications(false);
                          }}
                        >
                          <span className="text-lg">{getNotifIcon(n.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-[#002f34] truncate">{n.title}</div>
                            <div className="text-xs text-slate-600 line-clamp-2 mt-0.5">{n.message}</div>
                            <div className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`}
                  alt={user.name}
                  className="w-10 h-10 rounded-full border-2 border-slate-300 object-cover shadow-xs"
                />
                <ChevronDown className="w-4 h-4 text-[#002f34] hidden sm:block" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-5 py-3.5 border-b border-slate-100">
                    <div className="text-sm font-bold text-[#002f34] truncate">{user.name}</div>
                    <div className="text-xs text-slate-500 truncate">{user.email || user.phone}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Trust: {user.trustScore}/100
                      </span>
                      {user.role === 'ADMIN' && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-1.5">
                    {onSwitchMode && (
                      <div className="px-4 py-2 mb-1.5 mx-2 bg-slate-50 rounded-xl border border-slate-200/80">
                        <div className="text-[10px] font-black uppercase text-[#718096] mb-1">
                          Current Mode: <strong className="text-[#003B3B]">{user.accountMode === 'LENDER' ? 'Lender' : 'Borrower'}</strong>
                        </div>
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            onSwitchMode(user.accountMode === 'LENDER' ? 'BORROWER' : 'LENDER');
                          }}
                          className="w-full py-1.5 px-3 rounded-lg bg-white border border-[#E5E9ED] hover:border-[#003B3B] text-xs font-black text-[#003B3B] flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <Repeat className="w-3.5 h-3.5 text-[#16D9CC]" />
                          <span>Switch to {user.accountMode === 'LENDER' ? 'Borrower Mode' : 'Lender Mode'}</span>
                        </button>
                      </div>
                    )}

                    {onOpenProfile && (
                      <button
                        onClick={() => { setShowProfileMenu(false); onOpenProfile(); }}
                        className="w-full px-5 py-2.5 text-left text-xs sm:text-sm text-[#002f34] hover:bg-slate-50 flex items-center gap-3 font-bold cursor-pointer text-teal-800"
                      >
                        <UserIcon className="w-4 h-4 text-teal-600" />
                        <span>Edit Profile & Location</span>
                      </button>
                    )}

                    {onOpenWishlist && (
                      <button
                        onClick={() => { setShowProfileMenu(false); onOpenWishlist(); }}
                        className="w-full px-5 py-2.5 text-left text-xs sm:text-sm text-[#002f34] hover:bg-slate-50 flex items-center gap-3 font-medium cursor-pointer"
                      >
                        <Heart className="w-4 h-4 text-rose-500" />
                        <span>Saved Equipment ({wishlistCount})</span>
                      </button>
                    )}

                    {[
                      { icon: Clock, label: 'My Rentals', tab: 'rentals' },
                      { icon: Share2, label: 'My Listings', tab: 'listings' },
                      { icon: MessageSquare, label: 'Messages & Handovers', tab: 'messages' },
                      { icon: Plus, label: '+ List Equipment', tab: 'create_listing' },
                    ].map(({ icon: Icon, label, tab }) => (
                      <button
                        key={tab}
                        onClick={() => { setShowProfileMenu(false); onNavigate(tab); }}
                        className="w-full px-5 py-2.5 text-left text-xs sm:text-sm text-[#002f34] hover:bg-slate-50 flex items-center gap-3 font-medium cursor-pointer"
                      >
                        <Icon className="w-4 h-4 text-slate-500" />
                        <span>{label}</span>
                      </button>
                    ))}

                    {user.role === 'ADMIN' && (
                      <button
                        onClick={() => { setShowProfileMenu(false); onNavigate('admin'); }}
                        className="w-full px-5 py-2.5 text-left text-xs sm:text-sm text-violet-800 font-bold hover:bg-violet-50 flex items-center gap-3 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-violet-600" />
                        <span>Admin Console</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-slate-100">
                    <button
                      onClick={() => { setShowProfileMenu(false); onLogout(); }}
                      className="w-full px-5 py-2.5 text-left text-xs sm:text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3 font-bold cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* The Iconic OLX "+ LEND EQUIPMENT" Button - Prominent & Large */}
            <button
              onClick={() => onNavigate('create_listing')}
              className="olx-btn-sell px-6 py-2.5 text-sm sm:text-base font-black tracking-wide uppercase cursor-pointer hidden sm:flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>LEND</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. OLX-Style Category Sub-Navigation Bar */}
      <div className="border-t border-slate-200/80 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 h-12 overflow-x-auto no-scrollbar text-sm font-bold">
            {/* All Categories Dropdown Trigger */}
            <button
              onClick={() => onNavigate('explore')}
              className="font-black uppercase tracking-wide text-[#002f34] flex items-center gap-1.5 shrink-0 hover:text-[#00a49f] transition-colors cursor-pointer text-sm"
            >
              <span>ALL CATEGORIES</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Category Quick Text Links */}
            <div className="flex items-center gap-5 shrink-0 text-slate-600 font-medium">
              {CATEGORY_SHORTCUTS.map((catName) => (
                <button
                  key={catName}
                  onClick={() => {
                    onSearchChange(catName);
                    if (activeTab !== 'explore') onNavigate('explore');
                  }}
                  className="hover:text-[#002f34] transition-colors whitespace-nowrap cursor-pointer text-xs"
                >
                  {catName}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
