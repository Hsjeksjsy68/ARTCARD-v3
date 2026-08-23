export type Rarity = 'Base' | 'Silver Refractor' | 'Gold Autograph' | '1-of-1 Shield';

export interface PricePoint {
  date: string;
  price: number;
}

export interface Pack {
  id: string;
  name: string;
  size: number;
  price: number;
  color: string;
  coverPhotoUrl?: string;
  description?: string;
  editions?: string[];
  badgeText?: string;
  rarityOdds?: {
    base: number;
    silver: number;
    gold: number;
    shield: number;
  };
}

export interface CardTheme {
  id: string;
  name: string;
  overlayImageUrl: string;
  clubLogoUrl?: string;
  clubLogoSize?: number;
  clubLogoTop?: number;
  clubLogoLeft?: number;
  editionLogoUrl?: string;
  editionLogoSize?: number;
  editionLogoTop?: number;
  editionLogoLeft?: number;
  fontBase64?: string;
  fontName?: string;
  fontColor?: string;
  fontSize?: number;
  fontPositionBottom?: number;
  fontScaleX?: number;
  fontScaleY?: number;
}

export type DemandLevel = 'VERY LOW' | 'LOW' | 'NORMAL' | 'HIGH' | 'VERY HIGH';

export interface FootballCard {
  id: string;
  cardId?: string; // alias for id
  player: string;
  playerName?: string; // alias for player
  team: string; // Club team / Primary team
  club?: string; // Explicit Club team
  nationalTeam?: string; // National Team (e.g. Argentina, Portugal, France, Brazil, etc.)
  position: string;
  year: number;
  season?: string; // alias for year/season e.g. "2024-25"
  set: string;
  cardName?: string; // descriptive card name
  edition: string;
  rarity: Rarity;
  cardNumber: string;
  imageUrl?: string;
  imageGradient: string;
  basePrice?: number; // Fixed starting price of the card
  currentPrice: number; // Current Market Price
  currentMarketPrice?: number; // Alias for currentPrice
  buyRequests?: number; // Active buy requests count
  sellListings?: number; // Active sell listings count
  minPrice?: number; // Minimum price protection limit
  maxPrice?: number; // Maximum price protection limit
  demandSensitivity?: number; // K value for this card (default 2)
  pricingConfig?: {
    kFactor?: number;
    minPricePercentage?: number;
    maxPricePercentage?: number;
    isLocked?: boolean;
  };
  lastPriceUpdate?: number | string; // Timestamp of last price update
  priceHistory: PricePoint[];
  searchCount?: number;
  stock?: number;
  maxSupply?: number;
  lastSalePrice?: number;
  lastSoldAt?: number;
}

export interface UserProfileData {
  uid: string;
  email: string | null;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  favoriteTeam?: string;
  featuredCardId?: string;
  customAvatar?: string;
  joinedAt?: number;
  collectionIds?: string[];
  vaultIds?: string[];
  favoriteIds?: string[];
  walletBalance?: number;
  followers?: string[];
  following?: string[];
}

export interface WalletTransaction {
  id: string;
  userId: string;
  userEmail?: string;
  type: 'top_up' | 'buy_card' | 'buy_pack' | 'market_buy' | 'market_sell' | 'event_reward';
  amount: number;
  description: string;
  cardId?: string;
  cardName?: string;
  packId?: string;
  packName?: string;
  timestamp: number;
}

export interface MarketListing {
  id: string;
  cardId: string;
  card: FootballCard;
  sellerId: string;
  sellerName: string;
  sellerAvatar?: string;
  sellerTeam?: string;
  price: number; // in ARTCOIN
  status: 'active' | 'sold' | 'cancelled';
  buyerId?: string;
  buyerName?: string;
  buyerAvatar?: string;
  listedAt: number;
  soldAt?: number;
}

export interface MarketOffer {
  id: string;
  listingId: string;
  cardId: string;
  card: FootballCard;
  sellerId: string;
  sellerName?: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar?: string;
  originalPrice: number;
  offerAmount: number;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'countered' | 'cancelled';
  counterAmount?: number;
  counterMessage?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface CommunityEvent {
  id: string;
  title: string;
  subtitle: string;
  category: 'market' | 'collection' | 'packs';
  description: string;
  rewardArtcoins: number;
  badgeName: string;
  targetCount: number;
  conditionType: 'market_trade' | 'ucl_cards' | 'shield_owner' | 'vault_value' | 'packs_opened';
  expiresAt: number;
  bannerGradient: string;
}

export interface BuyRequest {
  id: string;
  cardId: string;
  card: FootballCard;
  buyerId: string;
  buyerName: string;
  buyerAvatar?: string;
  buyerTeam?: string;
  targetPrice: number; // Max price willing to pay in ARTCOIN
  status: 'active' | 'fulfilled' | 'cancelled';
  createdAt: number;
  fulfilledAt?: number;
  fulfilledBySellerId?: string;
  fulfilledBySellerName?: string;
  fulfilledPrice?: number;
  note?: string;
}

export interface MarketSettings {
  defaultK: number; // Default demand sensitivity factor, default 2
  minPricePercentage: number; // Default 50%
  maxPricePercentage: number; // Default 500%
  maxBuyRequestsPerUser: number; // Default 5
  updatedAt?: number;
  priceUpdateFrequency?: string;
  demandThresholds?: {
    veryLow: number; // < 0.5
    low: number; // 0.5 - 0.99
    normal: number; // 1.0 - 1.49
    high: number; // 1.5 - 2.49
    veryHigh: number; // >= 2.5
  };
}

export interface PriceHistoryRecord {
  id?: string;
  cardId: string;
  playerName?: string;
  oldPrice: number;
  newPrice: number;
  changePercentage: number;
  buyRequests: number;
  sellListings: number;
  totalActiveUsers: number;
  kFactor: number;
  timestamp: number;
  reason?: string;
}
