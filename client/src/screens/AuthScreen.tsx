import React, { useState } from 'react';
import { api, setAuthToken } from '../services/api';
import { User } from '../types';
import {
  Share2,
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  User as UserIcon,
  MapPin,
  Sparkles,
  Zap,
  CheckCircle2
} from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCity, setRegCity] = useState('Bengaluru');
  const [regArea, setRegArea] = useState('');
  const [regPincode, setRegPincode] = useState('');

  // 1. Handle Email & Password Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await api.login({ identifier, password });
      setAuthToken(res.token);
      onAuthSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await api.register({
        name: regName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        city: regCity,
        area: regArea,
        pincode: regPincode,
      });
      setAuthToken(res.token);
      onAuthSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 font-sans">
      {/* Left Column: Visual Storytelling & Indian Marketplace Branding */}
      <div className="lg:w-1/2 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Ambient Decorative Blurs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-white shadow-lg shadow-teal-500/30">
              <Share2 className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-3xl font-black tracking-tight text-white">BorrowCircle</span>
              <p className="text-sm text-teal-300 font-bold">Hyperlocal Equipment & Tool Sharing</p>
            </div>
          </div>
        </div>

        {/* Hero Tagline & Indian Context */}
        <div className="my-10 relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/20 text-teal-200 text-xs sm:text-sm font-bold mb-6 border border-teal-500/30">
            <Sparkles className="w-4 h-4" />
            <span>Own Less. Access More. Earn from Idle Tools.</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight text-white tracking-tight">
            Borrow Anything. <br />
            <span className="bg-gradient-to-r from-teal-300 via-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              Share Everything.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-200 leading-relaxed">
            BorrowCircle connects neighbors in Indian cities who own power drills, DSLR cameras, projectors, pressure washers, and outdoor gear with nearby people who need them temporarily.
          </p>

          {/* Key Value Highlights */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-300 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-sm sm:text-base text-slate-100">
                <strong>Affordable Hourly Rates:</strong> Rent drills for ₹50/hr, cameras for ₹180/hr instead of buying costly tools.
              </span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-300 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-sm sm:text-base text-slate-100">
                <strong>Two-Sided OTP Verification:</strong> Uber/Ola-style handover OTP prevents disputes and protects both parties.
              </span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-300 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-sm sm:text-base text-slate-100">
                <strong>Fair Platform Commission:</strong> Nominal ₹15 fee, transparent UPI checkout & zero security deposit.
              </span>
            </div>
          </div>
        </div>

        {/* Verified Highlights */}
        <div className="relative z-10 pt-6 border-t border-teal-800/40 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="text-xl mb-1">📍</div>
            <div className="text-sm font-black text-white">Hyperlocal Sharing</div>
            <div className="text-xs text-teal-200/80 mt-0.5">Discover equipment available in your immediate neighborhood.</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="text-xl mb-1">🤝</div>
            <div className="text-sm font-black text-white">Borrow & Lend</div>
            <div className="text-xs text-teal-200/80 mt-0.5">One account to rent equipment and earn by lending your idle tools.</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="text-xl mb-1">🔄</div>
            <div className="text-sm font-black text-white">Flexible Rentals</div>
            <div className="text-xs text-teal-200/80 mt-0.5">Rent for the exact hours or days you need with zero security deposit.</div>
          </div>
        </div>
      </div>

      {/* Right Column: Authentication Card */}
      <div className="lg:w-1/2 p-6 sm:p-10 lg:p-12 flex flex-col justify-center max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-200/90">
          {/* Card Top Branding Header */}
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-[#002f34] flex items-center justify-center text-white shadow-md">
              <Share2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#002f34] tracking-tight font-['Roboto',sans-serif]">
                BorrowCircle <span className="text-[#00a49f]">India</span>
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-500">Hyperlocal Equipment & Tool Sharing</p>
            </div>
          </div>

          {/* Auth Mode Tabs */}
          <div className="flex rounded-2xl bg-slate-100 p-1.5 mb-6 text-sm font-bold text-slate-600">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`flex-1 py-3 px-2 rounded-xl transition-all cursor-pointer ${authMode === 'login' ? 'bg-white text-[#002f34] shadow-sm font-black' : 'hover:text-[#002f34]'}`}
            >
              Email Login
            </button>

            <button
              type="button"
              onClick={() => { setAuthMode('register'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`flex-1 py-3 px-2 rounded-xl transition-all cursor-pointer ${authMode === 'register' ? 'bg-white text-[#002f34] shadow-sm font-black' : 'hover:text-[#002f34]'}`}
            >
              Create Account
            </button>
          </div>

          {/* Error & Success Alerts */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold">
              {successMessage}
            </div>
          )}

          {/* 1. Mode: EMAIL LOGIN */}
          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-800 mb-2">
                  Email Address or Mobile Number
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="name@example.com or +919876543210"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002f34]/20 focus:border-[#002f34] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-800 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002f34]/20 focus:border-[#002f34] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-xl bg-[#002f34] hover:bg-[#003d44] text-white text-base sm:text-lg font-black tracking-wide shadow-lg shadow-[#002f34]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to BorrowCircle'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}

          {/* 2. Mode: REGISTER NEW ACCOUNT */}
          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kumar"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#002f34]/20 focus:border-[#002f34] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#002f34]/20 focus:border-[#002f34] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">Mobile (+91)</label>
                  <input
                    type="tel"
                    required
                    placeholder="+919876543210"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#002f34]/20 focus:border-[#002f34] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#002f34]/20 focus:border-[#002f34] transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <select
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-bold"
                  >
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Pune">Pune</option>
                    <option value="Hyderabad">Hyderabad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Area</label>
                  <input
                    type="text"
                    required
                    placeholder="Indiranagar"
                    value={regArea}
                    onChange={(e) => setRegArea(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    required
                    placeholder="560038"
                    value={regPincode}
                    onChange={(e) => setRegPincode(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Every BorrowCircle account allows you to both borrow equipment and lend unused items.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-xl bg-[#002f34] hover:bg-[#003d44] text-white text-base sm:text-lg font-black tracking-wide shadow-lg shadow-[#002f34]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Creating Account...' : 'Register & Join BorrowCircle'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
