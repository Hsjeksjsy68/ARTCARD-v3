import React, { useState, useEffect } from 'react';
import { FootballCard, MarketListing } from '../types';
import { PriceChart } from './PriceChart';
import { formatCurrency, cn, getDefaultStock, getDefaultMaxSupply, getCardStartingPrice } from '../lib/utils';
import { getCardClubTeam, getCardNationalTeam, getNationalTeamFlag } from '../lib/teams';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Check, 
  Plus, 
  Share2, 
  Sparkles, 
  Flame, 
  Shield, 
  Crown, 
  Star, 
  Calendar, 
  Hash, 
  Download, 
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  Eye,
  ShoppingCart,
  Wallet,
  AlertCircle,
  PackageCheck,
  Heart,
  Trophy,
  Coins,
  ArrowUpRight,
  Tag,
  Store,
  Layers,
  Lock,
  Calculator
} from 'lucide-react';
import { motion } from 'motion/react';

interface CardPreviewPageProps {
  card: FootballCard;
  allCards: FootballCard[];
  inCollection?: boolean;
  inVault?: boolean;
  isFavorite?: boolean;
  ownedCount?: number;
  onToggleCollection?: (cardId: string) => void;
  onToggleFavorite?: (cardId: string) => void;
  onBack: () => void;
  onSelectRelatedCard: (card: FootballCard) => void;
  userEmail?: string | null;
  walletBalance?: number;
  onOpenWallet?: () => void;
  onNavigateToMarket?: (playerName?: string, tab?: 'browse' | 'sell', cardToSell?: FootballCard) => void;
  onNavigateToShop?: () => void;
}

