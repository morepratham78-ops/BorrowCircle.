import React, { useState, useEffect } from 'react';
import { User, Booking, Item } from '../types';
import { api } from '../services/api';
import {
  ShoppingBag,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  KeyRound,
  TrendingUp,
  ShieldCheck,
  Star,
  MapPin,
  Calendar,
  ChevronRight,
  ArrowRight,
  MessageSquare,
  PlusCircle,
  Heart,
  Truck,
  Sparkles,
  Repeat,
  Info
} from 'lucide-react';

interface DashboardScreenProps {
  user: User;
  onNavigate: (tab: string) => void;
  onSelectItem: (item: Item) => void;
  onOpenChat: (contactId: string) => void;
  onSwitchMode: (mode: 'BORROWER' | 'LENDER') => void;
  onOpenWishlist: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  user,
  onNavigate,
  onSelectItem,
  onOpenChat,
  onSwitchMode,
  onOpenWishlist
}) => {
  const isBorrower = user.accountMode !== 'LENDER';
  const [borrowerBookings, setBorrowerBookings] = useState<Booking[]>([]);
  const [lenderBookings, setLenderBookings] = useState<Booking[]>([]);
  const [myListings, setMyListings] = useState<Item[]>([]);
  const [recommendedItems, setRecommendedItems] = useState<Item[]>([]);
  const [wishlistItems, setWishlistItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isBorrower) {
        const [bookingsRes, sectionsRes, wishRes] = await Promise.all([
          api.getBookings('borrower'),
          api.getSections(user.city),
          api.getWishlistItems()
        ]);
        setBorrowerBookings(bookingsRes.bookings || []);
        setRecommendedItems(sectionsRes.sections?.popular || sectionsRes.sections?.nearYou || sectionsRes.trending || []);
        setWishlistItems(wishRes.items || []);
      } else {
        const [listingsRes, bookingsRes] = await Promise.all([
          api.getMyListings(),
          api.getBookings('lender')
        ]);
        setMyListings(listingsRes.listings || []);
        setLenderBookings(bookingsRes.bookings || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.accountMode, user.city]);

  // Lender quick response
  const handleRespondBooking = async (bookingId: string, action: 'ACCEPT' | 'REJECT') => {
    setActionLoading(true);
    try {
      await api.respondBooking(bookingId, action);
      setNotice(action === 'ACCEPT' ? 'Booking accepted! Receiver notified for payment.' : 'Booking declined.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to respond');
    } finally {
      setActionLoading(false);
    }
  };

  // Calculations for Borrower
  const activeRentals = borrowerBookings.filter(b => b.status === 'ACTIVE');
  const upcomingReturns = borrowerBookings.filter(b => b.status === 'ACTIVE' || b.status === 'RETURN_REQUESTED');
  const pendingBookings = borrowerBookings.filter(b => ['PENDING', 'PAYMENT_PENDING', 'READY_FOR_PICKUP'].includes(b.status));

  // Calculations for Lender
  const incomingRequests = lenderBookings.filter(b => ['PENDING', 'PENDING_APPROVAL'].includes(b.status));
  const acceptedAwaitingPayment = lenderBookings.filter(b => ['ACCEPTED', 'PAYMENT_PENDING'].includes(b.status));
  const currentlyRented = lenderBookings.filter(b => ['CONFIRMED', 'READY_FOR_PICKUP', 'ACTIVE'].includes(b.status));
  const lenderReturns = lenderBookings.filter(b => ['RETURN_REQUESTED', 'INSPECTION_PENDING'].includes(b.status));
  const totalLenderEarnings = lenderBookings
    .filter(b => ['ACTIVE', 'INSPECTION_PENDING', 'COMPLETED'].includes(b.status))
    .reduce((sum, b) => sum + (b.lenderEarnings || 0), 0);

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* 1. UNIFIED MODE HEADER & SWITCHER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E5E9ED] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              isBorrower ? 'bg-teal-100 text-[#003B3B]' : 'bg-emerald-100 text-emerald-900'
            }`}>
              {isBorrower ? '🛒 Borrower Workspace' : '🔧 Lender Hub'}
            </span>
            <span className="text-sm text-[#718096] font-medium">
              1 Account • {user.name} ({user.area}, {user.city})
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#102A2A] tracking-tight">
            {isBorrower ? 'My Equipment Rentals & Discoveries' : 'Equipment Operations & Rental Earnings'}
          </h1>
          <p className="text-base text-[#718096] mt-1.5 leading-relaxed">
            {isBorrower
              ? 'Track active equipment in your possession, upcoming returns, and find tools in your neighborhood.'
              : 'Manage incoming rental requests, verify dual-OTP equipment handovers, and track neighborhood earnings.'}
          </p>
        </div>

        {/* Mode Toggle Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSwitchMode(isBorrower ? 'LENDER' : 'BORROWER')}
            className="h-12 px-5 rounded-2xl bg-[#003B3B] hover:bg-[#002f34] text-white text-base font-bold shadow-md shadow-teal-900/10 transition-all flex items-center gap-2.5 cursor-pointer active:scale-95"
            title="Switch account mode without logging out"
          >
            <Repeat className="w-5 h-5 text-[#16D9CC]" />
            <span>Switch to {isBorrower ? 'Lender Mode' : 'Borrower Mode'}</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-base font-bold flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="text-emerald-700 hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. BORROWER ROLE-SPECIFIC DASHBOARD VIEW                     */}
      {/* ============================================================ */}
      {isBorrower ? (
        <div className="space-y-10">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-6 rounded-3xl bg-white border border-[#E5E9ED] shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-[#718096]">Active in Possession</div>
                <div className="text-3xl sm:text-4xl font-black text-[#003B3B] mt-1">{activeRentals.length}</div>
                <div className="text-xs text-[#718096] mt-1">Dual-OTP verified rentals</div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <Clock className="w-7 h-7" />
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-[#E5E9ED] shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-[#718096]">Pending / Ready for Pickup</div>
                <div className="text-3xl sm:text-4xl font-black text-[#102A2A] mt-1">{pendingBookings.length}</div>
                <div className="text-xs text-[#718096] mt-1">Awaiting lender or handover</div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-7 h-7" />
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-[#E5E9ED] shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-[#718096]">Borrower Trust Score</div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-700 mt-1">{user.trustScore}/100</div>
                <div className="text-xs text-[#718096] mt-1">⭐ {user.rating} average rating</div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7" />
              </div>
            </div>
          </div>

          {/* 1. ACTIVE RENTALS (HIGHEST PRIORITY FOR BORROWER) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-black text-[#102A2A]">
                1. Active Rentals in Possession ({activeRentals.length})
              </h2>
              {activeRentals.length > 0 && (
                <button
                  onClick={() => onNavigate('rentals')}
                  className="text-sm font-bold text-[#003B3B] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Manage In Rentals Screen</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {activeRentals.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-[#E5E9ED] text-slate-500">
                <p className="text-base font-semibold text-slate-700">No equipment currently in your possession.</p>
                <p className="text-sm text-slate-500 mt-1">Search or discover tools below to rent locally.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeRentals.map((b) => (
                  <div
                    key={b.id}
                    className="p-6 rounded-3xl bg-white border border-[#E5E9ED] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start gap-4">
                        <img
                          src={b.item?.images?.[0]?.url || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80'}
                          alt={b.item?.title}
                          className="w-20 h-20 rounded-2xl object-cover border border-[#E5E9ED] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-emerald-100 text-emerald-800">
                            RENTAL ACTIVE
                          </span>
                          <h3 className="text-lg font-bold text-[#102A2A] truncate mt-1">
                            {b.item?.title}
                          </h3>
                          <div className="text-sm text-[#718096] flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>{b.item?.area}, {b.item?.city}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div>Rate: <strong className="text-slate-900">₹{b.hourlyRate}/hr</strong></div>
                        <div>Deposit: <strong className="text-emerald-700">₹0 (Deposit-Free)</strong></div>
                        <div className="col-span-2">Lender: <strong>{b.lender?.name}</strong></div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <button
                        onClick={() => onOpenChat(b.lenderId)}
                        className="h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4 text-teal-600" />
                        <span>Chat Lender</span>
                      </button>

                      <button
                        onClick={() => onNavigate('rentals')}
                        className="h-11 px-5 rounded-xl bg-[#003B3B] hover:bg-[#002f34] text-white text-sm font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-4 h-4 text-[#16D9CC]" />
                        <span>Return / Extend</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. UPCOMING RETURNS & PENDING BOOKINGS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upcoming Returns */}
            <div className="space-y-4">
              <h2 className="text-xl font-black text-[#102A2A]">
                2. Upcoming Returns ({upcomingReturns.length})
              </h2>
              {upcomingReturns.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-3xl border border-[#E5E9ED] text-sm text-slate-500">
                  No returns scheduled right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingReturns.map((b) => (
                    <div
                      key={b.id}
                      className="p-5 rounded-3xl bg-white border border-[#E5E9ED] shadow-xs flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="text-base font-bold text-[#102A2A] truncate">{b.item?.title}</div>
                        <div className="text-xs text-[#718096] mt-0.5">Return to: {b.lender?.name} ({b.item?.area})</div>
                        <div className="text-xs font-bold text-emerald-700 mt-1">Dual-OTP Handover Protection</div>
                      </div>
                      <button
                        onClick={() => onNavigate('rentals')}
                        className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold shrink-0 transition-colors cursor-pointer"
                      >
                        View Return OTP
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Bookings */}
            <div className="space-y-4">
              <h2 className="text-xl font-black text-[#102A2A]">
                3. Pending Bookings ({pendingBookings.length})
              </h2>
              {pendingBookings.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-3xl border border-[#E5E9ED] text-sm text-slate-500">
                  No pending booking requests.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-5 rounded-3xl bg-white border border-[#E5E9ED] shadow-xs flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="text-base font-bold text-[#102A2A] truncate">{b.item?.title}</div>
                        <div className="text-xs text-[#718096] mt-0.5">
                          Status: <strong className="text-teal-700">{b.status}</strong>
                        </div>
                        <div className="text-xs font-bold text-slate-700 mt-1">Total: ₹{b.totalPayableAmount}</div>
                      </div>
                      <button
                        onClick={() => onNavigate('rentals')}
                        className="h-10 px-4 rounded-xl bg-[#003B3B] hover:bg-[#002f34] text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
                      >
                        {b.status === 'PAYMENT_PENDING' ? 'Pay via UPI' : 'Details'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4. RECOMMENDED EQUIPMENT */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#102A2A]">
                  4. Recommended Equipment in {user.city}
                </h2>
                <p className="text-sm text-[#718096] mt-0.5">Verified local tools available for immediate neighborhood rental</p>
              </div>
              <button
                onClick={() => onNavigate('explore')}
                className="text-sm font-bold text-[#003B3B] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Browse All Equipment</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {recommendedItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="bg-white rounded-3xl border border-[#E5E9ED] overflow-hidden shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                      <img
                        src={item.images?.[0]?.url || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80'}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-slate-900/90 text-white text-xs font-black">
                        ₹{item.hourlyRate}/hr
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="text-[11px] font-black uppercase text-teal-700 tracking-wider">
                        {item.category?.name || 'Tools'}
                      </div>
                      <h4 className="text-base font-bold text-[#102A2A] line-clamp-1 mt-0.5">
                        {item.title}
                      </h4>
                      <p className="text-xs text-[#718096] mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 pt-0">
                    <button
                      type="button"
                      className="w-full h-11 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#003B3B] text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Check Availability & Rent</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. SAVED / WISHLIST EQUIPMENT */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#102A2A]">
                  5. Saved Equipment ({wishlistItems.length})
                </h2>
                <p className="text-sm text-[#718096] mt-0.5">Your pinned equipment list for quick upcoming rentals</p>
              </div>
              <button
                onClick={onOpenWishlist}
                className="text-sm font-bold text-[#003B3B] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Open Wishlist</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {wishlistItems.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-[#E5E9ED] text-sm text-slate-500">
                You haven't saved any equipment yet. Click the heart icon on any tool card to pin it here.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {wishlistItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="p-4 rounded-3xl bg-white border border-[#E5E9ED] shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
                  >
                    <img
                      src={item.images?.[0]?.url || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=200&q=80'}
                      alt={item.title}
                      className="w-16 h-16 rounded-2xl object-cover border border-[#E5E9ED] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-[#102A2A] truncate">{item.title}</div>
                      <div className="text-xs font-black text-teal-800 mt-0.5">₹{item.hourlyRate}/hr</div>
                      <div className="text-[11px] text-[#718096]">{item.area}, {item.city}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 3. LENDER ROLE-SPECIFIC DASHBOARD VIEW                        */
        /* ============================================================ */
        <div className="space-y-10">
          {/* Lender Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
            <div className="p-6 rounded-3xl bg-white border border-[#E5E9ED] shadow-xs">
              <div className="text-xs font-black uppercase tracking-wider text-[#718096]">Total Rental Earnings</div>
              <div className="text-3xl sm:text-4xl font-black text-emerald-700 mt-1">₹{totalLenderEarnings.toLocaleString('en-IN')}</div>
              <div className="text-xs text-[#718096] mt-1">Net earned after ₹15 fee</div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-[#E5E9ED] shadow-xs">
              <div className="text-xs font-black uppercase tracking-wider text-[#718096]">Active Listings</div>
              <div className="text-3xl sm:text-4xl font-black text-[#102A2A] mt-1">{myListings.length}</div>
              <div className="text-xs text-[#718096] mt-1">{myListings.filter(l => l.status === 'APPROVED').length} live in catalog</div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-[#E5E9ED] shadow-xs">
              <div className="text-xs font-black uppercase tracking-wider text-[#718096]">Currently Rented</div>
              <div className="text-3xl sm:text-4xl font-black text-[#003B3B] mt-1">{currentlyRented.length}</div>
              <div className="text-xs text-[#718096] mt-1">Tools with borrowers</div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-[#E5E9ED] shadow-xs">
              <div className="text-xs font-black uppercase tracking-wider text-[#718096]">Lender Trust Score</div>
              <div className="text-3xl sm:text-4xl font-black text-teal-800 mt-1">{user.trustScore}/100</div>
              <div className="text-xs text-[#718096] mt-1">⭐ {user.rating} ({user.completedLendsCount} lends)</div>
            </div>
          </div>

          {/* 1. INCOMING BOOKING REQUESTS (HIGHEST PRIORITY FOR LENDER) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-black text-[#102A2A]">
                1. Incoming Booking Requests ({incomingRequests.length})
              </h2>
              {incomingRequests.length > 0 && (
                <button
                  onClick={() => onNavigate('requests')}
                  className="text-sm font-bold text-[#003B3B] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Manage in Booking Requests</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Accepted & Awaiting Payment Summary Pill */}
            {acceptedAwaitingPayment.length > 0 && (
              <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-between text-xs text-violet-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-violet-600 shrink-0" />
                  <span><strong>{acceptedAwaitingPayment.length} Booking(s) Approved by You:</strong> Awaiting borrower UPI payment.</span>
                </div>
                <button
                  onClick={() => onNavigate('requests')}
                  className="font-bold underline cursor-pointer"
                >
                  View Details
                </button>
              </div>
            )}

            {incomingRequests.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-[#E5E9ED] text-slate-500 space-y-1">
                <p className="text-base font-semibold text-slate-700">No pending booking requests at this moment.</p>
                <p className="text-xs text-slate-400">
                  Logged in as <strong className="text-slate-600">{user.name}</strong> ({user.email}). When neighbors request your equipment, they will appear right here for approval.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {incomingRequests.map((b) => (
                  <div
                    key={b.id}
                    className="p-6 rounded-3xl bg-white border border-[#E5E9ED] shadow-sm flex flex-col md:flex-row justify-between gap-5"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-amber-100 text-amber-800">
                          REQUEST PENDING
                        </span>
                        <h3 className="text-lg font-bold text-[#102A2A]">
                          {b.item?.title}
                        </h3>
                      </div>
                      <p className="text-sm text-slate-600">
                        Borrower: <strong>{b.receiver?.name}</strong> • Trust Score: <strong>{b.receiver?.trustScore}/100</strong>
                      </p>
                      <div className="mt-2 text-xs text-slate-500 flex flex-wrap gap-3">
                        <span>Duration: <strong>{b.durationHours} hrs</strong></span>
                        <span>•</span>
                        <span>Rental Amount: <strong>₹{b.rentalAmount}</strong></span>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold">Your Net Earnings: ₹{b.lenderEarnings}</span>
                        <span>•</span>
                        <span>Deposit: <strong className="text-emerald-700">₹0 (Deposit-Free)</strong></span>
                      </div>
                      {b.notes && (
                        <div className="mt-2 text-xs text-slate-500 italic">
                          "{b.notes}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => handleRespondBooking(b.id, 'ACCEPT')}
                        disabled={actionLoading}
                        className="h-11 px-5 rounded-xl bg-[#003B3B] hover:bg-[#002f34] text-white text-sm font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        Accept Booking
                      </button>
                      <button
                        onClick={() => handleRespondBooking(b.id, 'REJECT')}
                        disabled={actionLoading}
                        className="h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-bold transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => onOpenChat(b.receiverId)}
                        className="h-11 p-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                        title="Chat with borrower"
                      >
                        <MessageSquare className="w-5 h-5 text-teal-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. CURRENTLY RENTED EQUIPMENT & UPCOMING RETURNS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-black text-[#102A2A]">
                2. Currently Rented & Handover Operations ({currentlyRented.length + lenderReturns.length})
              </h2>
              <button
                onClick={() => onNavigate('management')}
                className="text-sm font-bold text-[#003B3B] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Rental Management</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {currentlyRented.length === 0 && lenderReturns.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-[#E5E9ED] text-slate-500">
                No equipment is currently rented out with borrowers.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[...currentlyRented, ...lenderReturns].map((b) => (
                  <div
                    key={b.id}
                    className="p-6 rounded-3xl bg-white border border-[#E5E9ED] shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-teal-100 text-[#003B3B]">
                          {b.status}
                        </span>
                        <span className="text-xs font-bold text-emerald-700">₹{b.lenderEarnings} earned</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#102A2A]">{b.item?.title}</h3>
                      <p className="text-xs text-[#718096] mt-0.5">
                        Borrower: <strong>{b.receiver?.name}</strong> • Phone: {b.receiver?.phone || 'Verified'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                      <button
                        onClick={() => onOpenChat(b.receiverId)}
                        className="h-10 px-3.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-4 h-4 text-teal-600" />
                        <span>Chat</span>
                      </button>

                      <button
                        onClick={() => onNavigate('management')}
                        className="h-10 px-4 rounded-xl bg-[#003B3B] hover:bg-[#002f34] text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Verify OTP / Inspect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. ACTIVE LISTINGS OVERVIEW */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#102A2A]">
                  3. Active Listings Catalog ({myListings.length})
                </h2>
                <p className="text-sm text-[#718096] mt-0.5">Your equipment listed for neighborhood rental</p>
              </div>
              <button
                onClick={() => onNavigate('listings')}
                className="h-11 px-5 rounded-2xl bg-[#003B3B] hover:bg-[#002f34] text-white text-sm font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-[#16D9CC]" />
                <span>Manage / Add Equipment</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {myListings.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-[#E5E9ED] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="relative h-44 w-full bg-slate-100">
                    <img
                      src={item.images?.[0]?.url || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80'}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-slate-900/90 text-white text-xs font-black">
                      ₹{item.hourlyRate}/hr
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="text-base font-bold text-[#102A2A] truncate">{item.title}</h4>
                    <p className="text-xs text-[#718096] mt-0.5 line-clamp-1">{item.description}</p>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span className="text-emerald-700 font-bold">Deposit: ₹0</span>
                      <span className="font-bold text-teal-800">{item.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. RENTAL EARNINGS SUMMARY */}
          <div className="p-6 rounded-3xl bg-[#FAFBFB] border border-[#E5E9ED] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-[#102A2A]">Rental Earnings & UPI Settlements</h3>
              <p className="text-sm text-[#718096] mt-0.5">
                Payments are transferred directly via UPI into your linked bank account after the 15-minute return inspection.
              </p>
            </div>
            <button
              onClick={() => onNavigate('earnings')}
              className="h-11 px-5 rounded-2xl bg-white border border-[#E5E9ED] hover:bg-slate-50 text-slate-800 text-sm font-bold shrink-0 transition-colors cursor-pointer"
            >
              View Full Earnings Statement
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
