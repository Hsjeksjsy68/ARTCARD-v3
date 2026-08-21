import React, { useState } from 'react';
import { FootballCard } from '../types';
import { PriceChart } from './PriceChart';
import { formatCurrency, cn, getDefaultStock, getDefaultMaxSupply } from '../lib/utils';
import { getCardClubTeam, getCardNationalTeam, getNationalTeamFlag } from '../lib/teams';
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
  Trophy
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
  onBuyCard?: (card: FootballCard) => void;
  onOpenWallet?: () => void;
  isBuying?: boolean;
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
  onBuyCard,
  onOpenWallet,
  isBuying = false
}: CardPreviewPageProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

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
  const canAfford = walletBalance >= card.currentPrice;

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

            {/* Direct Buy Card Button with Wallet */}
            {onBuyCard && (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    if (isSoldOut) return;
                    if (!canAfford && onOpenWallet) {
                      onOpenWallet();
                    } else {
                      onBuyCard(card);
                    }
                  }}
                  disabled={isSoldOut || isBuying}
                  className={cn(
                    "w-full py-4 px-6 border-2 font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                    isSoldOut
                      ? "bg-neutral-200 text-neutral-500 border-neutral-400 cursor-not-allowed"
                      : isOwnedInVault
                      ? "bg-black text-[#D4FF00] hover:bg-neutral-900 border-black"
                      : canAfford
                      ? "bg-[#D4FF00] text-black border-black hover:bg-black hover:text-[#D4FF00]"
                      : "bg-white text-black border-black hover:bg-[#D4FF00]"
                  )}
                >
                  {isBuying ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      PROCESSING PURCHASE...
                    </div>
                  ) : isSoldOut ? (
                    <>
                      <AlertCircle size={20} />
                      OUT OF STOCK / SOLD OUT
                    </>
                  ) : isOwnedInVault ? (
                    <>
                      <PackageCheck size={20} />
                      BUY ANOTHER COPY {effectiveOwnedCount > 1 ? `(OWNED: ${effectiveOwnedCount})` : ''} • {formatCurrency(card.currentPrice)}
                    </>
                  ) : canAfford ? (
                    <>
                      <ShoppingCart size={20} />
                      BUY CARD TO VAULT ({formatCurrency(card.currentPrice)})
                    </>
                  ) : (
                    <>
                      <Wallet size={20} />
                      TOP UP & BUY TO VAULT ({formatCurrency(card.currentPrice)})
                    </>
                  )}
                </button>
              </div>
            )}

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
