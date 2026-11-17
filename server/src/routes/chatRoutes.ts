import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateUser, AuthRequest } from '../middleware/auth';

const router = Router();

// 1. GET ALL RECENT CONVERSATIONS
router.get('/conversations', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }]
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true, trustScore: true, city: true, area: true } },
        receiver: { select: { id: true, name: true, avatar: true, trustScore: true, city: true, area: true } },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            startTime: true,
            expectedEndTime: true,
            durationHours: true,
            hourlyRate: true,
            rentalAmount: true,
            securityDeposit: true,
            item: {
              select: {
                id: true,
                title: true,
                hourlyRate: true,
                dailyRate: true,
                area: true,
                city: true,
                images: { select: { url: true, isPrimary: true }, take: 1 }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group by contact user
    const conversationMap = new Map<string, any>();

    for (const msg of messages) {
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
      if (!conversationMap.has(otherUser.id)) {
        conversationMap.set(otherUser.id, {
          contact: otherUser,
          lastMessage: msg.content,
          lastTimestamp: msg.createdAt,
          booking: msg.booking,
          unread: msg.receiverId === userId && !msg.isRead
        });
      }
    }

    // Ensure conversations with active bookings have full rental context attached
    for (const [otherId, conv] of conversationMap.entries()) {
      if (!conv.booking) {
        const relatedBooking = await prisma.booking.findFirst({
          where: {
            OR: [
              { receiverId: userId, lenderId: otherId },
              { lenderId: userId, receiverId: otherId }
            ]
          },
          orderBy: { createdAt: 'desc' },
          include: {
            item: {
              include: {
                images: true
              }
            }
          }
        });
        if (relatedBooking) {
          conv.booking = relatedBooking;
        }
      }
    }

    const totalUnread = await prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false
      }
    });

    res.json({
      conversations: Array.from(conversationMap.values()),
      unreadTotalCount: totalUnread
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// 1.5. GET TOTAL UNREAD MESSAGES COUNT FOR AUTHENTICATED USER
router.get('/unread-count', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const unreadCount = await prisma.message.count({
      where: {
        receiverId: req.user.id,
        isRead: false
      }
    });
    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to count unread messages' });
  }
});

// 2. GET MESSAGES WITH A SPECIFIC USER
router.get('/messages/:contactId', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const contactId = req.params.contactId as string;
    const userId = req.user.id;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: contactId },
          { senderId: contactId, receiverId: userId }
        ]
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Mark as read
    await prisma.message.updateMany({
      where: { senderId: contactId, receiverId: userId, isRead: false },
      data: { isRead: true }
    });

    // Fetch related active/recent booking between these two users
    const relatedBooking = await prisma.booking.findFirst({
      where: {
        OR: [
          { receiverId: userId, lenderId: contactId },
          { lenderId: userId, receiverId: contactId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        item: {
          include: {
            images: true
          }
        }
      }
    });

    res.json({ messages, booking: relatedBooking });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// 3. SEND A MESSAGE
router.post('/messages', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { receiverId, bookingId, content, mediaUrl } = req.body;

    if (!receiverId || !content) {
      res.status(400).json({ error: 'Receiver ID and content are required' });
      return;
    }

    let finalBookingId = bookingId || null;
    if (!finalBookingId) {
      const activeBooking = await prisma.booking.findFirst({
        where: {
          OR: [
            { receiverId: req.user.id, lenderId: receiverId },
            { lenderId: req.user.id, receiverId: receiverId }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
      if (activeBooking) {
        finalBookingId = activeBooking.id;
      }
    }

    const message = await prisma.message.create({
      data: {
        senderId: req.user.id,
        receiverId,
        bookingId: finalBookingId,
        content,
        mediaUrl: mediaUrl || null
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } }
      }
    });

    await prisma.notification.create({
      data: {
        userId: receiverId,
        title: `Message from ${req.user.name} 💬`,
        message: content.length > 50 ? `${content.substring(0, 50)}...` : content,
        type: 'CHAT',
        link: `/messages`
      }
    });

    res.status(201).json({ message, chatMessage: message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
