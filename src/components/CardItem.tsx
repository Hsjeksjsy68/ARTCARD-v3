import React from 'react';
import { FootballCard } from '../types';
import { cn, formatCurrency, getDefaultStock, getDefaultMaxSupply } from '../lib/utils';
import { motion } from 'motion/react';
import { Shield, Sparkles, Star, Heart, Trophy, AlertCircle } from 'lucide-react';

interface CardItemProps {
  card: FootballCard;
  inCollection?: boolean;
  inVault?: boolean;
  isFavorite?: boolean;
  ownedCount?: number;
  copyNumber?: number;
  totalCopies?: number;
  onToggleFavorite?: (e: React.MouseEvent, cardId: string) => void;
  onClick: (card: FootballCard) => void;
  key?: React.Key;
}

export function CardItem({ 
  card, 
  inCollection, 
  inVault, 
  isFavorite, 
  ownedCount,
  copyNumber,
  totalCopies,
  onToggleFavorite, 
  onClick 
}: CardItemProps) {
  const isHolo = card.rarity !== 'Base';
  const stock = getDefaultStock(card);
  const maxSupply = getDefaultMaxSupply(card);
  const isSoldOut = stock <= 0;
  const isOwnedInVault = inVault ?? inCollection ?? (ownedCount !== undefined && ownedCount > 0);
  
  // Format vault badge label (e.g. "VAULT", "VAULT (x3)", or "COPY #2/3")
  let vaultBadgeLabel = "VAULT";
  if (copyNumber && totalCopies && totalCopies > 1) {
    vaultBadgeLabel = `COPY #${copyNumber}/${totalCopies}`;
  } else if (ownedCount && ownedCount > 1) {
    vaultBadgeLabel = `VAULT (x${ownedCount})`;
  }
  
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => onClick(card)}
      className="group cursor-pointer relative"
    >
      {/* Card Body */}
      <div className={cn(
        "relative aspect-[750/1050] bg-white rounded-none border-2 border-black overflow-hidden flex flex-col transition-colors group-hover:border-[#D4FF00]",
        isSoldOut && "opacity-85 grayscale-[30%]"
      )}>
        
        {/* Holographic Overlay Effect */}
        {isHolo && !isSoldOut && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[linear-gradient(105deg,transparent_20%,rgba(212,255,0,0.1)_25%,transparent_30%)] transition-opacity duration-700 ease-out z-20 pointer-events-none" />
        )}

        {/* Top Right Action & Badges: Vault Owned Badge & Interactive Favorite Heart */}
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-30 flex items-center gap-1.5">
          {/* Vault Owned Indicator */}
          {isOwnedInVault && (
            <div 
              title={`Owned in your Vault (${vaultBadgeLabel})`}
              className="bg-black text-[#D4FF00] border-2 border-black px-1.5 py-0.5 sm:px-2 sm:py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1"
            >
              <Trophy size={10} className="sm:w-3 sm:h-3 text-[#D4FF00]" />
              <span>{vaultBadgeLabel}</span>
            </div>
          )}

          {/* Interactive Favorite Wishlist Button */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(e, card.id);
              }}
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              className={cn(
                "p-1 sm:p-1.5 border-2 border-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-110 active:scale-95",
                isFavorite 
                  ? "bg-white text-red-600 hover:bg-neutral-100" 
                  : "bg-white/90 hover:bg-white text-neutral-400 hover:text-red-500 opacity-80 group-hover:opacity-100"
              )}
            >
              <Heart 
                size={13} 
                className={cn(
                  "sm:w-3.5 sm:h-3.5 transition-colors",
                  isFavorite ? "fill-red-500 text-red-500" : "fill-transparent"
                )} 
              />
            </button>
          )}
        </div>

        {/* Stock / Limited Edition Badge */}
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-30 flex flex-col gap-1">
          {isSoldOut ? (
            <div className="bg-red-600 text-white border border-black px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              SOLD OUT
            </div>
          ) : card.rarity === '1-of-1 Shield' ? (
            <div className="bg-black text-[#D4FF00] border border-[#D4FF00] px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_#D4FF00]">
              1 OF 1 ONLY
            </div>
          ) : (
            <div className={cn(
              "border border-black px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
              stock <= 3 ? "bg-amber-400 text-black animate-pulse" : "bg-white/95 text-black"
            )}>
              {stock} / {maxSupply} LEFT
            </div>
          )}
        </div>

        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.player} className="absolute inset-0 w-full h-full object-cover z-10" />
        ) : (
          <>
            <div className="h-2/3 relative flex items-center justify-center bg-white border-b-2 border-black">
              <div className={cn("absolute inset-0 opacity-20 bg-gradient-to-tr", card.imageGradient)}></div>
              
              <div className="z-10 text-black/50 group-hover:text-black transition-colors drop-shadow-xl">
                 {card.rarity === '1-of-1 Shield' ? <Shield className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20" /> : card.rarity === 'Gold Autograph' ? <Star className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20" /> : <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20" />}
              </div>
              
              <div className={cn(
                  "absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white border-2 rounded-none text-[8px] sm:text-[10px] font-black uppercase tracking-widest",
                  card.rarity === 'Base' && "border-black/50 text-black",
                  card.rarity === 'Silver Refractor' && "border-slate-400 text-slate-600",
                  card.rarity === 'Gold Autograph' && "border-amber-500 text-amber-600",
                  card.rarity === '1-of-1 Shield' && "border-[#D4FF00] text-black bg-black"
                )}>
                  {card.rarity.toUpperCase()}
              </div>
            </div>

            <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-end bg-white relative z-10">
              <div className="text-[8px] sm:text-[10px] text-neutral-500 font-black uppercase tracking-widest truncate">{card.team} • {card.position}</div>
              <div className="text-sm sm:text-lg md:text-xl font-black uppercase text-black truncate">{card.player}</div>
              <div className="text-[8px] sm:text-[9px] text-neutral-500 font-black uppercase mt-0.5 sm:mt-1 tracking-widest truncate">{card.year} {card.set} {card.edition && `• ${card.edition}`}</div>
            </div>
          </>
        )}
      </div>
      
      {/* Price tag below card */}
      <div className="mt-2 sm:mt-4 flex justify-between items-center px-1">
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-neutral-500">{card.cardNumber}</span>
        <span className={cn(
          "text-xs sm:text-sm font-black transition-colors",
          isSoldOut ? "text-neutral-400 line-through" : "text-black group-hover:text-neutral-700"
        )}>
          {formatCurrency(card.currentPrice)}
        </span>
      </div>
    </motion.div>
  );
}

