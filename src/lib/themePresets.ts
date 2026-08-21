import { CardTheme } from '../types';

// High-definition transparent SVG overlay frames encoded as Data URIs for instant rendering
export const PRESET_OVERLAYS = {
  goldBallonDor: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFF2A3" />
          <stop offset="30%" stop-color="#D4AF37" />
          <stop offset="50%" stop-color="#FFF8DC" />
          <stop offset="70%" stop-color="#AA771C" />
          <stop offset="100%" stop-color="#553A08" />
        </linearGradient>
        <linearGradient id="blackFade" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(0,0,0,0)" />
          <stop offset="60%" stop-color="rgba(0,0,0,0.4)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0.95)" />
        </linearGradient>
        <filter id="goldGlow">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#D4AF37" flood-opacity="0.6"/>
        </filter>
      </defs>
      
      <!-- Outer Card Metallic Foil Border -->
      <rect x="12" y="12" width="726" height="1026" rx="28" fill="none" stroke="url(#goldGrad)" stroke-width="18" />
      <rect x="26" y="26" width="698" height="998" rx="20" fill="none" stroke="#111" stroke-width="6" />
      <rect x="34" y="34" width="682" height="982" rx="16" fill="none" stroke="url(#goldGrad)" stroke-width="4" />
      
      <!-- Corner Bevel Ornaments -->
      <polygon points="12,70 70,12 34,12 12,34" fill="url(#goldGrad)" />
      <polygon points="738,70 680,12 716,12 738,34" fill="url(#goldGrad)" />
      <polygon points="12,980 70,1038 34,1038 12,1016" fill="url(#goldGrad)" />
      <polygon points="738,980 680,1038 716,1038 738,1016" fill="url(#goldGrad)" />
      
      <!-- Top Header Ribbon Plaque -->
      <path d="M 180,34 L 570,34 L 540,84 L 210,84 Z" fill="#0A0A0A" stroke="url(#goldGrad)" stroke-width="4" />
      <text x="375" y="68" font-family="'Space Grotesk', Impact, sans-serif" font-weight="900" font-size="22" fill="#D4AF37" text-anchor="middle" letter-spacing="8">BALLON D'OR EDITION</text>
      
      <!-- Bottom Vignette and Name Plaque Base -->
      <rect x="34" y="700" width="682" height="316" rx="16" fill="url(#blackFade)" />
      
      <!-- Bottom Name Frame Holder -->
      <polygon points="90,920 660,920 630,1000 120,1000" fill="#0A0A0A" stroke="url(#goldGrad)" stroke-width="5" filter="url(#goldGlow)" />
      <polygon points="110,930 640,930 618,990 132,990" fill="#141414" stroke="url(#goldGrad)" stroke-width="2" />
      
      <!-- Foil Holographic Star & Sheen Accents -->
      <circle cx="375" cy="920" r="14" fill="url(#goldGrad)" stroke="#000" stroke-width="3" />
      <polygon points="375,910 379,918 387,920 380,924 382,931 375,926 368,931 370,924 363,920 371,918" fill="#000" />
      
      <text x="375" y="1018" font-family="'Space Grotesk', sans-serif" font-weight="900" font-size="12" fill="#D4AF37" text-anchor="middle" letter-spacing="6">OFFICIAL ARTCARD COLLECTIBLE • 1/1 MASTERPIECE</text>
    </svg>
  `)}`,

  cyberNeon: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
      <defs>
        <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00F0FF" />
          <stop offset="50%" stop-color="#D4FF00" />
          <stop offset="100%" stop-color="#FF007A" />
        </linearGradient>
        <linearGradient id="cyberDark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(0,0,0,0)" />
          <stop offset="65%" stop-color="rgba(5,10,25,0.7)" />
          <stop offset="100%" stop-color="rgba(2,4,12,0.98)" />
        </linearGradient>
      </defs>
      
      <!-- Tech Cyber Border -->
      <rect x="14" y="14" width="722" height="1022" rx="20" fill="none" stroke="#00F0FF" stroke-width="10" />
      <rect x="28" y="28" width="694" height="994" rx="14" fill="none" stroke="#D4FF00" stroke-width="4" stroke-dasharray="24,12" />
      
      <!-- Angled Tech Brackets -->
      <polygon points="14,14 14,120 40,120 40,40 120,40 120,14" fill="#00F0FF" />
      <polygon points="736,14 736,120 710,120 710,40 630,40 630,14" fill="#FF007A" />
      <polygon points="14,1036 14,930 40,930 40,1010 120,1010 120,1036" fill="#D4FF00" />
      <polygon points="736,1036 736,930 710,930 710,1010 630,1010 630,1036" fill="#00F0FF" />
      
      <!-- Top Cyber Tag -->
      <polygon points="220,28 530,28 510,74 240,74" fill="#050C1A" stroke="#00F0FF" stroke-width="3" />
      <text x="375" y="60" font-family="'Orbitron', sans-serif" font-weight="900" font-size="18" fill="#D4FF00" text-anchor="middle" letter-spacing="6">HOLOGRAPHIC // CYBER EDITION</text>
      
      <!-- Bottom Shading -->
      <rect x="28" y="680" width="694" height="342" fill="url(#cyberDark)" />
      
      <!-- Nameplate Box -->
      <polygon points="70,915 680,915 650,995 100,995" fill="#030814" stroke="url(#cyberGrad)" stroke-width="5" />
      <line x1="80" y1="915" x2="670" y2="915" stroke="#D4FF00" stroke-width="3" />
      
      <text x="375" y="1018" font-family="'Orbitron', sans-serif" font-weight="700" font-size="11" fill="#00F0FF" text-anchor="middle" letter-spacing="5">SYSTEM VERIFIED // CYBER FOIL CARD</text>
    </svg>
  `)}`,

  sapphireUcl: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
      <defs>
        <linearGradient id="sapphireGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#E2F1FF" />
          <stop offset="30%" stop-color="#38BDF8" />
          <stop offset="70%" stop-color="#1D4ED8" />
          <stop offset="100%" stop-color="#0F172A" />
        </linearGradient>
        <linearGradient id="sapphireFade" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(0,0,0,0)" />
          <stop offset="65%" stop-color="rgba(10,25,60,0.7)" />
          <stop offset="100%" stop-color="rgba(2,6,23,0.96)" />
        </linearGradient>
      </defs>
      
      <!-- Sapphire Frame -->
      <rect x="14" y="14" width="722" height="1022" rx="24" fill="none" stroke="url(#sapphireGrad)" stroke-width="16" />
      <rect x="28" y="28" width="694" height="994" rx="16" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-opacity="0.8" />
      
      <!-- Top UCL Header Banner -->
      <polygon points="190,28 560,28 535,80 215,80" fill="#0F172A" stroke="#38BDF8" stroke-width="4" />
      <text x="375" y="62" font-family="'Montserrat', sans-serif" font-weight="900" font-size="20" fill="#FFFFFF" text-anchor="middle" letter-spacing="8">CHAMPIONS SAPPHIRE</text>
      
      <!-- Bottom Shading -->
      <rect x="28" y="690" width="694" height="332" fill="url(#sapphireFade)" />
      
      <!-- Nameplate Base -->
      <rect x="80" y="915" width="590" height="85" rx="14" fill="#0A1633" stroke="url(#sapphireGrad)" stroke-width="5" />
      <rect x="92" y="924" width="566" height="67" rx="8" fill="#020617" stroke="#38BDF8" stroke-width="2" />
      
      <text x="375" y="1018" font-family="'Montserrat', sans-serif" font-weight="800" font-size="11" fill="#93C5FD" text-anchor="middle" letter-spacing="6">UEFA CLUB COMPETITIONS OFFICIAL CARD</text>
    </svg>
  `)}`,

  obsidianShield: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
      <defs>
        <linearGradient id="shieldGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFEAA7" />
          <stop offset="50%" stop-color="#D4AF37" />
          <stop offset="100%" stop-color="#8E6715" />
        </linearGradient>
        <linearGradient id="obsidianFade" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(0,0,0,0)" />
          <stop offset="60%" stop-color="rgba(0,0,0,0.6)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0.98)" />
        </linearGradient>
      </defs>
      
      <!-- Stealth Armored Obsidian Frame -->
      <rect x="14" y="14" width="722" height="1022" rx="26" fill="none" stroke="#18181B" stroke-width="20" />
      <rect x="28" y="28" width="694" height="994" rx="18" fill="none" stroke="url(#shieldGold)" stroke-width="6" />
      
      <!-- Top Crown Ribbon -->
      <path d="M 230,28 L 520,28 L 490,76 L 260,76 Z" fill="#09090B" stroke="url(#shieldGold)" stroke-width="4" />
      <text x="375" y="60" font-family="'Anton', sans-serif" font-weight="900" font-size="22" fill="#D4AF37" text-anchor="middle" letter-spacing="8">1-OF-1 SHIELD EDITION</text>
      
      <!-- Bottom Dark Vignette -->
      <rect x="28" y="680" width="694" height="342" fill="url(#obsidianFade)" />
      
      <!-- Armored Shield Nameplate -->
      <polygon points="75,915 675,915 645,995 105,995" fill="#09090B" stroke="url(#shieldGold)" stroke-width="5" />
      <polygon points="90,924 660,924 635,986 115,986" fill="#18181B" stroke="#27272A" stroke-width="2" />
      
      <text x="375" y="1018" font-family="'Space Grotesk', sans-serif" font-weight="900" font-size="11" fill="#D4AF37" text-anchor="middle" letter-spacing="6">OBSIDIAN IMMORTAL VAULT ARTIFACT</text>
    </svg>
  `)}`,

  vintageRetro: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
      <defs>
        <linearGradient id="retroPaper" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFDF7" />
          <stop offset="100%" stop-color="#F2E8D5" />
        </linearGradient>
        <linearGradient id="retroFade" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(0,0,0,0)" />
          <stop offset="60%" stop-color="rgba(20,10,5,0.5)" />
          <stop offset="100%" stop-color="rgba(10,5,0,0.92)" />
        </linearGradient>
      </defs>
      
      <!-- Vintage Thick White & Crimson Card Border -->
      <rect x="14" y="14" width="722" height="1022" rx="16" fill="none" stroke="#F4ECE1" stroke-width="24" />
      <rect x="30" y="30" width="690" height="990" rx="10" fill="none" stroke="#991B1B" stroke-width="8" />
      <rect x="42" y="42" width="666" height="966" rx="6" fill="none" stroke="#D97706" stroke-width="3" />
      
      <!-- Top Heritage Arch Header -->
      <path d="M 180,42 Q 375,100 570,42 L 530,90 Q 375,130 220,90 Z" fill="#991B1B" stroke="#D97706" stroke-width="3" />
      <text x="375" y="78" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="20" fill="#FFFDF7" text-anchor="middle" letter-spacing="6">VINTAGE HERITAGE 1974</text>
      
      <!-- Bottom Vignette -->
      <rect x="42" y="710" width="666" height="298" fill="url(#retroFade)" />
      
      <!-- Classic Plaque -->
      <rect x="90" y="915" width="570" height="80" rx="8" fill="#F4ECE1" stroke="#991B1B" stroke-width="6" />
      <rect x="100" y="923" width="550" height="64" rx="4" fill="#991B1B" />
      
      <text x="375" y="1018" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="11" fill="#FFFDF7" text-anchor="middle" letter-spacing="6">ALL-STAR HERITAGE COLLECTION</text>
    </svg>
  `)}`
};

