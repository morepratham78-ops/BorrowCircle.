import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, Item } from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Users,
  Layers,
  Clock,
  Sparkles,
  Sliders,
  DollarSign,
  AlertTriangle,
  Search,
  Filter,
  UserX,
  UserCheck,
  Eye,
  RotateCcw,
  Ban,
  FileCheck,
  RefreshCw
} from 'lucide-react';

interface AdminScreenProps {
  user: User;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({ user }) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'users' | 'listings' | 'bookings' | 'settings'>('overview');
  const [metrics, setMetrics] = useState<any>(null);
  const [allListings, setAllListings] = useState<Item[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminBookings, setAdminBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionNotice, setActionNotice] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');

  // User tab filters
  const [userSearch, setUserSearch] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('ALL');

  // Listings tab filters
  const [listingSearch, setListingSearch] = useState<string>('');
  const [listingStatusFilter, setListingStatusFilter] = useState<string>('ALL');

  // Bookings tab filters
  const [bookingSearch, setBookingSearch] = useState<string>('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('ALL');

  // Commission settings
  const [lenderFee, setLenderFee] = useState<number>(15);
  const [receiverFee, setReceiverFee] = useState<number>(15);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mRes, lRes, uRes, bRes] = await Promise.all([
        api.getAdminMetrics(),
        api.adminGetListings(),
        api.getAdminUsers(),
        api.getAdminBookings()
      ]);
      setMetrics(mRes.metrics);
      setAllListings(lRes.listings || []);
      setAdminUsers(uRes.users || []);
      setAdminBookings(bRes.bookings || []);
      if (mRes.metrics) {
        setLenderFee(mRes.metrics.currentLenderFee || 15);
        setReceiverFee(mRes.metrics.currentReceiverFee || 15);
      }
    } catch (err: any) {
      console.error('Failed to load admin data', err);
      setActionError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Moderate Listing Status
  const handleUpdateListingStatus = async (id: string, status: string, promptReason = false) => {
    let reason: string | null = null;
    if (promptReason) {
      reason = prompt(`Enter reason for marking listing as ${status}:`, 'Listing does not comply with neighborhood safety guidelines.');
      if (!reason) return;
    }

    try {
      await api.adminUpdateListingStatus(id, status, reason || undefined);
      setActionNotice(`Listing status changed to ${status}`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update listing status');
    }
  };

  // Toggle User Suspension
  const handleToggleSuspendUser = async (targetUser: any) => {
    const willSuspend = !targetUser.isSuspended;
    let reason = '';
    if (willSuspend) {
      const input = prompt(`Enter suspension reason for ${targetUser.name}:`, 'Violation of community equipment borrowing terms.');
      if (!input) return;
      reason = input;
    } else {
      if (!confirm(`Reactivate account for ${targetUser.name}?`)) return;
    }

    try {
      await api.adminSuspendUser(targetUser.id, willSuspend, reason);
      setActionNotice(willSuspend ? `User ${targetUser.name} suspended.` : `User ${targetUser.name} reactivated.`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update suspension status');
    }
  };

  // Toggle Aadhaar Verification
  const handleToggleVerifyUser = async (userId: string) => {
    try {
      await api.adminToggleUserVerify(userId);
      setActionNotice('User identity verification status updated.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle verification');
    }
  };

  // Save Commissions
  const handleSaveCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateCommissions(lenderFee, receiverFee);
      setActionNotice('Platform commissions updated successfully!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update commissions');
    }
  };

  // Filtered Users
  const filteredUsers = adminUsers.filter((u) => {
    const matchSearch =
      !userSearch ||
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone?.includes(userSearch);
    const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    const matchStatus =
      userStatusFilter === 'ALL' ||
      (userStatusFilter === 'VERIFIED' && u.aadharVerified) ||
      (userStatusFilter === 'SUSPENDED' && u.isSuspended);
    return matchSearch && matchRole && matchStatus;
  });

  // Filtered Listings
  const filteredListings = allListings.filter((item) => {
    const matchSearch =
      !listingSearch ||
      item.title?.toLowerCase().includes(listingSearch.toLowerCase()) ||
      item.category?.name?.toLowerCase().includes(listingSearch.toLowerCase()) ||
      item.owner?.name?.toLowerCase().includes(listingSearch.toLowerCase()) ||
      item.area?.toLowerCase().includes(listingSearch.toLowerCase());
    const matchStatus = listingStatusFilter === 'ALL' || item.status === listingStatusFilter;
    return matchSearch && matchStatus;
  });

  // Filtered Bookings
  const filteredBookings = adminBookings.filter((b) => {
    const matchSearch =
      !bookingSearch ||
      (b.bookingNumber && b.bookingNumber.toLowerCase().includes(bookingSearch.toLowerCase())) ||
      (b.id && b.id.toLowerCase().includes(bookingSearch.toLowerCase())) ||
      (b.item?.title && b.item.title.toLowerCase().includes(bookingSearch.toLowerCase())) ||
      (b.receiver?.name && b.receiver.name.toLowerCase().includes(bookingSearch.toLowerCase())) ||
      (b.lender?.name && b.lender.name.toLowerCase().includes(bookingSearch.toLowerCase()));
    const matchStatus = bookingStatusFilter === 'ALL' || b.status === bookingStatusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = allListings.filter((i) => i.status === 'PENDING_APPROVAL').length;

  if (loading && !metrics) {
    return <div className="py-16 text-center text-sm text-slate-500 font-bold">Loading BorrowCircle Admin Console...</div>;
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 uppercase tracking-wider">
              Platform Administration
            </span>
            <span className="text-xs text-slate-400 font-medium">Logged in as {user.name} ({user.role})</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            BorrowCircle Operations & Governance
          </h2>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Notices */}
      {actionNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice('')} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-rose-700 hover:text-rose-900 font-bold">✕</button>
        </div>
      )}

      {/* Segmented Admin Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveAdminTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            activeAdminTab === 'overview'
              ? 'bg-[#003B3B] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Overview & Metrics</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('listings')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            activeAdminTab === 'listings'
              ? 'bg-[#003B3B] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Listing Moderation</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveAdminTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            activeAdminTab === 'users'
              ? 'bg-[#003B3B] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Management</span>
          <span className="text-[10px] text-slate-400">({adminUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('bookings')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            activeAdminTab === 'bookings'
              ? 'bg-[#003B3B] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Bookings & Disputes</span>
          <span className="text-[10px] text-slate-400">({adminBookings.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            activeAdminTab === 'settings'
              ? 'bg-[#003B3B] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Platform Settings</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & METRICS */}
      {activeAdminTab === 'overview' && (
        <div className="space-y-6">
          {metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Platform Revenue</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">₹{metrics.totalPlatformRevenue}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">₹{metrics.totalRentalVolume} Gross Volume</div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Deposit Policy</div>
                <div className="text-2xl font-black text-emerald-800 mt-1">₹0</div>
                <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">100% Deposit-Free Marketplace</div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Approvals</div>
                <div className={`text-2xl font-black mt-1 ${pendingCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {pendingCount}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{allListings.length} Total Listings</div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Rentals</div>
                <div className="text-2xl font-black text-blue-700 mt-1">{metrics.activeRentals}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{metrics.completedBookings} Completed</div>
              </div>
            </div>
          )}

          {/* Quick Action Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-sm font-extrabold text-slate-900">Listings Requiring Review</h4>
              <p className="text-xs text-slate-500">
                You have {pendingCount} equipment listing(s) awaiting verification before they can appear in neighborhood search.
              </p>
              <button
                onClick={() => {
                  setListingStatusFilter('PENDING_APPROVAL');
                  setActiveAdminTab('listings');
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Review Pending Listings ({pendingCount})
              </button>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-sm font-extrabold text-slate-900">Platform Commission Rates</h4>
              <p className="text-xs text-slate-500">
                Current active commission: ₹{lenderFee} from lender, ₹{receiverFee} from borrower per equipment rental.
              </p>
              <button
                onClick={() => setActiveAdminTab('settings')}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Adjust Commission Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LISTINGS MODERATION */}
      {activeAdminTab === 'listings' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Equipment Listings Directory ({filteredListings.length})
              </h3>
              <p className="text-xs text-slate-500">
                Moderate, approve, pause, or disable community equipment listings.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search listings, owner, area..."
                  value={listingSearch}
                  onChange={(e) => setListingSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-48 focus:w-64 transition-all"
                />
              </div>

              <select
                value={listingStatusFilter}
                onChange={(e) => setListingStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved & Live</option>
                <option value="SUSPENDED">Suspended / Paused</option>
                <option value="REJECTED">Needs Revision</option>
              </select>
            </div>
          </div>

          {filteredListings.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No equipment listings match the selected filters.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredListings.map((item) => (
                <div key={item.id} className="py-4 flex flex-col md:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={item.images?.[0]?.url || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80'}
                      alt={item.title}
                      className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-slate-200 bg-slate-50"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                          item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                          item.status === 'SUSPENDED' ? 'bg-slate-200 text-slate-700' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {item.status}
                        </span>
                        <span className="text-xs font-bold text-teal-700">{item.category?.name}</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 mt-1">{item.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{item.description}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium">
                        <span>Lender: <strong>{item.owner?.name}</strong> ({item.area}, {item.city})</span>
                        <span>•</span>
                        <span>Rate: <strong>₹{item.hourlyRate}/hr</strong></span>
                        <span>•</span>
                        <span>Value: <strong>₹{item.replacementValue}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {item.status === 'PENDING_APPROVAL' && (
                      <>
                        <button
                          onClick={() => handleUpdateListingStatus(item.id, 'APPROVED')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleUpdateListingStatus(item.id, 'REJECTED', true)}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {item.status === 'APPROVED' && (
                      <button
                        onClick={() => handleUpdateListingStatus(item.id, 'SUSPENDED', true)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Disable/Pause listing"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Suspend / Disable</span>
                      </button>
                    )}

                    {(item.status === 'SUSPENDED' || item.status === 'REJECTED') && (
                      <button
                        onClick={() => handleUpdateListingStatus(item.id, 'APPROVED')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Restore & Approve</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: USER MANAGEMENT */}
      {activeAdminTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                User Directory & Trust Management ({filteredUsers.length})
              </h3>
              <p className="text-xs text-slate-500">
                Manage user accounts, verify identities, inspect trust scores, and suspend accounts.
              </p>
            </div>

            {/* User Search & Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search name, email, phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-48 focus:w-64 transition-all"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="ALL">All Roles</option>
                <option value="USER">Regular Users</option>
                <option value="ADMIN">Admins</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="VERIFIED">Aadhaar Verified</option>
                <option value="SUSPENDED">Suspended Accounts</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="pb-2 font-bold">User</th>
                  <th className="pb-2 font-bold">Location</th>
                  <th className="pb-2 font-bold">Identity & Verification</th>
                  <th className="pb-2 font-bold">Trust Score</th>
                  <th className="pb-2 font-bold">Role</th>
                  <th className="pb-2 font-bold">Account Status</th>
                  <th className="pb-2 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="py-3">
                    <td className="py-3 font-bold text-slate-900">
                      {u.name}
                      <span className="block text-[10px] text-slate-400 font-normal">{u.email} • {u.phone}</span>
                    </td>
                    <td className="py-3 text-slate-600">{u.area}, {u.city}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        {u.aadharVerified ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Aadhaar Verified</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Unverified</span>
                        )}
                        <button
                          onClick={() => handleToggleVerifyUser(u.id)}
                          className="text-[10px] text-teal-700 hover:underline font-bold ml-1"
                        >
                          {u.aadharVerified ? '(Revoke)' : '(Verify)'}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 font-black text-teal-800">{u.trustScore}/100</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.role === 'ADMIN' ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3">
                      {u.isSuspended ? (
                        <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded text-[10px]">
                          Suspended
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleToggleSuspendUser(u)}
                          className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                            u.isSuspended
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {u.isSuspended ? 'Reactivate' : 'Suspend'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BOOKINGS & DISPUTE RESOLUTION */}
      {activeAdminTab === 'bookings' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                All Platform Bookings ({filteredBookings.length})
              </h3>
              <p className="text-xs text-slate-500">
                Real-time oversight across rental lifecycle, community protection, and dispute resolution.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search booking #, user, item..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-48 focus:w-64 transition-all"
                />
              </div>

              <select
                value={bookingStatusFilter}
                onChange={(e) => setBookingStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Approval</option>
                <option value="READY_FOR_PICKUP">Ready For Pickup</option>
                <option value="ACTIVE">Active Rental</option>
                <option value="INSPECTION_PENDING">Inspection Pending</option>
                <option value="DISPUTED">Disputed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="pb-2 font-bold">Booking #</th>
                  <th className="pb-2 font-bold">Equipment</th>
                  <th className="pb-2 font-bold">Parties</th>
                  <th className="pb-2 font-bold">Status</th>
                  <th className="pb-2 font-bold">Amounts</th>
                  <th className="pb-2 font-bold text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="py-3">
                    <td className="py-3 font-mono text-[11px] font-bold text-slate-700">
                      #{b.bookingNumber || b.id.substring(0, 8)}
                    </td>
                    <td className="py-3 font-bold text-slate-900">
                      {b.item?.title || 'Equipment'}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        ₹{b.hourlyRate || b.item?.hourlyRate}/hr • {b.durationHours}h
                      </span>
                    </td>
                    <td className="py-3 text-slate-700">
                      <div>Borrower: <strong>{b.receiver?.name}</strong></div>
                      <div className="text-[10px] text-slate-500">Lender: {b.lender?.name}</div>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        b.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        b.status === 'COMPLETED' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                        b.status === 'DISPUTED' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        b.status === 'INSPECTION_PENDING' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        'bg-blue-100 text-blue-800 border-blue-300'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-slate-800">
                      ₹{b.totalPayableAmount || b.rentalAmount}
                      <span className="block text-[10px] text-emerald-600 font-semibold">
                        Zero Deposit
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={async () => {
                              const note = prompt(`Enter resolution notes to force-complete booking #${b.bookingNumber || b.id.substring(0, 8)}:`, 'Dispute settled amicably by admin mediation.');
                              if (!note) return;
                              try {
                                await api.adminForceCompleteBooking(b.id, note);
                                setActionNotice(`Booking #${b.bookingNumber || b.id.substring(0, 8)} resolved & completed.`);
                                fetchData();
                              } catch (e: any) {
                                alert(e.message || 'Action failed');
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[10px] font-bold cursor-pointer"
                          >
                            Force Complete
                          </button>
                          <button
                            onClick={async () => {
                              const reason = prompt(`Enter cancellation reason for booking #${b.bookingNumber || b.id.substring(0, 8)}:`, 'Cancelled by platform admin.');
                              if (!reason) return;
                              try {
                                await api.adminCancelBooking(b.id, reason);
                                setActionNotice(`Booking #${b.bookingNumber || b.id.substring(0, 8)} cancelled.`);
                                fetchData();
                              } catch (e: any) {
                                alert(e.message || 'Action failed');
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: COMMISSION & PLATFORM SETTINGS */}
      {activeAdminTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 max-w-xl">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-extrabold text-slate-900">
              Platform Service Commission Configuration
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Configure flat or percentage service commissions earned by BorrowCircle per completed equipment booking.
          </p>

          <form onSubmit={handleSaveCommission} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lender Fee (₹ per booking)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={lenderFee}
                  onChange={(e) => setLenderFee(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Borrower Fee (₹ per booking)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={receiverFee}
                  onChange={(e) => setReceiverFee(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-primary text-white text-xs font-bold shadow-xs hover:opacity-95 cursor-pointer"
            >
              Save Platform Commission Rates
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
