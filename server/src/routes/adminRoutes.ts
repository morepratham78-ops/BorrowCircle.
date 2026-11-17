import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateUser, requireAdmin, AuthRequest } from '../middleware/auth';
import { CONFIG } from '../config';

const router = Router();

// 1. ADMIN ANALYTICS & PLATFORM METRICS
router.get('/metrics', authenticateUser, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalListings,
      pendingListings,
      totalBookings,
      activeRentals,
      disputedBookings,
      completedBookings
    ] = await Promise.all([
      prisma.user.count(),
      prisma.item.count(),
      prisma.item.count({ where: { status: 'PENDING_APPROVAL' } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'ACTIVE' } }),
      prisma.booking.count({ where: { status: 'DISPUTED' } }),
      prisma.booking.count({ where: { status: 'COMPLETED' } })
    ]);

    const revenueResult = await prisma.booking.aggregate({
      where: { status: { in: ['CONFIRMED', 'ACTIVE', 'INSPECTION_PENDING', 'COMPLETED'] } },
      _sum: {
        platformRevenue: true,
        rentalAmount: true,
        securityDeposit: true
      }
    });

    res.json({
      metrics: {
        totalUsers,
        totalListings,
        pendingListings,
        totalBookings,
        activeRentals,
        disputedBookings,
        completedBookings,
        totalPlatformRevenue: revenueResult._sum.platformRevenue || 0,
        totalRentalVolume: revenueResult._sum.rentalAmount || 0,
        escrowDepositsHeld: 0, // Zero deposit marketplace model
        currentLenderFee: CONFIG.DEFAULT_LENDER_COMMISSION,
        currentReceiverFee: CONFIG.DEFAULT_RECEIVER_COMMISSION
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin metrics' });
  }
});

// 2. ADMIN LIST USERS
router.get('/users', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const role = req.query.role as string;
    const filterStatus = req.query.status as string; // 'ALL', 'VERIFIED', 'SUSPENDED'

    const where: any = {};
    if (role && role !== 'ALL') {
      where.role = role;
    }
    if (filterStatus === 'VERIFIED') {
      where.aadharVerified = true;
    } else if (filterStatus === 'SUSPENDED') {
      where.isSuspended = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { area: { contains: search } },
        { city: { contains: search } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        area: true,
        role: true,
        trustScore: true,
        rating: true,
        isPhoneVerified: true,
        isIdentityVerified: true,
        aadharVerified: true,
        isSuspended: true,
        suspensionReason: true,
        completedRentalsCount: true,
        completedLendsCount: true,
        createdAt: true
      }
    });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 2B. ADMIN SUSPEND / REACTIVATE USER
router.put('/users/:id/suspend', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id as string;
    const { isSuspended, suspensionReason } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.role === 'ADMIN') {
      res.status(400).json({ error: 'Cannot suspend an administrative account' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: Boolean(isSuspended),
        suspensionReason: isSuspended ? (suspensionReason || 'Account suspended for policy violations.') : null
      }
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId,
        title: isSuspended ? 'Account Suspended' : 'Account Reactivated',
        message: isSuspended
          ? `Your BorrowCircle account has been suspended by an administrator. Reason: ${suspensionReason || 'Policy violation'}`
          : 'Your BorrowCircle account suspension has been lifted. You can now use the marketplace.',
        type: 'SYSTEM',
        link: '/trust'
      }
    });

    res.json({
      message: isSuspended ? 'User suspended successfully' : 'User reactivated successfully',
      user: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user suspension status' });
  }
});

// 2C. ADMIN LIST ALL EQUIPMENT LISTINGS
router.get('/listings', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const status = req.query.status as string;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { area: { contains: search } },
        { city: { contains: search } }
      ];
    }

    const listings = await prisma.item.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        images: true,
        category: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            area: true,
            trustScore: true,
            rating: true
          }
        }
      }
    });

    res.json({ listings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch equipment listings' });
  }
});

