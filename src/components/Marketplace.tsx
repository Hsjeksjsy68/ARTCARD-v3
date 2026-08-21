import React, { useState, useEffect } from 'react';
import { FootballCard, MarketListing, UserProfileData } from '../types';
import { formatCurrency, cn, getDefaultStock } from '../lib/utils';
import { getCardClubTeam, getCardNationalTeam, getNationalTeamFlag } from '../lib/teams';
import { 
  db, 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  onSnapshot, 
  increment, 
  query, 
  where, 
  orderBy,
  User 
} from '../lib/firebase';
import { 
  Store, 
  PlusCircle, 
  Search, 
  ArrowUpDown, 
  SlidersHorizontal, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Trophy, 
  Sparkles, 
  User as UserIcon, 
  ShoppingBag, 
  RefreshCw, 
  DollarSign, 
  Tag, 
  Flame, 
  History, 
  Coins, 
  ShieldCheck, 
  ChevronRight, 
  ExternalLink,
  Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MarketplaceProps {
  user: User | null;
  walletBalance: number;
  allCards: FootballCard[];
  vaultIds: Set<string> | string[];
  onOpenWallet: () => void;
  onOpenAuth: () => void;
  onSelectCard: (card: FootballCard) => void;
  onViewUserProfile: (userId: string) => void;
  onToast: (msg: string) => void;
}

export function Marketplace({
  user,
  walletBalance,
  allCards,
  vaultIds,
  onOpenWallet,
  onOpenAuth,
  onSelectCard,
  onViewUserProfile,
  onToast
}: MarketplaceProps) {
  const [activeMarketTab, setActiveMarketTab] = useState<'browse' | 'sell' | 'my-orders' | 'history'>('browse');
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRarity, setFilterRarity] = useState('');
  const [filterClub, setFilterClub] = useState('');
  const [filterNationalTeam, setFilterNationalTeam] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterEdition, setFilterEdition] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'newest' | 'player-asc'>('newest');

  // Sell Card States
  const [selectedVaultCard, setSelectedVaultCard] = useState<FootballCard | null>(null);
  const [sellPriceInput, setSellPriceInput] = useState<number>(100);
  const [isListingCard, setIsListingCard] = useState(false);

  // Buy Processing
  const [isProcessingBuy, setIsProcessingBuy] = useState<string | null>(null);

  // Listen to active Market Listings in real time
  useEffect(() => {
    setLoadingListings(true);
    const listingsRef = collection(db, 'market_listings');
    const unsubscribe = onSnapshot(listingsRef, (snapshot) => {
      const loaded: MarketListing[] = [];
      snapshot.forEach(docSnap => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as MarketListing);
      });
      setListings(loaded);
      setLoadingListings(false);
    }, (err) => {
      console.error("Error fetching market listings:", err);
      setLoadingListings(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter active listings for browsing
  const activeListings = listings.filter(l => l.status === 'active');
  const myListings = user ? listings.filter(l => l.sellerId === user.uid) : [];
  const soldHistory = listings.filter(l => l.status === 'sold');

  // Count how many copies user owns of each card
  const userVaultArray: string[] = Array.isArray(vaultIds) ? vaultIds : Array.from(vaultIds);
  const ownedCountMap = new Map<string, number>();
  userVaultArray.forEach(id => {
    ownedCountMap.set(id, (ownedCountMap.get(id) || 0) + 1);
  });

  // Count active listings per cardId for the current user
  const activeListingsCountMap = new Map<string, number>();
  myListings.filter(l => l.status === 'active').forEach(l => {
    activeListingsCountMap.set(l.cardId, (activeListingsCountMap.get(l.cardId) || 0) + 1);
  });

  // Available cards: user owns more copies than currently listed
  const availableVaultCards = allCards.filter(c => {
    const totalOwned = ownedCountMap.get(c.id) || 0;
    const currentlyListed = activeListingsCountMap.get(c.id) || 0;
    return totalOwned > currentlyListed;
  });

  // Filtered browse list
  const filteredListings = activeListings.filter(l => {
    const card = l.card;
    if (!card) return false;

    // Search query matching player, club team, national team, set
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const club = (getCardClubTeam(card) || card.team || '').toLowerCase();
      const nation = (getCardNationalTeam(card) || '').toLowerCase();
      const match = (card.player || '').toLowerCase().includes(q) ||
                    club.includes(q) ||
                    nation.includes(q) ||
                    (card.set || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    const cardClub = getCardClubTeam(card) || card.team || '';
    const cardNation = getCardNationalTeam(card) || '';

    if (filterRarity && card.rarity !== filterRarity) return false;
    if (filterClub && cardClub.toLowerCase() !== filterClub.toLowerCase()) return false;
    if (filterNationalTeam && cardNation.toLowerCase() !== filterNationalTeam.toLowerCase()) return false;
    if (filterPosition && card.position !== filterPosition) return false;
    if (filterEdition && card.edition !== filterEdition) return false;

    if (minPrice && l.price < Number(minPrice)) return false;
    if (maxPrice && l.price > Number(maxPrice)) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'player-asc') return (a.card.player || '').localeCompare(b.card.player || '');
    return (b.listedAt || 0) - (a.listedAt || 0); // newest first
  });

  // Extract unique clubs, national teams and editions for filter dropdowns
  const availableClubs = Array.from(new Set(allCards.map(c => getCardClubTeam(c) || c.team).filter(Boolean))).sort();
  const availableNations = Array.from(new Set(allCards.map(c => getCardNationalTeam(c)).filter(Boolean))).sort();
  const availableEditions = Array.from(new Set(allCards.map(c => c.edition).filter(Boolean))).sort();

  // Handle Listing a Vault card for sale
  const handleConfirmListCard = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!selectedVaultCard) return;

    if (!sellPriceInput || sellPriceInput <= 0) {
      alert("Please enter a valid listing price in ARTCOIN.");
      return;
    }

    setIsListingCard(true);
    try {
      const listingId = `listing_${user.uid}_${selectedVaultCard.id}_${Date.now()}`;
      const listingRef = doc(db, 'market_listings', listingId);

      const newListing: Omit<MarketListing, 'id'> = {
        cardId: selectedVaultCard.id,
        card: selectedVaultCard,
        sellerId: user.uid,
        sellerName: user.displayName || user.email?.split('@')[0] || 'Collector',
        sellerAvatar: user.photoURL || '',
        price: Number(sellPriceInput),
        status: 'active',
        listedAt: Date.now()
      };

      await setDoc(listingRef, newListing);

      onToast(`🎉 Listed ${selectedVaultCard.player} on Market for ${formatCurrency(sellPriceInput)}!`);
      setSelectedVaultCard(null);
      setActiveMarketTab('my-orders');
    } catch (err: any) {
      console.error("Listing error:", err);
      alert(`Failed to list card: ${err.message || 'Please try again.'}`);
    } finally {
      setIsListingCard(false);
    }
  };

  // Handle Cancelling a Listing (Returns card to active vault usage)
  const handleCancelListing = async (listing: MarketListing) => {
    if (!user || user.uid !== listing.sellerId) return;

    try {
      const listingRef = doc(db, 'market_listings', listing.id);
      await updateDoc(listingRef, {
        status: 'cancelled'
      });
      onToast(`Listing cancelled. ${listing.card.player} is back in your Vault.`);
    } catch (err: any) {
      console.error("Cancel listing error:", err);
      alert("Failed to cancel listing.");
    }
  };

  // Handle Buying a Card from another user
  const handleBuyMarketCard = async (listing: MarketListing) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (user.uid === listing.sellerId) {
      alert("You cannot buy your own marketplace listing.");
      return;
    }

    if (walletBalance < listing.price) {
      onToast(`Insufficient ARTCOIN balance. You need ${formatCurrency(listing.price)}.`);
      onOpenWallet();
      return;
    }

    setIsProcessingBuy(listing.id);

    try {
      const buyerRef = doc(db, 'users', user.uid);
      const sellerRef = doc(db, 'users', listing.sellerId);
      const listingRef = doc(db, 'market_listings', listing.id);

      // 1. Deduct ARTCOIN from buyer & append card to buyer's vault
      const nextBuyerVault = [...userVaultArray, listing.cardId];

      await setDoc(buyerRef, {
        email: user.email,
        walletBalance: increment(-listing.price),
        vaultIds: nextBuyerVault,
        collectionIds: nextBuyerVault
      }, { merge: true });

      // 2. Credit ARTCOIN to seller & remove 1 copy from seller's vault
      try {
        const sellerDocSnap = await getDoc(sellerRef);
        if (sellerDocSnap.exists()) {
          const sellerData = sellerDocSnap.data();
          const sellerVault: string[] = Array.isArray(sellerData.vaultIds)
            ? [...sellerData.vaultIds]
            : (Array.isArray(sellerData.collectionIds) ? [...sellerData.collectionIds] : []);
          const idxToRemove = sellerVault.indexOf(listing.cardId);
          if (idxToRemove !== -1) {
            sellerVault.splice(idxToRemove, 1);
          }
          await updateDoc(sellerRef, {
            walletBalance: increment(listing.price),
            vaultIds: sellerVault,
            collectionIds: sellerVault
          });
        }
      } catch (e) {
        console.error("Error updating seller vault on purchase:", e);
      }

      // 3. Mark listing as SOLD
      await updateDoc(listingRef, {
        status: 'sold',
        buyerId: user.uid,
        buyerName: user.displayName || user.email?.split('@')[0] || 'Collector',
        buyerAvatar: user.photoURL || '',
        soldAt: Date.now()
      });

      // 4. Log transactions for buyer and seller
      const txRef = collection(db, 'transactions');
      await addDoc(txRef, {
        userId: user.uid,
        userEmail: user.email || 'Anonymous',
        type: 'market_buy',
        amount: listing.price,
        cardId: listing.cardId,
        cardName: listing.card.player,
        description: `Market Buy: ${listing.card.player} (${listing.card.rarity}) from ${listing.sellerName}`,
        timestamp: Date.now()
      });

      await addDoc(txRef, {
        userId: listing.sellerId,
        type: 'market_sell',
        amount: listing.price,
        cardId: listing.cardId,
        cardName: listing.card.player,
        description: `Market Sale: ${listing.card.player} sold to ${user.displayName || 'Collector'} for ${formatCurrency(listing.price)}`,
        timestamp: Date.now()
      });

      onToast(`🎉 SUCCESS! Purchased ${listing.card.player} for ${formatCurrency(listing.price)}! It is now in your Vault.`);
    } catch (err: any) {
      console.error("Market buy error:", err);
      alert(`Transaction failed: ${err.message || 'Please try again.'}`);
    } finally {
      setIsProcessingBuy(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Marketplace Header Banner */}
      <div className="bg-black text-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_#D4FF00] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#D4FF00] text-black px-3 py-1 text-xs font-black uppercase tracking-widest border border-black">
              <Store size={14} /> FC MOBILE STYLE PLAYER MARKETPLACE
            </div>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter text-white">
              ARTCOIN TRANSFER MARKET
            </h1>
            <p className="text-neutral-300 text-xs sm:text-sm font-bold uppercase tracking-wider max-w-xl">
              Buy and sell cards peer-to-peer with other collectors using ARTCOIN tokens. List your vault cards, trade rare editions, or hunt bargains.
            </p>
          </div>

          {/* User Wallet Balance in Marketplace */}
          <div className="bg-neutral-900 border-2 border-[#D4FF00] p-4 sm:p-5 flex items-center gap-4 shrink-0 shadow-[4px_4px_0px_0px_rgba(212,255,0,0.3)]">
            <div className="bg-[#D4FF00] text-black p-3 border border-black">
              <Coins size={28} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block">
                YOUR AVAILABLE ARTCOIN
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#D4FF00] tracking-tight">
                {formatCurrency(walletBalance)}
              </span>
            </div>
            <button
              onClick={onOpenWallet}
              className="bg-[#D4FF00] hover:bg-white text-black border border-black px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-colors ml-2"
            >
              + TOP UP
            </button>
          </div>
        </div>

        {/* Live Market Sales Ticker */}
        {soldHistory.length > 0 && (
          <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center gap-3 overflow-x-auto text-[11px] font-black uppercase tracking-wider">
            <span className="bg-[#D4FF00] text-black px-2 py-0.5 border border-black shrink-0 flex items-center gap-1">
              ⚡ LIVE TRANSFERS:
            </span>
            <div className="flex items-center gap-4 whitespace-nowrap text-neutral-300">
              {soldHistory.slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex items-center gap-1.5 bg-neutral-900/90 px-3 py-1 border border-neutral-700">
                  <span className="text-white font-bold">{sale.card?.player}</span>
                  <span className="text-[#D4FF00]">({formatCurrency(sale.price)})</span>
                  <span className="text-neutral-500">sold by @{sale.sellerName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Marketplace Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-black pb-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveMarketTab('browse')}
            className={cn(
              "px-5 py-3 text-xs sm:text-sm font-black uppercase tracking-widest border-2 border-black transition-all flex items-center gap-2",
              activeMarketTab === 'browse'
                ? "bg-black text-[#D4FF00] shadow-[4px_4px_0px_0px_#D4FF00]"
                : "bg-white text-black hover:bg-neutral-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            )}
          >
            <ShoppingBag size={16} />
            BROWSE MARKET ({activeListings.length})
          </button>

          <button
            onClick={() => setActiveMarketTab('sell')}
            className={cn(
              "px-5 py-3 text-xs sm:text-sm font-black uppercase tracking-widest border-2 border-black transition-all flex items-center gap-2",
              activeMarketTab === 'sell'
                ? "bg-[#D4FF00] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                : "bg-white text-black hover:bg-neutral-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            )}
          >
            <PlusCircle size={16} />
            SELL VAULT CARD ({availableVaultCards.length})
          </button>

          <button
            onClick={() => setActiveMarketTab('my-orders')}
            className={cn(
              "px-5 py-3 text-xs sm:text-sm font-black uppercase tracking-widest border-2 border-black transition-all flex items-center gap-2",
              activeMarketTab === 'my-orders'
                ? "bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                : "bg-white text-black hover:bg-neutral-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            )}
          >
            <Tag size={16} />
            MY LISTINGS ({myListings.length})
          </button>

          <button
            onClick={() => setActiveMarketTab('history')}
            className={cn(
              "px-5 py-3 text-xs sm:text-sm font-black uppercase tracking-widest border-2 border-black transition-all flex items-center gap-2",
              activeMarketTab === 'history'
                ? "bg-black text-[#D4FF00] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                : "bg-white text-black hover:bg-neutral-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            )}
          >
            <History size={16} />
            SALES HISTORY ({soldHistory.length})
          </button>
        </div>

        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 bg-neutral-100 border border-black px-3 py-1.5">
          ✨ 0% SELLER TRANSACTION FEE
        </div>
      </div>

      {/* Tab 1: Browse Market */}
      {activeMarketTab === 'browse' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Search input (No search count display) */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="SEARCH PLAYER, CLUB, NATION..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-50 border-2 border-black pl-9 pr-3 py-2 text-xs font-black uppercase focus:outline-none focus:bg-white"
                />
              </div>

              {/* Club */}
              <select
                value={filterClub}
                onChange={(e) => setFilterClub(e.target.value)}
                className="bg-neutral-50 border-2 border-black p-2 text-xs font-black uppercase focus:outline-none focus:bg-white"
              >
                <option value="">🏟️ ALL CLUBS</option>
                {availableClubs.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* National Team */}
              <select
                value={filterNationalTeam}
                onChange={(e) => setFilterNationalTeam(e.target.value)}
                className="bg-neutral-50 border-2 border-black p-2 text-xs font-black uppercase focus:outline-none focus:bg-white"
              >
                <option value="">🌍 ALL NATIONAL TEAMS</option>
                {availableNations.map(n => (
                  <option key={n} value={n}>{getNationalTeamFlag(n)} {n}</option>
                ))}
              </select>

              {/* Rarity */}
              <select
                value={filterRarity}
                onChange={(e) => setFilterRarity(e.target.value)}
                className="bg-neutral-50 border-2 border-black p-2 text-xs font-black uppercase focus:outline-none focus:bg-white"
              >
                <option value="">ALL RARITIES</option>
                <option value="1-of-1 Shield">1-OF-1 SHIELD</option>
                <option value="Gold Autograph">GOLD AUTOGRAPH</option>
                <option value="Silver Refractor">SILVER REFRACTOR</option>
                <option value="Base">BASE</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-neutral-50 border-2 border-black p-2 text-xs font-black uppercase focus:outline-none focus:bg-white"
              >
                <option value="newest">NEWEST FIRST</option>
                <option value="price-asc">PRICE: LOW TO HIGH</option>
                <option value="price-desc">PRICE: HIGH TO LOW</option>
                <option value="player-asc">PLAYER NAME (A-Z)</option>
              </select>
            </div>

            {/* Price Range Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-black/10">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-neutral-500">ARTCOIN PRICE RANGE:</span>
                <input
                  type="number"
                  placeholder="MIN AC"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-24 bg-neutral-50 border border-black p-1.5 text-xs font-mono font-bold"
                />
                <span className="text-xs font-black">-</span>
                <input
                  type="number"
                  placeholder="MAX AC"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-24 bg-neutral-50 border border-black p-1.5 text-xs font-mono font-bold"
                />
              </div>

              {(searchQuery || filterRarity || filterClub || filterNationalTeam || filterEdition || minPrice || maxPrice) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterRarity('');
                    setFilterClub('');
                    setFilterNationalTeam('');
                    setFilterEdition('');
                    setMinPrice('');
                    setMaxPrice('');
                  }}
                  className="text-[10px] font-black uppercase text-red-600 hover:underline flex items-center gap-1"
                >
                  <X size={12} /> CLEAR ALL FILTERS
                </button>
              )}
            </div>
          </div>

          {/* Listings Grid */}
          {loadingListings ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-black uppercase tracking-widest text-neutral-500">FETCHING MARKET LISTINGS...</p>
            </div>
          ) : filteredListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredListings.map((listing) => {
                const card = listing.card;
                const isMyOwnListing = user && listing.sellerId === user.uid;
                const canAfford = walletBalance >= listing.price;

                return (
                  <motion.div
                    key={listing.id}
                    whileHover={{ y: -4 }}
                    className="bg-white border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between overflow-hidden group hover:border-[#D4FF00] transition-colors"
                  >
                    {/* Top Seller Bar */}
                    <div className="bg-neutral-100 border-b-2 border-black p-2.5 flex items-center justify-between">
                      <button
                        onClick={() => onViewUserProfile(listing.sellerId)}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity truncate"
                        title="Click to view seller profile"
                      >
                        {listing.sellerAvatar ? (
                          <img src={listing.sellerAvatar} alt="Seller" className="w-5 h-5 rounded-none border border-black object-cover" />
                        ) : (
                          <div className="w-5 h-5 bg-[#D4FF00] border border-black flex items-center justify-center text-[9px] font-black text-black">
                            <UserIcon size={12} />
                          </div>
                        )}
                        <span className="text-[10px] font-black uppercase text-black truncate max-w-[120px]">
                          @{listing.sellerName}
                        </span>
                      </button>

                      <span className="text-[9px] font-bold text-neutral-500 uppercase">
                        {new Date(listing.listedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Card Preview Body */}
                    <div className="p-4 flex gap-4 items-center">
                      <div 
                        onClick={() => onSelectCard(card)}
                        className="w-24 aspect-[750/1050] bg-white border-2 border-black overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer shrink-0 group-hover:scale-105 transition-transform"
                      >
                        {card.imageUrl ? (
                          <img src={card.imageUrl} alt={card.player} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-neutral-900 text-white flex flex-col items-center justify-center p-1 text-center">
                            <span className="text-[8px] font-black">{card.player}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <span className={cn(
                          "inline-block px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider border",
                          card.rarity === '1-of-1 Shield' && "bg-black text-[#D4FF00] border-black",
                          card.rarity === 'Gold Autograph' && "bg-amber-300 text-black border-black",
                          card.rarity === 'Silver Refractor' && "bg-slate-200 text-black border-black",
                          card.rarity === 'Base' && "bg-white text-black border-black"
                        )}>
                          {card.rarity}
                        </span>

                        <h4 
                          onClick={() => onSelectCard(card)}
                          className="text-base font-black uppercase tracking-tight text-black truncate cursor-pointer hover:underline"
                        >
                          {card.player}
                        </h4>

                        <p className="text-[10px] font-bold text-neutral-600 uppercase truncate flex items-center gap-1">
                          <span>{getCardClubTeam(card) || card.team}</span>
                          {getCardNationalTeam(card) && (
                            <span className="text-neutral-500 font-bold">
                              • {getNationalTeamFlag(getCardNationalTeam(card))} {getCardNationalTeam(card)}
                            </span>
                          )}
                          <span>• {card.position}</span>
                        </p>

                        <div className="text-[9px] font-black text-neutral-600 uppercase">
                          #{card.cardNumber} • {card.year}
                        </div>
                      </div>
                    </div>

                    {/* Price & Action Footer */}
                    <div className="p-3 bg-neutral-50 border-t-2 border-black space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-neutral-500">MARKET ASKING PRICE</span>
                        <span className="text-lg font-black text-black font-mono">
                          {formatCurrency(listing.price)}
                        </span>
                      </div>

                      {isMyOwnListing ? (
                        <div className="bg-neutral-200 text-neutral-700 py-2 text-center text-xs font-black uppercase border border-neutral-400">
                          YOUR LISTING
                        </div>
                      ) : (
                        <button
                          onClick={() => handleBuyMarketCard(listing)}
                          disabled={isProcessingBuy === listing.id}
                          className={cn(
                            "w-full py-2.5 px-3 border-2 border-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                            canAfford
                              ? "bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black"
                              : "bg-white hover:bg-neutral-100 text-black"
                          )}
                        >
                          {isProcessingBuy === listing.id ? (
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                              TRANSFERRING...
                            </div>
                          ) : canAfford ? (
                            <>
                              <Coins size={14} /> BUY NOW FOR {formatCurrency(listing.price, true)}
                            </>
                          ) : (
                            <>
                              TOP UP & BUY ({formatCurrency(listing.price, true)})
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 bg-white border-4 border-black text-center p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <Store size={48} className="mx-auto text-neutral-400" />
              <h3 className="text-2xl font-black uppercase tracking-tight text-black">NO ACTIVE MARKET LISTINGS</h3>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider max-w-md mx-auto">
                No cards currently match your search. Be the first to list a card from your Vault!
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveMarketTab('sell')}
                  className="bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-6 py-3 text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-colors"
                >
                  + LIST A CARD FOR SALE
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Sell Vault Card */}
      {activeMarketTab === 'sell' && (
        <div className="space-y-8">
          <div className="bg-white border-3 border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight text-black flex items-center gap-2">
                  <Tag size={24} /> SELECT A CARD FROM YOUR VAULT TO SELL
                </h3>
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mt-1">
                  Choose any card you own, set your price in ARTCOIN, and list it for thousands of collectors.
                </p>
              </div>
              <span className="bg-[#D4FF00] text-black border border-black px-3 py-1 text-xs font-black uppercase font-mono">
                {availableVaultCards.length} UNLISTED CARDS
              </span>
            </div>

            {availableVaultCards.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {availableVaultCards.map((card) => {
                  const isSelected = selectedVaultCard?.id === card.id;
                  return (
                    <div
                      key={card.id}
                      onClick={() => {
                        setSelectedVaultCard(card);
                        setSellPriceInput(card.currentPrice || 100);
                      }}
                      className={cn(
                        "p-3 border-2 border-black cursor-pointer transition-all flex flex-col justify-between relative shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                        isSelected
                          ? "bg-black text-white ring-4 ring-[#D4FF00] scale-105 z-10"
                          : "bg-white hover:bg-neutral-50"
                      )}
                    >
                      <div className="aspect-[750/1050] bg-white border border-black overflow-hidden mb-2">
                        <img src={card.imageUrl} alt={card.player} className="w-full h-full object-cover" />
                      </div>

                      <div className="space-y-1">
                        <span className={cn(
                          "text-[8px] font-black uppercase px-1 py-0.2 border",
                          isSelected ? "bg-[#D4FF00] text-black border-black" : "bg-neutral-100 text-neutral-800 border-black/30"
                        )}>
                          {card.rarity}
                        </span>
                        <div className="text-xs font-black uppercase truncate">{card.player}</div>
                        <div className="text-[9px] font-bold text-neutral-400 uppercase truncate">{card.team}</div>
                        <div className="text-xs font-black text-[#D4FF00] font-mono pt-1">
                          Est: {formatCurrency(card.currentPrice)}
                        </div>
                      </div>

                      <div className="mt-3">
                        <button
                          type="button"
                          className={cn(
                            "w-full py-1.5 text-[10px] font-black uppercase border border-black transition-colors",
                            isSelected
                              ? "bg-[#D4FF00] text-black font-black"
                              : "bg-black text-[#D4FF00] hover:bg-neutral-800"
                          )}
                        >
                          {isSelected ? 'SELECTED ✓' : 'SELECT TO SELL'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center space-y-4">
                <Trophy size={44} className="mx-auto text-neutral-400" />
                <h4 className="text-xl font-black uppercase tracking-tight text-black">NO UNLISTED VAULT CARDS</h4>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider max-w-md mx-auto">
                  You don't have any unlisted cards in your Vault right now. Buy cards from the database or rip booster packs to get cards to trade!
                </p>
              </div>
            )}
          </div>

          {/* Sell Drawer / Form when card is selected */}
          {selectedVaultCard && (
            <div className="bg-black text-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_#D4FF00] animate-fadeIn">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Left Card Info */}
                <div className="flex items-center gap-6">
                  <div className="w-28 sm:w-36 aspect-[750/1050] bg-white border-3 border-[#D4FF00] overflow-hidden shrink-0 shadow-[4px_4px_0px_0px_rgba(212,255,0,0.5)]">
                    <img src={selectedVaultCard.imageUrl} alt={selectedVaultCard.player} className="w-full h-full object-cover" />
                  </div>

                  <div className="space-y-2">
                    <span className="bg-[#D4FF00] text-black px-2 py-0.5 text-[10px] font-black uppercase border border-black">
                      READY TO LIST ON MARKET
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                      {selectedVaultCard.player}
                    </h3>
                    <p className="text-xs text-neutral-400 font-bold uppercase">
                      {selectedVaultCard.team} • {selectedVaultCard.rarity} • #{selectedVaultCard.cardNumber}
                    </p>
                    <p className="text-xs font-mono text-neutral-300">
                      Standard Market Benchmark: <strong>{formatCurrency(selectedVaultCard.currentPrice)}</strong>
                    </p>
                  </div>
                </div>

                {/* Right Price Setting & Confirm */}
                <div className="bg-neutral-900 border-2 border-neutral-700 p-6 space-y-4 w-full md:w-96 shrink-0">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-[#D4FF00] mb-2">
                      SET YOUR ASKING PRICE (ARTCOIN)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="10"
                        step="10"
                        value={sellPriceInput}
                        onChange={(e) => setSellPriceInput(Number(e.target.value))}
                        className="w-full bg-black border-2 border-[#D4FF00] p-3 text-xl font-black font-mono text-[#D4FF00] focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-neutral-400">
                        ARTCOIN
                      </span>
                    </div>
                  </div>

                  {/* Preset Price Quick Buttons */}
                  <div className="flex gap-2">
                    {[
                      { label: '50% (Quick)', mult: 0.5 },
                      { label: '100% (Fair)', mult: 1.0 },
                      { label: '150% (Premium)', mult: 1.5 },
                      { label: '200% (High)', mult: 2.0 }
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setSellPriceInput(Math.round(selectedVaultCard.currentPrice * p.mult))}
                        className="flex-1 py-1 bg-neutral-800 hover:bg-[#D4FF00] hover:text-black text-[8px] font-black uppercase border border-neutral-700 transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleConfirmListCard}
                      disabled={isListingCard}
                      className="w-full py-4 bg-[#D4FF00] hover:bg-white text-black border-2 border-black font-black text-sm uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all"
                    >
                      {isListingCard ? 'LISTING TO MARKET...' : `CONFIRM & LIST FOR ${formatCurrency(sellPriceInput)}`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: My Listings */}
      {activeMarketTab === 'my-orders' && (
        <div className="space-y-6">
          <div className="bg-white border-3 border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight text-black flex items-center gap-2">
                  <Tag size={24} /> YOUR ACTIVE MARKET LISTINGS
                </h3>
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mt-1">
                  Manage the cards you currently have listed for sale on the public marketplace.
                </p>
              </div>
              <span className="bg-black text-[#D4FF00] px-3 py-1 text-xs font-black uppercase">
                {myListings.length} TOTAL LISTINGS
              </span>
            </div>

            {myListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="bg-neutral-50 border-2 border-black p-4 flex flex-col justify-between shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-black/10 pb-2">
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 border",
                        listing.status === 'active' && "bg-[#D4FF00] text-black border-black",
                        listing.status === 'sold' && "bg-emerald-600 text-white border-black",
                        listing.status === 'cancelled' && "bg-neutral-300 text-neutral-700 border-neutral-400"
                      )}>
                        STATUS: {listing.status.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {new Date(listing.listedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex gap-4 items-center">
                      <div className="w-16 aspect-[750/1050] bg-white border border-black shrink-0 overflow-hidden">
                        <img src={listing.card.imageUrl} alt={listing.card.player} className="w-full h-full object-cover" />
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-sm font-black uppercase text-black truncate">{listing.card.player}</h4>
                        <p className="text-[10px] font-bold text-neutral-500 uppercase truncate">{listing.card.team}</p>
                        <div className="text-base font-black text-black font-mono">
                          {formatCurrency(listing.price)}
                        </div>
                      </div>
                    </div>

                    {listing.status === 'active' && (
                      <button
                        onClick={() => handleCancelListing(listing)}
                        className="w-full py-2 bg-white hover:bg-red-50 text-red-600 border-2 border-red-600 text-xs font-black uppercase tracking-wider transition-colors"
                      >
                        CANCEL LISTING & RETRIEVE CARD
                      </button>
                    )}

                    {listing.status === 'sold' && (
                      <div className="bg-emerald-50 text-emerald-900 border border-emerald-300 p-2 text-center text-xs font-black uppercase">
                        ✓ SOLD TO @{listing.buyerName || 'COLLECTOR'} FOR {formatCurrency(listing.price)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center space-y-4">
                <Tag size={44} className="mx-auto text-neutral-400" />
                <h4 className="text-xl font-black uppercase tracking-tight text-black">NO ACTIVE LISTINGS</h4>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider max-w-md mx-auto">
                  You don't have any cards listed for sale right now. Put your spare vault cards up for sale to earn ARTCOIN!
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveMarketTab('sell')}
                    className="bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-6 py-3 text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-colors"
                  >
                    + LIST A VAULT CARD NOW
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Sales History */}
      {activeMarketTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white border-3 border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight text-black flex items-center gap-2">
                  <History size={24} /> COMMUNITY TRANSFERS & SALES HISTORY
                </h3>
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mt-1">
                  Public ledger of completed peer-to-peer card transfers across the community.
                </p>
              </div>
              <span className="bg-black text-[#D4FF00] px-3 py-1 text-xs font-black uppercase font-mono">
                {soldHistory.length} TRANSFERS
              </span>
            </div>

            {soldHistory.length > 0 ? (
              <div className="space-y-3">
                {soldHistory.map((item) => (
                  <div
                    key={item.id}
                    className="bg-neutral-50 border-2 border-black p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 aspect-[750/1050] bg-white border border-black overflow-hidden shrink-0">
                        <img src={item.card?.imageUrl} alt={item.card?.player} className="w-full h-full object-cover" />
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-sm font-black uppercase text-black">{item.card?.player}</h4>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase">
                          {item.card?.team} • {item.card?.rarity}
                        </p>
                        <div className="text-[10px] font-black text-neutral-700">
                          Seller: <button onClick={() => onViewUserProfile(item.sellerId)} className="underline hover:text-black">@{item.sellerName}</button> → Buyer: <button onClick={() => item.buyerId && onViewUserProfile(item.buyerId)} className="underline hover:text-black">@{item.buyerName || 'Collector'}</button>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-emerald-600 font-mono">
                        {formatCurrency(item.price)}
                      </div>
                      <div className="text-[9px] font-bold text-neutral-400 uppercase">
                        {item.soldAt ? new Date(item.soldAt).toLocaleString() : 'Recently'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center space-y-2">
                <History size={44} className="mx-auto text-neutral-400" />
                <h4 className="text-xl font-black uppercase tracking-tight text-black">NO SALES RECORDED YET</h4>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Be the first to list and buy a card on the ARTCOIN transfer market!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
