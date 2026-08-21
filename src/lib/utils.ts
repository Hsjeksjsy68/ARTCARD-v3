import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FootballCard, Rarity } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, short = false) {
  const rounded = Math.round(Number(value || 0)).toLocaleString('en-US');
  if (short) return `${rounded} AC`;
  return `${rounded} ARTCOIN`;
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
