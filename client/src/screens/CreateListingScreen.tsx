import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Category, User } from '../types';
import {
  Wrench,
  Camera,
  MapPin,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Info,
  DollarSign,
  Truck,
  AlertCircle,
  Upload,
  X,
  Star,
  Image as ImageIcon
} from 'lucide-react';

interface CreateListingScreenProps {
  user: User;
  onSuccess: () => void;
  onCancel: () => void;
}

interface UploadedPhoto {
  id: string;
  url: string;
  isPrimary: boolean;
}

export const CreateListingScreen: React.FC<CreateListingScreenProps> = ({
  user,
  onSuccess,
  onCancel
}) => {
  const [step, setStep] = useState<number>(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('VERY_GOOD');
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Pricing
  const [hourlyRate, setHourlyRate] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [minHours, setMinHours] = useState('2');
  const [replacementValue, setReplacementValue] = useState('');

  // Step 3: Location & Delivery
  const [city, setCity] = useState(user.city || 'Bengaluru');
  const [area, setArea] = useState(user.area || 'Indiranagar');
  const [pincode, setPincode] = useState(user.pincode || '560038');
  const [pickupAddress, setPickupAddress] = useState(`${user.area || 'Indiranagar'}, ${user.city || 'Bengaluru'}`);
  const [isDeliveryAvailable, setIsDeliveryAvailable] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('50');

  // Step 4: Safety & Terms
  const [usageInstructions, setUsageInstructions] = useState('');
  const [safetyGuidelines, setSafetyGuidelines] = useState('');
  const [damageConditions, setDamageConditions] = useState('');

  useEffect(() => {
    api.getCategories().then((res) => {
      setCategories(res.categories || []);
      if (res.categories && res.categories.length > 0) {
        setCategoryId(res.categories[0].id);
      }
    });
  }, []);

  const handleFilesAdded = (files: FileList | null) => {
    if (!files) return;
    const remainingSlots = 5 - uploadedPhotos.length;
    if (remainingSlots <= 0) {
      alert('You can upload a maximum of 5 photos.');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    filesToProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is larger than 5MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setUploadedPhotos((prev) => {
          const isFirst = prev.length === 0;
          return [...prev, { id: Math.random().toString(36).substr(2, 9), url, isPrimary: isFirst }];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddUrl = () => {
    if (!customUrlInput.trim()) return;
    if (uploadedPhotos.length >= 5) {
      alert('Maximum 5 photos allowed.');
      return;
    }
    setUploadedPhotos((prev) => {
      const isFirst = prev.length === 0;
      return [...prev, { id: Math.random().toString(36).substr(2, 9), url: customUrlInput.trim(), isPrimary: isFirst }];
    });
    setCustomUrlInput('');
  };

  const handleSetPrimary = (id: string) => {
    setUploadedPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        isPrimary: p.id === id
      }))
    );
  };

  const handleRemovePhoto = (id: string) => {
    setUploadedPhotos((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (remaining.length > 0 && !remaining.some((p) => p.isPrimary)) {
        remaining[0].isPrimary = true;
      }
      return remaining;
    });
  };

  const handleMovePhoto = (index: number, direction: 'left' | 'right') => {
    setUploadedPhotos((prev) => {
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Smart Pricing Suggestion Helper
  const applySmartPricing = () => {
    if (!replacementValue) {
      alert('Please enter estimated replacement value first to generate a smart price suggestion');
      return;
    }
    const val = Number(replacementValue);
    const suggestedHourly = Math.max(30, Math.round((val * 0.007) / 5) * 5);
    const suggestedDaily = Math.round(suggestedHourly * 7);

    setHourlyRate(String(suggestedHourly));
    setDailyRate(String(suggestedDaily));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      // Sort so primary photo is first
      const sortedPhotos = [...uploadedPhotos].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
      const photos = sortedPhotos.length > 0
        ? sortedPhotos.map((p) => p.url)
        : ['https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80'];

      await api.createItem({
        title,
        description,
        categoryId,
        condition,
        hourlyRate: Number(hourlyRate),
        dailyRate: dailyRate ? Number(dailyRate) : null,
        minHours: Number(minHours),
        securityDeposit: 0,
        replacementValue: Number(replacementValue),
        city,
        area,
        pincode,
        pickupAddress,
        isDeliveryAvailable,
        deliveryFee: isDeliveryAvailable ? Number(deliveryFee) : 0,
        usageInstructions,
        safetyGuidelines,
        damageConditions,
        images: photos
      });

      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4 pb-16">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onCancel}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Marketplace</span>
        </button>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          List Your Equipment on BorrowCircle
        </h2>
        <p className="text-xs text-slate-500">
          Turn your unused drills, cameras, audio gear, and equipment into steady hourly income in your neighborhood.
        </p>
      </div>

      {/* Progress Steps Header */}
      <div className="flex items-center justify-between p-4 mb-6 rounded-2xl bg-white border border-slate-200">
        {[
          { stepNum: 1, label: 'Equipment Info' },
          { stepNum: 2, label: 'Hourly Rates' },
          { stepNum: 3, label: 'Location' },
          { stepNum: 4, label: 'Safety & Submit' }
        ].map((s) => (
          <div key={s.stepNum} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                step === s.stepNum
                  ? 'bg-gradient-primary text-white shadow-xs'
                  : step > s.stepNum
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {step > s.stepNum ? '✓' : s.stepNum}
            </div>
            <span className={`text-xs font-bold hidden sm:block ${step === s.stepNum ? 'text-slate-900' : 'text-slate-400'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Step 1: Equipment Details & Photos
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Equipment Title / Brand & Model *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Bosch Professional Rotary Hammer Drill GBH 220"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Equipment Condition *
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900"
                >
                  <option value="EXCELLENT">Excellent (Like New)</option>
                  <option value="VERY_GOOD">Very Good (Minor Cosmetic Wear)</option>
                  <option value="GOOD">Good (Fully Functional)</option>
                  <option value="FAIR">Fair (Visible Wear, Works Well)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detailed Description *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe features, accessories included (e.g. bits, cables, batteries), and ideal use cases..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            {/* Multi-Image File Upload & Preview */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Equipment Photographs (Up to 5)
                </label>
                <span className="text-[11px] text-slate-400 font-semibold">
                  {uploadedPhotos.length} / 5 photos
                </span>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleFilesAdded(e.target.files)}
              />

              {/* Drag and Drop / Click Upload Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFilesAdded(e.dataTransfer.files);
                }}
                className="p-6 border-2 border-dashed border-teal-300 hover:border-teal-600 rounded-2xl bg-teal-50/40 hover:bg-teal-50/80 transition-all text-center cursor-pointer mb-3"
              >
                <Upload className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                <div className="text-xs sm:text-sm font-bold text-slate-800">
                  Click or drag photos here to upload
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  High-res photos increase rental requests by 3x (JPG, PNG, WEBP max 5MB)
                </div>
              </div>

              {/* Photo Previews with Reorder & Primary Flag */}
              {uploadedPhotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-3">
                  {uploadedPhotos.map((photo, pIdx) => (
                    <div
                      key={photo.id}
                      className={`relative rounded-xl overflow-hidden border-2 aspect-square bg-slate-100 group shadow-xs ${
                        photo.isPrimary ? 'border-teal-600 ring-2 ring-teal-400' : 'border-slate-200'
                      }`}
                    >
                      <img src={photo.url} alt="Equipment preview" className="w-full h-full object-cover" />
                      
                      {/* Primary Badge or Action */}
                      <div className="absolute top-1.5 left-1.5">
                        {photo.isPrimary ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-teal-700 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-xs">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <span>Primary</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetPrimary(photo.id);
                            }}
                            className="px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                          >
                            Set Primary
                          </button>
                        )}
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(photo.id);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-600/90 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-700 transition-opacity shadow-xs"
                        title="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Reorder Arrows */}
                      <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={pIdx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMovePhoto(pIdx, 'left');
                          }}
                          className="px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold disabled:opacity-30 hover:bg-black/90 cursor-pointer"
                          title="Move left"
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          disabled={pIdx === uploadedPhotos.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMovePhoto(pIdx, 'right');
                          }}
                          className="px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold disabled:opacity-30 hover:bg-black/90 cursor-pointer"
                          title="Move right"
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Optional URL Add */}
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Or paste an external image URL..."
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddUrl}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  Add URL
                </button>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!title || !description) {
                    alert('Please provide equipment title and description');
                    return;
                  }
                  setStep(2);
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-primary text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <span>Continue to Pricing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Pricing & Value */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Step 2: Hourly Pricing & Valuation
              </h3>
              <button
                type="button"
                onClick={applySmartPricing}
                className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-teal-600" />
                <span>AI Smart Pricing Suggestion</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estimated Replacement Value (₹) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 6500"
                  value={replacementValue}
                  onChange={(e) => setReplacementValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">Used to establish community replacement protection.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hourly Rental Rate (₹) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 50"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-bold text-teal-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">Billable proportionally using actual rental usage minutes.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Daily Cap (₹/day)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 350"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Min Duration (Hours)
                </label>
                <input
                  type="number"
                  value={minHours}
                  onChange={(e) => setMinHours(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200/80 text-xs text-teal-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-teal-600" />
                <span>Earnings Breakdown (Example for 3 hours):</span>
              </div>
              <div className="text-[11px] text-slate-700">
                • Receiver pays: 3 hrs × ₹{Number(hourlyRate) || 50} = ₹{(Number(hourlyRate) || 50) * 3} + ₹15 receiver fee (Zero security deposit).<br />
                • <strong>You receive: ₹{(Number(hourlyRate) || 50) * 3 - 15}</strong> (after nominal ₹15 platform fee).
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!hourlyRate || !replacementValue) {
                    alert('Please specify replacement value and hourly rate');
                    return;
                  }
                  setStep(3);
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-primary text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <span>Continue to Location</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Location & Logistics */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Step 3: Pickup Location & Delivery Options
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Area / Locality</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PIN Code</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pickup Landmark / Address Details
              </label>
              <input
                type="text"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="e.g. Near Indiranagar Metro Station, 12th Main Road"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">Exact house number is only revealed to confirmed bookings for privacy.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-teal-600" />
                <div>
                  <div className="text-xs font-bold text-slate-900">Offer Doorstep Delivery?</div>
                  <div className="text-[10px] text-slate-500">You drop off and pick back up from the borrower</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isDeliveryAvailable}
                onChange={(e) => setIsDeliveryAvailable(e.target.checked)}
                className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
              />
            </div>

            {isDeliveryAvailable && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Delivery Fee (₹)
                </label>
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>
            )}

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-6 py-2.5 rounded-xl bg-gradient-primary text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <span>Continue to Safety Terms</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Safety Guidelines & Final Submission */}
        {step === 4 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Step 4: Safety Guidelines & Community Terms
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Usage Instructions for Borrower
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Use SDS bits only. Keep chuck clean. Let motor cool between cycles."
                value={usageInstructions}
                onChange={(e) => setUsageInstructions(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Safety Precautions & Protections
              </label>
              <input
                type="text"
                placeholder="e.g. Wear safety goggles and heavy-duty work gloves."
                value={safetyGuidelines}
                onChange={(e) => setSafetyGuidelines(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            {/* Approval Workflow Disclaimer */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1 text-xs">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Listing Verification Workflow (Section 7)</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Every newly submitted equipment listing is reviewed by the BorrowCircle admin team before appearing publicly. Once approved, you will receive a notification and it will be visible in {city}.
              </p>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-primary text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md shadow-teal-500/20 hover:opacity-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Submitting...' : 'Submit Listing for Approval'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
