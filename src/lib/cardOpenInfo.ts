import { FootballCard, CardOpenInfoData, Rarity, PackAnimationStyle } from '../types';

export interface CardOpenInfoSpec {
  rarity: Rarity;
  badge: string;
  serialTag: string;
  printRun: string;
  authenticityCode: string;
  rarityTitle: string;
  tagline: string;
  tierScore: string;
  hologramType: string;
  soundProfile: string;
  centeringGrade: string;
  cornersGrade: string;
  edgesGrade: string;
  surfaceGrade: string;
  overallGrade: string;
  vaultStatus: string;
  accentColor: string;
  borderColor: string;
  badgeBg: string;
  bgGlow: string;
  features: string[];
}

// Generate rich Card Open Info specs dynamically for any drawn card
export function getCardOpenInfo(card: FootballCard): CardOpenInfoSpec {
  const hashSeed = Math.abs(
    (card.id || 'card')
      .split('')
      .reduce((acc, char) => acc * 31 + char.charCodeAt(0), 7)
  );

  const hashSuffix = (hashSeed % 99999).toString().padStart(5, '0');
  const serialNumber = (hashSeed % 199) + 1;

  if (card.rarity === '1-of-1 Shield') {
    return {
      rarity: '1-of-1 Shield',
      badge: '👑 1-OF-1 MYTHIC SHIELD',
      serialTag: 'SERIAL #01/01 • UNIQUE IN THE WORLD',
      printRun: '1 OF 1 WORLDWIDE ARCHIVE',
      authenticityCode: `ARTCARD-SHIELD-1OF1-${hashSuffix}`,
      rarityTitle: 'MYTHIC SHIELD • 1-OF-1 MASTERWORK',
      tagline: 'The absolute pinnacle of the collection. One-of-a-kind museum grade.',
      tierScore: 'TIER 0 • 0.01% ULTRA-LEGENDARY PULL',
      hologramType: 'OBSIDIAN PRISM REFRACTOR & GOLDEN EMBOSSED CREST',
      soundProfile: 'SEISMIC THUNDER CLAP, VOLT ARCS & CELESTIAL FANFARE',
      centeringGrade: '10/10 PERFECT GEM MINT',
      cornersGrade: '10/10 RAZOR SHARP',
      edgesGrade: '10/10 PRISTINE LASER-CUT',
      surfaceGrade: '10/10 FLAWLESS CHROMIUM',
      overallGrade: 'GEM MINT 10 (BLACK LABEL)',
      vaultStatus: 'PHYSICALLY & DIGITALLY VAULTED IN SWISS REPOSITORY',
      accentColor: '#D4FF00',
      borderColor: 'border-[#D4FF00]',
      badgeBg: 'bg-black text-[#D4FF00]',
      bgGlow: 'from-amber-400/20 via-[#D4FF00]/30 to-purple-950/40',
      features: [
        'Sole authentic digital & physical master copy worldwide',
        'Directly sealed in anti-tamper magnetic acrylic slab',
        'Official club crest and federation tamper seal embedded',
        'Eligible for instant physical redemption & insured Swiss vaulting'
      ]
    };
  }

  if (card.rarity === 'Gold Autograph') {
    return {
      rarity: 'Gold Autograph',
      badge: '🔥 CERTIFIED GOLD AUTOGRAPH',
      serialTag: `SERIAL #${(serialNumber % 25) + 1}/25 • GOLD STAMP`,
      printRun: 'LIMITED TO 25 NUMBERED COPIES',
      authenticityCode: `ARTCARD-GOLD-AUTO-${hashSuffix}`,
      rarityTitle: 'LEGENDARY GOLD AUTOGRAPH',
      tagline: 'Certified on-card player signature with liquid gold leaf foil trim.',
      tierScore: 'TIER 1 • 1.5% LEGENDARY RARITY',
      hologramType: '24K LIQUID GOLD FOIL LEAF & TAMPER WATERMARK',
      soundProfile: 'ROYAL BRASS TRUMPETS & GOLDEN DUST SHIMMER',
      centeringGrade: '9.5/10 GEM MINT',
      cornersGrade: '10/10 RAZOR SHARP',
      edgesGrade: '9.5/10 CLEAN BEVEL',
      surfaceGrade: '10/10 METALLIC GOLD SHEEN',
      overallGrade: 'GEM MINT 9.5+',
      vaultStatus: 'CERTIFIED IN DIGITAL LEDGER & COLLECTOR VAULT',
      accentColor: '#F59E0B',
      borderColor: 'border-amber-400',
      badgeBg: 'bg-amber-400 text-black',
      bgGlow: 'from-yellow-500/20 via-amber-400/30 to-black',
      features: [
        'Guaranteed authentic athlete on-card ink signature',
        'Individually serial-numbered hot-stamped gold foil badge',
        'High-density optical signature verification protocol',
        'Priority trade rating in the marketplace'
      ]
    };
  }

  if (card.rarity === 'Silver Refractor') {
    return {
      rarity: 'Silver Refractor',
      badge: '✨ PRISMATIC SILVER REFRACTOR',
      serialTag: `SERIAL #${serialNumber}/199 • CHROME COATING`,
      printRun: 'LIMITED TO 199 NUMBERED COPIES',
      authenticityCode: `ARTCARD-REFRACTOR-${hashSuffix}`,
      rarityTitle: 'PREMIUM SILVER REFRACTOR',
      tagline: 'Light-diffracting prismatic chrome finish reflecting rainbow spectrums.',
      tierScore: 'TIER 2 • 12.0% PREMIUM REFRACTOR',
      hologramType: 'DIAMOND PRISM CHROMIUM WAVE REFRACTION',
      soundProfile: 'HIGH-TECH LASER SWEEP & CRYSTALLINE CHIMES',
      centeringGrade: '9.5/10 NEAR-PERFECT',
      cornersGrade: '9.5/10 CRISP CORNERS',
      edgesGrade: '9.5/10 METALLIC CLEAN',
      surfaceGrade: '9.5/10 SCRATCH-RESISTANT CHROME',
      overallGrade: 'MINT 9.5',
      vaultStatus: 'REGISTERED IN COLLECTOR PORTFOLIO',
      accentColor: '#E2E8F0',
      borderColor: 'border-slate-300',
      badgeBg: 'bg-slate-200 text-black',
      bgGlow: 'from-blue-400/20 via-slate-200/20 to-indigo-950/30',
      features: [
        'Proprietary multi-angle rainbow spectral light refraction',
        'Reinforced chromium substrate layer prevents curling',
        'Official club serial archive registration',
        'High liquidity collectible across digital trade pools'
      ]
    };
  }

  // Default / Base Rarity
  return {
    rarity: 'Base',
    badge: '⚽ OFFICIAL BASE CATALOGUE',
    serialTag: `CATALOGUE #${card.id.toUpperCase().slice(0, 8)} • FIRST PRINT`,
    printRun: 'STANDARD CIRCULATION BASE SET',
    authenticityCode: `ARTCARD-BASE-${hashSuffix}`,
    rarityTitle: 'OFFICIAL STANDARD BASE',
    tagline: 'Core release player card capturing iconic match day moments.',
    tierScore: 'STANDARD • 86.4% BASE DROP RATE',
    hologramType: 'TACTILE MATTE SILK COATING & ARTCARD EMBOSS',
    soundProfile: 'REFEREE WHISTLE, CRISP CARD SNAP & STADIUM PULSE',
    centeringGrade: '9.0/10 EXCELLENT',
    cornersGrade: '9.5/10 CRISP UNCIRCULATED',
    edgesGrade: '9.0/10 STANDARD CUT',
    surfaceGrade: '9.5/10 UNBLEMISHED MATTE',
    overallGrade: 'NEAR MINT 9.0',
    vaultStatus: 'STORED IN USER SQUAD INVENTORY',
    accentColor: '#FFFFFF',
    borderColor: 'border-neutral-500',
    badgeBg: 'bg-white text-black',
    bgGlow: 'from-neutral-700/20 via-neutral-800/30 to-black',
    features: [
      'Official licensed player portrait and match-day statistics',
      'Original rookie or veteran edition designation',
      'Seamless digital binder integration & team chemistry building',
      'Immediate trading & squad builder eligibility'
    ]
  };
}

