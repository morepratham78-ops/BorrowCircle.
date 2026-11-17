import React, { useState, useEffect } from 'react';
import { User, Item } from './types';
import { api, getAuthToken, removeAuthToken } from './services/api';
import { Navbar } from './components/Navbar';
import { Navigation } from './components/Navigation';
import { AuthScreen } from './screens/AuthScreen';
import { ExploreScreen } from './screens/ExploreScreen';
import { EquipmentDetailModal } from './screens/EquipmentDetailModal';
import { MyRentalsScreen } from './screens/MyRentalsScreen';
import { MyListingsScreen } from './screens/MyListingsScreen';
import { CreateListingScreen } from './screens/CreateListingScreen';
import { MessagesScreen } from './screens/MessagesScreen';
import { TrustSafetyScreen } from './screens/TrustSafetyScreen';
import { CommunityScreen } from './screens/CommunityScreen';
import { AdminScreen } from './screens/AdminScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { NotFoundScreen } from './screens/NotFoundScreen';
import { ProfileModal } from './components/ProfileModal';
import { WishlistModal } from './components/WishlistModal';

const TAB_TO_PATH: Record<string, string> = {
  dashboard: '/dashboard',
  explore: '/explore',
  rentals: '/rentals',
  bookings: '/bookings',
  listings: '/listings',
  requests: '/requests',
  management: '/management',
  earnings: '/earnings',
  create_listing: '/create-listing',
  messages: '/messages',
  trust: '/trust',
  community: '/community',
  admin: '/admin'
};

