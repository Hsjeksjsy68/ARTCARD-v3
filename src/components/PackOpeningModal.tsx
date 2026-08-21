import React, { useState } from 'react';
import { FootballCard, Pack } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Sparkles, Shield, Star, Check, ArrowRight, RotateCcw, PackageOpen, Award, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PackOpeningModalProps {
  pack: Pack;
  drawnCards: FootballCard[];
  isOpen: boolean;
  onClose: () => void;
  onOpenAnother?: () => void;
  walletBalance: number;
}

export function PackOpeningModal({
  pack,
  drawnCards,
  isOpen,
  onClose,
  onOpenAnother,
  walletBalance
}: PackOpeningModalProps) {
  const [packRipped, setPackRipped] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [allRevealed, setAllRevealed] = useState(false);

  if (!isOpen) return null;

  const handleRipPack = () => {
    setPackRipped(true);
  };

  const handleRevealCard = (index: number) => {
    setRevealedIndices(prev => {
      const next = new Set(prev);
      next.add(index);
      if (next.size === drawnCards.length) {
        setAllRevealed(true);
      }
      return next;
    });
  };

  const handleRevealAll = () => {
    const all = new Set(drawnCards.map((_, i) => i));
    setRevealedIndices(all);
    setAllRevealed(true);
  };

  const highestRarityCard = [...drawnCards].sort((a, b) => {
    const rank = { '1-of-1 Shield': 4, 'Gold Autograph': 3, 'Silver Refractor': 2, 'Base': 1 };
    return rank[b.rarity] - rank[a.rarity];
  })[0];

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-md">
      <div className="w-full max-w-5xl my-auto space-y-6 text-center">
        {!packRipped ? (
          /* Pack Sealed State */
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center space-y-8 py-8"
          >
            <div className="space-y-2">
              <span className="bg-[#D4FF00] text-black px-4 py-1 text-xs font-black uppercase tracking-widest border-2 border-black inline-block shadow-[3px_3px_0px_0px_rgba(255,255,255,0.4)]">
                DIGITAL REVEAL CHAMBER
              </span>
              <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter text-white">
                {pack.name}
              </h2>
              <p className="text-neutral-400 font-black uppercase tracking-widest text-xs">
                CONTAINS {pack.size} GUARANTEED DIGITAL COLLECTIBLE CARDS
              </p>
            </div>

            {/* Foil Pack 3D Container */}
            <motion.div
              whileHover={{ scale: 1.05, rotate: [-1, 1, -1] }}
              onClick={handleRipPack}
              className={`w-64 sm:w-72 aspect-[750/1100] ${pack.color || 'bg-[#D4FF00]'} border-4 border-black p-6 flex flex-col justify-between items-center text-center cursor-pointer relative shadow-[16px_16px_0px_0px_#D4FF00] group overflow-hidden`}
            >
              {/* Foil Shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform pointer-events-none" />
              
              <div className="text-center w-full z-10">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-70">ARTCARD SERIES 2024</span>
                  {pack.badgeText && (
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.2 bg-[#D4FF00] text-black border border-black animate-pulse">
                      {pack.badgeText}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight mt-1">{pack.name}</h3>
                {pack.editions && pack.editions.length > 0 && (
                  <span className="inline-block text-[8px] font-black uppercase bg-black text-[#D4FF00] px-2 py-0.5 border border-[#D4FF00]/40 mt-1">
                    {pack.editions.join(' • ')}
                  </span>
                )}
              </div>

              {pack.coverPhotoUrl ? (
                <img src={pack.coverPhotoUrl} alt={pack.name} className="w-40 aspect-[750/1050] object-cover border-2 border-black z-10" />
              ) : (
                <div className="w-32 h-32 bg-black/10 border-2 border-black flex items-center justify-center z-10">
                  <PackageOpen size={64} className={pack.color?.includes('bg-black') ? 'text-[#D4FF00]' : 'text-black'} />
                </div>
              )}

              <div className="w-full z-10">
                <div className="bg-black text-[#D4FF00] py-2 px-4 text-xs font-black uppercase tracking-widest border border-white/20 animate-pulse">
                  CLICK TO RIP PACK
                </div>
              </div>
            </motion.div>

            <button
              onClick={handleRipPack}
              className="bg-[#D4FF00] text-black hover:bg-white px-10 py-5 border-4 border-black font-black uppercase tracking-widest text-lg transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:translate-x-1 hover:translate-y-1"
            >
              RIP OPEN PACK NOW
            </button>
          </motion.div>
        ) : (
          /* Cards Revealed Grid */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="text-[#D4FF00]" size={20} />
                <span className="text-xs font-black uppercase tracking-widest text-[#D4FF00]">
                  PACK PULLED ({revealedIndices.size}/{drawnCards.length} REVEALED)
                </span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter text-white">
                YOUR NEW CARDS
              </h2>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[60vh] overflow-y-auto p-2">
              {drawnCards.map((card, idx) => {
                const isRevealed = revealedIndices.has(idx);
                const isShield = card.rarity === '1-of-1 Shield';
                const isGold = card.rarity === 'Gold Autograph';
                const isSilver = card.rarity === 'Silver Refractor';

                return (
                  <motion.div
                    key={card.id + idx}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => handleRevealCard(idx)}
                    className="cursor-pointer"
                  >
                    <div className={cn(
                      "relative aspect-[750/1050] border-3 transition-all duration-500 overflow-hidden",
                      isRevealed 
                        ? (isShield ? "border-[#D4FF00] shadow-[0_0_20px_#D4FF00]" : isGold ? "border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]" : "border-black shadow-[4px_4px_0px_0px_rgba(255,255,255,0.4)]")
                        : "border-neutral-700 bg-neutral-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:border-[#D4FF00]"
                    )}>
                      {isRevealed ? (
                        /* Card Front */
                        <div className="w-full h-full bg-white relative flex flex-col">
                          {card.imageUrl ? (
                            <img src={card.imageUrl} alt={card.player} className="w-full h-full object-cover" />
                          ) : (
                            <div className="h-full flex flex-col justify-between p-3 bg-neutral-900 text-white relative">
                              <div className={cn("absolute inset-0 opacity-40 bg-gradient-to-tr", card.imageGradient)} />
                              <div className="relative z-10 text-left">
                                <span className="text-[9px] font-black uppercase text-[#D4FF00]">{card.team}</span>
                                <h4 className="text-sm font-black uppercase tracking-tight">{card.player}</h4>
                              </div>
                              <div className="relative z-10 text-[8px] font-black uppercase text-neutral-400">
                                {card.year} • {card.set}
                              </div>
                            </div>
                          )}

                          {/* Rarity Corner Pill */}
                          <div className="absolute top-1.5 left-1.5 z-20">
                            <span className={cn(
                              "px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest border border-black",
                              card.rarity === 'Base' && "bg-white text-black",
                              card.rarity === 'Silver Refractor' && "bg-slate-200 text-black",
                              card.rarity === 'Gold Autograph' && "bg-amber-300 text-black",
                              card.rarity === '1-of-1 Shield' && "bg-black text-[#D4FF00] border-[#D4FF00]"
                            )}>
                              {card.rarity}
                            </span>
                          </div>

                          {/* Price Tag */}
                          <div className="absolute bottom-1.5 right-1.5 z-20 bg-black text-[#D4FF00] px-2 py-0.5 text-[9px] font-black border border-white/20">
                            {formatCurrency(card.currentPrice)}
                          </div>
                        </div>
                      ) : (
                        /* Card Back (Foil Hidden State) */
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-neutral-800 to-neutral-950 text-white relative">
                          <div className="w-12 h-12 rounded-full border-2 border-[#D4FF00] flex items-center justify-center mb-2 animate-bounce">
                            <Sparkles size={20} className="text-[#D4FF00]" />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">
                            CLICK TO FLIP
                          </span>
                        </div>
                      )}
                    </div>

                    {isRevealed && (
                      <div className="mt-1 text-left px-1">
                        <p className="text-xs font-black text-white uppercase truncate">{card.player}</p>
                        <p className="text-[9px] font-bold text-neutral-400 uppercase truncate">{card.team} • {formatCurrency(card.currentPrice)}</p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-neutral-800">
              {!allRevealed && (
                <button
                  onClick={handleRevealAll}
                  className="bg-white hover:bg-neutral-200 text-black px-6 py-3 font-black uppercase tracking-widest text-xs border-2 border-black transition-colors"
                >
                  REVEAL ALL ({drawnCards.length - revealedIndices.size} REMAINING)
                </button>
              )}

              <button
                onClick={onClose}
                className="bg-[#D4FF00] text-black hover:bg-white px-8 py-3.5 font-black uppercase tracking-widest text-sm border-2 border-black transition-all shadow-[4px_4px_0px_0px_rgba(255,255,255,0.8)]"
              >
                COLLECT ALL TO VAULT & CLOSE
              </button>

              {onOpenAnother && (
                <button
                  onClick={onOpenAnother}
                  disabled={walletBalance < pack.price}
                  className={`px-6 py-3.5 font-black uppercase tracking-widest text-xs border-2 border-black transition-all ${
                    walletBalance >= pack.price
                      ? 'bg-black text-[#D4FF00] hover:bg-neutral-900 border-[#D4FF00]'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border-neutral-700'
                  }`}
                >
                  {walletBalance >= pack.price ? `OPEN ANOTHER (${formatCurrency(pack.price)})` : 'INSUFFICIENT BALANCE'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