// Animation metadata specs for admin selector
export interface AnimationStyleOption {
  id: PackAnimationStyle;
  name: string;
  tag: string;
  description: string;
  visualTheme: string;
  primaryColor: string;
  soundDescription: string;
  demoCardRarity: Rarity;
}

export const ANIMATION_STYLE_OPTIONS: AnimationStyleOption[] = [
  {
    id: 'auto',
    name: 'Adaptive Smart Auto-Detect',
    tag: 'RECOMMENDED',
    description: 'Dynamically detects the highest rarity card inside and triggers the corresponding cinematic walkout and soundscape.',
    visualTheme: 'Adaptive (Switches between Mythic 1-of-1, Gold, Silver, or Base Stadium)',
    primaryColor: '#D4FF00',
    soundDescription: 'Automatic matching audio profile for pulled cards',
    demoCardRarity: '1-of-1 Shield'
  },
  {
    id: 'mythic-1of1',
    name: '1-of-1 Mythic Thunder Storm',
    tag: 'ULTRA-LEGENDARY',
    description: 'Total arena blackout, crackling electric volt lightning, rising sirens, and crowned shield shockwave explosion.',
    visualTheme: 'Obsidian Blackout + Electric Volt Lightning + Crown Shields',
    primaryColor: '#D4FF00',
    soundDescription: 'Seismic Sub-Bass Rumble + Lightning Clap + Siren Alert',
    demoCardRarity: '1-of-1 Shield'
  },
  {
    id: 'liquid-gold',
    name: 'Liquid Gold Royalty',
    tag: 'PRESTIGE',
    description: 'Swirling vortex of 24K gold dust particles, radiant amber spotlight sweep, and regal trumpet fanfare.',
    visualTheme: 'Liquid Gold Foil + Golden Dust Vortex + Warm Spotlights',
    primaryColor: '#F59E0B',
    soundDescription: 'Royal Brass Fanfare + Golden Gong + Chime Cascade',
    demoCardRarity: 'Gold Autograph'
  },
  {
    id: 'silver-refractor',
    name: 'Prismatic Silver Chrome',
    tag: 'HOLOGRAPHIC',
    description: 'Multi-directional laser beams, crystalline diamond lens flares, and rainbow diffraction prism sweeps.',
    visualTheme: 'Chrome Mirror Finish + Prismatic Laser Beams + Diamond Shards',
    primaryColor: '#E2E8F0',
    soundDescription: 'Futuristic Cyber Laser Sweep + Crystal Glass Chimes',
    demoCardRarity: 'Silver Refractor'
  },
  {
    id: 'stadium-base',
    name: 'Classic Stadium Athletic',
    tag: 'DEFAULT',
    description: 'Brutalist high-contrast stadium floodlights, neon-volt accents, energetic rapid snap-rip, and pitch roar.',
    visualTheme: 'High-Contrast Carbon & Neon Volt + Floodlights + Whistle',
    primaryColor: '#D4FF00',
    soundDescription: 'Stadium Whistle Chirp + Crisp Card Snap + Roar',
    demoCardRarity: 'Base'
  },
  {
    id: 'retro-cyber',
    name: 'Retro 80s Cyber Synthwave',
    tag: 'SYNTHWAVE',
    description: 'Wireframe perspective grid floor, neon magenta & cyan laser flashes, and nostalgic 8-bit synth arpeggios.',
    visualTheme: 'Neon Magenta & Cyan Lasers + 3D Horizon Grid + Glitch Sparks',
    primaryColor: '#EC4899',
    soundDescription: '80s Arcade Synth Arpeggio + Digital Lasers',
    demoCardRarity: 'Gold Autograph'
  }
];
