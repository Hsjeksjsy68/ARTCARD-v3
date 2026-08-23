import React, { useState, useRef, useEffect } from 'react';
import { ImagePlus, Download, Sparkles, Sliders, Palette, Plus, ArrowRight } from 'lucide-react';
import { toPng } from 'html-to-image';
import { db, doc, setDoc } from '../lib/firebase';
import { DEFAULT_OFFICIAL_THEMES } from '../lib/themePresets';
import { extractPlayerNameFromFileName } from '../lib/teams';

interface CustomCardProps {
  themes: any[];
  isAdmin?: boolean;
  onOpenAdminThemes?: () => void;
}

export function CustomCard({ themes, isAdmin = false, onOpenAdminThemes }: CustomCardProps) {
  const [formData, setFormData] = useState({
    player: 'CUSTOM PLAYER',
    themeId: '',
  });
  
  const [imageUrl, setImageUrl] = useState<string>('https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop');
  const [imageScale, setImageScale] = useState(1);
  const [imageOffsetX, setImageOffsetX] = useState(0);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const [userClubLogoUrl, setUserClubLogoUrl] = useState<string>('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const clubLogoInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Set default theme when themes load
  useEffect(() => {
    if (themes.length > 0) {
      if (!formData.themeId || !themes.some(t => t.id === formData.themeId)) {
        setFormData(prev => ({ ...prev, themeId: themes[0].id }));
      }
    }
  }, [themes, formData.themeId]);

  const selectedTheme = themes.find(t => t.id === formData.themeId) || (themes.length > 0 ? themes[0] : null);

  // Inject custom font if needed
  useEffect(() => {
    if (selectedTheme?.fontBase64 && selectedTheme?.fontName) {
      const styleId = `font-${selectedTheme.id}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          @font-face {
            font-family: '${selectedTheme.fontName}';
            src: url('${selectedTheme.fontBase64}') format('truetype');
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, [selectedTheme]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extractedName = extractPlayerNameFromFileName(file.name);
      if (extractedName) {
        setFormData(prev => ({
          ...prev,
          player: (!prev.player || prev.player === 'CUSTOM PLAYER') ? extractedName : prev.player
        }));
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClubLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserClubLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSeedOfficialThemes = async () => {
    setIsSeeding(true);
    try {
      const promises = DEFAULT_OFFICIAL_THEMES.map(theme => {
        return setDoc(doc(db, 'themes', theme.id), theme);
      });
      await Promise.all(promises);
      alert("Successfully loaded 5 official card maker themes!");
    } catch (err) {
      console.error("Error seeding themes:", err);
      alert("Failed to seed default themes.");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleDownload = async () => {
    if (cardRef.current === null) {
      return;
    }

    setIsGenerating(true);
    try {
      // Force font load wait if using custom font
      if (document.fonts) {
        await document.fonts.ready;
      }
      
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
      
      const link = document.createElement('a');
      link.download = `${formData.player.replace(/\s+/g, '_')}_custom_card.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download image', err);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const inputClasses = "w-full bg-white border-2 border-black focus:border-[#D4FF00] focus:ring-2 focus:ring-[#D4FF00] text-black px-4 py-3 outline-none transition-colors uppercase font-black text-sm";
  const labelClasses = "block text-xs font-black text-neutral-500 mb-2 uppercase tracking-widest";

  return (
    <div className="max-w-6xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Admin Quick Control Banner */}
      {isAdmin && (
        <div className="bg-[#D4FF00] border-3 border-black p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black text-[#D4FF00] border border-black shrink-0">
              <Sliders size={20} />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider block">
                👑 ADMIN CARD MAKER CONTROL ACTIVE
              </span>
              <span className="text-[10px] font-bold text-neutral-800 uppercase">
                Create new card templates, transparent foil overlays, crest positions, and custom typography in the Admin Studio.
              </span>
            </div>
          </div>
          <button
            onClick={onOpenAdminThemes}
            className="w-full sm:w-auto bg-black text-[#D4FF00] hover:bg-neutral-900 px-5 py-2.5 text-xs font-black uppercase tracking-widest border-2 border-black shrink-0 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
          >
            <Palette size={15} /> OPEN THEME STUDIO & CONTROLS <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Page Title */}
      <div className="text-center space-y-2">
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">CUSTOM CARD CREATOR</h2>
        <p className="text-neutral-500 font-black uppercase tracking-widest text-xs sm:text-sm">
          Design and export high-definition football cards with official holographic themes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Form Section (7 cols) */}
        <div className="lg:col-span-7 bg-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
          <h3 className="text-2xl font-black uppercase tracking-tighter border-b-2 border-black pb-3">
            CARD CUSTOMIZATION
          </h3>
          
          <div className="space-y-6">
            {/* Theme Selector */}
            <div>
              <label className={labelClasses}>CHOOSE CARD THEME TEMPLATE</label>
              {themes.length > 0 ? (
                <div className="space-y-3">
                  <select
                    name="themeId"
                    value={formData.themeId}
                    onChange={handleChange}
                    className={inputClasses}
                  >
                    {themes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>

                  {/* Theme Quick Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {themes.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, themeId: t.id }))}
                        className={`p-2 border-2 border-black text-left transition-all ${
                          formData.themeId === t.id
                            ? 'bg-black text-[#D4FF00] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black'
                            : 'bg-neutral-50 text-black hover:bg-neutral-100 font-bold'
                        }`}
                      >
                        <span className="block text-[10px] uppercase truncate">{t.name}</span>
                        <span className="block text-[8px] font-mono opacity-80">{t.fontName || 'Bebas'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 border-2 border-dashed border-black bg-neutral-50 text-center space-y-3">
                  <p className="text-xs font-black text-neutral-600 uppercase">
                    NO CARD THEMES CONFIGURED IN DATABASE YET.
                  </p>
                  {isAdmin ? (
                    <button
                      onClick={handleSeedOfficialThemes}
                      disabled={isSeeding}
                      className="bg-[#D4FF00] text-black border-2 border-black px-4 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-[#D4FF00] transition-colors"
                    >
                      {isSeeding ? 'SEEDING THEMES...' : '⚡ SEED 5 OFFICIAL STARTER THEMES'}
                    </button>
                  ) : (
                    <p className="text-[10px] text-neutral-400 font-bold uppercase">
                      Admin must create or seed themes in the control room.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Player Name */}
            <div>
              <label className={labelClasses}>PLAYER NAME</label>
              <input
                type="text"
                name="player"
                value={formData.player}
                onChange={handleChange}
                className={inputClasses}
                maxLength={25}
                placeholder="ENTER PLAYER NAME"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className={labelClasses}>YOUR ATHLETE PHOTO</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-36 border-2 border-dashed border-black bg-neutral-50 flex items-center justify-center cursor-pointer hover:bg-neutral-100 transition-colors relative overflow-hidden"
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="Preview" className="h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center text-neutral-400">
                    <ImagePlus size={32} className="mb-2" />
                    <span className="text-xs font-black uppercase tracking-widest">Upload Custom Photo</span>
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
              
              {imageUrl && (
                <div className="mt-3 space-y-3 bg-neutral-50 p-4 border-2 border-black">
                  <div className="flex justify-between items-center border-b-2 border-black pb-2">
                    <span className="text-xs font-black uppercase tracking-widest">POSITION & SCALE ATHLETE PHOTO</span>
                    <button 
                      type="button"
                      onClick={() => { setImageScale(1); setImageOffsetX(0); setImageOffsetY(0); }}
                      className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2.5 py-1 hover:bg-[#D4FF00] hover:text-black transition-colors"
                    >
                      RESET
                    </button>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black uppercase text-neutral-500">ZOOM</label>
                      <span className="text-xs font-mono font-black">{imageScale.toFixed(2)}x</span>
                    </div>
                    <input type="range" min="0.5" max="3" step="0.05" value={imageScale} onChange={e => setImageScale(Number(e.target.value))} className="w-full accent-emerald-600 bg-white cursor-pointer" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-black uppercase text-neutral-500">HORIZONTAL (LEFT-RIGHT)</label>
                        <span className="text-xs font-mono font-black">{imageOffsetX}px</span>
                      </div>
                      <input type="range" min="-300" max="300" value={imageOffsetX} onChange={e => setImageOffsetX(Number(e.target.value))} className="w-full accent-emerald-600 bg-white cursor-pointer" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-black uppercase text-neutral-500">VERTICAL (UP-DOWN)</label>
                        <span className="text-xs font-mono font-black">{imageOffsetY}px</span>
                      </div>
                      <input type="range" min="-300" max="300" value={imageOffsetY} onChange={e => setImageOffsetY(Number(e.target.value))} className="w-full accent-emerald-600 bg-white cursor-pointer" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Club Logo */}
            <div>
              <label className={labelClasses}>CUSTOM CLUB LOGO / CREST (OPTIONAL)</label>
              <div 
                onClick={() => clubLogoInputRef.current?.click()}
                className="w-full h-20 border-2 border-dashed border-black bg-neutral-50 flex items-center justify-center cursor-pointer hover:bg-neutral-100 transition-colors relative overflow-hidden"
              >
                {userClubLogoUrl ? (
                  <img src={userClubLogoUrl} alt="Club Logo Preview" className="h-full object-contain p-2" />
                ) : (
                  <div className="flex flex-col items-center text-neutral-400">
                    <ImagePlus size={20} className="mb-1" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Upload Custom Crest</span>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={clubLogoInputRef} 
                  onChange={handleClubLogoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>
            
            {/* Download Button */}
            <button 
              type="button"
              onClick={handleDownload}
              disabled={isGenerating}
              className="w-full font-black uppercase tracking-widest py-4 border-2 border-black transition-colors mt-6 text-base sm:text-lg bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black flex justify-center items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <Download size={22} /> {isGenerating ? 'RENDERING HIGH-RES CARD...' : 'DOWNLOAD HIGH-RES PNG'}
            </button>
          </div>
        </div>

        {/* Right: Live Preview Section (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center sticky top-28 space-y-4">
          <div className="w-full max-w-[340px]">
            <div className="mb-3 text-center">
              <span className="text-xs font-black uppercase tracking-widest text-neutral-700 bg-white px-4 py-2 border-2 border-black inline-flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Sparkles size={14} className="text-amber-500" /> LIVE CARD PREVIEW
              </span>
            </div>

            {/* Live Canvas Element */}
            <div className="pointer-events-none drop-shadow-2xl">
              <div 
                ref={cardRef} 
                className="relative aspect-[750/1050] bg-neutral-950 border-4 border-black overflow-hidden flex flex-col justify-between select-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
              >
                {/* User Photo (Background) */}
                {imageUrl && (
                  <img 
                    src={imageUrl} 
                    alt={formData.player}
                    className="absolute z-0 max-w-none" 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: `translate(${imageOffsetX}px, ${imageOffsetY}px) scale(${imageScale})`
                    }}
                  />
                )}
                
                {/* Theme Overlay */}
                {selectedTheme?.overlayImageUrl && (
                  <img 
                    src={selectedTheme.overlayImageUrl} 
                    alt={selectedTheme.name}
                    className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none" 
                  />
                )}

                {/* Club Logo */}
                {(userClubLogoUrl || selectedTheme?.clubLogoUrl) && (
                  <img 
                    src={userClubLogoUrl || selectedTheme?.clubLogoUrl} 
                    alt="Club Crest"
                    className="absolute object-contain z-20" 
                    style={{
                      width: `${selectedTheme?.clubLogoSize ?? 75}px`,
                      height: `${selectedTheme?.clubLogoSize ?? 75}px`,
                      top: `${selectedTheme?.clubLogoTop ?? 6}%`,
                      left: `${selectedTheme?.clubLogoLeft ?? 6}%`
                    }}
                  />
                )}

                {/* Edition Logo */}
                {selectedTheme?.editionLogoUrl && (
                  <img 
                    src={selectedTheme.editionLogoUrl} 
                    alt="Edition Badge"
                    className="absolute object-contain z-20" 
                    style={{
                      width: `${selectedTheme.editionLogoSize ?? 75}px`,
                      height: `${selectedTheme.editionLogoSize ?? 75}px`,
                      top: `${selectedTheme.editionLogoTop ?? 6}%`,
                      left: `${selectedTheme.editionLogoLeft ?? 80}%`
                    }}
                  />
                )}

                {/* User Name */}
                <div 
                  className="absolute left-0 right-0 flex justify-center z-20"
                  style={{ bottom: `${selectedTheme?.fontPositionBottom ?? 6.5}%` }}
                >
                  <span 
                    style={{ 
                      fontFamily: selectedTheme?.fontName ? `'${selectedTheme.fontName}', sans-serif` : 'inherit',
                      color: selectedTheme?.fontColor || '#ffffff',
                      fontSize: `${selectedTheme?.fontSize ?? 28}px`,
                      transform: `scaleX(${selectedTheme?.fontScaleX ?? 1}) scaleY(${selectedTheme?.fontScaleY ?? 1})`,
                      transformOrigin: 'bottom center'
                    }}
                    className="uppercase whitespace-nowrap font-black tracking-wider text-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                  >
                    {formData.player || 'PLAYER NAME'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
