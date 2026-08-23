import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FootballCard, MarketListing, PricePoint, Rarity, BuyRequest, MarketSettings, DemandLevel, PriceHistoryRecord } from '../types';
import { db, doc, getDoc, setDoc, updateDoc, increment, collection, addDoc } from './firebase';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, short = false) {
  const rounded = Math.round(Number(value || 0)).toLocaleString('en-US');
  if (short) return `${rounded} AC`;
  return `${rounded} ARTCOIN`;
}

/**
 * Base Price of the card:
 * The fixed starting / mint price of the card.
 */
export function getCardBasePrice(card: Partial<FootballCard>): number {
  if (!card) return 100;
  if (typeof card.basePrice === 'number' && card.basePrice > 0) {
    return card.basePrice;
  }
  if (card.priceHistory && card.priceHistory.length > 0) {
    const first = card.priceHistory[0];
    if (first && typeof first.price === 'number' && first.price > 0) {
      return first.price;
    }
  }
  const cur = Number(card.currentPrice);
  if (!isNaN(cur) && cur > 0) return cur;
  return 100;
}

// Alias for backwards compatibility
export const getCardStartingPrice = getCardBasePrice;

/**
 * Classify Demand Level based on the relationship between Buy Requests and Sell Listings:
 * - Buy/Sell Ratio < 0.5   → VERY LOW
 * - 0.5 – 0.99             → LOW
 * - 1.0 – 1.49             → NORMAL
 * - 1.5 – 2.49             → HIGH
 * - 2.5+                   → VERY HIGH
 * If Sell Listings = 0, treat demand as VERY HIGH if Buy Requests > 0, else NORMAL when 0.
 */
export function getDemandLevel(buyRequests: number, sellListings: number): {
  level: DemandLevel;
  ratio: number;
  ratioText: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
} {
  const b = Math.max(0, Number(buyRequests) || 0);
  const s = Math.max(0, Number(sellListings) || 0);

  if (s === 0) {
    if (b > 0) {
      return {
        level: 'VERY HIGH',
        ratio: Infinity,
        ratioText: `${b} / 0 (∞)`,
        badgeBg: 'bg-rose-600 text-white',
        badgeText: 'text-white',
        badgeBorder: 'border-rose-700',
        dotColor: 'bg-white'
      };
    }
    return {
      level: 'NORMAL',
      ratio: 1.0,
      ratioText: '0 / 0',
      badgeBg: 'bg-neutral-800 text-[#D4FF00]',
      badgeText: 'text-[#D4FF00]',
      badgeBorder: 'border-black',
      dotColor: 'bg-[#D4FF00]'
    };
  }

  const ratio = b / s;
  const ratioText = `${b} / ${s} (${ratio.toFixed(2)}x)`;

  if (ratio < 0.5) {
    return {
      level: 'VERY LOW',
      ratio,
      ratioText,
      badgeBg: 'bg-neutral-200 text-neutral-700',
      badgeText: 'text-neutral-700',
      badgeBorder: 'border-neutral-400',
      dotColor: 'bg-neutral-500'
    };
  } else if (ratio < 1.0) {
    return {
      level: 'LOW',
      ratio,
      ratioText,
      badgeBg: 'bg-amber-100 text-amber-900',
      badgeText: 'text-amber-900',
      badgeBorder: 'border-amber-400',
      dotColor: 'bg-amber-600'
    };
  } else if (ratio < 1.5) {
    return {
      level: 'NORMAL',
      ratio,
      ratioText,
      badgeBg: 'bg-neutral-800 text-[#D4FF00]',
      badgeText: 'text-[#D4FF00]',
      badgeBorder: 'border-black',
      dotColor: 'bg-[#D4FF00]'
    };
  } else if (ratio < 2.5) {
    return {
      level: 'HIGH',
      ratio,
      ratioText,
      badgeBg: 'bg-amber-500 text-black',
      badgeText: 'text-black',
      badgeBorder: 'border-amber-600',
      dotColor: 'bg-black'
    };
  } else {
    return {
      level: 'VERY HIGH',
      ratio,
      ratioText,
      badgeBg: 'bg-rose-600 text-white',
      badgeText: 'text-white',
      badgeBorder: 'border-rose-700',
      dotColor: 'bg-white'
    };
  }
}

/**
 * Calculates price change stats between base price and current market price.
 */
