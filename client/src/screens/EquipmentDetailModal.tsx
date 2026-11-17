import React, { useState } from 'react';
import { Item, User } from '../types';
import { api } from '../services/api';
import {
  X,
  ShieldCheck,
  Star,
  Clock,
  MapPin,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Lock,
  MessageSquare,
  FileBadge,
  Sparkles,
  ChevronRight,
  Shield,
  FileText
} from 'lucide-react';

interface EquipmentDetailModalProps {
  item: Item;
  currentUser: User;
  onClose: () => void;
  onBookingCreated: () => void;
  onOpenChat: (ownerId: string) => void;
}

export const EquipmentDetailModal: React.FC<EquipmentDetailModalProps> = ({
  item,
  currentUser,
  onClose,
  onBookingCreated,
  onOpenChat
}) => {
  const [selectedHours, setSelectedHours] = useState<number>(Math.max(2, item.minHours));
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string>('Today, 2:00 PM');
  const [isDelivery, setIsDelivery] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [showPassport, setShowPassport] = useState<boolean>(false);
  const [passportData, setPassportData] = useState<any>(null);
  const [loadingPassport, setLoadingPassport] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'specs' | 'safety' | 'reviews'>('specs');

  const handleTogglePassport = async () => {
    if (showPassport) {
      setShowPassport(false);
      return;
    }
    setShowPassport(true);
    if (!passportData) {
      setLoadingPassport(true);
      try {
        const res = await api.getItemPassport(item.id);
        if (res.passport) {
          setPassportData(res.passport);
        }
      } catch (err) {
        console.error('Failed to load passport', err);
      } finally {
        setLoadingPassport(false);
      }
    }
  };

  // Price calculations matching backend exact formulas (Deposit-free rental)
  const baseRental = Math.round(selectedHours * item.hourlyRate);
  const receiverFee = 15; // BorrowCircle configurable platform fee
  const delivery = isDelivery ? item.deliveryFee : 0;
  const totalPayable = baseRental + receiverFee + delivery;
  const lenderEarnings = Math.max(0, baseRental - 15);

  const images = item.images && item.images.length > 0
    ? item.images.map(img => img.url)
    : ['https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80'];

  const handleRequestBooking = async () => {
    if (currentUser.id === item.ownerId) {
      setErrorMessage('You cannot rent equipment listed by yourself.');
      return;
    }

    if (!agreedToTerms) {
      setErrorMessage('Please accept the Digital Rental Agreement to proceed.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const now = new Date();
      // Schedule start 30 mins from now or scheduled date
      const startTime = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

      await api.createBooking({
        itemId: item.id,
        durationHours: selectedHours,
        startTime,
        isDelivery,
        notes: notes || `Rental request for ${selectedHours} hours on ${selectedDate} (${selectedSlot}).`
      });

      onBookingCreated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit booking request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-6 shadow-2xl border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-3.5 border-b border-[#E5E9ED] bg-[#F5F7F8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-black uppercase tracking-wider text-[#003B3B]">
              Verified Neighborhood Equipment Listing
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-600 shadow-xs transition-all cursor-pointer border border-[#E5E9ED]"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left Column: Gallery & Equipment Dossier (7 cols) */}
          <div className="md:col-span-7 p-6 bg-white border-r border-[#E5E9ED] space-y-5">
            {/* Main Image with Badges */}
            <div className="relative h-64 sm:h-80 w-full rounded-2xl overflow-hidden bg-slate-100 border border-[#E5E9ED] shadow-xs shrink-0">
              <img
                src={images[activeImageIndex]}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[#ffce32] text-[#002f34] text-[10px] font-black uppercase shadow-xs">
                  FEATURED
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[#003B3B]/90 backdrop-blur-sm text-white text-[10px] font-bold">
                  {item.condition}
                </span>
              </div>
              <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium">
                Photo {activeImageIndex + 1} of {images.length}
              </div>
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      activeImageIndex === idx ? 'border-[#003B3B] scale-105 shadow-xs' : 'border-[#E5E9ED] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Header: Title, Category, Rating */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-teal-800 uppercase tracking-wider mb-1">
                <span>{item.category?.name || 'Tools & Equipment'}</span>
                <span className="text-[11px] text-[#718096] font-medium">Listed in {item.area}, {item.city}</span>
              </div>
              <h2 className="text-xl font-extrabold text-[#102A2A] leading-snug">
                {item.title}
              </h2>
              <p className="mt-2 text-xs text-[#718096] leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Lender Profile Card */}
            <div className="p-4 rounded-2xl bg-[#F5F7F8] border border-[#E5E9ED] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={item.owner?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.owner?.name}`}
                  alt={item.owner?.name}
                  className="w-12 h-12 rounded-full border-2 border-teal-600/30 object-cover"
                />
                <div>
                  <div className="text-sm font-bold text-[#102A2A] flex items-center gap-1.5">
                    <span>{item.owner?.name}</span>
                    {item.owner?.aadharVerified && (
                      <span title="Aadhaar Verified Local Lender" className="inline-flex">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#718096] flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>{item.area}, {item.city} (1.2 km away)</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <Shield className="w-3 h-3 text-emerald-600" />
                  <span>Trust: {item.owner?.trustScore || 100}/100</span>
                </div>
                <div className="text-xs text-amber-800 font-bold flex items-center justify-end gap-1 mt-1">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{item.owner?.rating || '4.9'} ({item.owner?.ratingCount || 24} reviews)</span>
                </div>
              </div>
            </div>

            {/* Specifications & Safety Instructions Tabs */}
            <div className="border border-[#E5E9ED] rounded-2xl overflow-hidden">
              <div className="flex border-b border-[#E5E9ED] bg-[#F5F7F8] text-xs font-bold text-slate-600">
                <button
                  type="button"
                  onClick={() => setActiveTab('specs')}
                  className={`flex-1 py-2.5 text-center cursor-pointer transition-colors ${
                    activeTab === 'specs' ? 'bg-white text-[#003B3B] border-b-2 border-[#003B3B]' : 'hover:text-[#003B3B]'
                  }`}
                >
                  Technical Specifications
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('safety')}
                  className={`flex-1 py-2.5 text-center cursor-pointer transition-colors ${
                    activeTab === 'safety' ? 'bg-white text-[#003B3B] border-b-2 border-[#003B3B]' : 'hover:text-[#003B3B]'
                  }`}
                >
                  Handover Safety Guide
                </button>
              </div>

              <div className="p-4 bg-white text-xs">
                {activeTab === 'specs' ? (
                  <div className="grid grid-cols-2 gap-3 text-slate-700">
                    <div className="bg-[#F5F7F8] p-2.5 rounded-xl border border-[#E5E9ED]">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Condition Grade</span>
                      <span className="font-extrabold text-[#102A2A]">{item.condition} (Fully functional)</span>
                    </div>
                    <div className="bg-[#F5F7F8] p-2.5 rounded-xl border border-[#E5E9ED]">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Accessories Included</span>
                      <span className="font-extrabold text-[#102A2A]">Carry case, 2 batteries, charger</span>
                    </div>
                    <div className="bg-[#F5F7F8] p-2.5 rounded-xl border border-[#E5E9ED]">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Power / Operating Spec</span>
                      <span className="font-extrabold text-[#102A2A]">220-240V AC / Cordless Li-Ion</span>
                    </div>
                    <div className="bg-[#F5F7F8] p-2.5 rounded-xl border border-[#E5E9ED]">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Replacement Valuation</span>
                      <span className="font-extrabold text-[#102A2A]">₹{item.replacementValue || 8500}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-[#718096]">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Dual-OTP Handover:</strong> Lender inputs your OTP at pickup. Never share OTP before physically inspecting the equipment.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span><strong>15-Minute Inspection Window:</strong> You have 15 minutes after pickup to test the equipment and report any pre-existing flaw.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span><strong>Clean Return:</strong> Return the equipment in the same clean state with all accessories for seamless instant rental completion.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Digital Passport Card */}
            <div>
              <button
                type="button"
                onClick={handleTogglePassport}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-50 hover:bg-teal-100/80 border border-teal-200 text-[#003B3B] text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileBadge className="w-4 h-4 text-teal-700" />
                  <span>Digital Equipment Passport & Maintenance Log</span>
                </span>
                <span className="text-[10px] bg-teal-200/70 text-teal-900 px-2 py-0.5 rounded-md font-mono font-bold">
                  {item.passportSerial || 'VERIFIED #BC-2026'}
                </span>
              </button>

              {showPassport && (
                <div className="mt-2 p-3.5 rounded-2xl bg-white border border-teal-300 shadow-sm text-xs space-y-2.5">
                  {loadingPassport ? (
                    <div className="py-4 text-center text-slate-400 text-xs">Loading verified passport history...</div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-[10px] font-bold text-slate-400">PASSPORT SERIAL</span>
                        <span className="font-mono text-teal-800 font-bold">{passportData?.serialNumber || item.passportSerial || 'BC-IN-2026-BLR'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-[#F5F7F8] p-2 rounded-lg">
                          <span className="text-slate-400 block text-[9px] font-bold">TOTAL COMPLETED RENTALS</span>
                          <span className="font-bold text-slate-800">{passportData?.rentalStats?.totalCompletedBookings ?? 14} times without incident</span>
                        </div>
                        <div className="bg-[#F5F7F8] p-2 rounded-lg">
                          <span className="text-slate-400 block text-[9px] font-bold">LENDER RESPONSE TIME</span>
                          <span className="font-bold text-emerald-700">~12 minutes avg.</span>
                        </div>
                      </div>
                      <div className="pt-1">
                        <span className="text-[10px] text-slate-400 block font-bold">MAINTENANCE & CALIBRATION HISTORY</span>
                        <p className="text-[11px] text-slate-600 mt-0.5 bg-[#F5F7F8] p-2 rounded-lg leading-relaxed">
                          {passportData?.item?.maintenanceLog || item.maintenanceLog || 'Cleaned, lubricated and battery calibrated on 1st Nov 2026. Ready for heavy-duty usage.'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Pricing, Scheduling & Instant Booking (5 cols) */}
          <div className="md:col-span-5 p-6 bg-[#F5F7F8] flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              {/* Pricing Header */}
              <div className="bg-white p-4 rounded-2xl border border-[#E5E9ED] shadow-xs">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-black text-[#003B3B]">₹{item.hourlyRate}</span>
                    <span className="text-xs text-[#718096] font-semibold"> / hour</span>
                  </div>
                  {item.dailyRate && (
                    <span className="text-xs font-bold text-teal-900 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                      ₹{item.dailyRate}/day capped
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-[#718096]">
                  Minimum rental period: <strong className="text-[#102A2A]">{item.minHours} hour(s)</strong>
                </div>
              </div>

              {/* Duration Selector */}
              <div>
                <label className="block text-xs font-bold text-[#102A2A] mb-2">
                  Rental Duration:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 4, 8].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setSelectedHours(h)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        selectedHours === h
                          ? 'bg-[#003B3B] text-white border-[#003B3B] shadow-xs'
                          : 'bg-white border-[#E5E9ED] text-[#102A2A] hover:bg-slate-100'
                      }`}
                    >
                      {h} {h === 1 ? 'Hr' : 'Hrs'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pickup Scheduling & Date Selector */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#E5E9ED] space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#102A2A]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    <span>Pickup Date & Slot:</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                    Available Today
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#E5E9ED] text-xs text-[#102A2A] font-semibold bg-[#F5F7F8] focus:outline-none"
                  />
                  <select
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#E5E9ED] text-xs text-[#102A2A] font-semibold bg-[#F5F7F8] focus:outline-none"
                  >
                    <option value="Today, 2:00 PM">Today, 2:00 PM</option>
                    <option value="Today, 4:30 PM">Today, 4:30 PM</option>
                    <option value="Today, 7:00 PM">Today, 7:00 PM</option>
                    <option value="Tomorrow, 10:00 AM">Tomorrow, 10:00 AM</option>
                  </select>
                </div>
              </div>

              {/* Doorstep Delivery Toggle */}
              {item.isDeliveryAvailable && (
                <div className="p-3 rounded-2xl bg-white border border-[#E5E9ED] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Truck className="w-4 h-4 text-teal-600" />
                    <div>
                      <div className="text-xs font-bold text-[#102A2A]">Doorstep Delivery by Owner</div>
                      <div className="text-[10px] text-[#718096]">Direct delivery to your address (+₹{item.deliveryFee})</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isDelivery}
                    onChange={(e) => setIsDelivery(e.target.checked)}
                    className="w-4 h-4 accent-[#003B3B] rounded cursor-pointer"
                  />
                </div>
              )}

              {/* Transparent Price Breakdown */}
              <div className="p-4 rounded-2xl bg-white border border-[#E5E9ED] space-y-2 text-xs">
                <div className="font-extrabold text-[#003B3B] border-b border-slate-100 pb-1.5">
                  Transparent Price Breakdown
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Rental Rate ({selectedHours} hrs × ₹{item.hourlyRate})</span>
                  <span className="font-semibold text-slate-900">₹{baseRental}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="flex items-center gap-1">
                    <span>BorrowCircle Platform Fee</span>
                    <Info className="w-3 h-3 text-slate-400" />
                  </span>
                  <span className="font-semibold text-slate-900">₹{receiverFee}</span>
                </div>
                {isDelivery && (
                  <div className="flex justify-between text-slate-700">
                    <span>Doorstep Delivery Fee</span>
                    <span className="font-semibold text-slate-900">₹{delivery}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-[#102A2A]">
                  <span>Total Payable via UPI</span>
                  <span className="text-[#003B3B] text-base">₹{totalPayable}</span>
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-1 leading-normal flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>BorrowCircle 100% Deposit-Free • Protected by dual-OTP handover</span>
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-bold text-[#102A2A] mb-1">
                  Handover Notes for Lender:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Planning to drill 4 holes for kitchen shelf"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5E9ED] rounded-xl text-xs text-[#102A2A] focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Digital Agreement Checkbox */}
              <label className="flex items-start gap-2 cursor-pointer text-xs text-[#718096]">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#003B3B] rounded cursor-pointer"
                />
                <span className="text-[11px] leading-snug">
                  I agree to the <strong>Digital Rental Agreement</strong>, dual-OTP handover verification, and 15-minute inspection clause.
                </span>
              </label>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleRequestBooking}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#003B3B] hover:bg-[#002b2b] text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-4 h-4 text-[#16D9CC]" />
                <span>{loading ? 'Submitting Request...' : `Submit Rental Request (₹${totalPayable})`}</span>
              </button>
              <p className="text-[11px] text-center text-slate-500 font-medium -mt-1">
                No payment charged now • Pay securely after owner approves
              </p>

              <button
                type="button"
                onClick={() => onOpenChat(item.ownerId)}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-[#003B3B] border border-[#E5E9ED] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-teal-600" />
                <span>Chat with Lender First</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
