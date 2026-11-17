const BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL as string) || '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('borrowcircle_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('borrowcircle_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('borrowcircle_token');
}

async function request(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    let data: any = {};
    try {
      data = await response.json();
    } catch {
      // Non-JSON response
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (err: any) {
    if (err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed'))) {
      throw new Error('Unable to connect to the BorrowCircle server. Please check your network connection.');
    }
    throw err;
  }
}

export const api = {
  // Auth
  register: (body: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  requestAadhaarOtp: (aadhaarNumber: string) => request('/auth/aadhaar-verify/request', { method: 'POST', body: JSON.stringify({ aadhaarNumber }) }),
  confirmAadhaarOtp: (otp: string) => request('/auth/aadhaar-verify/confirm', { method: 'POST', body: JSON.stringify({ otp }) }),
  getMe: () => request('/auth/me'),

  // Items
  getCategories: () => request('/items/categories'),
  getSections: (city?: string) => request(`/items/sections${city ? `?city=${encodeURIComponent(city)}` : ''}`),
  searchItems: (params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request(`/items?${query}`);
  },
  getSuggestions: (q: string, city?: string) =>
    request(`/items/suggest?q=${encodeURIComponent(q)}${city ? `&city=${encodeURIComponent(city)}` : ''}`),
  getItem: (id: string) => request(`/items/${id}`),
  getItemPassport: (id: string) => request(`/items/${id}/passport`),
  createItem: (body: any) => request('/items', { method: 'POST', body: JSON.stringify(body) }),
  updateItem: (id: string, body: any) => request(`/items/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteItem: (id: string) => request(`/items/${id}`, { method: 'DELETE' }),
  getMyListings: () => request('/items/my/listings'),
  getWishlistItems: () => request('/items/my/wishlist'),
  toggleWishlist: (id: string) => request(`/items/${id}/wishlist`, { method: 'POST' }),

  // Bookings & Rental Workflow
  getBookings: (role?: string) => request(`/bookings${role ? `?role=${encodeURIComponent(role.toLowerCase())}` : ''}`),
  getBookingCounts: () => request('/bookings/counts/summary'),
  getBooking: (id: string) => request(`/bookings/${id}`),
  createBooking: (body: any) => request('/bookings', { method: 'POST', body: JSON.stringify(body) }),
  cancelBooking: (id: string, reason?: string) =>
    request(`/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  respondBooking: (id: string, action: 'ACCEPT' | 'REJECT', reason?: string) =>
    request(`/bookings/${id}/respond`, { method: 'POST', body: JSON.stringify({ action, reason }) }),
  payBooking: (id: string, paymentMethod = 'UPI', upiId = 'receiver@oksbi') =>
    request(`/bookings/${id}/payment`, { method: 'POST', body: JSON.stringify({ paymentMethod, upiId }) }),
  verifyPayment: (id: string, payload: any) =>
    request(`/bookings/${id}/payment/verify`, { method: 'POST', body: JSON.stringify(payload) }),
  requestHandoverOtp: (id: string) => request(`/bookings/${id}/handover/request-otp`, { method: 'POST' }),
  verifyHandoverOtp: (id: string, otp: string, conditionNotes?: string) =>
    request(`/bookings/${id}/handover/verify`, { method: 'POST', body: JSON.stringify({ otp, conditionNotes }) }),
  requestExtension: (id: string, additionalHours: number) =>
    request(`/bookings/${id}/extend`, { method: 'POST', body: JSON.stringify({ additionalHours }) }),
  respondExtension: (id: string, extensionId: string, action: 'APPROVE' | 'REJECT') =>
    request(`/bookings/${id}/extend/respond`, { method: 'POST', body: JSON.stringify({ extensionId, action }) }),
  requestReturnOtp: (id: string) => request(`/bookings/${id}/return/request-otp`, { method: 'POST' }),
  verifyReturnOtp: (id: string, otp: string) =>
    request(`/bookings/${id}/return/verify`, { method: 'POST', body: JSON.stringify({ otp }) }),
  completeInspection: (id: string, conditionNotes?: string) =>
    request(`/bookings/${id}/inspection/complete`, { method: 'POST', body: JSON.stringify({ conditionNotes }) }),
  submitReview: (id: string, rating: number, comment: string) =>
    request(`/bookings/${id}/review`, { method: 'POST', body: JSON.stringify({ rating, comment }) }),

  // Claims
  fileClaim: (body: any) => request('/claims', { method: 'POST', body: JSON.stringify(body) }),
  respondClaim: (id: string, explanation: string) => request(`/claims/${id}/respond`, { method: 'POST', body: JSON.stringify({ explanation }) }),
  resolveClaim: (id: string, body: any) => request(`/claims/${id}/resolve`, { method: 'POST', body: JSON.stringify(body) }),

  // Chat
  getConversations: () => request('/chat/conversations'),
  getUnreadMessagesCount: () => request('/chat/unread-count'),
  getMessages: (contactId: string) => request(`/chat/messages/${contactId}`),
  sendMessage: (receiverId: string, content: string, bookingId?: string, mediaUrl?: string) =>
    request('/chat/messages', { method: 'POST', body: JSON.stringify({ receiverId, content, bookingId, mediaUrl }) }),

  // Community & Extras
  getGroups: (city?: string) => request(`/community/groups${city ? `?city=${encodeURIComponent(city)}` : ''}`),
  getWishWall: () => request('/community/wish-wall'),
  postWishWall: (body: any) => request('/community/wish-wall', { method: 'POST', body: JSON.stringify(body) }),
  getEcoStats: () => request('/community/eco-impact'),
  getLeaderboard: () => request('/community/leaderboard'),
  getDemandHeatmap: (city?: string) => request(`/community/demand-heatmap${city ? `?city=${encodeURIComponent(city)}` : ''}`),
  calculateBorrowVsBuy: (purchasePrice: number, hourlyRate: number, estimatedHoursNeeded: number) =>
    request('/community/calculator/borrow-vs-buy', { method: 'POST', body: JSON.stringify({ purchasePrice, hourlyRate, estimatedHoursNeeded }) }),

  // Admin
  getAdminMetrics: () => request('/admin/metrics'),
  getAdminUsers: (params?: { role?: string; status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.role) q.append('role', params.role);
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    const qs = q.toString();
    return request(`/admin/users${qs ? `?${qs}` : ''}`);
  },
  adminSuspendUser: (userId: string, isSuspended: boolean, suspensionReason?: string) =>
    request(`/admin/users/${userId}/suspend`, { method: 'PUT', body: JSON.stringify({ isSuspended, suspensionReason }) }),
  adminGetListings: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    const qs = q.toString();
    return request(`/admin/listings${qs ? `?${qs}` : ''}`);
  },
  adminUpdateListingStatus: (itemId: string, status: string, reason?: string) =>
    request(`/admin/listings/${itemId}/status`, { method: 'PUT', body: JSON.stringify({ status, reason }) }),
  getAdminBookings: () => request('/admin/bookings'),
  getPendingApprovals: () => request('/approvals/pending'),
  approveItem: (id: string) => request(`/approvals/${id}/approve`, { method: 'POST' }),
  rejectItem: (id: string, reason?: string) => request(`/approvals/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  updateCommissions: (lenderCommission: number, receiverCommission: number) =>
    request('/admin/config/commissions', { method: 'POST', body: JSON.stringify({ lenderCommission, receiverCommission }) }),
  adminForceCompleteBooking: (id: string, resolutionNotes?: string) =>
    request(`/admin/bookings/${id}/force-complete`, { method: 'PUT', body: JSON.stringify({ resolutionNotes }) }),
  adminCancelBooking: (id: string, reason?: string) =>
    request(`/admin/bookings/${id}/cancel`, { method: 'PUT', body: JSON.stringify({ reason }) }),
  adminToggleUserVerify: (id: string) =>
    request(`/admin/users/${id}/toggle-verify`, { method: 'PUT' }),

  // Notifications
  getNotifications: () => request('/auth/notifications'),
  markNotificationRead: (id: string) => request(`/auth/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/auth/notifications/read-all', { method: 'PUT' }),

  // Profile & Account Mode
  updateProfile: (body: { name?: string; phone?: string; city?: string; area?: string; pincode?: string; avatar?: string; accountMode?: 'BORROWER' | 'LENDER' }) =>
    request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  switchAccountMode: (mode: 'BORROWER' | 'LENDER') =>
    request('/auth/mode', { method: 'PUT', body: JSON.stringify({ mode }) })
};
