import React, { useState, useEffect } from 'react';
import { User, db, collection, doc, updateDoc, onSnapshot, query, where } from '../lib/firebase';
import { CardGift, FootballCard } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  Gift, 
  X, 
  Sparkles, 
  Inbox, 
  Send, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  User as UserIcon, 
  PackageOpen, 
  Award,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { packAudio } from '../lib/packAudio';

interface GiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onOpenSendGift: () => void;
  onSelectCard?: (card: FootballCard) => void;
}

export function GiftsModal({
  isOpen,
  onClose,
  currentUser,
  onOpenSendGift,
  onSelectCard
}: GiftsModalProps) {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [receivedGifts, setReceivedGifts] = useState<CardGift[]>([]);
  const [sentGifts, setSentGifts] = useState<CardGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [unwrappingGift, setUnwrappingGift] = useState<CardGift | null>(null);
  const [unwrappingStage, setUnwrappingStage] = useState<'closed' | 'opening' | 'revealed'>('closed');

  // Listen to gifts from Firestore
  useEffect(() => {
    if (!isOpen || !currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const giftsRef = collection(db, 'gifts');

    const unsubscribe = onSnapshot(giftsRef, (snapshot) => {
      const received: CardGift[] = [];
      const sent: CardGift[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const giftItem: CardGift = {
          id: docSnap.id,
          senderUid: data.senderUid,
          senderName: data.senderName || 'Collector',
          senderEmail: data.senderEmail,
          senderAvatar: data.senderAvatar,
          recipientUid: data.recipientUid,
          recipientName: data.recipientName || 'Collector',
          recipientEmail: data.recipientEmail,
          cardId: data.cardId,
          card: data.card,
          giftNote: data.giftNote,
          wrapStyle: data.wrapStyle || 'gold',
          opened: !!data.opened,
          createdAt: data.createdAt || Date.now(),
          openedAt: data.openedAt
        };

        if (giftItem.recipientUid === currentUser.uid) {
          received.push(giftItem);
        }
        if (giftItem.senderUid === currentUser.uid) {
          sent.push(giftItem);
        }
      });

      // Sort newest first
      received.sort((a, b) => b.createdAt - a.createdAt);
      sent.sort((a, b) => b.createdAt - a.createdAt);

      setReceivedGifts(received);
      setSentGifts(sent);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching gifts:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const unopenedCount = receivedGifts.filter(g => !g.opened).length;

  const handleStartUnwrap = (gift: CardGift) => {
    setUnwrappingGift(gift);
    setUnwrappingStage('closed');
  };

  const handleOpenGiftBox = async () => {
    if (!unwrappingGift) return;
    setUnwrappingStage('opening');
    packAudio.playRipStrip();

    setTimeout(() => {
      packAudio.playGoldFanfare();
      setUnwrappingStage('revealed');
    }, 700);

    // Mark opened in Firestore
    try {
      const giftDocRef = doc(db, 'gifts', unwrappingGift.id);
      await updateDoc(giftDocRef, {
        opened: true,
        openedAt: Date.now()
      });
    } catch (err) {
      console.error("Error updating gift status:", err);
    }
  };

  const handleCloseUnwrap = () => {
    setUnwrappingGift(null);
    setUnwrappingStage('closed');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-3xl bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] my-auto relative max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-[#D4FF00] border-b-4 border-black p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-black text-[#D4FF00] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Gift size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-black">
                  GIFTS INBOX & TRANSFERS
                </h2>
                {unopenedCount > 0 && (
                  <span className="bg-black text-[#D4FF00] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest border border-black animate-pulse">
                    {unopenedCount} UNOPENED
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs font-bold text-neutral-800 uppercase tracking-widest">
                Peer-to-peer card gifts sent and received between collectors
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenSendGift();
              }}
              className="hidden sm:flex items-center gap-1.5 py-1.5 px-3 bg-black hover:bg-neutral-800 text-[#D4FF00] border-2 border-black font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_#D4FF00]"
            >
              <Send size={13} />
              SEND GIFT
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-white hover:bg-black hover:text-[#D4FF00] border-2 border-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b-2 border-black bg-neutral-100 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('received')}
            className={cn(
              "px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-b-0 border-black flex items-center gap-2 transition-all",
              activeTab === 'received' 
                ? "bg-white text-black shadow-[2px_-2px_0px_0px_rgba(0,0,0,1)]" 
                : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
            )}
          >
            <Inbox size={14} />
            RECEIVED GIFTS ({receivedGifts.length})
            {unopenedCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('sent')}
            className={cn(
              "px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-b-0 border-black flex items-center gap-2 transition-all",
              activeTab === 'sent' 
                ? "bg-white text-black shadow-[2px_-2px_0px_0px_rgba(0,0,0,1)]" 
                : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
            )}
          >
            <Send size={14} />
            SENT GIFTS ({sentGifts.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-black">
          {loading ? (
            <div className="text-center py-16 space-y-2">
              <Sparkles size={28} className="mx-auto text-neutral-400 animate-spin" />
              <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Loading your gifts...</p>
            </div>
          ) : activeTab === 'received' ? (
            receivedGifts.length > 0 ? (
              <div className="space-y-3">
                {receivedGifts.map((gift) => (
                  <div
                    key={gift.id}
                    className={cn(
                      "p-4 border-2 border-black flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all",
                      !gift.opened 
                        ? "bg-[#D4FF00]/15 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" 
                        : "bg-white hover:bg-neutral-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    )}
                  >
                    <div className="flex items-center gap-3.5 flex-1">
                      {/* Visual Gift Icon or Card Thumbnail */}
                      {!gift.opened ? (
                        <div className="w-14 h-18 sm:w-16 sm:h-20 bg-black text-[#D4FF00] border-2 border-black flex flex-col items-center justify-center p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 animate-bounce">
                          <Gift size={24} />
                          <span className="text-[8px] font-black uppercase tracking-widest mt-1">GIFT BOX</span>
                        </div>
                      ) : (
                        <div className="w-14 h-18 sm:w-16 sm:h-20 aspect-[750/1050] bg-black border-2 border-black overflow-hidden shrink-0 relative shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          {gift.card?.imageUrl ? (
                            <img src={gift.card.imageUrl} alt={gift.card.player} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-white font-black p-1 text-center">
                              {gift.card?.player || 'Card'}
                            </div>
                          )}
                          <div className="absolute top-0.5 right-0.5 bg-[#D4FF00] text-black text-[7px] font-black px-1 border border-black">
                            IN VAULT
                          </div>
                        </div>
                      )}

                      {/* Gift Info */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-black uppercase text-black">
                            FROM: <strong>{gift.senderName}</strong>
                          </span>
                          {!gift.opened ? (
                            <span className="bg-red-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 border border-black">
                              UNOPENED
                            </span>
                          ) : (
                            <span className="bg-emerald-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 border border-black flex items-center gap-1">
                              <CheckCircle2 size={10} /> CLAIMED
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm sm:text-base font-black uppercase tracking-tight text-black">
                          {gift.card?.player || 'Mystery Card'}
                        </h4>

                        {gift.giftNote && (
                          <div className="text-xs italic text-neutral-700 bg-neutral-100 p-2 border border-neutral-300 rounded-none max-w-lg">
                            "{gift.giftNote}"
                          </div>
                        )}

                        <div className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-2">
                          <span>{new Date(gift.createdAt).toLocaleDateString()}</span>
                          {gift.card?.rarity && <span>• {gift.card.rarity}</span>}
                          {gift.card?.currentPrice && (
                            <span>• Valued at {formatCurrency(gift.card.currentPrice, true)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0 w-full sm:w-auto">
                      {!gift.opened ? (
                        <button
                          onClick={() => handleStartUnwrap(gift)}
                          className="w-full sm:w-auto py-2.5 px-4 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1.5"
                        >
                          <PackageOpen size={15} />
                          UNWRAP GIFT BOX
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (gift.card && onSelectCard) {
                              onClose();
                              onSelectCard(gift.card as FootballCard);
                            }
                          }}
                          className="w-full sm:w-auto py-2 px-3 bg-white hover:bg-black hover:text-white text-black border-2 border-black font-black text-[11px] uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1"
                        >
                          VIEW IN VAULT
                          <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-neutral-100 border-2 border-black flex items-center justify-center text-neutral-400">
                  <Inbox size={32} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-black">NO GIFTS RECEIVED YET</h3>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider max-w-sm mx-auto mt-1">
                    When other collectors gift you cards from their vault, they will appear here ready to unwrap!
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenSendGift();
                  }}
                  className="bg-[#D4FF00] text-black border-2 border-black px-5 py-2.5 font-black text-xs uppercase tracking-widest hover:bg-black hover:text-[#D4FF00] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                >
                  SEND A GIFT TO A FRIEND
                </button>
              </div>
            )
          ) : (
            /* Sent Tab */
            sentGifts.length > 0 ? (
              <div className="space-y-3">
                {sentGifts.map((gift) => (
                  <div
                    key={gift.id}
                    className="p-4 bg-white border-2 border-black flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-18 sm:w-16 sm:h-20 aspect-[750/1050] bg-black border-2 border-black overflow-hidden shrink-0 relative shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        {gift.card?.imageUrl ? (
                          <img src={gift.card.imageUrl} alt={gift.card.player} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-white font-black p-1 text-center">
                            {gift.card?.player || 'Card'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black uppercase text-black">
                            GIFTED TO: <strong>{gift.recipientName}</strong>
                          </span>
                          {gift.opened ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase px-1.5 py-0.5 border border-emerald-400">
                              OPENED BY RECIPIENT
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase px-1.5 py-0.5 border border-amber-400">
                              DELIVERED (PENDING OPEN)
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm sm:text-base font-black uppercase tracking-tight text-black">
                          {gift.card?.player}
                        </h4>

                        {gift.giftNote && (
                          <div className="text-xs italic text-neutral-600">
                            "{gift.giftNote}"
                          </div>
                        )}

                        <div className="text-[10px] font-bold text-neutral-500 uppercase">
                          Sent on {new Date(gift.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="text-xs font-black uppercase bg-neutral-100 border border-black px-2 py-1">
                        STYLE: {gift.wrapStyle.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-neutral-100 border-2 border-black flex items-center justify-center text-neutral-400">
                  <Send size={32} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-black">YOU HAVEN'T SENT ANY GIFTS YET</h3>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider max-w-sm mx-auto mt-1">
                    Send cards from your vault to fellow community collectors to build trades and friendships!
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenSendGift();
                  }}
                  className="bg-[#D4FF00] text-black border-2 border-black px-5 py-2.5 font-black text-xs uppercase tracking-widest hover:bg-black hover:text-[#D4FF00] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                >
                  GIFT A CARD NOW
                </button>
              </div>
            )
          )}
        </div>
      </motion.div>

      {/* ========================================================================= */}
      {/* INTERACTIVE UNWRAPPING CEREMONY OVERLAY                                   */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {unwrappingGift && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full max-w-md bg-white border-4 border-black shadow-[12px_12px_0px_0px_#D4FF00] p-6 text-center space-y-6 relative text-black"
            >
              {unwrappingStage === 'closed' ? (
                <>
                  <div className="space-y-1">
                    <span className="bg-[#D4FF00] text-black px-3 py-1 text-xs font-black uppercase tracking-widest border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      INCOMING CARD GIFT
                    </span>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-black pt-2">
                      GIFT FROM {unwrappingGift.senderName}
                    </h3>
                    <p className="text-xs font-bold text-neutral-600 uppercase">
                      Tap the wrapped gift box below to break the seal and claim your card!
                    </p>
                  </div>

                  {/* 3D Animated Gift Box */}
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleOpenGiftBox}
                    className="cursor-pointer relative w-44 h-44 mx-auto my-4 flex items-center justify-center bg-gradient-to-br from-amber-300 via-amber-200 to-amber-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                  >
                    {/* Ribbon Cross */}
                    <div className="absolute inset-y-0 w-8 bg-black" />
                    <div className="absolute inset-x-0 h-8 bg-black" />
                    {/* Bow Center */}
                    <div className="absolute z-10 w-14 h-14 bg-[#D4FF00] border-2 border-black rotate-45 flex items-center justify-center shadow-lg">
                      <Gift size={24} className="text-black -rotate-45" />
                    </div>
                  </motion.div>

                  <button
                    onClick={handleOpenGiftBox}
                    className="w-full py-3.5 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    UNWRAP & OPEN BOX NOW
                  </button>
                </>
              ) : unwrappingStage === 'opening' ? (
                <div className="py-12 space-y-4">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.2, 1.3] }}
                    transition={{ duration: 0.6 }}
                    className="w-32 h-32 mx-auto bg-[#D4FF00] border-4 border-black flex items-center justify-center"
                  >
                    <Sparkles size={48} className="text-black animate-spin" />
                  </motion.div>
                  <h3 className="text-xl font-black uppercase text-black animate-pulse">
                    UNWRAPPING GIFT BOX...
                  </h3>
                </div>
              ) : (
                /* Revealed Card State */
                <>
                  <motion.div
                    initial={{ scale: 0.5, y: 30, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ type: 'spring', damping: 14 }}
                    className="space-y-4"
                  >
                    <span className="bg-black text-[#D4FF00] px-3 py-1 text-xs font-black uppercase tracking-widest border border-black">
                      🎉 NEW CARD ADDED TO YOUR VAULT!
                    </span>

                    {/* Card Presentation */}
                    <div className="w-48 aspect-[750/1050] mx-auto bg-black border-4 border-black shadow-[8px_8px_0px_0px_#D4FF00] overflow-hidden relative">
                      {unwrappingGift.card?.imageUrl ? (
                        <img 
                          src={unwrappingGift.card.imageUrl} 
                          alt={unwrappingGift.card.player} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-black">
                          {unwrappingGift.card?.player}
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-[#D4FF00] text-black text-[9px] font-black px-1.5 py-0.5 border border-black uppercase">
                        {unwrappingGift.card?.rarity}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-black uppercase text-black tracking-tight">
                        {unwrappingGift.card?.player}
                      </h3>
                      <p className="text-xs font-bold text-neutral-600 uppercase">
                        {unwrappingGift.card?.team} • {unwrappingGift.card?.edition}
                      </p>
                    </div>

                    {unwrappingGift.giftNote && (
                      <div className="bg-neutral-100 border-2 border-black p-3 text-xs italic font-bold text-neutral-800">
                        "{unwrappingGift.giftNote}"
                        <div className="text-[9px] font-black uppercase not-italic text-neutral-500 mt-1">
                          — {unwrappingGift.senderName}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleCloseUnwrap}
                      className="w-full py-3.5 bg-black hover:bg-neutral-800 text-[#D4FF00] border-2 border-black font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_0px_#D4FF00]"
                    >
                      COLLECT & VIEW IN VAULT
                    </button>
                  </motion.div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
