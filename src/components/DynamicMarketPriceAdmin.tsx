import React, { useState, useEffect, useMemo } from 'react';
import { FootballCard, BuyRequest, MarketListing, MarketSettings, PriceHistoryRecord, WalletTransaction } from '../types';
import { calculateCardMarketValue, formatCurrency, cn, getDemandLevel, getPriceChangeStats, calculateRobustAveragePrice } from '../lib/utils';
import { db, doc, setDoc, updateDoc, collection, onSnapshot, query, orderBy, limit, getDocs } from '../lib/firebase';
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
  Flame,
  Scale,
  Percent,
  Layers,
  Search,
  Lock,
  ArrowUpRight,
  Coins,
  DollarSign
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
  const [kFactor, setKFactor] = useState<number>(currentSettings?.defaultK ?? currentSettings?.kFactor ?? 2);
  const [basePriceWeight, setBasePriceWeight] = useState<number>(
    currentSettings?.basePriceWeight !== undefined ? (currentSettings.basePriceWeight > 1 ? currentSettings.basePriceWeight : Math.round(currentSettings.basePriceWeight * 100)) : 40
  );
  const [txPriceWeight, setTxPriceWeight] = useState<number>(
    currentSettings?.transactionPriceWeight !== undefined ? (currentSettings.transactionPriceWeight > 1 ? currentSettings.transactionPriceWeight : Math.round(currentSettings.transactionPriceWeight * 100)) : 60
  );
  const [sampleSize, setSampleSize] = useState<number>(currentSettings?.transactionSampleSize ?? 20);
  const [minPricePercent, setMinPricePercent] = useState<number>(currentSettings?.minPricePercentage ?? 50);
  const [maxPricePercent, setMaxPricePercent] = useState<number>(currentSettings?.maxPricePercentage ?? 500);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Ownership Mapping State across all user collections (unique owners)
  const [uniqueOwnersMap, setUniqueOwnersMap] = useState<Record<string, number>>({});
  // Completed transactions mapped by cardId
  const [cardCompletedTransactionsMap, setCardCompletedTransactionsMap] = useState<Record<string, number[]>>({});
  const [recentTransactions, setRecentTransactions] = useState<WalletTransaction[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);

  // Per-card edit state in Admin Table
  const [selectedCardForEdit, setSelectedCardForEdit] = useState<FootballCard | null>(null);
  const [cardBasePriceInput, setCardBasePriceInput] = useState<number>(100);
  const [cardCustomKInput, setCardCustomKInput] = useState<string>('');
  const [cardMinPriceInput, setCardMinPriceInput] = useState<string>('');
  const [cardMaxPriceInput, setCardMaxPriceInput] = useState<string>('');
  const [isSavingCard, setIsSavingCard] = useState(false);

  // Search & Filter in Admin Table
  const [cardSearch, setCardSearch] = useState('');
  const [filterRarity, setFilterRarity] = useState<string>('all');

  // Interactive Live Formula Simulator State
  const [simBasePrice, setSimBasePrice] = useState<number>(100);
  const [simOwners, setSimOwners] = useState<number>(25);
  const [simK, setSimK] = useState<number>(2);
  const [simAvgTxPrice, setSimAvgTxPrice] = useState<number>(150);
  const [simBaseWeight, setSimBaseWeight] = useState<number>(40);
  const [simTxWeight, setSimTxWeight] = useState<number>(60);
  const [simMinPercent, setSimMinPercent] = useState<number>(50);
  const [simMaxPercent, setSimMaxPercent] = useState<number>(500);

  // Sync state if incoming settings change
  useEffect(() => {
    if (currentSettings) {
      if (currentSettings.defaultK !== undefined || currentSettings.kFactor !== undefined) {
        setKFactor(currentSettings.defaultK ?? currentSettings.kFactor ?? 2);
      }
      if (currentSettings.basePriceWeight !== undefined) {
        setBasePriceWeight(currentSettings.basePriceWeight > 1 ? currentSettings.basePriceWeight : Math.round(currentSettings.basePriceWeight * 100));
      }
      if (currentSettings.transactionPriceWeight !== undefined) {
        setTxPriceWeight(currentSettings.transactionPriceWeight > 1 ? currentSettings.transactionPriceWeight : Math.round(currentSettings.transactionPriceWeight * 100));
      }
      if (currentSettings.transactionSampleSize !== undefined) {
        setSampleSize(currentSettings.transactionSampleSize);
      }
      if (currentSettings.minPricePercentage !== undefined) {
        setMinPricePercent(currentSettings.minPricePercentage);
      }
      if (currentSettings.maxPricePercentage !== undefined) {
        setMaxPricePercent(currentSettings.maxPricePercentage);
      }
    }
  }, [currentSettings]);

  // Listen to users collection to calculate unique card owners in real time
  useEffect(() => {
    try {
      const usersRef = collection(db, 'users');
      const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
        const counts: Record<string, number> = {};
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const vault: string[] = Array.isArray(data.vaultIds) 
            ? data.vaultIds 
            : (Array.isArray(data.collectionIds) ? data.collectionIds : []);
          const uniqueInUser = new Set(vault);
          uniqueInUser.forEach(cardId => {
            counts[cardId] = (counts[cardId] || 0) + 1;
          });
        });
        setUniqueOwnersMap(counts);
      }, (err) => {
        console.error("Error computing unique card owners:", err);
      });

      return () => unsubscribeUsers();
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Listen to transactions collection to extract completed transaction prices
  useEffect(() => {
    try {
      const txRef = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(150));
      const unsubscribeTx = onSnapshot(txRef, (snapshot) => {
        const txList: WalletTransaction[] = [];
        const cardTxMap: Record<string, number[]> = {};

        snapshot.forEach(docSnap => {
          const item = { id: docSnap.id, ...docSnap.data() } as WalletTransaction;
          txList.push(item);

          // If this is a completed buy/sell transaction for a specific card
          if (item.cardId && (item.type === 'market_buy' || item.type === 'buy_card' || item.type === 'market_sell')) {
            const price = Math.abs(Number(item.amount));
            if (!isNaN(price) && isFinite(price) && price > 0) {
              if (!cardTxMap[item.cardId]) cardTxMap[item.cardId] = [];
              cardTxMap[item.cardId].push(price);
            }
          }
        });

        setRecentTransactions(txList);
        setCardCompletedTransactionsMap(cardTxMap);
        setLoadingLedger(false);
      }, (err) => {
        console.error("Error loading completed transactions:", err);
        setLoadingLedger(false);
      });

      return () => unsubscribeTx();
    } catch (e) {
      console.error(e);
      setLoadingLedger(false);
    }
  }, []);

  // Weight validation
  const totalWeight = basePriceWeight + txPriceWeight;
  const isWeightValid = totalWeight === 100;

  const handleAutoBalanceWeights = (newBase?: number) => {
    const base = newBase !== undefined ? newBase : basePriceWeight;
    const clampedBase = Math.max(0, Math.min(100, base));
    setBasePriceWeight(clampedBase);
    setTxPriceWeight(100 - clampedBase);
  };

  const handleSetPresetWeights = (base: number, tx: number) => {
    setBasePriceWeight(base);
    setTxPriceWeight(tx);
  };

  const handleSaveGlobalSettings = async () => {
    if (!isWeightValid) {
      alert(`The weights must sum to exactly 100%. Currently they sum to ${totalWeight}%. Click 'Auto-Balance' or adjust the sliders.`);
      return;
    }

    setIsSavingSettings(true);
    try {
      const settingsRef = doc(db, 'market_settings', 'global');
      const updated: MarketSettings = {
        defaultK: Number(kFactor) || 2,
        kFactor: Number(kFactor) || 2,
        basePriceWeight: Number((basePriceWeight / 100).toFixed(4)),
        transactionPriceWeight: Number((txPriceWeight / 100).toFixed(4)),
        transactionSampleSize: Number(sampleSize) || 20,
        minPricePercentage: Number(minPricePercent) || 50,
        maxPricePercentage: Number(maxPricePercent) || 500,
        updatedAt: Date.now()
      };

      await setDoc(settingsRef, updated, { merge: true });
      if (onToast) onToast("✅ Dynamic Market Value System configuration saved successfully!");
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

  // Live Formula Simulator Computation
  const simResult = useMemo(() => {
    const safeBase = Math.max(1, simBasePrice);
    const safeOwners = Math.max(1, simOwners);
    const k = Number(simK) || 2;
    
    // Scarcity Factor = 1 + (K / √Owners)
    const sqrtOwners = Math.sqrt(safeOwners);
    const scarcityFactor = 1 + (k / sqrtOwners);

    // Weights
    const bWeight = (simBaseWeight || 40) / 100;
    const txWeight = (simTxWeight || 60) / 100;

    // Transaction Factor = Base Price Weight + (Transaction Price Weight × Average Transaction Price / Base Price)
    const safeAvgTx = Math.max(1, simAvgTxPrice);
    const txFactor = bWeight + (txWeight * (safeAvgTx / safeBase));

    // Raw Market Value = Base Price × Scarcity Factor × Transaction Factor
    const rawValue = safeBase * scarcityFactor * txFactor;

    // Limits
    const minP = Math.max(1, Math.round(safeBase * ((simMinPercent || 50) / 100)));
    const maxP = Math.max(minP, Math.round(safeBase * ((simMaxPercent || 500) / 100)));
    const finalValue = Math.min(maxP, Math.max(minP, Math.round(rawValue)));

    const diff = finalValue - safeBase;
    const pctChange = Math.round((diff / safeBase) * 1000) / 10;

    return {
      safeBase,
      safeOwners,
      sqrtOwners: sqrtOwners.toFixed(2),
      scarcityFactor: scarcityFactor.toFixed(4),
      txFactor: txFactor.toFixed(4),
      rawValue: Math.round(rawValue),
      minP,
      maxP,
      finalValue,
      diff,
      pctChange,
      isMinCapped: rawValue <= minP,
      isMaxCapped: rawValue >= maxP
    };
  }, [simBasePrice, simOwners, simK, simAvgTxPrice, simBaseWeight, simTxWeight, simMinPercent, simMaxPercent]);

  // Real-time Card Valuation Table Calculations
  const currentSettingsConfig: MarketSettings = useMemo(() => ({
    defaultK: kFactor,
    kFactor,
    basePriceWeight: basePriceWeight / 100,
    transactionPriceWeight: txPriceWeight / 100,
    transactionSampleSize: sampleSize,
    minPricePercentage: minPricePercent,
    maxPricePercentage: maxPricePercent
  }), [kFactor, basePriceWeight, txPriceWeight, sampleSize, minPricePercent, maxPricePercent]);

  const cardCalculations = useMemo(() => {
    return cards.map(c => {
      const owners = uniqueOwnersMap[c.id] !== undefined ? uniqueOwnersMap[c.id] : (c.stock !== undefined && c.maxSupply !== undefined ? Math.max(0, c.maxSupply - c.stock) : 1);
      const txPrices = cardCompletedTransactionsMap[c.id] || [];

      const calc = calculateCardMarketValue(c, {
        ownersCount: owners,
        transactions: txPrices,
        listings,
        buyRequests,
        totalActiveUsers,
        settings: currentSettingsConfig
      });

      return {
        card: c,
        calc,
        owners,
        txPricesCount: txPrices.length
      };
    });
  }, [cards, uniqueOwnersMap, cardCompletedTransactionsMap, listings, buyRequests, totalActiveUsers, currentSettingsConfig]);

  const filteredCardCalculations = useMemo(() => {
    return cardCalculations.filter(({ card }) => {
      const q = cardSearch.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        card.player.toLowerCase().includes(q) ||
        card.team.toLowerCase().includes(q) ||
        card.cardNumber.toLowerCase().includes(q) ||
        (card.set || '').toLowerCase().includes(q);
      
      const matchesRarity = filterRarity === 'all' || card.rarity === filterRarity;
      return matchesSearch && matchesRarity;
    });
  }, [cardCalculations, cardSearch, filterRarity]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header & Formula Definition Banner */}
      <div className="bg-black text-white p-6 sm:p-8 border-4 border-black shadow-[8px_8px_0px_0px_#D4FF00] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#D4FF00] text-black px-3 py-1 text-[10px] font-black uppercase tracking-widest border border-black">
              <Sparkles size={14} /> DYNAMIC MARKET VALUE SYSTEM
            </div>
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter text-white">
              MARKET VALUE ENGINE & ADMIN CONTROLS
            </h2>
            <div className="bg-neutral-900/90 border border-neutral-700 p-3 text-xs sm:text-sm font-mono text-[#D4FF00] max-w-3xl space-y-1">
              <p className="text-white font-bold uppercase tracking-wider text-[11px]">Formula:</p>
              <p className="leading-relaxed">
                Market Value = Base Price × Scarcity Factor × Transaction Factor
              </p>
              <p className="text-neutral-400 text-[11px]">
                • Scarcity Factor = 1 + (K / √Owners)<br />
                • Transaction Factor = Base Price Weight + (Transaction Price Weight × Average Transaction Price / Base Price)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-neutral-900 border border-neutral-800 p-4 shrink-0">
            <div className="p-2.5 border border-neutral-800 bg-black/40">
              <span className="text-[9px] text-neutral-400 font-black uppercase block">K SENSITIVITY</span>
              <span className="text-xl font-black text-[#D4FF00] font-mono">{kFactor}</span>
            </div>
            <div className="p-2.5 border border-neutral-800 bg-black/40">
              <span className="text-[9px] text-neutral-400 font-black uppercase block">BASE / TX WEIGHT</span>
              <span className="text-xl font-black text-white font-mono">{basePriceWeight}% / {txPriceWeight}%</span>
            </div>
            <div className="p-2.5 border border-neutral-800 bg-black/40">
              <span className="text-[9px] text-neutral-400 font-black uppercase block">SAMPLE SIZE</span>
              <span className="text-xl font-black text-amber-400 font-mono">{sampleSize} sales</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: GLOBAL MARKET VALUE SETTINGS */}
      <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-4">
          <div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="text-black" size={22} />
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-black">
                1. MARKET VALUE PARAMETERS & WEIGHTS
              </h3>
            </div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-0.5">
              Configure scarcity sensitivity, base vs transaction weight balance, sample size, and price protection bounds.
            </p>
          </div>
          <button
            onClick={handleSaveGlobalSettings}
            disabled={isSavingSettings || !isWeightValid}
            className="flex items-center justify-center gap-2 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-6 py-3 text-xs font-black uppercase tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
          >
            <Save size={16} /> {isSavingSettings ? 'SAVING...' : 'SAVE MARKET SETTINGS'}
          </button>
        </div>

        {/* Weights Balance Indicator */}
        <div className={cn(
          "p-4 border-2 flex flex-col md:flex-row items-center justify-between gap-4 transition-all",
          isWeightValid 
            ? "bg-emerald-50 border-emerald-600 text-emerald-900" 
            : "bg-rose-50 border-rose-600 text-rose-900"
        )}>
          <div className="flex items-center gap-3">
            <Scale size={24} className={isWeightValid ? "text-emerald-700" : "text-rose-700"} />
            <div>
              <p className="text-xs font-black uppercase tracking-wide">
                Weights Sum Rule: Base Price Weight ({basePriceWeight}%) + Transaction Price Weight ({txPriceWeight}%) = {totalWeight}%
              </p>
              <p className="text-[11px] font-bold">
                {isWeightValid 
                  ? "✅ Perfectly balanced! Weights add up to exactly 100% (1.00)."
                  : `⚠️ Invalid weight sum: Total is ${totalWeight}%. Must equal exactly 100%.`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleAutoBalanceWeights()}
              className="bg-black hover:bg-neutral-800 text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-black"
            >
              Auto-Balance (100%)
            </button>
            <button
              type="button"
              onClick={() => handleSetPresetWeights(40, 60)}
              className="bg-white hover:bg-neutral-100 text-black px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-black"
            >
              Default (40 / 60)
            </button>
            <button
              type="button"
              onClick={() => handleSetPresetWeights(50, 50)}
              className="bg-white hover:bg-neutral-100 text-black px-3 py-1.5 text-xs font-black uppercase tracking-wider border border-black"
            >
              50 / 50
            </button>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* K Factor Control */}
          <div className="border-2 border-black p-4 bg-neutral-50 space-y-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-black">
                Scarcity Factor Constant (K)
              </label>
              <span className="bg-black text-[#D4FF00] text-xs font-mono font-black px-2 py-0.5">
                K = {kFactor}
              </span>
            </div>
            <p className="text-[10px] font-bold text-neutral-600 uppercase">
              Controls scarcity impact. Default = 2. Formula: (1 + K / √Owners).
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
                className="w-full border-2 border-black p-2 text-xs font-black font-mono bg-white"
              />
            </div>
          </div>

          {/* Base Price Weight Control */}
          <div className="border-2 border-black p-4 bg-neutral-50 space-y-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-black">
                Base Price Weight (%)
              </label>
              <span className="bg-blue-100 text-blue-900 border border-blue-400 text-xs font-mono font-black px-2 py-0.5">
                {basePriceWeight}% ({(basePriceWeight / 100).toFixed(2)})
              </span>
            </div>
            <p className="text-[10px] font-bold text-neutral-600 uppercase">
              Weight given to starting foundation price. Default = 40% (0.40).
            </p>
            <input 
              type="range"
              min="0"
              max="100"
              step="5"
              value={basePriceWeight}
              onChange={(e) => handleAutoBalanceWeights(parseInt(e.target.value))}
              className="w-full accent-black cursor-pointer"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={basePriceWeight}
                onChange={(e) => handleAutoBalanceWeights(parseInt(e.target.value) || 0)}
                className="w-full border-2 border-black p-2 text-xs font-black font-mono bg-white"
              />
              <span className="text-xs font-black">%</span>
            </div>
          </div>

          {/* Transaction Price Weight Control */}
          <div className="border-2 border-black p-4 bg-neutral-50 space-y-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-black">
                Transaction Price Weight (%)
              </label>
              <span className="bg-amber-100 text-amber-900 border border-amber-400 text-xs font-mono font-black px-2 py-0.5">
                {txPriceWeight}% ({(txPriceWeight / 100).toFixed(2)})
              </span>
            </div>
            <p className="text-[10px] font-bold text-neutral-600 uppercase">
              Weight given to actual completed purchase prices. Default = 60% (0.60).
            </p>
            <input 
              type="range"
              min="0"
              max="100"
              step="5"
              value={txPriceWeight}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setTxPriceWeight(val);
                setBasePriceWeight(100 - val);
              }}
              className="w-full accent-black cursor-pointer"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={txPriceWeight}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setTxPriceWeight(val);
                  setBasePriceWeight(100 - val);
                }}
                className="w-full border-2 border-black p-2 text-xs font-black font-mono bg-white"
              />
              <span className="text-xs font-black">%</span>
            </div>
          </div>

          {/* Transaction History Sample Size */}
          <div className="border-2 border-black p-4 bg-neutral-50 space-y-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-black">
                Transaction Sample Size
              </label>
              <span className="bg-black text-white text-xs font-mono font-black px-2 py-0.5">
                Last {sampleSize} Sales
              </span>
            </div>
            <p className="text-[10px] font-bold text-neutral-600 uppercase">
              Number of latest completed transactions to average. Default = 20.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="100"
                value={sampleSize}
                onChange={(e) => setSampleSize(Math.max(1, parseInt(e.target.value) || 20))}
                className="w-full border-2 border-black p-2 text-xs font-black font-mono bg-white"
              />
              <span className="text-xs font-black">Sales</span>
            </div>
            <p className="text-[9px] font-bold text-neutral-500 font-mono">
              If fewer exist, uses all available sales (trimmed outlier protection enabled).
            </p>
          </div>

          {/* Minimum Price Protection Limit */}
          <div className="border-2 border-black p-4 bg-neutral-50 space-y-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-black">
                Min Price Limit (%)
              </label>
              <span className="bg-rose-100 text-rose-800 text-xs font-mono font-black px-2 py-0.5 border border-rose-400">
                {minPricePercent}%
              </span>
            </div>
            <p className="text-[10px] font-bold text-neutral-600 uppercase">
              Minimum floor relative to Base Price. Default = 50%.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="10"
                max="100"
                value={minPricePercent}
                onChange={(e) => setMinPricePercent(parseInt(e.target.value) || 50)}
                className="w-full border-2 border-black p-2 text-xs font-black font-mono bg-white"
              />
              <span className="text-xs font-black">%</span>
            </div>
            <p className="text-[9px] font-bold text-neutral-500 font-mono">
              e.g. 100 Base → Floor {Math.round(100 * (minPricePercent / 100))} AC
            </p>
          </div>

          {/* Maximum Price Protection Limit */}
          <div className="border-2 border-black p-4 bg-neutral-50 space-y-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-black">
                Max Price Limit (%)
              </label>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-mono font-black px-2 py-0.5 border border-emerald-400">
                {maxPricePercent}%
              </span>
            </div>
            <p className="text-[10px] font-bold text-neutral-600 uppercase">
              Maximum ceiling relative to Base Price. Default = 500%.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="100"
                max="2000"
                step="50"
                value={maxPricePercent}
                onChange={(e) => setMaxPricePercent(parseInt(e.target.value) || 500)}
                className="w-full border-2 border-black p-2 text-xs font-black font-mono bg-white"
              />
              <span className="text-xs font-black">%</span>
            </div>
            <p className="text-[9px] font-bold text-neutral-500 font-mono">
              e.g. 100 Base → Ceiling {Math.round(100 * (maxPricePercent / 100))} AC
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: INTERACTIVE LIVE FORMULA SANDBOX / SIMULATOR */}
      <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-2">
            <Calculator className="text-black" size={22} />
            <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-black">
              2. INTERACTIVE FORMULA SIMULATOR & STEP-BY-STEP BREAKDOWN
            </h3>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-black bg-[#D4FF00] border border-black px-2.5 py-1">
            TEST LIVE CALCULATIONS
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Simulator Inputs (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500">
              SIMULATION PARAMETERS:
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-black">
                  Base Price (Coins)
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
                <label className="text-[10px] font-black uppercase tracking-widest text-black">
                  Unique Owners (√Owners)
                </label>
                <input 
                  type="number"
                  min="1"
                  value={simOwners}
                  onChange={(e) => setSimOwners(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border-2 border-black p-2 text-sm font-black font-mono bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-purple-700">
                  K Sensitivity Factor
                </label>
                <input 
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={simK}
                  onChange={(e) => setSimK(parseFloat(e.target.value) || 2)}
                  className="w-full border-2 border-purple-700 p-2 text-sm font-black font-mono bg-purple-50 text-purple-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                  Avg Transaction Price
                </label>
                <input 
                  type="number"
                  min="1"
                  value={simAvgTxPrice}
                  onChange={(e) => setSimAvgTxPrice(Math.max(1, parseInt(e.target.value) || 100))}
                  className="w-full border-2 border-amber-600 p-2 text-sm font-black font-mono bg-amber-50 text-amber-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                  Base Price Weight (%)
                </label>
                <input 
                  type="number"
                  min="0"
                  max="100"
                  value={simBaseWeight}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setSimBaseWeight(val);
                    setSimTxWeight(100 - val);
                  }}
                  className="w-full border-2 border-blue-700 p-2 text-sm font-black font-mono bg-blue-50 text-blue-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                  Tx Price Weight (%)
                </label>
                <input 
                  type="number"
                  min="0"
                  max="100"
                  value={simTxWeight}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setSimTxWeight(val);
                    setSimBaseWeight(100 - val);
                  }}
                  className="w-full border-2 border-emerald-700 p-2 text-sm font-black font-mono bg-emerald-50 text-emerald-900"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSimBasePrice(100);
                  setSimOwners(25);
                  setSimK(2);
                  setSimAvgTxPrice(150);
                  setSimBaseWeight(40);
                  setSimTxWeight(60);
                }}
                className="bg-neutral-100 hover:bg-black hover:text-[#D4FF00] text-black border border-black px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors"
              >
                Load User Example (100 Base, 25 Owners, 150 Avg Tx → 182 AC)
              </button>
            </div>
          </div>

          {/* Simulator Live Output & Math Steps (6 cols) */}
          <div className="lg:col-span-6 bg-black text-white p-6 border-4 border-black shadow-[6px_6px_0px_0px_#D4FF00] space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D4FF00]">
                SIMULATION RESULT
              </span>
              <span className="text-xs font-mono font-black text-neutral-400">
                {simResult.pctChange >= 0 ? `+${simResult.pctChange}%` : `${simResult.pctChange}%`} vs Base
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                CALCULATED FINAL MARKET VALUE
              </span>
              <div className="text-4xl sm:text-5xl font-black text-[#D4FF00] tracking-tight font-mono">
                {formatCurrency(simResult.finalValue)}
              </div>
            </div>

            {/* Formula Math Steps Breakdown */}
            <div className="space-y-2 pt-2 border-t border-neutral-800 text-xs font-mono">
              <div className="bg-neutral-900 p-2.5 border border-neutral-800 space-y-1">
                <p className="text-[10px] font-bold text-neutral-400 uppercase">Step 1: Scarcity Factor</p>
                <p className="text-white">
                  1 + ({simK} / √{simOwners}) = 1 + ({simK} / {simResult.sqrtOwners}) = <strong className="text-[#D4FF00]">{simResult.scarcityFactor}</strong>
                </p>
              </div>

              <div className="bg-neutral-900 p-2.5 border border-neutral-800 space-y-1">
                <p className="text-[10px] font-bold text-neutral-400 uppercase">Step 2: Transaction Factor</p>
                <p className="text-white">
                  {(simBaseWeight / 100).toFixed(2)} + ({(simTxWeight / 100).toFixed(2)} × {simAvgTxPrice} / {simBasePrice}) = <strong className="text-[#D4FF00]">{simResult.txFactor}</strong>
                </p>
              </div>

              <div className="bg-neutral-900 p-2.5 border border-neutral-800 space-y-1">
                <p className="text-[10px] font-bold text-neutral-400 uppercase">Step 3: Raw Value & Bounds</p>
                <p className="text-white">
                  {simBasePrice} × {simResult.scarcityFactor} × {simResult.txFactor} = <strong className="text-white">{simResult.rawValue} AC</strong>
                </p>
                <p className="text-[10px] text-neutral-400">
                  Protected between {simResult.minP} AC (min) and {simResult.maxP} AC (max) → <strong>{simResult.finalValue} AC</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: REAL-TIME CARDS VALUATION LEDGER TABLE */}
      <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Coins className="text-black" size={22} />
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-black">
                3. LIVE CARD VALUATIONS & SCARCITY AUDIT LEDGER
              </h3>
            </div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-0.5">
              Live calculated market values across all {cards.length} database cards based on current unique owners and completed transactions.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
              <input
                type="text"
                placeholder="SEARCH PLAYER, TEAM, #"
                value={cardSearch}
                onChange={(e) => setCardSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-black uppercase border-2 border-black w-48 sm:w-60"
              />
            </div>
            <select
              value={filterRarity}
              onChange={(e) => setFilterRarity(e.target.value)}
              className="px-3 py-1.5 text-xs font-black uppercase border-2 border-black bg-white"
            >
              <option value="all">ALL RARITIES</option>
              <option value="Base">BASE</option>
              <option value="Silver Refractor">SILVER REFRACTOR</option>
              <option value="Gold Autograph">GOLD AUTOGRAPH</option>
              <option value="1-of-1 Shield">1-OF-1 SHIELD</option>
            </select>
          </div>
        </div>

        {/* Valuation Table */}
        <div className="overflow-x-auto border-2 border-black">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-black text-white uppercase text-[10px] tracking-wider border-b-2 border-black font-mono">
                <th className="p-3">CARD / PLAYER</th>
                <th className="p-3">RARITY</th>
                <th className="p-3 text-right">BASE PRICE</th>
                <th className="p-3 text-center">OWNERS (√)</th>
                <th className="p-3 text-center">SCARCITY FACTOR</th>
                <th className="p-3 text-center">AVG TX PRICE (HIST)</th>
                <th className="p-3 text-center">TX FACTOR</th>
                <th className="p-3 text-right">LIVE MARKET VALUE</th>
                <th className="p-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black font-mono">
              {filteredCardCalculations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-neutral-500 font-bold uppercase">
                    No matching cards found.
                  </td>
                </tr>
              ) : (
                filteredCardCalculations.map(({ card, calc, owners, txPricesCount }) => {
                  const isPositive = calc.priceChangeDiff >= 0;
                  return (
                    <tr key={card.id} className="hover:bg-neutral-50 transition-colors">
                      {/* Card / Player */}
                      <td className="p-3 font-sans">
                        <div className="flex items-center gap-2">
                          {card.imageUrl ? (
                            <img src={card.imageUrl} alt={card.player} className="w-8 h-10 object-cover border border-black" />
                          ) : (
                            <div className="w-8 h-10 bg-neutral-200 border border-black flex items-center justify-center font-bold text-[9px]">
                              #{card.cardNumber}
                            </div>
                          )}
                          <div>
                            <span className="font-black text-black block leading-tight">{card.player}</span>
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">
                              {card.team} • #{card.cardNumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Rarity */}
                      <td className="p-3 font-sans">
                        <span className={cn(
                          "px-2 py-0.5 text-[9px] font-black uppercase border border-black inline-block",
                          card.rarity === 'Base' && "bg-white text-black",
                          card.rarity === 'Silver Refractor' && "bg-slate-200 text-black",
                          card.rarity === 'Gold Autograph' && "bg-amber-300 text-black",
                          card.rarity === '1-of-1 Shield' && "bg-black text-[#D4FF00]"
                        )}>
                          {card.rarity}
                        </span>
                      </td>

                      {/* Base Price */}
                      <td className="p-3 text-right font-black text-black">
                        {formatCurrency(calc.basePrice)}
                      </td>

                      {/* Unique Owners */}
                      <td className="p-3 text-center">
                        <span className="bg-neutral-100 border border-black px-2 py-0.5 text-xs font-black">
                          {owners} {owners === 1 ? 'user' : 'users'}
                        </span>
                      </td>

                      {/* Scarcity Factor */}
                      <td className="p-3 text-center">
                        <span className="font-black text-purple-700 bg-purple-50 px-2 py-0.5 border border-purple-300">
                          {calc.scarcityFactor.toFixed(3)}x
                        </span>
                      </td>

                      {/* Avg Tx Price */}
                      <td className="p-3 text-center">
                        {calc.hasTransactionHistory ? (
                          <div className="text-[11px]">
                            <span className="font-black text-black">{formatCurrency(calc.averageTransactionPrice)}</span>
                            <span className="text-[9px] text-neutral-500 block">({txPricesCount} sales)</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-neutral-500 uppercase bg-neutral-100 px-2 py-0.5 border border-neutral-300">
                            Base Default ({calc.basePrice} AC)
                          </span>
                        )}
                      </td>

                      {/* Tx Factor */}
                      <td className="p-3 text-center">
                        <span className="font-black text-blue-700 bg-blue-50 px-2 py-0.5 border border-blue-300">
                          {calc.transactionFactor.toFixed(3)}x
                        </span>
                      </td>

                      {/* Live Market Value */}
                      <td className="p-3 text-right">
                        <div className="font-black text-sm text-black">
                          {formatCurrency(calc.finalMarketValue)}
                        </div>
                        <div className={cn(
                          "text-[10px] font-bold",
                          isPositive ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {isPositive ? '+' : ''}{calc.priceChangePercentage}%
                        </div>
                      </td>

                      {/* Action */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenCardEdit(card)}
                          className="bg-white hover:bg-black hover:text-[#D4FF00] text-black border border-black px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-colors"
                        >
                          EDIT BASE / K
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: COMPLETED TRANSACTIONS LEDGER (SOURCE OF TRANSACTION DATA) */}
      <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-2">
            <History className="text-black" size={22} />
            <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-black">
              4. COMPLETED TRANSACTIONS LEDGER (SAMPLE POOL)
            </h3>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 bg-neutral-100 border border-black px-2.5 py-1">
            {recentTransactions.length} RECORDED COMPLETED SALES
          </span>
        </div>

        {recentTransactions.length === 0 ? (
          <p className="text-xs font-bold text-neutral-500 uppercase">
            No completed market transactions logged yet. All cards currently default to (Average Transaction Price = Base Price) with Transaction Factor = 1.0.
          </p>
        ) : (
          <div className="overflow-x-auto border-2 border-black max-h-72">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-black text-white uppercase text-[10px] tracking-wider font-mono">
                <tr>
                  <th className="p-3">DATE / TIME</th>
                  <th className="p-3">CARD</th>
                  <th className="p-3">TYPE</th>
                  <th className="p-3">DESCRIPTION</th>
                  <th className="p-3 text-right">PRICE (COINS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-mono">
                {recentTransactions.slice(0, 25).map(tx => (
                  <tr key={tx.id} className="hover:bg-neutral-50">
                    <td className="p-3 text-neutral-500 text-[10px]">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-black text-black font-sans">
                      {tx.cardName || tx.cardId || 'Market Item'}
                    </td>
                    <td className="p-3">
                      <span className="bg-[#D4FF00] text-black px-2 py-0.5 text-[9px] font-black uppercase border border-black">
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-3 text-neutral-600 font-sans">{tx.description}</td>
                    <td className="p-3 text-right font-black text-emerald-600">
                      {formatCurrency(Math.abs(tx.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PER-CARD EDIT MODAL */}
      {selectedCardForEdit && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-6 w-full max-w-lg space-y-5 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <h4 className="text-xl font-black uppercase tracking-tight">
                  EDIT CARD BASE PRICE & K
                </h4>
                <p className="text-xs font-bold text-neutral-500 uppercase">
                  {selectedCardForEdit.player} • {selectedCardForEdit.rarity}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCardForEdit(null)}
                className="text-black hover:text-red-600 text-xl font-black"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-black">
                  Base Starting Price (Coins)
                </label>
                <input
                  type="number"
                  min="1"
                  value={cardBasePriceInput}
                  onChange={(e) => setCardBasePriceInput(Math.max(1, parseInt(e.target.value) || 100))}
                  className="w-full border-2 border-black p-2 text-sm font-black font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-purple-700">
                  Custom Card K Factor (Leave blank for global {kFactor})
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder={`Default: ${kFactor}`}
                  value={cardCustomKInput}
                  onChange={(e) => setCardCustomKInput(e.target.value)}
                  className="w-full border-2 border-purple-700 p-2 text-sm font-black font-mono bg-purple-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
                    Min Price Override
                  </label>
                  <input
                    type="number"
                    placeholder={`e.g. ${Math.round(cardBasePriceInput * 0.5)}`}
                    value={cardMinPriceInput}
                    onChange={(e) => setCardMinPriceInput(e.target.value)}
                    className="w-full border-2 border-black p-2 text-xs font-black font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
                    Max Price Override
                  </label>
                  <input
                    type="number"
                    placeholder={`e.g. ${Math.round(cardBasePriceInput * 5.0)}`}
                    value={cardMaxPriceInput}
                    onChange={(e) => setCardMaxPriceInput(e.target.value)}
                    className="w-full border-2 border-black p-2 text-xs font-black font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-black">
              <button
                type="button"
                onClick={() => setSelectedCardForEdit(null)}
                className="px-4 py-2 border-2 border-black text-xs font-black uppercase tracking-widest bg-white hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCardPricing}
                disabled={isSavingCard}
                className="px-5 py-2 border-2 border-black text-xs font-black uppercase tracking-widest bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] transition-colors"
              >
                {isSavingCard ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