// 2D. ADMIN MODERATE LISTING STATUS (Approve, Reject, Suspend/Disable, Restore)
router.put('/listings/:id/status', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const itemId = req.params.id as string;
    const { status, reason } = req.body;

    const validStatuses = ['APPROVED', 'REJECTED', 'SUSPENDED', 'PENDING_APPROVAL', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { owner: true }
    });

    if (!item) {
      res.status(404).json({ error: 'Equipment listing not found' });
      return;
    }

    const updated = await prisma.item.update({
      where: { id: itemId },
      data: {
        status,
        ...(reason && { rejectionReason: reason })
      },
      include: { images: true, category: true, owner: true }
    });

    // Notify listing owner
    await prisma.notification.create({
      data: {
        userId: item.ownerId,
        title: `Listing Status: ${status}`,
        message: `Your equipment listing "${item.title}" status is now ${status}.${reason ? ` Reason: ${reason}` : ''}`,
        type: 'SYSTEM',
        link: `/items/${item.id}`
      }
    });

    res.json({
      message: `Listing status updated to ${status}`,
      item: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update listing status' });
  }
});

// 3. ADMIN LIST ALL BOOKINGS
router.get('/bookings', authenticateUser, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        item: { select: { title: true, hourlyRate: true } },
        receiver: { select: { name: true, phone: true } },
        lender: { select: { name: true, phone: true } }
      }
    });

    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all bookings' });
  }
});

// 4. ADMIN FORCE COMPLETE BOOKING (Dispute / Stalled Resolution)
router.put('/bookings/:id/force-complete', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    const { resolutionNotes } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'COMPLETED',
        actualEndTime: booking.actualEndTime || new Date()
      }
    });

    // Notify both parties
    await prisma.notification.createMany({
      data: [
        {
          userId: booking.receiverId,
          title: 'Booking Completed by Admin',
          message: `Booking #${booking.id.substring(0, 8)} was resolved and completed by admin. ${resolutionNotes || ''}`,
          type: 'SYSTEM',
          link: '/rentals'
        },
        {
          userId: booking.lenderId,
          title: 'Booking Completed by Admin',
          message: `Booking #${booking.id.substring(0, 8)} was resolved and completed by admin. ${resolutionNotes || ''}`,
          type: 'SYSTEM',
          link: '/listings'
        }
      ]
    });

    res.json({ message: 'Booking force-completed and rental resolved', booking: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete booking' });
  }
});

// 5. ADMIN CANCEL BOOKING
router.put('/bookings/:id/cancel', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    const { reason } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason || 'Cancelled by platform admin.'
      }
    });

    res.json({ message: 'Booking cancelled by admin', booking: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// 6. ADMIN TOGGLE USER VERIFICATION
router.put('/users/:id/toggle-verify', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const newStatus = !user.aadharVerified;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        aadharVerified: newStatus,
        isIdentityVerified: newStatus,
        trustScore: newStatus ? Math.min(100, user.trustScore + 20) : Math.max(40, user.trustScore - 20)
      }
    });

    res.json({ message: `User identity verification set to ${newStatus}`, user: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user verification' });
  }
});

// 7. CONFIGURE PLATFORM COMMISSION
router.post('/config/commissions', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { lenderCommission, receiverCommission } = req.body;

    if (lenderCommission !== undefined) {
      CONFIG.DEFAULT_LENDER_COMMISSION = Number(lenderCommission);
    }
    if (receiverCommission !== undefined) {
      CONFIG.DEFAULT_RECEIVER_COMMISSION = Number(receiverCommission);
    }

    res.json({
      message: 'Platform commission settings updated successfully',
      lenderCommission: CONFIG.DEFAULT_LENDER_COMMISSION,
      receiverCommission: CONFIG.DEFAULT_RECEIVER_COMMISSION
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update commissions' });
  }
});

export default router;