export function getPriceChangeStats(basePrice: number, currentPrice: number): {
  diff: number;
  percentage: number;
  trend: 'up' | 'down' | 'neutral';
  formattedDiff: string;
  formattedPercentage: string;
} {
  const safeBase = Math.max(1, Number(basePrice) || 100);
  const safeCurrent = Math.max(1, Number(currentPrice) || safeBase);
  const diff = safeCurrent - safeBase;
  const percentage = Math.round(((safeCurrent - safeBase) / safeBase) * 100 * 10) / 10;

  const trend: 'up' | 'down' | 'neutral' = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
  const sign = diff > 0 ? '+' : '';

  return {
    diff,
    percentage,
    trend,
    formattedDiff: `${sign}${formatCurrency(diff)}`,
    formattedPercentage: `${sign}${percentage}%`
  };
}

export interface DynamicPricingCalculation {
  basePrice: number;
  buyRequestsCount: number;
  sellListingsCount: number;
  totalActiveUsers: number;
  k: number;
  calculatedRawPrice: number;
  finalPrice: number;
  minPrice: number;
  maxPrice: number;
  isCappedMin: boolean;
  isCappedMax: boolean;
  demand: ReturnType<typeof getDemandLevel>;
  priceChange: ReturnType<typeof getPriceChangeStats>;
}

/**
 * CORE DYNAMIC PRICING FORMULA:
 * Market Price = Base Price × (1 + ((Buy Requests − Sell Listings) ÷ Total Active Users) × K)
 * 
 * Protected by:
 * Final Price = MIN(Max Price, MAX(Min Price, Calculated Price))
 * Default Min = 50% of Base Price
 * Default Max = 500% of Base Price
 */
export function calculateDynamicMarketPrice(
  card: Partial<FootballCard>,
  options: {
    buyRequests?: BuyRequest[] | number;
    listings?: MarketListing[] | number;
    totalActiveUsers?: number;
    settings?: MarketSettings;
  } = {}
): DynamicPricingCalculation {
  const basePrice = getCardBasePrice(card);

  // Determine active buy requests for this card
  let buyRequestsCount = 0;
  if (typeof options.buyRequests === 'number') {
    buyRequestsCount = Math.max(0, options.buyRequests);
  } else if (Array.isArray(options.buyRequests)) {
    buyRequestsCount = options.buyRequests.filter(
      r => r.status === 'active' && (r.cardId === card.id || r.card?.id === card.id || (card.player && r.card?.player?.toLowerCase() === card.player.toLowerCase()))
    ).length;
  } else if (typeof card.buyRequests === 'number') {
    buyRequestsCount = Math.max(0, card.buyRequests);
  }

  // Determine active sell listings for this card
  let sellListingsCount = 0;
  if (typeof options.listings === 'number') {
    sellListingsCount = Math.max(0, options.listings);
  } else if (Array.isArray(options.listings)) {
    sellListingsCount = options.listings.filter(
      l => l.status === 'active' && (l.cardId === card.id || l.card?.id === card.id || (card.player && l.card?.player?.toLowerCase() === card.player.toLowerCase()))
    ).length;
  } else if (typeof card.sellListings === 'number') {
    sellListingsCount = Math.max(0, card.sellListings);
  }

  // Determine Total Active Marketplace Users
  const rawActiveUsers = options.totalActiveUsers !== undefined
    ? Number(options.totalActiveUsers)
    : 100;
  const totalActiveUsers = isNaN(rawActiveUsers) || rawActiveUsers <= 0 ? 0 : rawActiveUsers;

  // Demand Sensitivity Factor K (default 2)
  const cardK = typeof card.demandSensitivity === 'number' && card.demandSensitivity > 0
    ? card.demandSensitivity
    : undefined;
  const settingsK = options.settings?.defaultK && options.settings.defaultK > 0
    ? options.settings.defaultK
    : undefined;
  const k = cardK ?? settingsK ?? 2;

  // Limits Configuration
  const minPercent = options.settings?.minPricePercentage !== undefined && options.settings.minPricePercentage > 0
    ? options.settings.minPricePercentage
    : 50; // 50%
  const maxPercent = options.settings?.maxPricePercentage !== undefined && options.settings.maxPricePercentage > 0
    ? options.settings.maxPricePercentage
    : 500; // 500%

  const minPrice = card.minPrice !== undefined && card.minPrice > 0
    ? card.minPrice
    : Math.max(1, Math.round(basePrice * (minPercent / 100)));

  const maxPrice = card.maxPrice !== undefined && card.maxPrice > 0
    ? card.maxPrice
    : Math.max(minPrice, Math.round(basePrice * (maxPercent / 100)));

  // Perform Pricing Calculation with strict safety checks
  let calculatedRawPrice = basePrice;

  if (totalActiveUsers <= 0) {
    calculatedRawPrice = basePrice;
  } else {
    // Market Price = Base Price × (1 + ((Buy Requests − Sell Listings) ÷ Total Active Users) × K)
    const netDemand = (buyRequestsCount - sellListingsCount) / totalActiveUsers;
    const factor = 1 + (netDemand * k);
    calculatedRawPrice = basePrice * factor;
  }

  // Check numerical validity
  if (isNaN(calculatedRawPrice) || !isFinite(calculatedRawPrice) || calculatedRawPrice <= 0) {
    calculatedRawPrice = basePrice;
  }

  // Apply Price Protection limits: MIN(Max Price, MAX(Min Price, Calculated Price))
  const boundedPrice = Math.min(maxPrice, Math.max(minPrice, calculatedRawPrice));
  const finalPrice = Math.max(1, Math.round(boundedPrice));

  const isCappedMin = calculatedRawPrice <= minPrice;
  const isCappedMax = calculatedRawPrice >= maxPrice;

  const demand = getDemandLevel(buyRequestsCount, sellListingsCount);
  const priceChange = getPriceChangeStats(basePrice, finalPrice);

  return {
    basePrice,
    buyRequestsCount,
    sellListingsCount,
    totalActiveUsers: totalActiveUsers || 1,
    k,
    calculatedRawPrice: Math.round(calculatedRawPrice),
    finalPrice,
    minPrice,
    maxPrice,
    isCappedMin,
    isCappedMax,
    demand,
    priceChange
  };
}

