import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FootballCard, MarketListing, PricePoint, Rarity } from '../types';
import { db, doc, getDoc, setDoc, updateDoc, increment } from './firebase';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, short = false) {
  const rounded = Math.round(Number(value || 0)).toLocaleString('en-US');
  if (short) return `${rounded} AC`;
  return `${rounded} ARTCOIN`;
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
      // Keep up to last 40 price history points
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
 * Get base/starting price of a card (mint price / initial price)
 */
export function getCardStartingPrice(card: Partial<FootballCard>): number {
  if (card.priceHistory && card.priceHistory.length > 0) {
    const first = card.priceHistory[0];
    if (first && typeof first.price === 'number') {
      return first.price;
    }
  }
  return Number(card.currentPrice) || 100;
}

/**
 * Formula: ((starting card price + users listing prices in market) / amount of cards)
 * Where amount of cards = 1 (starting base card) + count of active user listings
 */
export function calculateCardMarketPrice(card: Partial<FootballCard>, listings?: MarketListing[]): number {
  if (!card) return 100;
  const startingPrice = getCardStartingPrice(card);
  
  if (!listings || listings.length === 0) {
    return startingPrice;
  }

  const activeListings = listings.filter(
    l => l.status === 'active' && (l.cardId === card.id || l.card?.id === card.id)
  );

  if (activeListings.length === 0) {
    return startingPrice;
  }

  const sumListingPrices = activeListings.reduce((sum, l) => sum + (Number(l.price) || 0), 0);
  const totalCardUnits = 1 + activeListings.length;

  return Math.round((startingPrice + sumListingPrices) / totalCardUnits);
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
