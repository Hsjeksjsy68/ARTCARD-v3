import React, { useState, useEffect } from 'react';
import { FootballCard, MarketListing, BuyRequest, MarketSettings } from '../types';
import { PriceChart } from './PriceChart';
import { 
  formatCurrency, 
  cn, 
  getDefaultStock, 
  getDefaultMaxSupply, 
  getCardStartingPrice, 
  getCardDirectUrl, 
  getCardSoldPriceStats,
  calculateDynamicMarketPrice,
  getDemandLevel,
  getPriceChangeStats,
  isAdmin
} from '../lib/utils';
import { getCardClubTeam, getCardNationalTeam, getNationalTeamFlag } from '../lib/teams';
import { db } from '../lib/firebase';
import { collection, doc, query, where, onSnapshot, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
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
  Calculator,
  Copy,
  Link2,
  Edit3,
  Upload,
  Trash2,
  X,
  Sliders,
  Palette,
  Save,
  RefreshCw
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
  card: initialCard,
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
  const [copiedDirect, setCopiedDirect] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeMarketListings, setActiveMarketListings] = useState<MarketListing[]>([]);
  const [allMarketListings, setAllMarketListings] = useState<MarketListing[]>([]);
  const [loadingMarketListings, setLoadingMarketListings] = useState(true);
  const [buyRequests, setBuyRequests] = useState<BuyRequest[]>([]);
  const [marketSettings, setMarketSettings] = useState<MarketSettings | undefined>(undefined);
  const [totalActiveUsers, setTotalActiveUsers] = useState<number>(100);

  const [uniqueOwnersCount, setUniqueOwnersCount] = useState<number>(0);
  const [completedTxPrices, setCompletedTxPrices] = useState<number[]>([]);

  // Local card state so admin edits reflect immediately
  const [localCard, setLocalCard] = useState<FootballCard>(initialCard);
  const card = localCard;

  useEffect(() => {
    setLocalCard(initialCard);
  }, [initialCard]);

  // Admin edit modal states
  const isUserAdmin = isAdmin(userEmail);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [isDeletingCard, setIsDeletingCard] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);
  
  const [editForm, setEditForm] = useState({
    player: card.player || '',
    team: getCardClubTeam(card) || card.team || '',
    nationalTeam: getCardNationalTeam(card) || '',
    position: card.position || 'Forward',
    year: card.year || 2024,
    season: card.season || `${card.year || 2024}`,
    set: card.set || '',
    cardName: card.cardName || '',
    edition: card.edition || '1st Edition',
    rarity: card.rarity || 'Base',
    cardNumber: card.cardNumber || '',
    imageUrl: card.imageUrl || '',
    imageGradient: card.imageGradient || 'from-zinc-300 via-gray-400 to-zinc-300',
    basePrice: card.basePrice ?? getCardStartingPrice(card),
    currentPrice: card.currentPrice ?? 100,
    stock: card.stock ?? getDefaultStock(card),
    maxSupply: card.maxSupply ?? getDefaultMaxSupply(card),
    demandSensitivity: card.demandSensitivity ?? (card.pricingConfig?.kFactor ?? 2),
    minPrice: card.minPrice ?? '',
    maxPrice: card.maxPrice ?? '',
    lastSalePrice: card.lastSalePrice ?? ''
  });

  const handleOpenEditModal = () => {
    setEditForm({
      player: localCard.player || '',
      team: getCardClubTeam(localCard) || localCard.team || '',
      nationalTeam: getCardNationalTeam(localCard) || '',
      position: localCard.position || 'Forward',
      year: localCard.year || 2024,
      season: localCard.season || `${localCard.year || 2024}`,
      set: localCard.set || '',
      cardName: localCard.cardName || '',
      edition: localCard.edition || '1st Edition',
      rarity: localCard.rarity || 'Base',
      cardNumber: localCard.cardNumber || '',
      imageUrl: localCard.imageUrl || '',
      imageGradient: localCard.imageGradient || 'from-zinc-300 via-gray-400 to-zinc-300',
      basePrice: localCard.basePrice ?? getCardStartingPrice(localCard),
      currentPrice: localCard.currentPrice ?? 100,
      stock: localCard.stock ?? getDefaultStock(localCard),
      maxSupply: localCard.maxSupply ?? getDefaultMaxSupply(localCard),
      demandSensitivity: localCard.demandSensitivity ?? (localCard.pricingConfig?.kFactor ?? 2),
      minPrice: localCard.minPrice ?? '',
      maxPrice: localCard.maxPrice ?? '',
      lastSalePrice: localCard.lastSalePrice ?? ''
    });
    setEditSuccessMsg(null);
    setIsEditModalOpen(true);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result) {
        setEditForm(prev => ({ ...prev, imageUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCardAdmin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingCard(true);
    try {
      const cardRef = doc(db, 'cards', localCard.id);
      const updatedData: Partial<FootballCard> = {
        player: editForm.player.trim(),
        team: editForm.team.trim(),
        club: editForm.team.trim(),
        nationalTeam: editForm.nationalTeam.trim() || undefined,
        position: editForm.position,
        year: Number(editForm.year) || 2024,
        season: editForm.season.trim() || undefined,
        set: editForm.set.trim(),
        cardName: editForm.cardName.trim() || undefined,
        edition: editForm.edition.trim(),
        rarity: editForm.rarity as any,
        cardNumber: editForm.cardNumber.trim(),
        imageUrl: editForm.imageUrl.trim() || undefined,
        imageGradient: editForm.imageGradient,
        basePrice: Number(editForm.basePrice) || 100,
        currentPrice: Number(editForm.currentPrice) || 100,
        stock: Number(editForm.stock),
        maxSupply: Number(editForm.maxSupply),
        demandSensitivity: Number(editForm.demandSensitivity) || 2,
        minPrice: editForm.minPrice !== '' ? Number(editForm.minPrice) : undefined,
        maxPrice: editForm.maxPrice !== '' ? Number(editForm.maxPrice) : undefined,
        lastSalePrice: editForm.lastSalePrice !== '' ? Number(editForm.lastSalePrice) : undefined
      };

      await updateDoc(cardRef, updatedData as any);
      setLocalCard(prev => ({ ...prev, ...updatedData } as FootballCard));
      setEditSuccessMsg('Card details successfully saved to database!');
      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      console.error('Failed to update card:', err);
      alert('Failed to update card: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleDeleteCardAdmin = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${localCard.player}" (#${localCard.cardNumber})? This action cannot be undone.`)) {
      return;
    }
    setIsDeletingCard(true);
    try {
      await deleteDoc(doc(db, 'cards', localCard.id));
      alert('Card has been deleted from database.');
      setIsEditModalOpen(false);
      onBack();
    } catch (err: any) {
      console.error('Error deleting card:', err);
      alert('Failed to delete card: ' + err?.message);
    } finally {
      setIsDeletingCard(false);
    }
  };

  // Generate canonical direct URL for this single card page based on card number
  const directCardUrl = getCardDirectUrl(localCard);

  // Listen to listings, buy requests, unique owners, and completed transactions for this card in real-time
  useEffect(() => {
    try {
      const qListings = collection(db, 'market_listings');
      const unsubscribeListings = onSnapshot(qListings, (snapshot) => {
        const activeMatches: MarketListing[] = [];
        const allMatches: MarketListing[] = [];
        snapshot.forEach(docSnap => {
          const item = { id: docSnap.id, ...docSnap.data() } as MarketListing;
          if (item.cardId === card.id || item.card?.id === card.id || item.card?.player?.toLowerCase() === card.player.toLowerCase()) {
            allMatches.push(item);
            if (item.status === 'active') {
              activeMatches.push(item);
            }
          }
        });
        activeMatches.sort((a, b) => a.price - b.price);
        setActiveMarketListings(activeMatches);
        setAllMarketListings(allMatches);
        setLoadingMarketListings(false);
      }, (err) => {
        console.error("Error loading market listings:", err);
        setLoadingMarketListings(false);
      });

      const qBuyRequests = collection(db, 'buy_requests');
      const unsubscribeBuy = onSnapshot(qBuyRequests, (snapshot) => {
        const activeRequests: BuyRequest[] = [];
        snapshot.forEach(docSnap => {
          const item = { id: docSnap.id, ...docSnap.data() } as BuyRequest;
          if ((item.cardId === card.id || item.card?.id === card.id || item.card?.player?.toLowerCase() === card.player.toLowerCase()) && item.status === 'active') {
            activeRequests.push(item);
          }
        });
        setBuyRequests(activeRequests);
      }, () => {});

      const qSettings = doc(db, 'market_settings', 'global');
      const unsubscribeSettings = onSnapshot(qSettings, (docSnap) => {
        if (docSnap.exists()) {
          setMarketSettings(docSnap.data() as MarketSettings);
        }
      }, () => {});

      const qUsers = collection(db, 'users');
      const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
        setTotalActiveUsers(Math.max(10, snapshot.size || 100));
        let owners = 0;
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const vault: string[] = Array.isArray(data.vaultIds) ? data.vaultIds : (Array.isArray(data.collectionIds) ? data.collectionIds : []);
          if (vault.includes(card.id)) {
            owners++;
          }
        });
        setUniqueOwnersCount(owners);
      }, () => {});

      const qTransactions = collection(db, 'transactions');
      const unsubscribeTx = onSnapshot(qTransactions, (snapshot) => {
        const prices: number[] = [];
        snapshot.forEach(docSnap => {
          const t = docSnap.data();
          if (t.cardId === card.id && (t.type === 'market_buy' || t.type === 'buy_card' || t.type === 'market_sell')) {
            const amt = Math.abs(Number(t.amount));
            if (!isNaN(amt) && isFinite(amt) && amt > 0) {
              prices.push(amt);
            }
          }
        });
        setCompletedTxPrices(prices);
      }, () => {});

      return () => {
        unsubscribeListings();
        unsubscribeBuy();
        unsubscribeSettings();
        unsubscribeUsers();
        unsubscribeTx();
      };
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
    navigator.clipboard.writeText(directCardUrl || window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyDirectLink = () => {
    navigator.clipboard.writeText(directCardUrl || window.location.href);
    setCopiedDirect(true);
    setTimeout(() => setCopiedDirect(false), 2500);
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
          {isUserAdmin && (
            <button
              onClick={handleOpenEditModal}
              className="flex items-center gap-2 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5"
            >
              <Edit3 size={16} /> 🛠️ EDIT CARD (ADMIN)
            </button>
          )}
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

              {isUserAdmin && (
                <button
                  onClick={handleOpenEditModal}
                  className="bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-3 py-1 text-xs font-black uppercase tracking-widest transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5"
                >
                  <Edit3 size={13} /> EDIT ALL CARD DETAILS
                </button>
              )}
            </div>

            <div>
              <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter text-black">
                {card.player}
              </h1>
              <p className="text-xs sm:text-sm font-black text-neutral-500 uppercase tracking-widest mt-1">
                {card.year} • {card.set} {card.edition && `• ${card.edition}`} • #{card.cardNumber}
              </p>
            </div>

            {/* Direct Single Card Page Link Banner */}
            <div className="bg-neutral-900 text-white border-2 border-black p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-2.5 overflow-hidden max-w-full">
                <span className="bg-[#D4FF00] text-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Link2 size={12} /> CARD LINK
                </span>
                <span className="text-[#D4FF00] font-mono text-xs font-bold truncate">
                  #card-{card.cardNumber}
                </span>
                <span className="text-neutral-400 text-[10px] hidden md:inline font-mono truncate">
                  ({directCardUrl})
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyDirectLink}
                className="w-full sm:w-auto bg-white hover:bg-[#D4FF00] text-black px-3.5 py-1.5 text-xs font-black uppercase tracking-wider border border-black transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                {copiedDirect ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-700" /> COPIED LINK!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> COPY DIRECT LINK
                  </>
                )}
              </button>
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
              <div 
                onClick={handleCopyDirectLink}
                title="Click to copy single card page link by card number"
                className="bg-neutral-50 hover:bg-[#D4FF00]/20 border-2 border-black p-3 cursor-pointer transition-colors group/cardno relative"
              >
                <div className="flex items-center justify-between text-[9px] font-black uppercase text-neutral-500">
                  <span>CARD NUMBER</span>
                  <Copy size={10} className="text-neutral-400 group-hover/cardno:text-black" />
                </div>
                <div className="text-sm font-black text-black flex items-center gap-1">
                  <span>#{card.cardNumber}</span>
                  {copiedDirect && <span className="text-[9px] text-emerald-600 font-bold ml-1">COPIED</span>}
                </div>
              </div>
              <div className="bg-neutral-50 border-2 border-black p-3">
                <div className="text-[9px] font-black uppercase text-neutral-500">
                  {isOwnedInVault ? 'VAULT STATUS' : 'SUPPLY LIMIT'}
                </div>
                <div className={cn(
                  "text-sm font-black truncate",
                  !isOwnedInVault && isSoldOut ? "text-red-600" : "text-black"
                )}>
                  {isOwnedInVault 
                    ? `OWNED (${effectiveOwnedCount} ${effectiveOwnedCount === 1 ? 'COPY' : 'COPIES'})` 
                    : (isSoldOut ? 'SOLD OUT' : `${stock} / ${maxSupply} LEFT`)}
                </div>
              </div>
            </div>

            {/* Supply Limitation Status Bar (Hidden if Owned in Vault) */}
            {!isOwnedInVault && (
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
            )}
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
            {(() => {
              const basePrice = getCardStartingPrice(card);
              const activeBuyRequestsCount = buyRequests.length;
              const activeSellListingsCount = activeMarketListings.length;
              const kFactor = card.pricingConfig?.kFactor ?? marketSettings?.defaultK ?? 2;
              
              const pricingResult = calculateDynamicMarketPrice(card, {
                buyRequests,
                listings: activeMarketListings,
                totalActiveUsers,
                settings: marketSettings
              });
              
              const demandLevel = getDemandLevel(activeBuyRequestsCount, activeSellListingsCount);
              const minAllowed = Math.round(basePrice * ((marketSettings?.minPricePercentage ?? 50) / 100));
              const maxAllowed = Math.round(basePrice * ((marketSettings?.maxPricePercentage ?? 500) / 100));

              return (
                <div className="bg-neutral-50 border-2 border-black p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black/10 pb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                      <Calculator size={16} className="text-black" /> DYNAMIC MARKET PRICING ENGINE
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 text-[9px] font-black uppercase border",
                      demandLevel.badgeBg,
                      demandLevel.badgeBorder
                    )}>
                      DEMAND: {demandLevel.level} ({demandLevel.ratio === Infinity ? '∞' : `${demandLevel.ratio.toFixed(2)}x`})
                    </span>
                  </div>

                  {/* Formula Definition */}
                  <div className="bg-black text-[#D4FF00] p-3 border border-black font-mono text-[11px] font-bold space-y-1">
                    <div className="text-white text-[9px] uppercase tracking-widest">LIVE FORMULA:</div>
                    <div className="leading-relaxed">
                      Market Price = Base Price × (1 + ((Buy Requests − Sell Listings) ÷ Total Active Users) × K)
                    </div>
                  </div>

                  {/* Formula Variable Values */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                    <div className="bg-white border border-black p-2">
                      <span className="block text-[8px] font-sans font-black text-neutral-500 uppercase">BASE PRICE</span>
                      <span className="font-black text-black">{formatCurrency(basePrice)}</span>
                    </div>
                    <div className="bg-white border border-black p-2">
                      <span className="block text-[8px] font-sans font-black text-neutral-500 uppercase">BUY REQUESTS</span>
                      <span className="font-black text-blue-600">{activeBuyRequestsCount}</span>
                    </div>
                    <div className="bg-white border border-black p-2">
                      <span className="block text-[8px] font-sans font-black text-neutral-500 uppercase">SELL LISTINGS</span>
                      <span className="font-black text-amber-600">{activeSellListingsCount}</span>
                    </div>
                    <div className="bg-white border border-black p-2">
                      <span className="block text-[8px] font-sans font-black text-neutral-500 uppercase">K SENSITIVITY</span>
                      <span className="font-black text-purple-600">{kFactor}</span>
                    </div>
                  </div>

                  {/* Price Protection Rules */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase text-neutral-600 bg-white border border-black p-2.5">
                    <span>
                      🛡️ Price Protection Bounds: <strong>{formatCurrency(minAllowed)}</strong> (50% min) - <strong>{formatCurrency(maxAllowed)}</strong> (500% max)
                    </span>
                    <span className="font-mono font-black text-black">
                      FINAL VALUE: {formatCurrency(pricingResult.finalPrice)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Price Chart */}
            <div className="pt-4">
              <PriceChart
                data={card.priceHistory || []}
                currentPrice={card.currentPrice}
                startingPrice={getCardStartingPrice(card)}
              />
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

      {/* ========================================== */}
      {/* ADMIN EDIT ALL DETAILS MODAL               */}
      {/* ========================================== */}
      {isUserAdmin && isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white border-4 border-black p-4 sm:p-6 w-full max-w-4xl max-h-[92vh] overflow-y-auto space-y-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] my-auto">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                  <Sliders size={22} className="text-[#D4FF00] bg-black p-0.5" /> 
                  ADMIN: EDIT CARD DETAILS ({localCard.player})
                </h3>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                  Modify identity, affiliations, market formula parameters, stock limits, and artwork.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 hover:bg-neutral-100 border-2 border-black transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {editSuccessMsg && (
              <div className="p-3 bg-emerald-50 border-2 border-emerald-600 text-emerald-800 text-xs font-black uppercase flex items-center gap-2">
                <CheckCircle2 size={16} /> {editSuccessMsg}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Live Card Preview & Image Upload (4 cols) */}
              <div className="lg:col-span-4 space-y-4 bg-neutral-50 p-4 border-2 border-black">
                <span className="block text-[10px] font-black uppercase text-neutral-600 tracking-wider">
                  LIVE CARD PREVIEW
                </span>
                <div className="aspect-[750/1050] w-full max-w-[240px] mx-auto bg-neutral-900 border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative flex flex-col justify-between p-3">
                  {editForm.imageUrl ? (
                    <img
                      src={editForm.imageUrl}
                      alt={editForm.player || 'Preview'}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`absolute inset-0 opacity-40 bg-gradient-to-tr ${editForm.imageGradient || 'from-zinc-300 via-gray-400 to-zinc-300'}`} />
                  )}
                  <div className="relative z-10 flex justify-between items-start">
                    <span className="text-[9px] font-black uppercase bg-black/80 text-[#D4FF00] px-1.5 py-0.5 border border-black/40">
                      {editForm.team || 'CLUB'}
                    </span>
                    <span className="text-[9px] font-mono font-bold bg-white/90 text-black px-1.5 py-0.5 border border-black/40">
                      #{editForm.cardNumber || '000'}
                    </span>
                  </div>
                  <div className="relative z-10 bg-black/85 text-white p-2 border border-white/20">
                    <div className="text-xs font-black uppercase truncate text-white">
                      {editForm.player || 'PLAYER NAME'}
                    </div>
                    <div className="flex justify-between items-center text-[8px] font-bold text-neutral-300 uppercase mt-0.5">
                      <span>{editForm.rarity || 'Base'}</span>
                      <span className="text-[#D4FF00] font-mono font-black">{formatCurrency(Number(editForm.currentPrice || 0))}</span>
                    </div>
                  </div>
                </div>

                {/* Direct Image Upload & URL */}
                <div className="space-y-2 pt-2 border-t border-black/10 text-xs font-black uppercase">
                  <label className="block text-[9px] text-neutral-600">CARD ARTWORK / PHOTO</label>
                  <label className="flex items-center justify-center gap-2 w-full py-2 bg-black text-[#D4FF00] hover:bg-neutral-800 border-2 border-black cursor-pointer text-xs font-black transition-all">
                    <Upload size={14} /> UPLOAD IMAGE FILE
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFileUpload}
                    />
                  </label>
                  <div>
                    <label className="block text-[8px] text-neutral-500 mb-0.5">OR PASTE IMAGE URL</label>
                    <input
                      type="text"
                      name="imageUrl"
                      value={editForm.imageUrl || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                      placeholder="https://..."
                      className="w-full bg-white border-2 border-black p-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Complete Card Data Fields (8 cols) */}
              <div className="lg:col-span-8 space-y-4 text-xs font-black uppercase">
                {/* Group 1: Identity & Positions */}
                <div className="bg-neutral-50 p-3.5 border-2 border-black space-y-3">
                  <span className="block text-[9px] font-black text-neutral-500 tracking-wider">
                    1. PLAYER & TEAM IDENTIFIERS
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">PLAYER FULL NAME *</label>
                      <input
                        type="text"
                        name="player"
                        value={editForm.player}
                        onChange={(e) => setEditForm(prev => ({ ...prev, player: e.target.value }))}
                        className="w-full bg-white border-2 border-black p-2 font-black"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">CARD NUMBER (#) *</label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={editForm.cardNumber}
                        onChange={(e) => setEditForm(prev => ({ ...prev, cardNumber: e.target.value }))}
                        placeholder="e.g. 001 or #07"
                        className="w-full bg-white border-2 border-black p-2 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">CLUB TEAM *</label>
                      <input
                        type="text"
                        name="team"
                        value={editForm.team}
                        onChange={(e) => setEditForm(prev => ({ ...prev, team: e.target.value }))}
                        placeholder="e.g. REAL MADRID"
                        className="w-full bg-white border-2 border-black p-2 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">NATIONAL TEAM (COUNTRY)</label>
                      <input
                        type="text"
                        name="nationalTeam"
                        value={editForm.nationalTeam}
                        onChange={(e) => setEditForm(prev => ({ ...prev, nationalTeam: e.target.value }))}
                        placeholder="e.g. ARGENTINA"
                        className="w-full bg-white border-2 border-black p-2 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">PITCH POSITION</label>
                      <select
                        name="position"
                        value={editForm.position}
                        onChange={(e) => setEditForm(prev => ({ ...prev, position: e.target.value as any }))}
                        className="w-full bg-white border-2 border-black p-2"
                      >
                        <option value="Forward">Forward</option>
                        <option value="Midfielder">Midfielder</option>
                        <option value="Defender">Defender</option>
                        <option value="Goalkeeper">Goalkeeper</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">SEASON / YEAR</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="number"
                          name="year"
                          value={editForm.year}
                          onChange={(e) => setEditForm(prev => ({ ...prev, year: Number(e.target.value) }))}
                          className="w-full bg-white border-2 border-black p-2 font-mono"
                        />
                        <input
                          type="text"
                          name="season"
                          value={editForm.season}
                          onChange={(e) => setEditForm(prev => ({ ...prev, season: e.target.value }))}
                          placeholder="2024-25"
                          className="w-full bg-white border-2 border-black p-2 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Group 2: Set, Edition & Rarity */}
                <div className="bg-neutral-50 p-3.5 border-2 border-black space-y-3">
                  <span className="block text-[9px] font-black text-neutral-500 tracking-wider">
                    2. SET, EDITION & RARITY
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">SET / COLLECTION</label>
                      <input
                        type="text"
                        name="set"
                        value={editForm.set}
                        onChange={(e) => setEditForm(prev => ({ ...prev, set: e.target.value }))}
                        placeholder="e.g. Topps Chrome UCL"
                        className="w-full bg-white border-2 border-black p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">CARD SUBTITLE / NAME</label>
                      <input
                        type="text"
                        name="cardName"
                        value={editForm.cardName}
                        onChange={(e) => setEditForm(prev => ({ ...prev, cardName: e.target.value }))}
                        placeholder="e.g. Golden Striker"
                        className="w-full bg-white border-2 border-black p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">EDITION</label>
                      <input
                        type="text"
                        name="edition"
                        value={editForm.edition}
                        onChange={(e) => setEditForm(prev => ({ ...prev, edition: e.target.value }))}
                        placeholder="1st Edition"
                        className="w-full bg-white border-2 border-black p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">RARITY TIER</label>
                      <select
                        name="rarity"
                        value={editForm.rarity}
                        onChange={(e) => setEditForm(prev => ({ ...prev, rarity: e.target.value as any }))}
                        className="w-full bg-white border-2 border-black p-2 font-bold"
                      >
                        <option value="Base">Base</option>
                        <option value="Silver Refractor">Silver Refractor</option>
                        <option value="Gold Autograph">Gold Autograph</option>
                        <option value="1-of-1 Shield">1-of-1 Shield</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">CURRENT STOCK</label>
                      <input
                        type="number"
                        name="stock"
                        value={editForm.stock}
                        onChange={(e) => setEditForm(prev => ({ ...prev, stock: Number(e.target.value) }))}
                        className="w-full bg-white border-2 border-black p-2 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">MAX SUPPLY LIMIT</label>
                      <input
                        type="number"
                        name="maxSupply"
                        value={editForm.maxSupply}
                        onChange={(e) => setEditForm(prev => ({ ...prev, maxSupply: Number(e.target.value) }))}
                        className="w-full bg-white border-2 border-black p-2 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Group 3: Financial & Dynamic Pricing Controls */}
                <div className="bg-neutral-50 p-3.5 border-2 border-black space-y-3">
                  <span className="block text-[9px] font-black text-neutral-500 tracking-wider">
                    3. VALUATION & DYNAMIC FORMULA PARAMETERS
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">BASE STARTING PRICE (৳)</label>
                      <input
                        type="number"
                        name="basePrice"
                        value={editForm.basePrice}
                        onChange={(e) => setEditForm(prev => ({ ...prev, basePrice: Number(e.target.value) }))}
                        className="w-full bg-white border-2 border-black p-2 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">CURRENT MARKET VALUE (৳)</label>
                      <input
                        type="number"
                        name="currentPrice"
                        value={editForm.currentPrice}
                        onChange={(e) => setEditForm(prev => ({ ...prev, currentPrice: Number(e.target.value) }))}
                        className="w-full bg-white border-2 border-black p-2 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">DEMAND K SENSITIVITY</label>
                      <input
                        type="number"
                        step="0.1"
                        name="demandSensitivity"
                        value={editForm.demandSensitivity}
                        onChange={(e) => setEditForm(prev => ({ ...prev, demandSensitivity: Number(e.target.value) }))}
                        className="w-full bg-white border-2 border-black p-2 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">MIN PRICE FLOOR (৳)</label>
                      <input
                        type="number"
                        name="minPrice"
                        value={editForm.minPrice}
                        onChange={(e) => setEditForm(prev => ({ ...prev, minPrice: e.target.value === '' ? '' : Number(e.target.value) }))}
                        placeholder="Optional floor"
                        className="w-full bg-white border-2 border-black p-2 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">MAX PRICE CEILING (৳)</label>
                      <input
                        type="number"
                        name="maxPrice"
                        value={editForm.maxPrice}
                        onChange={(e) => setEditForm(prev => ({ ...prev, maxPrice: e.target.value === '' ? '' : Number(e.target.value) }))}
                        placeholder="Optional cap"
                        className="w-full bg-white border-2 border-black p-2 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 text-[9px] mb-1">LAST SALE PRICE (৳)</label>
                      <input
                        type="number"
                        name="lastSalePrice"
                        value={editForm.lastSalePrice}
                        onChange={(e) => setEditForm(prev => ({ ...prev, lastSalePrice: e.target.value === '' ? '' : Number(e.target.value) }))}
                        placeholder="Last executed"
                        className="w-full bg-white border-2 border-black p-2 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t-2 border-black">
              <button
                type="button"
                onClick={handleDeleteCardAdmin}
                disabled={isDeletingCard}
                className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border-2 border-rose-600 font-black uppercase text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={15} /> {isDeletingCard ? 'DELETING...' : 'PERMANENTLY DELETE CARD'}
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 sm:flex-initial px-6 py-2.5 bg-white hover:bg-neutral-100 border-2 border-black font-black uppercase text-xs transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleSaveCardAdmin}
                  disabled={isSavingCard}
                  className="flex-1 sm:flex-initial px-8 py-2.5 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black font-black uppercase text-xs transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
                >
                  {isSavingCard ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" /> SAVING...
                    </>
                  ) : (
                    <>
                      <Save size={15} /> SAVE ALL CHANGES
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