/**
 * Returns the single calculated final price (backwards compatible helper)
 */
export function calculateCardMarketPrice(
  card: Partial<FootballCard>,
  listings?: MarketListing[] | number,
  buyRequests?: BuyRequest[] | number,
  totalActiveUsers?: number,
  settings?: MarketSettings
): number {
  if (!card) return 100;
  const result = calculateDynamicMarketPrice(card, {
    listings,
    buyRequests,
    totalActiveUsers,
    settings
  });
  return result.finalPrice;
}

/**
 * Record a price history update in Firestore when the market price changes.
 */
export async function recordPriceHistoryLog(entry: {
  cardId: string;
  playerName?: string;
  oldPrice: number;
  newPrice: number;
  buyRequests: number;
  sellListings: number;
  totalActiveUsers: number;
  kFactor: number;
  reason?: string;
}) {
  if (!entry.cardId || entry.oldPrice === entry.newPrice) return;
  try {
    const changePercentage = entry.oldPrice > 0
      ? Math.round(((entry.newPrice - entry.oldPrice) / entry.oldPrice) * 1000) / 10
      : 0;

    const logItem: PriceHistoryRecord = {
      cardId: entry.cardId,
      playerName: entry.playerName || '',
      oldPrice: Math.round(entry.oldPrice),
      newPrice: Math.round(entry.newPrice),
      changePercentage,
      buyRequests: entry.buyRequests,
      sellListings: entry.sellListings,
      totalActiveUsers: entry.totalActiveUsers,
      kFactor: entry.kFactor,
      timestamp: Date.now(),
      reason: entry.reason || 'demand_change'
    };

    await addDoc(collection(db, 'price_history'), logItem);
  } catch (err) {
    console.error("Error logging price history:", err);
  }
}

/**
 * Update card's market value, last sale price, and price history in Firestore after a purchase/sale.
 */
