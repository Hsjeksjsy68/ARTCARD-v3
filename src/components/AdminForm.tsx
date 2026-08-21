import React, { useState, useRef } from 'react';
import { FootballCard, Rarity } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { ImagePlus, TrendingUp, Sparkles, CheckCircle } from 'lucide-react';
import { POPULAR_CLUBS, POPULAR_NATIONAL_TEAMS, getCardNationalTeam, getCardClubTeam, extractPlayerNameFromFileName } from '../lib/teams';

interface AdminFormProps {
  onAdd: (card: FootballCard) => void;
  totalCards: number;
  totalMarketCap: number;
  existingCards: FootballCard[];
}

export function AdminForm({ onAdd, totalCards, totalMarketCap, existingCards }: AdminFormProps) {
  const existingClubs = Array.from(new Set(existingCards.map(c => getCardClubTeam(c)).filter(Boolean)));
  const allClubsList = Array.from(new Set([...existingClubs, ...POPULAR_CLUBS])).sort();
  
  const existingNations = Array.from(new Set(existingCards.map(c => getCardNationalTeam(c)).filter(Boolean)));
  const allNationsList = Array.from(new Set([...existingNations, ...POPULAR_NATIONAL_TEAMS.map(n => n.name)])).sort();

  const uniquePositions = Array.from(new Set(existingCards.map(c => c.position).filter(Boolean))).sort();
  const uniqueYears = Array.from(new Set(existingCards.map(c => c.year).filter(Boolean))).sort((a, b) => b - a);
  const uniqueSets = Array.from(new Set(existingCards.map(c => c.set).filter(Boolean))).sort();
  const uniqueEditions = Array.from(new Set(existingCards.map(c => c.edition).filter(Boolean))).sort();
  const uniqueCardNumbers = Array.from(new Set(existingCards.map(c => c.cardNumber).filter(Boolean))).sort();

  const [formData, setFormData] = useState({
    player: '',
    team: '', // Club team
    nationalTeam: '', // National team
    position: '',
    year: '',
    set: '',
    edition: '',
    rarity: 'Base' as Rarity,
    cardNumber: '',
    currentPrice: '',
    stock: '50',
    maxSupply: '50'
  });
  
  const [imageUrl, setImageUrl] = useState<string>('');
  const [detectedInfo, setDetectedInfo] = useState<{ fileName: string; playerName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate simple price history
    const history = [];
    const basePrice = Number(formData.currentPrice);
    const now = new Date();
    
    // Add only the initial price
    history.push({
      date: now.toISOString(),
      price: basePrice
    });

    // Determine gradient based on rarity
    let gradient = 'from-zinc-300 via-gray-400 to-zinc-300';
    if (formData.rarity === 'Gold Autograph') gradient = 'from-amber-300 via-yellow-500 to-amber-700';
    if (formData.rarity === '1-of-1 Shield') gradient = 'from-zinc-900 via-zinc-600 to-zinc-900';
    if (formData.rarity === 'Silver Refractor') gradient = 'from-slate-200 via-gray-300 to-slate-200';

    const stockNum = formData.rarity === '1-of-1 Shield' ? 1 : parseInt(formData.stock, 10) || 50;
    const maxSupplyNum = formData.rarity === '1-of-1 Shield' ? 1 : parseInt(formData.maxSupply, 10) || 50;

    const newCard: FootballCard = {
      id: `custom-${Date.now()}`,
      player: formData.player,
      team: formData.team, // Club Team
      club: formData.team,
      nationalTeam: formData.nationalTeam || undefined,
      position: formData.position,
      year: parseInt(formData.year, 10),
      set: formData.set,
      edition: formData.edition,
      rarity: formData.rarity,
      cardNumber: formData.cardNumber,
      imageGradient: gradient,
      priceHistory: history,
      currentPrice: basePrice,
      stock: stockNum,
      maxSupply: maxSupplyNum
    };

    if (imageUrl) {
      newCard.imageUrl = imageUrl;
    }

    onAdd(newCard);
    
    // Reset form
    setFormData({
      player: '',
      team: '',
      nationalTeam: '',
      position: '',
      year: '',
      set: '',
      edition: '',
      rarity: 'Base',
      cardNumber: '',
      currentPrice: '',
      stock: '50',
      maxSupply: '50'
    });
    setImageUrl('');
    setDetectedInfo(null);
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Auto identify player name from image filename
      // e.g. "Ruud_Gullit_custom_card.png" -> "RUUD GULLIT"
      const extractedName = extractPlayerNameFromFileName(file.name);
      if (extractedName) {
        const detectedNation = getCardNationalTeam({ player: extractedName });
        setDetectedInfo({
          fileName: file.name,
          playerName: extractedName
        });
        setFormData(prev => ({
          ...prev,
          player: extractedName,
          nationalTeam: prev.nationalTeam ? prev.nationalTeam : (detectedNation || '')
        }));
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.7 quality
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setImageUrl(compressedDataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const inputClasses = "w-full bg-white border-2 border-black focus:border-[#D4FF00] focus:ring-2 focus:ring-[#D4FF00] text-black px-4 py-3 outline-none transition-colors uppercase font-black text-sm";
  const labelClasses = "block text-xs font-black text-neutral-500 mb-2 uppercase tracking-widest";

  return (
    <div className="space-y-8">
      {/* Dashboard Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black text-white p-6 border-2 border-black">
          <p className="text-xs font-black text-neutral-400 mb-2 uppercase tracking-widest">Total Cards</p>
          <p className="text-4xl font-black tracking-tighter text-[#D4FF00]">{totalCards}</p>
        </div>
        <div className="bg-[#D4FF00] text-black p-6 border-2 border-black">
          <p className="text-xs font-black text-black/60 mb-2 uppercase tracking-widest">Total Market Cap (৳)</p>
          <div className="flex items-center gap-2">
            <TrendingUp size={24} />
            <p className="text-3xl font-black tracking-tighter">{formatCurrency(totalMarketCap)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-black mb-6 border-b-2 border-black pb-4">
          Add New Card
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          
          {/* Image Upload Area */}
          <div>
             <div className="flex items-center justify-between mb-2">
               <label className={labelClasses}>Card Image</label>
               <span className="text-[10px] font-black text-neutral-400 uppercase">
                 Auto-detects player name from filename
               </span>
             </div>
             <div 
               onClick={() => fileInputRef.current?.click()}
               className="w-full h-40 border-2 border-dashed border-black bg-neutral-50 flex items-center justify-center cursor-pointer hover:bg-neutral-100 transition-colors relative overflow-hidden"
             >
               {imageUrl ? (
                 <img src={imageUrl} alt="Preview" className="h-full object-contain mix-blend-multiply" />
               ) : (
                 <div className="flex flex-col items-center text-neutral-400">
                   <ImagePlus size={32} className="mb-2" />
                   <span className="text-sm font-black uppercase tracking-widest">Upload Image</span>
                   <span className="text-[10px] text-neutral-400 mt-1 uppercase font-bold">e.g. Ruud_Gullit_custom_card.png</span>
                 </div>
               )}
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 onChange={handleImageUpload} 
                 accept="image/*" 
                 className="hidden" 
               />
             </div>

             {detectedInfo && (
               <div className="mt-2.5 p-2.5 bg-[#D4FF00]/20 border-2 border-black flex items-center justify-between gap-2 text-xs font-black uppercase">
                 <div className="flex items-center gap-2 truncate">
                   <Sparkles size={16} className="text-black shrink-0" />
                   <span className="text-neutral-600 font-bold truncate">Filename: <span className="font-mono text-black">{detectedInfo.fileName}</span></span>
                   <span className="bg-black text-[#D4FF00] px-2 py-0.5 text-[10px] shrink-0">Identified: {detectedInfo.playerName}</span>
                 </div>
                 <CheckCircle size={16} className="text-black shrink-0" />
               </div>
             )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>Player Name</label>
              <input required type="text" name="player" value={formData.player} onChange={handleChange} className={inputClasses} placeholder="LIONEL MESSI" />
            </div>
            <div>
              <label className={labelClasses}>Club Team</label>
              <input required type="text" list="clubs-list" name="team" value={formData.team} onChange={handleChange} className={inputClasses} placeholder="INTER MIAMI CF" />
              <datalist id="clubs-list">
                {allClubsList.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div>
              <label className={labelClasses}>National Team (Country)</label>
              <input type="text" list="nations-list" name="nationalTeam" value={formData.nationalTeam} onChange={handleChange} className={inputClasses} placeholder="ARGENTINA" />
              <datalist id="nations-list">
                {allNationsList.map(n => <option key={n} value={n} />)}
              </datalist>
            </div>
            
            <div>
              <label className={labelClasses}>Position</label>
              <input required type="text" list="positions-list" name="position" value={formData.position} onChange={handleChange} className={inputClasses} placeholder="FWD" />
              <datalist id="positions-list">
                {uniquePositions.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>
            <div>
              <label className={labelClasses}>Year</label>
              <input required type="number" list="years-list" name="year" value={formData.year} onChange={handleChange} className={inputClasses} placeholder="2024" />
              <datalist id="years-list">
                {uniqueYears.map(y => <option key={y} value={y} />)}
              </datalist>
            </div>
            <div>
              <label className={labelClasses}>Set / Brand</label>
              <input required type="text" list="sets-list" name="set" value={formData.set} onChange={handleChange} className={inputClasses} placeholder="TOPPS CHROME" />
              <datalist id="sets-list">
                {uniqueSets.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <label className={labelClasses}>Card Number</label>
              <input required type="text" list="cardNumbers-list" name="cardNumber" value={formData.cardNumber} onChange={handleChange} className={inputClasses} placeholder="TC-LM" />
              <datalist id="cardNumbers-list">
                {uniqueCardNumbers.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            
            <div>
              <label className={labelClasses}>Edition</label>
              <input required type="text" list="editions-list" name="edition" value={formData.edition} onChange={handleChange} className={inputClasses} placeholder="1st Edition" />
              <datalist id="editions-list">
                {uniqueEditions.map(e => <option key={e} value={e} />)}
              </datalist>
            </div>
            <div>
              <label className={labelClasses}>Rarity</label>
              <select name="rarity" value={formData.rarity} onChange={handleChange} className={inputClasses}>
                <option value="Base">Base</option>
                <option value="Silver Refractor">Silver Refractor</option>
                <option value="Gold Autograph">Gold Autograph</option>
                <option value="1-of-1 Shield">1-of-1 Shield</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>Market Price (৳)</label>
              <input required type="number" min="0" step="1" name="currentPrice" value={formData.currentPrice} onChange={handleChange} className={inputClasses} placeholder="1000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClasses}>Initial Stock</label>
                <input required type="number" min="0" step="1" name="stock" value={formData.stock} onChange={handleChange} className={inputClasses} placeholder="50" />
              </div>
              <div>
                <label className={labelClasses}>Max Print Supply</label>
                <input required type="number" min="1" step="1" name="maxSupply" value={formData.maxSupply} onChange={handleChange} className={inputClasses} placeholder="50" />
              </div>
            </div>
          </div>


          <button 
            type="submit" 
            disabled={!imageUrl}
            className={`w-full font-black uppercase tracking-widest py-4 border-2 border-black transition-colors mt-8 text-lg ${
              !imageUrl ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed' : 'bg-[#D4FF00] hover:bg-black hover:text-white text-black'
            }`}
          >
            {imageUrl ? 'Publish Card to Database' : 'Upload Image to Publish'}
          </button>
        </form>
      </div>
    </div>
  );
}