export const PRESET_LOGOS = {
  championsBall: 'https://images.unsplash.com/photo-1511886929837-354d827aae26?q=80&w=200&auto=format&fit=crop',
  shieldCrown: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=200&auto=format&fit=crop',
  firstEditionStar: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=200&auto=format&fit=crop'
};

export const DEFAULT_OFFICIAL_THEMES: CardTheme[] = [
  {
    id: 'theme_gold_ballon_dor',
    name: "BALLON D'OR GOLD FOIL",
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
  },
  {
    id: 'theme_cyberpunk_holographic',
    name: 'CYBERPUNK HOLOGRAPHIC NEON',
    overlayImageUrl: PRESET_OVERLAYS.cyberNeon,
    clubLogoUrl: PRESET_LOGOS.championsBall,
    clubLogoSize: 70,
    clubLogoTop: 6,
    clubLogoLeft: 6,
    editionLogoUrl: PRESET_LOGOS.firstEditionStar,
    editionLogoSize: 70,
    editionLogoTop: 6,
    editionLogoLeft: 80,
    fontName: 'Orbitron',
    fontColor: '#D4FF00',
    fontSize: 26,
    fontPositionBottom: 7,
    fontScaleX: 1,
    fontScaleY: 1.1
  },
  {
    id: 'theme_ucl_sapphire_refractor',
    name: 'UEFA CHAMPIONS SAPPHIRE',
    overlayImageUrl: PRESET_OVERLAYS.sapphireUcl,
    clubLogoUrl: PRESET_LOGOS.championsBall,
    clubLogoSize: 75,
    clubLogoTop: 6.5,
    clubLogoLeft: 6.5,
    editionLogoUrl: PRESET_LOGOS.firstEditionStar,
    editionLogoSize: 75,
    editionLogoTop: 6.5,
    editionLogoLeft: 80,
    fontName: 'Montserrat',
    fontColor: '#FFFFFF',
    fontSize: 28,
    fontPositionBottom: 6.5,
    fontScaleX: 1.1,
    fontScaleY: 1
  },
  {
    id: 'theme_obsidian_1_of_1',
    name: 'OBSIDIAN 1-OF-1 SHIELD',
    overlayImageUrl: PRESET_OVERLAYS.obsidianShield,
    clubLogoUrl: PRESET_LOGOS.shieldCrown,
    clubLogoSize: 80,
    clubLogoTop: 6,
    clubLogoLeft: 6,
    editionLogoUrl: PRESET_LOGOS.firstEditionStar,
    editionLogoSize: 80,
    editionLogoTop: 6,
    editionLogoLeft: 78,
    fontName: 'Anton',
    fontColor: '#F59E0B',
    fontSize: 32,
    fontPositionBottom: 6,
    fontScaleX: 1,
    fontScaleY: 1.2
  },
  {
    id: 'theme_vintage_heritage_1974',
    name: 'VINTAGE HERITAGE 1974',
    overlayImageUrl: PRESET_OVERLAYS.vintageRetro,
    clubLogoUrl: PRESET_LOGOS.championsBall,
    clubLogoSize: 70,
    clubLogoTop: 7.5,
    clubLogoLeft: 7.5,
    editionLogoUrl: PRESET_LOGOS.firstEditionStar,
    editionLogoSize: 70,
    editionLogoTop: 7.5,
    editionLogoLeft: 78,
    fontName: 'Cinzel',
    fontColor: '#FFFDF7',
    fontSize: 26,
    fontPositionBottom: 6.8,
    fontScaleX: 1.05,
    fontScaleY: 1
  }
];

export const AVAILABLE_FONTS = [
  { name: 'Bebas Neue', sample: 'BEBAS NEUE', category: 'Bold Sports Cond' },
  { name: 'Anton', sample: 'ANTON HEAVY', category: 'Extra Bold Impact' },
  { name: 'Montserrat', sample: 'MONTSERRAT', category: 'Modern Geometric' },
  { name: 'Orbitron', sample: 'ORBITRON', category: 'Futuristic Cyber' },
  { name: 'Cinzel', sample: 'CINZEL ROYAL', category: 'Classic Serif' },
  { name: 'Righteous', sample: 'RIGHTEOUS', category: 'Retro Bold' },
  { name: 'Teko', sample: 'TEKO TALL', category: 'Ultra Condensed' },
  { name: 'Outfit', sample: 'OUTFIT', category: 'Clean Contemporary' },
  { name: 'Space Grotesk', sample: 'SPACE GROTESK', category: 'Tech Monospace' }
];
