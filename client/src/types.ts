export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  area: string;
  pincode: string;
  avatar?: string;
  role: 'USER' | 'ADMIN';
  accountMode?: 'BORROWER' | 'LENDER';
  isPhoneVerified: boolean;
  isIdentityVerified: boolean;
  aadharVerified: boolean;
  trustScore: number;
  rating: number;
  ratingCount: number;
  completedRentalsCount: number;
  completedLendsCount: number;
  ecoKgCo2Saved: number;
  rewardPoints: number;
  wishlistIds?: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  displayOrder: number;
  _count?: {
    items: number;
  };
}

export interface ItemImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

export interface Item {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  category?: Category;
  condition: 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'FAIR';
  purchasePrice?: number;
  replacementValue: number;
  hourlyRate: number;
  dailyRate?: number;
  minHours: number;
  securityDeposit: number;
  city: string;
  area: string;
  pincode: string;
  pickupAddress: string;
  isDeliveryAvailable: boolean;
  deliveryFee: number;
  usageInstructions?: string;
  safetyGuidelines?: string;
  damageConditions?: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  isAvailable?: boolean;
  rejectionReason?: string;
  ownerId: string;
  owner?: {
    id: string;
    name: string;
    city: string;
    area: string;
    trustScore: number;
    rating: number;
    ratingCount?: number;
    avatar?: string;
    isIdentityVerified?: boolean;
    aadharVerified?: boolean;
  };
  passportSerial?: string;
  maintenanceLog?: string;
  viewsCount?: number;
  images: ItemImage[];
  reviews?: Review[];
  createdAt: string;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  itemId: string;
  item: Item;
  receiverId: string;
  receiver: {
    id: string;
    name: string;
    phone: string;
    avatar?: string;
    trustScore: number;
    isIdentityVerified?: boolean;
    aadharVerified?: boolean;
  };
  lenderId: string;
  lender: {
    id: string;
    name: string;
    phone: string;
    avatar?: string;
    trustScore: number;
    isIdentityVerified?: boolean;
    aadharVerified?: boolean;
  };
  status:
    | 'PENDING'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'PAYMENT_PENDING'
    | 'CONFIRMED'
    | 'READY_FOR_PICKUP'
    | 'ACTIVE'
    | 'EXTENSION_REQUESTED'
    | 'RETURN_REQUESTED'
    | 'INSPECTION_PENDING'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'DISPUTED';
  paymentStatus?: 'NOT_INITIATED' | 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  cancellationReason?: string;
  durationHours: number;
  hourlyRate: number;
  rentalAmount: number;
  receiverFee: number;
  lenderFee: number;
  securityDeposit: number;
  deliveryFee: number;
  totalPayableAmount: number;
  lenderEarnings: number;
  platformRevenue: number;
  startTime: string;
  expectedEndTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  handoverOtp?: string;
  isHandoverVerified: boolean;
  handoverVerifiedAt?: string;
  returnOtp?: string;
  isReturnVerified: boolean;
  returnVerifiedAt?: string;
  inspectionDurationMinutes: number;
  inspectionEndTime?: string;
  inspectionStatus: 'PENDING' | 'CLEAN' | 'DAMAGE_REPORTED';
  notes?: string;
  extensionRequests?: any[];
  inspectionRecords?: any[];
  damageClaims?: any[];
  reviews?: Review[];
  createdAt: string;
}

export interface Review {
  id: string;
  reviewerId: string;
  reviewer?: {
    name: string;
    avatar?: string;
  };
  role: 'LENDER' | 'RECEIVER';
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
  receiverId: string;
  content: string;
  mediaUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}
