import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateUser, requireAdmin, AuthRequest } from '../middleware/auth';
import { TrustService } from '../services/trustService';

const router = Router();

// 1. FILE A DAMAGE / LOSS CLAIM (LENDER)
router.post('/', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bookingId, description, estimatedRepairCost, evidenceImages } = req.body;

    if (!bookingId || !description || !estimatedRepairCost) {
      res.status(400).json({ error: 'Booking ID, description, and estimated repair cost are required' });
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId as string },
      include: { item: true }
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.lenderId !== req.user.id) {
      res.status(403).json({ error: 'Only the item owner can file a damage claim' });
      return;
    }

    const claim = await prisma.damageClaim.create({
      data: {
        bookingId: booking.id,
        itemId: booking.itemId,
        claimantId: req.user.id,
        respondentId: booking.receiverId,
        description,
        estimatedRepairCost: Number(estimatedRepairCost),
        replacementValue: booking.item.replacementValue,
        evidenceImages: JSON.stringify(evidenceImages || []),
        status: 'FILED'
      }
    });

    // Update booking status to DISPUTED
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'DISPUTED',
        inspectionStatus: 'DAMAGE_REPORTED'
      }
    });

    // Notify receiver
    await prisma.notification.create({
      data: {
        userId: booking.receiverId,
        title: 'Damage Claim Filed ⚠️',
        message: `Owner reported damage on "${booking.item.title}". You may review the evidence and submit your response.`,
        type: 'SYSTEM',
        link: `/claims/${claim.id}`
      }
    });

    res.status(201).json({
      message: 'Damage claim filed and submitted for mediation. Deposit held in escrow.',
      claim
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to file damage claim' });
  }
});

// 2. RECEIVER SUBMITS EXPLANATION
router.post('/:id/respond', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const claimId = req.params.id as string;
    const { explanation } = req.body;
    const claim = await prisma.damageClaim.findUnique({ where: { id: claimId } });

    if (!claim) {
      res.status(404).json({ error: 'Claim not found' });
      return;
    }

    if (claim.respondentId !== req.user.id) {
      res.status(403).json({ error: 'Only the borrower can respond to this claim' });
      return;
    }

    const updated = await prisma.damageClaim.update({
      where: { id: claim.id },
      data: {
        respondentExplanation: explanation,
        status: 'UNDER_REVIEW'
      }
    });

    res.json({ message: 'Explanation submitted. Admin mediation will review.', claim: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

// 3. ADMIN RESOLVES DISPUTE
router.post('/:id/resolve', authenticateUser, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const claimId = req.params.id as string;
    const { decision, resolutionAmount, status } = req.body; // status: 'RESOLVED' or 'REJECTED'
    const claim = await prisma.damageClaim.findUnique({
      where: { id: claimId },
      include: { booking: true }
    });

    if (!claim) {
      res.status(404).json({ error: 'Claim not found' });
      return;
    }

    const updated = await prisma.damageClaim.update({
      where: { id: claim.id },
      data: {
        adminDecision: decision || 'Resolved fairly after evidence and inspection review.',
        resolutionAmount: resolutionAmount ? Number(resolutionAmount) : 0,
        status: status || 'RESOLVED'
      }
    });

    // Update booking to completed after dispute resolved
    await prisma.booking.update({
      where: { id: claim.bookingId },
      data: { status: 'COMPLETED' }
    });

    // Recalculate trust scores
    await TrustService.calculateUserTrustScore(claim.respondentId);
    await TrustService.calculateUserTrustScore(claim.claimantId);

    res.json({ message: 'Dispute resolved successfully by Admin.', claim: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

export default router;
