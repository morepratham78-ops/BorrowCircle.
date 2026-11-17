import React, { useState, useRef } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import {
  X,
  User as UserIcon,
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Camera,
  Star,
  Award,
  Sparkles,
  Save,
  Repeat,
  ShoppingBag,
  Layers,
  ArrowRight,
  Upload,
  Image as ImageIcon
} from 'lucide-react';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onProfileUpdated: (updatedUser: Partial<User>) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80'
];

const POPULAR_CITIES = [
  'Bengaluru', 'Mumbai', 'Delhi NCR', 'Pune', 'Hyderabad',
  'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow'
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  onClose,
  onProfileUpdated
}) => {
  const [name, setName] = useState<string>(user.name || '');
  const [phone, setPhone] = useState<string>(user.phone || '');
  const [city, setCity] = useState<string>(user.city || 'Bengaluru');
  const [area, setArea] = useState<string>(user.area || '');
  const [pincode, setPincode] = useState<string>(user.pincode || '');
  const [avatar, setAvatar] = useState<string>(user.avatar || AVATAR_PRESETS[0]);
  const [customAvatar, setCustomAvatar] = useState<string>('');
  const [accountMode, setAccountMode] = useState<'BORROWER' | 'LENDER'>(user.accountMode || 'BORROWER');
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadNotice, setUploadNotice] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Photo exceeds 5MB limit. Please select a smaller photo.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (JPEG, PNG, or WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCustomAvatar(base64);
      setUploadNotice('Photo uploaded! Click "Save Profile & Preferences" to keep.');
      setErrorMessage('');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessNotice('');

    try {
      const selectedAvatar = customAvatar.trim() || avatar;
      const res = await api.updateProfile({
        name,
        phone,
        city,
        area,
        pincode,
        avatar: selectedAvatar,
        accountMode
      });

      setSuccessNotice(`Profile & Account Preferences saved! Active mode: ${accountMode}`);
      onProfileUpdated({
        name,
        phone,
        city,
        area,
        pincode,
        avatar: selectedAvatar,
        accountMode
      });

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-[#003B3B] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserIcon className="w-5 h-5 text-[#16D9CC]" />
            <h3 className="text-lg font-black tracking-tight text-white">
              My Profile & Neighborhood Reputation
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
              {errorMessage}
            </div>
          )}

          {uploadNotice && (
            <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{uploadNotice}</span>
            </div>
          )}

          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              Profile Photo
            </label>
            <div className="flex items-start gap-4">
              <div className="relative group shrink-0">
                <img
                  src={customAvatar.trim() || avatar}
                  alt="Selected Avatar"
                  className="w-20 h-20 rounded-full object-cover border-4 border-[#16D9CC] shadow-md bg-slate-100"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-slate-900/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Upload from device"
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-[9px] font-bold mt-0.5">Change</span>
                </button>
              </div>

              <div className="flex-1 space-y-2.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl bg-[#003B3B] hover:bg-[#002b2b] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#16D9CC]" />
                    <span>Upload Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'User')}`;
                      setCustomAvatar(defaultAvatar);
                      setAvatar(defaultAvatar);
                      setUploadNotice('Photo removed. Avatar set to default.');
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove custom photo and reset to default avatar"
                  >
                    Remove Photo
                  </button>
                  {customAvatar && (
                    <button
                      type="button"
                      onClick={() => { setCustomAvatar(''); setUploadNotice(''); }}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                  <span className="text-[11px] text-slate-400">JPG, PNG, WEBP (Max 5MB)</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 self-center mr-1">Presets:</span>
                  {AVATAR_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => { setAvatar(p); setCustomAvatar(''); setUploadNotice(''); }}
                      className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                        avatar === p && !customAvatar ? 'border-[#003B3B] scale-110 shadow-sm ring-2 ring-teal-400' : 'border-slate-200 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={p} alt="Preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                <input
                  type="url"
                  placeholder="Or paste an image URL..."
                  value={customAvatar.startsWith('data:') ? '' : customAvatar}
                  onChange={(e) => { setCustomAvatar(e.target.value); setUploadNotice(''); }}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>
          </div>

          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number (+91)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>
          </div>

          {/* City & Neighborhood Area */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                City
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-teal-600 cursor-pointer"
              >
                {POPULAR_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Locality / Area
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Indiranagar"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pincode
              </label>
              <input
                type="text"
                placeholder="560038"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          {/* Account Preferences -> Account Mode */}
          <div className="p-4.5 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-teal-900 block">
                  Account Preferences
                </span>
                <span className="text-sm font-black text-[#003B3B]">
                  Account Mode (Borrower vs Lender)
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-teal-200/80 text-teal-900">
                1 Account • 2 Modes
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              BorrowCircle unifies both roles into your single verified account. Switch between modes anytime without logging out or losing data.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setAccountMode('BORROWER')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  accountMode === 'BORROWER'
                    ? 'border-[#003B3B] bg-white shadow-md'
                    : 'border-slate-200/80 bg-white/50 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-[#003B3B] flex items-center justify-center font-bold">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  {accountMode === 'BORROWER' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div className="text-sm font-black text-[#102A2A]">Borrower Mode</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Rent equipment, manage active bookings, wishlist items & returns.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAccountMode('LENDER')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  accountMode === 'LENDER'
                    ? 'border-[#003B3B] bg-white shadow-md'
                    : 'border-slate-200/80 bg-white/50 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" />
                  </div>
                  {accountMode === 'LENDER' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div className="text-sm font-black text-[#102A2A]">Lender Mode</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  List tools, approve requests, verify OTP handovers & track earnings.
                </div>
              </button>
            </div>
          </div>

          {/* Trust Score & Verification Overview */}
          <div className="p-4 rounded-2xl bg-[#F5F7F8] border border-[#E5E9ED] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm">
                {user.trustScore || 100}
              </div>
              <div>
                <div className="text-xs font-bold text-[#102A2A] flex items-center gap-1.5">
                  <span>Community Trust Score</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-[11px] text-[#718096]">
                  Aadhaar Verified • 100% Dual-OTP Handover Record
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                VERIFIED NEIGHBOR
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#003B3B] hover:bg-[#002b2b] text-white text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-[#16D9CC]" />
              <span>{loading ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