const PATH_TO_TAB: Record<string, string> = {
  '/': 'explore',
  '/dashboard': 'dashboard',
  '/explore': 'explore',
  '/rentals': 'rentals',
  '/bookings': 'bookings',
  '/listings': 'listings',
  '/requests': 'requests',
  '/management': 'management',
  '/earnings': 'earnings',
  '/create-listing': 'create_listing',
  '/create_listing': 'create_listing',
  '/messages': 'messages',
  '/trust': 'trust',
  '/community': 'community',
  '/admin': 'admin'
};

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Global Navigation state
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCity, setSelectedCity] = useState<string>('Bengaluru');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Wishlist state
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [showWishlistModal, setShowWishlistModal] = useState<boolean>(false);

  // Profile modal state
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Selected item for detail modal
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Direct chat contact routing
  const [chatContactId, setChatContactId] = useState<string | null>(null);

  // Live notification counters for sidebar
  const [unreadMessageCount, setUnreadMessageCount] = useState<number>(0);
  const [activeRentalCount, setActiveRentalCount] = useState<number>(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  const resolveRouteFromPath = (path: string): { tab: string; itemId?: string } => {
    const cleanPath = path.replace(/\/$/, '') || '/';
    if (PATH_TO_TAB[cleanPath]) {
      return { tab: PATH_TO_TAB[cleanPath] };
    }
    if (cleanPath.startsWith('/items/')) {
      const id = cleanPath.replace('/items/', '');
      return { tab: 'explore', itemId: id };
    }
    return { tab: 'not_found' };
  };

  const handleNavigate = (tab: string, pushHistory = true) => {
    setActiveTab(tab);
    if (pushHistory) {
      const targetPath = TAB_TO_PATH[tab] || `/${tab}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  };

  const refreshCounters = async () => {
    try {
      const [unreadRes, borrowerRes, lenderRes] = await Promise.allSettled([
        api.getUnreadMessagesCount(),
        api.getBookings('borrower'),
        api.getBookings('lender')
      ]);

      if (unreadRes.status === 'fulfilled' && unreadRes.value) {
        setUnreadMessageCount(unreadRes.value.unreadCount || 0);
      }

      if (borrowerRes.status === 'fulfilled' && borrowerRes.value?.bookings) {
        const active = borrowerRes.value.bookings.filter(
          (b: any) => b.receiverId === currentUser?.id && ['CONFIRMED', 'READY_FOR_PICKUP', 'ACTIVE'].includes(b.status)
        ).length;
        setActiveRentalCount(active);
      }

      if (lenderRes.status === 'fulfilled' && lenderRes.value?.bookings) {
        const pending = lenderRes.value.bookings.filter(
          (b: any) => b.lenderId === currentUser?.id && ['PENDING', 'PENDING_APPROVAL'].includes(b.status)
        ).length;
        setPendingRequestsCount(pending);
      }
    } catch {
      // Ignore
    }
  };

  // Switch Account Mode (Borrower <-> Lender) on single account
  const handleSwitchMode = async (mode: 'BORROWER' | 'LENDER') => {
    try {
      await api.switchAccountMode(mode);
      setCurrentUser(prev => prev ? { ...prev, accountMode: mode } : prev);
      refreshCounters();
      handleNavigate('dashboard');
    } catch (err) {
      console.error('Failed to switch mode', err);
    }
  };

  // Check existing token on mount
  const checkSession = async () => {
    const token = getAuthToken();
    if (!token) {
      setCurrentUser(null);
      setAuthChecking(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res.user) {
        setCurrentUser(res.user);
        setSelectedCity(res.user.city || 'Bengaluru');
        setWishlistIds(res.user.wishlistIds || []);
        refreshCounters();
      } else {
        removeAuthToken();
        setCurrentUser(null);
      }
    } catch (err) {
      removeAuthToken();
      setCurrentUser(null);
    } finally {
      setAuthChecking(false);
    }
  };

  useEffect(() => {
    checkSession();

    // Listen to popstate for browser back/forward
    const handlePopState = () => {
      const resolved = resolveRouteFromPath(window.location.pathname);
      setActiveTab(resolved.tab);
    };
    window.addEventListener('popstate', handlePopState);

    // Initial route resolution
    const initial = resolveRouteFromPath(window.location.pathname);
    if (initial.tab !== 'not_found') {
      setActiveTab(initial.tab);
    } else if (window.location.pathname !== '/') {
      setActiveTab('not_found');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    setCurrentUser(null);
    handleNavigate('explore');
  };

  const handleToggleWishlist = async (itemId: string) => {
    try {
      const res = await api.toggleWishlist(itemId);
      if (res.wishlisted) {
        setWishlistIds(prev => [...prev, itemId]);
      } else {
        setWishlistIds(prev => prev.filter(id => id !== itemId));
      }
    } catch (err) {
      console.error('Wishlist toggle failed', err);
    }
  };

  const handleOpenChat = (contactId: string) => {
    setSelectedItem(null);
    setChatContactId(contactId);
    handleNavigate('messages');
  };

  // If checking authentication
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-primary animate-pulse flex items-center justify-center mb-4">
          <span className="text-xl font-bold">BC</span>
        </div>
        <div className="text-sm font-bold text-teal-400">Loading BorrowCircle...</div>
      </div>
    );
  }

  // MANDATORY REQUIREMENT: FIRST SCREEN IS LOGIN / SIGNUP
  if (!currentUser) {
    return (
      <AuthScreen
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setSelectedCity(user.city || 'Bengaluru');
          setWishlistIds(user.wishlistIds || []);
          handleNavigate('explore');
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-[#f2f4f5] flex flex-col font-sans ${activeTab === 'messages' ? 'h-screen overflow-hidden' : ''}`}>
      {/* Top Sticky Header */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        wishlistCount={wishlistIds.length}
        onNavigate={handleNavigate}
        activeTab={activeTab}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenWishlist={() => setShowWishlistModal(true)}
        onSwitchMode={handleSwitchMode}
        unreadMessageCount={unreadMessageCount}
      />

      {/* Main Workspace with Sidebar */}
      <div className={`flex-1 flex w-full min-w-0 ${activeTab === 'messages' ? 'min-h-0 overflow-hidden' : ''}`}>
        <Navigation
          activeTab={activeTab}
          onTabChange={(tab) => {
            handleNavigate(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          user={currentUser}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenWishlist={() => setShowWishlistModal(true)}
          onSwitchMode={handleSwitchMode}
          activeRentalCount={activeRentalCount}
          unreadMessageCount={unreadMessageCount}
          pendingRequestsCount={pendingRequestsCount}
        />

        {/* Dynamic Screen Content */}
        <main className={`flex-1 min-w-0 ${activeTab === 'messages' ? 'p-2 sm:p-3 lg:p-4 flex flex-col h-full min-h-0 overflow-hidden' : 'p-4 sm:p-6 lg:p-8'}`}>
          {activeTab === 'dashboard' && (
            <DashboardScreen
              user={currentUser}
              onNavigate={handleNavigate}
              onSelectItem={(item) => setSelectedItem(item)}
              onOpenChat={handleOpenChat}
              onSwitchMode={handleSwitchMode}
              onOpenWishlist={() => setShowWishlistModal(true)}
            />
          )}

          {activeTab === 'explore' && (
            <ExploreScreen
              user={currentUser}
              selectedCity={selectedCity}
              searchQuery={searchQuery}
              onSelectItem={(item) => setSelectedItem(item)}
              onNavigateToListing={() => handleNavigate('create_listing')}
              onNavigateToRentals={() => handleNavigate('rentals')}
              onOpenChat={handleOpenChat}
              wishlistIds={wishlistIds}
              onToggleWishlist={handleToggleWishlist}
            />
          )}

          {activeTab === 'rentals' && (
            <MyRentalsScreen
              user={currentUser}
              onOpenChat={handleOpenChat}
              onRefreshUser={checkSession}
              initialFilter="ACTIVE"
            />
          )}

          {activeTab === 'bookings' && (
            <MyRentalsScreen
              user={currentUser}
              onOpenChat={handleOpenChat}
              onRefreshUser={checkSession}
              initialFilter="ALL"
            />
          )}

          {activeTab === 'listings' && (
            <MyListingsScreen
              user={currentUser}
              onNavigateToCreate={() => handleNavigate('create_listing')}
              onOpenChat={handleOpenChat}
              onRefreshUser={checkSession}
              viewSection="listings"
            />
          )}

          {activeTab === 'requests' && (
            <MyListingsScreen
              user={currentUser}
              onNavigateToCreate={() => handleNavigate('create_listing')}
              onOpenChat={handleOpenChat}
              onRefreshUser={checkSession}
              viewSection="requests"
            />
          )}

          {activeTab === 'management' && (
            <MyListingsScreen
              user={currentUser}
              onNavigateToCreate={() => handleNavigate('create_listing')}
              onOpenChat={handleOpenChat}
              onRefreshUser={checkSession}
              viewSection="management"
            />
          )}

          {activeTab === 'earnings' && (
            <MyListingsScreen
              user={currentUser}
              onNavigateToCreate={() => handleNavigate('create_listing')}
              onOpenChat={handleOpenChat}
              onRefreshUser={checkSession}
              viewSection="earnings"
            />
          )}

          {activeTab === 'create_listing' && (
            <CreateListingScreen
              user={currentUser}
              onSuccess={() => {
                handleNavigate('listings');
              }}
              onCancel={() => handleNavigate('dashboard')}
            />
          )}

          {activeTab === 'messages' && (
            <MessagesScreen
              user={currentUser}
              initialContactId={chatContactId}
              onSelectItem={(item) => setSelectedItem(item)}
              onNavigateToRentals={() => handleNavigate('rentals')}
              onNavigateToExplore={() => handleNavigate('explore')}
              onMessagesRead={refreshCounters}
            />
          )}

          {activeTab === 'trust' && (
            <TrustSafetyScreen
              user={currentUser}
              onRefreshUser={checkSession}
            />
          )}

          {activeTab === 'community' && (
            <CommunityScreen
              user={currentUser}
            />
          )}

          {activeTab === 'admin' && currentUser.role === 'ADMIN' && (
            <AdminScreen
              user={currentUser}
            />
          )}

          {activeTab === 'not_found' && (
            <NotFoundScreen
              onNavigate={handleNavigate}
              attemptedPath={window.location.pathname}
            />
          )}
        </main>
      </div>

      {/* Equipment Detail Modal */}
      {selectedItem && (
        <EquipmentDetailModal
          item={selectedItem}
          currentUser={currentUser}
          onClose={() => setSelectedItem(null)}
          onBookingCreated={() => {
            setSelectedItem(null);
            handleNavigate('rentals');
          }}
          onOpenChat={handleOpenChat}
        />
      )}

      {/* User Profile & Neighborhood Reputation Modal */}
      {showProfileModal && (
        <ProfileModal
          user={currentUser}
          onClose={() => setShowProfileModal(false)}
          onProfileUpdated={(updated) => {
            setCurrentUser(prev => prev ? { ...prev, ...updated } : prev);
            if (updated.city) setSelectedCity(updated.city);
          }}
        />
      )}

      {/* Wishlist Saved Items Modal */}
      {showWishlistModal && (
        <WishlistModal
          wishlistIds={wishlistIds}
          onClose={() => setShowWishlistModal(false)}
          onToggleWishlist={handleToggleWishlist}
          onSelectItem={(item) => {
            setShowWishlistModal(false);
            setSelectedItem(item);
          }}
          onNavigate={(tab) => {
            setShowWishlistModal(false);
            handleNavigate(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
}

export default App;
