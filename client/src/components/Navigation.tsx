import React from 'react';
import {
  LayoutDashboard,
  Compass,
  Clock,
  Layers,
  PlusCircle,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Shield,
  ShoppingBag,
  Heart,
  Repeat,
  FileCheck,
  RotateCcw,
  TrendingUp,
  User as UserIcon,
  Settings,
  Globe
} from 'lucide-react';
import { User } from '../types';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
  action?: () => void;
}

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: User;
  onOpenProfile?: () => void;
  onOpenWishlist?: () => void;
  onSwitchMode?: (mode: 'BORROWER' | 'LENDER') => void;
  activeRentalCount?: number;
  unreadMessageCount?: number;
  pendingRequestsCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  user,
  onOpenProfile,
  onOpenWishlist,
  onSwitchMode,
  activeRentalCount = 0,
  unreadMessageCount = 0,
  pendingRequestsCount = 0
}) => {
  const isBorrower = user.accountMode !== 'LENDER';

  // Borrower navigation items
  const borrowerItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'explore', label: 'Discover Equipment', icon: Compass },
    { id: 'rentals', label: 'My Rentals', icon: Clock, badge: activeRentalCount > 0 ? `${activeRentalCount} Active` : undefined, badgeColor: 'bg-emerald-600' },
    { id: 'bookings', label: 'My Bookings', icon: FileCheck },
    { id: 'wishlist', label: 'Wishlist', icon: Heart, action: onOpenWishlist },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessageCount > 0 ? `${unreadMessageCount}` : undefined, badgeColor: 'bg-teal-600' },
    { id: 'trust', label: 'Trust & Safety', icon: ShieldCheck },
    { id: 'community', label: 'Community & Impact', icon: Globe },
  ];

  // Lender navigation items
  const lenderItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'listings', label: 'My Listings', icon: Layers },
    { id: 'requests', label: 'Booking Requests', icon: FileCheck, badge: pendingRequestsCount > 0 ? `${pendingRequestsCount} New` : undefined, badgeColor: 'bg-amber-600' },
    { id: 'management', label: 'Rental Management', icon: RotateCcw },
    { id: 'earnings', label: 'Earnings & Payouts', icon: TrendingUp },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessageCount > 0 ? `${unreadMessageCount}` : undefined, badgeColor: 'bg-teal-600' },
    { id: 'trust', label: 'Trust & Safety', icon: ShieldCheck },
    { id: 'community', label: 'Community & Impact', icon: Globe },
  ];

  const currentItems = isBorrower ? borrowerItems : lenderItems;

  return (
    <>
      {/* Desktop Sidebar (240px width as requested) */}
      <aside className={`hidden md:flex flex-col w-60 bg-white border-r border-[#E5E9ED] p-3.5 shrink-0 ${activeTab === 'messages' ? 'h-full min-h-0' : 'h-[calc(100vh-8rem)] sticky top-[8rem]'} overflow-y-auto justify-between shadow-2xs`}>
        <div className="space-y-4">
          {/* A. Account Mode Switcher (Visible & Interactive) */}
          <div className="p-3 rounded-2xl bg-[#F5F7F8] border border-[#E5E9ED] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#718096]">
                Account Mode
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                isBorrower ? 'bg-teal-100 text-[#003B3B]' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {isBorrower ? 'Borrower' : 'Lender'}
              </span>
            </div>

            <button
              onClick={() => onSwitchMode && onSwitchMode(isBorrower ? 'LENDER' : 'BORROWER')}
              className="w-full h-10 px-3 rounded-xl bg-white border border-[#E5E9ED] hover:border-[#003B3B] text-[#003B3B] text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
              title="Click to switch between Borrower and Lender Mode"
            >
              <Repeat className="w-3.5 h-3.5 text-[#16D9CC]" />
              <span>Switch to {isBorrower ? 'Lender Mode' : 'Borrower Mode'}</span>
            </button>
          </div>

          {/* B. Navigation List */}
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-black uppercase tracking-wider text-[#718096]">
              {isBorrower ? 'Borrower Menu' : 'Lender Menu'}
            </div>

            {currentItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else {
                      onTabChange(item.id);
                    }
                  }}
                  className={`w-full h-12 flex items-center justify-between px-3.5 rounded-2xl text-base font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#003B3B] text-white shadow-xs'
                      : 'text-[#102A2A] hover:bg-slate-100 hover:text-[#003B3B]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#16D9CC]' : 'text-[#718096]'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[11px] text-white px-2 py-0.5 rounded-full font-bold shadow-xs shrink-0 ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* C. Separate Admin Console if user.role === 'ADMIN' */}
          {user.role === 'ADMIN' && (
            <div className="pt-2 border-t border-[#E5E9ED]">
              <div className="px-3 pb-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
                Administration
              </div>
              <button
                onClick={() => onTabChange('admin')}
                className={`w-full h-12 flex items-center justify-between px-3.5 rounded-2xl text-base font-bold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-[#003B3B] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-[#003B3B]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Settings className={`w-5 h-5 shrink-0 ${activeTab === 'admin' ? 'text-[#ffce32]' : 'text-slate-400'}`} />
                  <span className="truncate">Admin Console</span>
                </div>
                <span className="text-[10px] bg-[#ffce32] text-[#002f34] px-2 py-0.5 rounded font-black uppercase shrink-0">
                  ADMIN
                </span>
              </button>
            </div>
          )}
        </div>

        {/* D. Bottom Profile Section */}
        <div className="pt-3 border-t border-[#E5E9ED] space-y-2.5">
          <button
            onClick={onOpenProfile}
            className="w-full p-2.5 rounded-2xl bg-[#F5F7F8] hover:bg-teal-50/50 border border-[#E5E9ED] transition-all cursor-pointer text-left flex items-center gap-3 group"
            title="Profile & Account Preferences"
          >
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover border border-[#E5E9ED] bg-white shrink-0 group-hover:border-teal-500"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-[#102A2A] truncate">{user.name}</span>
                {user.aadharVerified && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
              </div>
              <div className="text-xs text-[#718096] truncate">{user.area || user.city}</div>
            </div>
          </button>

          <div className="px-3 py-2 rounded-xl bg-teal-50/80 border border-teal-200/60 flex items-center justify-between text-xs font-semibold text-teal-900">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Trust Score</span>
            </span>
            <span className="font-black text-emerald-700">{user.trustScore}/100</span>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E9ED] px-2 py-2 shadow-lg flex items-center justify-around">
        {currentItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.action) {
                  item.action();
                } else {
                  onTabChange(item.id);
                }
              }}
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all relative ${
                isActive ? 'text-[#003B3B] font-black' : 'text-[#718096] hover:text-[#102A2A]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] mt-0.5 font-bold truncate max-w-[64px]">{item.label.split(' ')[0]}</span>
              {item.badge && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