export function CardPreviewPage({
  card,
  allCards,
  inCollection = false,
  inVault,
  isFavorite = false,
  ownedCount = 0,
  onToggleCollection,
  onToggleFavorite,
  onBack,
  onSelectRelatedCard,
  userEmail,
  walletBalance = 0,
  onOpenWallet,
  onNavigateToMarket,
  onNavigateToShop
}: CardPreviewPageProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeMarketListings, setActiveMarketListings] = useState<MarketListing[]>([]);
  const [loadingMarketListings, setLoadingMarketListings] = useState(true);

  // Listen to active listings for this card in real-time
  useEffect(() => {
    try {
      const q = query(
        collection(db, 'market_listings'),
        where('status', '==', 'active')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const matches: MarketListing[] = [];
        snapshot.forEach(docSnap => {
          const item = { id: docSnap.id, ...docSnap.data() } as MarketListing;
          if (item.cardId === card.id || item.card?.player?.toLowerCase() === card.player.toLowerCase()) {
            matches.push(item);
          }
        });
        matches.sort((a, b) => a.price - b.price);
        setActiveMarketListings(matches);
        setLoadingMarketListings(false);
      }, (err) => {
        console.error("Error loading market listings:", err);
        setLoadingMarketListings(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error(e);
      setLoadingMarketListings(false);
    }
  }, [card.id, card.player]);

  const effectiveOwnedCount = ownedCount > 0 ? ownedCount : (inVault || inCollection ? 1 : 0);
  const isOwnedInVault = effectiveOwnedCount > 0;
  const handleFavoriteClick = () => {
    if (onToggleFavorite) {
      onToggleFavorite(card.id);
    } else if (onToggleCollection) {
      onToggleCollection(card.id);
    }
  };

  const stock = getDefaultStock(card);
  const maxSupply = getDefaultMaxSupply(card);
  const isSoldOut = stock <= 0;
  const lowestMarketPrice = activeMarketListings.length > 0 ? activeMarketListings[0].price : null;

  // Price analysis
  const firstPrice = card.priceHistory && card.priceHistory.length > 0 
    ? card.priceHistory[0].price 
    : card.currentPrice;
  const lastPrice = card.currentPrice;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  // Min and max historical prices
  const historicalPrices = card.priceHistory?.map(p => p.price) || [card.currentPrice];
  const minHistoricalPrice = Math.min(...historicalPrices);
  const maxHistoricalPrice = Math.max(...historicalPrices);

  // Related cards (same team, same set, or same rarity)
  const relatedCards = allCards
    .filter(c => c.id !== card.id && !!c.imageUrl && (c.team === card.team || c.set === card.set || c.position === card.position))
    .slice(0, 4);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-fadeIn">
      {/* Top Breadcrumb & Return Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-black pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-white hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5"
        >
          <ArrowLeft size={16} /> BACK TO PREVIOUS VIEW
        </button>

        <div className="flex items-center gap-3">
          {onOpenWallet && (
            <button
              onClick={onOpenWallet}
              className="flex items-center gap-2 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            >
              <Wallet size={16} /> BALANCE: {formatCurrency(walletBalance)}
            </button>
          )}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-white hover:bg-[#D4FF00] text-black border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
          >
            {copiedLink ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-600" /> LINK COPIED!
              </>
            ) : (
              <>
                <Share2 size={16} /> SHARE CARD
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Card Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Interactive Physical Card Showcase (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="sticky top-28 w-full max-w-[380px] space-y-4">
            {/* Card Frame */}
            <div 
              onClick={() => setIsZoomed(!isZoomed)}
              className="relative aspect-[750/1050] w-full bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-[16px_16px_0px_0px_#D4FF00]"
            >
              {card.imageUrl ? (
                <img 
                  src={card.imageUrl} 
                  alt={card.player} 
                  className={`w-full h-full object-cover transition-transform duration-500 ${isZoomed ? 'scale-125' : 'group-hover:scale-105'}`} 
                />
              ) : (
                <div className="h-full flex flex-col justify-between p-6 bg-neutral-900 text-white relative">
                  <div className={cn("absolute inset-0 opacity-30 bg-gradient-to-tr", card.imageGradient)} />
                  <div className="relative z-10">
                    <span className="text-xs font-black uppercase text-[#D4FF00] tracking-widest">{card.team}</span>
                    <h3 className="text-3xl font-black uppercase tracking-tighter mt-1">{card.player}</h3>
                  </div>
                  <div className="relative z-10 text-xs font-black uppercase text-neutral-400">
                    {card.year} • {card.set} • {card.cardNumber}
                  </div>
                </div>
              )}

              {/* Rarity Corner Badge */}
              <div className="absolute top-3 left-3 z-20">
                <span className={cn(
                  "px-3 py-1 text-xs font-black uppercase tracking-widest border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                  card.rarity === 'Base' && "bg-white text-black",
                  card.rarity === 'Silver Refractor' && "bg-slate-200 text-black",
                  card.rarity === 'Gold Autograph' && "bg-amber-300 text-black",
                  card.rarity === '1-of-1 Shield' && "bg-black text-[#D4FF00]"
                )}>
                  {card.rarity}
                </span>
              </div>

              {/* Click to Zoom Hint */}
              <div className="absolute bottom-3 right-3 z-20 bg-black/80 text-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border border-white/50 backdrop-blur-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye size={12} /> {isZoomed ? 'CLICK TO FIT' : 'CLICK TO ZOOM'}
              </div>
            </div>

            {/* Visual Specs Pill Bar */}
            <div className="flex items-center justify-between gap-2 p-3 bg-neutral-100 border-2 border-black text-[10px] font-black uppercase tracking-widest">
              <span className="text-neutral-500">FORMAT: PHYSICAL 2.5×3.5"</span>
              <span className="text-black bg-[#D4FF00] px-2 py-0.5 border border-black">
                {card.rarity.toUpperCase()}
              </span>
            </div>

            {/* Transfer Market Acquisition Section */}
            <div className="space-y-3">
              {/* Market Status & Direct Buy/Search CTA */}
              <div className="bg-neutral-50 border-2 border-black p-4 space-y-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Coins size={14} className="text-black" /> P2P TRANSFER MARKET
                  </span>
                  {activeMarketListings.length > 0 ? (
                    <span className="bg-[#D4FF00] text-black px-2 py-0.5 text-[10px] font-black border border-black uppercase">
                      {activeMarketListings.length} {activeMarketListings.length === 1 ? 'LISTING' : 'LISTINGS'} AVAILABLE
                    </span>
                  ) : (
                    <span className="bg-neutral-200 text-neutral-600 px-2 py-0.5 text-[10px] font-black border border-neutral-400 uppercase">
                      0 ACTIVE LISTINGS
                    </span>
                  )}
                </div>

                {lowestMarketPrice !== null ? (
                  <div className="flex items-baseline justify-between py-1">
                    <span className="text-xs font-black uppercase text-neutral-600">BEST ASKING PRICE:</span>
                    <span className="text-xl font-black text-black font-mono">
                      {formatCurrency(lowestMarketPrice, true)}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-neutral-500 uppercase leading-snug">
                    No collectors currently have this card listed for sale on the transfer market.
                  </p>
                )}

                <button
                  onClick={() => onNavigateToMarket && onNavigateToMarket(card.player, 'browse')}
                  className="w-full py-3.5 px-4 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black font-black text-xs uppercase tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={16} />
                  {activeMarketListings.length > 0
                    ? `BUY ON TRANSFER MARKET (${formatCurrency(lowestMarketPrice!, true)})`
                    : 'SEARCH TRANSFER MARKET'}
                  <ArrowUpRight size={16} />
                </button>
              </div>

              {/* Secondary Options: Pack Shop & Sell on Market */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {onNavigateToShop && (
                  <button
                    onClick={onNavigateToShop}
                    className="py-3 px-3 bg-white hover:bg-black hover:text-white text-black border-2 border-black font-black text-[11px] uppercase tracking-wider transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={14} className="text-amber-500" />
                    OPEN BOOSTER PACKS
                  </button>
                )}
                {isOwnedInVault && onNavigateToMarket && (
                  <button
                    onClick={() => onNavigateToMarket(undefined, 'sell', card)}
                    className="py-3 px-3 bg-black hover:bg-neutral-800 text-[#D4FF00] border-2 border-black font-black text-[11px] uppercase tracking-wider transition-all shadow-[3px_3px_0px_0px_#D4FF00] flex items-center justify-center gap-1.5"
                  >
                    <Tag size={14} />
                    LIST FOR SALE ({effectiveOwnedCount} OWNED)
                  </button>
                )}
              </div>

              {/* Informative Rule Callout */}
              <div className="p-3 bg-neutral-100 border border-black/30 text-[10px] font-bold text-neutral-600 uppercase flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5 text-neutral-500" />
                <span>
                  <strong className="text-black">Database Policy:</strong> Cards cannot be purchased directly from the database catalog. Trade peer-to-peer on the Transfer Market or draw pulls from Booster Packs.
                </span>
              </div>
            </div>

            {/* Owned in Vault Status Banner if user owns it */}
            {isOwnedInVault && (
              <div className="bg-[#D4FF00]/20 border-2 border-black p-3 text-center flex items-center justify-center gap-2">
                <Trophy size={16} className="text-black" />
                <span className="text-xs font-black text-black uppercase tracking-wider">
                  🏆 YOU OWN {effectiveOwnedCount} {effectiveOwnedCount === 1 ? 'COPY' : 'COPIES'} IN YOUR VAULT
                </span>
              </div>
            )}

            {/* Favorite / Wishlist Button */}
            <button
              onClick={handleFavoriteClick}
              className={cn(
                "w-full py-3.5 px-6 border-2 font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                isFavorite 
                  ? "bg-white text-red-600 border-black hover:bg-red-50" 
                  : "bg-white text-black border-black hover:bg-[#D4FF00]"
              )}
            >
              <Heart 
                size={16} 
                className={cn(
                  "transition-colors",
                  isFavorite ? "fill-red-500 text-red-500" : "fill-transparent text-black"
                )} 
              />
              {isFavorite ? "SAVED IN YOUR FAVORITES" : "ADD TO FAVORITES (WISHLIST)"}
            </button>
          </div>
        </div>

        {/* Right Column: In-Depth Card Profile & Financial Analysis (7 Columns) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Header Card Title */}
          <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-black text-white px-2.5 py-1 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                  <span>🏟️</span> {getCardClubTeam(card) || card.team}
                </span>
                {getCardNationalTeam(card) && (
                  <span className="bg-[#D4FF00] text-black border border-black px-2.5 py-1 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                    <span>{getNationalTeamFlag(getCardNationalTeam(card))}</span> {getCardNationalTeam(card)}
                  </span>
                )}
                <span className="bg-neutral-200 text-black px-2.5 py-1 text-xs font-black uppercase tracking-widest">
                  {card.position}
                </span>
              </div>
            </div>

            <div>
              <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter text-black">
                {card.player}
              </h1>
              <p className="text-xs sm:text-sm font-black text-neutral-500 uppercase tracking-widest mt-1">
                {card.year} • {card.set} {card.edition && `• ${card.edition}`} • #{card.cardNumber}
              </p>
            </div>

            {/* Quick Spec Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-neutral-50 border-2 border-black p-3">
                <div className="text-[9px] font-black uppercase text-neutral-500">SEASON / YEAR</div>
                <div className="text-sm font-black text-black">{card.year}</div>
              </div>
              <div className="bg-neutral-50 border-2 border-black p-3">
                <div className="text-[9px] font-black uppercase text-neutral-500">SET</div>
                <div className="text-sm font-black text-black truncate">{card.set}</div>
              </div>
              <div className="bg-neutral-50 border-2 border-black p-3">
                <div className="text-[9px] font-black uppercase text-neutral-500">CARD NUMBER</div>
                <div className="text-sm font-black text-black">#{card.cardNumber}</div>
              </div>
              <div className="bg-neutral-50 border-2 border-black p-3">
                <div className="text-[9px] font-black uppercase text-neutral-500">SUPPLY LIMIT</div>
                <div className={cn(
                  "text-sm font-black truncate",
                  isSoldOut ? "text-red-600" : "text-black"
                )}>
                  {isSoldOut ? 'SOLD OUT' : `${stock} / ${maxSupply} LEFT`}
                </div>
              </div>
            </div>

            {/* Supply Limitation Status Bar */}
            <div className="bg-neutral-100 border-2 border-black p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-black uppercase">
                <span>ONLINE CARD SUPPLY & AVAILABILITY</span>
                <span className={isSoldOut ? 'text-red-600' : 'text-emerald-700'}>
                  {isSoldOut ? '0 COPIES REMAINING' : `${stock} OF ${maxSupply} AVAILABLE`}
                </span>
              </div>
              <div className="w-full h-3 bg-neutral-300 border border-black overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500",
                    isSoldOut ? "bg-red-500 w-0" : "bg-[#D4FF00]"
                  )}
                  style={{ width: `${Math.min(100, Math.max(5, (stock / maxSupply) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Market Valuation & Performance Card */}
          <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <h2 className="text-xl font-black uppercase tracking-tight text-black flex items-center gap-2">
                <TrendingUp size={22} /> VALUATION & FINANCIAL METRICS
              </h2>
              <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest bg-neutral-100 px-2 py-1 border border-black">
                LIVE MARKET ESTIMATE
              </span>
            </div>

            {/* Valuation Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-neutral-900 text-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_#D4FF00]">
                <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest mb-1">
                  CURRENT VALUE (৳)
                </p>
                <p className="text-3xl sm:text-4xl font-black text-[#D4FF00] tracking-tighter">
                  {formatCurrency(card.currentPrice)}
                </p>
              </div>

              <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-1">
                  6-MONTH MOMENTUM
                </p>
                <div className="flex items-center gap-2">
                  {isPositive ? (
                    <TrendingUp className="text-emerald-600" size={24} />
                  ) : (
                    <TrendingDown className="text-rose-600" size={24} />
                  )}
                  <p className={cn(
                    "text-2xl sm:text-3xl font-black tracking-tight",
                    isPositive ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {isPositive ? '+' : ''}{priceChangePercent.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-1">
                  HISTORICAL RANGE
                </p>
                <p className="text-lg font-black text-black">
                  {formatCurrency(minHistoricalPrice)} - {formatCurrency(maxHistoricalPrice)}
                </p>
              </div>
            </div>

            {/* Dynamic Market Valuation Formula Breakdown */}
            <div className="bg-neutral-50 border-2 border-black p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                  <Calculator size={14} className="text-black" /> DYNAMIC MARKET PRICE FORMULA
                </span>
                <span className="text-[9px] font-bold text-neutral-500 font-mono">
                  (Starting Base + Market Listings) ÷ Total Units
                </span>
              </div>
              <p className="text-[10px] font-bold text-neutral-600 uppercase leading-relaxed">
                Market Value is dynamically calculated as: <span className="text-black font-black font-mono">({formatCurrency(getCardStartingPrice(card))} base + {activeMarketListings.length > 0 ? `${formatCurrency(activeMarketListings.reduce((s, l) => s + l.price, 0))} across ${activeMarketListings.length} market listings` : '0 listed'}) ÷ {1 + activeMarketListings.length} units</span> = <strong className="text-black font-black font-mono">{formatCurrency(card.currentPrice)}</strong>.
              </p>
            </div>

            {/* Price Chart */}
            <div className="pt-4">
              <PriceChart data={card.priceHistory || []} />
            </div>

          </div>

          {/* Related Cards Grid */}
          {relatedCards.length > 0 && (
            <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <h3 className="text-lg font-black uppercase tracking-tight text-black">
                SIMILAR CARDS IN DATABASE
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {relatedCards.map(relCard => (
                  <div
                    key={relCard.id}
                    onClick={() => onSelectRelatedCard(relCard)}
                    className="cursor-pointer border-2 border-black p-2 hover:bg-[#D4FF00] transition-colors group"
                  >
                    <div className="aspect-[750/1050] bg-neutral-100 border border-black mb-2 overflow-hidden">
                      {relCard.imageUrl ? (
                        <img src={relCard.imageUrl} alt={relCard.player} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : null}
                    </div>
                    <p className="text-xs font-black uppercase truncate">{relCard.player}</p>
                    <p className="text-[10px] font-bold text-neutral-500 uppercase">{formatCurrency(relCard.currentPrice)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
