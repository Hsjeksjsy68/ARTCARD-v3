import React, { useState, useEffect } from 'react';
import { User, db, doc, getDoc, setDoc, onSnapshot, updateProfile, auth, signOut } from '../lib/firebase';
import { FootballCard, UserProfileData } from '../types';
import { CardItem } from './CardItem';
import { formatCurrency, cn } from '../lib/utils';
import { 
  User as UserIcon, 
  Shield, 
  Star, 
  Sparkles, 
  Trophy, 
  Edit3, 
  Save, 
  X, 
  Camera, 
  ExternalLink, 
  Share2, 
  WalletCards, 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  Copy, 
  LogIn, 
  LogOut,
  Layers,
  Crown,
  Heart,
  ShoppingCart,
  PackageCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthModal } from './AuthModal';

interface UserProfileProps {
  user: User | null;
  cards: FootballCard[];
  vaultIds?: Set<string> | string[];
  favoriteIds?: Set<string> | string[];
  collectionIds?: Set<string> | string[];
  onSelectCard: (card: FootballCard) => void;
  onNavigateTab: (tab: any) => void;
  onToggleCollection?: (cardId: string) => void;
  onToggleFavorite?: (cardId: string) => void;
}

export function UserProfile({
  user,
  cards,
  vaultIds,
  favoriteIds,
  collectionIds,
  onSelectCard,
  onNavigateTab,
  onToggleCollection,
  onToggleFavorite
}: UserProfileProps) {
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'vault' | 'favorites'>('vault');

  // Edit Form States
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editFavoriteTeam, setEditFavoriteTeam] = useState('');
  const [editFeaturedCardId, setEditFeaturedCardId] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

  // Effective sets for vault (owned/bought/packed) and favorites (wishlist)
  const rawVaultIds: string[] = Array.isArray(profileData?.vaultIds) 
    ? profileData!.vaultIds 
    : (Array.isArray(profileData?.collectionIds)
      ? profileData!.collectionIds
      : (Array.isArray(vaultIds) ? vaultIds : Array.from(vaultIds || collectionIds || [])));

  const effectiveFavoriteIds = Array.isArray(favoriteIds) ? new Set(favoriteIds) : (favoriteIds || new Set<string>());

  // Fetch / Listen to User Profile from Firestore
  useEffect(() => {
    if (!user) {
      setProfileData(null);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfileData;
        setProfileData(data);
        setEditName(data.displayName || user.displayName || '');
        setEditBio(data.bio || '');
        setEditFavoriteTeam(data.favoriteTeam || '');
        setEditFeaturedCardId(data.featuredCardId || '');
        setEditAvatarUrl(data.customAvatar || user.photoURL || '');
      } else {
        const defaultProfile: UserProfileData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'ArtCard Collector',
          photoURL: user.photoURL || '',
          bio: 'Passionate football card enthusiast and collector on ArtCard.',
          favoriteTeam: 'Real Madrid',
          joinedAt: Date.now()
        };
        setProfileData(defaultProfile);
        setEditName(defaultProfile.displayName || '');
        setEditBio(defaultProfile.bio || '');
        setEditFavoriteTeam(defaultProfile.favoriteTeam || '');
        setEditAvatarUrl(defaultProfile.photoURL || '');
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Derived card map & user vault cards (preserves duplicate copies in user's vault)
  const cardMap = new Map(cards.map(c => [c.id, c]));
  const vaultCards: FootballCard[] = rawVaultIds.map(id => cardMap.get(id)).filter(Boolean) as FootballCard[];
  
  // Count how many copies exist of each card ID
  const cardCopyCounts = new Map<string, number>();
  rawVaultIds.forEach(id => {
    cardCopyCounts.set(id, (cardCopyCounts.get(id) || 0) + 1);
  });
  
  // Derived user favorite cards (Wishlisted)
  const favoriteCards = cards.filter(c => effectiveFavoriteIds.has(c.id));
  
  // Total Portfolio value calculation based on all Vault card copies owned
  const totalValue = vaultCards.reduce((sum, card) => sum + (card.currentPrice || 0), 0);

  // Rarest card in user vault
  const rarityRank: Record<string, number> = {
    '1-of-1 Shield': 4,
    'Gold Autograph': 3,
    'Silver Refractor': 2,
    'Base': 1
  };

  const rarestCard = vaultCards.length > 0 
    ? [...vaultCards].sort((a, b) => (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0))[0]
    : null;

  // Highest value card in vault
  const topValuedCard = vaultCards.length > 0
    ? [...vaultCards].sort((a, b) => (b.currentPrice || 0) - (a.currentPrice || 0))[0]
    : null;

  // Featured showcase card
  const featuredCard = profileData?.featuredCardId 
    ? cards.find(c => c.id === profileData.featuredCardId) || topValuedCard
    : topValuedCard;

  // Determine Collector Tier
  let collectorTier = 'Rookie Collector';
  let tierColor = 'bg-neutral-200 text-black';
  let tierIcon = Trophy;

  if (totalValue >= 2000 || vaultCards.some(c => c.rarity === '1-of-1 Shield')) {
    collectorTier = 'Hall of Fame Collector';
    tierColor = 'bg-black text-[#D4FF00] border-black';
    tierIcon = Crown;
  } else if (totalValue >= 500 || vaultCards.length >= 10) {
    collectorTier = 'Elite Collector';
    tierColor = 'bg-[#D4FF00] text-black border-black';
    tierIcon = Award;
  } else if (totalValue >= 100 || vaultCards.length >= 3) {
    collectorTier = 'Pro Collector';
    tierColor = 'bg-white text-black border-black';
    tierIcon = Star;
  }

  // Extract unique teams from cards database for the selector
  const availableTeams = Array.from(new Set(cards.map(c => c.team).filter(Boolean))).sort();

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedData: Partial<UserProfileData> = {
        displayName: editName.trim() || 'Collector',
        bio: editBio.trim(),
        favoriteTeam: editFavoriteTeam,
        featuredCardId: editFeaturedCardId,
        customAvatar: editAvatarUrl
      };

      await setDoc(userRef, updatedData, { merge: true });

      if (auth.currentUser && editName.trim()) {
        await updateProfile(auth.currentUser, {
          displayName: editName.trim()
        });
      }

      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to save profile settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyProfileLink = () => {
    if (!user) return;
    const url = `${window.location.origin}${window.location.pathname}#user-${user.uid}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleHeartClick = (cardId: string) => {
    if (onToggleFavorite) {
      onToggleFavorite(cardId);
    } else if (onToggleCollection) {
      onToggleCollection(cardId);
    }
  };

  // If user is not logged in, render authentication prompt view
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="bg-white border-4 border-black p-8 sm:p-12 text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] space-y-6">
          <div className="w-20 h-20 bg-[#D4FF00] border-4 border-black mx-auto flex items-center justify-center text-black">
            <UserIcon size={40} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black">
              COLLECTOR VAULT & PROFILE
            </h2>
            <p className="text-neutral-600 text-xs sm:text-sm font-bold uppercase tracking-wider max-w-md mx-auto">
              Sign in to manage your owned Vault cards, mark favorite cards, track portfolio value, and open packs.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full sm:w-auto bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-8 py-4 text-xs font-black uppercase tracking-widest transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
            >
              <LogIn size={16} /> SIGN IN / REGISTER
            </button>
            <button
              onClick={() => onNavigateTab('database')}
              className="w-full sm:w-auto bg-white hover:bg-neutral-100 text-black border-2 border-black px-8 py-4 text-xs font-black uppercase tracking-widest transition-colors"
            >
              EXPLORE DATABASE →
            </button>
          </div>
        </div>

        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Top Profile Hero Card */}
      <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Avatar and Main Info */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative shrink-0">
              {profileData?.customAvatar || user.photoURL ? (
                <img 
                  src={profileData?.customAvatar || user.photoURL || ''} 
                  alt="Avatar" 
                  className="w-24 h-24 sm:w-28 sm:h-28 object-cover border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-[#D4FF00] border-4 border-black flex items-center justify-center text-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <UserIcon size={48} />
                </div>
              )}

              <div className="absolute -bottom-2 -right-2 bg-black text-[#D4FF00] p-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#D4FF00]">
                {React.createElement(tierIcon, { size: 16 })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-black">
                  {profileData?.displayName || user.displayName || user.email?.split('@')[0] || 'Collector'}
                </h1>
                <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border-2 ${tierColor}`}>
                  {collectorTier}
                </span>
              </div>

              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                {user.email}
              </p>

              {profileData?.bio && (
                <p className="text-xs font-bold text-neutral-800 uppercase tracking-wider max-w-lg mt-2 pt-1 border-t border-neutral-200">
                  "{profileData.bio}"
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2 text-[10px] font-black uppercase tracking-widest text-neutral-600">
                <span className="bg-neutral-100 border border-black px-2 py-1 flex items-center gap-1 font-mono text-black">
                  <strong>{profileData?.followers?.length || 0}</strong> FOLLOWERS
                </span>
                <span className="bg-neutral-100 border border-black px-2 py-1 flex items-center gap-1 font-mono text-black">
                  <strong>{profileData?.following?.length || 0}</strong> FOLLOWING
                </span>
                {profileData?.favoriteTeam && (
                  <span className="bg-neutral-100 border border-black px-2 py-1">
                    ⚽ CLUB: {profileData.favoriteTeam}
                  </span>
                )}
                <span className="bg-neutral-100 border border-black px-2 py-1">
                  📅 MEMBER SINCE {new Date(profileData?.joinedAt || Date.now()).getFullYear()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap md:flex-col gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            >
              <Edit3 size={14} /> EDIT PROFILE
            </button>

            <button
              onClick={() => onNavigateTab('marketplace')}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-black text-[#D4FF00] hover:bg-neutral-800 border-2 border-black px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors shadow-[3px_3px_0px_0px_#D4FF00]"
            >
              <ShoppingCart size={14} /> SELL ON MARKET
            </button>

            <button
              onClick={handleCopyProfileLink}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white hover:bg-neutral-100 text-black border-2 border-black px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            >
              {copiedLink ? (
                <>
                  <CheckCircle2 size={14} className="text-emerald-600" /> COPIED!
                </>
              ) : (
                <>
                  <Share2 size={14} /> SHARE PROFILE
                </>
              )}
            </button>

            <button
              onClick={handleSignOut}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-neutral-700 hover:text-red-600 border-2 border-black px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors"
            >
              <LogOut size={14} /> SIGN OUT
            </button>
          </div>
        </div>
      </div>

      {/* Portfolio & Vault Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">PORTFOLIO VALUE</div>
          <div className="text-xl sm:text-3xl font-black text-black tracking-tight">{formatCurrency(totalValue)}</div>
          <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mt-2 flex items-center gap-1">
            <TrendingUp size={12} /> LIVE VAULT VALUATION
          </div>
        </div>

        <div className="bg-white border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">VAULT CARDS (OWNED)</div>
          <div className="text-xl sm:text-3xl font-black text-black tracking-tight">{vaultCards.length}</div>
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mt-2">
            BOUGHT OR PACKED
          </div>
        </div>

        <div className="bg-white border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">SAVED FAVORITES</div>
          <div className="text-xl sm:text-3xl font-black text-black tracking-tight text-red-600">{favoriteCards.length}</div>
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-600 mt-2 flex items-center gap-1">
            <Heart size={12} className="fill-red-500 text-red-500" /> WISHLIST CARDS
          </div>
        </div>

        <div className="bg-white border-2 border-black p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">RAREST VAULT CARD</div>
          <div className="text-sm sm:text-base font-black text-black truncate">
            {rarestCard ? rarestCard.rarity : 'NONE'}
          </div>
          <div className="text-[9px] font-black uppercase tracking-widest text-amber-600 mt-2 flex items-center gap-1">
            <Sparkles size={12} /> VAULT HIGHLIGHT
          </div>
        </div>
      </div>

      {/* Featured Holy Grail Showcase Card */}
      {featuredCard && (
        <div className="bg-black text-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_#D4FF00]">
          <div className="flex flex-col lg:flex-row items-center gap-8 justify-between">
            <div className="space-y-4 max-w-xl text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-[#D4FF00] text-black px-3 py-1 text-xs font-black uppercase tracking-widest border border-black">
                <Crown size={14} /> FEATURED SHOWCASE CARD
              </div>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter text-white">
                {featuredCard.player}
              </h2>
              <p className="text-neutral-400 font-black text-xs uppercase tracking-widest">
                {featuredCard.year} • {featuredCard.team} • {featuredCard.set} {featuredCard.edition && `• ${featuredCard.edition}`}
              </p>
              
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <div className="bg-neutral-900 border border-neutral-700 px-4 py-2 text-left">
                  <div className="text-[9px] text-neutral-400 uppercase font-black">MARKET VALUE</div>
                  <div className="text-xl font-black text-[#D4FF00]">{formatCurrency(featuredCard.currentPrice)}</div>
                </div>

                <div className="bg-neutral-900 border border-neutral-700 px-4 py-2 text-left">
                  <div className="text-[9px] text-neutral-400 uppercase font-black">RARITY TIER</div>
                  <div className="text-sm font-black text-white">{featuredCard.rarity.toUpperCase()}</div>
                </div>

                <div className="bg-neutral-900 border border-neutral-700 px-4 py-2 text-left">
                  <div className="text-[9px] text-neutral-400 uppercase font-black">CARD NUMBER</div>
                  <div className="text-sm font-black text-neutral-300">{featuredCard.cardNumber}</div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onSelectCard(featuredCard)}
                  className="bg-[#D4FF00] hover:bg-white text-black border-2 border-black px-6 py-3 text-xs font-black uppercase tracking-widest transition-colors shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                >
                  VIEW FULL CARD & PRICE HISTORY →
                </button>
              </div>
            </div>

            {/* Showcase Card Preview */}
            <div className="w-56 sm:w-64 shrink-0 cursor-pointer group" onClick={() => onSelectCard(featuredCard)}>
              <div className="relative aspect-[750/1050] bg-white border-4 border-[#D4FF00] overflow-hidden shadow-[8px_8px_0px_0px_rgba(212,255,0,0.4)] group-hover:scale-105 transition-transform">
                <img src={featuredCard.imageUrl} alt={featuredCard.player} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 bg-black text-[#D4FF00] text-[10px] font-black px-2 py-1 border border-black">
                  SHOWCASE ⭐
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collector Badges & Achievements */}
      <div className="bg-white border-2 border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-3">
            <Award size={24} className="text-black" />
            <h3 className="text-xl font-black uppercase tracking-tighter">COLLECTOR ACHIEVEMENTS & MILESTONES</h3>
          </div>
          <span className="text-xs font-black text-neutral-500 uppercase tracking-widest">
            {
              [
                vaultCards.length >= 1,
                totalValue >= 500,
                vaultCards.some(c => c.rarity === '1-of-1 Shield'),
                vaultCards.some(c => c.rarity === 'Gold Autograph'),
                vaultCards.length >= 5,
                favoriteCards.length >= 1
              ].filter(Boolean).length
            } / 6 UNLOCKED
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Badge 1 */}
          <div className={`p-4 border-2 border-black text-center flex flex-col items-center justify-center ${vaultCards.length >= 1 ? 'bg-neutral-50 shadow-[3px_3px_0px_0px_#D4FF00]' : 'opacity-40 bg-neutral-100'}`}>
            <Trophy size={28} className="mb-2 text-amber-500" />
            <div className="text-[10px] font-black uppercase tracking-wider">First Card</div>
            <div className="text-[8px] text-neutral-500 uppercase font-bold mt-1">Own at least 1 card</div>
          </div>

          {/* Badge 2 */}
          <div className={`p-4 border-2 border-black text-center flex flex-col items-center justify-center ${totalValue >= 500 ? 'bg-neutral-50 shadow-[3px_3px_0px_0px_#D4FF00]' : 'opacity-40 bg-neutral-100'}`}>
            <Crown size={28} className="mb-2 text-yellow-500" />
            <div className="text-[10px] font-black uppercase tracking-wider">৳500+ Value</div>
            <div className="text-[8px] text-neutral-500 uppercase font-bold mt-1">Vault valued at ৳500+</div>
          </div>

          {/* Badge 3 */}
          <div className={`p-4 border-2 border-black text-center flex flex-col items-center justify-center ${vaultCards.some(c => c.rarity === '1-of-1 Shield') ? 'bg-neutral-50 shadow-[3px_3px_0px_0px_#D4FF00]' : 'opacity-40 bg-neutral-100'}`}>
            <Shield size={28} className="mb-2 text-[#D4FF00]" />
            <div className="text-[10px] font-black uppercase tracking-wider">Shield Owner</div>
            <div className="text-[8px] text-neutral-500 uppercase font-bold mt-1">Own a 1-of-1 Shield</div>
          </div>

          {/* Badge 4 */}
          <div className={`p-4 border-2 border-black text-center flex flex-col items-center justify-center ${vaultCards.some(c => c.rarity === 'Gold Autograph') ? 'bg-neutral-50 shadow-[3px_3px_0px_0px_#D4FF00]' : 'opacity-40 bg-neutral-100'}`}>
            <Star size={28} className="mb-2 text-amber-400" />
            <div className="text-[10px] font-black uppercase tracking-wider">Auto Hunter</div>
            <div className="text-[8px] text-neutral-500 uppercase font-bold mt-1">Own a Gold Autograph</div>
          </div>

          {/* Badge 5 */}
          <div className={`p-4 border-2 border-black text-center flex flex-col items-center justify-center ${vaultCards.length >= 5 ? 'bg-neutral-50 shadow-[3px_3px_0px_0px_#D4FF00]' : 'opacity-40 bg-neutral-100'}`}>
            <Layers size={28} className="mb-2 text-blue-600" />
            <div className="text-[10px] font-black uppercase tracking-wider">Squad Master</div>
            <div className="text-[8px] text-neutral-500 uppercase font-bold mt-1">5+ Cards in Vault</div>
          </div>

          {/* Badge 6 */}
          <div className={`p-4 border-2 border-black text-center flex flex-col items-center justify-center ${favoriteCards.length >= 1 ? 'bg-neutral-50 shadow-[3px_3px_0px_0px_#D4FF00]' : 'opacity-40 bg-neutral-100'}`}>
            <Heart size={28} className="mb-2 text-red-500 fill-red-500" />
            <div className="text-[10px] font-black uppercase tracking-wider">Wishlist Scout</div>
            <div className="text-[8px] text-neutral-500 uppercase font-bold mt-1">Mark a favorite card</div>
          </div>
        </div>
      </div>

      {/* User's Cards Sections with Tab Switcher for Vault vs Favorites */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-black pb-4 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveProfileTab('vault')}
              className={cn(
                "px-5 py-2.5 text-xs sm:text-sm font-black uppercase tracking-widest border-2 border-black transition-all flex items-center gap-2",
                activeProfileTab === 'vault'
                  ? "bg-black text-[#D4FF00] shadow-[4px_4px_0px_0px_#D4FF00]"
                  : "bg-white text-black hover:bg-neutral-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              )}
            >
              <Trophy size={16} />
              MY VAULT ({vaultCards.length})
            </button>

            <button
              onClick={() => setActiveProfileTab('favorites')}
              className={cn(
                "px-5 py-2.5 text-xs sm:text-sm font-black uppercase tracking-widest border-2 border-black transition-all flex items-center gap-2",
                activeProfileTab === 'favorites'
                  ? "bg-black text-white shadow-[4px_4px_0px_0px_red]"
                  : "bg-white text-black hover:bg-neutral-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              )}
            >
              <Heart size={16} className={activeProfileTab === 'favorites' ? 'text-red-500 fill-red-500' : 'text-red-500'} />
              FAVORITES ({favoriteCards.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('database')}
              className="bg-white hover:bg-[#D4FF00] text-black border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              BROWSE DATABASE →
            </button>
            <button
              onClick={() => onNavigateTab('shop')}
              className="bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              OPEN PACKS →
            </button>
          </div>
        </div>

        {activeProfileTab === 'vault' ? (
          /* Vault Cards View */
          vaultCards.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
              {(() => {
                const copyTracker = new Map<string, number>();
                return vaultCards.map((card, index) => {
                  const currentCopy = (copyTracker.get(card.id) || 0) + 1;
                  copyTracker.set(card.id, currentCopy);
                  const totalCopies = cardCopyCounts.get(card.id) || 1;

                  return (
                    <div key={`${card.id}_copy_${index}`} className="relative group">
                      <CardItem
                        card={card}
                        inVault={true}
                        copyNumber={currentCopy}
                        totalCopies={totalCopies}
                        ownedCount={totalCopies}
                        isFavorite={effectiveFavoriteIds.has(card.id)}
                        onToggleFavorite={(e, id) => handleHeartClick(id)}
                        onClick={(c) => onSelectCard(c)}
                      />
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="text-center py-20 border-2 border-black bg-neutral-50 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <Trophy size={48} className="mx-auto text-neutral-400" />
              <h3 className="text-xl font-black uppercase tracking-widest text-black">YOUR VAULT IS EMPTY</h3>
              <p className="text-xs text-neutral-500 uppercase font-black max-w-md mx-auto">
                Cards you buy directly from the database or pull from booster packs in the shop will automatically be stored in your Vault.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => onNavigateTab('shop')}
                  className="bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-6 py-3 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  OPEN BOOSTER PACKS
                </button>
                <button
                  onClick={() => onNavigateTab('database')}
                  className="bg-black text-[#D4FF00] hover:bg-neutral-800 border-2 border-black px-6 py-3 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  BUY FROM DATABASE
                </button>
              </div>
            </div>
          )
        ) : (
          /* Favorites Cards View */
          favoriteCards.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
              {favoriteCards.map((card) => (
                <div key={card.id} className="relative group">
                  <CardItem
                    card={card}
                    inVault={rawVaultIds.includes(card.id)}
                    ownedCount={cardCopyCounts.get(card.id) || 0}
                    isFavorite={true}
                    onToggleFavorite={(e, id) => handleHeartClick(id)}
                    onClick={(c) => onSelectCard(c)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border-2 border-black bg-neutral-50 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <Heart size={48} className="mx-auto text-red-400" />
              <h3 className="text-xl font-black uppercase tracking-widest text-black">NO FAVORITE CARDS SAVED YET</h3>
              <p className="text-xs text-neutral-500 uppercase font-black max-w-md mx-auto">
                Click the heart icon on any card in the Database or Vault to curate your personal wishlist.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => onNavigateTab('database')}
                  className="bg-black text-white hover:bg-[#D4FF00] hover:text-black border-2 border-black px-6 py-3 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  EXPLORE CARDS TO FAVORITE
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto"
          >
            <div className="bg-white border-4 border-black w-full max-w-xl p-6 sm:p-8 relative shadow-[10px_10px_0px_0px_#D4FF00] my-8">
              <button
                onClick={() => setIsEditing(false)}
                className="absolute top-4 right-4 bg-black text-white p-1.5 hover:bg-[#D4FF00] hover:text-black transition-colors"
              >
                <X size={20} />
              </button>

              <div className="border-b-2 border-black pb-4 mb-6">
                <h3 className="text-2xl font-black uppercase tracking-tight text-black flex items-center gap-2">
                  <Edit3 size={24} /> EDIT COLLECTOR PROFILE
                </h3>
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mt-1">
                  Customize your identity, bio, and favorite club
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Avatar Preview and Upload */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-600 mb-2">
                    COLLECTOR AVATAR
                  </label>
                  <div className="flex items-center gap-4">
                    {editAvatarUrl ? (
                      <img src={editAvatarUrl} alt="Avatar Preview" className="w-16 h-16 object-cover border-2 border-black" />
                    ) : (
                      <div className="w-16 h-16 bg-[#D4FF00] border-2 border-black flex items-center justify-center font-black">
                        <UserIcon size={32} />
                      </div>
                    )}
                    <div className="space-y-2 flex-1">
                      <label className="cursor-pointer bg-neutral-100 hover:bg-neutral-200 border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-wider inline-flex items-center gap-2">
                        <Camera size={16} /> UPLOAD PHOTO
                        <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
                      </label>
                      <input
                        type="text"
                        placeholder="OR PASTE IMAGE URL..."
                        value={editAvatarUrl}
                        onChange={(e) => setEditAvatarUrl(e.target.value)}
                        className="w-full bg-neutral-50 border-2 border-black p-2 text-xs font-bold uppercase focus:outline-none focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-600 mb-2">
                    DISPLAY NAME / COLLECTOR HANDLE
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="E.G. RAKIB COLLECTS"
                    className="w-full bg-neutral-50 border-2 border-black p-3 text-sm font-bold uppercase focus:outline-none focus:bg-white"
                  />
                </div>

                {/* Bio / Slogan */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-600 mb-2">
                    BIO / MOTTO
                  </label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="TELL OTHER COLLECTORS ABOUT YOUR FOCUS, HUNTING LIST, OR FAVORITE PLAYERS..."
                    className="w-full bg-neutral-50 border-2 border-black p-3 text-sm font-bold uppercase focus:outline-none focus:bg-white"
                  />
                </div>

                {/* Favorite Club / Team */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-600 mb-2">
                    FAVORITE CLUB / TEAM
                  </label>
                  <select
                    value={editFavoriteTeam}
                    onChange={(e) => setEditFavoriteTeam(e.target.value)}
                    className="w-full bg-neutral-50 border-2 border-black p-3 text-sm font-black uppercase tracking-wider focus:outline-none focus:bg-white"
                  >
                    <option value="">SELECT FAVORITE TEAM</option>
                    {availableTeams.map((team) => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>

                {/* Featured Card Selector */}
                {vaultCards.length > 0 && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-neutral-600 mb-2">
                      FEATURED SHOWCASE CARD (FROM YOUR VAULT)
                    </label>
                    <select
                      value={editFeaturedCardId}
                      onChange={(e) => setEditFeaturedCardId(e.target.value)}
                      className="w-full bg-neutral-50 border-2 border-black p-3 text-sm font-black uppercase tracking-wider focus:outline-none focus:bg-white"
                    >
                      <option value="">AUTO (HIGHEST VALUED CARD)</option>
                      {vaultCards.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.player} ({c.team}) - {formatCurrency(c.currentPrice)} [{c.rarity}]
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Submit & Cancel */}
                <div className="flex gap-4 pt-4 border-t-2 border-black">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-black text-[#D4FF00] hover:bg-neutral-800 border-2 border-black py-3 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#D4FF00]"
                  >
                    <Save size={16} /> {isSaving ? 'SAVING...' : 'SAVE PROFILE'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="bg-white hover:bg-neutral-100 text-black border-2 border-black px-6 py-3 font-black text-xs uppercase tracking-widest"
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
