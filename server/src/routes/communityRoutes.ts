import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateUser, AuthRequest } from '../middleware/auth';

const router = Router();

// 1. GET COMMUNITY GROUPS
router.get('/groups', async (req: Request, res: Response): Promise<void> => {
  try {
    const city = (req.query.city as string) || 'Bengaluru';
    const groups = await prisma.communityGroup.findMany({
      where: { city },
      orderBy: { memberCount: 'desc' }
    });
    res.json({ groups });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch community groups' });
  }
});

// 2. GET COMMUNITY WISH WALL
router.get('/wish-wall', async (_req: Request, res: Response): Promise<void> => {
  try {
    const posts = await prisma.wishWallPost.findMany({
      include: {
        user: { select: { id: true, name: true, city: true, area: true, avatar: true, trustScore: true } },
        category: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wish wall posts' });
  }
});

// 3. POST TO WISH WALL
router.post('/wish-wall', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { itemTitle, categoryId, maxBudgetPerHour, neededHours, description, city, area } = req.body;

    if (!itemTitle || !maxBudgetPerHour || !neededHours) {
      res.status(400).json({ error: 'Item title, budget, and needed hours are required' });
      return;
    }

    // Resolve category by ID or slug, or fallback to first available category
    let resolvedCategory = await prisma.category.findFirst({
      where: {
        OR: [
          { id: categoryId || '' },
          { slug: categoryId || '' }
        ]
      }
    });

    if (!resolvedCategory) {
      resolvedCategory = await prisma.category.findFirst();
    }

    if (!resolvedCategory) {
      res.status(400).json({ error: 'Category not found' });
      return;
    }

    const post = await prisma.wishWallPost.create({
      data: {
        userId: req.user.id,
        itemTitle,
        categoryId: resolvedCategory.id,
        maxBudgetPerHour: Number(maxBudgetPerHour),
        neededHours: Number(neededHours),
        description: description || 'Looking to borrow from neighbors.',
        city: city || req.user.city,
        area: area || req.user.area
      },
      include: { user: true, category: true }
    });

    res.status(201).json({ message: 'Request posted to Community Wish Wall', post });
  } catch (error) {
    res.status(500).json({ error: 'Failed to post on wish wall' });
  }
});

// 4. GET ECO IMPACT STATS
router.get('/eco-impact', async (_req: Request, res: Response): Promise<void> => {
  try {
    const completedBookings = await prisma.booking.count({ where: { status: 'COMPLETED' } });
    const totalUsers = await prisma.user.count();
    
    // Each equipment rental saves roughly 4.2 kg CO2 compared to manufacturing a new resource
    const totalKgCo2Saved = Math.round(completedBookings * 4.2 + 185);
    const treesEquivalent = Math.round(totalKgCo2Saved / 21); // 1 mature tree absorbs ~21kg CO2/year
    const rawMaterialsSavedKg = Math.round(completedBookings * 7.5 + 320);

    res.json({
      totalKgCo2Saved,
      treesEquivalent,
      rawMaterialsSavedKg,
      completedRentals: completedBookings,
      totalActiveSharers: totalUsers
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate eco stats' });
  }
});

// 5. BORROW VS BUY CALCULATOR
router.post('/calculator/borrow-vs-buy', async (req: Request, res: Response): Promise<void> => {
  try {
    const { purchasePrice, hourlyRate, estimatedHoursNeeded } = req.body;

    const buyCost = Number(purchasePrice) || 12000;
    const rate = Number(hourlyRate) || 80;
    const hours = Number(estimatedHoursNeeded) || 4;

    const borrowCost = Math.round(rate * hours) + 15; // rental + ₹15 fee
    const netSavings = Math.max(0, buyCost - borrowCost);
    const savingsPercent = Math.round((netSavings / buyCost) * 100);
    const breakEvenHours = Math.round(buyCost / rate);

    res.json({
      purchasePrice: buyCost,
      hourlyRate: rate,
      hoursNeeded: hours,
      totalRentalCost: borrowCost,
      netMoneySaved: netSavings,
      savingsPercentage: savingsPercent,
      breakEvenHours,
      verdict: netSavings > 0 ? `Borrowing saves you ₹${netSavings.toLocaleString('en-IN')} (${savingsPercent}%)` : 'Buying might be better if you need this permanently.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate comparison' });
  }
});

// 6. COMMUNITY LEADERBOARD
router.get('/leaderboard', async (_req: Request, res: Response): Promise<void> => {
  try {
    const topLenders = await prisma.user.findMany({
      take: 10,
      orderBy: { completedLendsCount: 'desc' },
      select: {
        id: true,
        name: true,
        city: true,
        area: true,
        avatar: true,
        trustScore: true,
        rating: true,
        completedLendsCount: true,
        ecoKgCo2Saved: true,
        rewardPoints: true
      }
    });

    res.json({ leaderboard: topLenders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// 7. NEIGHBORHOOD DEMAND HEATMAP
router.get('/demand-heatmap', async (req: Request, res: Response): Promise<void> => {
  try {
    const city = (req.query.city as string) || 'Bengaluru';

    // Aggregated realistic demand hotspots in selected Indian cities
    const heatmapData: Record<string, any[]> = {
      Bengaluru: [
        { area: 'Indiranagar', demandScore: 94, activeListings: 42, topCategory: 'Electronics & Audio' },
        { area: 'Koramangala', demandScore: 88, activeListings: 37, topCategory: 'Cameras & Photography' },
        { area: 'HSR Layout', demandScore: 82, activeListings: 29, topCategory: 'Tools & Hardware' },
        { area: 'Whitefield', demandScore: 79, activeListings: 31, topCategory: 'Gardening & Home' },
        { area: 'Jayanagar', demandScore: 71, activeListings: 24, topCategory: 'Event Equipment' }
      ],
      Mumbai: [
        { area: 'Bandra West', demandScore: 96, activeListings: 48, topCategory: 'Cameras & Media' },
        { area: 'Andheri West', demandScore: 91, activeListings: 44, topCategory: 'Event & Sound' },
        { area: 'Powai', demandScore: 84, activeListings: 35, topCategory: 'Electronics' },
        { area: 'Juhu', demandScore: 78, activeListings: 26, topCategory: 'Travel Equipment' }
      ],
      Delhi: [
        { area: 'Hauz Khas', demandScore: 93, activeListings: 40, topCategory: 'Study & Tech' },
        { area: 'Connaught Place', demandScore: 89, activeListings: 38, topCategory: 'Audio Visual' },
        { area: 'South Extension', demandScore: 81, activeListings: 29, topCategory: 'Home & Kitchen' }
      ]
    };

    res.json({
      city,
      hotspots: heatmapData[city] || heatmapData['Bengaluru']
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch heatmap' });
  }
});

export default router;
