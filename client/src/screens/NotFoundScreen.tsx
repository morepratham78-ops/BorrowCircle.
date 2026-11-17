import React from 'react';
import { Compass, LayoutDashboard, Clock, Search, ArrowLeft } from 'lucide-react';

interface NotFoundScreenProps {
  onNavigate: (tab: string) => void;
  attemptedPath?: string;
}

export const NotFoundScreen: React.FC<NotFoundScreenProps> = ({ onNavigate, attemptedPath }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-teal-50 border-2 border-teal-200 flex items-center justify-center text-teal-800 text-3xl font-black shadow-inner">
          404
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Page or Equipment Not Found
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            The link you followed or path {attemptedPath ? <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-700">{attemptedPath}</code> : 'requested'} does not exist in our community equipment registry.
          </p>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => onNavigate('explore')}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-primary text-white text-xs font-bold shadow-md shadow-teal-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Discover Equipment Near You</span>
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate('rentals')}
            className="w-full py-2.5 px-4 rounded-2xl text-slate-500 hover:text-slate-800 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>View My Rentals</span>
          </button>
        </div>
      </div>
    </div>
  );
};
