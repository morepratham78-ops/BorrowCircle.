import { prisma } from '../prisma';

export class TrustService {
  /**
   * Calculates transparent algorithmic trust score (0 to 100)
   */
  public static async calculateUserTrustScore(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        damageClaimsAgainst: { where: { status: 'RESOLVED' } },
        reviewsReceived: true
      }
    });

    if (!user) return 50;

    let score = 40; // Base baseline

    // Contact verifications
    if (user.isPhoneVerified) score += 15;
    if (user.isEmailVerified) score += 5;
    if (user.aadharVerified || user.isIdentityVerified) score += 20;

    // Platform track record
    const rentalBonus = Math.min(10, (user.completedRentalsCount + user.completedLendsCount) * 2);
    score += rentalBonus;

    // Review ratings
    if (user.ratingCount > 0) {
      if (user.rating >= 4.8) score += 10;
      else if (user.rating >= 4.0) score += 5;
    } else {
      score += 5; // Initial newcomer goodwill
    }

    // Deductions for valid damage claims
    const claimPenalties = user.damageClaimsAgainst.length * 15;
    score -= claimPenalties;

    // Clamp between 10 and 100
    const finalScore = Math.max(10, Math.min(100, Math.round(score)));

    // Update in database
    await prisma.user.update({
      where: { id: userId },
      data: { trustScore: finalScore }
    });

    return finalScore;
  }
}