export async function updateCardMarketValueOnSale(
  cardId: string,
  salePrice: number,
  cardFallback?: Partial<FootballCard>
): Promise<number> {
  if (!cardId) return Math.round(salePrice || 100);
  
  const roundedPrice = Math.max(1, Math.round(salePrice));
  const nowIso = new Date().toISOString();
  const newPricePoint: PricePoint = {
    date: nowIso,
    price: roundedPrice
  };

  try {
    const cardRef = doc(db, 'cards', cardId);
    const cardSnap = await getDoc(cardRef);

    if (cardSnap.exists()) {
      const data = cardSnap.data() as FootballCard;
      const prevHistory = Array.isArray(data.priceHistory) && data.priceHistory.length > 0
        ? data.priceHistory
        : (cardFallback?.priceHistory || [{ date: new Date(Date.now() - 86400000).toISOString(), price: getCardStartingPrice(data) }]);

      const updatedHistory = [...prevHistory, newPricePoint];
      const trimmedHistory = updatedHistory.length > 40 ? updatedHistory.slice(updatedHistory.length - 40) : updatedHistory;

      await updateDoc(cardRef, {
        currentPrice: roundedPrice,
        priceHistory: trimmedHistory,
        lastSalePrice: roundedPrice,
        lastSoldAt: Date.now()
      });
    } else if (cardFallback) {
      const prevHistory = Array.isArray(cardFallback.priceHistory) && cardFallback.priceHistory.length > 0
        ? cardFallback.priceHistory
        : [{ date: new Date(Date.now() - 86400000).toISOString(), price: getCardStartingPrice(cardFallback) }];

      const updatedHistory = [...prevHistory, newPricePoint];
      const trimmedHistory = updatedHistory.length > 40 ? updatedHistory.slice(updatedHistory.length - 40) : updatedHistory;

      const { id: _, ...cardDataWithoutId } = cardFallback as FootballCard;

      await setDoc(cardRef, {
        ...cardDataWithoutId,
        currentPrice: roundedPrice,
        priceHistory: trimmedHistory,
        lastSalePrice: roundedPrice,
        lastSoldAt: Date.now()
      }, { merge: true });
    }
  } catch (err) {
    console.error("Failed to update card market value on sale:", err);
  }

  return roundedPrice;
}

/**
 * Get statistics on sold / completed market sales for a specific card.
 */
export function getCardSoldPriceStats(card: Partial<FootballCard>, listings?: MarketListing[]): {
  avgSoldPrice: number;
  totalSold: number;
  soldPrices: number[];
} {
  if (!card) return { avgSoldPrice: 0, totalSold: 0, soldPrices: [] };

  const matchesCard = (l: MarketListing) => {
    if (card.id && (l.cardId === card.id || l.card?.id === card.id)) return true;
    if (card.player && l.card?.player && l.card.player.toLowerCase() === card.player.toLowerCase()) return true;
    return false;
  };

  const soldListings = (listings || []).filter(l => l.status === 'sold' && matchesCard(l));
  const soldPricesFromListings = soldListings.map(l => Number(l.price) || 0).filter(p => p > 0);

  const historySalePrices: number[] = [];
  if (card.priceHistory && card.priceHistory.length > 1) {
    card.priceHistory.slice(1).forEach(p => {
      const val = Number(p.price) || 0;
      if (val > 0) historySalePrices.push(val);
    });
  }

  const allSoldPrices = soldPricesFromListings.length > 0 ? soldPricesFromListings : historySalePrices;

  if (allSoldPrices.length === 0) {
    if (card.lastSalePrice && typeof card.lastSalePrice === 'number' && card.lastSalePrice > 0) {
      return {
        avgSoldPrice: Math.round(card.lastSalePrice),
        totalSold: 1,
        soldPrices: [Math.round(card.lastSalePrice)]
      };
    }
    return { avgSoldPrice: 0, totalSold: 0, soldPrices: [] };
  }

  const sum = allSoldPrices.reduce((acc, p) => acc + p, 0);
  const avg = Math.round(sum / allSoldPrices.length);

  return {
    avgSoldPrice: avg,
    totalSold: allSoldPrices.length,
    soldPrices: allSoldPrices
  };
}

export function getDefaultStock(card: Partial<FootballCard>): number {
  if (card.stock !== undefined) return card.stock;
  if (card.rarity === '1-of-1 Shield') return 1;
  if (card.rarity === 'Gold Autograph') return 10;
  if (card.rarity === 'Silver Refractor') return 50;
  return 100;
}

export function getDefaultMaxSupply(card: Partial<FootballCard>): number {
  if (card.maxSupply !== undefined) return card.maxSupply;
  if (card.rarity === '1-of-1 Shield') return 1;
  if (card.rarity === 'Gold Autograph') return 10;
  if (card.rarity === 'Silver Refractor') return 50;
  return 100;
}

