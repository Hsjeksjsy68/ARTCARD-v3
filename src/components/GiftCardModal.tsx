import React, { useState, useEffect } from 'react';
import { User, db, collection, doc, getDoc, setDoc, onSnapshot, addDoc } from '../lib/firebase';
import { FootballCard, CardGift, GiftWrapStyle } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  Gift, 
  X, 
  Search, 
  Send, 
  Check, 
  Sparkles, 
  User as UserIcon, 
  Trophy, 
  Shield, 
  AlertCircle,
  Package,
  HeartHandshake
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { packAudio } from '../lib/packAudio';

interface GiftCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  cardToGift: FootballCard | null;
  vaultCards: FootballCard[];
  onGiftSuccess: (card: FootballCard, recipientName: string) => void;
}

interface CommunityCollector {
  uid: string;
  displayName: string;
  email?: string;
  customAvatar?: string;
  photoURL?: string;
  favoriteTeam?: string;
  vaultCardsCount?: number;
}

const PRESET_MESSAGES = [
  "🎉 Congratulations on this pull!",
  "⚽ A legendary addition for your dream squad!",
  "🤝 Thank you for being a great collector!",
  "🎁 A special gift from my card vault to yours!",
  "👑 Keep building your ultimate collection!"
];

const WRAP_STYLES: { id: GiftWrapStyle; name: string; bg: string; ribbon: string; border: string; desc: string }[] = [
  {
    id: 'gold',
    name: 'Gold Satin Ribbon',
    bg: 'bg-gradient-to-br from-amber-200 via-amber-100 to-amber-300',
    ribbon: 'bg-amber-500 text-black',
    border: 'border-amber-400',
    desc: 'Luxurious 24K gold foil wrap with polished satin ribbon'
  },
  {
    id: 'neon',
    name: 'Cyber Volt Neon',
    bg: 'bg-gradient-to-br from-[#D4FF00] via-[#b8e600] to-[#88b000]',
    ribbon: 'bg-black text-[#D4FF00]',
    border: 'border-black',
    desc: 'High-voltage electric lime wrap with cyber black banding'
  },
  {
    id: 'velvet',
    name: 'Royal Crimson Velvet',
    bg: 'bg-gradient-to-br from-rose-900 via-red-800 to-rose-950 text-white',
    ribbon: 'bg-amber-400 text-black',
    border: 'border-red-950',
    desc: 'Deep imperial velvet finish with sealed gold emblem'
  },
  {
    id: 'hologram',
    name: 'Prismatic Hologram',
    bg: 'bg-gradient-to-br from-cyan-200 via-purple-200 to-pink-200',
    ribbon: 'bg-purple-600 text-white',
    border: 'border-purple-300',
    desc: 'Iridescent optical diffraction foil with diamond luster'
  }
];

