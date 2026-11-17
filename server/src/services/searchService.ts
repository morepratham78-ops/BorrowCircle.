export interface SearchResultItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  hourlyRate: number;
  dailyRate?: number | null;
  securityDeposit: number;
  condition: string;
  city: string;
  area: string;
  pincode: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  images: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
  }>;
  owner?: {
    id: string;
    name: string;
    city: string;
    area: string;
    trustScore: number;
    rating: number;
    avatar?: string | null;
    isIdentityVerified: boolean;
  };
  relevanceScore?: number;
  [key: string]: any;
}

const EQUIPMENT_SYNONYMS: Record<string, string[]> = {
  drill: ['powertool', 'rotary', 'hammer', 'bosch', 'dewalt', 'cordless', 'sds', 'driver', 'tools', 'drilling', 'drillbit'],
  drills: ['powertool', 'rotary', 'hammer', 'bosch', 'dewalt', 'cordless', 'sds', 'driver', 'tools', 'drilling', 'drillbit'],
  camera: ['cameras', 'dslr', 'mirrorless', 'sony', 'canon', 'nikon', 'lens', 'lenses', 'photography', 'photo', 'video', 'gopro', 'alpha'],
  cameras: ['camera', 'dslr', 'mirrorless', 'sony', 'canon', 'nikon', 'lens', 'lenses', 'photography', 'photo', 'video', 'gopro', 'alpha'],
  lens: ['lenses', 'glass', 'zoom', 'prime', 'sony', 'gm', 'camera', 'photography'],
  lenses: ['lens', 'glass', 'zoom', 'prime', 'sony', 'gm', 'camera', 'photography'],
  projector: ['projectors', 'epson', 'laser', '1080p', '4k', 'screen', 'display', 'hd', 'theater', 'theatre', 'av', 'smart'],
  projectors: ['projector', 'epson', 'laser', '1080p', '4k', 'screen', 'display', 'hd', 'theater', 'theatre', 'av', 'smart'],
  tent: ['tents', 'camping', 'quechua', 'outdoor', 'trekking', 'camp', 'canopy', 'shelter', 'sleeping', 'waterproof'],
  tents: ['tent', 'camping', 'quechua', 'outdoor', 'trekking', 'camp', 'canopy', 'shelter', 'sleeping', 'waterproof'],
  camping: ['tent', 'tents', 'quechua', 'outdoor', 'trekking', 'camp', 'gear', 'canopy', 'sleeping', 'hiking'],
  camp: ['tent', 'tents', 'camping', 'quechua', 'outdoor', 'trekking'],
  cleaner: ['washer', 'karcher', 'pressure', 'vacuum', 'cleaning', 'pressure washer', 'spray', 'wash'],
  cleaners: ['washer', 'karcher', 'pressure', 'vacuum', 'cleaning', 'pressure washer', 'spray', 'wash'],
  cleaning: ['cleaner', 'washer', 'karcher', 'pressure', 'vacuum', 'cleaning', 'pressure washer', 'spray', 'wash'],
  washer: ['cleaner', 'karcher', 'pressure', 'cleaning', 'pressure washer'],
  drone: ['drones', 'dji', 'mini', 'aerial', 'quadcopter', 'fly', 'gimbal', 'mavic', 'controller'],
  drones: ['drone', 'dji', 'mini', 'aerial', 'quadcopter', 'fly', 'gimbal', 'mavic', 'controller'],
  saw: ['saws', 'circular', 'dewalt', 'cutting', 'woodworking', 'cutter', 'blade', 'chop', 'miter'],
  saws: ['saw', 'circular', 'dewalt', 'cutting', 'woodworking', 'cutter', 'blade', 'chop', 'miter'],
  microscope: ['microscopes', 'olympus', 'lab', 'biology', 'optics', 'magnification', 'science', 'lens', 'binocular'],
  microscopes: ['microscope', 'olympus', 'lab', 'biology', 'optics', 'magnification', 'science', 'lens', 'binocular'],
  sound: ['speaker', 'speakers', 'audio', 'mic', 'microphone', 'amplifier', 'dj', 'party', 'subwoofer'],
  speaker: ['speakers', 'sound', 'audio', 'mic', 'microphone', 'amplifier', 'dj', 'party', 'subwoofer'],
  speakers: ['speaker', 'sound', 'audio', 'mic', 'microphone', 'amplifier', 'dj', 'party', 'subwoofer'],
  tool: ['tools', 'drill', 'saw', 'hammer', 'wrench', 'hardware', 'cordless', 'diy'],
  tools: ['tool', 'drill', 'saw', 'hammer', 'wrench', 'hardware', 'cordless', 'diy'],
  gear: ['equipment', 'camping', 'camera', 'tools', 'outdoor', 'kit'],
  waterproof: ['tent', 'camping', 'rain', 'jacket', 'tents'],
  bosch: ['drill', 'powertool', 'rotary', 'hammer', 'tool', 'hardware'],
  dewalt: ['saw', 'circular', 'drill', 'cordless', 'cutting', 'tool'],
  sony: ['camera', 'alpha', 'mirrorless', 'lens', 'photography', '4k'],
  dji: ['drone', 'mini', 'aerial', 'quadcopter', 'gimbal', 'camera'],
  epson: ['projector', 'laser', 'smart', 'screen', 'display', 'theater'],
  quechua: ['tent', 'camping', 'outdoor', 'trekking', 'camp']
};

