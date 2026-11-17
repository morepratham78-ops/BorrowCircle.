import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { PricingService } from '../services/pricingService';
import { SearchService } from '../services/searchService';

const router = Router();

// 1. GET ALL CATEGORIES
router.get('/categories', async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { items: { where: { status: 'APPROVED' } } }
        }
      }
    });

    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * Normalizes title by removing test/demo suffixes like #1234, extra whitespace,
 * punctuation, and converting to lowercase.
 */
function normalizeListingTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/#[0-9a-zA-Z_-]+/g, '') // remove trailing hashtags/IDs like #2545, #6120
    .replace(/[^\w\s]/g, '')        // remove special chars
    .replace(/\s+/g, ' ')           // normalize multiple spaces
    .trim();
}

/**
 * Generates a fingerprint to detect accidental duplicate records from the SAME owner.
 * If the same owner has multiple listings with the same normalized title and category,
 * only the canonical listing will be shown.
 * Legitimate listings from different owners or different equipment from the same owner
 * have distinct fingerprints.
 */
function getListingFingerprint(item: any): string {
  const normTitle = normalizeListingTitle(item.title);
  return `${item.ownerId}:::${normTitle}:::${item.categoryId}`;
}

/**
 * Deduplicates an array of items ensuring:
 * 1) No duplicate item ID across sections or within a section.
 * 2) No duplicate listing fingerprint (preventing multiple copies from the same lender).
 * 3) Genuinely distinct items from the same or different lenders are preserved.
 */
function deduplicateItems(
  candidates: any[],
  seenIds: Set<string>,
  seenFingerprints: Set<string>,
  limit: number
): any[] {
  const result: any[] = [];
  for (const item of candidates) {
    if (!item || !item.id) continue;
    if (seenIds.has(item.id)) continue;

    const fp = getListingFingerprint(item);
    if (seenFingerprints.has(fp)) continue;

    seenIds.add(item.id);
    seenFingerprints.add(fp);
    result.push(item);

    if (result.length >= limit) break;
  }
  return result;
}

