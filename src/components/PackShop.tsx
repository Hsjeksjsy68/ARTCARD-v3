import React, { useState } from 'react';
import { FootballCard, Pack } from '../types';
import { PackageOpen, Sparkles, Truck, CreditCard, CheckCircle, Wallet, Info, Plus, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, drawRandomCards, getDefaultStock } from '../lib/utils';
import { PackOpeningModal } from './PackOpeningModal';
import { db, doc, setDoc, updateDoc, increment, collection, addDoc, User } from '../lib/firebase';


interface PackShopProps {
  cards: FootballCard[];
  packs: Pack[];
  user: User | null;
  walletBalance: number;
  onOpenWallet: () => void;
  onOpenAuth: () => void;
  onCardsDrawn: (drawnCards: FootballCard[]) => void;
}

export function PackShop({
  cards,
  packs,
  user,
  walletBalance,
  onOpenWallet,
  onOpenAuth,
  onCardsDrawn
}: PackShopProps) {
  const [shopMode, setShopMode] = useState<'digital' | 'physical'>('digital');
  const [selectedPackForOpening, setSelectedPackForOpening] = useState<Pack | null>(null);
  const [drawnCards, setDrawnCards] = useState<FootballCard[]>([]);
  const [isOpeningPack, setIsOpeningPack] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Physical Order Modal
  const [selectedPhysicalPack, setSelectedPhysicalPack] = useState<Pack | null>(null);
  const [orderState, setOrderState] = useState<'idle' | 'form' | 'processing' | 'success'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    zipCode: '',
    cardNumber: '',
    expiry: '',
    cvc: ''
  });

  const defaultPacks: Pack[] = [
    {
      id: 'starter',
      name: 'STARTER PACK',
      size: 3,
      price: 250,
      color: 'bg-white text-black',
      description: 'Perfect for beginners. 3 guaranteed collectible cards with refractor chances.',
      rarityOdds: { base: 80, silver: 18, gold: 2, shield: 0 }
    },
    {
      id: 'pro',
      name: 'PRO PACK',
      size: 5,
      price: 500,
      color: 'bg-[#D4FF00] text-black',
      description: 'High-value collector pack with elevated Gold Autograph drop rates.',
      rarityOdds: { base: 60, silver: 30, gold: 9, shield: 1 }
    },
    {
      id: 'elite',
      name: 'ELITE PACK',
      size: 7,
      price: 1200,
      color: 'bg-black text-white',
      description: 'Maximum rarity pack. Highest odds of pulling numbered autographs & 1-of-1 Shields.',
      rarityOdds: { base: 40, silver: 40, gold: 17, shield: 3 }
    }
  ];

  const displayPacks = packs.length > 0 ? packs : defaultPacks;

  const handleBuyDigitalPack = async (pack: Pack) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (walletBalance < pack.price) {
      onOpenWallet();
      return;
    }

    setIsPurchasing(true);

    try {
      // 1. Draw cards based on pack odds and decided editions
      const odds = pack.rarityOdds || { base: 60, silver: 28, gold: 10, shield: 2 };
      const drawn = drawRandomCards(cards, pack.size, odds, pack.editions);

      if (drawn.length === 0) {
        alert("No cards available in the pool right now for this pack's editions.");
        setIsPurchasing(false);
        return;
      }

      // 2. Deduct funds from user wallet in Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        walletBalance: increment(-pack.price)
      }, { merge: true });

      // 3. Decrement stock for each drawn card in Firestore
      for (const card of drawn) {
        const cardRef = doc(db, 'cards', card.id);
        const curStock = getDefaultStock(card);
        await setDoc(cardRef, {
          stock: Math.max(0, curStock - 1)
        }, { merge: true }).catch(() => {});
      }

      // 4. Log transaction
      const txRef = collection(db, 'transactions');
      await addDoc(txRef, {
        userId: user.uid,
        userEmail: user.email,
        type: 'buy_pack',
        amount: pack.price,
        packId: pack.id,
        packName: pack.name,
        cardIds: drawn.map(c => c.id),
        description: `Bought & Opened ${pack.name} (${pack.size} Cards)`,
        timestamp: Date.now()
      });

      // 5. Notify parent app about newly drawn cards
      onCardsDrawn(drawn);

      // 6. Open reveal modal
      setSelectedPackForOpening(pack);
      setDrawnCards(drawn);
      setIsOpeningPack(true);
      setIsPurchasing(false);
    } catch (error) {
      console.error("Pack purchase failed:", error);
      alert("Failed to purchase pack. Please check your connection.");
      setIsPurchasing(false);
    }
  };

  const handlePhysicalOrder = (pack: Pack) => {
    window.open("https://primestock-nu.vercel.app/brand/LpPWLHDoAbhRcgREFFpwgOizU8B3", "_blank");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6">
      {/* Shop Header & Mode Switcher */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-neutral-100 p-1.5 border-2 border-black">
          <button
            onClick={() => setShopMode('digital')}
            className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
              shopMode === 'digital'
                ? 'bg-black text-[#D4FF00] shadow-[2px_2px_0px_0px_#D4FF00]'
                : 'text-black hover:bg-neutral-200'
            }`}
          >
            ⚡ DIGITAL PACKS (INSTANT OPEN)
          </button>
          <button
            onClick={() => setShopMode('physical')}
            className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
              shopMode === 'physical'
                ? 'bg-black text-[#D4FF00] shadow-[2px_2px_0px_0px_#D4FF00]'
                : 'text-black hover:bg-neutral-200'
            }`}
          >
            📦 PHYSICAL PACKS (DOOR DELIVERY)
          </button>
        </div>

        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
          {shopMode === 'digital' ? 'ONLINE PACK STORE' : 'PHYSICAL PACK STORE'}
        </h2>
        <p className="text-neutral-500 font-black uppercase tracking-widest text-xs max-w-xl mx-auto">
          {shopMode === 'digital'
            ? 'Buy digital packs with your ArtCard Wallet balance and pull random authenticated cards instantly into your vault.'
            : 'Order sealed hobby boxes and blister packs shipped directly to your mailing address.'}
        </p>

        {/* User Balance Strip */}
        <div className="inline-flex items-center gap-3 bg-white border-2 border-black px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 text-xs font-black uppercase">
            <Wallet size={16} className="text-neutral-600" />
            <span className="text-neutral-500">YOUR WALLET:</span>
            <span className="text-black bg-[#D4FF00] px-2 py-0.5 border border-black">
              {formatCurrency(walletBalance)}
            </span>
          </div>
          <button
            onClick={onOpenWallet}
            className="flex items-center gap-1 bg-black text-[#D4FF00] hover:bg-neutral-800 text-[10px] font-black uppercase tracking-wider px-3 py-1 border border-black transition-colors"
          >
            <Plus size={12} strokeWidth={3} /> LOAD MONEY
          </button>
        </div>
      </div>

      {/* Packs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {displayPacks.map((pack) => {
          const odds = pack.rarityOdds || (pack.id === 'starter' 
            ? { base: 80, silver: 18, gold: 2, shield: 0 }
            : pack.id === 'pro'
            ? { base: 60, silver: 30, gold: 9, shield: 1 }
            : { base: 40, silver: 40, gold: 17, shield: 3 });

          const canAfford = walletBalance >= pack.price;

          return (
            <div
              key={pack.id}
              className={`${pack.color || 'bg-white'} border-4 border-black p-6 sm:p-8 flex flex-col justify-between shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_#D4FF00] transition-all relative group`}
            >
              {/* Header Badge */}
              <div className="flex items-center justify-between w-full mb-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-black text-white border border-white/20">
                    {pack.size} CARDS
                  </span>
                  {pack.badgeText && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-[#D4FF00] text-black border border-black animate-pulse">
                      {pack.badgeText}
                    </span>
                  )}
                </div>
                <span className="text-xl font-black tracking-tight">
                  {formatCurrency(pack.price)}
                </span>
              </div>

              {/* Cover Photo / Poster Graphic */}
              <div className="w-full flex justify-center mb-5">
                {pack.coverPhotoUrl ? (
                  <div className="relative group-hover:scale-105 transition-transform">
                    <img
                      src={pack.coverPhotoUrl}
                      alt={pack.name}
                      className="w-48 aspect-[750/1050] object-cover border-3 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                    />
                    {pack.editions && pack.editions.length > 0 && (
                      <div className="absolute bottom-2 left-2 right-2 bg-black/90 text-[#D4FF00] text-[8px] font-black uppercase tracking-wider py-1 px-1.5 text-center border border-[#D4FF00]/40 backdrop-blur-sm truncate">
                        {pack.editions.join(' • ')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-48 aspect-[750/1050] bg-neutral-100 border-3 border-black flex flex-col items-center justify-center group-hover:scale-105 transition-transform relative shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <PackageOpen
                      size={54}
                      className={pack.color?.includes('bg-black') ? 'text-[#D4FF00]' : 'text-black'}
                    />
                    {pack.editions && pack.editions.length > 0 && (
                      <div className="absolute bottom-2 left-2 right-2 bg-black text-[#D4FF00] text-[8px] font-black uppercase tracking-wider py-1 px-1.5 text-center border border-black truncate">
                        {pack.editions.join(' • ')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pack Details */}
              <div className="space-y-3 text-center">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">{pack.name}</h3>
                  <p className="text-xs font-bold opacity-80 mt-1">
                    {pack.description || `Contains ${pack.size} guaranteed cards with randomized rarity distribution.`}
                  </p>
                </div>

                {/* Editions Badge Pill */}
                <div className="bg-black/10 border border-black py-1.5 px-2 text-[9px] font-black uppercase flex items-center justify-between">
                  <span className="opacity-70">EDITIONS POOL:</span>
                  <span className="font-mono text-black font-black">
                    {pack.editions && pack.editions.length > 0 ? pack.editions.join(', ') : 'ALL DATABASE EDITIONS'}
                  </span>
                </div>

                {/* Drop Rates Pill Matrix */}
                {shopMode === 'digital' && (
                  <div className="bg-black/10 border border-black p-3 space-y-1.5 text-left text-[10px] font-black uppercase">
                    <div className="flex items-center justify-between text-neutral-600">
                      <span>RARITY ODDS:</span>
                      <span className="text-[9px] font-normal lowercase opacity-70">weighted drop</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <div className="flex justify-between bg-white/80 p-1 border border-black/20">
                        <span className="text-neutral-700">BASE:</span>
                        <span className="font-mono">{odds.base}%</span>
                      </div>
                      <div className="flex justify-between bg-slate-100 p-1 border border-black/20 text-slate-900">
                        <span>SILVER:</span>
                        <span className="font-mono">{odds.silver}%</span>
                      </div>
                      <div className="flex justify-between bg-amber-100 p-1 border border-black/20 text-amber-900">
                        <span>GOLD:</span>
                        <span className="font-mono">{odds.gold}%</span>
                      </div>
                      <div className="flex justify-between bg-black text-[#D4FF00] p-1 border border-black">
                        <span>1-OF-1:</span>
                        <span className="font-mono">{odds.shield}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-6 mt-auto">
                {shopMode === 'digital' ? (
                  <button
                    onClick={() => handleBuyDigitalPack(pack)}
                    disabled={isPurchasing}
                    className={`w-full py-4 font-black uppercase tracking-widest border-2 border-black transition-all text-sm flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                      !user
                        ? 'bg-black text-[#D4FF00] hover:bg-neutral-800'
                        : canAfford
                        ? 'bg-[#D4FF00] text-black hover:bg-black hover:text-[#D4FF00]'
                        : 'bg-neutral-200 text-neutral-700 hover:bg-[#D4FF00] hover:text-black'
                    }`}
                  >
                    {!user ? (
                      'SIGN IN TO BUY'
                    ) : canAfford ? (
                      <>
                        <Sparkles size={18} />
                        BUY & OPEN ({formatCurrency(pack.price)})
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        TOP UP & BUY ({formatCurrency(pack.price)})
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handlePhysicalOrder(pack)}
                    className="w-full py-4 bg-black text-white hover:bg-[#D4FF00] hover:text-black font-black uppercase tracking-widest border-2 border-black transition-colors text-sm flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <Truck size={18} />
                    ORDER PHYSICAL PACK
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Digital Pack Opening Modal Sequence */}
      {selectedPackForOpening && (
        <PackOpeningModal
          pack={selectedPackForOpening}
          drawnCards={drawnCards}
          isOpen={isOpeningPack}
          onClose={() => {
            setIsOpeningPack(false);
            setSelectedPackForOpening(null);
          }}
          onOpenAnother={() => {
            handleBuyDigitalPack(selectedPackForOpening);
          }}
          walletBalance={walletBalance}
        />
      )}
    </div>
  );
}
