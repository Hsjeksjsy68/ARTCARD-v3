import React, { useState, useEffect } from 'react';
import { FootballCard, BuyRequest, MarketListing, MarketSettings, PriceHistoryRecord } from '../types';
import { calculateDynamicMarketPrice, formatCurrency, cn, getDemandLevel, getPriceChangeStats } from '../lib/utils';
import { db, doc, setDoc, updateDoc, collection, onSnapshot, query, orderBy, limit } from '../lib/firebase';
import { 
  Sliders, 
  ShieldCheck, 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Tag, 
  History, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Info,
  SlidersHorizontal,
  Flame
} from 'lucide-react';

interface DynamicMarketPriceAdminProps {
  cards: FootballCard[];
  listings: MarketListing[];
  buyRequests?: BuyRequest[];
  currentSettings?: MarketSettings;
  totalActiveUsers?: number;
  onToast?: (msg: string) => void;
}

export function DynamicMarketPriceAdmin({
  cards,
  listings,
  buyRequests = [],
  currentSettings,
  totalActiveUsers = 100,
  onToast
}: DynamicMarketPriceAdminProps) {
  // Global Settings State
  const [kFactor, setKFactor] = useState<number>(currentSettings?.defaultK ?? 2);
  const [minPricePercent, setMinPricePercent] = useState<number>(currentSettings?.minPricePercentage ?? 50);
  const [maxPricePercent, setMaxPricePercent] = useState<number>(currentSettings?.maxPricePercentage ?? 500);
  const [maxBuyRequestsPerUser, setMaxBuyRequestsPerUser] = useState<number>(currentSettings?.maxBuyRequestsPerUser ?? 5);
  const [activeUsersInput, setActiveUsersInput] = useState<number>(totalActiveUsers || 100);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Per-card edit state
  const [selectedCardForEdit, setSelectedCardForEdit] = useState<FootballCard | null>(null);
  const [cardBasePriceInput, setCardBasePriceInput] = useState<number>(100);
  const [cardCustomKInput, setCardCustomKInput] = useState<string>('');
  const [cardMinPriceInput, setCardMinPriceInput] = useState<string>('');
  const [cardMaxPriceInput, setCardMaxPriceInput] = useState<string>('');
  const [isSavingCard, setIsSavingCard] = useState(false);

  // Search & Filter in Admin Table
  const [cardSearch, setCardSearch] = useState('');
  const [filterDemand, setFilterDemand] = useState<string>('all');

  // Live Formula Simulator State
  const [simBasePrice, setSimBasePrice] = useState<number>(100);
  const [simBuyRequests, setSimBuyRequests] = useState<number>(15);
  const [simSellListings, setSimSellListings] = useState<number>(5);
  const [simActiveUsers, setSimActiveUsers] = useState<number>(100);
  const [simK, setSimK] = useState<number>(2);
  const [simMinPercent, setSimMinPercent] = useState<number>(50);
  const [simMaxPercent, setSimMaxPercent] = useState<number>(500);

  // Real-time Price History Logs
  const [priceHistoryLogs, setPriceHistoryLogs] = useState<PriceHistoryRecord[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Sync state if props change
  useEffect(() => {
    if (currentSettings) {
      if (currentSettings.defaultK !== undefined) setKFactor(currentSettings.defaultK);
      if (currentSettings.minPricePercentage !== undefined) setMinPricePercent(currentSettings.minPricePercentage);
      if (currentSettings.maxPricePercentage !== undefined) setMaxPricePercent(currentSettings.maxPricePercentage);
      if (currentSettings.maxBuyRequestsPerUser !== undefined) setMaxBuyRequestsPerUser(currentSettings.maxBuyRequestsPerUser);
    }
    if (totalActiveUsers) {
      setActiveUsersInput(totalActiveUsers);
    }
  }, [currentSettings, totalActiveUsers]);

  // Listen to Price History logs
  useEffect(() => {
    try {
      const q = query(collection(db, 'price_history'), orderBy('timestamp', 'desc'), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const logs: PriceHistoryRecord[] = [];
        snapshot.forEach(docSnap => {
          logs.push({ id: docSnap.id, ...docSnap.data() } as PriceHistoryRecord);
        });
        setPriceHistoryLogs(logs);
        setLoadingLogs(false);
      }, (err) => {
        console.error("Error fetching price history logs:", err);
        setLoadingLogs(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error(e);
      setLoadingLogs(false);
    }
  }, []);

  const handleSaveGlobalSettings = async () => {
    setIsSavingSettings(true);
    try {
      const settingsRef = doc(db, 'market_settings', 'global');
      const updated: MarketSettings = {
        defaultK: Number(kFactor) || 2,
        minPricePercentage: Number(minPricePercent) || 50,
        maxPricePercentage: Number(maxPricePercent) || 500,
        maxBuyRequestsPerUser: Number(maxBuyRequestsPerUser) || 5,
        updatedAt: Date.now()
      };
      await setDoc(settingsRef, updated, { merge: true });
      if (onToast) onToast("Dynamic Market Price Engine settings updated successfully!");
    } catch (err) {
      console.error("Failed to save market settings:", err);
      alert("Failed to save market settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleOpenCardEdit = (card: FootballCard) => {
    setSelectedCardForEdit(card);
    setCardBasePriceInput(card.basePrice || card.currentPrice || 100);
    setCardCustomKInput(card.demandSensitivity !== undefined ? String(card.demandSensitivity) : '');
    setCardMinPriceInput(card.minPrice !== undefined ? String(card.minPrice) : '');
    setCardMaxPriceInput(card.maxPrice !== undefined ? String(card.maxPrice) : '');
  };

  const handleSaveCardPricing = async () => {
    if (!selectedCardForEdit) return;
    setIsSavingCard(true);
    try {
      const cardRef = doc(db, 'cards', selectedCardForEdit.id);
      const updates: Partial<FootballCard> = {
        basePrice: Number(cardBasePriceInput) || 100,
        demandSensitivity: cardCustomKInput.trim() !== '' ? Number(cardCustomKInput) : undefined,
        minPrice: cardMinPriceInput.trim() !== '' ? Number(cardMinPriceInput) : undefined,
        maxPrice: cardMaxPriceInput.trim() !== '' ? Number(cardMaxPriceInput) : undefined,
        lastPriceUpdate: Date.now()
      };

      await updateDoc(cardRef, updates);
      if (onToast) onToast(`Updated pricing parameters for ${selectedCardForEdit.player}!`);
      setSelectedCardForEdit(null);
    } catch (err) {
      console.error("Error updating card pricing:", err);
      alert("Failed to update card pricing.");
    } finally {
      setIsSavingCard(false);
    }
  };

  // Run simulator calculation
  const simResult = React.useMemo(() => {
    const rawActive = Math.max(1, simActiveUsers);
    const netDemand = (simBuyRequests - simSellListings) / rawActive;
    const factor = 1 + (netDemand * simK);
    const rawCalculated = simBasePrice * factor;

    const minP = Math.max(1, Math.round(simBasePrice * (simMinPercent / 100)));
    const maxP = Math.max(minP, Math.round(simBasePrice * (simMaxPercent / 100)));
    const finalP = Math.min(maxP, Math.max(minP, Math.round(rawCalculated)));

    const demand = getDemandLevel(simBuyRequests, simSellListings);
    const diff = finalP - simBasePrice;
    const pct = simBasePrice > 0 ? Math.round((diff / simBasePrice) * 1000) / 10 : 0;

    return {
      netDemand,
      factor,
      rawCalculated: Math.round(rawCalculated),
      minP,
      maxP,
      finalP,
      demand,
      diff,
      pct,
      isMinCapped: rawCalculated <= minP,
      isMaxCapped: rawCalculated >= maxP
    };
  }, [simBasePrice, simBuyRequests, simSellListings, simActiveUsers, simK, simMinPercent, simMaxPercent]);

  // Filter cards table
  const cardCalculations = React.useMemo(() => {
    return cards.map(c => {
      const calc = calculateDynamicMarketPrice(c, {
        buyRequests,
        listings,
        totalActiveUsers: activeUsersInput,
        settings: {
          defaultK: kFactor,
          minPricePercentage: minPricePercent,
          maxPricePercentage: maxPricePercent,
          maxBuyRequestsPerUser
        }
      });
      return { card: c, calc };
    });
  }, [cards, buyRequests, listings, activeUsersInput, kFactor, minPricePercent, maxPricePercent, maxBuyRequestsPerUser]);

  const filteredCardCalculations = React.useMemo(() => {
    return cardCalculations.filter(({ card, calc }) => {
      const matchesSearch = 
        card.player.toLowerCase().includes(cardSearch.toLowerCase()) ||
        card.team.toLowerCase().includes(cardSearch.toLowerCase()) ||
        card.cardNumber.toLowerCase().includes(cardSearch.toLowerCase());
      
      const matchesDemand = filterDemand === 'all' || calc.demand.level === filterDemand;
      return matchesSearch && matchesDemand;
    });
  }, [cardCalculations, cardSearch, filterDemand]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header & Formula Summary */}
      <div className="bg-black text-white p-6 sm:p-8 border-4 border-black shadow-[8px_8px_0px_0px_#D4FF00]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#D4FF00] text-black px-3 py-1 text-[10px] font-black uppercase tracking-widest">
              <Sparkles size={14} /> DYNAMIC MARKET PRICE ENGINE
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
              MARKET DEMAND & PRICE PROTECTION CONTROLS
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-3xl font-mono leading-relaxed">
              <strong>Core Formula:</strong> Market Price = Base Price × (1 + ((Buy Requests − Sell Listings) ÷ Total Active Users) × K)<br />
              <strong>Price Protection:</strong> Final Price = MIN(Max Price, MAX(Min Price, Calculated Price))
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-900 border border-neutral-800 p-3">
            <div className="p-2 border border-neutral-800">
              <span className="text-[9px] text-neutral-400 font-black uppercase block">ACTIVE USERS</span>
              <span className="text-xl font-black text-[#D4FF00] font-mono">{activeUsersInput}</span>
            </div>
            <div className="p-2 border border-neutral-800">
              <span className="text-[9px] text-neutral-400 font-black uppercase block">TOTAL BUY REQ</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {buyRequests.filter(r => r.status === 'active').length}
              </span>
            </div>
            <div className="p-2 border border-neutral-800">
              <span className="text-[9px] text-neutral-400 font-black uppercase block">ACTIVE LISTINGS</span>
              <span className="text-xl font-black text-indigo-400 font-mono">
                {listings.filter(l => l.status === 'active').length}
              </span>
            </div>
            <div className="p-2 border border-neutral-800">
              <span className="text-[9px] text-neutral-400 font-black uppercase block">GLOBAL K FACTOR</span>
              <span className="text-xl font-black text-amber-400 font-mono">{kFactor}x</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: GLOBAL ENGINE SETTINGS */}
      <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="text-black" size={22} />
            <h3 className="text-lg font-black uppercase tracking-tight text-black">
              1. GLOBAL PRICING PARAMETERS
            </h3>
          </div>
          <button
            onClick={handleSaveGlobalSettings}
            disabled={isSavingSettings}
            className="flex items-center gap-2 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
          >
            <Save size={14} /> {isSavingSettings ? 'SAVING...' : 'SAVE SETTINGS'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* K Factor */}
          <div className="border-2 border-black p-4 bg-neutral-50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-black">
                Sensitivity Factor (K)
              </label>
              <span className="bg-black text-[#D4FF00] text-xs font-mono font-black px-2 py-0.5">
                {kFactor}
              </span>
            </div>
            <p className="text-[10px] font-bold text-neutral-600 uppercase">
              Controls how strongly net demand impacts the price. (Default = 2).
            </p>
            <input 
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={kFactor}
              onChange={(e) => setKFactor(parseFloat(e.target.value))}
              className="w-full accent-black cursor-pointer"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.1"
                max="20"
                step="0.1"
                value={kFactor}
                onChange={(e) => setKFactor(parseFloat(e.target.value) || 2)}
                className="w-full border-2 border-black p-1.5 text-xs font-black font-mono bg-white"
              />
            </div>
          </div>

          {/* Min Price Protection Limit */}
          <div className="border-2 border-black p-4 bg-neutral-50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-black">
                Min Price Limit (%)
              </label>
              <span className="bg-rose-100 text-rose-800 text-xs font-mono font-black px-2 py-0.5 border border-rose-400">
                {minPricePercent}%
              </span>
            </div>
            <p className="text-[10px] font-bold text-neutral-600 uppercase">
              Floor protection below Base Price. (Default = 50%).
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="10"
                max="100"
                value={minPricePercent}
                onChange={(e) => setMinPricePercent(parseInt(e.target.value) || 50)}
                className="w-full border-2 border-black p-1.5 text-xs font-black font-mono bg-white"
              />
              <span className="text-xs font-black">% of Base</span>
            </div>
            <p className="text-[9px] font-bold text-neutral-500 font-mono">
              e.g. 100 Base → Min {Math.round(100 * (minPricePercent / 100))} AC
            </p>
          </div>

          {/* Max Price Protection Limit */}
          <div className="border-2 border-black p-4 bg-neutral-50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-black">
                Max Price Limit (%)
              </label>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-mono font-black px-2 py-0.5 border border-emerald-400">
                {maxPricePercent}%
              </span>
            </div>
            <p className="text-[10px] font-bold text-neutral-600 uppercase">
              Ceiling protection above Base Price. (Default = 500%).
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="100"
                max="2000"
                step="50"
                value={maxPricePercent}
                onChange={(e) => setMaxPricePercent(parseInt(e.target.value) || 500)}
                className="w-full border-2 border-black p-1.5 text-xs font-black font-mono bg-white"
              />
              <span className="text-xs font-black">% of Base</span>
            </div>
            <p className="text-[9px] font-bold text-neutral-500 font-mono">
              e.g. 100 Base → Max {Math.round(100 * (maxPricePercent / 100))} AC
            </p>
          </div>

          {/* Anti-Manipulation Limit */}
          <div className="border-2 border-black p-4 bg-neutral-50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-black">
                Max Buy Req / User
              </label>
              <span className="bg-black text-white text-xs font-mono font-black px-2 py-0.5">
                {maxBuyRequestsPerUser}
              </span>
            </div>
            <p className="text-[10px] font-bold text-neutral-600 uppercase">
              Anti-manipulation cap per user to prevent artificial demand pumping.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="50"
                value={maxBuyRequestsPerUser}
                onChange={(e) => setMaxBuyRequestsPerUser(parseInt(e.target.value) || 5)}
                className="w-full border-2 border-black p-1.5 text-xs font-black font-mono bg-white"
              />
              <span className="text-xs font-black">Requests</span>
            </div>
            <p className="text-[9px] font-bold text-neutral-500 font-mono">
              Limit 1 active request per card
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: INTERACTIVE LIVE FORMULA SIMULATOR */}
      <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-2">
            <Calculator className="text-black" size={22} />
            <h3 className="text-lg font-black uppercase tracking-tight text-black">
              2. LIVE PRICING FORMULA SANDBOX & SIMULATOR
            </h3>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 bg-neutral-100 border border-black px-2.5 py-1">
            TEST ANY SCENARIO IN REAL-TIME
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Simulator Inputs (7 cols) */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
                Base Price
              </label>
              <input 
                type="number"
                min="1"
                value={simBasePrice}
                onChange={(e) => setSimBasePrice(Math.max(1, parseInt(e.target.value) || 100))}
                className="w-full border-2 border-black p-2 text-sm font-black font-mono bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                Buy Requests
              </label>
              <input 
                type="number"
                min="0"
                value={simBuyRequests}
                onChange={(e) => setSimBuyRequests(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full border-2 border-emerald-600 p-2 text-sm font-black font-mono bg-emerald-50 text-emerald-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                Sell Listings
              </label>
              <input 
                type="number"
                min="0"
                value={simSellListings}
                onChange={(e) => setSimSellListings(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full border-2 border-indigo-600 p-2 text-sm font-black font-mono bg-indigo-50 text-indigo-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
                Total Active Users
              </label>
              <input 
                type="number"
                min="1"
                value={simActiveUsers}
                onChange={(e) => setSimActiveUsers(Math.max(1, parseInt(e.target.value) || 100))}
                className="w-full border-2 border-black p-2 text-sm font-black font-mono bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                K Factor
              </label>
              <input 
                type="number"
                min="0.1"
                step="0.1"
                value={simK}
                onChange={(e) => setSimK(parseFloat(e.target.value) || 2)}
                className="w-full border-2 border-amber-600 p-2 text-sm font-black font-mono bg-amber-50 text-amber-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
                Min / Max Caps (%)
              </label>
              <div className="flex items-center gap-1">
                <input 
                  type="number"
                  value={simMinPercent}
                  onChange={(e) => setSimMinPercent(parseInt(e.target.value) || 50)}
                  className="w-1/2 border-2 border-black p-2 text-xs font-black font-mono bg-white"
                  title="Min %"
                />
                <input 
                  type="number"
                  value={simMaxPercent}
                  onChange={(e) => setSimMaxPercent(parseInt(e.target.value) || 500)}
                  className="w-1/2 border-2 border-black p-2 text-xs font-black font-mono bg-white"
                  title="Max %"
                />
              </div>
            </div>
          </div>

          {/* Simulator Output Card (5 cols) */}
          <div className="lg:col-span-5 bg-neutral-900 text-white border-2 border-black p-5 space-y-4 shadow-[4px_4px_0px_0px_#D4FF00]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                CALCULATED OUTCOME
              </span>
              <span className={cn(
                "px-2 py-0.5 border text-[9px] font-black uppercase font-mono flex items-center gap-1",
                simResult.demand.badgeBg,
                simResult.demand.badgeBorder
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", simResult.demand.dotColor)} />
                {simResult.demand.level} DEMAND ({simResult.demand.ratioText})
              </span>
            </div>

            <div className="space-y-1 border-b border-neutral-800 pb-3">
              <div className="text-3xl sm:text-4xl font-black text-[#D4FF00] font-mono tracking-tight">
                {formatCurrency(simResult.finalP)}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className={simResult.diff >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {simResult.diff >= 0 ? '+' : ''}{formatCurrency(simResult.diff)} ({simResult.pct >= 0 ? '+' : ''}{simResult.pct}%)
                </span>
                <span className="text-neutral-500">from {formatCurrency(simBasePrice)} base</span>
              </div>
            </div>

            {/* Formula Calculation Steps */}
            <div className="space-y-1 text-[10px] font-mono text-neutral-300">
              <p>
                1. Net Demand = ({simBuyRequests} − {simSellListings}) ÷ {simActiveUsers} = <strong className="text-white font-black">{simResult.netDemand.toFixed(4)}</strong>
              </p>
              <p>
                2. Factor = 1 + ({simResult.netDemand.toFixed(4)} × {simK}) = <strong className="text-white font-black">{simResult.factor.toFixed(4)}</strong>
              </p>
              <p>
                3. Raw Price = {simBasePrice} × {simResult.factor.toFixed(4)} = <strong className="text-white font-black">{formatCurrency(simResult.rawCalculated)}</strong>
              </p>
              <p>
                4. Protection Limits: [{formatCurrency(simResult.minP)} min .. {formatCurrency(simResult.maxP)} max]
                {simResult.isMinCapped && <span className="text-rose-400 font-bold ml-1">(CAPPED AT MIN)</span>}
                {simResult.isMaxCapped && <span className="text-amber-400 font-bold ml-1">(CAPPED AT MAX)</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: ALL CARDS DYNAMIC MARKET PRICE TABLE & CUSTOM OVERRIDES */}
      <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-4">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight text-black">
              3. CATALOG DYNAMIC PRICING OVERVIEW ({filteredCardCalculations.length})
            </h3>
            <p className="text-[10px] font-bold text-neutral-500 uppercase">
              REAL-TIME CALCULATED MARKET PRICES FOR ALL CARDS BASED ON LIVE BUY/SELL DEMAND
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input 
              type="text"
              placeholder="Search player / team..."
              value={cardSearch}
              onChange={(e) => setCardSearch(e.target.value)}
              className="border-2 border-black px-3 py-1.5 text-xs font-bold bg-white"
            />
            <select
              value={filterDemand}
              onChange={(e) => setFilterDemand(e.target.value)}
              className="border-2 border-black px-3 py-1.5 text-xs font-black bg-white"
            >
              <option value="all">ALL DEMAND LEVELS</option>
              <option value="VERY HIGH">VERY HIGH DEMAND</option>
              <option value="HIGH">HIGH DEMAND</option>
              <option value="NORMAL">NORMAL DEMAND</option>
              <option value="LOW">LOW DEMAND</option>
              <option value="VERY LOW">VERY LOW DEMAND</option>
            </select>
          </div>
        </div>

        {/* Cards Table */}
        <div className="overflow-x-auto border-2 border-black">
          <table className="w-full text-left text-xs">
            <thead className="bg-black text-[#D4FF00] font-black uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3 border-r border-neutral-800">CARD / PLAYER</th>
                <th className="p-3 border-r border-neutral-800 text-right">BASE PRICE</th>
                <th className="p-3 border-r border-neutral-800 text-center">BUY REQ</th>
                <th className="p-3 border-r border-neutral-800 text-center">SELL LIST</th>
                <th className="p-3 border-r border-neutral-800 text-center">DEMAND LEVEL</th>
                <th className="p-3 border-r border-neutral-800 text-right">DYNAMIC PRICE</th>
                <th className="p-3 border-r border-neutral-800 text-right">CHANGE</th>
                <th className="p-3 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black font-mono">
              {filteredCardCalculations.map(({ card, calc }) => (
                <tr key={card.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="p-3 font-sans font-black border-r border-black">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-neutral-400 uppercase font-mono">{card.cardNumber}</span>
                      <span className="uppercase text-sm">{card.player}</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-neutral-100 border border-neutral-400 uppercase font-mono">
                        {card.rarity}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right font-black border-r border-black">
                    {formatCurrency(calc.basePrice)}
                  </td>
                  <td className="p-3 text-center font-black text-emerald-700 bg-emerald-50/50 border-r border-black">
                    {calc.buyRequestsCount}
                  </td>
                  <td className="p-3 text-center font-black text-indigo-700 bg-indigo-50/50 border-r border-black">
                    {calc.sellListingsCount}
                  </td>
                  <td className="p-3 text-center border-r border-black">
                    <span className={cn(
                      "px-2 py-0.5 border text-[9px] font-black uppercase font-mono inline-flex items-center gap-1",
                      calc.demand.badgeBg,
                      calc.demand.badgeBorder
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", calc.demand.dotColor)} />
                      {calc.demand.level}
                    </span>
                  </td>
                  <td className="p-3 text-right font-black text-sm border-r border-black bg-[#D4FF00]/10">
                    {formatCurrency(calc.finalPrice)}
                  </td>
                  <td className="p-3 text-right font-black border-r border-black">
                    <span className={cn(
                      "px-1.5 py-0.5 border text-[9px] inline-flex items-center gap-0.5",
                      calc.priceChange.trend === 'up'
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : calc.priceChange.trend === 'down'
                        ? "bg-rose-50 text-rose-700 border-rose-300"
                        : "bg-neutral-100 text-neutral-600 border-neutral-300"
                    )}>
                      {calc.priceChange.trend === 'up' ? <TrendingUp size={10} /> : calc.priceChange.trend === 'down' ? <TrendingDown size={10} /> : null}
                      {calc.priceChange.formattedPercentage}
                    </span>
                  </td>
                  <td className="p-3 text-center font-sans">
                    <button
                      onClick={() => handleOpenCardEdit(card)}
                      className="bg-black hover:bg-[#D4FF00] hover:text-black text-[#D4FF00] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border border-black transition-colors"
                    >
                      EDIT OVERRIDES
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: PER-CARD PRICING OVERRIDES */}
      {selectedCardForEdit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-6 sm:p-8 max-w-lg w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] space-y-6 animate-scaleUp">
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-black">
                  PRICING OVERRIDES: {selectedCardForEdit.player}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">
                  {selectedCardForEdit.cardNumber} • {selectedCardForEdit.team} • {selectedCardForEdit.rarity}
                </p>
              </div>
              <button
                onClick={() => setSelectedCardForEdit(null)}
                className="text-neutral-500 hover:text-black font-black"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-black">
                  Base Starting Price (AC)
                </label>
                <input
                  type="number"
                  min="1"
                  value={cardBasePriceInput}
                  onChange={(e) => setCardBasePriceInput(Math.max(1, parseInt(e.target.value) || 100))}
                  className="w-full border-2 border-black p-2 font-mono font-black text-sm bg-white"
                />
                <p className="text-[9px] font-bold text-neutral-500 uppercase">
                  Fixed mint price from which demand multipliers scale.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-widest text-black">
                    Custom K Factor
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={`Global (${kFactor})`}
                    value={cardCustomKInput}
                    onChange={(e) => setCardCustomKInput(e.target.value)}
                    className="w-full border-2 border-black p-2 font-mono font-black text-sm bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-widest text-black">
                    Min Price Override
                  </label>
                  <input
                    type="number"
                    placeholder={`Auto (${Math.round(cardBasePriceInput * (minPricePercent / 100))})`}
                    value={cardMinPriceInput}
                    onChange={(e) => setCardMinPriceInput(e.target.value)}
                    className="w-full border-2 border-black p-2 font-mono font-black text-sm bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-black">
                  Max Price Override
                </label>
                <input
                  type="number"
                  placeholder={`Auto (${Math.round(cardBasePriceInput * (maxPricePercent / 100))})`}
                  value={cardMaxPriceInput}
                  onChange={(e) => setCardMaxPriceInput(e.target.value)}
                  className="w-full border-2 border-black p-2 font-mono font-black text-sm bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-black">
              <button
                type="button"
                onClick={() => setSelectedCardForEdit(null)}
                className="px-4 py-2 border-2 border-black font-black uppercase text-xs hover:bg-neutral-100"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSaveCardPricing}
                disabled={isSavingCard}
                className="px-6 py-2 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] border-2 border-black font-black uppercase text-xs transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
              >
                {isSavingCard ? 'SAVING...' : 'SAVE OVERRIDES'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: PRICE AUDIT HISTORY LOGS */}
      <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-2">
            <History className="text-black" size={22} />
            <h3 className="text-lg font-black uppercase tracking-tight text-black">
              4. PRICE AUDIT & DEMAND HISTORY LOGS ({priceHistoryLogs.length})
            </h3>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">
            AUTOMATIC LOGS RECORDED ON DEMAND CHANGES
          </span>
        </div>

        {loadingLogs ? (
          <div className="p-8 text-center text-xs font-black uppercase tracking-widest text-neutral-500 animate-pulse">
            LOADING AUDIT LOGS...
          </div>
        ) : priceHistoryLogs.length === 0 ? (
          <div className="p-8 text-center text-xs font-black uppercase tracking-widest text-neutral-400 border-2 border-dashed border-neutral-300">
            NO PRICE HISTORY LOGS RECORDED YET. LOGS WILL POPULATE AUTOMATICALLY WHEN BUY REQUESTS OR LISTINGS SHIFT CARD PRICES.
          </div>
        ) : (
          <div className="overflow-x-auto border-2 border-black max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 text-black font-black uppercase tracking-wider text-[10px] sticky top-0">
                <tr>
                  <th className="p-2.5 border-b-2 border-black">TIMESTAMP</th>
                  <th className="p-2.5 border-b-2 border-black">PLAYER / CARD</th>
                  <th className="p-2.5 border-b-2 border-black text-right">OLD PRICE</th>
                  <th className="p-2.5 border-b-2 border-black text-right">NEW PRICE</th>
                  <th className="p-2.5 border-b-2 border-black text-right">CHANGE</th>
                  <th className="p-2.5 border-b-2 border-black text-center">DEMAND (B / S)</th>
                  <th className="p-2.5 border-b-2 border-black">REASON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 font-mono text-[11px]">
                {priceHistoryLogs.map((log) => (
                  <tr key={log.id || `${log.timestamp}-${log.cardId}`} className="hover:bg-neutral-50">
                    <td className="p-2.5 text-neutral-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-2.5 font-sans font-black uppercase">
                      {log.playerName || log.cardId}
                    </td>
                    <td className="p-2.5 text-right font-black">
                      {formatCurrency(log.oldPrice)}
                    </td>
                    <td className="p-2.5 text-right font-black text-black bg-[#D4FF00]/10">
                      {formatCurrency(log.newPrice)}
                    </td>
                    <td className="p-2.5 text-right font-black">
                      <span className={log.changePercentage >= 0 ? "text-emerald-600" : "text-rose-600"}>
                        {log.changePercentage >= 0 ? '+' : ''}{log.changePercentage}%
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-black">
                      <span className="text-emerald-700">{log.buyRequests} B</span> / <span className="text-indigo-700">{log.sellListings} S</span>
                    </td>
                    <td className="p-2.5 font-sans font-bold text-neutral-600 uppercase">
                      {log.reason || 'demand_change'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
