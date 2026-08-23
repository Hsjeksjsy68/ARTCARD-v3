import React, { useState, useEffect, useMemo } from 'react';
import { FootballCard, MarketListing, MarketOffer, UserProfileData } from '../types';
import { formatCurrency, cn, getDefaultStock, calculateCardMarketPrice, getCardStartingPrice, updateCardMarketValueOnSale } from '../lib/utils';
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
  Crown,
  Handshake,
  ArrowUpRight,
  Check,
  MessageSquare,
  Send,
  Clock,
  XCircle,
  Calculator,
  Sliders,
  TrendingDown,
  TrendingUp
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
  initialSearchQuery?: string;
  initialTab?: 'browse' | 'sell' | 'offers' | 'my-orders' | 'history';
  initialSellCard?: FootballCard | null;
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
  onToast,
  initialSearchQuery,
  initialTab,
  initialSellCard
}: MarketplaceProps) {
  const [activeMarketTab, setActiveMarketTab] = useState<'browse' | 'sell' | 'offers' | 'my-orders' | 'history'>(initialTab || 'browse');
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [offers, setOffers] = useState<MarketOffer[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  // Offers subtab ('incoming' received by user as seller, 'sent' made by user as buyer)
  const [offersSubTab, setOffersSubTab] = useState<'incoming' | 'sent'>('incoming');

  // Filter States (Browse Tab)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [filterRarity, setFilterRarity] = useState('');
  const [filterClub, setFilterClub] = useState('');
  const [filterNationalTeam, setFilterNationalTeam] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterEdition, setFilterEdition] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'newest' | 'player-asc'>('newest');

  // Sell Tab Search & Filter States
  const [sellSearchQuery, setSellSearchQuery] = useState('');
  const [sellFilterRarity, setSellFilterRarity] = useState('');
  const [sellSortBy, setSellSortBy] = useState<'most-owned' | 'price-desc' | 'price-asc' | 'player-asc'>('most-owned');

  // Sell Card Selected States
  const [selectedVaultCard, setSelectedVaultCard] = useState<FootballCard | null>(initialSellCard || null);
  const [selectedVaultCopyNumber, setSelectedVaultCopyNumber] = useState<number>(1);
  const [sellQuantity, setSellQuantity] = useState<number>(1);
  const [sellPriceInput, setSellPriceInput] = useState<number>(100);
  const [isListingCard, setIsListingCard] = useState(false);

  // Bargain / Offer Modal States
  const [bargainModalListing, setBargainModalListing] = useState<MarketListing | null>(null);
  const [bargainOfferAmount, setBargainOfferAmount] = useState<number>(0);
  const [bargainOfferMessage, setBargainOfferMessage] = useState<string>('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);

  // Counter Offer Modal States
  const [counterModalOffer, setCounterModalOffer] = useState<MarketOffer | null>(null);
  const [counterPriceInput, setCounterPriceInput] = useState<number>(0);
  const [counterNoteInput, setCounterNoteInput] = useState<string>('');
  const [isSubmittingCounter, setIsSubmittingCounter] = useState(false);

  // Action Processing States
  const [isProcessingBuy, setIsProcessingBuy] = useState<string | null>(null);
  const [isProcessingOfferAction, setIsProcessingOfferAction] = useState<string | null>(null);

  // Update filters if incoming props change
  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
    if (initialTab) {
      setActiveMarketTab(initialTab);
    }
    if (initialSellCard) {
      setSelectedVaultCard(initialSellCard);
      setSelectedVaultCopyNumber(1);
      setSellQuantity(1);
      const mPrice = calculateCardMarketPrice(initialSellCard, listings);
      setSellPriceInput(mPrice || 100);
    }
  }, [initialSearchQuery, initialTab, initialSellCard]);

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

  // Listen to Market Bargain Offers in real time
  useEffect(() => {
    const offersRef = collection(db, 'market_offers');
    const unsubscribe = onSnapshot(offersRef, (snapshot) => {
      const loaded: MarketOffer[] = [];
      snapshot.forEach(docSnap => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as MarketOffer);
      });
      setOffers(loaded);
    }, (err) => {
      console.error("Error fetching market offers:", err);
    });

    return () => unsubscribe();
  }, []);

  // Filter active listings for browsing
  const activeListings = useMemo(() => listings.filter(l => l.status === 'active'), [listings]);
  const myListings = useMemo(() => user ? listings.filter(l => l.sellerId === user.uid) : [], [listings, user]);
  const soldHistory = useMemo(() => listings.filter(l => l.status === 'sold'), [listings]);

  // Incoming and Sent Offers for current user
  const incomingOffers = useMemo(() => {
    if (!user) return [];
    return offers
      .filter(o => o.sellerId === user.uid && o.status !== 'cancelled')
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [offers, user]);

  const sentOffers = useMemo(() => {
    if (!user) return [];
    return offers
      .filter(o => o.buyerId === user.uid)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [offers, user]);

  const pendingIncomingCount = useMemo(() => {
    return incomingOffers.filter(o => o.status === 'pending').length;
  }, [incomingOffers]);

  // Count how many copies user owns of each card
  const userVaultArray: string[] = useMemo(() => {
    return Array.isArray(vaultIds) ? vaultIds : Array.from(vaultIds);
  }, [vaultIds]);

  const ownedCountMap = useMemo(() => {
    const map = new Map<string, number>();
    userVaultArray.forEach(id => {
      map.set(id, (map.get(id) || 0) + 1);
    });
    return map;
  }, [userVaultArray]);

  // Count active listings per cardId for the current user
  const activeListingsCountMap = useMemo(() => {
    const map = new Map<string, number>();
    myListings.filter(l => l.status === 'active').forEach(l => {
      map.set(l.cardId, (map.get(l.cardId) || 0) + 1);
    });
    return map;
  }, [myListings]);

  // Available cards: show each individual unlisted copy from the user's vault
  const cardMap = useMemo(() => new Map(allCards.map(c => [c.id, c])), [allCards]);

  const availableVaultCardItems: { card: FootballCard; copyNumber: number; totalOwned: number; instanceKey: string }[] = useMemo(() => {
    const items: { card: FootballCard; copyNumber: number; totalOwned: number; instanceKey: string }[] = [];
    const copyCounter = new Map<string, number>();
    
    userVaultArray.forEach((id, index) => {
      const totalOwned = ownedCountMap.get(id) || 0;
      const currentlyListed = activeListingsCountMap.get(id) || 0;
      const curCopy = (copyCounter.get(id) || 0) + 1;
      copyCounter.set(id, curCopy);

      // If this copy is not already committed to an active listing, make it available
      if (curCopy > currentlyListed) {
        const c = cardMap.get(id);
        if (c) {
          // Dynamic market value calculated using formula: ((starting + listings) / total)
          const dynamicCard = {
            ...c,
            currentPrice: calculateCardMarketPrice(c, listings)
          };
          items.push({
            card: dynamicCard,
            copyNumber: curCopy,
            totalOwned,
            instanceKey: `${id}_sell_copy_${index}`
          });
        }
      }
    });
    return items;
  }, [userVaultArray, ownedCountMap, activeListingsCountMap, cardMap, listings]);

  // Filtered & Sorted available vault cards for Sell tab
  const filteredAvailableVaultCards = useMemo(() => {
    return availableVaultCardItems.filter(({ card }) => {
      if (sellFilterRarity && card.rarity !== sellFilterRarity) return false;
      if (sellSearchQuery.trim()) {
        const q = sellSearchQuery.toLowerCase().trim();
        const club = (getCardClubTeam(card) || card.team || '').toLowerCase();
        const nation = (getCardNationalTeam(card) || '').toLowerCase();
        const player = (card.player || '').toLowerCase();
        const set = (card.set || '').toLowerCase();
        const num = (card.cardNumber || '').toLowerCase();
        const pos = (card.position || '').toLowerCase();
        const match = player.includes(q) || club.includes(q) || nation.includes(q) || set.includes(q) || num.includes(q) || pos.includes(q);
        if (!match) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sellSortBy === 'price-desc') return b.card.currentPrice - a.card.currentPrice;
      if (sellSortBy === 'price-asc') return a.card.currentPrice - b.card.currentPrice;
      if (sellSortBy === 'player-asc') return (a.card.player || '').localeCompare(b.card.player || '');
      if (sellSortBy === 'most-owned') return b.totalOwned - a.totalOwned;
      return 0;
    });
  }, [availableVaultCardItems, sellFilterRarity, sellSearchQuery, sellSortBy]);

  // Filtered browse list
  const filteredListings = useMemo(() => {
    return activeListings.filter(l => {
      const card = l.card;
      if (!card) return false;

      // Search query matching player, club team, national team, set, card number
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const club = (getCardClubTeam(card) || card.team || '').toLowerCase();
        const nation = (getCardNationalTeam(card) || '').toLowerCase();
        const match = (card.player || '').toLowerCase().includes(q) ||
                      club.includes(q) ||
                      nation.includes(q) ||
                      (card.set || '').toLowerCase().includes(q) ||
                      (card.cardNumber || '').toLowerCase().includes(q);
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
  }, [activeListings, searchQuery, filterRarity, filterClub, filterNationalTeam, filterPosition, filterEdition, minPrice, maxPrice, sortBy]);

  // Extract unique clubs, national teams and editions for filter dropdowns
  const availableClubs = useMemo(() => Array.from(new Set(allCards.map(c => getCardClubTeam(c) || c.team).filter(Boolean))).sort(), [allCards]);
  const availableNations = useMemo(() => Array.from(new Set(allCards.map(c => getCardNationalTeam(c)).filter(Boolean))).sort(), [allCards]);

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

    const availableCopiesCount = availableVaultCardItems.filter(item => item.card.id === selectedVaultCard.id).length;
    const qtyToList = Math.max(1, Math.min(sellQuantity, availableCopiesCount || 1));

    setIsListingCard(true);
    try {
      const now = Date.now();
      for (let i = 0; i < qtyToList; i++) {
        const listingId = `listing_${user.uid}_${selectedVaultCard.id}_${now}_${i}`;
        const listingRef = doc(db, 'market_listings', listingId);

        const newListing: Omit<MarketListing, 'id'> = {
          cardId: selectedVaultCard.id,
          card: selectedVaultCard,
          sellerId: user.uid,
          sellerName: user.displayName || user.email?.split('@')[0] || 'Collector',
          sellerAvatar: user.photoURL || '',
          price: Number(sellPriceInput),
          status: 'active',
          listedAt: now + i
        };

        await setDoc(listingRef, newListing);
      }

      onToast(`🎉 Listed ${qtyToList > 1 ? `${qtyToList} copies of ` : ''}${selectedVaultCard.player} on Market for ${formatCurrency(sellPriceInput)} each!`);
      setSelectedVaultCard(null);
      setSellQuantity(1);
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

  // Handle Buying a Card instantly at asking price
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

      // 5. Update Card Market Value & Price History in Firestore
      await updateCardMarketValueOnSale(listing.cardId, listing.price, listing.card);

      onToast(`🎉 SUCCESS! Purchased ${listing.card.player} for ${formatCurrency(listing.price)}! Market value updated.`);
    } catch (err: any) {
      console.error("Market buy error:", err);
      alert(`Transaction failed: ${err.message || 'Please try again.'}`);
    } finally {
      setIsProcessingBuy(null);
    }
  };

  // Open Bargain Modal
  const openBargainModal = (listing: MarketListing) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (user.uid === listing.sellerId) {
      alert("You cannot make an offer on your own listing.");
      return;
    }
    setBargainModalListing(listing);
    const dynamicPrice = calculateCardMarketPrice(listing.card, listings);
    // Suggest 80% of asking price or calculated market value
    const suggestedOffer = Math.min(listing.price, Math.max(10, Math.round(listing.price * 0.85)));
    setBargainOfferAmount(suggestedOffer);
    setBargainOfferMessage('');
  };

  // Submit Bargain Offer
  const handleSubmitOffer = async () => {
    if (!user || !bargainModalListing) return;
    if (!bargainOfferAmount || bargainOfferAmount <= 0) {
      alert("Please enter a valid offer amount.");
      return;
    }
    if (bargainOfferAmount > walletBalance) {
      alert(`You do not have enough ARTCOIN (${formatCurrency(walletBalance)} available). Top up your wallet first.`);
      onOpenWallet();
      return;
    }

    setIsSubmittingOffer(true);
    try {
      const offerId = `offer_${user.uid}_${bargainModalListing.id}_${Date.now()}`;
      const offerRef = doc(db, 'market_offers', offerId);

      const newOffer: Omit<MarketOffer, 'id'> = {
        listingId: bargainModalListing.id,
        cardId: bargainModalListing.cardId,
        card: bargainModalListing.card,
        sellerId: bargainModalListing.sellerId,
        sellerName: bargainModalListing.sellerName,
        buyerId: user.uid,
        buyerName: user.displayName || user.email?.split('@')[0] || 'Collector',
        buyerAvatar: user.photoURL || '',
        originalPrice: bargainModalListing.price,
        offerAmount: Number(bargainOfferAmount),
        message: bargainOfferMessage.trim(),
        status: 'pending',
        createdAt: Date.now()
      };

      await setDoc(offerRef, newOffer);
      onToast(`🤝 Bargain offer of ${formatCurrency(bargainOfferAmount)} sent to @${bargainModalListing.sellerName}!`);
      setBargainModalListing(null);
    } catch (err: any) {
      console.error("Submit offer error:", err);
      alert(`Failed to send offer: ${err.message || 'Please try again.'}`);
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  // Handle Accept Offer (By Seller)
  const handleAcceptOffer = async (offer: MarketOffer) => {
    if (!user || user.uid !== offer.sellerId) return;

    setIsProcessingOfferAction(offer.id);
    try {
      // 1. Verify Buyer has enough ARTCOIN
      const buyerRef = doc(db, 'users', offer.buyerId);
      const buyerSnap = await getDoc(buyerRef);
      if (!buyerSnap.exists()) {
        alert("Buyer profile not found.");
        return;
      }
      const buyerData = buyerSnap.data();
      const buyerBalance = buyerData.walletBalance || 0;

      if (buyerBalance < offer.offerAmount) {
        alert(`Buyer (@${offer.buyerName}) only has ${formatCurrency(buyerBalance)} ARTCOIN and cannot fulfill this ${formatCurrency(offer.offerAmount)} offer.`);
        await updateDoc(doc(db, 'market_offers', offer.id), {
          status: 'declined',
          declinedReason: 'Buyer insufficient balance',
          updatedAt: Date.now()
        });
        return;
      }

      const sellerRef = doc(db, 'users', user.uid);
      const listingRef = doc(db, 'market_listings', offer.listingId);
      const offerRef = doc(db, 'market_offers', offer.id);

      // 2. Transfer card to buyer & deduct ARTCOIN from buyer
      const buyerVault: string[] = Array.isArray(buyerData.vaultIds)
        ? [...buyerData.vaultIds]
        : (Array.isArray(buyerData.collectionIds) ? [...buyerData.collectionIds] : []);
      buyerVault.push(offer.cardId);

      await updateDoc(buyerRef, {
        walletBalance: increment(-offer.offerAmount),
        vaultIds: buyerVault,
        collectionIds: buyerVault
      });

      // 3. Remove card from seller & credit ARTCOIN to seller
      const sellerSnap = await getDoc(sellerRef);
      if (sellerSnap.exists()) {
        const sellerData = sellerSnap.data();
        const sellerVault: string[] = Array.isArray(sellerData.vaultIds)
          ? [...sellerData.vaultIds]
          : (Array.isArray(sellerData.collectionIds) ? [...sellerData.collectionIds] : []);
        const idxToRemove = sellerVault.indexOf(offer.cardId);
        if (idxToRemove !== -1) {
          sellerVault.splice(idxToRemove, 1);
        }
        await updateDoc(sellerRef, {
          walletBalance: increment(offer.offerAmount),
          vaultIds: sellerVault,
          collectionIds: sellerVault
        });
      }

      // 4. Mark listing as SOLD
      await updateDoc(listingRef, {
        status: 'sold',
        price: offer.offerAmount,
        buyerId: offer.buyerId,
        buyerName: offer.buyerName,
        buyerAvatar: offer.buyerAvatar || '',
        soldAt: Date.now()
      });

      // 5. Mark this offer as ACCEPTED
      await updateDoc(offerRef, {
        status: 'accepted',
        acceptedAt: Date.now(),
        updatedAt: Date.now()
      });

      // 6. Decline any other pending offers on this listing
      const otherOffers = offers.filter(o => o.listingId === offer.listingId && o.id !== offer.id && o.status === 'pending');
      for (const o of otherOffers) {
        await updateDoc(doc(db, 'market_offers', o.id), {
          status: 'declined',
          declinedReason: 'Card sold to another buyer',
          updatedAt: Date.now()
        });
      }

      // 7. Log transactions
      const txRef = collection(db, 'transactions');
      await addDoc(txRef, {
        userId: offer.buyerId,
        type: 'market_buy',
        amount: offer.offerAmount,
        cardId: offer.cardId,
        cardName: offer.card.player,
        description: `Bargain Accepted: ${offer.card.player} purchased from @${offer.sellerName} for ${formatCurrency(offer.offerAmount)} (Asking: ${formatCurrency(offer.originalPrice)})`,
        timestamp: Date.now()
      });

      await addDoc(txRef, {
        userId: user.uid,
        type: 'market_sell',
        amount: offer.offerAmount,
        cardId: offer.cardId,
        cardName: offer.card.player,
        description: `Bargain Sale: ${offer.card.player} sold to @${offer.buyerName} for ${formatCurrency(offer.offerAmount)}`,
        timestamp: Date.now()
      });

      // 8. Update Card Market Value & Price History in Firestore
      await updateCardMarketValueOnSale(offer.cardId, offer.offerAmount, offer.card);

      onToast(`🎉 Bargain Accepted! Sold ${offer.card.player} to @${offer.buyerName} for ${formatCurrency(offer.offerAmount)}! Market value updated.`);
    } catch (err: any) {
      console.error("Accept offer error:", err);
      alert(`Failed to accept offer: ${err.message || 'Please try again.'}`);
    } finally {
      setIsProcessingOfferAction(null);
    }
  };

  // Handle Decline Offer (By Seller)
  const handleDeclineOffer = async (offer: MarketOffer) => {
    if (!user || user.uid !== offer.sellerId) return;
    setIsProcessingOfferAction(offer.id);
    try {
      await updateDoc(doc(db, 'market_offers', offer.id), {
        status: 'declined',
        updatedAt: Date.now()
      });
      onToast(`Offer of ${formatCurrency(offer.offerAmount)} declined.`);
    } catch (err: any) {
      console.error("Decline offer error:", err);
      alert("Failed to decline offer.");
    } finally {
      setIsProcessingOfferAction(null);
    }
  };

  // Handle Counter Offer (By Seller)
  const handleOpenCounterModal = (offer: MarketOffer) => {
    setCounterModalOffer(offer);
    const midPrice = Math.round((offer.originalPrice + offer.offerAmount) / 2);
    setCounterPriceInput(midPrice);
    setCounterNoteInput('');
  };

  const handleSubmitCounter = async () => {
    if (!user || !counterModalOffer) return;
    if (!counterPriceInput || counterPriceInput <= 0) {
      alert("Please enter a valid counter amount.");
      return;
    }

    setIsSubmittingCounter(true);
    try {
      await updateDoc(doc(db, 'market_offers', counterModalOffer.id), {
        status: 'countered',
        counterAmount: Number(counterPriceInput),
        counterMessage: counterNoteInput.trim(),
        updatedAt: Date.now()
      });
      onToast(`🤝 Counter-offer of ${formatCurrency(counterPriceInput)} sent to @${counterModalOffer.buyerName}!`);
      setCounterModalOffer(null);
    } catch (err: any) {
      console.error("Counter offer error:", err);
      alert("Failed to propose counter offer.");
    } finally {
      setIsSubmittingCounter(false);
    }
  };

  // Handle Accept Counter Offer (By Buyer)
  const handleAcceptCounterOffer = async (offer: MarketOffer) => {
    if (!user || user.uid !== offer.buyerId || !offer.counterAmount) return;

    if (walletBalance < offer.counterAmount) {
      alert(`Insufficient ARTCOIN balance (${formatCurrency(walletBalance)}). You need ${formatCurrency(offer.counterAmount)} to accept this counter offer.`);
      onOpenWallet();
      return;
    }

    setIsProcessingOfferAction(offer.id);
    try {
      const buyerRef = doc(db, 'users', user.uid);
      const sellerRef = doc(db, 'users', offer.sellerId);
      const listingRef = doc(db, 'market_listings', offer.listingId);
      const offerRef = doc(db, 'market_offers', offer.id);

      // 1. Transfer card to buyer & deduct ARTCOIN from buyer
      const nextBuyerVault = [...userVaultArray, offer.cardId];

      await updateDoc(buyerRef, {
        walletBalance: increment(-offer.counterAmount),
        vaultIds: nextBuyerVault,
        collectionIds: nextBuyerVault
      });

      // 2. Remove card from seller & credit counterAmount to seller
      const sellerSnap = await getDoc(sellerRef);
      if (sellerSnap.exists()) {
        const sellerData = sellerSnap.data();
        const sellerVault: string[] = Array.isArray(sellerData.vaultIds)
          ? [...sellerData.vaultIds]
          : (Array.isArray(sellerData.collectionIds) ? [...sellerData.collectionIds] : []);
        const idxToRemove = sellerVault.indexOf(offer.cardId);
        if (idxToRemove !== -1) {
          sellerVault.splice(idxToRemove, 1);
        }
        await updateDoc(sellerRef, {
          walletBalance: increment(offer.counterAmount),
          vaultIds: sellerVault,
          collectionIds: sellerVault
        });
      }

      // 3. Mark listing as SOLD
      await updateDoc(listingRef, {
        status: 'sold',
        price: offer.counterAmount,
        buyerId: user.uid,
        buyerName: user.displayName || user.email?.split('@')[0] || 'Collector',
        buyerAvatar: user.photoURL || '',
        soldAt: Date.now()
      });

      // 4. Mark offer as ACCEPTED
      await updateDoc(offerRef, {
        status: 'accepted',
        acceptedAt: Date.now(),
        updatedAt: Date.now()
      });

      // 5. Log transactions
      const txRef = collection(db, 'transactions');
      await addDoc(txRef, {
        userId: user.uid,
        type: 'market_buy',
        amount: offer.counterAmount,
        cardId: offer.cardId,
        cardName: offer.card.player,
        description: `Counter Offer Accepted: ${offer.card.player} purchased from @${offer.sellerName} for ${formatCurrency(offer.counterAmount)}`,
        timestamp: Date.now()
      });

      await addDoc(txRef, {
        userId: offer.sellerId,
        type: 'market_sell',
        amount: offer.counterAmount,
        cardId: offer.cardId,
        cardName: offer.card.player,
        description: `Counter Sale: ${offer.card.player} sold to @${user.displayName || 'Collector'} for ${formatCurrency(offer.counterAmount)}`,
        timestamp: Date.now()
      });

      // 6. Update Card Market Value & Price History in Firestore
      await updateCardMarketValueOnSale(offer.cardId, offer.counterAmount, offer.card);

      onToast(`🎉 Counter offer accepted! Purchased ${offer.card.player} for ${formatCurrency(offer.counterAmount)}! Market value updated.`);
    } catch (err: any) {
      console.error("Accept counter error:", err);
      alert(`Transaction failed: ${err.message || 'Please try again.'}`);
    } finally {
      setIsProcessingOfferAction(null);
    }
  };

  // Handle Cancel Sent Offer (By Buyer)
  const handleCancelSentOffer = async (offer: MarketOffer) => {
    if (!user || user.uid !== offer.buyerId) return;
    setIsProcessingOfferAction(offer.id);
    try {
      await updateDoc(doc(db, 'market_offers', offer.id), {
        status: 'cancelled',
        updatedAt: Date.now()
      });
      onToast("Offer cancelled.");
    } catch (err: any) {
      console.error("Cancel offer error:", err);
      alert("Failed to cancel offer.");
    } finally {
      setIsProcessingOfferAction(null);
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
              Buy, sell, and bargain cards peer-to-peer with other collectors using ARTCOIN tokens. List duplicates individually, trade rare editions, or make counter-offers.
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
              "px-4 sm:px-5 py-3 text-xs sm:text-sm font-black uppercase tracking-widest border-2 border-black transition-all flex items-center gap-2",
              activeMarketTab === 'browse'
                ? "bg-black text-[#D4FF00] shadow-[4px_4px_0px_0px_#D4FF00]"
                : "bg-white text-black hover:bg-neutral-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            )}
          >
            <ShoppingBag size={16} />
            BROWSE ({activeListings.length})
          </button>

          <button
            onClick={() => setActiveMarketTab('sell')}
            className={cn(
              "px-4 sm:px-5 py-3 text-xs sm:text-sm font-black uppercase tracking-widest border-2 border-black transition-all flex items-center gap-2",
              activeMarketTab === 'sell'
                ? "bg-[#D4FF00] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                : "bg-white text-black hover:bg-neutral-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            )}
          >
            <PlusCircle size={16} />
            SELL CARDS ({availableVaultCardItems.length})
          </button>

          <button
            onClick={() => setActiveMarketTab('offers')}
            className={cn(
              "px-4 sm:px-5 py-3 text-xs sm:text-sm font-black uppercase tracking-widest border-2 border-black transition-all flex items-center gap-2 relative",
              activeMarketTab === 'offers'
                ? "bg-black text-[#D4FF00] shadow-[4px_4px_0px_0px_#D4FF00]"
                : "bg-white text-black hover:bg-neutral-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            )}
          >
            <Handshake size={16} />
            BARGAINS
            {pendingIncomingCount > 0 && (
              <span className="bg-[#D4FF00] text-black px-1.5 py-0.2 text-[9px] font-black border border-black animate-pulse">
                {pendingIncomingCount} NEW
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveMarketTab('my-orders')}
            className={cn(
              "px-4 sm:px-5 py-3 text-xs sm:text-sm font-black uppercase tracking-widest border-2 border-black transition-all flex items-center gap-2",
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
              "px-4 sm:px-5 py-3 text-xs sm:text-sm font-black uppercase tracking-widest border-2 border-black transition-all flex items-center gap-2",
              activeMarketTab === 'history'
                ? "bg-black text-[#D4FF00] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                : "bg-white text-black hover:bg-neutral-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            )}
          >
            <History size={16} />
            SALES ({soldHistory.length})
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
              {/* Search input */}
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
                const dynamicMarketPrice = calculateCardMarketPrice(card, listings);
                const priceDiff = listing.price - dynamicMarketPrice;
                const isUnderMarket = priceDiff < 0;

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

                        {/* Calculated Market Price Badge */}
                        <div className="pt-0.5">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase border",
                            isUnderMarket 
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-neutral-100 text-neutral-700 border-neutral-300"
                          )}>
                            <Calculator size={10} />
                            MKT VAL: {formatCurrency(dynamicMarketPrice)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price & Action Footer */}
                    <div className="p-3 bg-neutral-50 border-t-2 border-black space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-neutral-500">ASKING PRICE</span>
                        <span className="text-lg font-black text-black font-mono">
                          {formatCurrency(listing.price)}
                        </span>
                      </div>

                      {isMyOwnListing ? (
                        <div className="bg-neutral-200 text-neutral-700 py-2 text-center text-xs font-black uppercase border border-neutral-400">
                          YOUR LISTING
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => openBargainModal(listing)}
                            className="py-2.5 px-2 bg-white hover:bg-neutral-100 text-black border-2 border-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#D4FF00]"
                          >
                            <Handshake size={14} /> BARGAIN
                          </button>

                          <button
                            onClick={() => handleBuyMarketCard(listing)}
                            disabled={isProcessingBuy === listing.id}
                            className={cn(
                              "py-2.5 px-2 border-2 border-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                              canAfford
                                ? "bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black"
                                : "bg-white hover:bg-neutral-100 text-black"
                            )}
                          >
                            {isProcessingBuy === listing.id ? (
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                BUYING...
                              </div>
                            ) : canAfford ? (
                              <>
                                <Coins size={14} /> BUY NOW
                              </>
                            ) : (
                              <>
                                TOP UP
                              </>
                            )}
                          </button>
                        </div>
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

      {/* Tab 2: Sell Vault Card (with search, filter, and multiple duplicates display) */}
      {activeMarketTab === 'sell' && (
        <div className="space-y-8">
          <div className="bg-white border-3 border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-black pb-4 gap-4">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight text-black flex items-center gap-2">
                  <Tag size={24} /> SELECT A CARD FROM YOUR VAULT TO SELL
                </h3>
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mt-1">
                  Every duplicate copy is listed individually. Search and filter your vault to easily find the card you want to list.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-[#D4FF00] text-black border border-black px-3 py-1 text-xs font-black uppercase font-mono">
                  {availableVaultCardItems.length} UNLISTED CARDS
                </span>
              </div>
            </div>

            {/* Easy Search and Filter Controls for Sell Tab */}
            <div className="bg-neutral-50 border-2 border-black p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Search Bar */}
                <div className="relative sm:col-span-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="EASY SEARCH: PLAYER, CLUB, NATION, #..."
                    value={sellSearchQuery}
                    onChange={(e) => setSellSearchQuery(e.target.value)}
                    className="w-full bg-white border-2 border-black pl-9 pr-8 py-2 text-xs font-black uppercase focus:outline-none focus:border-[#D4FF00]"
                  />
                  {sellSearchQuery && (
                    <button
                      onClick={() => setSellSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Sort dropdown */}
                <select
                  value={sellSortBy}
                  onChange={(e) => setSellSortBy(e.target.value as any)}
                  className="bg-white border-2 border-black p-2 text-xs font-black uppercase focus:outline-none"
                >
                  <option value="most-owned">SORT: MOST DUPLICATES OWNED</option>
                  <option value="price-desc">SORT: HIGHEST MARKET VALUE</option>
                  <option value="price-asc">SORT: LOWEST MARKET VALUE</option>
                  <option value="player-asc">SORT: PLAYER NAME (A-Z)</option>
                </select>
              </div>

              {/* Rarity Quick Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-200">
                <span className="text-[10px] font-black uppercase text-neutral-500 mr-1">FILTER RARITY:</span>
                {[
                  { label: 'ALL RARITIES', val: '' },
                  { label: '1-OF-1 SHIELD', val: '1-of-1 Shield' },
                  { label: 'GOLD AUTOGRAPH', val: 'Gold Autograph' },
                  { label: 'SILVER REFRACTOR', val: 'Silver Refractor' },
                  { label: 'BASE', val: 'Base' }
                ].map(r => (
                  <button
                    key={r.label}
                    onClick={() => setSellFilterRarity(r.val)}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-black uppercase border transition-colors",
                      sellFilterRarity === r.val
                        ? "bg-black text-[#D4FF00] border-black"
                        : "bg-white text-black border-neutral-300 hover:border-black"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Unlisted Vault Cards Grid */}
            {filteredAvailableVaultCards.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredAvailableVaultCards.map((item) => {
                  const { card, copyNumber, totalOwned, instanceKey } = item;
                  const isSelected = selectedVaultCard?.id === card.id;
                  return (
                    <div
                      key={instanceKey}
                      onClick={() => {
                        setSelectedVaultCard(card);
                        setSelectedVaultCopyNumber(copyNumber);
                        setSellQuantity(1);
                        setSellPriceInput(card.currentPrice || 100);
                      }}
                      className={cn(
                        "p-3 border-2 border-black cursor-pointer transition-all flex flex-col justify-between relative shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                        isSelected
                          ? "bg-black text-white ring-4 ring-[#D4FF00] scale-105 z-10"
                          : "bg-white hover:bg-neutral-50"
                      )}
                    >
                      <div className="aspect-[750/1050] bg-white border border-black overflow-hidden mb-2 relative">
                        <img src={card.imageUrl} alt={card.player} className="w-full h-full object-cover" />
                        {totalOwned > 1 && (
                          <div className="absolute top-1 right-1 bg-black text-[#D4FF00] px-1.5 py-0.5 text-[8px] font-black border border-black uppercase">
                            COPY #{copyNumber}/{totalOwned}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={cn(
                            "text-[8px] font-black uppercase px-1 py-0.2 border",
                            isSelected ? "bg-[#D4FF00] text-black border-black" : "bg-neutral-100 text-neutral-800 border-black/30"
                          )}>
                            {card.rarity}
                          </span>
                          {totalOwned > 1 && (
                            <span className="text-[8px] font-black text-neutral-400 uppercase">
                              COPY #{copyNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-black uppercase truncate">{card.player}</div>
                        <div className="text-[9px] font-bold text-neutral-400 uppercase truncate">{card.team}</div>
                        <div className="text-xs font-black text-[#D4FF00] font-mono pt-1">
                          Mkt Value: {formatCurrency(card.currentPrice)}
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
                <h4 className="text-xl font-black uppercase tracking-tight text-black">
                  {sellSearchQuery || sellFilterRarity ? 'NO MATCHING VAULT CARDS' : 'NO UNLISTED VAULT CARDS'}
                </h4>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider max-w-md mx-auto">
                  {sellSearchQuery || sellFilterRarity 
                    ? 'No unlisted cards in your vault match your current search or rarity filter. Try clearing the filter.' 
                    : "You don't have any unlisted cards in your Vault right now. Buy cards on the Transfer Market or open booster packs to collect cards!"}
                </p>
                {(sellSearchQuery || sellFilterRarity) && (
                  <button
                    onClick={() => {
                      setSellSearchQuery('');
                      setSellFilterRarity('');
                    }}
                    className="bg-black text-[#D4FF00] px-4 py-2 text-xs font-black uppercase"
                  >
                    CLEAR FILTERS
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sell Drawer / Form when card is selected */}
          {selectedVaultCard && (() => {
            const unlistedForSelected = availableVaultCardItems.filter(item => item.card.id === selectedVaultCard.id);
            const unlistedCount = unlistedForSelected.length;
            const totalOwned = ownedCountMap.get(selectedVaultCard.id) || 1;
            const dynamicMktVal = calculateCardMarketPrice(selectedVaultCard, listings);

            return (
              <div className="bg-black text-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_#D4FF00] animate-fadeIn">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  {/* Left Card Info */}
                  <div className="flex items-center gap-6">
                    <div className="w-28 sm:w-36 aspect-[750/1050] bg-white border-3 border-[#D4FF00] overflow-hidden shrink-0 shadow-[4px_4px_0px_0px_rgba(212,255,0,0.5)] relative">
                      <img src={selectedVaultCard.imageUrl} alt={selectedVaultCard.player} className="w-full h-full object-cover" />
                      {totalOwned > 1 && (
                        <div className="absolute top-1 right-1 bg-black text-[#D4FF00] px-2 py-0.5 text-[9px] font-black border border-[#D4FF00] uppercase">
                          COPY #{selectedVaultCopyNumber}/{totalOwned}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-[#D4FF00] text-black px-2 py-0.5 text-[10px] font-black uppercase border border-black">
                          READY TO LIST ON MARKET
                        </span>
                        {totalOwned > 1 && (
                          <span className="bg-neutral-800 text-[#D4FF00] px-2 py-0.5 text-[10px] font-black uppercase border border-neutral-600">
                            {unlistedCount} UNLISTED AVAILABLE (TOTAL: {totalOwned})
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                        {selectedVaultCard.player}
                      </h3>
                      <p className="text-xs text-neutral-400 font-bold uppercase">
                        {selectedVaultCard.team} • {selectedVaultCard.rarity} • #{selectedVaultCard.cardNumber}
                      </p>
                      <div className="bg-neutral-900 border border-neutral-700 p-2 text-xs font-mono text-neutral-300">
                        Dynamic Formula Market Value: <strong className="text-[#D4FF00]">{formatCurrency(dynamicMktVal)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Right Price Setting & Confirm */}
                  <div className="bg-neutral-900 border-2 border-neutral-700 p-6 space-y-4 w-full md:w-96 shrink-0">
                    {unlistedCount > 1 && (
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-[#D4FF00] mb-2">
                          SELECT QUANTITY TO LIST ({unlistedCount} AVAILABLE)
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3, unlistedCount].filter((q, idx, arr) => q <= unlistedCount && arr.indexOf(q) === idx).map(qty => (
                            <button
                              key={qty}
                              type="button"
                              onClick={() => setSellQuantity(qty)}
                              className={cn(
                                "flex-1 py-1.5 text-xs font-black uppercase border transition-colors",
                                sellQuantity === qty
                                  ? "bg-[#D4FF00] text-black border-[#D4FF00]"
                                  : "bg-neutral-800 text-white border-neutral-700 hover:border-[#D4FF00]"
                              )}
                            >
                              {qty === unlistedCount && qty > 1 ? `ALL (${qty})` : `${qty} COPY`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-[#D4FF00] mb-2">
                        SET ASKING PRICE {sellQuantity > 1 ? 'PER COPY ' : ''}(ARTCOIN)
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
                        { label: '100% (Market)', mult: 1.0 },
                        { label: '150% (High)', mult: 1.5 },
                        { label: '200% (Premium)', mult: 2.0 }
                      ].map(p => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setSellPriceInput(Math.round(dynamicMktVal * p.mult))}
                          className="flex-1 py-1 bg-neutral-800 hover:bg-[#D4FF00] hover:text-black text-[8px] font-black uppercase border border-neutral-700 transition-colors"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {sellQuantity > 1 && (
                      <div className="text-right text-xs font-mono text-[#D4FF00]">
                        Total Value: <strong>{formatCurrency(sellPriceInput * sellQuantity)}</strong> ({sellQuantity} × {formatCurrency(sellPriceInput)})
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        onClick={handleConfirmListCard}
                        disabled={isListingCard}
                        className="w-full py-4 bg-[#D4FF00] hover:bg-white text-black border-2 border-black font-black text-sm uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all"
                      >
                        {isListingCard 
                          ? 'LISTING TO MARKET...' 
                          : sellQuantity > 1
                            ? `CONFIRM & LIST ${sellQuantity} COPIES (${formatCurrency(sellPriceInput)} EA)`
                            : `CONFIRM & LIST FOR ${formatCurrency(sellPriceInput)}`
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab 3: Bargaining & Offers Center */}
      {activeMarketTab === 'offers' && (
        <div className="space-y-6">
          <div className="bg-white border-3 border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-black pb-4 gap-4">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight text-black flex items-center gap-2">
                  <Handshake size={24} /> PEER-TO-PEER BARGAINING CENTER
                </h3>
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mt-1">
                  Negotiate card transfers, review incoming buyer offers, and make counter-offers.
                </p>
              </div>

              {/* Sub-tabs: Incoming vs Sent */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOffersSubTab('incoming')}
                  className={cn(
                    "px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-black transition-colors flex items-center gap-1.5",
                    offersSubTab === 'incoming'
                      ? "bg-black text-[#D4FF00]"
                      : "bg-white text-black hover:bg-neutral-100"
                  )}
                >
                  INCOMING OFFERS ({incomingOffers.length})
                  {pendingIncomingCount > 0 && (
                    <span className="bg-[#D4FF00] text-black px-1.5 py-0.2 text-[9px] font-black ml-1">
                      {pendingIncomingCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setOffersSubTab('sent')}
                  className={cn(
                    "px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-black transition-colors flex items-center gap-1.5",
                    offersSubTab === 'sent'
                      ? "bg-black text-[#D4FF00]"
                      : "bg-white text-black hover:bg-neutral-100"
                  )}
                >
                  SENT OFFERS ({sentOffers.length})
                </button>
              </div>
            </div>

            {/* INCOMING OFFERS (Seller View) */}
            {offersSubTab === 'incoming' && (
              <div>
                {incomingOffers.length > 0 ? (
                  <div className="space-y-4">
                    {incomingOffers.map((offer) => {
                      const discount = offer.originalPrice > 0 ? Math.round(((offer.originalPrice - offer.offerAmount) / offer.originalPrice) * 100) : 0;
                      const isPending = offer.status === 'pending';
                      const isCountered = offer.status === 'countered';
                      const isAccepted = offer.status === 'accepted';
                      const isDeclined = offer.status === 'declined';
                      const isBusy = isProcessingOfferAction === offer.id;

                      return (
                        <div
                          key={offer.id}
                          className="bg-neutral-50 border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/10 pb-3">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "px-2 py-0.5 text-[9px] font-black uppercase border",
                                isPending && "bg-amber-300 text-black border-black",
                                isCountered && "bg-purple-300 text-black border-black",
                                isAccepted && "bg-emerald-500 text-white border-black",
                                isDeclined && "bg-neutral-300 text-neutral-700 border-neutral-400"
                              )}>
                                STATUS: {offer.status.toUpperCase()}
                              </span>
                              <span className="text-xs font-bold text-neutral-600">
                                From: <button onClick={() => onViewUserProfile(offer.buyerId)} className="font-black text-black underline">@{offer.buyerName}</button>
                              </span>
                            </div>

                            <span className="text-[10px] font-mono text-neutral-500">
                              {new Date(offer.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                            {/* Card Details */}
                            <div className="flex items-center gap-4">
                              <div 
                                onClick={() => onSelectCard(offer.card)}
                                className="w-16 aspect-[750/1050] bg-white border border-black overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform"
                              >
                                <img src={offer.card?.imageUrl} alt={offer.card?.player} className="w-full h-full object-cover" />
                              </div>

                              <div className="space-y-1">
                                <h4 
                                  onClick={() => onSelectCard(offer.card)}
                                  className="text-base font-black uppercase text-black cursor-pointer hover:underline"
                                >
                                  {offer.card?.player}
                                </h4>
                                <p className="text-xs text-neutral-500 font-bold uppercase">
                                  {offer.card?.team} • {offer.card?.rarity}
                                </p>
                                {offer.message && (
                                  <p className="text-xs text-neutral-700 bg-white border border-neutral-300 p-2 italic">
                                    "{offer.message}"
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Price Comparison */}
                            <div className="bg-white border-2 border-black p-3 text-right shrink-0 space-y-1 min-w-[180px]">
                              <div className="text-[10px] font-black uppercase text-neutral-500">
                                ASKING: {formatCurrency(offer.originalPrice)}
                              </div>
                              <div className="text-xl font-black text-black font-mono">
                                OFFER: {formatCurrency(offer.offerAmount)}
                              </div>
                              {discount > 0 ? (
                                <div className="text-[10px] font-black text-rose-600 uppercase">
                                  {discount}% BELOW ASKING
                                </div>
                              ) : (
                                <div className="text-[10px] font-black text-emerald-600 uppercase">
                                  AT ASKING PRICE
                                </div>
                              )}

                              {isCountered && offer.counterAmount && (
                                <div className="pt-1 border-t border-neutral-200 text-xs font-black text-purple-700 font-mono">
                                  YOU COUNTERED: {formatCurrency(offer.counterAmount)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons for Seller */}
                          {isPending && (
                            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-black/10">
                              <button
                                onClick={() => handleDeclineOffer(offer)}
                                disabled={isBusy}
                                className="px-4 py-2 bg-white hover:bg-red-50 text-red-600 border-2 border-red-600 text-xs font-black uppercase tracking-wider transition-colors"
                              >
                                DECLINE
                              </button>

                              <button
                                onClick={() => handleOpenCounterModal(offer)}
                                disabled={isBusy}
                                className="px-4 py-2 bg-white hover:bg-neutral-100 text-black border-2 border-black text-xs font-black uppercase tracking-wider transition-colors"
                              >
                                COUNTER-OFFER
                              </button>

                              <button
                                onClick={() => handleAcceptOffer(offer)}
                                disabled={isBusy}
                                className="px-5 py-2 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black text-xs font-black uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                              >
                                {isBusy ? 'PROCESSING...' : `ACCEPT OFFER (${formatCurrency(offer.offerAmount)})`}
                              </button>
                            </div>
                          )}

                          {isAccepted && (
                            <div className="bg-emerald-100 text-emerald-900 border border-emerald-300 p-2 text-center text-xs font-black uppercase">
                              ✓ YOU ACCEPTED THIS OFFER — CARD TRANSFERRED FOR {formatCurrency(offer.offerAmount)}
                            </div>
                          )}

                          {isDeclined && (
                            <div className="bg-neutral-200 text-neutral-600 border border-neutral-300 p-2 text-center text-[10px] font-bold uppercase">
                              OFFER DECLINED
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-16 text-center space-y-3">
                    <Handshake size={44} className="mx-auto text-neutral-400" />
                    <h4 className="text-xl font-black uppercase tracking-tight text-black">NO INCOMING OFFERS</h4>
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider max-w-md mx-auto">
                      You don't have any pending bargain offers on your market listings right now.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* SENT OFFERS (Buyer View) */}
            {offersSubTab === 'sent' && (
              <div>
                {sentOffers.length > 0 ? (
                  <div className="space-y-4">
                    {sentOffers.map((offer) => {
                      const isPending = offer.status === 'pending';
                      const isCountered = offer.status === 'countered';
                      const isAccepted = offer.status === 'accepted';
                      const isDeclined = offer.status === 'declined';
                      const isCancelled = offer.status === 'cancelled';
                      const isBusy = isProcessingOfferAction === offer.id;

                      return (
                        <div
                          key={offer.id}
                          className="bg-neutral-50 border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/10 pb-3">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "px-2 py-0.5 text-[9px] font-black uppercase border",
                                isPending && "bg-amber-300 text-black border-black",
                                isCountered && "bg-purple-300 text-black border-black animate-pulse",
                                isAccepted && "bg-emerald-500 text-white border-black",
                                isDeclined && "bg-neutral-300 text-neutral-700 border-neutral-400",
                                isCancelled && "bg-neutral-200 text-neutral-500 border-neutral-300"
                              )}>
                                {isCountered ? 'SELLER PROPOSED COUNTER-OFFER!' : `STATUS: ${offer.status.toUpperCase()}`}
                              </span>
                              <span className="text-xs font-bold text-neutral-600">
                                To Seller: <button onClick={() => onViewUserProfile(offer.sellerId)} className="font-black text-black underline">@{offer.sellerName}</button>
                              </span>
                            </div>

                            <span className="text-[10px] font-mono text-neutral-500">
                              {new Date(offer.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                            {/* Card Details */}
                            <div className="flex items-center gap-4">
                              <div 
                                onClick={() => onSelectCard(offer.card)}
                                className="w-16 aspect-[750/1050] bg-white border border-black overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform"
                              >
                                <img src={offer.card?.imageUrl} alt={offer.card?.player} className="w-full h-full object-cover" />
                              </div>

                              <div className="space-y-1">
                                <h4 
                                  onClick={() => onSelectCard(offer.card)}
                                  className="text-base font-black uppercase text-black cursor-pointer hover:underline"
                                >
                                  {offer.card?.player}
                                </h4>
                                <p className="text-xs text-neutral-500 font-bold uppercase">
                                  {offer.card?.team} • {offer.card?.rarity}
                                </p>
                                {offer.message && (
                                  <p className="text-xs text-neutral-700 bg-white border border-neutral-300 p-2 italic">
                                    Your note: "{offer.message}"
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Price Comparison */}
                            <div className="bg-white border-2 border-black p-3 text-right shrink-0 space-y-1 min-w-[180px]">
                              <div className="text-[10px] font-black uppercase text-neutral-500">
                                ASKING: {formatCurrency(offer.originalPrice)}
                              </div>
                              <div className="text-xl font-black text-black font-mono">
                                YOUR OFFER: {formatCurrency(offer.offerAmount)}
                              </div>

                              {isCountered && offer.counterAmount && (
                                <div className="pt-2 border-t border-black space-y-1">
                                  <div className="text-[10px] font-black uppercase text-purple-700">
                                    SELLER COUNTER:
                                  </div>
                                  <div className="text-2xl font-black text-purple-700 font-mono">
                                    {formatCurrency(offer.counterAmount)}
                                  </div>
                                  {offer.counterMessage && (
                                    <p className="text-[10px] text-neutral-600 italic">
                                      "{offer.counterMessage}"
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions for Sent Offers */}
                          {isCountered && (
                            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-black/10">
                              <button
                                onClick={() => handleCancelSentOffer(offer)}
                                disabled={isBusy}
                                className="px-4 py-2 bg-white hover:bg-red-50 text-red-600 border-2 border-red-600 text-xs font-black uppercase tracking-wider transition-colors"
                              >
                                DECLINE COUNTER
                              </button>

                              <button
                                onClick={() => handleAcceptCounterOffer(offer)}
                                disabled={isBusy}
                                className="px-5 py-2 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black text-xs font-black uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                              >
                                {isBusy ? 'PROCESSING...' : `ACCEPT COUNTER (${formatCurrency(offer.counterAmount!)})`}
                              </button>
                            </div>
                          )}

                          {isPending && (
                            <div className="flex items-center justify-between pt-2 border-t border-black/10">
                              <span className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-1">
                                <Clock size={14} /> Awaiting seller review...
                              </span>
                              <button
                                onClick={() => handleCancelSentOffer(offer)}
                                disabled={isBusy}
                                className="px-3 py-1 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-400 text-xs font-black uppercase"
                              >
                                CANCEL OFFER
                              </button>
                            </div>
                          )}

                          {isAccepted && (
                            <div className="bg-emerald-100 text-emerald-900 border border-emerald-300 p-2 text-center text-xs font-black uppercase">
                              ✓ OFFER ACCEPTED! THE CARD HAS BEEN ADDED TO YOUR VAULT.
                            </div>
                          )}

                          {isDeclined && (
                            <div className="bg-neutral-200 text-neutral-600 border border-neutral-300 p-2 text-center text-[10px] font-bold uppercase">
                              OFFER DECLINED BY SELLER
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-16 text-center space-y-3">
                    <Handshake size={44} className="mx-auto text-neutral-400" />
                    <h4 className="text-xl font-black uppercase tracking-tight text-black">NO SENT OFFERS</h4>
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider max-w-md mx-auto">
                      You haven't made any bargain offers yet. Browse active listings and click "BARGAIN" to negotiate prices with sellers!
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => setActiveMarketTab('browse')}
                        className="bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-6 py-3 text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-colors"
                      >
                        BROWSE TRANSFER MARKET
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: My Listings */}
      {activeMarketTab === 'my-orders' && (() => {
        const myListingCountMap = new Map<string, number>();
        myListings.forEach(l => {
          myListingCountMap.set(l.cardId, (myListingCountMap.get(l.cardId) || 0) + 1);
        });
        const myListingIndexMap = new Map<string, number>();
        const uniqueCardsCount = new Set(myListings.map(l => l.cardId)).size;

        return (
          <div className="space-y-6">
            <div className="bg-white border-3 border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-black pb-4 mb-6 gap-4">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-black flex items-center gap-2">
                    <Tag size={24} /> YOUR ACTIVE MARKET LISTINGS
                  </h3>
                  <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mt-1">
                    Manage the cards you currently have listed for sale on the public marketplace.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="bg-black text-[#D4FF00] px-3 py-1 text-xs font-black uppercase">
                    {myListings.length} TOTAL LISTINGS
                  </span>
                  {myListings.length > uniqueCardsCount && (
                    <span className="bg-[#D4FF00] text-black border border-black px-2.5 py-1 text-xs font-black uppercase">
                      {uniqueCardsCount} UNIQUE CARDS
                    </span>
                  )}
                </div>
              </div>

              {myListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myListings.map((listing) => {
                    const totalListedForCard = myListingCountMap.get(listing.cardId) || 1;
                    const curIndex = (myListingIndexMap.get(listing.cardId) || 0) + 1;
                    myListingIndexMap.set(listing.cardId, curIndex);
                    const dynamicMarketVal = calculateCardMarketPrice(listing.card, listings);

                    return (
                      <div
                        key={listing.id}
                        className="bg-neutral-50 border-2 border-black p-4 flex flex-col justify-between shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-black/10 pb-2 gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2 py-0.5 border",
                              listing.status === 'active' && "bg-[#D4FF00] text-black border-black",
                              listing.status === 'sold' && "bg-emerald-600 text-white border-black",
                              listing.status === 'cancelled' && "bg-neutral-300 text-neutral-700 border-neutral-400"
                            )}>
                              {listing.status.toUpperCase()}
                            </span>
                            {totalListedForCard > 1 && (
                              <span className="bg-black text-[#D4FF00] px-2 py-0.5 text-[9px] font-black border border-black uppercase tracking-wider">
                                COPY #{curIndex}/{totalListedForCard}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                            {new Date(listing.listedAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex gap-4 items-center">
                          <div 
                            onClick={() => onSelectCard(listing.card)}
                            className="w-16 aspect-[750/1050] bg-white border border-black shrink-0 overflow-hidden cursor-pointer relative hover:scale-105 transition-transform"
                          >
                            <img src={listing.card.imageUrl} alt={listing.card.player} className="w-full h-full object-cover" />
                            {totalListedForCard > 1 && (
                              <div className="absolute top-1 right-1 bg-black text-[#D4FF00] px-1 py-0.2 text-[7px] font-black border border-black uppercase">
                                #{curIndex}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] font-black uppercase px-1 py-0.2 bg-neutral-200 text-neutral-800 border border-neutral-400">
                                {listing.card.rarity}
                              </span>
                            </div>
                            <h4 
                              onClick={() => onSelectCard(listing.card)}
                              className="text-sm font-black uppercase text-black truncate cursor-pointer hover:underline"
                            >
                              {listing.card.player}
                            </h4>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase truncate">{listing.card.team}</p>
                            <div className="text-base font-black text-black font-mono">
                              Asking: {formatCurrency(listing.price)}
                            </div>
                            <div className="text-[9px] font-bold text-neutral-500 font-mono">
                              Est Value: {formatCurrency(dynamicMarketVal)}
                            </div>
                          </div>
                        </div>

                        {listing.status === 'active' && (
                          <button
                            onClick={() => handleCancelListing(listing)}
                            className="w-full py-2 bg-white hover:bg-red-50 text-red-600 border-2 border-red-600 text-xs font-black uppercase tracking-wider transition-colors shadow-[2px_2px_0px_0px_rgba(220,38,38,0.2)]"
                          >
                            CANCEL LISTING & RETRIEVE CARD
                          </button>
                        )}

                        {listing.status === 'sold' && (
                          <div className="bg-emerald-50 text-emerald-900 border border-emerald-300 p-2 text-center text-xs font-black uppercase">
                            ✓ SOLD TO @{listing.buyerName || 'COLLECTOR'} FOR {formatCurrency(listing.price)}
                          </div>
                        )}

                        {listing.status === 'cancelled' && (
                          <div className="bg-neutral-200 text-neutral-600 border border-neutral-300 p-2 text-center text-[10px] font-bold uppercase">
                            CANCELLED & RETURNED TO VAULT
                          </div>
                        )}
                      </div>
                    );
                  })}
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
        );
      })()}

      {/* Tab 5: Sales History */}
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

      {/* Bargain / Make Offer Modal */}
      <AnimatePresence>
        {bargainModalListing && (() => {
          const card = bargainModalListing.card;
          const dynamicMarketPrice = calculateCardMarketPrice(card, listings);
          const baseStartingPrice = getCardStartingPrice(card);
          const discount = bargainModalListing.price > 0 ? Math.round(((bargainModalListing.price - bargainOfferAmount) / bargainModalListing.price) * 100) : 0;
          const canAffordOffer = walletBalance >= bargainOfferAmount;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white border-4 border-black p-6 sm:p-8 max-w-lg w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] space-y-6 relative max-h-[90vh] overflow-y-auto"
              >
                {/* Close button */}
                <button
                  onClick={() => setBargainModalListing(null)}
                  className="absolute right-4 top-4 text-black hover:text-neutral-600 p-1 border-2 border-black bg-neutral-100"
                >
                  <X size={18} />
                </button>

                <div>
                  <span className="bg-[#D4FF00] text-black px-2.5 py-0.5 text-xs font-black uppercase border border-black inline-flex items-center gap-1">
                    <Handshake size={14} /> BARGAIN & MAKE OFFER
                  </span>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-black mt-2">
                    PROPOSE PRICE TO SELLER
                  </h3>
                  <p className="text-xs font-bold text-neutral-500 uppercase">
                    Negotiate a custom price with @{bargainModalListing.sellerName}.
                  </p>
                </div>

                {/* Card preview strip */}
                <div className="bg-neutral-50 border-2 border-black p-3 flex items-center gap-4">
                  <div className="w-14 aspect-[750/1050] bg-white border border-black overflow-hidden shrink-0">
                    <img src={card.imageUrl} alt={card.player} className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.2 bg-black text-[#D4FF00]">
                      {card.rarity}
                    </span>
                    <h4 className="text-sm font-black uppercase text-black truncate">{card.player}</h4>
                    <p className="text-[10px] text-neutral-500 uppercase">{card.team} • #{card.cardNumber}</p>
                    <div className="text-xs font-black text-black">
                      Asking: <span className="font-mono">{formatCurrency(bargainModalListing.price)}</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Formula Valuation Indicator */}
                <div className="bg-neutral-100 border-2 border-black p-3 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-neutral-600">
                    <span className="flex items-center gap-1"><Calculator size={12} /> Dynamic Market Valuation</span>
                    <span className="font-mono text-black font-black">{formatCurrency(dynamicMarketPrice)}</span>
                  </div>
                  <p className="text-[9px] font-bold text-neutral-500 uppercase leading-snug">
                    Formula: (Base {formatCurrency(baseStartingPrice)} + {activeListings.filter(l => l.cardId === card.id).length} Active Listings) ÷ Total Units
                  </p>
                </div>

                {/* Offer Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-black">
                    YOUR OFFER AMOUNT (ARTCOIN)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="10"
                      step="10"
                      value={bargainOfferAmount}
                      onChange={(e) => setBargainOfferAmount(Number(e.target.value))}
                      className="w-full bg-neutral-50 border-3 border-black p-3 text-2xl font-black font-mono text-black focus:outline-none focus:bg-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-neutral-500">
                      ARTCOIN
                    </span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-neutral-500">QUICK OFFER SUGGESTIONS:</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: '-30%', amt: Math.round(bargainModalListing.price * 0.7) },
                      { label: '-20%', amt: Math.round(bargainModalListing.price * 0.8) },
                      { label: '-10%', amt: Math.round(bargainModalListing.price * 0.9) },
                      { label: 'Fair Mkt', amt: Math.min(bargainModalListing.price, dynamicMarketPrice) }
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setBargainOfferAmount(p.amt)}
                        className="py-1.5 bg-white hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black text-[10px] font-black uppercase transition-colors"
                      >
                        {p.label} ({formatCurrency(p.amt)})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Note/Message */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-black">
                    MESSAGE / NOTE TO SELLER (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ready to buy right now! Let me know."
                    value={bargainOfferMessage}
                    onChange={(e) => setBargainOfferMessage(e.target.value)}
                    maxLength={100}
                    className="w-full bg-neutral-50 border-2 border-black p-2.5 text-xs font-bold focus:outline-none focus:bg-white"
                  />
                </div>

                {/* Wallet Balance Check */}
                <div className="flex items-center justify-between text-xs font-black uppercase p-2.5 bg-neutral-50 border border-black">
                  <span>YOUR AVAILABLE BALANCE:</span>
                  <span className={canAffordOffer ? "text-emerald-700 font-mono" : "text-rose-600 font-mono"}>
                    {formatCurrency(walletBalance)}
                  </span>
                </div>

                {/* Submit button */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleSubmitOffer}
                    disabled={isSubmittingOffer || !canAffordOffer}
                    className={cn(
                      "w-full py-4 border-2 border-black font-black text-sm uppercase tracking-widest transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                      canAffordOffer 
                        ? "bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black"
                        : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                    )}
                  >
                    {isSubmittingOffer 
                      ? 'SENDING BARGAIN OFFER...' 
                      : canAffordOffer
                        ? `SEND OFFER FOR ${formatCurrency(bargainOfferAmount)}`
                        : `INSUFFICIENT BALANCE (${formatCurrency(walletBalance)})`
                    }
                  </button>

                  <button
                    type="button"
                    onClick={() => setBargainModalListing(null)}
                    className="w-full py-2 text-xs font-black uppercase text-neutral-500 hover:text-black"
                  >
                    CANCEL
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Counter Offer Modal */}
      <AnimatePresence>
        {counterModalOffer && (() => {
          const offer = counterModalOffer;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white border-4 border-black p-6 sm:p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] space-y-6 relative"
              >
                <button
                  onClick={() => setCounterModalOffer(null)}
                  className="absolute right-4 top-4 text-black hover:text-neutral-600 p-1 border-2 border-black bg-neutral-100"
                >
                  <X size={18} />
                </button>

                <div>
                  <span className="bg-purple-300 text-black px-2.5 py-0.5 text-xs font-black uppercase border border-black inline-flex items-center gap-1">
                    <Handshake size={14} /> PROPOSE COUNTER-OFFER
                  </span>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-black mt-2">
                    COUNTER @{offer.buyerName}'S OFFER
                  </h3>
                  <p className="text-xs font-bold text-neutral-500 uppercase">
                    Buyer offered {formatCurrency(offer.offerAmount)} (Asking was {formatCurrency(offer.originalPrice)}).
                  </p>
                </div>

                {/* Counter Price Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-black">
                    YOUR COUNTER-PRICE (ARTCOIN)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="10"
                      step="10"
                      value={counterPriceInput}
                      onChange={(e) => setCounterPriceInput(Number(e.target.value))}
                      className="w-full bg-neutral-50 border-3 border-black p-3 text-2xl font-black font-mono text-black focus:outline-none focus:bg-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-neutral-500">
                      ARTCOIN
                    </span>
                  </div>
                </div>

                {/* Counter Note */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-black">
                    COUNTER NOTE TO BUYER (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lowest I can go is this price, deal?"
                    value={counterNoteInput}
                    onChange={(e) => setCounterNoteInput(e.target.value)}
                    maxLength={100}
                    className="w-full bg-neutral-50 border-2 border-black p-2.5 text-xs font-bold focus:outline-none focus:bg-white"
                  />
                </div>

                {/* Submit button */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleSubmitCounter}
                    disabled={isSubmittingCounter}
                    className="w-full py-4 bg-black hover:bg-[#D4FF00] text-[#D4FF00] hover:text-black border-2 border-black font-black text-sm uppercase tracking-widest transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    {isSubmittingCounter ? 'SENDING COUNTER...' : `SEND COUNTER-OFFER (${formatCurrency(counterPriceInput)})`}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCounterModalOffer(null)}
                    className="w-full py-2 text-xs font-black uppercase text-neutral-500 hover:text-black"
                  >
                    CANCEL
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
