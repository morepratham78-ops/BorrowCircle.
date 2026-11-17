import React, { useState, useEffect } from 'react';
import { Item, Booking, User } from '../types';
import { api } from '../services/api';
import { StatusBadge } from './MyRentalsScreen';
import {
  Layers,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  RotateCcw,
  Sparkles,
  PlusCircle,
  TrendingUp,
  MessageSquare,
  Search,
  FileText,
  Edit3,
  Trash2,
  Power,
  X,
  Save,
  Truck
} from 'lucide-react';

interface MyListingsScreenProps {
  user: User;
  onNavigateToCreate: () => void;
  onOpenChat: (contactId: string) => void;
  onRefreshUser: () => void;
  viewSection?: 'listings' | 'requests' | 'management' | 'earnings';
}

export const MyListingsScreen: React.FC<MyListingsScreenProps> = ({
  user,
  onNavigateToCreate,
  onOpenChat,
  onRefreshUser,
  viewSection = 'listings'
}) => {
  const [listings, setListings] = useState<Item[]>([]);
  const [lenderBookings, setLenderBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>('');
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'requests' | 'management' | 'listings' | 'earnings'>(
    viewSection === 'requests' ? 'requests' : viewSection === 'management' ? 'management' : viewSection === 'earnings' ? 'earnings' : 'all'
  );

  useEffect(() => {
    if (viewSection) {
      setActiveTabFilter(
        viewSection === 'requests' ? 'requests' : viewSection === 'management' ? 'management' : viewSection === 'earnings' ? 'earnings' : 'all'
      );
    }
  }, [viewSection]);

  // Modals
  const [showVerifyHandoverModal, setShowVerifyHandoverModal] = useState<boolean>(false);
  const [showVerifyReturnModal, setShowVerifyReturnModal] = useState<boolean>(false);
  const [showDamageModal, setShowDamageModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Edit Listing state
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editHourlyRate, setEditHourlyRate] = useState<number>(50);
  const [editDailyRate, setEditDailyRate] = useState<number>(0);
  const [editIsDelivery, setEditIsDelivery] = useState<boolean>(false);
  const [editDeliveryFee, setEditDeliveryFee] = useState<number>(50);
  const [editIsAvailable, setEditIsAvailable] = useState<boolean>(true);

  // Form states
  const [handoverInputOtp, setHandoverInputOtp] = useState<string>('');
  const [returnInputOtp, setReturnInputOtp] = useState<string>('');
  const [conditionNotes, setConditionNotes] = useState<string>('Equipment verified in good working condition.');
  
  // Damage Claim fields
  const [damageDescription, setDamageDescription] = useState<string>('');
  const [estimatedRepairCost, setEstimatedRepairCost] = useState<string>('');

  const fetchData = async () => {
    try {
      const [listRes, bookRes] = await Promise.all([
        api.getMyListings(),
        api.getBookings('lender')
      ]);
      setListings(listRes.listings || []);
      setLenderBookings(bookRes.bookings || []);
    } catch (err) {
      console.error('Failed to load lender data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Open Edit Modal with item details
  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditHourlyRate(item.hourlyRate);
    setEditDailyRate(item.dailyRate || 0);
    setEditIsDelivery(item.isDeliveryAvailable);
    setEditDeliveryFee(item.deliveryFee || 50);
    setEditIsAvailable(item.isAvailable ?? true);
    setShowEditModal(true);
  };

  // Save Edit Listing
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setActionLoading(true);
    try {
      await api.updateItem(editingItem.id, {
        title: editTitle,
        description: editDescription,
        hourlyRate: editHourlyRate,
        dailyRate: editDailyRate || null,
        securityDeposit: 0,
        isDeliveryAvailable: editIsDelivery,
        deliveryFee: editDeliveryFee,
        isAvailable: editIsAvailable
      });
      setShowEditModal(false);
      setNotice(`Listing for "${editTitle}" updated successfully.`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update listing');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Listing
  const handleDeleteListing = async (item: Item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"? This cannot be undone.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await api.deleteItem(item.id);
      setNotice(`Listing "${item.title}" was removed.`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete listing. Active bookings may exist.');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Pause / Resume Listing
  const handleTogglePause = async (item: Item) => {
    const isPaused = item.status === 'SUSPENDED';
    const newStatus = isPaused ? 'APPROVED' : 'SUSPENDED';
    setActionLoading(true);
    try {
      await api.updateItem(item.id, { status: newStatus });
      setNotice(isPaused ? `Listing "${item.title}" resumed & live in neighborhood.` : `Listing "${item.title}" paused.`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update listing status');
    } finally {
      setActionLoading(false);
    }
  };

  // 1. Respond to Incoming Booking Request
  const handleRespondBooking = async (bookingId: string, action: 'ACCEPT' | 'REJECT') => {
    setActionLoading(true);
    try {
      await api.respondBooking(bookingId, action);
      setNotice(action === 'ACCEPT' ? 'Booking approved! Receiver has been prompted for UPI payment.' : 'Booking declined.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to respond');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Verify Handover OTP
  const handleVerifyHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setActionLoading(true);

    try {
      await api.verifyHandoverOtp(selectedBooking.id, handoverInputOtp, conditionNotes);
      setShowVerifyHandoverModal(false);
      setHandoverInputOtp('');
      setNotice('Handover confirmed with dual OTP! Equipment rental is now ACTIVE.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Invalid handover OTP');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Verify Return OTP -> Starts 15-Minute Inspection
  const handleVerifyReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setActionLoading(true);

    try {
      await api.verifyReturnOtp(selectedBooking.id, returnInputOtp);
      setShowVerifyReturnModal(false);
      setReturnInputOtp('');
      setNotice('Return verified! 15-minute inspection window has started.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Invalid return OTP');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Complete Inspection (Clean)
  const handleCompleteCleanInspection = async (bookingId: string) => {
    setActionLoading(true);
    try {
      await api.completeInspection(bookingId, 'Returned in clean, undamaged condition.');
      setNotice('Inspection completed! Lender earnings credited.');
      onRefreshUser();
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete inspection');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. File Damage Claim
  const handleFileDamageClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setActionLoading(true);

    try {
      await api.fileClaim({
        bookingId: selectedBooking.id,
        description: damageDescription,
        estimatedRepairCost: Number(estimatedRepairCost)
      });
      setShowDamageModal(false);
      setNotice('Damage claim submitted for admin mediation. Community protection activated.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to file claim');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Respond to Extension Request
  const handleRespondExtension = async (bookingId: string, extensionId: string, action: 'APPROVE' | 'REJECT') => {
    setActionLoading(true);
    try {
      await api.respondExtension(bookingId, extensionId, action);
      setNotice(action === 'APPROVE' ? 'Extension approved and return schedule updated.' : 'Extension declined.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to respond to extension');
    } finally {
      setActionLoading(false);
    }
  };

  // Total lender earnings calculation
  const totalLenderEarnings = lenderBookings
    .filter(b => ['ACTIVE', 'INSPECTION_PENDING', 'COMPLETED'].includes(b.status))
    .reduce((sum, b) => sum + (b.lenderEarnings || 0), 0);

  return (
    <div className="space-y-8 pb-16">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Lender Hub & Equipment Listings
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Manage your listed equipment, pricing, availability, incoming requests, dual-OTP handovers, and inspection settlements.
          </p>
        </div>

        <button
          onClick={onNavigateToCreate}
          className="px-5 py-3 rounded-2xl bg-gradient-primary text-white text-sm font-bold shadow-md shadow-teal-500/20 hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Add New Equipment</span>
        </button>
      </div>

      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="text-emerald-600 font-bold hover:text-emerald-800">✕</button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Lended Earnings</div>
            <div className="text-3xl font-black text-emerald-700 mt-1.5">₹{totalLenderEarnings.toLocaleString('en-IN')}</div>
            <div className="text-xs text-slate-400 mt-1">Net earned after ₹15 platform fee</div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-7 h-7" />
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Listings</div>
            <div className="text-3xl font-black text-slate-900 mt-1.5">{listings.length}</div>
            <div className="text-xs text-slate-400 mt-1">{listings.filter(l => l.status === 'APPROVED').length} approved & live</div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-7 h-7" />
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lender Trust Score</div>
            <div className="text-3xl font-black text-teal-800 mt-1.5">{user.trustScore}/100</div>
            <div className="text-xs text-slate-400 mt-1">⭐ {user.rating} average rating ({user.completedLendsCount} lends)</div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Navigation Filter Pills for Lender Operations */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: 'All Operations' },
          { id: 'requests', label: `Booking Requests (${lenderBookings.filter(b => ['PENDING', 'PENDING_APPROVAL'].includes(b.status)).length})` },
          { id: 'management', label: `Rental Management (${lenderBookings.filter(b => ['CONFIRMED', 'READY_FOR_PICKUP', 'ACTIVE', 'EXTENSION_REQUESTED', 'RETURN_REQUESTED', 'INSPECTION_PENDING'].includes(b.status)).length})` },
          { id: 'listings', label: `Equipment Catalog (${listings.length})` },
          { id: 'earnings', label: `Earnings (₹${totalLenderEarnings.toLocaleString('en-IN')})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabFilter(tab.id as any)}
            className={`h-11 px-5 rounded-2xl text-sm font-bold shrink-0 transition-all cursor-pointer ${
              activeTabFilter === tab.id
                ? 'bg-[#003B3B] text-white shadow-xs'
                : 'bg-white border border-[#E5E9ED] text-[#718096] hover:bg-slate-50 hover:text-[#102A2A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: INCOMING REQUESTS & ACTIVE LENDER SESSIONS */}
      {(activeTabFilter === 'all' || activeTabFilter === 'requests' || activeTabFilter === 'management') && (
      <div className="space-y-4">
        <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
          <span>
            {activeTabFilter === 'requests'
              ? 'Pending Incoming Booking Requests'
              : activeTabFilter === 'management'
              ? 'Active Rentals & Dual-OTP Handover Management'
              : 'Active Bookings & Incoming Requests'}{' '}
            ({lenderBookings.filter(b => {
              if (activeTabFilter === 'requests') return ['PENDING', 'PENDING_APPROVAL', 'ACCEPTED', 'PAYMENT_PENDING'].includes(b.status);
              if (activeTabFilter === 'management') return ['CONFIRMED', 'READY_FOR_PICKUP', 'ACTIVE', 'EXTENSION_REQUESTED', 'RETURN_REQUESTED', 'INSPECTION_PENDING'].includes(b.status);
              return b.status !== 'COMPLETED';
            }).length})
          </span>
        </h3>

        {lenderBookings.filter(b => {
          if (activeTabFilter === 'requests') return ['PENDING', 'PENDING_APPROVAL', 'ACCEPTED', 'PAYMENT_PENDING'].includes(b.status);
          if (activeTabFilter === 'management') return ['CONFIRMED', 'READY_FOR_PICKUP', 'ACTIVE', 'EXTENSION_REQUESTED', 'RETURN_REQUESTED', 'INSPECTION_PENDING'].includes(b.status);
          return b.status !== 'COMPLETED';
        }).length === 0 ? (
          <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 text-sm text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">
              {activeTabFilter === 'requests'
                ? 'No incoming booking requests pending approval.'
                : activeTabFilter === 'management'
                ? 'No active equipment currently in borrower possession.'
                : 'No active rental sessions or pending requests at the moment.'}
            </p>
            <p className="text-xs text-slate-400">
              Logged in as <strong className="text-slate-600">{user.name}</strong> ({user.email}). Only booking requests for equipment you personally own appear in your Lender Hub.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {lenderBookings
              .filter(b => {
                if (activeTabFilter === 'requests') return ['PENDING', 'PENDING_APPROVAL', 'ACCEPTED', 'PAYMENT_PENDING'].includes(b.status);
                if (activeTabFilter === 'management') return ['CONFIRMED', 'READY_FOR_PICKUP', 'ACTIVE', 'EXTENSION_REQUESTED', 'RETURN_REQUESTED', 'INSPECTION_PENDING'].includes(b.status);
                return b.status !== 'COMPLETED';
              })
              .map((b) => (
              <div
                key={b.id}
                className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between gap-5"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {b.bookingNumber}
                    </span>
                    <StatusBadge status={b.status} />
                  </div>

                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                    {b.item?.title}
                  </h4>

                  <div className="mt-1 text-xs text-slate-600 flex flex-wrap items-center gap-3">
                    <span>Borrower: <strong>{b.receiver?.name}</strong> (Trust {b.receiver?.trustScore})</span>
                    <span>•</span>
                    <span>Duration: <strong>{b.durationHours} hrs</strong></span>
                    <span>•</span>
                    <span>Rental: <strong>₹{b.rentalAmount}</strong></span>
                    <span>•</span>
                    <span className="text-emerald-700 font-bold">Your Earnings: ₹{b.lenderEarnings}</span>
                  </div>

                  {/* Extension Alert */}
                  {b.status === 'EXTENSION_REQUESTED' && b.extensionRequests && b.extensionRequests[0] && (
                    <div className="mt-3 p-3 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <strong>Extension Requested:</strong> +{b.extensionRequests[0].additionalHours} hours (+₹{b.extensionRequests[0].additionalAmount})
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRespondExtension(b.id, b.extensionRequests![0].id, 'APPROVE')}
                          className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold text-xs"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRespondExtension(b.id, b.extensionRequests![0].id, 'REJECT')}
                          className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold text-xs"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 15-Minute Inspection Banner */}
                  {b.status === 'INSPECTION_PENDING' && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                        <Clock className="w-4 h-4 text-amber-700 animate-spin" />
                        <span>15-Minute Inspection Window Active</span>
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Inspect the equipment for any damages or missing parts. If clean, confirm release to complete the settlement. If damaged, submit a claim before the timer expires.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          onClick={() => handleCompleteCleanInspection(b.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                        >
                          ✓ Confirm Clean Condition & Release Deposit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setShowDamageModal(true);
                          }}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                        >
                          ⚠️ Report Visible Damage
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap md:flex-col items-end justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    {/* Accept / Decline Pending Requests */}
                    {['PENDING', 'PENDING_APPROVAL'].includes(b.status) && (
                      <>
                        <button
                          onClick={() => handleRespondBooking(b.id, 'ACCEPT')}
                          disabled={actionLoading}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-primary text-white text-xs font-bold hover:opacity-95 shadow-xs cursor-pointer"
                        >
                          Accept Booking
                        </button>
                        <button
                          onClick={() => handleRespondBooking(b.id, 'REJECT')}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {/* Awaiting Borrower Payment */}
                    {['ACCEPTED', 'PAYMENT_PENDING'].includes(b.status) && (
                      <span className="px-3 py-1.5 rounded-xl bg-violet-50 text-violet-800 text-xs font-bold border border-violet-200">
                        ✓ Accepted • Awaiting Borrower UPI Payment
                      </span>
                    )}

                    {/* Verify Handover OTP */}
                    {['CONFIRMED', 'READY_FOR_PICKUP'].includes(b.status) && (
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setShowVerifyHandoverModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-primary text-white text-xs font-bold shadow-md shadow-teal-500/20 hover:opacity-95 flex items-center gap-1.5 cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Verify Receiver OTP</span>
                      </button>
                    )}

                    {/* Verify Return OTP */}
                    {(b.status === 'ACTIVE' || b.status === 'RETURN_REQUESTED') && (
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setShowVerifyReturnModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-cyan-700 text-white text-xs font-bold hover:bg-cyan-800 flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Verify Return OTP</span>
                      </button>
                    )}

                    <button
                      onClick={() => onOpenChat(b.receiverId)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      title="Chat with borrower"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* SECTION 2: MY LISTED EQUIPMENT */}
      {(activeTabFilter === 'all' || activeTabFilter === 'listings') && (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900">
            My Equipment Catalog ({listings.length})
          </h3>
          <span className="text-sm text-slate-500">Edit rates, pause listings, or update equipment specs</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative h-56 w-full bg-slate-100 overflow-hidden shrink-0">
                  <img
                    src={item.images?.[0]?.url || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80'}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <ListingApprovalBadge status={item.status} />
                    {item.isAvailable === false && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 shadow-xs">
                        Paused
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-slate-950/90 text-white text-sm font-black shadow-md">
                    ₹{item.hourlyRate}/hr {item.dailyRate ? `• ₹${item.dailyRate}/day` : ''}
                  </div>
                </div>

                <div className="p-5">
                  <div className="text-xs font-black text-teal-700 uppercase tracking-wider mb-1">
                    {item.category?.name}
                  </div>
                  <h4 className="text-base font-bold text-slate-900 line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="text-sm text-slate-500 mt-1.5 line-clamp-2">
                    {item.description}
                  </p>

                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
                    <span>Deposit: <strong className="text-emerald-700 font-bold">₹0 (Deposit-Free)</strong></span>
                    <span>Value: <strong>₹{item.replacementValue}</strong></span>
                    <span>{item.isDeliveryAvailable ? '🚚 Delivery' : '📍 Pickup Only'}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0 space-y-3">
                {item.status === 'PENDING_APPROVAL' && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    ⏳ Under admin review. Once verified, it will be visible in the neighborhood.
                  </div>
                )}
                {item.status === 'APPROVED' && (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Live & accepting bookings in {item.area}</span>
                  </div>
                )}

                {/* Lender Listing Management Actions */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button
                    onClick={() => handleTogglePause(item)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      item.status === 'SUSPENDED'
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                    title={item.status === 'SUSPENDED' ? 'Resume listing' : 'Pause listing'}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{item.status === 'SUSPENDED' ? 'Resume' : 'Pause'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDeleteListing(item)}
                    className="py-2 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* SECTION 3: EARNINGS STATEMENT VIEW */}
      {(activeTabFilter === 'all' || activeTabFilter === 'earnings') && (
        <div className="p-8 rounded-3xl bg-white border border-[#E5E9ED] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900">Neighborhood Payouts & Earnings Statement</h3>
              <p className="text-sm text-slate-500 mt-1">Earnings settle directly to your verified UPI handle after 15-minute return inspection</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-700">₹{totalLenderEarnings.toLocaleString('en-IN')}</span>
              <span className="block text-xs text-slate-400">Total Net Income</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 uppercase font-bold">Platform Fee</span>
              <span className="block text-base font-bold text-slate-800 mt-0.5">₹15 Flat / Rental</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 uppercase font-bold">Deposit Model</span>
              <span className="block text-base font-bold text-emerald-800 mt-0.5">100% Deposit-Free</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 uppercase font-bold">Payout Speed</span>
              <span className="block text-base font-bold text-teal-800 mt-0.5">Instant upon Inspection</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: LENDER VERIFIES RECEIVER'S HANDOVER OTP */}
      {showVerifyHandoverModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Verify Handover OTP</h3>
              <button onClick={() => setShowVerifyHandoverModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleVerifyHandover} className="my-4 space-y-4">
              <p className="text-xs text-slate-600">
                Ask <strong>{selectedBooking.receiver?.name}</strong> for the 6-digit handover OTP shown in their app.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Receiver's 6-Digit OTP
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 482910"
                  value={handoverInputOtp}
                  onChange={(e) => setHandoverInputOtp(e.target.value)}
                  className="w-full text-center text-xl font-mono tracking-widest py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Handover Condition Confirmation
                </label>
                <input
                  type="text"
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 rounded-xl bg-gradient-primary text-white text-xs sm:text-sm font-bold shadow-md shadow-teal-500/20 hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Verifying...' : 'Confirm Handover & Start Live Timer'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LENDER VERIFIES RECEIVER'S RETURN OTP */}
      {showVerifyReturnModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Verify Return OTP</h3>
              <button onClick={() => setShowVerifyReturnModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleVerifyReturn} className="my-4 space-y-4">
              <p className="text-xs text-slate-600">
                Enter the return OTP provided by <strong>{selectedBooking.receiver?.name}</strong> upon receiving your equipment back.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Return OTP Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 719340"
                  value={returnInputOtp}
                  onChange={(e) => setReturnInputOtp(e.target.value)}
                  className="w-full text-center text-xl font-mono tracking-widest py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/30"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 rounded-xl bg-gradient-primary text-white text-xs sm:text-sm font-bold shadow-md shadow-teal-500/20 hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Verifying...' : 'Start 15-Minute Inspection Window'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REPORT DAMAGE / FILE CLAIM */}
      {showDamageModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 text-rose-700">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>File Equipment Damage Claim</span>
              </h3>
              <button onClick={() => setShowDamageModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleFileDamageClaim} className="my-4 space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Item: <strong>{selectedBooking.item?.title}</strong><br />
                Replacement Value: <strong>₹{selectedBooking.item?.replacementValue}</strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description of Damage
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail visible cracks, broken parts, or missing accessories..."
                  value={damageDescription}
                  onChange={(e) => setDamageDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-rose-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estimated Repair Cost (₹)
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 1200"
                  value={estimatedRepairCost}
                  onChange={(e) => setEstimatedRepairCost(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-rose-500/30"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  For repairable issues, only reasonable repair costs are assessed rather than full item replacement.
                </p>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Submitting Claim...' : 'File Claim for Admin Review'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT LISTING MODAL */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-teal-700" />
                <h3 className="text-xl font-black text-slate-900">Edit Equipment Listing</h3>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="my-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Equipment Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Description & What's Included
                </label>
                <textarea
                  rows={3}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Hourly Rate (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editHourlyRate}
                    onChange={(e) => setEditHourlyRate(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Daily Rate (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editDailyRate}
                    onChange={(e) => setEditDailyRate(Number(e.target.value))}
                    placeholder="Optional"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>
              </div>

              {/* Delivery Toggle & Fee */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <Truck className="w-4 h-4 text-teal-600" />
                    <span>Offer Doorstep Delivery?</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={editIsDelivery}
                    onChange={(e) => setEditIsDelivery(e.target.checked)}
                    className="w-5 h-5 accent-teal-600 rounded cursor-pointer"
                  />
                </label>

                {editIsDelivery && (
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Delivery Fee (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editDeliveryFee}
                      onChange={(e) => setEditDeliveryFee(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                    />
                  </div>
                )}
              </div>

              {/* Availability (Active vs Paused) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <Power className={`w-4 h-4 ${editIsAvailable ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>Listing Availability (Active for rent)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={editIsAvailable}
                    onChange={(e) => setEditIsAvailable(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                  />
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  Uncheck to temporarily pause this listing from search results when you're using the item yourself.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-3 rounded-2xl bg-gradient-primary text-white text-sm font-bold shadow-lg shadow-teal-500/20 hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{actionLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable Listing Approval Badge
export const ListingApprovalBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'APPROVED') {
    return (
      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600/90 text-white backdrop-blur-md shadow-xs">
        ✓ Approved & Live
      </span>
    );
  }
  if (status === 'PENDING_APPROVAL') {
    return (
      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/90 text-white backdrop-blur-md shadow-xs">
        ⏳ Pending Approval
      </span>
    );
  }
  if (status === 'SUSPENDED' || status === 'PAUSED') {
    return (
      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 backdrop-blur-md shadow-xs">
        ⏸ Paused
      </span>
    );
  }
  if (status === 'REJECTED') {
    return (
      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-rose-600/90 text-white backdrop-blur-md shadow-xs">
        ✕ Needs Revision
      </span>
    );
  }
  return null;
};
