import React, { useState, useEffect } from 'react';
import { FootballCard, Pack, CardTheme } from '../types';
import { 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Search, 
  Plus, 
  Image as ImageIcon, 
  AlertTriangle, 
  Users, 
  Wallet, 
  PackageCheck, 
  History, 
  Layers, 
  Eye, 
  Minus, 
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Upload,
  Tag,
  Palette,
  PackageOpen,
  CheckSquare,
  Square,
  Copy,
  Type,
  Move,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { db, doc, deleteDoc, updateDoc, setDoc, collection, getDocs, onSnapshot } from '../lib/firebase';
import { formatCurrency, getDefaultStock, getDefaultMaxSupply } from '../lib/utils';
import { cardsDatabase } from '../data';
import { DEFAULT_OFFICIAL_THEMES, PRESET_OVERLAYS, PRESET_LOGOS, AVAILABLE_FONTS } from '../lib/themePresets';
import { getCardNationalTeam, getCardClubTeam, getNationalTeamFlag, POPULAR_NATIONAL_TEAMS } from '../lib/teams';

interface ManageShopProps {
  cards: FootballCard[];
  packs: Pack[];
  themes: any[];
  initialTab?: 'cards' | 'inventory' | 'packs' | 'themes' | 'transactions';
  onNavigateToCardCreator?: () => void;
}

interface UserRecord {
  id: string;
  email: string;
  walletBalance?: number;
  collectionIds?: string[];
}

interface TransactionRecord {
  id: string;
  userId: string;
  userEmail?: string;
  type: string;
  amount: number;
  description: string;
  timestamp: number;
  paymentMethod?: string;
}

export function ManageShop({ cards, packs, themes, initialTab = 'cards', onNavigateToCardCreator }: ManageShopProps) {
  const [activeTab, setActiveTab] = useState<'cards' | 'inventory' | 'packs' | 'themes' | 'transactions'>(initialTab);
  
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Cards State
  const [editingCard, setEditingCard] = useState<FootballCard | null>(null);
  const [editForm, setEditForm] = useState<Partial<FootballCard>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [filterClub, setFilterClub] = useState('');
  const [filterNationalTeam, setFilterNationalTeam] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSet, setFilterSet] = useState('');
  const [filterRarity, setFilterRarity] = useState('');

  // Packs State
  const [editingPack, setEditingPack] = useState<Pack | null>(null);
  const [packEditForm, setPackEditForm] = useState<Partial<Pack>>({});
  const [customEditionInput, setCustomEditionInput] = useState('');
  
  // Themes & Custom Card Maker State
  const [editingTheme, setEditingTheme] = useState<CardTheme | null>(null);
  const [themeEditForm, setThemeEditForm] = useState<Partial<CardTheme>>({});
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isSeedingThemes, setIsSeedingThemes] = useState(false);
  const [themeSearchQuery, setThemeSearchQuery] = useState('');

  // Live Test Preview State in Theme Studio
  const [testPlayerName, setTestPlayerName] = useState('CRISTIANO RONALDO');
  const [testPlayerPhoto, setTestPlayerPhoto] = useState('https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop');
  const [testClubLogo, setTestClubLogo] = useState('');
  const [testPhotoScale, setTestPhotoScale] = useState(1);
  const [testPhotoOffsetX, setTestPhotoOffsetX] = useState(0);
  const [testPhotoOffsetY, setTestPhotoOffsetY] = useState(0);

  // User Inventory Tracker State
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [cardHoldersSearch, setCardHoldersSearch] = useState('');
  const [selectedCardForHolders, setSelectedCardForHolders] = useState<FootballCard | null>(null);

  // Transactions State
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);

  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Fetch Users for Inventory Tracking
  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchUsers();
    } else if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: UserRecord[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          email: data.email || 'Anonymous',
          walletBalance: data.walletBalance ?? 0,
          collectionIds: data.vaultIds || data.collectionIds || []
        });
      });
      setUsersList(list);
    } catch (err) {
      console.error("Error fetching users list:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchTransactions = async () => {
    setIsLoadingTx(true);
    try {
      const snap = await getDocs(collection(db, 'transactions'));
      const list: TransactionRecord[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          userId: data.userId || 'Unknown',
          userEmail: data.userEmail || 'Unknown',
          type: data.type || 'top_up',
          amount: data.amount ?? 0,
          description: data.description || '',
          timestamp: data.timestamp || Date.now(),
          paymentMethod: data.paymentMethod
        });
      });
      // Sort newest first
      list.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(list);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setIsLoadingTx(false);
    }
  };

  // Ensure 3 default packs exist
  const defaultPacks: Pack[] = [
    { id: 'starter', name: 'STARTER PACK', price: 250, size: 3, color: 'bg-white', rarityOdds: { base: 80, silver: 18, gold: 2, shield: 0 } },
    { id: 'pro', name: 'PRO PACK', price: 500, size: 5, color: 'bg-[#D4FF00]', rarityOdds: { base: 60, silver: 30, gold: 9, shield: 1 } },
    { id: 'elite', name: 'ELITE PACK', price: 1200, size: 7, color: 'bg-black text-white', rarityOdds: { base: 40, silver: 40, gold: 17, shield: 3 } }
  ];

  const currentPacks = packs.length > 0 ? packs : defaultPacks;

  // Filter Cards
  const filteredCards = cards.filter(card => {
    const clubName = getCardClubTeam(card) || card.team || '';
    const nationalName = getCardNationalTeam(card) || '';

    const matchesSearch = 
      card.player.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clubName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nationalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.cardNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClub = filterClub ? clubName.toLowerCase() === filterClub.toLowerCase() : true;
    const matchesNation = filterNationalTeam ? nationalName.toLowerCase() === filterNationalTeam.toLowerCase() : true;
    const matchesPos = filterPosition ? card.position === filterPosition : true;
    const matchesYear = filterYear ? card.year.toString() === filterYear : true;
    const matchesSet = filterSet ? card.set === filterSet : true;
    const matchesRarity = filterRarity ? card.rarity === filterRarity : true;

    return matchesSearch && matchesClub && matchesNation && matchesPos && matchesYear && matchesSet && matchesRarity;
  });

  const clubs = Array.from(new Set(cards.map(c => getCardClubTeam(c) || c.team).filter(Boolean))).sort();
  const nationalTeams = Array.from(new Set(cards.map(c => getCardNationalTeam(c)).filter(Boolean))).sort();
  const sets = Array.from(new Set(cards.map(c => c.set))).sort();
  const rarities = ['Base', 'Silver Refractor', 'Gold Autograph', '1-of-1 Shield'];

  // Card Handlers
  const handleEditCard = (card: FootballCard) => {
    setEditingCard(card);
    setEditForm({
      ...card,
      team: getCardClubTeam(card) || card.team,
      nationalTeam: getCardNationalTeam(card) || '',
      stock: card.stock ?? getDefaultStock(card),
      maxSupply: card.maxSupply ?? getDefaultMaxSupply(card)
    });
  };

  const handleSaveCard = async () => {
    if (!editingCard) return;
    setIsSaving(true);
    try {
      const cardRef = doc(db, "cards", editingCard.id);
      await updateDoc(cardRef, {
        currentPrice: Number(editForm.currentPrice),
        stock: Number(editForm.stock),
        maxSupply: Number(editForm.maxSupply),
        player: editForm.player,
        team: editForm.team,
        club: editForm.team,
        nationalTeam: editForm.nationalTeam || '',
        position: editForm.position,
        rarity: editForm.rarity,
        edition: editForm.edition,
        imageUrl: editForm.imageUrl
      });
      setEditingCard(null);
    } catch (error) {
      console.error("Error updating card:", error);
      alert("Failed to update card.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: ['currentPrice', 'stock', 'maxSupply', 'year'].includes(name) ? Number(value) : value
    }));
  };

  const handleQuickStockAdjust = async (card: FootballCard, delta: number) => {
    const currentStock = card.stock ?? getDefaultStock(card);
    const newStock = Math.max(0, currentStock + delta);
    try {
      const cardRef = doc(db, "cards", card.id);
      await updateDoc(cardRef, { stock: newStock });
    } catch (err) {
      console.error("Error adjusting stock", err);
    }
  };

  // Pack Handlers
  const handleEditPack = (pack: Pack) => {
    setEditingPack(pack);
    setPackEditForm({
      ...pack,
      editions: pack.editions || [],
      badgeText: pack.badgeText || '',
      coverPhotoUrl: pack.coverPhotoUrl || '',
      rarityOdds: pack.rarityOdds || { base: 60, silver: 30, gold: 9, shield: 1 }
    });
  };

  const handleCreatePack = () => {
    const newId = `pack_${Date.now()}`;
    const newPack: Pack = {
      id: newId,
      name: 'NEW SPECIAL PACK',
      size: 5,
      price: 600,
      color: 'bg-[#D4FF00]',
      coverPhotoUrl: '',
      description: 'Exclusive football card pack.',
      editions: [],
      badgeText: 'HOT',
      rarityOdds: { base: 60, silver: 30, gold: 9, shield: 1 }
    };
    setEditingPack(newPack);
    setPackEditForm(newPack);
  };

  const handleTogglePackEdition = (editionName: string) => {
    setPackEditForm(prev => {
      const current = prev.editions || [];
      if (current.includes(editionName)) {
        return { ...prev, editions: current.filter(e => e !== editionName) };
      } else {
        return { ...prev, editions: [...current, editionName] };
      }
    });
  };

  const handleAddCustomEdition = () => {
    const trimmed = customEditionInput.trim();
    if (!trimmed) return;
    setPackEditForm(prev => {
      const current = prev.editions || [];
      if (!current.includes(trimmed)) {
        return { ...prev, editions: [...current, trimmed] };
      }
      return prev;
    });
    setCustomEditionInput('');
  };

  const handlePosterFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert("Image size should be less than 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPackEditForm(prev => ({
          ...prev,
          coverPhotoUrl: result
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const packThemes = [
    { id: 'bg-[#D4FF00] text-black', name: 'Neon Lime' },
    { id: 'bg-black text-white', name: 'Midnight Black' },
    { id: 'bg-white text-black', name: 'Clean White' },
    { id: 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 text-black', name: 'Gold Foil' },
    { id: 'bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 text-white', name: 'Sapphire Frost' },
    { id: 'bg-gradient-to-br from-emerald-600 via-teal-800 to-slate-900 text-white', name: 'Emerald Cyber' },
    { id: 'bg-gradient-to-br from-purple-700 via-pink-600 to-rose-900 text-white', name: 'Holographic Violet' },
    { id: 'bg-gradient-to-br from-red-600 via-rose-700 to-black text-white', name: 'Crimson Fire' }
  ];

  const presetPosters = [
    { name: 'Champions Gold', url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop' },
    { name: 'Sapphire Stadium', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop' },
    { name: 'Neon Striker', url: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=800&auto=format&fit=crop' },
    { name: 'Arena Lights', url: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?q=80&w=800&auto=format&fit=crop' },
    { name: 'Obsidian Shield', url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop' }
  ];

  const allAvailableEditions = Array.from(new Set([
    ...cards.map(c => c.edition).filter(Boolean),
    '1st Edition',
    'Base Edition',
    'Sapphire Edition',
    'Emerald Edition',
    'Signature Edition',
    'Chrome Edition',
    'Golden Era',
    'World Cup Edition'
  ])).sort();

  const handleSavePack = async () => {
    if (!editingPack) return;
    setIsSaving(true);
    try {
      const packRef = doc(db, "packs", editingPack.id);
      await setDoc(packRef, packEditForm, { merge: true });
      setEditingPack(null);
    } catch (error) {
      console.error("Error updating pack:", error);
      alert("Failed to update pack.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePack = async (pack: Pack) => {
    if (window.confirm(`Are you sure you want to delete ${pack.name}?`)) {
      try {
        await deleteDoc(doc(db, "packs", pack.id));
      } catch (error) {
        console.error("Error deleting pack:", error);
        alert("Failed to delete pack.");
      }
    }
  };

  const handleChangePack = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPackEditForm(prev => ({
      ...prev,
      [name]: name === 'size' || name === 'price' ? Number(value) : value
    }));
  };

  const handlePackOddsChange = (rarity: 'base' | 'silver' | 'gold' | 'shield', value: number) => {
    setPackEditForm(prev => ({
      ...prev,
      rarityOdds: {
        ...(prev.rarityOdds || { base: 60, silver: 30, gold: 9, shield: 1 }),
        [rarity]: Number(value)
      }
    }));
  };

  // ==========================================
  // THEMES & CUSTOM CARD MAKER CONTROLS
  // ==========================================
  const handleCreateTheme = () => {
    const newId = `theme_${Date.now()}`;
    const newTheme: CardTheme = {
      id: newId,
      name: 'NEW OFFICIAL CARD THEME',
      overlayImageUrl: PRESET_OVERLAYS.goldBallonDor,
      clubLogoUrl: PRESET_LOGOS.shieldCrown,
      clubLogoSize: 75,
      clubLogoTop: 6,
      clubLogoLeft: 6,
      editionLogoUrl: PRESET_LOGOS.firstEditionStar,
      editionLogoSize: 75,
      editionLogoTop: 6,
      editionLogoLeft: 80,
      fontName: 'Bebas Neue',
      fontColor: '#FFD700',
      fontSize: 32,
      fontPositionBottom: 6.5,
      fontScaleX: 1.1,
      fontScaleY: 1.2
    };
    setEditingTheme(newTheme);
    setThemeEditForm(newTheme);
  };

  const handleEditTheme = (theme: any) => {
    setEditingTheme(theme);
    setThemeEditForm({
      ...theme,
      clubLogoSize: theme.clubLogoSize ?? 75,
      clubLogoTop: theme.clubLogoTop ?? 6,
      clubLogoLeft: theme.clubLogoLeft ?? 6,
      editionLogoSize: theme.editionLogoSize ?? 75,
      editionLogoTop: theme.editionLogoTop ?? 6,
      editionLogoLeft: theme.editionLogoLeft ?? 80,
      fontName: theme.fontName || 'Bebas Neue',
      fontColor: theme.fontColor || '#FFFFFF',
      fontSize: theme.fontSize ?? 28,
      fontPositionBottom: theme.fontPositionBottom ?? 6,
      fontScaleX: theme.fontScaleX ?? 1,
      fontScaleY: theme.fontScaleY ?? 1
    });
  };

  const handleDuplicateTheme = (theme: any) => {
    const dupId = `theme_${Date.now()}`;
    const duplicated: CardTheme = {
      ...theme,
      id: dupId,
      name: `${theme.name || 'CUSTOM THEME'} (COPY)`
    };
    setEditingTheme(duplicated);
    setThemeEditForm(duplicated);
  };

  const handleDeleteTheme = async (theme: any) => {
    if (window.confirm(`Are you sure you want to delete theme "${theme.name}"?`)) {
      try {
        await deleteDoc(doc(db, 'themes', theme.id));
      } catch (err) {
        console.error("Error deleting theme:", err);
        alert("Failed to delete theme.");
      }
    }
  };

  const handleSaveTheme = async () => {
    if (!themeEditForm.id || !themeEditForm.name) {
      alert("Theme name and ID are required.");
      return;
    }
    setIsSavingTheme(true);
    try {
      const themeRef = doc(db, 'themes', themeEditForm.id);
      await setDoc(themeRef, themeEditForm, { merge: true });
      setEditingTheme(null);
    } catch (err) {
      console.error("Error saving theme:", err);
      alert("Failed to save card theme.");
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleSeedDefaultThemes = async () => {
    setIsSeedingThemes(true);
    try {
      const promises = DEFAULT_OFFICIAL_THEMES.map(theme => {
        return setDoc(doc(db, 'themes', theme.id), theme);
      });
      await Promise.all(promises);
      alert("Successfully seeded 5 official card maker themes into Firestore!");
    } catch (err) {
      console.error("Error seeding default themes:", err);
      alert("Failed to seed default themes.");
    } finally {
      setIsSeedingThemes(false);
    }
  };

  const handleOverlayFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert("File is too large. Please upload PNG under 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setThemeEditForm(prev => ({ ...prev, overlayImageUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClubLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setThemeEditForm(prev => ({ ...prev, clubLogoUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditionLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setThemeEditForm(prev => ({ ...prev, editionLogoUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFontFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fontName = file.name.replace(/\.[^/.]+$/, "").toUpperCase();
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setThemeEditForm(prev => ({
          ...prev,
          fontName: fontName,
          fontBase64: result
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetDatabase = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    
    setIsResetting(true);
    try {
      // 1. Delete all cards
      const cardsSnap = await getDocs(collection(db, 'cards'));
      const cardDeletes = cardsSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(cardDeletes);
      
      // 2. Insert default cards
      const cardAdds = cardsDatabase.map(card => {
        const { id, ...cardData } = card;
        return setDoc(doc(db, 'cards', id), {
          ...cardData,
          stock: getDefaultStock(card),
          maxSupply: getDefaultMaxSupply(card)
        });
      });
      await Promise.all(cardAdds);
      
      // 3. Delete all packs
      const packsSnap = await getDocs(collection(db, 'packs'));
      const packDeletes = packsSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(packDeletes);
      
      // 4. Insert default packs
      const defaultPacks = [
        { id: 'starter', name: 'STARTER PACK', price: 250, size: 3, color: 'bg-white', rarityOdds: { base: 80, silver: 18, gold: 2, shield: 0 } },
        { id: 'pro', name: 'PRO PACK', price: 500, size: 5, color: 'bg-[#D4FF00]', rarityOdds: { base: 60, silver: 30, gold: 9, shield: 1 } },
        { id: 'elite', name: 'ELITE PACK', price: 1200, size: 7, color: 'bg-black text-white', rarityOdds: { base: 40, silver: 40, gold: 17, shield: 3 } }
      ];
      const packAdds = defaultPacks.map(pack => setDoc(doc(db, 'packs', pack.id), pack));
      await Promise.all(packAdds);
      
      // 5. Seed default themes if none exist
      const themesSnap = await getDocs(collection(db, 'themes'));
      if (themesSnap.empty) {
        const themeAdds = DEFAULT_OFFICIAL_THEMES.map(theme => setDoc(doc(db, 'themes', theme.id), theme));
        await Promise.all(themeAdds);
      }

      alert("Database reset successfully with fresh stock, packs & card maker themes.");
      setConfirmReset(false);
    } catch (err) {
      console.error(err);
      alert("Failed to reset database.");
    } finally {
      setIsResetting(false);
    }
  };

  // Filter Themes
  const filteredThemes = themes.filter(t => 
    (t.name || '').toLowerCase().includes(themeSearchQuery.toLowerCase()) ||
    (t.fontName || '').toLowerCase().includes(themeSearchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Danger Zone Reset Notice */}
      <div className="bg-red-50 border-2 border-red-500 p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[6px_6px_0px_0px_rgba(239,68,68,1)]">
        <div>
          <h3 className="text-xl font-black text-red-600 uppercase tracking-tighter flex items-center gap-2">
            <AlertTriangle size={24} /> Admin Database Controls
          </h3>
          <p className="text-red-700 font-bold text-xs tracking-widest uppercase mt-1">
            Reset cards, supply limits, packs and card maker themes to standard demo state. User accounts and wallets are preserved.
          </p>
        </div>
        <button
          onClick={handleResetDatabase}
          disabled={isResetting}
          className={`shrink-0 px-6 py-3 font-black uppercase tracking-widest border-2 border-red-600 transition-colors text-xs ${
            confirmReset ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-white text-red-600 hover:bg-red-50'
          }`}
        >
          {isResetting ? 'Resetting...' : confirmReset ? 'CONFIRM RESET DB?' : 'RESET DATABASE'}
        </button>
      </div>

      {/* Main Admin Card */}
      <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
        {/* Navigation Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b-2 border-black pb-6">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">ADMIN CONTROL ROOM & THEME STUDIO</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mt-0.5">
              DATABASE STOCK CONTROL, PACK CONFIG & CUSTOM CARD MAKER TEMPLATES
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-black transition-colors ${
                activeTab === 'cards' ? 'bg-black text-[#D4FF00]' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              CARDS & STOCK ({cards.length})
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-black transition-colors flex items-center gap-1.5 ${
                activeTab === 'inventory' ? 'bg-black text-[#D4FF00]' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <Users size={14} /> USER HOLDINGS
            </button>
            <button
              onClick={() => setActiveTab('packs')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-black transition-colors ${
                activeTab === 'packs' ? 'bg-black text-[#D4FF00]' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              PACK CONFIG ({currentPacks.length})
            </button>
            <button
              onClick={() => setActiveTab('themes')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-black transition-colors flex items-center gap-1.5 ${
                activeTab === 'themes' ? 'bg-[#D4FF00] text-black font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <Palette size={14} /> CARD MAKER THEMES ({themes.length})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-black transition-colors flex items-center gap-1.5 ${
                activeTab === 'transactions' ? 'bg-black text-[#D4FF00]' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <History size={14} /> WALLET LOGS
            </button>
          </div>
        </div>
        
        {/* TAB 1: CARDS & STOCK MANAGEMENT */}
        {activeTab === 'cards' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black uppercase tracking-widest">CARDS IN DATABASE</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Control active market prices, stock limitation, and max supply.
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-neutral-500" />
                </div>
                <input
                  type="text"
                  placeholder="SEARCH DATABASE..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-neutral-100 border-2 border-black pl-10 pr-4 py-2 text-xs font-black uppercase outline-none focus:bg-white focus:border-[#D4FF00] transition-colors w-full sm:w-64"
                />
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-neutral-50 p-3 border-2 border-black">
              <select
                value={filterClub}
                onChange={(e) => setFilterClub(e.target.value)}
                className="bg-white border-2 border-black p-1.5 text-xs font-black uppercase outline-none"
              >
                <option value="">🏟️ ALL CLUBS</option>
                {clubs.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <select
                value={filterNationalTeam}
                onChange={(e) => setFilterNationalTeam(e.target.value)}
                className="bg-white border-2 border-black p-1.5 text-xs font-black uppercase outline-none"
              >
                <option value="">🌍 ALL NATIONAL TEAMS</option>
                {nationalTeams.map(n => <option key={n} value={n}>{getNationalTeamFlag(n)} {n}</option>)}
              </select>

              <select
                value={filterPosition}
                onChange={(e) => setFilterPosition(e.target.value)}
                className="bg-white border-2 border-black p-1.5 text-xs font-black uppercase outline-none"
              >
                <option value="">ALL POSITIONS</option>
                <option value="Forward">FORWARD</option>
                <option value="Midfielder">MIDFIELDER</option>
                <option value="Defender">DEFENDER</option>
                <option value="Goalkeeper">GOALKEEPER</option>
              </select>

              <select
                value={filterRarity}
                onChange={(e) => setFilterRarity(e.target.value)}
                className="bg-white border-2 border-black p-1.5 text-xs font-black uppercase outline-none"
              >
                <option value="">ALL RARITIES</option>
                {rarities.map(r => <option key={r} value={r}>{r}</option>)}
              </select>

              <select
                value={filterSet}
                onChange={(e) => setFilterSet(e.target.value)}
                className="bg-white border-2 border-black p-1.5 text-xs font-black uppercase outline-none"
              >
                <option value="">ALL SETS</option>
                {sets.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <button
                onClick={() => {
                  setFilterClub('');
                  setFilterNationalTeam('');
                  setFilterPosition('');
                  setFilterYear('');
                  setFilterSet('');
                  setFilterRarity('');
                  setSearchQuery('');
                }}
                className="bg-black text-white hover:bg-neutral-800 text-xs font-black uppercase py-1.5 border-2 border-black transition-colors"
              >
                CLEAR FILTERS
              </button>
            </div>

            {/* Cards List Table */}
            <div className="overflow-x-auto border-2 border-black">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-100 border-b-2 border-black text-[10px] font-black uppercase tracking-wider">
                    <th className="p-3">CARD</th>
                    <th className="p-3">CLUB & NATION</th>
                    <th className="p-3">RARITY</th>
                    <th className="p-3 text-right">PRICE</th>
                    <th className="p-3 text-center">STOCK CONTROL</th>
                    <th className="p-3 text-center">MAX SUPPLY</th>
                    <th className="p-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black text-xs font-bold">
                  {filteredCards.slice(0, 50).map(card => {
                    const currentStock = card.stock ?? getDefaultStock(card);
                    const maxSupply = card.maxSupply ?? getDefaultMaxSupply(card);
                    const isOutOfStock = currentStock <= 0;
                    const cardClub = getCardClubTeam(card) || card.team;
                    const cardNation = getCardNationalTeam(card);

                    return (
                      <tr key={card.id} className={`hover:bg-neutral-50 transition-colors ${isOutOfStock ? 'bg-red-50/60' : ''}`}>
                        <td className="p-3 flex items-center gap-3">
                          <div className="w-10 h-14 bg-neutral-200 border border-black shrink-0 overflow-hidden relative">
                            {card.imageUrl ? (
                              <img src={card.imageUrl} alt={card.player} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[8px] font-black uppercase text-neutral-400">NO PIC</div>
                            )}
                          </div>
                          <div>
                            <div className="font-black uppercase text-sm">{card.player}</div>
                            <div className="text-[10px] font-mono text-neutral-500 uppercase">{card.cardNumber} • {card.year}</div>
                          </div>
                        </td>
                        <td className="p-3 uppercase">
                          <div className="font-black">{cardClub || '—'}</div>
                          {cardNation && (
                            <div className="text-[10px] text-neutral-600 font-bold flex items-center gap-1">
                              <span>{getNationalTeamFlag(cardNation)}</span>
                              <span>{cardNation}</span>
                            </div>
                          )}
                          <div className="text-[10px] text-neutral-400 font-mono">{card.position}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase border border-black inline-block ${
                            card.rarity === '1-of-1 Shield' ? 'bg-amber-400 text-black' :
                            card.rarity === 'Gold Autograph' ? 'bg-yellow-300 text-black' :
                            card.rarity === 'Silver Refractor' ? 'bg-slate-200 text-black' :
                            'bg-neutral-100 text-neutral-700'
                          }`}>
                            {card.rarity}
                          </span>
                        </td>
                        <td className="p-3 text-right font-black font-mono">
                          {formatCurrency(card.currentPrice)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-white border border-black p-1">
                            <button
                              onClick={() => handleQuickStockAdjust(card, -1)}
                              disabled={currentStock <= 0}
                              className="p-1 hover:bg-neutral-100 disabled:opacity-30 border border-black/20"
                            >
                              <Minus size={10} />
                            </button>
                            <span className={`font-mono font-black text-xs px-2 ${isOutOfStock ? 'text-red-600' : 'text-black'}`}>
                              {currentStock}
                            </span>
                            <button
                              onClick={() => handleQuickStockAdjust(card, 1)}
                              className="p-1 hover:bg-neutral-100 border border-black/20"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-neutral-600">
                          {maxSupply === 1 ? '1-OF-1' : maxSupply}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleEditCard(card)}
                            className="p-2 bg-white hover:bg-black hover:text-[#D4FF00] border-2 border-black transition-colors"
                            title="Edit Card Details"
                          >
                            <Edit2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredCards.length > 50 && (
              <p className="text-[10px] font-black text-neutral-400 text-center uppercase tracking-widest">
                SHOWING FIRST 50 OF {filteredCards.length} MATCHING CARDS. USE SEARCH OR FILTERS TO REFINE.
              </p>
            )}
          </div>
        )}

        {/* TAB 2: USER INVENTORY AUDIT & TRACKER */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                <Users size={20} /> REGISTERED USERS & HOLDINGS AUDIT
              </h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                Inspect user accounts, track which user owns which card, and view circulating supply.
              </p>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-neutral-50 border-2 border-black p-4">
                <span className="text-[10px] font-black uppercase text-neutral-500 block">TOTAL USERS</span>
                <span className="text-2xl font-black">{usersList.length}</span>
              </div>
              <div className="bg-neutral-50 border-2 border-black p-4">
                <span className="text-[10px] font-black uppercase text-neutral-500 block">TOTAL VAULTED CARDS</span>
                <span className="text-2xl font-black text-green-600">
                  {usersList.reduce((sum, u) => sum + (u.collectionIds?.length || 0), 0)}
                </span>
              </div>
              <div className="bg-neutral-50 border-2 border-black p-4">
                <span className="text-[10px] font-black uppercase text-neutral-500 block">TOTAL CIRCULATING WALLET BALANCES</span>
                <span className="text-2xl font-black text-[#D4AF37]">
                  {formatCurrency(usersList.reduce((sum, u) => sum + (u.walletBalance || 0), 0))}
                </span>
              </div>
            </div>

            {/* Search by Card to Find Holders */}
            <div className="bg-white border-2 border-black p-4 space-y-3">
              <span className="text-xs font-black uppercase tracking-widest block">FIND WHO OWNS A SPECIFIC CARD:</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="SEARCH CARD BY PLAYER OR NUMBER..."
                  value={cardHoldersSearch}
                  onChange={(e) => setCardHoldersSearch(e.target.value)}
                  className="flex-1 bg-neutral-50 border-2 border-black p-2 text-xs font-black uppercase"
                />
              </div>

              {cardHoldersSearch && (
                <div className="max-h-40 overflow-y-auto border border-black divide-y divide-black/20 bg-neutral-50">
                  {cards.filter(c => c.player.toLowerCase().includes(cardHoldersSearch.toLowerCase())).slice(0, 5).map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCardForHolders(c)}
                      className="w-full text-left p-2 hover:bg-[#D4FF00] hover:text-black flex items-center justify-between text-xs font-bold uppercase transition-colors"
                    >
                      <span>{c.player} ({c.cardNumber}) - {c.rarity}</span>
                      <span className="font-mono text-[10px]">Select</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedCardForHolders && (
                <div className="bg-neutral-100 border-2 border-black p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-black/20 pb-1">
                    <span className="font-black text-xs uppercase text-black">
                      HOLDERS OF: {selectedCardForHolders.player} ({selectedCardForHolders.cardNumber})
                    </span>
                    <button
                      onClick={() => setSelectedCardForHolders(null)}
                      className="text-xs font-black text-red-600 hover:underline"
                    >
                      CLEAR
                    </button>
                  </div>
                  {(() => {
                    const holders = usersList.filter(u => (u.collectionIds || []).includes(selectedCardForHolders.id));
                    if (holders.length === 0) {
                      return <p className="text-xs font-bold text-neutral-500 uppercase">NO USER CURRENTLY HOLDS THIS CARD IN THEIR VAULT.</p>;
                    }
                    return (
                      <div className="space-y-1">
                        {holders.map(h => {
                          const count = (h.collectionIds || []).filter(id => id === selectedCardForHolders.id).length;
                          return (
                            <div key={h.id} className="flex justify-between items-center bg-white border border-black p-2 text-xs font-bold">
                              <span className="truncate">{h.email}</span>
                              <span className="bg-[#D4FF00] text-black px-2 py-0.5 border border-black text-[10px] font-black">
                                OWNS {count} COPIES
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto border-2 border-black">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-100 border-b-2 border-black text-[10px] font-black uppercase tracking-wider">
                    <th className="p-3">USER EMAIL</th>
                    <th className="p-3 text-right">WALLET BALANCE</th>
                    <th className="p-3 text-center">CARDS IN VAULT</th>
                    <th className="p-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black text-xs font-bold">
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-neutral-500 uppercase font-black">Loading user holdings...</td>
                    </tr>
                  ) : usersList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-neutral-500 uppercase font-black">No registered users found.</td>
                    </tr>
                  ) : (
                    usersList.map(u => (
                      <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="p-3 font-mono font-black">{u.email}</td>
                        <td className="p-3 text-right font-mono font-black text-green-700">{formatCurrency(u.walletBalance || 0)}</td>
                        <td className="p-3 text-center font-mono font-black">{u.collectionIds?.length || 0}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="px-3 py-1 bg-black text-[#D4FF00] hover:bg-neutral-800 text-[10px] font-black uppercase border border-black transition-colors"
                          >
                            INSPECT VAULT
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PACK CONFIGURATION */}
        {activeTab === 'packs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                  <PackageCheck size={20} /> PACK SHOP CONFIGURATION
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Configure booster packs, cards per pack, drop rate odds, included editions, and custom cover posters.
                </p>
              </div>
              <button
                onClick={handleCreatePack}
                className="bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                <Plus size={16} /> CREATE NEW PACK
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {currentPacks.map(pack => (
                <div key={pack.id} className="bg-neutral-50 border-3 border-black p-5 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                  <div>
                    {/* Header Banner */}
                    <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                      <span className="font-black text-sm uppercase">{pack.name}</span>
                      <span className="bg-black text-[#D4FF00] text-[10px] font-mono font-black px-2 py-0.5 border border-black">
                        {formatCurrency(pack.price)}
                      </span>
                    </div>

                    {/* Poster Art Preview */}
                    <div className="w-full aspect-[750/1050] max-h-48 bg-neutral-200 border-2 border-black overflow-hidden relative mb-3 flex items-center justify-center">
                      {pack.coverPhotoUrl ? (
                        <img src={pack.coverPhotoUrl} alt={pack.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-neutral-400 p-4 text-center">
                          <PackageOpen size={36} />
                          <span className="text-[9px] font-black mt-1">NO POSTER ASSIGNED</span>
                        </div>
                      )}
                      {pack.badgeText && (
                        <span className="absolute top-2 right-2 bg-[#D4FF00] text-black text-[9px] font-black uppercase px-2 py-0.5 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          {pack.badgeText}
                        </span>
                      )}
                    </div>

                    {/* Meta stats */}
                    <div className="space-y-1.5 text-xs font-bold">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">CARDS PER PACK:</span>
                        <span className="font-mono">{pack.size} CARDS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">EDITION FILTER:</span>
                        <span className="font-mono text-right truncate max-w-[150px]">
                          {pack.editions && pack.editions.length > 0 ? pack.editions.join(', ') : 'ALL EDITIONS'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">1-OF-1 SHIELD ODDS:</span>
                        <span className="font-mono text-amber-600 font-black">{pack.rarityOdds?.shield ?? 1}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-black/20">
                    <button
                      onClick={() => handleEditPack(pack)}
                      className="flex-1 py-2 bg-white hover:bg-black hover:text-[#D4FF00] border-2 border-black text-xs font-black uppercase transition-colors flex items-center justify-center gap-1"
                    >
                      <Edit2 size={12} /> CONFIGURE
                    </button>
                    <button
                      onClick={() => handleDeletePack(pack)}
                      className="p-2 bg-red-100 hover:bg-red-600 hover:text-white border-2 border-red-600 text-red-600 text-xs font-black uppercase transition-colors"
                      title="Delete Pack"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CARD MAKER THEMES & TEMPLATES STUDIO */}
        {activeTab === 'themes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                  <Palette size={20} /> CUSTOM CARD MAKER THEME STUDIO
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Design official card templates, transparent foil overlay frames, club crest positions, and typography for the Card Creator.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSeedDefaultThemes}
                  disabled={isSeedingThemes}
                  className="bg-white hover:bg-neutral-100 text-black border-2 border-black px-3.5 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  title="Seed 5 official high-definition card themes into Firestore"
                >
                  <Sparkles size={14} /> {isSeedingThemes ? 'SEEDING...' : 'RESTORE OFFICIAL THEMES (5)'}
                </button>
                <button
                  onClick={handleCreateTheme}
                  className="bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                >
                  <Plus size={16} /> CREATE NEW THEME
                </button>
              </div>
            </div>

            {/* Quick Search and Status Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50 p-3 border-2 border-black">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-black uppercase tracking-wider">ACTIVE TEMPLATES:</span>
                <span className="bg-black text-[#D4FF00] px-2 py-0.5 text-xs font-mono font-black border border-black">
                  {themes.length} THEMES IN FIRESTORE
                </span>
              </div>
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="SEARCH THEMES..."
                  value={themeSearchQuery}
                  onChange={(e) => setThemeSearchQuery(e.target.value)}
                  className="w-full bg-white border-2 border-black pl-8 pr-3 py-1.5 text-xs font-black uppercase outline-none focus:border-[#D4FF00]"
                />
              </div>
            </div>

            {/* Themes Grid */}
            {filteredThemes.length === 0 ? (
              <div className="bg-neutral-50 border-2 border-dashed border-black p-12 text-center space-y-4">
                <Palette size={48} className="mx-auto text-neutral-400" />
                <h4 className="text-lg font-black uppercase tracking-wider">NO CARD THEMES FOUND</h4>
                <p className="text-xs font-bold text-neutral-500 uppercase max-w-md mx-auto">
                  There are currently no custom card themes in the database. Restore the official preset themes pack or create a brand new template.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={handleSeedDefaultThemes}
                    disabled={isSeedingThemes}
                    className="bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black border-2 border-black px-6 py-2.5 text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  >
                    ⚡ SEED 5 OFFICIAL THEMES
                  </button>
                  <button
                    onClick={handleCreateTheme}
                    className="bg-white hover:bg-neutral-100 text-black border-2 border-black px-6 py-2.5 text-xs font-black uppercase tracking-widest"
                  >
                    + CREATE THEME MANUALLY
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredThemes.map((theme) => (
                  <div key={theme.id} className="bg-neutral-50 border-3 border-black p-5 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                    <div>
                      {/* Theme Header */}
                      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                        <span className="font-black text-sm uppercase truncate pr-2">{theme.name}</span>
                        <span className="bg-black text-[#D4FF00] text-[9px] font-mono font-black px-2 py-0.5 border border-black shrink-0">
                          {theme.fontName || 'BEBAS'}
                        </span>
                      </div>

                      {/* Mini Live Preview Frame */}
                      <div className="w-full aspect-[750/1050] max-h-56 bg-neutral-900 border-2 border-black overflow-hidden relative mb-3 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]">
                        {/* Sample Player Photo */}
                        <img 
                          src="https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop" 
                          alt="Sample Player" 
                          className="absolute inset-0 w-full h-full object-cover" 
                        />
                        
                        {/* Transparent Overlay Frame */}
                        {theme.overlayImageUrl && (
                          <img 
                            src={theme.overlayImageUrl} 
                            alt={theme.name} 
                            className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none" 
                          />
                        )}

                        {/* Club Logo Slot */}
                        {theme.clubLogoUrl && (
                          <img 
                            src={theme.clubLogoUrl} 
                            alt="Club Crest" 
                            className="absolute object-contain z-20"
                            style={{
                              width: `${Math.max(20, (theme.clubLogoSize ?? 75) * 0.45)}px`,
                              height: `${Math.max(20, (theme.clubLogoSize ?? 75) * 0.45)}px`,
                              top: `${theme.clubLogoTop ?? 6}%`,
                              left: `${theme.clubLogoLeft ?? 6}%`
                            }}
                          />
                        )}

                        {/* Edition Badge Slot */}
                        {theme.editionLogoUrl && (
                          <img 
                            src={theme.editionLogoUrl} 
                            alt="Edition Badge" 
                            className="absolute object-contain z-20"
                            style={{
                              width: `${Math.max(20, (theme.editionLogoSize ?? 75) * 0.45)}px`,
                              height: `${Math.max(20, (theme.editionLogoSize ?? 75) * 0.45)}px`,
                              top: `${theme.editionLogoTop ?? 6}%`,
                              left: `${theme.editionLogoLeft ?? 80}%`
                            }}
                          />
                        )}

                        {/* Name Banner */}
                        <div 
                          className="absolute left-0 right-0 flex justify-center z-20"
                          style={{ bottom: `${theme.fontPositionBottom ?? 6.5}%` }}
                        >
                          <span 
                            style={{ 
                              fontFamily: theme.fontName ? `'${theme.fontName}', sans-serif` : 'inherit',
                              color: theme.fontColor || '#ffffff',
                              fontSize: `${Math.max(10, (theme.fontSize ?? 28) * 0.45)}px`,
                              transform: `scaleX(${theme.fontScaleX ?? 1}) scaleY(${theme.fontScaleY ?? 1})`,
                              transformOrigin: 'bottom center'
                            }}
                            className="uppercase whitespace-nowrap font-black tracking-wider text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                          >
                            PLAYER NAME
                          </span>
                        </div>
                      </div>

                      {/* Theme Specs List */}
                      <div className="space-y-1 text-[11px] font-bold">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">TYPOGRAPHY:</span>
                          <span className="font-mono text-black">{theme.fontName || 'DEFAULT'} • {theme.fontSize || 28}px</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-500">FONT COLOR:</span>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="w-3 h-3 border border-black inline-block" style={{ backgroundColor: theme.fontColor || '#fff' }} />
                            <span>{theme.fontColor || '#FFFFFF'}</span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">CLUB LOGO POS:</span>
                          <span className="font-mono">{theme.clubLogoTop ?? 6}% TOP, {theme.clubLogoLeft ?? 6}% LEFT</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex gap-2 pt-3 border-t border-black/20">
                      <button
                        onClick={() => handleEditTheme(theme)}
                        className="flex-1 py-2 bg-black text-[#D4FF00] hover:bg-neutral-800 border-2 border-black text-xs font-black uppercase transition-colors flex items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      >
                        <Edit2 size={12} /> EDIT STUDIO
                      </button>
                      <button
                        onClick={() => handleDuplicateTheme(theme)}
                        className="p-2 bg-white hover:bg-neutral-100 border-2 border-black text-xs font-black uppercase transition-colors"
                        title="Duplicate Theme"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteTheme(theme)}
                        className="p-2 bg-red-100 hover:bg-red-600 hover:text-white border-2 border-red-600 text-red-600 text-xs font-black uppercase transition-colors"
                        title="Delete Theme"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: TRANSACTION LOGS */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                  <History size={20} /> WALLET AUDIT & TRANSACTION LOGS
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Real-time blockchain-style ledger of all ARTCOIN top-ups, pack purchases, and card acquisitions.
                </p>
              </div>
              <button
                onClick={fetchTransactions}
                disabled={isLoadingTx}
                className="bg-neutral-100 hover:bg-black hover:text-[#D4FF00] border-2 border-black px-3.5 py-1.5 text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
              >
                <RefreshCw size={12} className={isLoadingTx ? "animate-spin" : ""} /> REFRESH LEDGER
              </button>
            </div>

            <div className="overflow-x-auto border-2 border-black">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-100 border-b-2 border-black text-[10px] font-black uppercase tracking-wider">
                    <th className="p-3">TIME</th>
                    <th className="p-3">USER</th>
                    <th className="p-3">TYPE</th>
                    <th className="p-3">DESCRIPTION</th>
                    <th className="p-3 text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black text-xs font-bold">
                  {isLoadingTx ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-neutral-500 uppercase font-black">Loading transactions...</td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-neutral-500 uppercase font-black">No transaction records found in ledger.</td>
                    </tr>
                  ) : (
                    transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="p-3 font-mono text-[10px] text-neutral-500">
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3 font-mono font-black">{tx.userEmail}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase border border-black inline-block ${
                            tx.type === 'top_up' ? 'bg-green-300 text-black' :
                            tx.type === 'buy_card' ? 'bg-[#D4FF00] text-black' :
                            tx.type === 'buy_pack' ? 'bg-amber-300 text-black' :
                            'bg-neutral-200 text-black'
                          }`}>
                            {tx.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3">{tx.description}</td>
                        <td className={`p-3 text-right font-mono font-black ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {tx.amount > 0 ? `+${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* THEME STUDIO & CARD MAKER FULL MODAL       */}
      {/* ========================================== */}
      {editingTheme && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white border-4 border-black p-4 sm:p-6 w-full max-w-5xl max-h-[92vh] overflow-y-auto space-y-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                  <Palette size={24} /> CARD MAKER THEME STUDIO
                </h3>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                  Configure transparent card overlay art, club crest anchors, edition badges, and typography.
                </p>
              </div>
              <button
                onClick={() => setEditingTheme(null)}
                className="p-1.5 hover:bg-neutral-100 border-2 border-black"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form Controls (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* 1. Theme Name & Identification */}
                <div className="space-y-2 bg-neutral-50 p-3.5 border-2 border-black">
                  <label className="block text-[10px] font-black uppercase text-neutral-600">
                    THEME TITLE / NAME
                  </label>
                  <input
                    type="text"
                    value={themeEditForm.name || ''}
                    onChange={(e) => setThemeEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. BALLON D'OR GOLD FOIL 2026"
                    className="w-full bg-white border-2 border-black p-2 text-xs font-black uppercase outline-none focus:border-[#D4FF00]"
                  />
                </div>

                {/* 2. Transparent Frame Overlay Artwork */}
                <div className="space-y-3 bg-neutral-50 p-3.5 border-2 border-black">
                  <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                    <span className="text-[10px] font-black uppercase text-neutral-700 flex items-center gap-1">
                      <ImageIcon size={14} /> TRANSPARENT CARD OVERLAY FRAME (PNG/SVG)
                    </span>
                  </div>

                  {/* Preset Overlay Buttons */}
                  <div>
                    <label className="block text-[9px] font-black uppercase text-neutral-500 mb-1.5">
                      CHOOSE FROM OFFICIAL PRESET FRAMES:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setThemeEditForm(prev => ({ ...prev, overlayImageUrl: PRESET_OVERLAYS.goldBallonDor }))}
                        className={`p-1.5 text-[9px] font-black uppercase border-2 border-black text-left transition-colors ${
                          themeEditForm.overlayImageUrl === PRESET_OVERLAYS.goldBallonDor ? 'bg-black text-[#D4FF00]' : 'bg-white hover:bg-neutral-100'
                        }`}
                      >
                        👑 GOLD BALLON D'OR
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemeEditForm(prev => ({ ...prev, overlayImageUrl: PRESET_OVERLAYS.cyberNeon }))}
                        className={`p-1.5 text-[9px] font-black uppercase border-2 border-black text-left transition-colors ${
                          themeEditForm.overlayImageUrl === PRESET_OVERLAYS.cyberNeon ? 'bg-black text-[#D4FF00]' : 'bg-white hover:bg-neutral-100'
                        }`}
                      >
                        ⚡ CYBER HOLOGRAPHIC
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemeEditForm(prev => ({ ...prev, overlayImageUrl: PRESET_OVERLAYS.sapphireUcl }))}
                        className={`p-1.5 text-[9px] font-black uppercase border-2 border-black text-left transition-colors ${
                          themeEditForm.overlayImageUrl === PRESET_OVERLAYS.sapphireUcl ? 'bg-black text-[#D4FF00]' : 'bg-white hover:bg-neutral-100'
                        }`}
                      >
                        💎 UCL SAPPHIRE
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemeEditForm(prev => ({ ...prev, overlayImageUrl: PRESET_OVERLAYS.obsidianShield }))}
                        className={`p-1.5 text-[9px] font-black uppercase border-2 border-black text-left transition-colors ${
                          themeEditForm.overlayImageUrl === PRESET_OVERLAYS.obsidianShield ? 'bg-black text-[#D4FF00]' : 'bg-white hover:bg-neutral-100'
                        }`}
                      >
                        🛡️ OBSIDIAN 1-OF-1
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemeEditForm(prev => ({ ...prev, overlayImageUrl: PRESET_OVERLAYS.vintageRetro }))}
                        className={`p-1.5 text-[9px] font-black uppercase border-2 border-black text-left transition-colors ${
                          themeEditForm.overlayImageUrl === PRESET_OVERLAYS.vintageRetro ? 'bg-black text-[#D4FF00]' : 'bg-white hover:bg-neutral-100'
                        }`}
                      >
                        📜 VINTAGE 1974
                      </button>
                    </div>
                  </div>

                  {/* Frame Image URL or Upload */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-500 mb-1">
                        IMAGE URL (TRANSPARENT PNG)
                      </label>
                      <input
                        type="text"
                        value={themeEditForm.overlayImageUrl || ''}
                        onChange={(e) => setThemeEditForm(prev => ({ ...prev, overlayImageUrl: e.target.value }))}
                        placeholder="https://.../frame.png"
                        className="w-full bg-white border-2 border-black p-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-500 mb-1">
                        OR UPLOAD TRANSPARENT PNG
                      </label>
                      <label className="flex items-center justify-center gap-1.5 bg-white hover:bg-neutral-100 border-2 border-black p-1.5 text-xs font-black uppercase cursor-pointer transition-colors">
                        <Upload size={12} />
                        UPLOAD PNG FRAME
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleOverlayFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* 3. Club Crest Logo Anchor Settings */}
                <div className="space-y-3 bg-neutral-50 p-3.5 border-2 border-black">
                  <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                    <span className="text-[10px] font-black uppercase text-neutral-700 flex items-center gap-1">
                      <Move size={14} /> DEFAULT CLUB CREST & POSITION ANCHOR
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-500 mb-1">
                        DEFAULT CLUB LOGO URL
                      </label>
                      <input
                        type="text"
                        value={themeEditForm.clubLogoUrl || ''}
                        onChange={(e) => setThemeEditForm(prev => ({ ...prev, clubLogoUrl: e.target.value }))}
                        placeholder="https://.../club-logo.png"
                        className="w-full bg-white border-2 border-black p-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-500 mb-1">
                        UPLOAD CLUB LOGO
                      </label>
                      <label className="flex items-center justify-center gap-1.5 bg-white hover:bg-neutral-100 border-2 border-black p-1.5 text-xs font-black uppercase cursor-pointer transition-colors">
                        <Upload size={12} />
                        CHOOSE LOGO PNG
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleClubLogoFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Sliders for Top, Left, Size */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="flex justify-between text-[9px] font-black text-neutral-500 mb-1">
                        <span>TOP %</span>
                        <span className="font-mono">{themeEditForm.clubLogoTop ?? 6}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="40"
                        value={themeEditForm.clubLogoTop ?? 6}
                        onChange={(e) => setThemeEditForm(prev => ({ ...prev, clubLogoTop: Number(e.target.value) }))}
                        className="w-full accent-[#D4FF00] cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] font-black text-neutral-500 mb-1">
                        <span>LEFT %</span>
                        <span className="font-mono">{themeEditForm.clubLogoLeft ?? 6}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={themeEditForm.clubLogoLeft ?? 6}
                        onChange={(e) => setThemeEditForm(prev => ({ ...prev, clubLogoLeft: Number(e.target.value) }))}
                        className="w-full accent-[#D4FF00] cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] font-black text-neutral-500 mb-1">
                        <span>SIZE (PX)</span>
                        <span className="font-mono">{themeEditForm.clubLogoSize ?? 75}px</span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="140"
                        value={themeEditForm.clubLogoSize ?? 75}
                        onChange={(e) => setThemeEditForm(prev => ({ ...prev, clubLogoSize: Number(e.target.value) }))}
                        className="w-full accent-[#D4FF00] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Edition Badge / Star Anchor Settings */}
                <div className="space-y-3 bg-neutral-50 p-3.5 border-2 border-black">
                  <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                    <span className="text-[10px] font-black uppercase text-neutral-700 flex items-center gap-1">
                      <Tag size={14} /> DEFAULT EDITION BADGE & POSITION ANCHOR
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-500 mb-1">
                        EDITION BADGE IMAGE URL
                      </label>
                      <input
                        type="text"
                        value={themeEditForm.editionLogoUrl || ''}
                        onChange={(e) => setThemeEditForm(prev => ({ ...prev, editionLogoUrl: e.target.value }))}
                        placeholder="https://.../edition-badge.png"
                        className="w-full bg-white border-2 border-black p-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-500 mb-1">
                        UPLOAD BADGE
                      </label>
                      <label className="flex items-center justify-center gap-1.5 bg-white hover:bg-neutral-100 border-2 border-black p-1.5 text-xs font-black uppercase cursor-pointer transition-colors">
                        <Upload size={12} />
                        CHOOSE BADGE PNG
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditionLogoFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Sliders for Top, Left, Size */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="flex justify-between text-[9px] font-black text-neutral-500 mb-1">
                        <span>TOP %</span>
                        <span className="font-mono">{themeEditForm.editionLogoTop ?? 6}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="40"
                        value={themeEditForm.editionLogoTop ?? 6}
                        onChange={(e) => setThemeEditForm(prev => ({ ...prev, editionLogoTop: Number(e.target.value) }))}
                        className="w-full accent-[#D4FF00] cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] font-black text-neutral-500 mb-1">
                        <span>LEFT %</span>
                        <span className="font-mono">{themeEditForm.editionLogoLeft ?? 80}%</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="95"
                        value={themeEditForm.editionLogoLeft ?? 80}
                        onChange={(e) => setThemeEditForm(prev => ({ ...prev, editionLogoLeft: Number(e.target.value) }))}
                        className="w-full accent-[#D4FF00] cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] font-black text-neutral-500 mb-1">
                        <span>SIZE (PX)</span>
                        <span className="font-mono">{themeEditForm.editionLogoSize ?? 75}px</span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="140"
                        value={themeEditForm.editionLogoSize ?? 75}
                        onChange={(e) => setThemeEditForm(prev => ({ ...prev, editionLogoSize: Number(e.target.value) }))}
                        className="w-full accent-[#D4FF00] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Typography & Jersey Font Settings */}
                <div className="space-y-3 bg-neutral-50 p-3.5 border-2 border-black">
                  <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                    <span className="text-[10px] font-black uppercase text-neutral-700 flex items-center gap-1">
                      <Type size={14} /> PLAYER NAME TYPOGRAPHY & FONT STYLES
                    </span>
                  </div>

                  {/* Font Family Selection */}
                  <div>
                    <label className="block text-[9px] font-black uppercase text-neutral-500 mb-1.5">
                      OFFICIAL SPORTS CARD FONTS:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {AVAILABLE_FONTS.map(f => (
                        <button
                          key={f.name}
                          type="button"
                          onClick={() => setThemeEditForm(prev => ({ ...prev, fontName: f.name }))}
                          className={`p-1.5 border-2 border-black text-left transition-colors ${
                            themeEditForm.fontName === f.name ? 'bg-black text-[#D4FF00]' : 'bg-white hover:bg-neutral-100'
                          }`}
                        >
                          <span className="block text-[10px] font-black uppercase truncate" style={{ fontFamily: `'${f.name}', sans-serif` }}>
                            {f.sample}
                          </span>
                          <span className="block text-[7px] text-neutral-400 font-sans leading-tight">
                            {f.category}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Font Upload */}
                  <div>
                    <label className="block text-[9px] font-black uppercase text-neutral-500 mb-1">
                      OR UPLOAD BESPOKE FONT FILE (.TTF / .WOFF)
                    </label>
                    <label className="flex items-center justify-center gap-1.5 bg-white hover:bg-neutral-100 border-2 border-black p-1.5 text-xs font-black uppercase cursor-pointer transition-colors">
                      <Upload size={12} />
                      {themeEditForm.fontBase64 ? `FONT UPLOADED: ${themeEditForm.fontName}` : 'CHOOSE CUSTOM FONT FILE'}
                      <input
                        type="file"
                        accept=".ttf,.woff,.woff2,.otf"
                        onChange={handleFontFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Font Controls: Color, Size, Bottom Offset, Scale */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-500 mb-1">
                        FONT COLOR (HEX)
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={themeEditForm.fontColor || '#FFFFFF'}
                          onChange={(e) => setThemeEditForm(prev => ({ ...prev, fontColor: e.target.value }))}
                          className="w-7 h-7 border border-black p-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={themeEditForm.fontColor || '#FFFFFF'}
                          onChange={(e) => setThemeEditForm(prev => ({ ...prev, fontColor: e.target.value }))}
                          className="w-full bg-white border border-black p-1 text-[10px] font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] font-black text-neutral-500 mb-1">
                        <span>SIZE (PX)</span>
                        <span className="font-mono">{themeEditForm.fontSize ?? 28}px</span>
                      </div>
                      <input
                        type="range"
                        min="16"
                        max="52"
                        value={themeEditForm.fontSize ?? 28}
                        onChange={(e) => setThemeEditForm(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                        className="w-full accent-[#D4FF00] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] font-black text-neutral-500 mb-1">
                        <span>BOTTOM %</span>
                        <span className="font-mono">{themeEditForm.fontPositionBottom ?? 6.5}%</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        step="0.5"
                        value={themeEditForm.fontPositionBottom ?? 6.5}
                        onChange={(e) => setThemeEditForm(prev => ({ ...prev, fontPositionBottom: Number(e.target.value) }))}
                        className="w-full accent-[#D4FF00] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[9px] font-black text-neutral-500 mb-1">
                        <span>SCALE X/Y</span>
                        <span className="font-mono">{themeEditForm.fontScaleX ?? 1}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.7"
                        max="1.5"
                        step="0.05"
                        value={themeEditForm.fontScaleX ?? 1}
                        onChange={(e) => setThemeEditForm(prev => ({ ...prev, fontScaleX: Number(e.target.value), fontScaleY: Number(e.target.value) }))}
                        className="w-full accent-[#D4FF00] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Interactive Preview Card (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-4 bg-neutral-100 p-4 border-2 border-black">
                <div className="w-full flex items-center justify-between border-b border-black/20 pb-2">
                  <span className="text-[10px] font-black uppercase text-neutral-700 flex items-center gap-1">
                    <Eye size={14} /> LIVE THEME CANVAS PREVIEW
                  </span>
                  <span className="text-[9px] font-mono bg-black text-[#D4FF00] px-1.5 py-0.5 border border-black">
                    750 × 1050
                  </span>
                </div>

                {/* Render Card */}
                <div className="w-full max-w-[280px] aspect-[750/1050] bg-neutral-900 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col justify-between select-none">
                  {/* Test Photo */}
                  <img
                    src={testPlayerPhoto}
                    alt="Test Player"
                    className="absolute inset-0 w-full h-full object-cover transition-transform"
                    style={{
                      transform: `scale(${testPhotoScale}) translate(${testPhotoOffsetX}px, ${testPhotoOffsetY}px)`
                    }}
                  />

                  {/* Theme Overlay Image */}
                  {themeEditForm.overlayImageUrl && (
                    <img
                      src={themeEditForm.overlayImageUrl}
                      alt="Overlay Frame"
                      className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
                    />
                  )}

                  {/* Club Logo */}
                  {themeEditForm.clubLogoUrl && (
                    <img
                      src={themeEditForm.clubLogoUrl}
                      alt="Club Logo"
                      className="absolute object-contain z-20"
                      style={{
                        width: `${themeEditForm.clubLogoSize ?? 75}px`,
                        height: `${themeEditForm.clubLogoSize ?? 75}px`,
                        top: `${themeEditForm.clubLogoTop ?? 6}%`,
                        left: `${themeEditForm.clubLogoLeft ?? 6}%`
                      }}
                    />
                  )}

                  {/* Edition Badge */}
                  {themeEditForm.editionLogoUrl && (
                    <img
                      src={themeEditForm.editionLogoUrl}
                      alt="Edition Badge"
                      className="absolute object-contain z-20"
                      style={{
                        width: `${themeEditForm.editionLogoSize ?? 75}px`,
                        height: `${themeEditForm.editionLogoSize ?? 75}px`,
                        top: `${themeEditForm.editionLogoTop ?? 6}%`,
                        left: `${themeEditForm.editionLogoLeft ?? 80}%`
                      }}
                    />
                  )}

                  {/* Player Name */}
                  <div
                    className="absolute left-0 right-0 flex justify-center z-20"
                    style={{ bottom: `${themeEditForm.fontPositionBottom ?? 6.5}%` }}
                  >
                    <span
                      style={{
                        fontFamily: themeEditForm.fontName ? `'${themeEditForm.fontName}', sans-serif` : 'inherit',
                        color: themeEditForm.fontColor || '#FFFFFF',
                        fontSize: `${themeEditForm.fontSize ?? 28}px`,
                        transform: `scaleX(${themeEditForm.fontScaleX ?? 1}) scaleY(${themeEditForm.fontScaleY ?? 1})`,
                        transformOrigin: 'bottom center'
                      }}
                      className="uppercase whitespace-nowrap font-black tracking-wider text-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                    >
                      {testPlayerName || 'PLAYER NAME'}
                    </span>
                  </div>
                </div>

                {/* Test Controls for Live Preview */}
                <div className="w-full bg-white border-2 border-black p-3 space-y-2">
                  <span className="text-[9px] font-black uppercase text-neutral-500 block">TEST INPUTS FOR LIVE PREVIEW:</span>
                  <div>
                    <label className="block text-[8px] font-black uppercase text-neutral-400">TEST PLAYER NAME</label>
                    <input
                      type="text"
                      value={testPlayerName}
                      onChange={(e) => setTestPlayerName(e.target.value)}
                      className="w-full bg-neutral-50 border border-black p-1 text-xs font-black uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase text-neutral-400">SAMPLE ATHLETE PHOTO</label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setTestPlayerPhoto('https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop')}
                        className="flex-1 py-1 text-[8px] font-black uppercase bg-neutral-100 hover:bg-black hover:text-[#D4FF00] border border-black"
                      >
                        PHOTO 1
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestPlayerPhoto('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop')}
                        className="flex-1 py-1 text-[8px] font-black uppercase bg-neutral-100 hover:bg-black hover:text-[#D4FF00] border border-black"
                      >
                        PHOTO 2
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestPlayerPhoto('https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=800&auto=format&fit=crop')}
                        className="flex-1 py-1 text-[8px] font-black uppercase bg-neutral-100 hover:bg-black hover:text-[#D4FF00] border border-black"
                      >
                        PHOTO 3
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t-2 border-black">
              <button
                type="button"
                onClick={() => setEditingTheme(null)}
                className="flex-1 py-3 bg-white hover:bg-neutral-100 border-2 border-black font-black uppercase text-xs transition-colors"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSaveTheme}
                disabled={isSavingTheme}
                className="flex-1 py-3 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] border-2 border-black font-black uppercase text-xs transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                {isSavingTheme ? 'SAVING THEME TO FIRESTORE...' : 'PUBLISH THEME TO CARD MAKER'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* USER VAULT INSPECTION MODAL               */}
      {/* ========================================== */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">VAULT AUDIT: {selectedUser.email}</h3>
                <p className="text-[10px] font-bold text-neutral-500 uppercase">
                  WALLET: {formatCurrency(selectedUser.walletBalance || 0)} • TOTAL CARDS: {selectedUser.collectionIds?.length || 0}
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 hover:bg-neutral-100 border border-black"
              >
                <X size={18} />
              </button>
            </div>

            {selectedUser.collectionIds && selectedUser.collectionIds.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {selectedUser.collectionIds.map((cardId, idx) => {
                  const card = cards.find(c => c.id === cardId);
                  return (
                    <div key={`${cardId}-${idx}`} className="bg-neutral-50 border-2 border-black p-2 text-center space-y-1">
                      <div className="w-full aspect-[750/1050] bg-neutral-200 border border-black overflow-hidden relative">
                        {card?.imageUrl ? (
                          <img src={card.imageUrl} alt={card?.player || 'Card'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[7px] font-black">NO IMAGE</div>
                        )}
                      </div>
                      <span className="block text-[9px] font-black uppercase truncate">{card?.player || cardId}</span>
                      <span className="block text-[8px] font-mono text-neutral-500">{card?.rarity || 'Card'}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-neutral-400 font-black uppercase text-xs border border-dashed border-neutral-300">
                USER HAS NO CARDS IN VAULT.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* EDIT CARD MODAL                            */}
      {/* ========================================== */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-6 sm:p-8 w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h3 className="text-xl font-black uppercase tracking-tighter">
                EDIT CARD STOCK & METRICS
              </h3>
              <button
                onClick={() => setEditingCard(null)}
                className="p-1 hover:bg-neutral-100 border border-black"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-black uppercase">
              <div>
                <label className="block text-neutral-500 text-[10px] mb-1">PLAYER NAME</label>
                <input
                  type="text"
                  name="player"
                  value={editForm.player || ''}
                  onChange={handleChange}
                  className="w-full bg-neutral-50 border-2 border-black p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-500 text-[10px] mb-1">CLUB TEAM</label>
                  <input
                    type="text"
                    name="team"
                    value={editForm.team || ''}
                    onChange={handleChange}
                    className="w-full bg-neutral-50 border-2 border-black p-2 uppercase"
                    placeholder="e.g. REAL MADRID"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 text-[10px] mb-1">NATIONAL TEAM (COUNTRY)</label>
                  <input
                    type="text"
                    name="nationalTeam"
                    value={editForm.nationalTeam || ''}
                    onChange={handleChange}
                    className="w-full bg-neutral-50 border-2 border-black p-2 uppercase"
                    placeholder="e.g. ARGENTINA"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-500 text-[10px] mb-1">PRICE (ARTCOIN)</label>
                  <input
                    type="number"
                    name="currentPrice"
                    value={editForm.currentPrice || 0}
                    onChange={handleChange}
                    className="w-full bg-neutral-50 border-2 border-black p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 text-[10px] mb-1">CURRENT STOCK</label>
                  <input
                    type="number"
                    name="stock"
                    value={editForm.stock ?? 0}
                    onChange={handleChange}
                    className="w-full bg-neutral-50 border-2 border-black p-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-500 text-[10px] mb-1">MAX SUPPLY LIMIT</label>
                  <input
                    type="number"
                    name="maxSupply"
                    value={editForm.maxSupply ?? 100}
                    onChange={handleChange}
                    className="w-full bg-neutral-50 border-2 border-black p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 text-[10px] mb-1">RARITY</label>
                  <select
                    name="rarity"
                    value={editForm.rarity || 'Base'}
                    onChange={handleChange}
                    className="w-full bg-neutral-50 border-2 border-black p-2"
                  >
                    {rarities.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingCard(null)}
                className="flex-1 py-3 bg-white hover:bg-neutral-100 border-2 border-black font-black uppercase text-xs transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={handleSaveCard}
                disabled={isSaving}
                className="flex-1 py-3 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] border-2 border-black font-black uppercase text-xs transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* EDIT PACK MODAL                            */}
      {/* ========================================== */}
      {editingPack && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white border-4 border-black p-4 sm:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] my-auto">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                  <PackageCheck size={24} /> CONFIGURE PACK: {packEditForm.name || 'NEW PACK'}
                </h3>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                  Fine-tune poster artwork, drop rate probabilities, edition pool, and card yields.
                </p>
              </div>
              <button
                onClick={() => setEditingPack(null)}
                className="p-1.5 hover:bg-neutral-100 border-2 border-black"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSavePack(); }} className="space-y-6">
              {/* Section 1: Basic Pack Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-neutral-50 p-4 border-2 border-black">
                <div className="sm:col-span-2">
                  <label className="block text-[9px] font-black uppercase text-neutral-600 mb-1">
                    PACK NAME
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={packEditForm.name || ''}
                    onChange={handleChangePack}
                    required
                    className="w-full bg-white border-2 border-black p-2 text-xs font-black uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-neutral-600 mb-1">
                    PRICE (ARTCOIN)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={packEditForm.price || 0}
                    onChange={handleChangePack}
                    required
                    className="w-full bg-white border-2 border-black p-2 font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-neutral-600 mb-1">
                    CARDS PER PACK
                  </label>
                  <input
                    type="number"
                    name="size"
                    value={packEditForm.size || 5}
                    onChange={handleChangePack}
                    required
                    className="w-full bg-white border-2 border-black p-2 font-mono text-xs font-bold"
                  />
                </div>
              </div>

              {/* Section 2: Edition Pool Filter */}
              <div className="border-2 border-black p-4 bg-neutral-50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/10 pb-2">
                  <div>
                    <span className="block text-[10px] font-black uppercase text-neutral-700">
                      EDITIONS INCLUDED IN THIS PACK POOL
                    </span>
                    <span className="text-[9px] font-bold text-neutral-500">
                      Choose which editions can be drawn from this pack.
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setPackEditForm(prev => ({ ...prev, editions: [] }))}
                      className={`text-[9px] font-black uppercase px-2.5 py-1 border border-black transition-colors ${
                        !packEditForm.editions || packEditForm.editions.length === 0
                          ? 'bg-black text-[#D4FF00]'
                          : 'bg-white text-black hover:bg-neutral-100'
                      }`}
                    >
                      ALL EDITIONS
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!packEditForm.editions || packEditForm.editions.length === 0) {
                          setPackEditForm(prev => ({ ...prev, editions: ['1st Edition'] }));
                        }
                      }}
                      className={`text-[9px] font-black uppercase px-2.5 py-1 border border-black transition-colors ${
                        packEditForm.editions && packEditForm.editions.length > 0
                          ? 'bg-[#D4FF00] text-black font-black'
                          : 'bg-white text-black hover:bg-neutral-100'
                      }`}
                    >
                      CUSTOM EDITIONS ONLY
                    </button>
                  </div>
                </div>

                {packEditForm.editions && packEditForm.editions.length > 0 ? (
                  <div className="space-y-3">
                    <span className="block text-[9px] font-black uppercase text-neutral-600">
                      SELECT INCLUDED EDITIONS FOR THIS PACK:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {allAvailableEditions.map(ed => {
                        const isSelected = (packEditForm.editions || []).includes(ed);
                        const countInDb = cards.filter(c => c.edition === ed).length;
                        return (
                          <button
                            key={ed}
                            type="button"
                            onClick={() => handleTogglePackEdition(ed)}
                            className={`p-2 border-2 border-black text-left flex items-center justify-between transition-colors text-xs font-black uppercase ${
                              isSelected ? 'bg-black text-[#D4FF00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black hover:bg-neutral-100'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              {isSelected ? <CheckSquare size={14} className="text-[#D4FF00] shrink-0" /> : <Square size={14} className="text-neutral-400 shrink-0" />}
                              <span className="truncate">{ed}</span>
                            </div>
                            <span className={`text-[9px] font-mono shrink-0 ml-1 px-1 py-0.2 border ${isSelected ? 'border-[#D4FF00]/40 text-neutral-300' : 'border-neutral-300 text-neutral-500'}`}>
                              {countInDb}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-black/10">
                      <input
                        type="text"
                        value={customEditionInput}
                        onChange={(e) => setCustomEditionInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomEdition(); } }}
                        placeholder="ADD CUSTOM EDITION NAME (e.g. WORLD CUP 2026)"
                        className="flex-1 bg-white border-2 border-black p-1.5 text-xs font-black uppercase"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomEdition}
                        className="bg-black text-[#D4FF00] hover:bg-neutral-800 px-3 py-1.5 text-xs font-black uppercase border-2 border-black shrink-0"
                      >
                        + ADD
                      </button>
                    </div>

                    <div className="bg-white border-2 border-black p-2.5 flex items-center justify-between text-xs font-black">
                      <span className="text-neutral-700 uppercase">
                        🎯 ELIGIBLE CARDS IN DATABASE:
                      </span>
                      <span className="bg-[#D4FF00] text-black px-2 py-0.5 border border-black font-mono">
                        {cards.filter(c => c.edition && (packEditForm.editions || []).includes(c.edition)).length} CARDS MATCH
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white border-2 border-black text-xs font-bold text-neutral-700 flex items-center justify-between">
                    <span className="uppercase">🌐 FULL DATABASE POOL (NO RESTRICTIONS):</span>
                    <span className="font-mono bg-black text-[#D4FF00] px-2 py-0.5 border border-black text-[11px] font-black">
                      {cards.length} TOTAL CARDS AVAILABLE
                    </span>
                  </div>
                )}
              </div>

              {/* Section 3: Pack Poster Artwork */}
              <div className="space-y-4 border-2 border-black p-4 bg-blue-50/40">
                <div className="flex items-center gap-2 border-b border-black/20 pb-2">
                  <ImageIcon size={16} className="text-black" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-black">
                      PACK POSTER & COVER ARTWORK
                    </h4>
                    <p className="text-[9px] font-bold text-neutral-600">
                      Provide an image URL, upload a custom poster file, or select a preset cover.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-3">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-600 mb-1">
                        POSTER IMAGE URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          name="coverPhotoUrl"
                          value={packEditForm.coverPhotoUrl || ''}
                          onChange={handleChangePack}
                          placeholder="https://example.com/pack-poster.jpg"
                          className="flex-1 bg-white border-2 border-black p-2 font-mono text-xs"
                        />
                        {packEditForm.coverPhotoUrl && (
                          <button
                            type="button"
                            onClick={() => setPackEditForm(prev => ({ ...prev, coverPhotoUrl: '' }))}
                            className="bg-red-100 hover:bg-red-600 hover:text-white text-red-600 border-2 border-red-600 px-2.5 text-xs font-black uppercase transition-colors"
                          >
                            REMOVE
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-600 mb-1">
                        OR UPLOAD FROM DEVICE
                      </label>
                      <label className="flex items-center justify-center gap-2 bg-white hover:bg-neutral-100 border-2 border-black p-2.5 font-black text-xs uppercase cursor-pointer transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <Upload size={14} />
                        CHOOSE POSTER IMAGE FILE
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePosterFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-600 mb-1.5">
                        QUICK PRESET POSTERS
                      </label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {presetPosters.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setPackEditForm(prev => ({ ...prev, coverPhotoUrl: preset.url }))}
                            className={`p-1 border-2 border-black text-center transition-all ${
                              packEditForm.coverPhotoUrl === preset.url
                                ? 'bg-black text-[#D4FF00] scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                : 'bg-white hover:bg-neutral-100'
                            }`}
                          >
                            <img src={preset.url} alt={preset.name} className="w-full aspect-[750/1050] object-cover border border-black/40 mb-1" />
                            <span className="block text-[7px] font-black uppercase leading-tight truncate">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase text-neutral-600 mb-1.5 flex items-center gap-1">
                        <Palette size={12} /> PACK FOIL BOX THEME
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {packThemes.map(theme => (
                          <button
                            key={theme.name}
                            type="button"
                            onClick={() => setPackEditForm(prev => ({ ...prev, color: theme.id }))}
                            className={`p-2 border-2 border-black text-[9px] font-black uppercase transition-all flex items-center justify-between ${theme.id} ${
                              packEditForm.color === theme.id ? 'ring-2 ring-black scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'opacity-85 hover:opacity-100'
                            }`}
                          >
                            <span className="truncate">{theme.name}</span>
                            {packEditForm.color === theme.id && <Check size={12} strokeWidth={3} className="shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3 bg-white border-2 border-black">
                    <span className="text-[9px] font-black uppercase text-neutral-500 mb-2">LIVE PACK POSTER PREVIEW</span>
                    <div className={`w-36 aspect-[750/1050] ${packEditForm.color || 'bg-white'} border-3 border-black p-2 flex flex-col justify-between items-center text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden`}>
                      <div className="w-full flex justify-between items-center text-[7px] font-black uppercase">
                        <span className="bg-black text-white px-1 py-0.2">{packEditForm.size || 5} CARDS</span>
                        <span className="font-bold">{formatCurrency(packEditForm.price || 0)}</span>
                      </div>

                      {packEditForm.coverPhotoUrl ? (
                        <img
                          src={packEditForm.coverPhotoUrl}
                          alt="Poster Preview"
                          className="w-24 aspect-[750/1050] object-cover border border-black my-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
                        />
                      ) : (
                        <div className="w-20 h-24 bg-black/10 border border-black flex flex-col items-center justify-center text-neutral-500">
                          <PackageOpen size={24} />
                          <span className="text-[6px] font-black mt-0.5">NO POSTER</span>
                        </div>
                      )}

                      <div className="w-full text-center">
                        <span className="block text-[8px] font-black uppercase truncate leading-tight">
                          {packEditForm.name || 'PACK TITLE'}
                        </span>
                        {packEditForm.badgeText && (
                          <span className="inline-block text-[6px] font-black bg-[#D4FF00] text-black px-1 border border-black mt-0.5">
                            {packEditForm.badgeText}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Drop Odds */}
              <div className="border-2 border-black p-4 bg-neutral-50 space-y-3">
                <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                  <span className="block text-[10px] font-black uppercase text-neutral-700">
                    DROP RATE ODDS DISTRIBUTION (%)
                  </span>
                  <span className={`text-[10px] font-mono font-black ${
                    ((packEditForm.rarityOdds?.base ?? 60) + (packEditForm.rarityOdds?.silver ?? 30) + (packEditForm.rarityOdds?.gold ?? 9) + (packEditForm.rarityOdds?.shield ?? 1)) === 100
                      ? 'text-green-600'
                      : 'text-amber-600'
                  }`}>
                    TOTAL: {(packEditForm.rarityOdds?.base ?? 60) + (packEditForm.rarityOdds?.silver ?? 30) + (packEditForm.rarityOdds?.gold ?? 9) + (packEditForm.rarityOdds?.shield ?? 1)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-neutral-500">BASE %</label>
                    <input
                      type="number"
                      value={packEditForm.rarityOdds?.base ?? 60}
                      onChange={(e) => handlePackOddsChange('base', Number(e.target.value))}
                      className="w-full bg-white border-2 border-black p-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-neutral-500">SILVER %</label>
                    <input
                      type="number"
                      value={packEditForm.rarityOdds?.silver ?? 30}
                      onChange={(e) => handlePackOddsChange('silver', Number(e.target.value))}
                      className="w-full bg-white border-2 border-black p-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-neutral-500">GOLD %</label>
                    <input
                      type="number"
                      value={packEditForm.rarityOdds?.gold ?? 9}
                      onChange={(e) => handlePackOddsChange('gold', Number(e.target.value))}
                      className="w-full bg-white border-2 border-black p-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-neutral-500">1-OF-1 %</label>
                    <input
                      type="number"
                      value={packEditForm.rarityOdds?.shield ?? 1}
                      onChange={(e) => handlePackOddsChange('shield', Number(e.target.value))}
                      className="w-full bg-white border-2 border-black p-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingPack(null)}
                  className="flex-1 py-3.5 bg-white hover:bg-neutral-100 border-2 border-black font-black uppercase text-xs transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3.5 bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] border-2 border-black font-black uppercase text-xs transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                >
                  {isSaving ? 'SAVING CONFIGURATION...' : 'SAVE PACK CONFIGURATION'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