// 2. GET DASHBOARD SECTIONS (CAROUSELS WITH STRICT DEDUPLICATION)
router.get('/sections', async (req: Request, res: Response): Promise<void> => {
  try {
    const city = (req.query.city as string) || 'Bengaluru';
    const baseWhere: any = {
      status: 'APPROVED',
      owner: { isSuspended: false }
    };
    const seenIds = new Set<string>();
    const seenFingerprints = new Set<string>();

    const itemIncludes = {
      images: true,
      category: true,
      owner: { select: { id: true, name: true, city: true, area: true, trustScore: true, rating: true, avatar: true } }
    };

    // 1. Available Near You (matching city first)
    const nearYouCandidates = await prisma.item.findMany({
      where: {
        ...baseWhere,
        city
      },
      take: 24,
      include: itemIncludes,
      orderBy: { createdAt: 'desc' }
    });
    const nearYou = deduplicateItems(nearYouCandidates, seenIds, seenFingerprints, 6);

    // If fewer than 4 items in this city, backfill from other approved equipment without duplicating
    if (nearYou.length < 4) {
      const backfillCandidates = await prisma.item.findMany({
        where: {
          ...baseWhere,
          id: { notIn: Array.from(seenIds) }
        },
        take: 24,
        include: itemIncludes,
        orderBy: { createdAt: 'desc' }
      });
      const additional = deduplicateItems(backfillCandidates, seenIds, seenFingerprints, 6 - nearYou.length);
      nearYou.push(...additional);
    }

    // 2. Most Borrowed Equipment (ranked by viewsCount, strictly excluding seenIds and duplicate fingerprints)
    const popularCandidates = await prisma.item.findMany({
      where: {
        ...baseWhere,
        id: { notIn: Array.from(seenIds) }
      },
      take: 24,
      include: itemIncludes,
      orderBy: { viewsCount: 'desc' }
    });
    const popular = deduplicateItems(popularCandidates, seenIds, seenFingerprints, 6);

    // 3. Budget-Friendly Rentals (hourlyRate <= 75, strictly excluding seenIds and duplicate fingerprints)
    const budgetCandidates = await prisma.item.findMany({
      where: {
        ...baseWhere,
        hourlyRate: { lte: 75 },
        id: { notIn: Array.from(seenIds) }
      },
      take: 24,
      include: itemIncludes,
      orderBy: { hourlyRate: 'asc' }
    });
    const budgetFriendly = deduplicateItems(budgetCandidates, seenIds, seenFingerprints, 6);

    // 4. Top-Rated Equipment (strictly excluding seenIds and duplicate fingerprints)
    const topRatedCandidates = await prisma.item.findMany({
      where: {
        ...baseWhere,
        id: { notIn: Array.from(seenIds) }
      },
      take: 24,
      include: itemIncludes,
      orderBy: { createdAt: 'asc' }
    });
    const topRated = deduplicateItems(topRatedCandidates, seenIds, seenFingerprints, 6);

    // 5. Fresh Recommendations (recently added, strictly excluding all seenIds and duplicate fingerprints)
    const freshCandidates = await prisma.item.findMany({
      where: {
        ...baseWhere,
        id: { notIn: Array.from(seenIds) }
      },
      take: 30,
      include: itemIncludes,
      orderBy: { createdAt: 'desc' }
    });
    const freshRecommendations = deduplicateItems(freshCandidates, seenIds, seenFingerprints, 8);

    res.json({
      sections: {
        nearYou: nearYou || [],
        popular: popular || [],
        budgetFriendly: budgetFriendly || [],
        topRated: topRated || [],
        freshRecommendations: freshRecommendations || [],
        recentlyAdded: freshRecommendations || []
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard sections' });
  }
});

// 2.5 INSTANT AUTOCOMPLETE & SEARCH SUGGESTIONS
const handleSuggest = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = String(req.query.q || req.query.query || '').trim();
    if (!q) {
      res.json({ query: '', items: [], categories: [] });
      return;
    }

    const approvedItems = await prisma.item.findMany({
      where: { status: 'APPROVED' },
      take: 50,
      include: {
        images: true,
        category: true,
        owner: { select: { id: true, name: true, city: true, area: true, trustScore: true, rating: true, avatar: true } }
      }
    });

    const ranked = SearchService.searchAndRank(approvedItems as any, q, req.query.city as string);
    const topItems = ranked.slice(0, 5).map((it) => ({
      id: it.id,
      title: it.title,
      hourlyRate: it.hourlyRate,
      city: it.city,
      area: it.area,
      category: it.category?.name,
      imageUrl: it.images?.find((img) => img.isPrimary)?.url || it.images?.[0]?.url
    }));

    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { slug: { contains: q.toLowerCase().replace(/\s+/g, '-') } }
        ]
      },
      take: 3
    });

    res.json({
      query: q,
      items: topItems,
      categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
};

router.get('/suggest', handleSuggest);
router.get('/search/autocomplete', handleSuggest);

// 3. SEARCH & FILTER ITEMS (Tokenized, Fuzzy, Synonym & Stem-Aware)
const handleSearchItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      q,
      query,
      category,
      city,
      area,
      pincode,
      condition,
      minPrice,
      maxPrice,
      deliveryOnly,
      cityOnly,
      sort
    } = req.query;

    const rawQuery = String(q || query || '').trim();

    const where: any = {
      status: 'APPROVED'
    };

    if (category) {
      where.category = { slug: String(category) };
    }

    // If searching with a text query, only enforce strict city filter if explicitly requested via cityOnly='true'
    // Otherwise allow nationwide matching with local city relevance boost
    const isSearchingQuery = rawQuery.length > 0;
    if (city && city !== 'All' && city !== 'All India') {
      if (!isSearchingQuery || cityOnly === 'true') {
        where.city = String(city);
      }
    }

    if (area) {
      where.area = { contains: String(area) };
    }

    if (pincode) {
      where.pincode = String(pincode);
    }

    if (condition) {
      where.condition = String(condition);
    }

    if (deliveryOnly === 'true') {
      where.isDeliveryAvailable = true;
    }

    if (minPrice || maxPrice) {
      where.hourlyRate = {};
      if (minPrice) where.hourlyRate.gte = Number(minPrice);
      if (maxPrice) where.hourlyRate.lte = Number(maxPrice);
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'lowest_price') orderBy = { hourlyRate: 'asc' };
    if (sort === 'highest_price') orderBy = { hourlyRate: 'desc' };
    if (sort === 'popular') orderBy = { viewsCount: 'desc' };

    const rawItems = await prisma.item.findMany({
      where,
      orderBy,
      include: {
        images: true,
        category: true,
        owner: {
          select: {
            id: true,
            name: true,
            city: true,
            area: true,
            trustScore: true,
            rating: true,
            avatar: true,
            isIdentityVerified: true
          }
        }
      }
    });

    let items: any[] = rawItems;

    // Apply tokenized, synonym, and stem-aware search ranking
    if (isSearchingQuery) {
      items = SearchService.searchAndRank(
        rawItems as any,
        rawQuery,
        city ? String(city) : undefined,
        sort ? String(sort) : undefined
      );
    }

    // Deduplicate search results by ID and fingerprint so duplicate test records from same owner do not appear
    const deduplicatedItems: any[] = [];
    const searchSeenIds = new Set<string>();
    const searchSeenFps = new Set<string>();
    for (const item of items) {
      if (!item || !item.id || searchSeenIds.has(item.id)) continue;
      const fp = getListingFingerprint(item);
      if (searchSeenFps.has(fp)) continue;

      searchSeenIds.add(item.id);
      searchSeenFps.add(fp);
      deduplicatedItems.push(item);
    }

    res.json({ items: deduplicatedItems, count: deduplicatedItems.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search items' });
  }
};

