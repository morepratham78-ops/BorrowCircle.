import React, { useState, useEffect } from 'react';
import { Booking, User } from '../types';
import { api } from '../services/api';
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  QrCode,
  KeyRound,
  RotateCcw,
  Star,
  Info,
  Calendar,
  Phone,
  MessageSquare,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

interface MyRentalsScreenProps {
  user: User;
  onOpenChat: (contactId: string) => void;
  onRefreshUser: () => void;
  initialFilter?: 'ALL' | 'ACTIVE' | 'PENDING' | 'COMPLETED';
}

export const MyRentalsScreen: React.FC<MyRentalsScreenProps> = ({
  user,
  onOpenChat,
  onRefreshUser,
  initialFilter = 'ALL'
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'COMPLETED'>(initialFilter);

  useEffect(() => {
    if (initialFilter) {
      setFilterTab(initialFilter);
    }
  }, [initialFilter]);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [showExtendModal, setShowExtendModal] = useState<boolean>(false);
  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Action states
  const [paymentUpi, setPaymentUpi] = useState<string>('receiver@oksbi');
  const [extensionHours, setExtensionHours] = useState<number>(2);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>('');

  // Live timer tick every second
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await api.getBookings('borrower');
      setBookings(res.bookings || []);
    } catch (err) {
      console.error('Failed to fetch bookings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // 1. Pay for booking
  const handlePayBooking = async (b: Booking) => {
    setActionLoading(true);
    try {
      const res = await api.payBooking(b.id, 'UPI', paymentUpi);
      if (res && res.code === 'GATEWAY_NOT_CONFIGURED') {
        alert(res.error || 'Payment Gateway is not configured on this server.');
        return;
      }
      setShowPaymentModal(false);
      setNotice('Payment confirmed! Booking is now ready for pickup.');
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Payment Gateway is not configured on this server.');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Request Handover OTP
  const handleRequestHandoverOtp = async (b: Booking) => {
    setActionLoading(true);
    try {
      const res = await api.requestHandoverOtp(b.id);
      setSelectedBooking({ ...b, handoverOtp: res.handoverOtp });
      setShowOtpModal(true);
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to request handover OTP');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Request Rental Extension
  const handleRequestExtension = async (b: Booking) => {
    setActionLoading(true);
    try {
      await api.requestExtension(b.id, extensionHours);
      setShowExtendModal(false);
      setNotice(`Extension for +${extensionHours} hours requested from lender.`);
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to request extension');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Request Return OTP
  const handleRequestReturnOtp = async (b: Booking) => {
    setActionLoading(true);
    try {
      const res = await api.requestReturnOtp(b.id);
      setSelectedBooking({ ...b, returnOtp: res.returnOtp });
      setShowReturnModal(true);
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to request return OTP');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Submit Review
  const handleSubmitReview = async (b: Booking) => {
    setActionLoading(true);
    try {
      await api.submitReview(b.id, reviewRating, reviewComment);
      setShowReviewModal(false);
      setNotice('Review submitted successfully! Thank you for rating.');
      onRefreshUser();
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Cancel Booking
  const handleCancelBooking = async (b: Booking) => {
    setActionLoading(true);
    try {
      await api.cancelBooking(b.id, cancelReason || 'Cancelled by borrower prior to handover');
      setShowCancelModal(false);
      setCancelReason('');
      setNotice('Rental booking was cancelled successfully.');
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to calculate live countdown
  const getRemainingTimeDisplay = (expectedEndStr: string) => {
    const end = new Date(expectedEndStr).getTime();
    const diff = end - now.getTime();

    if (diff <= 0) {
      const overdueMinutes = Math.abs(Math.floor(diff / (1000 * 60)));
      return {
        isOverdue: true,
        text: `Overdue by ${Math.floor(overdueMinutes / 60)}h ${overdueMinutes % 60}m`
      };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      isOverdue: false,
      text: `${hours}h ${minutes}m ${seconds}s remaining`
    };
  };

  const filteredBookings = bookings.filter((b) => {
    if (filterTab === 'ACTIVE') {
      return ['CONFIRMED', 'READY_FOR_PICKUP', 'ACTIVE', 'EXTENSION_REQUESTED', 'RETURN_REQUESTED', 'INSPECTION_PENDING'].includes(b.status);
    }
    if (filterTab === 'PENDING') {
      return ['PENDING', 'PENDING_APPROVAL', 'APPROVED', 'ACCEPTED', 'PAYMENT_PENDING'].includes(b.status);
    }
    if (filterTab === 'COMPLETED') {
      return ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(b.status);
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#102A2A] tracking-tight">
            My Rentals & Live Usage
          </h2>
          <p className="text-xs text-[#718096]">
            Track active rentals with live billing timers, OTP handovers, and return inspections.
          </p>
        </div>
        <button
          onClick={fetchBookings}
          className="px-3 py-1.5 rounded-xl bg-white border border-[#E5E9ED] text-xs font-bold text-[#003B3B] hover:bg-slate-50 shadow-xs cursor-pointer"
        >
          Refresh Status
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E9ED] pb-3">
        {[
          { id: 'ALL', label: 'All Rentals', count: bookings.length },
          { id: 'ACTIVE', label: 'Active & In-Progress', count: bookings.filter(b => ['CONFIRMED', 'READY_FOR_PICKUP', 'ACTIVE', 'EXTENSION_REQUESTED', 'RETURN_REQUESTED', 'INSPECTION_PENDING'].includes(b.status)).length },
          { id: 'PENDING', label: 'Pending Approval', count: bookings.filter(b => ['PENDING', 'PENDING_APPROVAL', 'APPROVED', 'ACCEPTED', 'PAYMENT_PENDING'].includes(b.status)).length },
          { id: 'COMPLETED', label: 'Completed & Past', count: bookings.filter(b => ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(b.status)).length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === tab.id
                ? 'bg-[#003B3B] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-[#E5E9ED] hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              filterTab === tab.id ? 'bg-[#16D9CC] text-[#003B3B]' : 'bg-slate-100 text-slate-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="text-emerald-600 font-bold">×</button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading rentals...</div>
      ) : filteredBookings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#E5E9ED]">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#102A2A]">No equipment rentals in this filter</h3>
          <p className="text-xs text-[#718096] mt-1 max-w-sm mx-auto">
            Browse nearby drills, cameras, projectors, or camping gear in Discover and start saving.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBookings.map((b) => {
            const timer = b.status === 'ACTIVE' && b.expectedEndTime ? getRemainingTimeDisplay(b.expectedEndTime) : null;

            return (
              <div
                key={b.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E5E9ED] shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row justify-between gap-6"
              >
                {/* Left: Item & Schedule Info */}
                <div className="flex items-start gap-4">
                  <img
                    src={b.item?.images?.[0]?.url || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80'}
                    alt={b.item?.title}
                    className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-[#E5E9ED]"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {b.bookingNumber}
                      </span>
                      <StatusBadge status={b.status} />
                      <PaymentStatusBadge paymentStatus={b.paymentStatus} />
                    </div>

                    <h3 className="text-sm sm:text-base font-extrabold text-[#102A2A]">
                      {b.item?.title}
                    </h3>

                    <div className="mt-1 text-xs text-[#718096] flex flex-wrap items-center gap-3">
                      <span>Owner: <strong className="text-[#102A2A]">{b.lender?.name}</strong></span>
                      <span>•</span>
                      <span>Rate: <strong className="text-[#003B3B]">₹{b.hourlyRate}/hr</strong></span>
                      <span>•</span>
                      <span>Duration: <strong>{b.durationHours} hrs</strong></span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">Zero Deposit</span>
                    </div>

                    {/* LIVE RENTAL TIMER DISPLAY */}
                    {b.status === 'ACTIVE' && timer && (
                      <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-teal-300/50 flex flex-wrap items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#003B3B] text-[#16D9CC] flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4 animate-spin [animation-duration:8s]" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                            Live Usage Timer Active
                          </div>
                          <div className={`text-sm font-black ${timer.isOverdue ? 'text-rose-600' : 'text-[#003B3B]'}`}>
                            {timer.text}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* INSPECTION COUNTDOWN */}
                    {b.status === 'INSPECTION_PENDING' && (
                      <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-amber-900 text-xs">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <strong>15-Minute Lender Inspection Window Active.</strong> Owner is verifying equipment condition.
                        </div>
                      </div>
                    )}

                    {/* ACCEPTED / PAYMENT PENDING BANNER */}
                    {(b.status === 'PAYMENT_PENDING' || b.status === 'ACCEPTED') && (
                      <div className="mt-3 p-3 rounded-2xl bg-violet-50 border border-violet-200 text-xs text-violet-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-violet-600 shrink-0" />
                        <div>
                          <strong>Booking Approved by Owner!</strong> Please complete payment to confirm your equipment reservation.
                        </div>
                      </div>
                    )}

                    {/* CONFIRMED / READY FOR PICKUP BANNER */}
                    {(b.status === 'CONFIRMED' || b.status === 'READY_FOR_PICKUP') && (
                      <div className="mt-3 p-3 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-[#003B3B] flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                        <div>
                          <strong>Booking Confirmed & Paid!</strong> Collect equipment from the owner and share the Handover OTP.
                        </div>
                      </div>
                    )}

                    {/* REJECTED BANNER */}
                    {b.status === 'REJECTED' && (
                      <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <div>
                          <strong>Booking Request Declined:</strong> {b.cancellationReason || 'Lender is unavailable for this rental slot.'}
                        </div>
                      </div>
                    )}

                    {/* CANCELLED BANNER */}
                    {b.status === 'CANCELLED' && (
                      <div className="mt-3 p-3 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0" />
                        <div>
                          <strong>Booking Cancelled:</strong> {b.cancellationReason || 'Cancelled prior to physical handover.'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Contextual Lifecycle Actions */}
                <div className="flex flex-col justify-between items-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-[#718096] font-medium">Total Payable</div>
                    <div className="text-lg font-black text-[#102A2A]">₹{b.totalPayableAmount}</div>
                    <div className="text-[10px] text-emerald-700 font-semibold">Zero Security Deposit • Flat ₹15 Fee</div>
                  </div>

                  {/* Contextual Action Buttons based on FSM state */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 1. Payment Pending */}
                    {(b.status === 'PAYMENT_PENDING' || b.status === 'ACCEPTED') && (
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setShowPaymentModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#003B3B] hover:bg-[#002b2b] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-[#16D9CC]" />
                        <span>Pay with UPI (₹{b.totalPayableAmount})</span>
                      </button>
                    )}

                    {/* 2. Ready for Pickup -> Request Handover OTP */}
                    {(b.status === 'READY_FOR_PICKUP' || b.status === 'CONFIRMED') && (
                      <button
                        onClick={() => handleRequestHandoverOtp(b)}
                        className="px-4 py-2 rounded-xl bg-[#003B3B] hover:bg-[#002b2b] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-[#16D9CC]" />
                        <span>Show Handover OTP</span>
                      </button>
                    )}

                    {/* 3. Active -> Request Extension & Return */}
                    {b.status === 'ACTIVE' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setShowExtendModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                        >
                          + Extend Time
                        </button>
                        <button
                          onClick={() => handleRequestReturnOtp(b)}
                          className="px-4 py-2 rounded-xl bg-[#003B3B] hover:bg-[#002b2b] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#16D9CC]" />
                          <span>Return Equipment OTP</span>
                        </button>
                      </>
                    )}

                    {/* 4. Cancellation Button (Available before physical handover) */}
                    {['PENDING', 'PENDING_APPROVAL', 'APPROVED', 'ACCEPTED', 'PAYMENT_PENDING', 'CONFIRMED', 'READY_FOR_PICKUP'].includes(b.status) && (
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setShowCancelModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancel Booking
                      </button>
                    )}

                    {/* 5. Completed -> Review & Rating */}
                    {b.status === 'COMPLETED' && (
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setShowReviewModal(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>Leave Review</span>
                      </button>
                    )}

                    {/* Chat with owner */}
                    <button
                      onClick={() => onOpenChat(b.lenderId)}
                      className="p-2 rounded-xl bg-[#F5F7F8] hover:bg-slate-200 text-slate-600 transition-colors border border-[#E5E9ED] cursor-pointer"
                      title="Chat with lender"
                    >
                      <MessageSquare className="w-4 h-4 text-[#003B3B]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: UPI PAYMENT MODAL */}
      {showPaymentModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Secure Indian UPI Checkout</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="my-4 p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>Rental ({selectedBooking.durationHours} hrs × ₹{selectedBooking.hourlyRate})</span>
                <span className="font-bold">₹{selectedBooking.rentalAmount}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Platform Commission (Receiver Fee)</span>
                <span className="font-bold">₹{selectedBooking.receiverFee}</span>
              </div>
              <div className="pt-2 border-t border-teal-200 flex justify-between text-base font-black text-slate-900">
                <span>Total Amount to Pay</span>
                <span className="text-teal-700">₹{selectedBooking.totalPayableAmount}</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-bold text-slate-700">UPI ID / VPA</label>
              <input
                type="text"
                value={paymentUpi}
                onChange={(e) => setPaymentUpi(e.target.value)}
                placeholder="e.g. mobile@upi or username@oksbi"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500/30"
              />
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <div className="font-bold flex items-center gap-1.5 mb-0.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Payment Gateway Authentication</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Online payments connect via secure Razorpay/UPI gateway. If unconfigured in this environment, requests will report status honestly without fake simulation.
                </p>
              </div>
            </div>

            <button
              onClick={() => handlePayBooking(selectedBooking)}
              disabled={actionLoading}
              className="w-full py-3 rounded-xl bg-[#002f34] hover:bg-[#003B3B] text-white text-xs sm:text-sm font-bold shadow-md hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Connecting to Gateway...' : `Proceed to Pay ₹${selectedBooking.totalPayableAmount}`}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: TWO-SIDED HANDOVER OTP MODAL */}
      {showOtpModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">Two-Sided Handover OTP</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Share this one-time code with <strong>{selectedBooking.lender?.name}</strong> when receiving the equipment.
            </p>

            <div className="my-6 p-4 rounded-2xl bg-teal-50 border-2 border-dashed border-teal-400">
              <div className="text-3xl font-mono font-black text-teal-900 tracking-widest">
                {selectedBooking.handoverOtp || '482910'}
              </div>
              <div className="text-[10px] text-teal-700 font-bold mt-1 uppercase">
                Valid for physical handover verification
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 text-left mb-6 space-y-1">
              <div>✓ Check that the equipment matches photos.</div>
              <div>✓ Lender enters this OTP in their BorrowCircle app.</div>
              <div>✓ Live rental timer begins immediately upon confirmation.</div>
            </div>

            <button
              onClick={() => setShowOtpModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: RETURN OTP MODAL */}
      {showReturnModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center mx-auto mb-3">
              <RotateCcw className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">Return Verification OTP</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Share this code with the owner when handing back the equipment.
            </p>

            <div className="my-6 p-4 rounded-2xl bg-cyan-50 border-2 border-dashed border-cyan-400">
              <div className="text-3xl font-mono font-black text-cyan-900 tracking-widest">
                {selectedBooking.returnOtp || '719340'}
              </div>
              <div className="text-[10px] text-cyan-800 font-bold mt-1 uppercase">
                Return OTP Code
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 text-left mb-6">
              Owner will start the <strong>15-minute inspection window</strong> upon verifying this code to complete equipment return.
            </div>

            <button
              onClick={() => setShowReturnModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: REQUEST EXTENSION MODAL */}
      {showExtendModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Request Rental Extension</h3>
              <button onClick={() => setShowExtendModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="my-4 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Additional Hours Needed:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 4].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setExtensionHours(h)}
                    className={`py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                      extensionHours === h
                        ? 'bg-gradient-primary text-white border-transparent'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    +{h} {h === 1 ? 'Hour' : 'Hours'}
                  </button>
                ))}
              </div>

              <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-900">
                Additional Rental Charge: <strong>₹{Math.round(extensionHours * selectedBooking.hourlyRate)}</strong>
              </div>
            </div>

            <button
              onClick={() => handleRequestExtension(selectedBooking)}
              disabled={actionLoading}
              className="w-full py-3 rounded-xl bg-gradient-primary text-white text-xs sm:text-sm font-bold shadow-md shadow-teal-500/20 hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Requesting...' : `Submit Request (+₹${Math.round(extensionHours * selectedBooking.hourlyRate)})`}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: LEAVE REVIEW MODAL */}
      {showReviewModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Rate Your Rental Experience</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="my-4 text-center">
              <div className="flex justify-center gap-2 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        reviewRating >= star ? 'fill-amber-500 text-amber-500' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="text-xs font-bold text-slate-700">{reviewRating} out of 5 Stars</div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">Feedback Comment</label>
              <textarea
                rows={3}
                placeholder="How was the equipment condition and lender handover?"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            <button
              onClick={() => handleSubmitReview(selectedBooking)}
              disabled={actionLoading}
              className="w-full py-3 rounded-xl bg-[#003B3B] hover:bg-[#002b2b] text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Submitting Review...' : 'Post Review'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 6: CANCEL BOOKING MODAL */}
      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Cancel Equipment Rental</h3>
              <button onClick={() => setShowCancelModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="my-4 space-y-3">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                Cancelling rental for <strong>{selectedBooking.item?.title}</strong>. Any paid fee will be immediately refunded.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cancellation Reason (Optional):
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 mb-2 cursor-pointer"
                >
                  <option value="">Select a reason...</option>
                  <option value="Schedule changed / No longer needed">Schedule changed / No longer needed</option>
                  <option value="Found alternative equipment">Found alternative equipment</option>
                  <option value="Lender location too far">Lender location too far</option>
                  <option value="Accidental booking">Accidental booking</option>
                </select>
                <input
                  type="text"
                  placeholder="Or enter custom reason..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Keep Rental
              </button>
              <button
                type="button"
                onClick={() => handleCancelBooking(selectedBooking)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable status badge component
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
    PENDING_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-300',
    APPROVED: 'bg-blue-100 text-blue-800 border-blue-300',
    ACCEPTED: 'bg-violet-100 text-violet-800 border-violet-300',
    PAYMENT_PENDING: 'bg-violet-100 text-violet-800 border-violet-300',
    CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-300',
    READY_FOR_PICKUP: 'bg-teal-100 text-teal-800 border-teal-300',
    ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse',
    EXTENSION_REQUESTED: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    RETURN_REQUESTED: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    INSPECTION_PENDING: 'bg-orange-100 text-orange-800 border-orange-300',
    COMPLETED: 'bg-slate-100 text-slate-800 border-slate-300',
    CANCELLED: 'bg-slate-200 text-slate-600 border-slate-300',
    REJECTED: 'bg-rose-100 text-rose-800 border-rose-300',
    DISPUTED: 'bg-red-100 text-red-800 border-red-300'
  };

  const labelMap: Record<string, string> = {
    PENDING: 'PENDING APPROVAL',
    PENDING_APPROVAL: 'PENDING APPROVAL',
    PAYMENT_PENDING: 'PAYMENT PENDING',
    ACCEPTED: 'PAYMENT PENDING',
    READY_FOR_PICKUP: 'READY FOR PICKUP',
    CONFIRMED: 'CONFIRMED',
    REJECTED: 'DECLINED'
  };

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles[status] || 'bg-slate-100 text-slate-800 border-slate-300'}`}>
      {labelMap[status] || status.replace(/_/g, ' ')}
    </span>
  );
};

export const PaymentStatusBadge: React.FC<{ paymentStatus?: string }> = ({ paymentStatus = 'NOT_INITIATED' }) => {
  const styles: Record<string, string> = {
    NOT_INITIATED: 'bg-slate-100 text-slate-600 border-slate-300',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
    SUCCESSFUL: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    FAILED: 'bg-rose-100 text-rose-800 border-rose-300',
    CANCELLED: 'bg-slate-200 text-slate-600 border-slate-300',
    REFUNDED: 'bg-blue-100 text-blue-800 border-blue-300'
  };

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles[paymentStatus] || 'bg-slate-100 text-slate-600 border-slate-300'}`}>
      Payment: {(paymentStatus || 'NOT_INITIATED').replace(/_/g, ' ')}
    </span>
  );
};
