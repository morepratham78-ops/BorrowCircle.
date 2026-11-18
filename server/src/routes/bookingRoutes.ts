import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { PricingService } from '../services/pricingService';
import { OtpService } from '../services/otpService';
import { TrustService } from '../services/trustService';
import { CONFIG } from '../config';

const router = Router();

// 1. GET ALL USER BOOKINGS (as receiver or lender)
router.get('/', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = ((req.query.role as string) || '').toLowerCase().trim();
    const where: any = {};

    if (role === 'lender') {
      where.lenderId = req.user.id;
    } else if (role === 'borrower') {
      where.receiverId = req.user.id;
    } else {
      where.OR = [{ receiverId: req.user.id }, { lenderId: req.user.id }];
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        item: { include: { images: true, category: true } },
        receiver: { select: { id: true, name: true, phone: true, avatar: true, trustScore: true, isIdentityVerified: true } },
        lender: { select: { id: true, name: true, phone: true, avatar: true, trustScore: true, isIdentityVerified: true } },
        extensionRequests: { orderBy: { requestedAt: 'desc' } },
        inspectionRecords: true,
        damageClaims: true,
        reviews: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// 1.5. GET BOOKING COUNTS SUMMARY (FOR SIDEBAR NOTIFICATION BADGES)
router.get('/counts/summary', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const [incomingPendingRequests, activeBorrowerRentals, activeLenderRentals] = await Promise.all([
      prisma.booking.count({
        where: { lenderId: userId, status: { in: ['PENDING', 'PENDING_APPROVAL'] } }
      }),
      prisma.booking.count({
        where: { receiverId: userId, status: { in: ['ACTIVE', 'READY_FOR_PICKUP', 'CONFIRMED'] } }
      }),
      prisma.booking.count({
        where: { lenderId: userId, status: { in: ['ACTIVE', 'READY_FOR_PICKUP', 'CONFIRMED'] } }
      })
    ]);

    res.json({
      incomingPendingRequests,
      activeBorrowerRentals,
      activeLenderRentals
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booking counts summary' });
  }
});

// 2. GET SINGLE BOOKING DETAILS
router.get('/:id', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        item: { include: { images: true, category: true } },
        receiver: { select: { id: true, name: true, phone: true, avatar: true, trustScore: true, isIdentityVerified: true, aadharVerified: true } },
        lender: { select: { id: true, name: true, phone: true, avatar: true, trustScore: true, isIdentityVerified: true, aadharVerified: true } },
        extensionRequests: { orderBy: { requestedAt: 'desc' } },
        inspectionRecords: true,
        damageClaims: true,
        payments: true,
        reviews: true
      }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.receiverId !== req.user.id && booking.lenderId !== req.user.id && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Unauthorized to view this booking' });
      return;
    }

    // Auto-resolve inspection if window elapsed
    if (booking.status === 'INSPECTION_PENDING' && booking.inspectionEndTime && new Date() > booking.inspectionEndTime) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'COMPLETED',
          inspectionStatus: 'CLEAN'
        }
      });
      booking.status = 'COMPLETED';
      booking.inspectionStatus = 'CLEAN';
    }

    res.json({ booking });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booking details' });
  }
});