router.get('/', handleSearchItems);
router.get('/search', handleSearchItems);

// 4. GET LENDER'S OWN LISTINGS (must come BEFORE /:id to avoid route conflict)
router.get('/my/listings', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listings = await prisma.item.findMany({
      where: { ownerId: req.user.id },
      include: {
        images: true,
        category: true,
        bookings: {
          where: {
            status: { in: ['PENDING', 'APPROVED', 'ACTIVE', 'RETURN_REQUESTED'] }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ listings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user listings' });
  }
});

// 4.5 GET USER'S WISHLIST ITEMS WITH DETAILS
router.get('/my/wishlist', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const wishlists = await prisma.wishlistItem.findMany({
      where: { userId: req.user.id },
      include: {
        item: {
          include: {
            images: true,
            category: true,
            owner: {
              select: {
                id: true,
                name: true,
                city: true,
                area: true,
                trustScore: true,
                rating: true,
                avatar: true,
                aadharVerified: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ items: wishlists.map(w => w.item).filter(Boolean) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wishlist items' });
  }
});

// 5. GET DIGITAL EQUIPMENT PASSPORT (Section 17)
router.get('/:id/passport', async (req: Request, res: Response): Promise<void> => {
  try {
    const itemId = req.params.id as string;
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        category: true,
        images: true,
        owner: true,
        bookings: {
          where: { status: 'COMPLETED' },
          include: {
            inspectionRecords: true,
            reviews: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!item) {
      res.status(404).json({ error: 'Equipment not found' });
      return;
    }

    const totalCompletedBookings = item.bookings.length;
    const totalHoursRented = item.bookings.reduce((acc: number, b: any) => acc + (b.durationHours || 0), 0);

    res.json({
      passport: {
        serialNumber: item.passportSerial || `BC-IN-${item.id.substring(0, 8).toUpperCase()}`,
        item: {
          id: item.id,
          title: item.title,
          category: item.category.name,
          condition: item.condition,
          replacementValue: item.replacementValue,
          purchasePrice: item.purchasePrice,
          listedDate: item.createdAt,
          maintenanceLog: item.maintenanceLog || 'Regular inspection completed before listing.'
        },
        verifiedOwner: {
          name: item.owner.name,
          city: item.owner.city,
          trustScore: item.owner.trustScore,
          isAadhaarVerified: item.owner.aadharVerified,
          rating: item.owner.rating,
          memberSince: item.owner.createdAt
        },
        rentalStats: {
          totalCompletedBookings,
          totalHoursRented,
          verificationBadge: 'GENUINE_EQUIPMENT_PASS'
        },
        inspectionHistory: item.bookings
          .filter((b: any) => b.inspectionRecords && b.inspectionRecords.length > 0)
          .map((b: any) => ({
            bookingId: b.id,
            date: b.actualEndTime || b.createdAt,
            conditionStatus: b.inspectionRecords[0]?.conditionStatus || 'NORMAL_WEAR',
            notes: b.inspectionRecords[0]?.notes || 'Returned in good operating condition.'
          })),
        recentReviews: item.bookings
          .filter((b: any) => b.reviews && b.reviews.length > 0)
          .map((b: any) => ({
            rating: b.reviews[0]?.rating,
            comment: b.reviews[0]?.comment
          }))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch equipment passport' });
  }
});

// 6. GET SINGLE ITEM DETAILS
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const itemId = req.params.id as string;
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        images: true,
        category: true,
        owner: {
          select: {
            id: true,
            name: true,
            city: true,
            area: true,
            pincode: true,
            trustScore: true,
            rating: true,
            ratingCount: true,
            completedLendsCount: true,
            avatar: true,
            isIdentityVerified: true,
            aadharVerified: true
          }
        },
        reviews: {
          include: {
            reviewer: { select: { id: true, name: true, avatar: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!item) {
      res.status(404).json({ error: 'Equipment not found' });
      return;
    }

    // Increment view count asynchronously
    await prisma.item.update({
      where: { id: item.id },
      data: { viewsCount: { increment: 1 } }
    });

    // Provide default 2-hour preview quote
    const sampleQuote = PricingService.calculateRentalQuote(
      item.hourlyRate,
      2,
      item.securityDeposit,
      false,
      item.deliveryFee,
      item.minHours
    );

    res.json({ item, sampleQuote });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch item details' });
  }
});

// 5. CREATE NEW LISTING (LENDER) -> Status: PENDING_APPROVAL
router.post('/', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      categoryId,
      condition,
      purchasePrice,
      replacementValue,
      hourlyRate,
      dailyRate,
      minHours,
      securityDeposit,
      city,
      area,
      pincode,
      pickupAddress,
      isDeliveryAvailable,
      deliveryFee,
      usageInstructions,
      safetyGuidelines,
      damageConditions,
      images
    } = req.body;

    if (!title || !description || !categoryId || !hourlyRate || !replacementValue) {
      res.status(400).json({ error: 'Title, description, category, hourly rate, and replacement value are required' });
      return;
    }

    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    const passportSerial = `BC-IN-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const item = await prisma.item.create({
      data: {
        title,
        slug,
        description,
        categoryId,
        condition: condition || 'VERY_GOOD',
        purchasePrice: purchasePrice ? Number(purchasePrice) : null,
        replacementValue: Number(replacementValue),
        hourlyRate: Number(hourlyRate),
        dailyRate: dailyRate ? Number(dailyRate) : null,
        minHours: minHours ? Number(minHours) : 1,
        securityDeposit: 0, // Zero deposit model for BorrowCircle
        city: city || req.user.city,
        area: area || req.user.area,
        pincode: pincode || req.user.pincode,
        pickupAddress: pickupAddress || `${req.user.area}, ${req.user.city}`,
        isDeliveryAvailable: Boolean(isDeliveryAvailable),
        deliveryFee: deliveryFee ? Number(deliveryFee) : 0,
        usageInstructions,
        safetyGuidelines,
        damageConditions,
        status: 'PENDING_APPROVAL', // Strict approval requirement
        ownerId: req.user.id,
        passportSerial,
        maintenanceLog: 'Item checked and listed for community sharing.',
        images: {
          create: (images && images.length > 0 ? images : ['https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&w=800&q=80']).map((url: string, idx: number) => ({
            url,
            isPrimary: idx === 0
          }))
        }
      },
      include: { images: true, category: true }
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: req.user.id,
        title: 'Listing Submitted for Review',
        message: `Your listing for "${item.title}" is currently pending admin verification. It will be live once reviewed.`,
        type: 'SYSTEM',
        link: `/items/${item.id}`
      }
    });

    res.status(201).json({
      message: 'Equipment listing created successfully. Awaiting admin approval.',
      item
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// 7. TOGGLE WISHLIST ITEM
router.post('/:id/wishlist', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const itemId = req.params.id as string;
    const existing = await prisma.wishlistItem.findUnique({
      where: {
        userId_itemId: {
          userId: req.user.id,
          itemId
        }
      }
    });

    if (existing) {
      await prisma.wishlistItem.delete({
        where: { id: existing.id }
      });
      res.json({ wishlisted: false, message: 'Removed from wishlist' });
    } else {
      await prisma.wishlistItem.create({
        data: {
          userId: req.user.id,
          itemId
        }
      });
      res.json({ wishlisted: true, message: 'Added to wishlist' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle wishlist' });
  }
});

// 8. UPDATE LISTING (LENDER / ADMIN)
router.put('/:id', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const itemId = req.params.id as string;
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      res.status(404).json({ error: 'Equipment not found' });
      return;
    }
    if (item.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Unauthorized to modify this listing' });
      return;
    }

    const {
      title,
      description,
      hourlyRate,
      dailyRate,
      securityDeposit,
      condition,
      isDeliveryAvailable,
      deliveryFee,
      isAvailable,
      status
    } = req.body;

    const updated = await prisma.item.update({
      where: { id: itemId },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) }),
        ...(dailyRate !== undefined && { dailyRate: dailyRate ? Number(dailyRate) : null }),
        securityDeposit: 0,
        ...(condition && { condition }),
        ...(isDeliveryAvailable !== undefined && { isDeliveryAvailable: Boolean(isDeliveryAvailable) }),
        ...(deliveryFee !== undefined && { deliveryFee: Number(deliveryFee) }),
        ...(status && ['APPROVED', 'PENDING_APPROVAL', 'SUSPENDED'].includes(status)
          ? { status }
          : isAvailable !== undefined
          ? { status: isAvailable ? 'APPROVED' : 'SUSPENDED' }
          : {})
      },
      include: { images: true, category: true }
    });

    res.json({ message: 'Listing updated successfully', item: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// 9. DELETE / DEACTIVATE LISTING (LENDER / ADMIN)
router.delete('/:id', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const itemId = req.params.id as string;
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'APPROVED', 'ACTIVE', 'READY_FOR_PICKUP', 'RETURN_REQUESTED', 'INSPECTION_PENDING'] }
          }
        }
      }
    });

    if (!item) {
      res.status(404).json({ error: 'Equipment not found' });
      return;
    }
    if (item.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Unauthorized to delete this listing' });
      return;
    }
    if (item.bookings.length > 0) {
      res.status(400).json({ error: 'Cannot delete equipment with active or pending bookings. Please complete or cancel bookings first.' });
      return;
    }

    await prisma.wishlistItem.deleteMany({ where: { itemId } });
    await prisma.itemImage.deleteMany({ where: { itemId } });
    await prisma.item.delete({ where: { id: itemId } });

    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

export default router;
