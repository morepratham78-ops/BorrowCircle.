import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Mail,
  FileText,
  Lock,
  Award,
  Sparkles,
  Info,
  Scale
} from 'lucide-react';

interface TrustSafetyScreenProps {
  user: User;
  onRefreshUser: () => void;
}

export const TrustSafetyScreen: React.FC<TrustSafetyScreenProps> = ({
  user,
  onRefreshUser
}) => {
  const [aadhaarInput, setAadhaarInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [stage, setStage] = useState<'input' | 'otp_verify' | 'verified'>(
    user.aadharVerified ? 'verified' : 'input'
  );
  const [maskedAadhaar, setMaskedAadhaar] = useState('');
  const [demoOtpHint, setDemoOtpHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // 1. Request Aadhaar Demo OTP
  const handleRequestAadhaarOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.requestAadhaarOtp(aadhaarInput);
      setMaskedAadhaar(res.maskedAadhaar);
      setDemoOtpHint(res.demoOtp || '882200');
      setStage('otp_verify');
      setMessage('Demo OTP dispatched. Please enter code to complete test verification.');
    } catch (err: any) {
      setError(err.message || 'Failed to initiate identity verification');
    } finally {
      setLoading(false);
    }
  };

  // 2. Confirm Demo Aadhaar OTP
  const handleConfirmAadhaarOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.confirmAadhaarOtp(otpInput);
      setStage('verified');
      setMessage('Identity verification completed! +20 Trust Score points added.');
      onRefreshUser();
    } catch (err: any) {
      setError(err.message || 'Invalid verification OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Trust & Safety Center
        </h2>
        <p className="text-xs text-slate-500">
          BorrowCircle relies on verified identities, dual-OTP handovers, and algorithmic trust scores to keep sharing safe for all neighbors.
        </p>
      </div>

      {/* 1. Algorithmic Trust Score Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-teal-300 mb-1">
              <Award className="w-4 h-4 text-teal-400" />
              <span>Algorithmic Community Trust Score</span>
            </div>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-white flex items-baseline gap-2">
              <span>{user.trustScore}</span>
              <span className="text-base font-normal text-slate-300">/ 100</span>
            </div>
            <p className="text-xs text-slate-300 mt-2 max-w-md leading-relaxed">
              Calculated dynamically from verified contact credentials, government ID, timely returns, and authentic neighbor reviews.
            </p>
          </div>

          {/* Breakdown checklist */}
          <div className="w-full sm:w-auto bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-200">Mobile Phone Verified:</span>
              <span className="font-bold text-teal-300">✓ (+15 pts)</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-200">Email Verified:</span>
              <span className="font-bold text-teal-300">✓ (+5 pts)</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-200">Identity / Aadhaar:</span>
              <span className={`font-bold ${user.aadharVerified ? 'text-teal-300' : 'text-amber-300'}`}>
                {user.aadharVerified ? '✓ (+20 pts)' : 'Pending (+20 pts)'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-200">Clean Rental Track Record:</span>
              <span className="font-bold text-teal-300">✓ Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Identity Verification Module */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Identity & Aadhaar Verification Module
              </h3>
              <p className="text-xs text-slate-500">
                Verify your identity to increase your Trust Score and unlock high-value equipment rentals.
              </p>
            </div>
          </div>

          {/* Prominent Legal Disclaimer */}
          <div className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold">
            Demo Verification – Not Government Verified
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}
        {message && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            {message}
          </div>
        )}

        {/* Stage 1: Input 12-digit Aadhaar */}
        {stage === 'input' && (
          <form onSubmit={handleRequestAadhaarOtp} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enter 12-Digit Aadhaar Number (Simulation Sandbox)
              </label>
              <input
                type="text"
                required
                maxLength={12}
                placeholder="1234 5678 9012"
                value={aadhaarInput}
                onChange={(e) => setAadhaarInput(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono tracking-widest text-slate-900 focus:ring-2 focus:ring-teal-500/30"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                In this sandbox mode, a simulated OTP will be generated. Numbers are never stored in plaintext.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || aadhaarInput.length !== 12}
              className="px-5 py-2.5 rounded-xl bg-gradient-primary text-white text-xs font-bold shadow-md shadow-teal-500/20 hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Generating Demo OTP...' : 'Send Verification OTP'}
            </button>
          </form>
        )}

        {/* Stage 2: Verify Simulated OTP */}
        {stage === 'otp_verify' && (
          <form onSubmit={handleConfirmAadhaarOtp} className="space-y-4 max-w-md">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <strong>Demo Verification Sandbox:</strong> Use test OTP:
              <span className="font-mono font-bold text-sm bg-white px-2 py-0.5 rounded border border-amber-300 ml-2">
                {demoOtpHint}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enter 6-Digit Verification OTP for {maskedAadhaar}
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="882200"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-center text-lg font-mono tracking-widest bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading || otpInput.length < 6}
                className="px-5 py-2.5 rounded-xl bg-gradient-primary text-white text-xs font-bold shadow-md shadow-teal-500/20 hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Validating...' : 'Confirm Demo Verification'}
              </button>
              <button
                type="button"
                onClick={() => setStage('input')}
                className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800"
              >
                Back
              </button>
            </div>
          </form>
        )}

        {/* Stage 3: Verified Status */}
        {stage === 'verified' && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <div>
                <div className="text-xs font-bold text-emerald-950">
                  Identity Verified (Aadhaar Demo Mode)
                </div>
                <div className="text-[11px] text-emerald-800">
                  Your profile has verified status across the neighborhood. Trust score updated to {user.trustScore}/100.
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Verified
            </span>
          </div>
        )}
      </div>

      {/* 3. Digital Rental Agreement Protection */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Digital Rental Agreement Framework
            </h3>
            <p className="text-xs text-slate-500">
              Every booking made on BorrowCircle is automatically covered by standard legal terms.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <strong>1. Proper Care & Operation:</strong> Borrower agrees to operate equipment strictly according to manufacturer specifications and owner guidelines.
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <strong>2. Punctual Handback:</strong> Equipment must be returned by the expected return time. Extensions must be requested and approved in-app.
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <strong>3. 15-Minute Inspection Period:</strong> Lender has 15 minutes upon return verification to inspect for damage before deposit release.
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <strong>4. Reasonable Repair Assessment:</strong> In case of accidental damage, compensation is strictly limited to actual verified repair costs, not arbitrary full replacement.
          </div>
        </div>
      </div>
    </div>
  );
};
