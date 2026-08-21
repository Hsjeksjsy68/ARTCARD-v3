import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Grid3X3, 
  WalletCards, 
  RefreshCw, 
  Flame, 
  DollarSign, 
  ArrowUpDown, 
  SlidersHorizontal, 
  Sparkles, 
  X, 
  ChevronRight, 
  ChevronDown, 
  Trophy, 
  Heart, 
  ShoppingCart, 
  Award, 
  Medal, 
  Users, 
  Menu, 
  Filter, 
  Plus, 
  Tag, 
  ShoppingBag,
  Layers,
  Check,
  Shield,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cardsDatabase } from './data';
import { CardItem } from './components/CardItem';
import { CardPreviewPage } from './components/CardPreviewPage';
import { AdminForm } from './components/AdminForm';
import { ManageShop } from './components/ManageShop';
import { PackShop } from './components/PackShop';
import { UserAuth } from './components/UserAuth';
import { CustomCard } from './components/CustomCard';
import { UserProfile } from './components/UserProfile';
import { WalletModal } from './components/WalletModal';
import { Marketplace } from './components/Marketplace';
import { LeaderboardAndEvents } from './components/LeaderboardAndEvents';
import { PublicProfileModal } from './components/PublicProfileModal';
import { FootballCard, Pack } from './types';
import { formatCurrency, getDefaultStock } from './lib/utils';
import { db, auth, onAuthStateChanged, collection, doc, setDoc, getDoc, User, deleteDoc, onSnapshot, getDocs, increment, updateDoc, addDoc } from './lib/firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'database' | 'vault' | 'favorites' | 'marketplace' | 'leaderboard' | 'admin' | 'manage' | 'shop' | 'custom' | 'profile'>('database');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterRarity, setFilterRarity] = useState('');
  const [filterEdition, setFilterEdition] = useState('');
  
  // Price filter states
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [pricePreset, setPricePreset] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'year-desc' | 'year-asc' | 'player-asc'>('default');
  
  // Mobile drawer & filter tray states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopMoreOpen, setIsDesktopMoreOpen] = useState(false);
  const [isFilterTrayOpen, setIsFilterTrayOpen] = useState(false);

  // Public profile modal viewing target
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  const [selectedCard, setSelectedCard] = useState<FootballCard | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [vaultIds, setVaultIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [marketInitialSearch, setMarketInitialSearch] = useState<string>('');
  const [marketInitialTab, setMarketInitialTab] = useState<'browse' | 'sell' | 'my-orders' | 'history'>('browse');
  const [marketInitialSellCard, setMarketInitialSellCard] = useState<FootballCard | null>(null);
  const [cards, setCards] = useState<FootballCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [themes, setThemes] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load user's vault (owned), favorites, and wallet balance
        const userRef = doc(db, 'users', currentUser.uid);
        const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Support both new vaultIds and legacy collectionIds
            const vIds: string[] = Array.isArray(data.vaultIds) 
              ? data.vaultIds 
              : (Array.isArray(data.collectionIds) ? data.collectionIds : []);
            const fIds = data.favoriteIds || [];
            setVaultIds(vIds);
            setFavoriteIds(new Set(fIds));
            setWalletBalance(data.walletBalance || 0);
          } else {
            setVaultIds([]);
            setFavoriteIds(new Set());
            setWalletBalance(0);
          }
        });
        return () => unsubscribeUser();
      } else {
        setVaultIds([]);
        setFavoriteIds(new Set());
        setWalletBalance(0);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setLoadingCards(true);
    const cardsRef = collection(db, 'cards');
    const unsubscribeCards = onSnapshot(cardsRef, (snapshot) => {
      const loadedCards: FootballCard[] = [];
      snapshot.forEach(doc => {
        loadedCards.push({ id: doc.id, ...doc.data() } as FootballCard);
      });
      setCards(loadedCards);
      setLoadingCards(false);
    }, (error) => {
      console.error("Error fetching cards:", error);
      setLoadingCards(false);
    });

    const packsRef = collection(db, 'packs');
    const unsubscribePacks = onSnapshot(packsRef, (snapshot) => {
      const loadedPacks: Pack[] = [];
      snapshot.forEach(doc => {
        loadedPacks.push({ id: doc.id, ...doc.data() } as Pack);
      });
      setPacks(loadedPacks);
    }, (error) => {
      console.error("Error fetching packs:", error);
    });

    const themesRef = collection(db, 'themes');
    const unsubscribeThemes = onSnapshot(themesRef, (snapshot) => {
      const loadedThemes: any[] = [];
      snapshot.forEach(doc => {
        loadedThemes.push({ id: doc.id, ...doc.data() });
      });
      setThemes(loadedThemes);
    }, (error) => {
      console.error("Error fetching themes:", error);
    });

    return () => {
      unsubscribeCards();
      unsubscribePacks();
      unsubscribeThemes();
    };
  }, []);

  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Helper to count how many copies the user owns of a card
  const getOwnedCount = (cardId: string) => vaultIds.filter(id => id === cardId).length;

  // Handle Vault Updates (Cards bought or packed)
  const saveVaultToFirebase = async (newVault: string[]) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        email: user.email,
        vaultIds: newVault,
        collectionIds: newVault // sync legacy key
      }, { merge: true });
    } catch (error) {
      console.error("Error saving vault:", error);
    }
  };

  // Handle Favorites Toggle (User manually marks any card as favorite)
  const handleToggleFavorite = async (cardId: string) => {
    if (!user) {
      setToastMessage("Please sign in to add cards to your favorites.");
      return;
    }
    const next = new Set<string>(favoriteIds);
    const wasFavorite = next.has(cardId);
    if (wasFavorite) {
      next.delete(cardId);
      setToastMessage("Removed from Favorites.");
    } else {
      next.add(cardId);
      setToastMessage("❤️ Added to Favorites!");
    }
    setFavoriteIds(next);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        email: user.email,
        favoriteIds: Array.from(next)
      }, { merge: true });
    } catch (error) {
      console.error("Error saving favorites:", error);
    }
  };

  // Cards drawn from booster pack -> automatically placed in Vault (including duplicate copies)
  const handleCardsDrawn = (drawnCards: FootballCard[]) => {
    const drawnIds = drawnCards.map(c => c.id);
    setVaultIds(prev => {
      const next = [...prev, ...drawnIds];
      saveVaultToFirebase(next);
      return next;
    });
  };

  // Navigate to Transfer Market (with search query or sell view)
  const handleNavigateToMarket = (searchQuery?: string, tab?: 'browse' | 'sell', cardToSell?: FootballCard) => {
    setSelectedCard(null);
    setMarketInitialSearch(searchQuery || '');
    setMarketInitialTab(tab || 'browse');
    if (cardToSell) {
      setMarketInitialSellCard(cardToSell);
    } else {
      setMarketInitialSellCard(null);
    }
    switchTab('marketplace');
  };

  const handleAddCard = async (newCard: FootballCard) => {
    try {
      const { id, ...cardData } = newCard;
      const cardRef = doc(collection(db, 'cards'), id);
      await setDoc(cardRef, cardData);
      setActiveTab('database');
      setToastMessage("Card published successfully!");
    } catch (error: any) {
      console.error("Error adding card:", error);
      setToastMessage(`Error adding card: ${error.message || String(error)}`);
    }
  };

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('user-')) {
        const uid = hash.replace('user-', '');
        if (uid) setViewingUserId(uid);
      } else if (['database', 'marketplace', 'vault', 'leaderboard', 'shop', 'custom', 'favorites', 'profile', 'admin', 'manage'].includes(hash)) {
        setActiveTab(hash as any);
        setSelectedCard(null);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleSelectCard = (card: FootballCard) => {
    setSelectedCard(card);
  };

  const switchTab = (tab: 'database' | 'vault' | 'favorites' | 'marketplace' | 'leaderboard' | 'admin' | 'manage' | 'shop' | 'custom' | 'profile' | 'collection') => {
    setSelectedCard(null);
    setIsMobileMenuOpen(false);
    setIsDesktopMoreOpen(false);
    const target = tab === 'collection' ? 'vault' : tab;
    setActiveTab(target as any);
    window.location.hash = `#${target}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenUserProfile = (userId: string) => {
    setViewingUserId(userId);
    window.location.hash = `#user-${userId}`;
  };

  const handleCloseUserProfile = () => {
    setViewingUserId(null);
    if (window.location.hash.startsWith('#user-')) {
      window.location.hash = `#${activeTab}`;
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterTeam('');
    setFilterPosition('');
    setFilterRarity('');
    setFilterEdition('');
    setMinPrice('');
    setMaxPrice('');
    setPricePreset('all');
    setSortBy('default');
  };

  // Prepare items for display based on activeTab (Vault displays each owned copy)
  const cardMap = new Map<string, FootballCard>(cards.map(c => [c.id, c]));

  const baseCardsToFilter: { card: FootballCard; copyNumber?: number; totalCopies?: number; instanceKey: string }[] = 
    activeTab === 'vault'
      ? (() => {
          const copyTracker = new Map<string, number>();
          const counts = new Map<string, number>();
          vaultIds.forEach((id: string) => counts.set(id, (counts.get(id) || 0) + 1));
          
          const items: { card: FootballCard; copyNumber: number; totalCopies: number; instanceKey: string }[] = [];
          vaultIds.forEach((id: string, index: number) => {
            const c = cardMap.get(id);
            if (c) {
              const curCopy = (copyTracker.get(id) || 0) + 1;
              copyTracker.set(id, curCopy);
              items.push({
                card: c,
                copyNumber: curCopy,
                totalCopies: counts.get(id) || 1,
                instanceKey: `${c.id}_vault_${index}`
              });
            }
          });
          return items;
        })()
      : cards.filter(card => !!card.imageUrl).map(c => ({
          card: c,
          instanceKey: c.id
        }));

  // Filtering cards
  const filteredCards = baseCardsToFilter.filter(({ card }) => {
    if (!card.imageUrl) return false;
    
    const player = card.player || '';
    const team = card.team || '';
    const q = searchQuery.toLowerCase().trim();
    
    // Check search query (matches player, team, set, position, year, card number, or price number)
    let matchesSearch = true;
    if (q) {
      const cleanedPriceQuery = q.replace(/[$৳,]/g, '').trim();
      const isNumericQuery = !isNaN(Number(cleanedPriceQuery)) && cleanedPriceQuery.length > 0;
      
      matchesSearch = player.toLowerCase().includes(q) || 
                      team.toLowerCase().includes(q) ||
                      (card.set || '').toLowerCase().includes(q) ||
                      (card.year || '').toString().includes(q) ||
                      (card.cardNumber || '').toLowerCase().includes(q) ||
                      (card.position || '').toLowerCase().includes(q) ||
                      (isNumericQuery && card.currentPrice.toString().includes(cleanedPriceQuery));
    }
    
    const matchesTeam = filterTeam ? card.team === filterTeam : true;
    const matchesPosition = filterPosition ? card.position === filterPosition : true;
    const matchesRarity = filterRarity ? card.rarity === filterRarity : true;
    const matchesEdition = filterEdition ? card.edition === filterEdition : true;

    // Price preset filter
    let matchesPricePreset = true;
    if (pricePreset === 'under50') matchesPricePreset = card.currentPrice < 50;
    else if (pricePreset === '50to200') matchesPricePreset = card.currentPrice >= 50 && card.currentPrice <= 200;
    else if (pricePreset === '200to1000') matchesPricePreset = card.currentPrice >= 200 && card.currentPrice <= 1000;
    else if (pricePreset === '1000plus') matchesPricePreset = card.currentPrice >= 1000;

    // Custom price bounds
    let matchesMinPrice = true;
    if (minPrice !== '' && !isNaN(Number(minPrice))) {
      matchesMinPrice = card.currentPrice >= Number(minPrice);
    }

    let matchesMaxPrice = true;
    if (maxPrice !== '' && !isNaN(Number(maxPrice))) {
      matchesMaxPrice = card.currentPrice <= Number(maxPrice);
    }
    
    const allMatches = matchesSearch && matchesTeam && matchesPosition && matchesRarity && matchesEdition && matchesPricePreset && matchesMinPrice && matchesMaxPrice;

    if (activeTab === 'favorites') {
      return allMatches && favoriteIds.has(card.id);
    }
    return allMatches;
  });

  // Sorting cards
  const sortedCards = [...filteredCards].sort((a, b) => {
    if (sortBy === 'price-asc') {
      return a.card.currentPrice - b.card.currentPrice;
    }
    if (sortBy === 'price-desc') {
      return b.card.currentPrice - a.card.currentPrice;
    }
    if (sortBy === 'year-desc') {
      return b.card.year - a.card.year;
    }
    if (sortBy === 'year-asc') {
      return a.card.year - b.card.year;
    }
    if (sortBy === 'player-asc') {
      return a.card.player.localeCompare(b.card.player);
    }
    return 0;
  });

  let vaultValue = 0;
  vaultIds.forEach(id => {
    const card = cardMap.get(id) || cards.find(c => c.id === id);
    vaultValue += (card?.currentPrice || 0);
  });

  const totalMarketCap = cards.filter(card => !!card.imageUrl).reduce((total, card) => total + card.currentPrice, 0);

  const uniqueTeams = Array.from(new Set(cards.map(c => c.team).filter(Boolean))).sort();
  const uniquePositions = Array.from(new Set(cards.map(c => c.position).filter(Boolean))).sort();
  const uniqueRarities = Array.from(new Set(cards.map(c => c.rarity).filter(Boolean))).sort();
  const uniqueEditions = Array.from(new Set(cards.map(c => c.edition).filter(Boolean))).sort();

  const activeFiltersCount = (searchQuery ? 1 : 0) + 
    (filterTeam ? 1 : 0) + 
    (filterPosition ? 1 : 0) + 
    (filterRarity ? 1 : 0) + 
    (filterEdition ? 1 : 0) + 
    (minPrice !== '' || maxPrice !== '' || pricePreset !== 'all' ? 1 : 0) + 
    (sortBy !== 'default' ? 1 : 0);

  const hasActiveFilters = activeFiltersCount > 0;
  const isAdminUser = user?.email === 'grakibg@gmail.com' || user?.email === 'wwwrakibcom071@gmail.com' || user?.email === '1@1.com';

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans uppercase selection:bg-[#D4FF00] selection:text-black">
      {/* Header (Responsive for PC, Laptops & Phones) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-black">
        <div className="max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-1.5 sm:gap-4">
          
          {/* Left: Brand Logo & Desktop Nav Links */}
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 shrink-0 min-w-0">
            <div 
              onClick={() => switchTab('database')}
              className="flex items-center gap-1.5 cursor-pointer group shrink-0"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-black text-[#D4FF00] border-2 border-black flex items-center justify-center font-black text-xs sm:text-sm group-hover:bg-[#D4FF00] group-hover:text-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                AC
              </div>
              <div className="flex flex-col">
                <span className="text-lg sm:text-2xl font-black tracking-tighter text-black uppercase leading-none group-hover:text-neutral-700 transition-colors">
                  ARTCARD
                </span>
                <span className="hidden md:inline-block text-[8px] font-black tracking-widest text-neutral-500 uppercase mt-0.5">
                  COLLECTIVE HUB
                </span>
              </div>
            </div>
            
            {/* Desktop Clean Navigation Bar */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 text-[11px] xl:text-xs font-black tracking-wider text-neutral-600 uppercase">
              <button 
                onClick={() => switchTab('database')}
                className={`px-2.5 xl:px-3 py-1.5 sm:py-2 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'database' && !selectedCard ? 'text-black border-black bg-neutral-100' : 'border-transparent hover:text-black hover:bg-neutral-50'
                }`}
              >
                DATABASE
              </button>

              <button 
                onClick={() => switchTab('marketplace')}
                className={`px-2.5 xl:px-3 py-1.5 sm:py-2 border-b-2 flex items-center gap-1 transition-all whitespace-nowrap ${
                  activeTab === 'marketplace' && !selectedCard ? 'text-black border-black bg-neutral-100' : 'border-transparent hover:text-black hover:bg-neutral-50'
                }`}
              >
                <ShoppingCart size={13} />
                MARKET
              </button>

              <button 
                onClick={() => switchTab('vault')}
                className={`px-2.5 xl:px-3 py-1.5 sm:py-2 border-b-2 flex items-center gap-1 transition-all whitespace-nowrap ${
                  activeTab === 'vault' && !selectedCard ? 'text-black border-black bg-neutral-100' : 'border-transparent hover:text-black hover:bg-neutral-50'
                }`}
              >
                <Trophy size={13} />
                VAULT ({vaultIds.length})
              </button>

              <button 
                onClick={() => switchTab('leaderboard')}
                className={`px-2.5 xl:px-3 py-1.5 sm:py-2 border-b-2 flex items-center gap-1 transition-all whitespace-nowrap ${
                  activeTab === 'leaderboard' && !selectedCard ? 'text-black border-black bg-neutral-100' : 'border-transparent hover:text-black hover:bg-neutral-50'
                }`}
              >
                <Medal size={13} />
                RANKS
              </button>

              <button 
                onClick={() => switchTab('shop')}
                className={`px-2.5 xl:px-3 py-1.5 sm:py-2 border-b-2 flex items-center gap-1 transition-all whitespace-nowrap ${
                  activeTab === 'shop' && !selectedCard ? 'text-black border-black bg-neutral-100' : 'border-transparent hover:text-black hover:bg-neutral-50'
                }`}
              >
                <Sparkles size={13} />
                SHOP
              </button>

              {/* Desktop "MORE" Dropdown (Houses Custom, Favorites & Admin Tools) */}
              <div className="relative">
                <button
                  onClick={() => setIsDesktopMoreOpen(!isDesktopMoreOpen)}
                  className={`px-2.5 xl:px-3 py-1.5 sm:py-2 border-b-2 flex items-center gap-1 transition-all whitespace-nowrap ${
                    isDesktopMoreOpen || ['custom', 'favorites', 'admin', 'manage'].includes(activeTab)
                      ? 'text-black border-black bg-neutral-100 font-black'
                      : 'border-transparent hover:text-black hover:bg-neutral-50'
                  }`}
                >
                  <span>MORE</span>
                  <ChevronDown size={12} className={`transition-transform ${isDesktopMoreOpen ? 'rotate-180' : ''}`} />
                  {favoriteIds.size > 0 && (
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  )}
                </button>

                {/* Dropdown Menu Modal */}
                {isDesktopMoreOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsDesktopMoreOpen(false)} 
                    />
                    <div className="absolute left-0 mt-2 w-52 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <button
                        onClick={() => switchTab('favorites')}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs font-black hover:bg-[#D4FF00] hover:text-black transition-colors ${
                          activeTab === 'favorites' ? 'bg-neutral-100 text-black' : 'text-neutral-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Heart size={14} className={favoriteIds.size > 0 ? "text-red-500 fill-red-500" : "text-neutral-400"} />
                          MY FAVORITES
                        </span>
                        <span className="text-[10px] bg-neutral-200 px-1.5 py-0.5 rounded font-black text-black">
                          {favoriteIds.size}
                        </span>
                      </button>

                      <button
                        onClick={() => switchTab('custom')}
                        className={`w-full px-3 py-2 text-left flex items-center gap-2 text-xs font-black hover:bg-[#D4FF00] hover:text-black transition-colors ${
                          activeTab === 'custom' ? 'bg-neutral-100 text-black' : 'text-neutral-700'
                        }`}
                      >
                        <Palette size={14} />
                        CUSTOM CARD BUILDER
                      </button>

                      {isAdminUser && (
                        <>
                          <div className="my-1 border-t border-neutral-200" />
                          <div className="px-3 py-1 text-[9px] font-black text-neutral-400 tracking-widest uppercase">
                            ADMIN TOOLS
                          </div>
                          <button
                            onClick={() => switchTab('admin')}
                            className={`w-full px-3 py-2 text-left flex items-center gap-2 text-xs font-black hover:bg-[#D4FF00] hover:text-black transition-colors ${
                              activeTab === 'admin' ? 'bg-neutral-100 text-black' : 'text-neutral-700'
                            }`}
                          >
                            <Plus size={14} />
                            ADD NEW CARD
                          </button>
                          <button
                            onClick={() => switchTab('manage')}
                            className={`w-full px-3 py-2 text-left flex items-center gap-2 text-xs font-black hover:bg-[#D4FF00] hover:text-black transition-colors ${
                              activeTab === 'manage' ? 'bg-neutral-100 text-black' : 'text-neutral-700'
                            }`}
                          >
                            <Layers size={14} />
                            MANAGE PACK SHOP
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </nav>
          </div>

          {/* Right: Wallet Balance, User Auth & Mobile Hamburger */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Wallet Quick Balance / Top-Up Pill */}
            <button
              onClick={() => {
                if (!user) {
                  switchTab('profile');
                } else {
                  setIsWalletOpen(true);
                }
              }}
              className="flex items-center gap-1 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 whitespace-nowrap"
              title="Click to top-up ARTCOIN wallet balance"
            >
              <DollarSign size={12} strokeWidth={3} className="shrink-0" />
              <span>{user ? formatCurrency(walletBalance) : '৳ TOP UP'}</span>
            </button>

            {/* Profile Avatar / Auth */}
            <UserAuth 
              user={user} 
              onOpenProfile={() => switchTab('profile')} 
              isProfileActive={activeTab === 'profile' && !selectedCard} 
            />

            {/* Mobile / Tablet Menu Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1.5 sm:p-2 border-2 border-black bg-white hover:bg-neutral-100 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 shrink-0"
              title="Open Navigation Menu"
            >
              <Menu size={18} />
            </button>
          </div>

        </div>
      </header>

      {/* Main Content (Responsive Padding & Layout) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 pb-24 lg:pb-12">
        {selectedCard ? (
          <CardPreviewPage
            card={selectedCard}
            allCards={cards}
            inVault={vaultIds.includes(selectedCard.id)}
            ownedCount={getOwnedCount(selectedCard.id)}
            isFavorite={favoriteIds.has(selectedCard.id)}
            onToggleFavorite={() => handleToggleFavorite(selectedCard.id)}
            onBack={() => setSelectedCard(null)}
            onSelectRelatedCard={(relCard) => handleSelectCard(relCard)}
            userEmail={user?.email}
            walletBalance={walletBalance}
            onOpenWallet={() => setIsWalletOpen(true)}
            onNavigateToMarket={handleNavigateToMarket}
            onNavigateToShop={() => {
              setSelectedCard(null);
              switchTab('shop');
            }}
          />
        ) : activeTab === 'profile' ? (
          <UserProfile
            user={user}
            cards={cards}
            vaultIds={vaultIds}
            favoriteIds={favoriteIds}
            onSelectCard={handleSelectCard}
            onNavigateTab={(tab) => switchTab(tab)}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : activeTab === 'marketplace' ? (
          <Marketplace
            user={user}
            walletBalance={walletBalance}
            allCards={cards}
            vaultIds={vaultIds}
            onOpenWallet={() => setIsWalletOpen(true)}
            onOpenAuth={() => switchTab('profile')}
            onSelectCard={handleSelectCard}
            onViewUserProfile={handleOpenUserProfile}
            onToast={(msg) => setToastMessage(msg)}
            initialSearchQuery={marketInitialSearch}
            initialTab={marketInitialTab}
            initialSellCard={marketInitialSellCard}
          />
        ) : activeTab === 'leaderboard' ? (
          <LeaderboardAndEvents
            user={user}
            walletBalance={walletBalance}
            allCards={cards}
            vaultIds={vaultIds}
            onOpenWallet={() => setIsWalletOpen(true)}
            onOpenAuth={() => switchTab('profile')}
            onViewUserProfile={handleOpenUserProfile}
            onSelectCard={handleSelectCard}
            onToast={(msg) => setToastMessage(msg)}
          />
        ) : activeTab === 'admin' ? (
          (user?.email === 'grakibg@gmail.com' || user?.email === 'wwwrakibcom071@gmail.com' || user?.email === '1@1.com') ? (
            <div className="max-w-2xl mx-auto space-y-8">
              <AdminForm onAdd={handleAddCard} totalCards={cards.filter(c => !!c.imageUrl).length} totalMarketCap={totalMarketCap} existingCards={cards} />
            </div>
          ) : (
            <div className="text-center py-20 font-black tracking-widest text-neutral-500 uppercase">
               Access Denied
            </div>
          )
        ) : activeTab === 'manage' ? (
          (user?.email === 'grakibg@gmail.com' || user?.email === 'wwwrakibcom071@gmail.com' || user?.email === '1@1.com') ? (
            <ManageShop cards={cards} packs={packs} themes={themes} />
          ) : (
            <div className="text-center py-20 font-black tracking-widest text-neutral-500 uppercase">
               Access Denied
            </div>
          )
        ) : activeTab === 'shop' ? (
          <PackShop 
            cards={cards} 
            packs={packs} 
            user={user}
            walletBalance={walletBalance}
            onOpenWallet={() => setIsWalletOpen(true)}
            onOpenAuth={() => switchTab('profile')}
            onCardsDrawn={handleCardsDrawn} 
          />
        ) : activeTab === 'custom' ? (
          <CustomCard 
            themes={themes} 
            isAdmin={isAdminUser}
            onOpenAdminThemes={() => {
              setActiveTab('manage');
            }}
          />
        ) : (
          <>
            {/* Search, Price & Filters Section (Mobile & PC Optimized) */}
            <div className="mb-6 sm:mb-8 space-y-3 sm:space-y-4 max-w-5xl">
              {/* Primary Search Bar with Filter Tray Toggle */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-3 sm:left-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-black sm:w-5 sm:h-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="SEARCH PLAYERS, TEAMS, SETS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border-2 border-black rounded-none py-2.5 sm:py-3.5 pl-9 sm:pl-12 pr-9 sm:pr-12 text-xs sm:text-sm font-black text-black placeholder-neutral-500 focus:outline-none focus:ring-4 focus:ring-[#D4FF00]/50 transition-colors uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-3 sm:right-4 flex items-center text-neutral-400 hover:text-black"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Filter Tray Toggle Button */}
                <button
                  onClick={() => setIsFilterTrayOpen(!isFilterTrayOpen)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3.5 border-2 border-black font-black text-xs uppercase tracking-wider transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0 ${
                    isFilterTrayOpen || hasActiveFilters
                      ? 'bg-black text-[#D4FF00]'
                      : 'bg-white hover:bg-neutral-100 text-black'
                  }`}
                  title="Toggle Filters & Sorting"
                >
                  <SlidersHorizontal size={14} />
                  <span className="hidden xs:inline">FILTERS</span>
                  {activeFiltersCount > 0 && (
                    <span className="bg-[#D4FF00] text-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Price Preset Chips (Horizontal Swipe) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-500 shrink-0 mr-1 flex items-center gap-1">
                  PRICE:
                </span>
                {[
                  { id: 'all', label: 'ALL' },
                  { id: 'under50', label: '< ৳50' },
                  { id: '50to200', label: '৳50-৳200' },
                  { id: '200to1000', label: '৳200-৳1K' },
                  { id: '1000plus', label: '৳1K+' }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setPricePreset(preset.id);
                      setMinPrice('');
                      setMaxPrice('');
                    }}
                    className={`shrink-0 px-2.5 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider border-2 border-black transition-all ${
                      pricePreset === preset.id && minPrice === '' && maxPrice === ''
                        ? 'bg-black text-[#D4FF00] shadow-[2px_2px_0px_0px_#D4FF00]'
                        : 'bg-white text-black hover:bg-[#D4FF00]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="shrink-0 flex items-center gap-1 bg-red-600 text-white border-2 border-black px-2.5 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-colors ml-auto"
                  >
                    <X size={12} /> RESET
                  </button>
                )}
              </div>

              {/* Advanced Filter Tray */}
              <AnimatePresence>
                {isFilterTrayOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-neutral-50 border-2 border-black p-3.5 sm:p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                        {/* Sort Selector */}
                        <div className="col-span-2 sm:col-span-1">
                          <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Sort Order</label>
                          <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="w-full bg-white border-2 border-black p-1.5 sm:p-2 text-xs font-black uppercase tracking-wider focus:outline-none focus:bg-[#D4FF00]"
                          >
                            <option value="default">DEFAULT</option>
                            <option value="price-asc">PRICE: LOW TO HIGH</option>
                            <option value="price-desc">PRICE: HIGH TO LOW</option>
                            <option value="year-desc">YEAR: NEWEST</option>
                            <option value="year-asc">YEAR: OLDEST</option>
                            <option value="player-asc">PLAYER: A-Z</option>
                          </select>
                        </div>

                        {/* Team */}
                        <div>
                          <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Team</label>
                          <select 
                            value={filterTeam} 
                            onChange={(e) => setFilterTeam(e.target.value)}
                            className="w-full bg-white border-2 border-black p-1.5 sm:p-2 text-xs font-black uppercase tracking-wider focus:outline-none focus:bg-[#D4FF00]"
                          >
                            <option value="">ALL TEAMS</option>
                            {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>

                        {/* Position */}
                        <div>
                          <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Position</label>
                          <select 
                            value={filterPosition} 
                            onChange={(e) => setFilterPosition(e.target.value)}
                            className="w-full bg-white border-2 border-black p-1.5 sm:p-2 text-xs font-black uppercase tracking-wider focus:outline-none focus:bg-[#D4FF00]"
                          >
                            <option value="">ALL POSITIONS</option>
                            {uniquePositions.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>

                        {/* Rarity */}
                        <div>
                          <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Rarity</label>
                          <select 
                            value={filterRarity} 
                            onChange={(e) => setFilterRarity(e.target.value)}
                            className="w-full bg-white border-2 border-black p-1.5 sm:p-2 text-xs font-black uppercase tracking-wider focus:outline-none focus:bg-[#D4FF00]"
                          >
                            <option value="">ALL RARITIES</option>
                            {uniqueRarities.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>

                        {/* Edition */}
                        <div>
                          <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Edition</label>
                          <select 
                            value={filterEdition} 
                            onChange={(e) => setFilterEdition(e.target.value)}
                            className="w-full bg-white border-2 border-black p-1.5 sm:p-2 text-xs font-black uppercase tracking-wider focus:outline-none focus:bg-[#D4FF00]"
                          >
                            <option value="">ALL EDITIONS</option>
                            {uniqueEditions.map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                        </div>

                        {/* Min / Max Price Inputs */}
                        <div className="col-span-2 sm:col-span-1">
                          <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Custom ৳</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              placeholder="MIN"
                              value={minPrice}
                              onChange={(e) => {
                                setMinPrice(e.target.value);
                                setPricePreset('all');
                              }}
                              className="w-1/2 bg-white border border-black p-1.5 text-xs font-black uppercase focus:outline-none focus:bg-[#D4FF00]"
                            />
                            <span className="text-xs font-bold text-neutral-400">-</span>
                            <input
                              type="number"
                              placeholder="MAX"
                              value={maxPrice}
                              onChange={(e) => {
                                setMaxPrice(e.target.value);
                                setPricePreset('all');
                              }}
                              className="w-1/2 bg-white border border-black p-1.5 text-xs font-black uppercase focus:outline-none focus:bg-[#D4FF00]"
                            />
                          </div>
                        </div>
                      </div>

                      {hasActiveFilters && (
                        <div className="pt-1 flex justify-end">
                          <button
                            onClick={handleResetFilters}
                            className="flex items-center gap-1 text-xs font-black text-red-600 hover:text-red-800 uppercase tracking-wider underline"
                          >
                            Clear all filters
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tab Header Info */}
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-black pb-3 sm:pb-4 gap-2 sm:gap-4">
              <div>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter text-black flex items-center gap-2 sm:gap-3">
                  {activeTab === 'database' && 'CARD DATABASE'}
                  {activeTab === 'vault' && (
                    <>
                      <Trophy size={28} className="sm:w-9 sm:h-9" /> MY CARD VAULT
                    </>
                  )}
                  {activeTab === 'favorites' && (
                    <>
                      <Heart size={28} className="text-red-500 fill-red-500 sm:w-9 sm:h-9" /> MY FAVORITES
                    </>
                  )}
                </h1>
                <p className="text-neutral-500 mt-1 sm:mt-2 text-[10px] sm:text-xs font-black uppercase tracking-widest">
                  {activeTab === 'database' && `SHOWING ${sortedCards.length} OF ${cards.filter(c => !!c.imageUrl).length} CARDS`}
                  {activeTab === 'vault' && `YOU OWN ${vaultIds.length} CARDS IN YOUR VAULT VALUED AT ${formatCurrency(vaultValue)}.`}
                  {activeTab === 'favorites' && `YOU HAVE SAVED ${favoriteIds.size} FAVORITE CARDS.`}
                </p>
              </div>
            </div>

            {/* Grid */}
            {loadingCards ? (
              <div className="flex flex-col items-center justify-center py-24 sm:py-32 gap-3">
                 <RefreshCw size={36} className="text-neutral-300 animate-spin" />
                 <span className="text-xs font-black tracking-widest uppercase text-neutral-400">Loading cards...</span>
              </div>
            ) : sortedCards.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-4 md:gap-6">
                {sortedCards.map(item => {
                  const ownedCount = getOwnedCount(item.card.id);
                  return (
                    <CardItem 
                      key={item.instanceKey} 
                      card={item.card} 
                      inVault={ownedCount > 0}
                      ownedCount={ownedCount}
                      copyNumber={item.copyNumber}
                      totalCopies={item.totalCopies}
                      isFavorite={favoriteIds.has(item.card.id)}
                      onToggleFavorite={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(item.card.id);
                      }}
                      onClick={(c) => handleSelectCard(c)} 
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 sm:py-28 text-center border-2 border-black bg-neutral-100 p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                {activeTab === 'vault' ? (
                  <>
                    <Trophy size={40} className="text-black mb-4" />
                    <h3 className="text-xl sm:text-2xl font-black text-black mb-2 uppercase tracking-widest">YOUR VAULT IS EMPTY</h3>
                    <p className="text-neutral-500 max-w-md text-xs font-black uppercase tracking-widest mb-6">
                      {user 
                        ? "YOU HAVEN'T ACQUIRED ANY CARDS YET. BUY FROM OTHER COLLECTORS ON THE TRANSFER MARKET OR OPEN BOOSTER PACKS TO FILL YOUR VAULT." 
                        : "PLEASE SIGN IN TO VIEW YOUR CARD VAULT."}
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button
                        onClick={() => switchTab('shop')}
                        className="bg-[#D4FF00] text-black border-2 border-black px-5 py-2.5 font-black text-xs uppercase tracking-widest hover:bg-black hover:text-[#D4FF00] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                      >
                        OPEN PACKS
                      </button>
                      <button
                        onClick={() => switchTab('marketplace')}
                        className="bg-black text-[#D4FF00] border-2 border-black px-5 py-2.5 font-black text-xs uppercase tracking-widest hover:bg-neutral-800 shadow-[3px_3px_0px_0px_#D4FF00]"
                      >
                        TRANSFER MARKET
                      </button>
                    </div>
                  </>
                ) : activeTab === 'favorites' ? (
                  <>
                    <Heart size={40} className="text-red-500 mb-4" />
                    <h3 className="text-xl sm:text-2xl font-black text-black mb-2 uppercase tracking-widest">NO FAVORITES SAVED</h3>
                    <p className="text-neutral-500 max-w-md text-xs font-black uppercase tracking-widest mb-6">
                      CLICK THE HEART ICON ON ANY CARD TO SAVE IT TO YOUR FAVORITES WISHLIST.
                    </p>
                    <button
                      onClick={() => switchTab('database')}
                      className="bg-black text-white hover:bg-[#D4FF00] hover:text-black border-2 border-black px-5 py-2.5 font-black text-xs uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    >
                      BROWSE CARDS
                    </button>
                  </>
                ) : (
                  <>
                    <WalletCards size={40} className="text-black mb-4" />
                    <h3 className="text-xl sm:text-2xl font-black text-black mb-2 uppercase tracking-widest">NO CARDS FOUND</h3>
                    <p className="text-neutral-500 max-w-md text-xs font-black uppercase tracking-widest mb-6">
                      NO CARDS MATCH YOUR CURRENT SEARCH OR PRICE CRITERIA.
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleResetFilters}
                        className="bg-black text-[#D4FF00] border-2 border-black px-5 py-2.5 font-black text-xs uppercase tracking-widest hover:bg-neutral-800 shadow-[3px_3px_0px_0px_#D4FF00]"
                      >
                        CLEAR ALL FILTERS
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Bottom Navigation Dock (Optimized for Phones & Tablets) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-black shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
        <div className="grid grid-cols-5 h-16 max-w-md mx-auto px-1">
          {/* Database */}
          <button
            onClick={() => switchTab('database')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'database' && !selectedCard ? 'text-black font-black' : 'text-neutral-500 font-bold hover:text-black'
            }`}
          >
            <div className={`p-1 rounded ${activeTab === 'database' && !selectedCard ? 'bg-[#D4FF00] border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : ''}`}>
              <Grid3X3 size={17} />
            </div>
            <span className="text-[9px] uppercase tracking-wider leading-none">CARDS</span>
          </button>

          {/* Market */}
          <button
            onClick={() => switchTab('marketplace')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'marketplace' && !selectedCard ? 'text-black font-black' : 'text-neutral-500 font-bold hover:text-black'
            }`}
          >
            <div className={`p-1 rounded ${activeTab === 'marketplace' && !selectedCard ? 'bg-[#D4FF00] border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : ''}`}>
              <ShoppingCart size={17} />
            </div>
            <span className="text-[9px] uppercase tracking-wider leading-none">MARKET</span>
          </button>

          {/* Vault */}
          <button
            onClick={() => switchTab('vault')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
              activeTab === 'vault' && !selectedCard ? 'text-black font-black' : 'text-neutral-500 font-bold hover:text-black'
            }`}
          >
            <div className={`p-1 rounded ${activeTab === 'vault' && !selectedCard ? 'bg-[#D4FF00] border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : ''}`}>
              <Trophy size={17} />
            </div>
            <span className="text-[9px] uppercase tracking-wider leading-none">VAULT</span>
            {vaultIds.length > 0 && (
              <span className="absolute top-1 right-3 bg-black text-[#D4FF00] text-[8px] font-black px-1 rounded-full border border-black">
                {vaultIds.length}
              </span>
            )}
          </button>

          {/* Leaderboard */}
          <button
            onClick={() => switchTab('leaderboard')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'leaderboard' && !selectedCard ? 'text-black font-black' : 'text-neutral-500 font-bold hover:text-black'
            }`}
          >
            <div className={`p-1 rounded ${activeTab === 'leaderboard' && !selectedCard ? 'bg-[#D4FF00] border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : ''}`}>
              <Medal size={17} />
            </div>
            <span className="text-[9px] uppercase tracking-wider leading-none">RANKS</span>
          </button>

          {/* More Menu */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
              isMobileMenuOpen || ['shop', 'custom', 'favorites', 'profile', 'admin', 'manage'].includes(activeTab)
                ? 'text-black font-black'
                : 'text-neutral-500 font-bold hover:text-black'
            }`}
          >
            <div className={`p-1 rounded ${['shop', 'custom', 'favorites', 'profile', 'admin', 'manage'].includes(activeTab) && !selectedCard ? 'bg-[#D4FF00] border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : ''}`}>
              <Menu size={17} />
            </div>
            <span className="text-[9px] uppercase tracking-wider leading-none">MORE</span>
            {favoriteIds.size > 0 && (
              <span className="absolute top-1.5 right-3.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Slide-Up Mobile Navigation Drawer Modal */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Slide-up Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-white border-t-4 border-black p-5 max-h-[85vh] overflow-y-auto rounded-t-2xl shadow-2xl z-10 space-y-4"
            >
              {/* Sheet Header */}
              <div className="flex items-center justify-between border-b-2 border-black pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-black text-[#D4FF00] border border-black flex items-center justify-center font-black text-xs">
                    AC
                  </div>
                  <span className="text-sm font-black tracking-tight uppercase">NAVIGATION MENU</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 border border-black bg-neutral-100 hover:bg-black hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* User Account Quick Card */}
              <div className="bg-neutral-100 border-2 border-black p-3 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase text-neutral-500 tracking-widest block">Logged in as</span>
                  <span className="text-xs font-black uppercase text-black truncate max-w-[170px] block">
                    {user ? (user.displayName || user.email) : 'GUEST COLLECTOR'}
                  </span>
                  <span className="text-xs font-black text-[#556b00] mt-0.5 block">
                    {user ? formatCurrency(walletBalance) : '৳ 0.00'} ARTCOIN
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (user) {
                      setIsWalletOpen(true);
                    } else {
                      switchTab('profile');
                    }
                  }}
                  className="bg-[#D4FF00] text-black border border-black px-2.5 py-1.5 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  {user ? '+ TOP UP' : 'SIGN IN'}
                </button>
              </div>

              {/* Navigation Grid of Options */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => switchTab('database')}
                  className={`p-2.5 border-2 border-black text-left font-black text-xs uppercase flex items-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    activeTab === 'database' ? 'bg-black text-[#D4FF00]' : 'bg-white hover:bg-neutral-50'
                  }`}
                >
                  <Grid3X3 size={15} /> DATABASE
                </button>

                <button
                  onClick={() => switchTab('marketplace')}
                  className={`p-2.5 border-2 border-black text-left font-black text-xs uppercase flex items-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    activeTab === 'marketplace' ? 'bg-black text-[#D4FF00]' : 'bg-white hover:bg-neutral-50'
                  }`}
                >
                  <ShoppingCart size={15} /> MARKETPLACE
                </button>

                <button
                  onClick={() => switchTab('vault')}
                  className={`p-2.5 border-2 border-black text-left font-black text-xs uppercase flex items-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    activeTab === 'vault' ? 'bg-black text-[#D4FF00]' : 'bg-white hover:bg-neutral-50'
                  }`}
                >
                  <Trophy size={15} /> VAULT ({vaultIds.length})
                </button>

                <button
                  onClick={() => switchTab('leaderboard')}
                  className={`p-2.5 border-2 border-black text-left font-black text-xs uppercase flex items-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    activeTab === 'leaderboard' ? 'bg-black text-[#D4FF00]' : 'bg-white hover:bg-neutral-50'
                  }`}
                >
                  <Medal size={15} /> LEADERBOARD
                </button>

                <button
                  onClick={() => switchTab('shop')}
                  className={`p-2.5 border-2 border-black text-left font-black text-xs uppercase flex items-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    activeTab === 'shop' ? 'bg-black text-[#D4FF00]' : 'bg-white hover:bg-neutral-50'
                  }`}
                >
                  <Sparkles size={15} /> PACK SHOP
                </button>

                <button
                  onClick={() => switchTab('favorites')}
                  className={`p-2.5 border-2 border-black text-left font-black text-xs uppercase flex items-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    activeTab === 'favorites' ? 'bg-black text-[#D4FF00]' : 'bg-white hover:bg-neutral-50'
                  }`}
                >
                  <Heart size={15} className="text-red-500 fill-red-500" /> FAVS ({favoriteIds.size})
                </button>

                <button
                  onClick={() => switchTab('custom')}
                  className={`p-2.5 border-2 border-black text-left font-black text-xs uppercase flex items-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    activeTab === 'custom' ? 'bg-black text-[#D4FF00]' : 'bg-white hover:bg-neutral-50'
                  }`}
                >
                  <Palette size={15} /> CUSTOM CARD
                </button>

                <button
                  onClick={() => switchTab('profile')}
                  className={`p-2.5 border-2 border-black text-left font-black text-xs uppercase flex items-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    activeTab === 'profile' ? 'bg-black text-[#D4FF00]' : 'bg-white hover:bg-neutral-50'
                  }`}
                >
                  <Users size={15} /> MY PROFILE
                </button>
              </div>

              {/* Admin Section in Mobile Drawer */}
              {isAdminUser && (
                <div className="pt-2 border-t-2 border-black space-y-2">
                  <span className="text-[9px] font-black uppercase text-neutral-500 tracking-widest block">ADMIN TOOLS</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => switchTab('admin')}
                      className={`p-2.5 border-2 border-black text-left font-black text-xs uppercase flex items-center gap-1.5 ${
                        activeTab === 'admin' ? 'bg-[#D4FF00] text-black' : 'bg-neutral-100 text-black'
                      }`}
                    >
                      <Plus size={14} /> ADD CARD
                    </button>
                    <button
                      onClick={() => switchTab('manage')}
                      className={`p-2.5 border-2 border-black text-left font-black text-xs uppercase flex items-center gap-1.5 ${
                        activeTab === 'manage' ? 'bg-[#D4FF00] text-black' : 'bg-neutral-100 text-black'
                      }`}
                    >
                      <Layers size={14} /> MANAGE SHOP
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-50 bg-black text-[#D4FF00] border-2 border-[#D4FF00] px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 text-xs font-black uppercase tracking-wider animate-bounce">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Wallet Top-Up & Management Modal */}
      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        user={user}
        walletBalance={walletBalance}
      />

      {/* Public Profile View Modal */}
      <PublicProfileModal
        userId={viewingUserId}
        onClose={handleCloseUserProfile}
        allCards={cards}
        currentUserId={user?.uid}
        onSelectCard={handleSelectCard}
        onToast={(msg) => setToastMessage(msg)}
      />
    </div>
  );
}
