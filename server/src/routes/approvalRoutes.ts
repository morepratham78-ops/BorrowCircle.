import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateUser, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// 1. GET ALL PENDING LISTINGS FOR APPROVAL
router.get('/pending', authenticateUser, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pendingItems = await prisma.item.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: {
        images: true,
        category: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            trustScore: true,
            isIdentityVerified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ pendingItems });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending listings' });
  }
});

// 2. APPROVE LISTING
router.post('/:id/approve', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const itemId = req.params.id as string;
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const updated = await prisma.item.update({
      where: { id: item.id },
      data: { status: 'APPROVED' }
    });

    await prisma.notification.create({
      data: {
        userId: item.ownerId,
        title: 'Listing Approved! 🎉',
        message: `Your equipment "${item.title}" has been verified and is now live on BorrowCircle for nearby neighbors.`,
        type: 'SYSTEM',
        link: `/items/${item.id}`
      }
    });

    res.json({ message: 'Listing approved successfully', item: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve listing' });
  }
});

// 3. REJECT LISTING
router.post('/:id/reject', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const itemId = req.params.id as string;
    const { reason } = req.body;
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const updated = await prisma.item.update({
      where: { id: item.id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || 'Listing does not comply with community equipment standards.'
      }
    });

    await prisma.notification.create({
      data: {
        userId: item.ownerId,
        title: 'Listing Needs Revision',
        message: `Your listing "${item.title}" was rejected: ${reason || 'Please provide clear photos and accurate description.'}`,
        type: 'SYSTEM',
        link: `/my-listings`
      }
    });

    res.json({ message: 'Listing rejected', item: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject listing' });
  }
});

export default router;