export function GiftCardModal({
  isOpen,
  onClose,
  currentUser,
  cardToGift,
  vaultCards,
  onGiftSuccess
}: GiftCardModalProps) {
  const [selectedCard, setSelectedCard] = useState<FootballCard | null>(cardToGift);
  const [collectors, setCollectors] = useState<CommunityCollector[]>([]);
  const [loadingCollectors, setLoadingCollectors] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<CommunityCollector | null>(null);
  const [customRecipientEmail, setCustomRecipientEmail] = useState('');
  const [wrapStyle, setWrapStyle] = useState<GiftWrapStyle>('gold');
  const [giftNote, setGiftNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [giftSentSuccess, setGiftSentSuccess] = useState(false);

  // Sync selected card when prop changes
  useEffect(() => {
    if (cardToGift) {
      setSelectedCard(cardToGift);
    } else if (vaultCards.length > 0 && !selectedCard) {
      setSelectedCard(vaultCards[0]);
    }
  }, [cardToGift, vaultCards]);

  // Load collectors list from Firestore
  useEffect(() => {
    if (!isOpen) return;
    setLoadingCollectors(true);
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const list: CommunityCollector[] = [];
      snapshot.forEach(docSnap => {
        // Exclude current user from recipient options
        if (currentUser && docSnap.id === currentUser.uid) return;
        const data = docSnap.data();
        const vCount = Array.isArray(data.vaultIds) 
          ? data.vaultIds.length 
          : (Array.isArray(data.collectionIds) ? data.collectionIds.length : 0);

        list.push({
          uid: docSnap.id,
          displayName: data.displayName || data.email?.split('@')[0] || 'Collector',
          email: data.email || '',
          customAvatar: data.customAvatar,
          photoURL: data.photoURL,
          favoriteTeam: data.favoriteTeam,
          vaultCardsCount: vCount
        });
      });
      setCollectors(list);
      setLoadingCollectors(false);
    }, (err) => {
      console.error("Error loading collectors:", err);
      setLoadingCollectors(false);
    });

    return () => unsubscribe();
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Filter collectors based on search
  const filteredCollectors = collectors.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return c.displayName.toLowerCase().includes(q) || (c.email && c.email.toLowerCase().includes(q));
  });

  const handleSelectPresetNote = (msg: string) => {
    setGiftNote(msg);
  };

  const handleSendGift = async () => {
    if (!currentUser) {
      setError("Please sign in to send a gift card.");
      return;
    }

    if (!selectedCard) {
      setError("Please select a card from your vault to gift.");
      return;
    }

    // Determine target recipient
    let targetRecipient = selectedRecipient;
    if (!targetRecipient && customRecipientEmail.trim()) {
      const emailTrimmed = customRecipientEmail.trim().toLowerCase();
      // Look up in collectors
      const found = collectors.find(c => c.email && c.email.toLowerCase() === emailTrimmed);
      if (found) {
        targetRecipient = found;
      } else {
        setError(`Could not find a registered collector with email "${emailTrimmed}". Please pick from active collectors.`);
        return;
      }
    }

    if (!targetRecipient) {
      setError("Please choose or enter a recipient collector.");
      return;
    }

    if (targetRecipient.uid === currentUser.uid) {
      setError("You cannot gift a card to yourself.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Fetch current user document to verify card ownership
      const senderRef = doc(db, 'users', currentUser.uid);
      const senderSnap = await getDoc(senderRef);
      if (!senderSnap.exists()) {
        throw new Error("Could not find your user profile.");
      }

      const senderData = senderSnap.data();
      const senderVault: string[] = Array.isArray(senderData.vaultIds)
        ? [...senderData.vaultIds]
        : (Array.isArray(senderData.collectionIds) ? [...senderData.collectionIds] : []);

      const cardIndex = senderVault.indexOf(selectedCard.id);
      if (cardIndex === -1) {
        throw new Error(`You do not own this card (${selectedCard.player}) in your vault.`);
      }

      // Remove one copy from sender
      senderVault.splice(cardIndex, 1);

      // 2. Fetch recipient document to update their vault
      const recipientRef = doc(db, 'users', targetRecipient.uid);
      const recipientSnap = await getDoc(recipientRef);
      let recipientVault: string[] = [];
      let recipientEmail = targetRecipient.email || '';
      let recipientName = targetRecipient.displayName || 'Collector';

      if (recipientSnap.exists()) {
        const rData = recipientSnap.data();
        recipientVault = Array.isArray(rData.vaultIds)
          ? [...rData.vaultIds]
          : (Array.isArray(rData.collectionIds) ? [...rData.collectionIds] : []);
        recipientEmail = rData.email || recipientEmail;
        recipientName = rData.displayName || recipientName;
      }

      // Add card to recipient vault
      recipientVault.push(selectedCard.id);

      // 3. Atomically update sender and recipient
      await setDoc(senderRef, {
        vaultIds: senderVault,
        collectionIds: senderVault
      }, { merge: true });

      await setDoc(recipientRef, {
        vaultIds: recipientVault,
        collectionIds: recipientVault,
        email: recipientEmail,
        displayName: recipientName
      }, { merge: true });

      // 4. Create Gift Document in 'gifts' collection
      const giftsRef = collection(db, 'gifts');
      const giftDoc = {
        senderUid: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Collector',
        senderEmail: currentUser.email || '',
        recipientUid: targetRecipient.uid,
        recipientName: recipientName,
        recipientEmail: recipientEmail,
        cardId: selectedCard.id,
        card: {
          id: selectedCard.id,
          player: selectedCard.player,
          team: selectedCard.team,
          rarity: selectedCard.rarity,
          edition: selectedCard.edition,
          imageUrl: selectedCard.imageUrl || '',
          currentPrice: selectedCard.currentPrice || 0
        },
        giftNote: giftNote.trim() || 'A special card gift from my collection!',
        wrapStyle,
        opened: false,
        createdAt: Date.now()
      };
      await addDoc(giftsRef, giftDoc);

      // 5. Add transaction audit logs
      const txRef = collection(db, 'transactions');
      await addDoc(txRef, {
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        type: 'gift_sent',
        amount: 0,
        cardId: selectedCard.id,
        description: `Gifted "${selectedCard.player}" to collector ${recipientName}`,
        timestamp: Date.now()
      });

      await addDoc(txRef, {
        userId: targetRecipient.uid,
        userEmail: recipientEmail,
        type: 'gift_received',
        amount: 0,
        cardId: selectedCard.id,
        description: `Received card gift "${selectedCard.player}" from ${currentUser.displayName || currentUser.email}`,
        timestamp: Date.now()
      });

      // Play fanfare audio
      packAudio.playGoldFanfare();
      setGiftSentSuccess(true);
      onGiftSuccess(selectedCard, recipientName);

      // Automatically reset or close after 2.5s
      setTimeout(() => {
        setIsSubmitting(false);
      }, 2000);
    } catch (err: any) {
      console.error("Error sending card gift:", err);
      setError(err.message || "Failed to gift card. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] my-auto relative max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-[#D4FF00] border-b-4 border-black p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-black text-[#D4FF00] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Gift size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                GIFT A CARD TO COLLECTOR
              </h2>
              <p className="text-[10px] sm:text-xs font-bold text-neutral-800 uppercase tracking-widest">
                Transfer card ownership directly with custom gift wrap & personalized note
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-white hover:bg-black hover:text-[#D4FF00] border-2 border-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-black">
          {giftSentSuccess ? (
            <div className="py-10 text-center space-y-5">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12 }}
                className="w-20 h-20 mx-auto bg-[#D4FF00] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black"
              >
                <Gift size={42} />
              </motion.div>
              <div className="space-y-1">
                <span className="bg-black text-[#D4FF00] px-3 py-1 text-xs font-black uppercase tracking-widest border border-black">
                  GIFT DELIVERED
                </span>
                <h3 className="text-2xl font-black uppercase tracking-tight text-black pt-2">
                  CARD SUCCESSFULLY GIFTED!
                </h3>
                <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider max-w-md mx-auto">
                  {selectedCard?.player} has been transferred to {selectedRecipient?.displayName || customRecipientEmail}'s vault! They will be notified in their Gifts Inbox.
                </p>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  onClick={onClose}
                  className="bg-black text-[#D4FF00] border-2 border-black px-6 py-3 font-black text-xs uppercase tracking-widest hover:bg-neutral-800 shadow-[4px_4px_0px_0px_#D4FF00]"
                >
                  RETURN TO VAULT
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Card Selection Overview */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-black">
                  <Package size={14} className="text-black" />
                  1. CARD TO GIFT (FROM YOUR VAULT)
                </label>

                {selectedCard ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 bg-neutral-100 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    {/* Thumbnail */}
                    <div className="w-16 h-22 sm:w-20 sm:h-28 aspect-[750/1050] bg-black border-2 border-black overflow-hidden shrink-0 relative">
                      {selectedCard.imageUrl ? (
                        <img 
                          src={selectedCard.imageUrl} 
                          alt={selectedCard.player} 
                          className="w-full h-full object-cover select-none"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-black">
                          {selectedCard.player}
                        </div>
                      )}
                      <div className="absolute top-1 left-1 bg-[#D4FF00] text-black text-[7px] font-black px-1 border border-black">
                        {selectedCard.rarity}
                      </div>
                    </div>

                    {/* Card Info */}
                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                        <span className="bg-black text-white px-2 py-0.5 text-[9px] font-black uppercase">
                          {selectedCard.team}
                        </span>
                        <span className="bg-neutral-200 text-neutral-800 px-2 py-0.5 text-[9px] font-black uppercase">
                          {selectedCard.edition}
                        </span>
                      </div>
                      <h4 className="text-base sm:text-lg font-black uppercase tracking-tight text-black">
                        {selectedCard.player}
                      </h4>
                      <p className="text-[10px] font-bold text-neutral-500 uppercase">
                        Current Estimated Value: <strong className="text-black font-mono">{formatCurrency(selectedCard.currentPrice, true)}</strong>
                      </p>
                    </div>

                    {/* Change Card Button if vault has multiple cards */}
                    {vaultCards.length > 1 && (
                      <div className="shrink-0">
                        <select
                          value={selectedCard.id}
                          onChange={(e) => {
                            const found = vaultCards.find(c => c.id === e.target.value);
                            if (found) setSelectedCard(found);
                          }}
                          className="text-xs font-black bg-white border-2 border-black p-2 uppercase cursor-pointer hover:bg-neutral-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                          {vaultCards.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.player} ({c.rarity})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border-2 border-amber-400 text-xs font-bold text-amber-900 uppercase">
                    You do not currently have any cards in your vault to gift. Open booster packs or buy from the transfer market first!
                  </div>
                )}
              </div>

              {/* Recipient Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider flex items-center justify-between text-black">
                  <span className="flex items-center gap-1.5">
                    <UserIcon size={14} />
                    2. CHOOSE RECIPIENT COLLECTOR
                  </span>
                  {selectedRecipient && (
                    <span className="text-[10px] bg-[#D4FF00] text-black px-2 py-0.5 border border-black font-black">
                      SELECTED: {selectedRecipient.displayName}
                    </span>
                  )}
                </label>

                {/* Search / Filter input */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search collector by display name or email..."
                    className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 border-2 border-black text-xs font-bold uppercase focus:outline-none focus:bg-white"
                  />
                </div>

                {/* Quick Collectors Grid */}
                <div className="max-h-36 overflow-y-auto border-2 border-black p-2 space-y-1.5 bg-white">
                  {loadingCollectors ? (
                    <div className="text-center py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">
                      Loading community collectors...
                    </div>
                  ) : filteredCollectors.length > 0 ? (
                    filteredCollectors.map(col => {
                      const isChosen = selectedRecipient?.uid === col.uid;
                      return (
                        <div
                          key={col.uid}
                          onClick={() => {
                            setSelectedRecipient(col);
                            setCustomRecipientEmail('');
                          }}
                          className={cn(
                            "p-2 border-2 cursor-pointer transition-all flex items-center justify-between text-left",
                            isChosen
                              ? "bg-black text-[#D4FF00] border-black shadow-[2px_2px_0px_0px_#D4FF00]"
                              : "bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-black hover:border-black"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-neutral-300 border border-black overflow-hidden shrink-0 flex items-center justify-center font-black text-xs text-black">
                              {col.customAvatar || col.photoURL ? (
                                <img src={col.customAvatar || col.photoURL} alt={col.displayName} className="w-full h-full object-cover" />
                              ) : (
                                col.displayName.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-black uppercase tracking-tight flex items-center gap-1">
                                <span>{col.displayName}</span>
                                {col.favoriteTeam && (
                                  <span className={cn(
                                    "text-[8px] px-1 py-0.2 border",
                                    isChosen ? "border-[#D4FF00] text-[#D4FF00]" : "border-neutral-400 text-neutral-600"
                                  )}>
                                    {col.favoriteTeam}
                                  </span>
                                )}
                              </div>
                              <div className={cn("text-[9px] font-bold uppercase", isChosen ? "text-neutral-300" : "text-neutral-500")}>
                                {col.email || 'Registered Collector'} • {col.vaultCardsCount || 0} cards in vault
                              </div>
                            </div>
                          </div>

                          {isChosen && (
                            <div className="w-5 h-5 bg-[#D4FF00] text-black flex items-center justify-center border border-black">
                              <Check size={14} />
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-3 text-xs font-bold text-neutral-500 uppercase">
                      No matching collectors found. Enter email manually below.
                    </div>
                  )}
                </div>

                {/* Manual Email Fallback */}
                <div className="pt-1">
                  <input
                    type="email"
                    value={customRecipientEmail}
                    onChange={(e) => {
                      setCustomRecipientEmail(e.target.value);
                      setSelectedRecipient(null);
                    }}
                    placeholder="Or enter recipient email directly..."
                    className="w-full px-3 py-2 bg-neutral-100 border border-black/40 text-[11px] font-bold focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Gift Wrap Style Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-black">
                  <Sparkles size={14} />
                  3. SELECT GIFT WRAP STYLE
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {WRAP_STYLES.map(style => {
                    const isSelected = wrapStyle === style.id;
                    return (
                      <div
                        key={style.id}
                        onClick={() => setWrapStyle(style.id)}
                        className={cn(
                          "p-2.5 border-2 cursor-pointer transition-all flex flex-col justify-between relative shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                          style.bg,
                          isSelected 
                            ? "border-black ring-2 ring-black scale-[1.02]" 
                            : "border-neutral-300 hover:border-black opacity-80 hover:opacity-100"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={cn("px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider border border-black", style.ribbon)}>
                            RIBBON
                          </span>
                          {isSelected && <Check size={14} className="text-black stroke-[3]" />}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-tight text-black leading-tight">
                          {style.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Personalized Gift Message */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-black">
                    <HeartHandshake size={14} />
                    4. PERSONALIZED GIFT MESSAGE
                  </label>
                  <span className="text-[10px] font-bold text-neutral-500 font-mono">
                    {giftNote.length}/140
                  </span>
                </div>

                <textarea
                  value={giftNote}
                  maxLength={140}
                  onChange={(e) => setGiftNote(e.target.value)}
                  placeholder="Write a custom note to the recipient collector (e.g. Good luck with the squad!)..."
                  rows={2}
                  className="w-full p-2.5 bg-neutral-50 border-2 border-black text-xs font-bold focus:outline-none focus:bg-white resize-none"
                />

                {/* Preset Message Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_MESSAGES.map((msg, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectPresetNote(msg)}
                      className="text-[9px] font-bold uppercase px-2 py-1 bg-neutral-100 hover:bg-black hover:text-[#D4FF00] border border-neutral-300 hover:border-black transition-colors"
                    >
                      {msg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-100 border-2 border-red-600 text-red-800 text-xs font-black uppercase flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-1/3 py-3 px-4 bg-white hover:bg-neutral-100 border-2 border-black font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-black"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleSendGift}
                  disabled={isSubmitting || !selectedCard || (!selectedRecipient && !customRecipientEmail)}
                  className="w-full sm:w-2/3 py-3 px-4 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black font-black text-xs uppercase tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send size={15} />
                  {isSubmitting ? 'TRANSFERRING & PACKAGING...' : 'CONFIRM & SEND GIFT CARD'}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