export function drawRandomCards(
  availableCards: FootballCard[],
  count: number,
  odds = { base: 60, silver: 28, gold: 10, shield: 2 },
  allowedEditions?: string[]
): FootballCard[] {
  if (!availableCards.length) return [];
  
  // Filter by allowed editions if configured and not empty or 'ALL'
  let eligibleCards = availableCards;
  if (allowedEditions && allowedEditions.length > 0 && !allowedEditions.includes('ALL')) {
    const filtered = availableCards.filter(c => c.edition && allowedEditions.includes(c.edition));
    if (filtered.length > 0) {
      eligibleCards = filtered;
    }
  }

  // Filter cards with stock > 0 if available, else all cards
  const inStockCards = eligibleCards.filter(c => (c.stock === undefined ? true : c.stock > 0));
  const pool = inStockCards.length > 0 ? inStockCards : eligibleCards;

  const baseCards = pool.filter(c => c.rarity === 'Base');
  const silverCards = pool.filter(c => c.rarity === 'Silver Refractor');
  const goldCards = pool.filter(c => c.rarity === 'Gold Autograph');
  const shieldCards = pool.filter(c => c.rarity === '1-of-1 Shield');

  const drawn: FootballCard[] = [];
  const chosenIds = new Set<string>();

  for (let i = 0; i < count; i++) {
    const roll = Math.random() * 100;
    let selectedBucket: FootballCard[] = [];

    if (roll < odds.shield && shieldCards.length > 0) {
      selectedBucket = shieldCards;
    } else if (roll < (odds.shield + odds.gold) && goldCards.length > 0) {
      selectedBucket = goldCards;
    } else if (roll < (odds.shield + odds.gold + odds.silver) && silverCards.length > 0) {
      selectedBucket = silverCards;
    } else {
      selectedBucket = baseCards.length > 0 ? baseCards : pool;
    }

    // Try to pick unique card if possible
    const availableInBucket = selectedBucket.filter(c => !chosenIds.has(c.id));
    const finalPool = availableInBucket.length > 0 ? availableInBucket : selectedBucket;
    
    if (finalPool.length > 0) {
      const picked = finalPool[Math.floor(Math.random() * finalPool.length)];
      chosenIds.add(picked.id);
      drawn.push(picked);
    } else if (pool.length > 0) {
      const fallback = pool[Math.floor(Math.random() * pool.length)];
      chosenIds.add(fallback.id);
      drawn.push(fallback);
    }
  }

  return drawn;
}

/**
 * Format clean URL slug or hash target for card by card number
 */
export function getCardNumberSlug(card: Partial<FootballCard>): string {
  if (!card) return '';
  const num = (card.cardNumber || card.id || '').trim();
  return encodeURIComponent(num);
}

/**
 * Generate shareable direct link to a single card page by card number
 */
export function getCardDirectUrl(card: Partial<FootballCard>): string {
  if (!card) return typeof window !== 'undefined' ? window.location.href : '';
  const slug = getCardNumberSlug(card);
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}#card-${slug}`;
  }
  return `#card-${slug}`;
}

/**
 * Find card by card number or id with robust matching
 * Supports: exact cardNumber, cardNumber without leading zeroes, card id, '#001', 'card-001', etc.
 */
export function findCardByNumberOrId(cardsList: FootballCard[], identifier: string): FootballCard | undefined {
  if (!identifier || !cardsList || cardsList.length === 0) return undefined;
  
  let clean = decodeURIComponent(identifier).trim();
  // Strip leading hash if passed
  if (clean.startsWith('#')) {
    clean = clean.substring(1);
  }
  
  const lower = clean.toLowerCase();

  // 1. Check exact cardNumber match (case-insensitive)
  let found = cardsList.find(c => (c.cardNumber || '').trim().toLowerCase() === lower);
  if (found) return found;

  // 2. Check exact card ID match
  found = cardsList.find(c => (c.id || '').toLowerCase() === lower);
  if (found) return found;

  // 3. Strip prefix like 'card-' or 'card/' or 'card_' or 'no-' or '#'
  const stripped = lower.replace(/^(card|no|#)[-_/:]?/i, '').trim();
  if (stripped) {
    found = cardsList.find(c => (c.cardNumber || '').trim().toLowerCase() === stripped);
    if (found) return found;

    found = cardsList.find(c => (c.id || '').toLowerCase() === stripped);
    if (found) return found;

    // 4. Match without leading zeroes (e.g. "1" matches "001" or "01")
    const numOnly = stripped.replace(/^0+/, '');
    if (numOnly) {
      found = cardsList.find(c => {
        const cardNumOnly = (c.cardNumber || '').trim().toLowerCase().replace(/^0+/, '');
        return cardNumOnly === numOnly;
      });
      if (found) return found;
    }
  }

  // 5. Fallback: match by player name if someone shared player name
  found = cardsList.find(c => (c.player || '').trim().toLowerCase() === lower);
  if (found) return found;

  return undefined;
}