export class SearchService {
  /**
   * Tokenize input string into normalized individual search tokens
   */
  static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 0);
  }

  /**
   * Produce word variants (plural, singular, root stem, equipment synonyms)
   */
  static expandTokens(tokens: string[]): {
    primaryTokens: string[];
    expandedSet: Set<string>;
  } {
    const expandedSet = new Set<string>();

    for (const token of tokens) {
      expandedSet.add(token);

      // Plural to singular
      if (token.endsWith('ies') && token.length > 4) {
        expandedSet.add(token.slice(0, -3) + 'y');
      } else if (token.endsWith('es') && token.length > 3) {
        expandedSet.add(token.slice(0, -2));
      } else if (token.endsWith('s') && token.length > 2) {
        expandedSet.add(token.slice(0, -1));
      }

      // Singular to plural
      if (!token.endsWith('s')) {
        expandedSet.add(token + 's');
        expandedSet.add(token + 'es');
      }

      // Participle (-ing)
      if (token.endsWith('ing') && token.length > 5) {
        expandedSet.add(token.slice(0, -3));
      }

      // Synonyms
      const syns = EQUIPMENT_SYNONYMS[token];
      if (syns) {
        for (const s of syns) {
          expandedSet.add(s);
        }
      }
    }

    return {
      primaryTokens: tokens,
      expandedSet
    };
  }

  /**
   * Compute relevance score for an item given search tokens & preferred city
   */
  static scoreItem(
    item: SearchResultItem,
    rawQuery: string,
    primaryTokens: string[],
    expandedTokens: Set<string>,
    preferredCity?: string
  ): number {
    const rawLower = rawQuery.toLowerCase().trim();
    const titleLower = (item.title || '').toLowerCase();
    const descLower = (item.description || '').toLowerCase();
    const catNameLower = (item.category?.name || '').toLowerCase();
    const catSlugLower = (item.category?.slug || '').toLowerCase();
    const areaLower = (item.area || '').toLowerCase();
    const cityLower = (item.city || '').toLowerCase();
    const fullText = `${titleLower} ${descLower} ${catNameLower} ${catSlugLower} ${areaLower} ${cityLower}`;

    let score = 0;

    // 1. Exact full query match
    if (rawLower.length > 2) {
      if (titleLower.includes(rawLower)) {
        score += 120;
      } else if (catNameLower.includes(rawLower)) {
        score += 80;
      } else if (descLower.includes(rawLower)) {
        score += 50;
      }
    }

    // 2. Primary Token Matching
    let matchedPrimaryCount = 0;
    for (const token of primaryTokens) {
      let tokenMatched = false;

      // Title matches (highest weight)
      if (titleLower.includes(token)) {
        score += 45;
        tokenMatched = true;
        // Exact word boundary in title
        const regex = new RegExp(`\\b${token}\\b`, 'i');
        if (regex.test(titleLower)) score += 25;
      }

      // Category matches
      if (catNameLower.includes(token) || catSlugLower.includes(token)) {
        score += 35;
        tokenMatched = true;
      }

      // Description matches
      if (descLower.includes(token)) {
        score += 15;
        tokenMatched = true;
      }

      // Area / City matches
      if (areaLower.includes(token) || cityLower.includes(token)) {
        score += 20;
        tokenMatched = true;
      }

      if (tokenMatched) matchedPrimaryCount++;
    }

    // All primary tokens matched bonus (essential for multi-word queries like "bosch drill" or "sony camera")
    if (primaryTokens.length > 1 && matchedPrimaryCount === primaryTokens.length) {
      score += 70;
    } else if (matchedPrimaryCount > 0 && primaryTokens.length > 1) {
      // Partial match bonus proportional to ratio
      score += Math.round((matchedPrimaryCount / primaryTokens.length) * 40);
    }

    // 3. Expanded Synonym / Variant Token Matching (if not already matched by primary)
    for (const expToken of expandedTokens) {
      if (primaryTokens.includes(expToken)) continue;

      if (titleLower.includes(expToken)) {
        score += 25;
      } else if (catNameLower.includes(expToken) || catSlugLower.includes(expToken)) {
        score += 20;
      } else if (descLower.includes(expToken)) {
        score += 10;
      }
    }

    // 4. City match priority
    if (preferredCity && preferredCity !== 'All' && preferredCity !== 'All India') {
      if (cityLower === preferredCity.toLowerCase()) {
        score += 30; // Boost local city items to the top
      }
    }

    return score;
  }

  /**
   * Filter and rank items based on search query
   */
  static searchAndRank(
    items: SearchResultItem[],
    query: string,
    preferredCity?: string,
    sort?: string
  ): SearchResultItem[] {
    const raw = query.trim();
    if (!raw) return items;

    const primaryTokens = this.tokenize(raw);
    if (primaryTokens.length === 0) return items;

    const { expandedSet } = this.expandTokens(primaryTokens);

    const scoredItems: SearchResultItem[] = [];

    for (const item of items) {
      const score = this.scoreItem(item, raw, primaryTokens, expandedSet, preferredCity);
      if (score > 0) {
        scoredItems.push({
          ...item,
          relevanceScore: score
        });
      }
    }

    // Sort items
    scoredItems.sort((a, b) => {
      // If user requested specific price sort, use it as primary and relevance as secondary
      if (sort === 'lowest_price') {
        if (a.hourlyRate !== b.hourlyRate) return a.hourlyRate - b.hourlyRate;
      } else if (sort === 'highest_price') {
        if (a.hourlyRate !== b.hourlyRate) return b.hourlyRate - a.hourlyRate;
      } else if (sort === 'popular') {
        const popA = a.viewsCount || 0;
        const popB = b.viewsCount || 0;
        if (popA !== popB) return popB - popA;
      }

      // Default: relevance score descending
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    });

    return scoredItems;
  }
}