// 3. CREATE BOOKING REQUEST (RECEIVER)
router.post('/', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { itemId, durationHours, startTime, isDelivery, notes } = req.body;

    if (!itemId || !durationHours || !startTime) {
      res.status(400).json({ error: 'Item ID, duration in hours, and start time are required' });
      return;
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId as string, status: 'APPROVED' },
      include: { owner: true }
    });

    if (!item) {
      res.status(404).json({ error: 'Equipment not found or not currently available' });
      return;
    }

    if (item.ownerId === req.user.id) {
      res.status(400).json({ error: 'You cannot rent your own equipment' });
      return;
    }

    const parsedStart = new Date(startTime);
    const hours = Math.max(Number(durationHours), item.minHours);
    const parsedEnd = new Date(parsedStart.getTime() + hours * 60 * 60 * 1000);

    // Prevent duplicate pending bookings by the same borrower for the same equipment
    const existingPending = await prisma.booking.findFirst({
      where: {
        itemId: item.id,
        receiverId: req.user.id,
        status: { in: ['PENDING', 'PENDING_APPROVAL', 'PAYMENT_PENDING', 'ACCEPTED'] }
      }
    });

    if (existingPending) {
      res.status(400).json({
        error: 'You already have an active or pending booking request for this equipment. Please check My Rentals.'
      });
      return;
    }

    // Prevent overlapping bookings
    const overlapping = await prisma.booking.findFirst({
      where: {
        itemId: item.id,
        status: { in: ['CONFIRMED', 'READY_FOR_PICKUP', 'ACTIVE'] },
        OR: [
          { startTime: { lte: parsedEnd }, expectedEndTime: { gte: parsedStart } }
        ]
      }
    });

    if (overlapping) {
      res.status(400).json({ error: 'This equipment is already booked during the requested time slot. Please choose another time.' });
      return;
    }

    const quote = PricingService.calculateRentalQuote(
      item.hourlyRate,
      hours,
      item.securityDeposit,
      Boolean(isDelivery),
      item.deliveryFee,
      item.minHours
    );

    const bookingNumber = `BC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        itemId: item.id,
        receiverId: req.user.id,
        lenderId: item.ownerId,
        status: 'PENDING',
        durationHours: quote.durationHours,
        hourlyRate: quote.hourlyRate,
        rentalAmount: quote.rentalAmount,
        receiverFee: quote.receiverFee,
        lenderFee: quote.lenderFee,
        securityDeposit: quote.securityDeposit,
        deliveryFee: quote.deliveryFee,
        totalPayableAmount: quote.totalPayableAmount,
        lenderEarnings: quote.lenderEarnings,
        platformRevenue: quote.platformRevenue,
        startTime: parsedStart,
        expectedEndTime: parsedEnd,
        notes
      },
      include: { item: true }
    });

    // Notify lender
    await prisma.notification.create({
      data: {
        userId: item.ownerId,
        title: 'New Booking Request 📦',
        message: `${req.user.name} requested to rent "${item.title}" for ${hours} hours (₹${quote.rentalAmount}).`,
        type: 'BOOKING',
        link: `/bookings/${booking.id}`
      }
    });

    res.status(201).json({
      message: 'Rental booking request submitted successfully',
      booking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking request' });
  }
});

// 4. LENDER ACCEPTS OR REJECTS BOOKING REQUEST
const handleRespondBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    const { action, reason } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { item: true, receiver: true }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.lenderId !== req.user.id) {
      res.status(403).json({ error: 'Only the equipment lender can respond to this request' });
      return;
    }

    if (!['PENDING', 'PENDING_APPROVAL'].includes(booking.status)) {
      res.status(400).json({ error: `Cannot respond to booking in ${booking.status} status` });
      return;
    }

    if (action === 'ACCEPT') {
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'PAYMENT_PENDING' },
        include: { item: true }
      });

      await prisma.notification.create({
        data: {
          userId: booking.receiverId,
          title: 'Booking Request Approved! 💳',
          message: `The lender approved your rental for "${booking.item.title}". Complete payment to lock your reservation.`,
          type: 'PAYMENT',
          link: `/bookings/${booking.id}`
        }
      });

      res.json({ message: 'Booking accepted. Receiver can now complete payment.', booking: updated });
    } else {
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'REJECTED',
          cancellationReason: reason || 'Lender unavailable at this time'
        },
        include: { item: true }
      });

      await prisma.notification.create({
        data: {
          userId: booking.receiverId,
          title: 'Booking Request Declined',
          message: `Your booking for "${booking.item.title}" was declined by the owner: ${reason || 'Unavailable.'}`,
          type: 'BOOKING',
          link: `/bookings/${booking.id}`
        }
      });

      res.json({ message: 'Booking rejected', booking: updated });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to respond to booking' });
  }
};

router.post('/:id/respond', authenticateUser, handleRespondBooking);
router.post('/:id/accept', authenticateUser, async (req: AuthRequest, res: Response) => {
  req.body = req.body || {};
  req.body.action = 'ACCEPT';
  return handleRespondBooking(req, res);
});
router.put('/:id/accept', authenticateUser, async (req: AuthRequest, res: Response) => {
  req.body = req.body || {};
  req.body.action = 'ACCEPT';
  return handleRespondBooking(req, res);
});
router.post('/:id/reject', authenticateUser, async (req: AuthRequest, res: Response) => {
  req.body = req.body || {};
  req.body.action = 'REJECT';
  return handleRespondBooking(req, res);
});
router.put('/:id/reject', authenticateUser, async (req: AuthRequest, res: Response) => {
  req.body = req.body || {};
  req.body.action = 'REJECT';
  return handleRespondBooking(req, res);
});

// 3.5. CANCEL BOOKING (By Borrower or Lender before handover)
router.post('/:id/cancel', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    const { reason } = req.body;
    const userId = req.user.id;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { item: true, lender: true, receiver: true }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.receiverId !== userId && booking.lenderId !== userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'You are not authorized to cancel this booking' });
      return;
    }

    // Cancellation is allowed before handover has completed (not during ACTIVE/COMPLETED)
    const cancellableStatuses = ['PENDING', 'PENDING_APPROVAL', 'APPROVED', 'ACCEPTED', 'PAYMENT_PENDING', 'CONFIRMED', 'READY_FOR_PICKUP'];
    if (!cancellableStatuses.includes(booking.status)) {
      res.status(400).json({
        error: `Cannot cancel booking with status "${booking.status}". Equipment is already in active possession or completed.`
      });
      return;
    }

    const cancelReason = reason || `Cancelled by ${booking.receiverId === userId ? 'borrower' : 'lender'}`;

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancellationReason: cancelReason
      },
      include: { item: true }
    });

    // Notify the other party
    const notifyTargetId = booking.receiverId === userId ? booking.lenderId : booking.receiverId;
    await prisma.notification.create({
      data: {
        userId: notifyTargetId,
        title: 'Booking Cancelled',
        message: `Booking for "${booking.item.title}" was cancelled: ${cancelReason}`,
        type: 'BOOKING',
        link: `/bookings/${booking.id}`
      }
    });

    res.json({
      message: 'Booking cancelled successfully.',
      booking: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// 5. INITIATE PAYMENT (RECEIVER -> RAZORPAY / GATEWAY)
const handleInitiatePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { item: true, lender: true }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.receiverId !== req.user.id) {
      res.status(403).json({ error: 'Only the borrower can pay for this booking' });
      return;
    }

    if (booking.status !== 'APPROVED' && booking.status !== 'PAYMENT_PENDING') {
      res.status(400).json({ error: `Payment cannot be processed for booking in ${booking.status} status` });
      return;
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      // Demo / Sandbox UPI Mode: Process verified instant demo UPI payment for prototype testing
      const upiTxnId = `upi_demo_${Date.now()}`;
      
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          payerId: req.user.id,
          amount: booking.totalPayableAmount,
          currency: 'INR',
          paymentMethod: 'UPI',
          transactionId: upiTxnId,
          status: 'SUCCESS',
          paymentType: 'RENTAL'
        }
      });

      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: 'SUCCESSFUL',
          status: 'READY_FOR_PICKUP'
        },
        include: { item: true }
      });

      await prisma.notification.create({
        data: {
          userId: booking.lenderId,
          title: 'Payment Received — Ready for Handover! 🤝',
          message: `Verified demo UPI payment of ₹${booking.totalPayableAmount} received for "${booking.item.title}". Meet the borrower for OTP handover.`,
          type: 'HANDOVER',
          link: `/bookings/${booking.id}`
        }
      });

      res.json({
        success: true,
        mode: 'DEMO_UPI_SANDBOX',
        transactionId: upiTxnId,
        message: 'Demo UPI payment verified successfully. Booking is now ready for pickup!',
        booking: updated
      });
      return;
    }

    // Authentic Gateway Integration
    const Razorpay = require('razorpay');
    const rzp = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret
    });

    const order = await rzp.orders.create({
      amount: Math.round(booking.totalPayableAmount * 100),
      currency: 'INR',
      receipt: `bkg_${booking.id.slice(0, 14)}`,
      notes: {
        bookingId: booking.id,
        itemId: booking.itemId,
        borrowerId: req.user.id
      }
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: 'PENDING',
        status: 'PAYMENT_PENDING'
      }
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: razorpayKeyId,
      bookingId: booking.id
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to initiate payment' });
  }
};

router.post('/:id/payment', authenticateUser, handleInitiatePayment);
router.post('/:id/payment/order', authenticateUser, handleInitiatePayment);

// 5.5 VERIFY PAYMENT SIGNATURE (SERVER-SIDE HMAC SHA-256)
router.post('/:id/payment/verify', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { item: true }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) {
      res.status(400).json({
        success: false,
        code: 'GATEWAY_NOT_CONFIGURED',
        error: 'Razorpay secret key is not configured'
      });
      return;
    }

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'FAILED' }
      });
      res.status(400).json({ success: false, error: 'Invalid payment signature verification' });
      return;
    }

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        payerId: req.user.id,
        amount: booking.totalPayableAmount,
        currency: 'INR',
        paymentMethod: 'RAZORPAY',
        transactionId: razorpay_payment_id,
        status: 'SUCCESS',
        paymentType: 'RENTAL'
      }
    });

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: 'SUCCESSFUL',
        status: 'READY_FOR_PICKUP'
      },
      include: { item: true }
    });

    await prisma.notification.create({
      data: {
        userId: booking.lenderId,
        title: 'Payment Received — Ready for Handover! 🤝',
        message: `Verified payment of ₹${booking.totalPayableAmount} received for "${booking.item.title}". Meet the borrower for OTP handover.`,
        type: 'HANDOVER',
        link: `/bookings/${booking.id}`
      }
    });

    res.json({
      success: true,
      message: 'Payment verified successfully. Booking is now ready for pickup!',
      booking: updated
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Payment verification failed' });
  }
});

// 5.6 PAYMENT FAILED HANDLER
router.post('/:id/payment/failed', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    const { razorpay_payment_id, error_code, error_description } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.receiverId !== req.user.id) {
      res.status(403).json({ error: 'Unauthorized to modify payment status' });
      return;
    }

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        payerId: req.user.id,
        amount: booking.totalPayableAmount,
        currency: 'INR',
        paymentMethod: 'RAZORPAY',
        transactionId: razorpay_payment_id ? `${razorpay_payment_id}_${Date.now()}` : `fail_${Date.now()}`,
        status: 'FAILED',
        paymentType: 'RENTAL'
      }
    });

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: 'FAILED'
      }
    });

    res.json({
      success: true,
      message: 'Payment failure recorded successfully',
      error: error_description || 'Payment could not be completed',
      booking: updated
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to record payment failure' });
  }
});

// 5.7 PAYMENT CANCELLED HANDLER
router.post('/:id/payment/cancel', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.receiverId !== req.user.id) {
      res.status(403).json({ error: 'Unauthorized to modify payment status' });
      return;
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: 'CANCELLED'
      }
    });

    res.json({
      success: true,
      message: 'Payment process cancelled by user',
      booking: updated
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to cancel payment' });
  }
});

// 5.8 RAZORPAY WEBHOOK ENDPOINT (SERVER-TO-SERVER WITH HMAC SHA-256 SIGNATURE VERIFICATION)
router.post('/payment/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!webhookSecret) {
      res.status(400).json({
        success: false,
        error: 'Razorpay webhook secret is not configured'
      });
      return;
    }

    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      res.status(400).json({
        success: false,
        error: 'Missing x-razorpay-signature header'
      });
      return;
    }

    const crypto = require('crypto');
    // Compute HMAC SHA-256 of the raw/parsed JSON body
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyStr)
      .digest('hex');

    if (expectedSignature !== signature) {
      res.status(400).json({
        success: false,
        error: 'Invalid webhook signature'
      });
      return;
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity;
      const orderEntity = payload?.order?.entity;
      const notes = paymentEntity?.notes || orderEntity?.notes || {};
      const bookingId = notes.bookingId;

      if (bookingId) {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: { item: true }
        });

        if (booking) {
          // Idempotency: Protect against duplicate callback executions
          if (booking.paymentStatus === 'SUCCESSFUL') {
            res.json({ received: true, note: 'Duplicate webhook: payment already recorded as successful' });
            return;
          }

          const txnId = paymentEntity?.id || `rzp_${Date.now()}`;
          const existingPayment = await prisma.payment.findFirst({
            where: { transactionId: txnId }
          });

          if (!existingPayment) {
            await prisma.payment.create({
              data: {
                bookingId: booking.id,
                payerId: booking.receiverId,
                amount: booking.totalPayableAmount,
                currency: 'INR',
                paymentMethod: 'RAZORPAY',
                transactionId: txnId,
                status: 'SUCCESS',
                paymentType: 'RENTAL'
              }
            });
          }

          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              paymentStatus: 'SUCCESSFUL',
              status: 'READY_FOR_PICKUP'
            }
          });

          await prisma.notification.create({
            data: {
              userId: booking.lenderId,
              title: 'Payment Confirmed via Webhook 💳',
              message: `Payment of ₹${booking.totalPayableAmount} verified for "${booking.item.title}". Item is ready for handover!`,
              type: 'HANDOVER',
              link: `/bookings/${booking.id}`
            }
          });
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity;
      const notes = paymentEntity?.notes || {};
      const bookingId = notes.bookingId;

      if (bookingId) {
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (booking && booking.paymentStatus !== 'SUCCESSFUL') {
          await prisma.booking.update({
            where: { id: booking.id },
            data: { paymentStatus: 'FAILED' }
          });
        }
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Webhook processing failed' });
  }
});

// 6. REQUEST TWO-SIDED HANDOVER OTP (RECEIVER)
router.post('/:id/handover/request-otp', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { receiver: true, lender: true, item: true }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.receiverId !== req.user.id && booking.lenderId !== req.user.id) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    if (booking.status !== 'READY_FOR_PICKUP') {
      res.status(400).json({ error: 'Handover OTP can only be generated when booking is Ready for Pickup' });
      return;
    }

    const otp = OtpService.generateOtp();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        handoverOtp: otp,
        handoverOtpExpiresAt: expiresAt
      },
      include: { item: true }
    });

    OtpService.simulateSmsDispatch(booking.receiver.phone, otp, `Handover of ${booking.item.title}`);

    res.json({
      message: 'Handover OTP generated successfully',
      handoverOtp: otp,
      expiresAt,
      isDevelopmentDemo: true,
      instructions: 'The receiver shares this OTP with the lender at the time of physical handover.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate handover OTP' });
  }
});

// 7. VERIFY TWO-SIDED HANDOVER OTP (LENDER VERIFIES RECEIVER'S OTP)
router.post('/:id/handover/verify', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    const { otp, conditionNotes, imageUrls } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { item: { include: { images: true } }, receiver: true }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.lenderId !== req.user.id && booking.receiverId !== req.user.id) {
      res.status(403).json({ error: 'Unauthorized to verify handover' });
      return;
    }

    if (booking.status !== 'READY_FOR_PICKUP') {
      res.status(400).json({ error: 'Booking is not ready for handover' });
      return;
    }

    if (!booking.handoverOtp || booking.handoverOtp !== otp) {
      res.status(400).json({ error: 'Invalid handover OTP. Please ask receiver for the current OTP.' });
      return;
    }

    const now = new Date();
    const calculatedEnd = new Date(now.getTime() + booking.durationHours * 60 * 60 * 1000);

    await prisma.inspectionRecord.create({
      data: {
        bookingId: booking.id,
        stage: 'HANDOVER',
        conditionNotes: conditionNotes || 'Equipment handed over in verified working condition.',
        imageUrls: JSON.stringify(imageUrls || [booking.item.images?.[0]?.url || '']),
        hasDamage: false
      }
    });

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'ACTIVE',
        isHandoverVerified: true,
        handoverVerifiedAt: now,
        actualStartTime: now,
        expectedEndTime: calculatedEnd
      },
      include: { item: true }
    });

    await prisma.notification.create({
      data: {
        userId: booking.receiverId,
        title: 'Rental Active! ⏱️',
        message: `Handover confirmed for "${booking.item.title}". Rental timer is now running.`,
        type: 'BOOKING',
        link: `/bookings/${booking.id}`
      }
    });

    res.json({
      message: 'Handover verified successfully! Equipment rental is now ACTIVE.',
      booking: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify handover OTP' });
  }
});

// 8. REQUEST RENTAL EXTENSION (RECEIVER)
router.post('/:id/extend', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    const { additionalHours } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { item: true }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.receiverId !== req.user.id) {
      res.status(403).json({ error: 'Only the borrower can request an extension' });
      return;
    }

    if (booking.status !== 'ACTIVE') {
      res.status(400).json({ error: 'Extensions can only be requested for active rentals' });
      return;
    }

    const hours = Number(additionalHours);
    if (!hours || hours <= 0) {
      res.status(400).json({ error: 'Valid extension duration is required' });
      return;
    }

    const additionalAmount = Math.round(hours * booking.hourlyRate);

    const extension = await prisma.extensionRequest.create({
      data: {
        bookingId: booking.id,
        additionalHours: hours,
        additionalAmount,
        status: 'PENDING'
      }
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'EXTENSION_REQUESTED' }
    });

    await prisma.notification.create({
      data: {
        userId: booking.lenderId,
        title: 'Rental Extension Requested ⏳',
        message: `Borrower requested +${hours} hours extension for "${booking.item.title}" (+₹${additionalAmount}).`,
        type: 'BOOKING',
        link: `/bookings/${booking.id}`
      }
    });

    res.json({
      message: 'Extension requested. Awaiting lender confirmation.',
      extension
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request extension' });
  }
});

// 9. LENDER RESPONDS TO EXTENSION REQUEST
router.post('/:id/extend/respond', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    const { action, extensionId } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { item: true }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.lenderId !== req.user.id) {
      res.status(403).json({ error: 'Only the lender can approve an extension' });
      return;
    }

    const extension = await prisma.extensionRequest.findUnique({
      where: { id: extensionId as string }
    });

    if (!extension || extension.status !== 'PENDING') {
      res.status(400).json({ error: 'Invalid or already resolved extension request' });
      return;
    }

    if (action === 'APPROVE') {
      const newExpectedEnd = new Date(booking.expectedEndTime.getTime() + extension.additionalHours * 60 * 60 * 1000);
      const newTotalPayable = booking.totalPayableAmount + extension.additionalAmount;
      const newRentalAmount = booking.rentalAmount + extension.additionalAmount;
      const newLenderEarnings = booking.lenderEarnings + extension.additionalAmount;

      await prisma.extensionRequest.update({
        where: { id: extension.id },
        data: { status: 'APPROVED', respondedAt: new Date() }
      });

      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'ACTIVE',
          expectedEndTime: newExpectedEnd,
          durationHours: booking.durationHours + extension.additionalHours,
          rentalAmount: newRentalAmount,
          totalPayableAmount: newTotalPayable,
          lenderEarnings: newLenderEarnings
        },
        include: { item: true }
      });

      res.json({ message: 'Extension approved! Return time updated.', booking: updated });
    } else {
      await prisma.extensionRequest.update({
        where: { id: extension.id },
        data: { status: 'REJECTED', respondedAt: new Date() }
      });

      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'ACTIVE' },
        include: { item: true }
      });

      res.json({ message: 'Extension declined. Original return schedule remains.', booking: updated });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to respond to extension request' });
  }
});

// 10. REQUEST RETURN OTP (RECEIVER WANTS TO RETURN)
router.post('/:id/return/request-otp', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { receiver: true, item: true }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.receiverId !== req.user.id && booking.lenderId !== req.user.id) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const otp = OtpService.generateOtp();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'RETURN_REQUESTED',
        returnOtp: otp,
        returnOtpExpiresAt: expiresAt
      },
      include: { item: true }
    });

    OtpService.simulateSmsDispatch(booking.receiver.phone, otp, `Return of ${booking.item.title}`);

    res.json({
      message: 'Return OTP generated successfully',
      returnOtp: otp,
      expiresAt,
      isDevelopmentDemo: true,
      instructions: 'Share this Return OTP with the owner upon handing back the equipment.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request return OTP' });
  }
});

// 11. VERIFY RETURN OTP -> TRIGGERS 15-MINUTE INSPECTION PERIOD!
router.post('/:id/return/verify', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    const { otp } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { item: true, receiver: true, lender: true }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.lenderId !== req.user.id && booking.receiverId !== req.user.id) {
      res.status(403).json({ error: 'Unauthorized to verify return' });
      return;
    }

    if (!booking.returnOtp || booking.returnOtp !== otp) {
      res.status(400).json({ error: 'Invalid return OTP' });
      return;
    }

    const now = new Date();
    const inspectionMinutes = CONFIG.DEFAULT_INSPECTION_MINUTES;
    const inspectionEnd = new Date(now.getTime() + inspectionMinutes * 60 * 1000);

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'INSPECTION_PENDING',
        isReturnVerified: true,
        returnVerifiedAt: now,
        actualEndTime: now,
        inspectionDurationMinutes: inspectionMinutes,
        inspectionEndTime: inspectionEnd,
        inspectionStatus: 'PENDING'
      },
      include: { item: true }
    });

    await prisma.notification.create({
      data: {
        userId: booking.lenderId,
        title: 'Inspection Period Started (15 Minutes) 🔍',
        message: `Return verified for "${booking.item.title}". You have 15 minutes to inspect equipment condition and confirm or file damage.`,
        type: 'BOOKING',
        link: `/bookings/${booking.id}`
      }
    });

    res.json({
      message: `Return verified! ${inspectionMinutes}-minute inspection window is now active.`,
      inspectionDurationMinutes: inspectionMinutes,
      inspectionEndTime: inspectionEnd,
      booking: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify return' });
  }
});

// 12. COMPLETE INSPECTION (LENDER CONFIRMS CLEAN RETURN OR EXPIRED)
const handleCompleteInspection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    const { conditionNotes, imageUrls } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { item: true, receiver: true, lender: true }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.lenderId !== req.user.id && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only the lender or admin can complete the inspection' });
      return;
    }

    if (booking.status !== 'INSPECTION_PENDING') {
      res.status(400).json({ error: 'Booking is not in inspection pending status' });
      return;
    }

    await prisma.inspectionRecord.create({
      data: {
        bookingId: booking.id,
        stage: 'RETURN',
        conditionNotes: conditionNotes || 'Equipment verified in pristine/normal working condition. No damages detected.',
        imageUrls: JSON.stringify(imageUrls || []),
        hasDamage: false
      }
    });

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'COMPLETED',
        inspectionStatus: 'CLEAN'
      },
      include: { item: true }
    });

    await prisma.user.update({
      where: { id: booking.receiverId },
      data: {
        completedRentalsCount: { increment: 1 },
        ecoKgCo2Saved: { increment: 3.5 },
        rewardPoints: { increment: 40 }
      }
    });

    await prisma.user.update({
      where: { id: booking.lenderId },
      data: {
        completedLendsCount: { increment: 1 },
        ecoKgCo2Saved: { increment: 3.5 },
        rewardPoints: { increment: 50 }
      }
    });

    await TrustService.calculateUserTrustScore(booking.receiverId);
    await TrustService.calculateUserTrustScore(booking.lenderId);

    await prisma.notification.create({
      data: {
        userId: booking.receiverId,
        title: 'Rental Completed Successfully! 🌟',
        message: `Inspection confirmed clean for "${booking.item.title}". Thank you for using BorrowCircle. Please leave a review!`,
        type: 'PAYMENT',
        link: `/bookings/${booking.id}`
      }
    });

    res.json({
      message: 'Inspection completed cleanly! Payout transferred to lender.',
      booking: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete inspection' });
  }
};

router.post('/:id/inspection/complete', authenticateUser, handleCompleteInspection);
router.post('/:id/inspect/clean', authenticateUser, handleCompleteInspection);

// 13. SUBMIT REVIEW & RATING
router.post('/:id/review', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    const { rating, comment } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { item: true }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.status !== 'COMPLETED') {
      res.status(400).json({ error: 'Reviews can only be submitted after rental completion' });
      return;
    }

    const isReceiver = booking.receiverId === req.user.id;
    const isLender = booking.lenderId === req.user.id;

    if (!isReceiver && !isLender) {
      res.status(403).json({ error: 'Unauthorized to review this booking' });
      return;
    }

    const targetUserId = isReceiver ? booking.lenderId : booking.receiverId;
    const userRole = isReceiver ? 'RECEIVER' : 'LENDER';

    const existingReview = await prisma.review.findFirst({
      where: { bookingId: booking.id, reviewerId: req.user.id }
    });

    let review;
    if (existingReview) {
      review = await prisma.review.update({
        where: { id: existingReview.id },
        data: {
          rating: Math.max(1, Math.min(5, Number(rating))),
          comment: comment || existingReview.comment
        }
      });
    } else {
      review = await prisma.review.create({
        data: {
          bookingId: booking.id,
          itemId: booking.itemId,
          reviewerId: req.user.id,
          revieweeId: targetUserId,
          role: userRole,
          rating: Math.max(1, Math.min(5, Number(rating))),
          comment: comment || 'Smooth and hassle-free rental experience on BorrowCircle!'
        }
      });
    }

    const allTargetReviews = await prisma.review.findMany({ where: { revieweeId: targetUserId } });
    const avgRating = allTargetReviews.reduce((sum, r) => sum + r.rating, 0) / allTargetReviews.length;

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        rating: Number(avgRating.toFixed(1)),
        ratingCount: allTargetReviews.length
      }
    });

    await TrustService.calculateUserTrustScore(targetUserId);

    res.json({ message: 'Review submitted successfully', review });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

export default router;
