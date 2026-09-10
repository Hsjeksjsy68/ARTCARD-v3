import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FootballCard, Pack, PackAnimationStyle } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { packAudio } from '../lib/packAudio';
import { getCardNationalTeam, getNationalTeamFlag, getCardClubTeam } from '../lib/teams';
import { CardOpenInfoModal } from './CardOpenInfoModal';
import { getCardOpenInfo } from '../lib/cardOpenInfo';
import {
  Sparkles,
  Shield,
  Star,
  Check,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  PackageOpen,
  Award,
  Flame,
  Volume2,
  VolumeX,
  Zap,
  LayoutGrid,
  Maximize2,
  Trophy,
  ChevronRight,
  FileBadge,
  Crown,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PackOpeningModalProps {
  pack: Pack;
  drawnCards: FootballCard[];
  isOpen: boolean;
  onClose: () => void;
  onOpenAnother?: () => void;
  walletBalance: number;
  isPreview?: boolean;
}

type IntroStage = 'inspect' | 'ripping' | 'walkout' | 'reveal';
type RevealMode = 'spotlight' | 'grid';

export function PackOpeningModal({
  pack,
  drawnCards,
  isOpen,
  onClose,
  onOpenAnother,
  walletBalance,
  isPreview = false
}: PackOpeningModalProps) {
  const [stage, setStage] = useState<IntroStage>('inspect');
  const [revealMode, setRevealMode] = useState<RevealMode>('spotlight');
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [isMuted, setIsMuted] = useState(() => packAudio.isMuted());
  const [walkoutStep, setWalkoutStep] = useState<number>(0);
  const [ripProgress, setRipProgress] = useState(0); // 0 to 100
  const [isDraggingRip, setIsDraggingRip] = useState(false);
  const [inspectingCard, setInspectingCard] = useState<FootballCard | null>(null);

  // 3D Tilt coordinates for the sealed pack
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const packRef = useRef<HTMLDivElement>(null);

  // Determine highest rarity card for the suspense walkout
  const highestRarityCard = useMemo(() => {
    if (!drawnCards || drawnCards.length === 0) return null;
    const rank: Record<string, number> = {
      '1-of-1 Shield': 4,
      'Gold Autograph': 3,
      'Silver Refractor': 2,
      'Base': 1
    };
    return [...drawnCards].sort((a, b) => (rank[b.rarity] || 0) - (rank[a.rarity] || 0))[0];
  }, [drawnCards]);

  // Resolved animation style: pack configuration or smart adaptive detection based on pulled cards
  const activeAnimationTheme = useMemo<PackAnimationStyle>(() => {
    if (pack.openingAnimation && pack.openingAnimation !== 'auto') {
      return pack.openingAnimation;
    }
    if (highestRarityCard) {
      if (highestRarityCard.rarity === '1-of-1 Shield') return 'mythic-1of1';
      if (highestRarityCard.rarity === 'Gold Autograph') return 'liquid-gold';
      if (highestRarityCard.rarity === 'Silver Refractor') return 'silver-refractor';
    }
    return 'stadium-base';
  }, [pack.openingAnimation, highestRarityCard]);

  const hasWalkoutCandidate = useMemo(() => {
    if (!highestRarityCard) return false;
    // Walkout triggers if pack animation is explicitly non-auto or if rarity is special
    if (pack.openingAnimation && pack.openingAnimation !== 'auto') return true;
    return (
      highestRarityCard.rarity === '1-of-1 Shield' ||
      highestRarityCard.rarity === 'Gold Autograph' ||
      highestRarityCard.rarity === 'Silver Refractor'
    );
  }, [highestRarityCard, pack.openingAnimation]);

  // Total pack market value
  const totalPackValue = useMemo(() => {
    return drawnCards.reduce((acc, c) => acc + (c.currentPrice || 0), 0);
  }, [drawnCards]);

  const fallbackPackPoster = 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop';
  const packImageUrl = pack.coverPhotoUrl || fallbackPackPoster;

  // Reset states whenever modal opens with new cards
  useEffect(() => {
    if (isOpen) {
      setStage('inspect');
      setRevealMode(drawnCards.length > 6 ? 'grid' : 'spotlight');
      setSpotlightIndex(0);
      setRevealedIndices(new Set());
      setWalkoutStep(0);
      setRipProgress(0);
      setIsDraggingRip(false);
      setInspectingCard(null);
    }
  }, [isOpen, pack.id, drawnCards]);

  // Handle Mute toggle
  const handleToggleMute = () => {
    const muted = packAudio.toggleMute();
    setIsMuted(muted);
  };

  // 3D Tilt calculation on mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (stage !== 'inspect' || !packRef.current) return;
    const rect = packRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: -(y / rect.height) * 22,
      y: (x / rect.width) * 22
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Trigger the Rip Sequence
  const triggerRip = () => {
    if (stage !== 'inspect') return;
    setStage('ripping');
    setRipProgress(100);

    // Audio cues tailored to animation style
    packAudio.playRipStrip();
    setTimeout(() => {
      packAudio.playSuspenseCharge();
      if (activeAnimationTheme === 'mythic-1of1') {
        packAudio.playSirenAlarm();
      } else if (activeAnimationTheme === 'liquid-gold') {
        packAudio.playGoldFanfare();
      } else if (activeAnimationTheme === 'silver-refractor') {
        packAudio.playLaserBeam();
      } else if (activeAnimationTheme === 'retro-cyber') {
        packAudio.playRetroSynth();
      }
    }, 150);

    setTimeout(() => {
      packAudio.playPackBurst();
      if (activeAnimationTheme === 'mythic-1of1') {
        packAudio.playThunderClap();
      } else if (activeAnimationTheme === 'stadium-base') {
        packAudio.playStadiumWhistle();
      }

      // Check if we should trigger Walkout suspense
      if (hasWalkoutCandidate) {
        setStage('walkout');
        const tier =
          highestRarityCard?.rarity === '1-of-1 Shield' || activeAnimationTheme === 'mythic-1of1'
            ? 'shield'
            : highestRarityCard?.rarity === 'Gold Autograph' || activeAnimationTheme === 'liquid-gold'
            ? 'gold'
            : 'silver';
        packAudio.playWalkoutAlert(tier);

        // Stagger walkout steps: Nation -> Position -> Club -> Full Reveal
        setWalkoutStep(1);
        setTimeout(() => setWalkoutStep(2), 900);
        setTimeout(() => setWalkoutStep(3), 1800);
        setTimeout(() => setWalkoutStep(4), 2700);
      } else {
        setStage('reveal');
      }
    }, 1250);
  };

  // Skip directly to reveal
  const handleSkipIntro = () => {
    setStage('reveal');
  };

  // Card reveal interactions
  const handleRevealCard = (index: number) => {
    if (!revealedIndices.has(index)) {
      const card = drawnCards[index];
      if (card) {
        packAudio.playCardFlip(card.rarity);
      }
      setRevealedIndices(prev => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });
    }
  };

  const handleRevealAll = () => {
    const all = new Set(drawnCards.map((_, i) => i));
    setRevealedIndices(all);
    // Play sound for best card
    if (highestRarityCard) {
      packAudio.playCardFlip(highestRarityCard.rarity);
    }
  };

  const handleNextSpotlight = () => {
    if (spotlightIndex < drawnCards.length - 1) {
      setSpotlightIndex(prev => prev + 1);
    }
  };

  const handlePrevSpotlight = () => {
    if (spotlightIndex > 0) {
      setSpotlightIndex(prev => prev - 1);
    }
  };

  // Walkout nation & club metadata
  const walkoutNation = highestRarityCard ? getCardNationalTeam(highestRarityCard) : '';
  const walkoutFlag = walkoutNation ? getNationalTeamFlag(walkoutNation) : '🌍';
  const walkoutClub = highestRarityCard ? getCardClubTeam(highestRarityCard) || highestRarityCard.team : '';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 z-50 overflow-y-auto overflow-x-hidden backdrop-blur-xl select-none p-2 sm:p-4 md:p-6">
      <div className="min-h-full w-full flex flex-col items-center justify-between sm:justify-center max-w-6xl mx-auto py-1">
        {/* Top Floating Control Bar */}
        <div className="w-full flex items-center justify-between py-1.5 sm:py-2 px-1 sm:px-4 z-50 mb-1 sm:mb-2 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {stage !== 'inspect' && (
              <>
                <span className="bg-[#D4FF00] text-black px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-black shadow-[2px_2px_0px_0px_rgba(255,255,255,0.4)]">
                  {isPreview ? 'DEMO' : 'OFFICIAL'}
                </span>
                <span className="text-white text-xs font-black uppercase tracking-wider truncate max-w-[120px] sm:max-w-none hidden xs:inline-block">
                  {pack.name}
                </span>
                <span className="bg-neutral-900 text-neutral-300 border border-neutral-700 px-2 py-0.5 text-[9px] font-mono font-black uppercase hidden md:inline-flex items-center gap-1">
                  <Zap size={10} className="text-[#D4FF00]" />
                  STYLE: {activeAnimationTheme.replace('-', ' ')}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            {/* Audio Mute/Unmute Toggle */}
            <button
              onClick={handleToggleMute}
              className="p-1.5 sm:p-2 bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 transition-colors flex items-center gap-1 text-xs font-bold"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} className="text-[#D4FF00]" />}
              <span className="text-[10px] uppercase hidden sm:inline">{isMuted ? 'MUTED' : 'AUDIO ON'}</span>
            </button>

            {/* Quick Skip button (if in inspect or ripping stage) */}
            {(stage === 'inspect' || stage === 'ripping' || stage === 'walkout') && (
              <button
                onClick={handleSkipIntro}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                SKIP INTRO
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-black hover:bg-red-600 text-white border border-neutral-700 transition-colors text-xs sm:text-sm font-black"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* STAGE CONTAINER */}
        <div className="w-full max-w-5xl flex-1 flex flex-col items-center justify-center relative min-h-0 py-2 sm:py-4">
          {/* Ambient Theme-Specific Lighting */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
            <div
              className={cn(
                "w-[340px] sm:w-[700px] h-[340px] sm:h-[700px] rounded-full blur-[100px] sm:blur-[140px] transition-all duration-1000",
                activeAnimationTheme === 'mythic-1of1'
                  ? "bg-[#D4FF00] opacity-40 scale-125 animate-pulse"
                  : activeAnimationTheme === 'liquid-gold'
                  ? "bg-amber-400 opacity-35 scale-110"
                  : activeAnimationTheme === 'silver-refractor'
                  ? "bg-cyan-300 opacity-25"
                  : activeAnimationTheme === 'retro-cyber'
                  ? "bg-fuchsia-600 opacity-30"
                  : "bg-emerald-400 opacity-20"
              )}
            />
            {activeAnimationTheme === 'mythic-1of1' && (
              <div className="absolute inset-0 border-4 border-[#D4FF00]/20 pointer-events-none animate-pulse" />
            )}
          </div>

          {/* ========================================================================= */}
          {/* STAGE 1: SEALED PACK INSPECTION - SHOW ONLY THE PACK IMG                  */}
          {/* ========================================================================= */}
          {stage === 'inspect' && (
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center justify-center w-full z-10 py-2 sm:py-6"
            >
              {/* 3D Realistic Foil Booster Pack - SHOW ONLY THE PACK IMG */}
              <div
                className="perspective-[1200px] cursor-pointer group flex flex-col items-center"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={triggerRip}
                onMouseEnter={() => packAudio.playFoilRustle()}
              >
                <motion.div
                  ref={packRef}
                  style={{
                    transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                    transition: 'transform 0.1s ease-out'
                  }}
                  className="w-[210px] xs:w-[240px] sm:w-80 md:w-84 max-h-[50vh] sm:max-h-none aspect-[750/1050] border-3 sm:border-4 border-black relative overflow-hidden shadow-[8px_8px_0px_0px_#D4FF00] sm:shadow-[16px_16px_0px_0px_#D4FF00] transition-all duration-300 group-hover:shadow-[12px_12px_0px_0px_#ffffff] group-hover:scale-105 bg-black"
                >
                  {/* Clean Edge-to-Edge Pack Image */}
                  <img
                    src={packImageUrl}
                    alt={pack.name}
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />

                  {/* Subtle Foil Hologram Sheen (Animated across pack on hover) */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform pointer-events-none" />
                </motion.div>

                {/* Mobile-Friendly Rip Action Button & Hint */}
                <div className="mt-3 sm:mt-4 flex flex-col items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerRip();
                    }}
                    className="px-4 py-2 bg-[#D4FF00] hover:bg-white text-black border-2 border-black font-black text-xs uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(255,255,255,0.8)] flex items-center gap-2 animate-bounce transition-colors"
                  >
                    <Sparkles size={14} />
                    <span>TAP PACK TO RIP OPEN</span>
                  </button>
                  <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
                    TOUCH OR CLICK TO TEAR
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 2: VISCERAL TEAR & PARTICLE EXPLOSION (50% HALF CUT + PAPER TEXTURE)*/}
          {/* ========================================================================= */}
          {stage === 'ripping' && (
            <div className="flex flex-col items-center justify-center z-20 relative w-full overflow-visible py-2 sm:py-4">
              {/* Shaking Torn Pack - Split Exactly in Half (50% / 50%) */}
              <motion.div
                animate={{
                  x: [-4, 4, -3, 3, -2, 2, 0],
                  y: [0, -2, 2, -1, 1, 0],
                  scale: [1, 1.02, 1.05, 1.08]
                }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="relative w-[210px] xs:w-[240px] sm:w-80 md:w-84 h-[310px] xs:h-[350px] sm:h-[460px] flex flex-col items-center justify-between"
              >
                {/* TOP HALF OF PACK IMAGE (Exact 50% cut from the half) */}
                <motion.div
                  initial={{ y: 0, rotateX: 0, rotate: 0 }}
                  animate={{
                    y: [-2, -28, -48],
                    rotateX: [-2, -16, -26],
                    rotate: [0, -1.5, -2.5],
                    opacity: [1, 1, 0.95]
                  }}
                  transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full h-1/2 border-3 sm:border-4 border-b-0 border-black relative overflow-hidden bg-black shadow-xl"
                  style={{ transformOrigin: 'top center' }}
                >
                  {/* Full Pack Image anchored to Top Half */}
                  <img
                    src={packImageUrl}
                    alt={pack.name}
                    className="w-full h-[310px] xs:h-[350px] sm:h-[460px] object-cover object-top select-none pointer-events-none"
                  />

                  {/* Torn Paper Fiber Edge & Pulp Texture at the Bottom Cut */}
                  <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none overflow-visible">
                    {/* Jagged Paper Pulp Teeth & Core */}
                    <svg viewBox="0 0 500 24" preserveAspectRatio="none" className="w-full h-3.5 sm:h-5 -mb-0.5 filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]">
                      {/* Dark inner shadow along the paper fiber tear */}
                      <path
                        d="M0,0 L500,0 L500,8 Q480,18 460,9 Q440,21 420,11 Q400,19 380,8 Q360,22 340,12 Q320,8 300,19 Q280,12 260,22 Q240,9 220,17 Q200,7 180,20 Q160,11 140,21 Q120,7 100,18 Q80,10 60,22 Q40,9 20,18 Q10,12 0,16 Z"
                        fill="rgba(0,0,0,0.55)"
                        transform="translate(0, 1.5)"
                      />
                      {/* Primary Exposed Paper Pulp Layer (Rough Ivory Cardstock) */}
                      <path
                        d="M0,0 L500,0 L500,9 Q480,19 460,10 Q440,22 420,12 Q400,20 380,9 Q360,23 340,13 Q320,9 300,20 Q280,13 260,23 Q240,10 220,18 Q200,8 180,21 Q160,12 140,22 Q120,8 100,19 Q80,11 60,23 Q40,10 20,19 Q10,13 0,17 Z"
                        fill="#F5F3EB"
                      />
                      {/* Shredded Frayed Fiber Tufts (Bright White Paper Strands) */}
                      <path
                        d="M0,0 L500,0 L500,5 Q485,12 465,6 Q445,15 425,7 Q405,13 385,6 Q365,16 345,8 Q325,5 305,14 Q285,8 265,15 Q245,6 225,12 Q205,5 185,14 Q165,7 145,15 Q125,5 105,13 Q85,7 65,15 Q45,6 25,13 Q12,8 0,12 Z"
                        fill="#FFFFFF"
                        opacity="0.95"
                      />
                    </svg>
                    {/* Fibrous Deckle Paper Pulp Strip */}
                    <div className="w-full h-1 bg-gradient-to-r from-[#EDE8DF] via-[#FAF8F3] to-[#EDE8DF] border-b border-[#DCD5C6] shadow-sm" />
                  </div>
                </motion.div>

                {/* Radiant Volumetric Energy Beams Blasting Through Center Paper Cut */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.4, 2.6], opacity: [0, 1, 0.8], rotate: 180 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                >
                  <div
                    className="w-[260px] h-[260px] sm:w-[480px] sm:h-[480px] rounded-full blur-md"
                    style={{
                      background:
                        'conic-gradient(from 0deg, transparent, #D4FF00, transparent 45deg, #ffffff, transparent 90deg, #D4FF00, transparent 180deg, #D4FF00)'
                    }}
                  />
                </motion.div>

                {/* BOTTOM HALF OF PACK IMAGE (Exact 50% cut from the half) */}
                <motion.div
                  initial={{ y: 0, rotateX: 0, rotate: 0 }}
                  animate={{
                    y: [2, 28, 48],
                    rotateX: [2, 12, 18],
                    rotate: [0, 1.2, 2],
                    opacity: [1, 1, 0.95]
                  }}
                  transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full h-1/2 border-3 sm:border-4 border-t-0 border-black relative overflow-hidden bg-black shadow-xl"
                  style={{ transformOrigin: 'bottom center' }}
                >
                  {/* Torn Paper Fiber Edge & Pulp Texture at the Top Cut */}
                  <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none overflow-visible">
                    {/* Fibrous Deckle Paper Pulp Strip */}
                    <div className="w-full h-1 bg-gradient-to-r from-[#EDE8DF] via-[#FAF8F3] to-[#EDE8DF] border-t border-[#DCD5C6] shadow-sm" />
                    {/* Jagged Paper Pulp Teeth & Core pointing upward */}
                    <svg viewBox="0 0 500 24" preserveAspectRatio="none" className="w-full h-3.5 sm:h-5 -mt-0.5 rotate-180 filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]">
                      <path
                        d="M0,0 L500,0 L500,8 Q480,18 460,9 Q440,21 420,11 Q400,19 380,8 Q360,22 340,12 Q320,8 300,19 Q280,12 260,22 Q240,9 220,17 Q200,7 180,20 Q160,11 140,21 Q120,7 100,18 Q80,10 60,22 Q40,9 20,18 Q10,12 0,16 Z"
                        fill="rgba(0,0,0,0.55)"
                        transform="translate(0, 1.5)"
                      />
                      <path
                        d="M0,0 L500,0 L500,9 Q480,19 460,10 Q440,22 420,12 Q400,20 380,9 Q360,23 340,13 Q320,9 300,20 Q280,13 260,23 Q240,10 220,18 Q200,8 180,21 Q160,12 140,22 Q120,8 100,19 Q80,11 60,23 Q40,10 20,19 Q10,13 0,17 Z"
                        fill="#F5F3EB"
                      />
                      <path
                        d="M0,0 L500,0 L500,5 Q485,12 465,6 Q445,15 425,7 Q405,13 385,6 Q365,16 345,8 Q325,5 305,14 Q285,8 265,15 Q245,6 225,12 Q205,5 185,14 Q165,7 145,15 Q125,5 105,13 Q85,7 65,15 Q45,6 25,13 Q12,8 0,12 Z"
                        fill="#FFFFFF"
                        opacity="0.95"
                      />
                    </svg>
                  </div>

                  {/* Full Pack Image anchored to Bottom Half */}
                  <img
                    src={packImageUrl}
                    alt={pack.name}
                    className="w-full h-[310px] xs:h-[350px] sm:h-[460px] object-cover object-bottom select-none pointer-events-none"
                  />
                </motion.div>

                {/* Floating Confetti, Foil Shards & Torn Paper Fibers Erupting from the Half Cut */}
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      x: 0,
                      y: 0,
                      scale: 0,
                      rotate: 0
                    }}
                    animate={{
                      x: (Math.random() - 0.5) * 320,
                      y: (Math.random() - 0.5) * 300,
                      scale: [0, 1.3, 0.4],
                      rotate: Math.random() * 720
                    }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                    className={cn(
                      "absolute border border-black z-30 pointer-events-none",
                      i % 4 === 0 
                        ? "w-2 h-3.5 bg-[#F5F3EB] rounded-[1px]" // torn paper shred
                        : i % 4 === 1 
                        ? "w-2.5 h-2.5 bg-[#D4FF00]" // neon foil shard
                        : i % 4 === 2
                        ? "w-2.5 h-2 bg-white" // white cardstock shred
                        : "w-2 h-2.5 bg-amber-400" // gold shard
                    )}
                  />
                ))}
              </motion.div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 3: WALKOUT / HIGH TIER SUSPENSE ARENA                               */}
          {/* ========================================================================= */}
          {stage === 'walkout' && highestRarityCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full flex flex-col items-center justify-center space-y-3 sm:space-y-6 text-center z-30 py-2 sm:py-4 max-w-xl mx-auto"
            >
              {/* Walkout Banner */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="space-y-1 px-2"
              >
                <div className="inline-flex items-center gap-1.5 bg-[#D4FF00] text-black px-2.5 sm:px-4 py-1 text-[10px] sm:text-xs font-black uppercase tracking-widest border border-black sm:border-2 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  <Trophy size={13} />
                  <span className="truncate max-w-[260px] sm:max-w-none">
                    {highestRarityCard.rarity === '1-of-1 Shield'
                      ? '👑 MYTHIC 1-OF-1 SHIELD DETECTED!'
                      : highestRarityCard.rarity === 'Gold Autograph'
                      ? '🔥 CERTIFIED GOLD AUTOGRAPH HIT!'
                      : highestRarityCard.rarity === 'Silver Refractor'
                      ? '✨ PRISMATIC SILVER REFRACTOR DETECTED!'
                      : '⚽ OFFICIAL BASE SERIES CATALOGUE HIT!'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">
                  {highestRarityCard.rarity === '1-of-1 Shield'
                    ? 'ULTRA-MYTHIC WALKOUT'
                    : highestRarityCard.rarity === 'Gold Autograph'
                    ? 'LEGENDARY GOLD WALKOUT'
                    : highestRarityCard.rarity === 'Silver Refractor'
                    ? 'REFRACTOR CHROMIUM WALKOUT'
                    : 'STADIUM SQUAD WALKOUT'}
                </h2>
              </motion.div>

              {/* Stadium Tease Badges (Staggered walkout reveal) */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-lg px-2">
                {/* 1. Nation Flag Tease */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={walkoutStep >= 1 ? { scale: 1, opacity: 1 } : {}}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={cn(
                    "px-2.5 sm:px-4 py-1.5 sm:py-2 border-2 border-black font-black uppercase tracking-wider text-xs sm:text-sm flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    walkoutStep >= 1 ? "bg-white text-black" : "bg-neutral-800 text-neutral-500 border-neutral-700"
                  )}
                >
                  <span className="text-base sm:text-xl">{walkoutStep >= 1 ? walkoutFlag : '❓'}</span>
                  <span>{walkoutStep >= 1 ? walkoutNation || 'INTERNATIONAL' : 'NATIONALITY'}</span>
                </motion.div>

                {/* 2. Position Tease */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={walkoutStep >= 2 ? { scale: 1, opacity: 1 } : {}}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={cn(
                    "px-2.5 sm:px-4 py-1.5 sm:py-2 border-2 border-black font-black uppercase tracking-wider text-xs sm:text-sm flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    walkoutStep >= 2 ? "bg-[#D4FF00] text-black" : "bg-neutral-800 text-neutral-500 border-neutral-700"
                  )}
                >
                  <span>POS:</span>
                  <span>{walkoutStep >= 2 ? highestRarityCard.position || 'FWD' : '???'}</span>
                </motion.div>

                {/* 3. Club Tease */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={walkoutStep >= 3 ? { scale: 1, opacity: 1 } : {}}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={cn(
                    "px-2.5 sm:px-4 py-1.5 sm:py-2 border-2 border-black font-black uppercase tracking-wider text-xs sm:text-sm flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    walkoutStep >= 3 ? "bg-white text-black" : "bg-neutral-800 text-neutral-500 border-neutral-700"
                  )}
                >
                  <span>CLUB:</span>
                  <span className="truncate max-w-[120px] sm:max-w-none">{walkoutStep >= 3 ? walkoutClub || 'CLUB SQUAD' : '???'}</span>
                </motion.div>
              </div>

              {/* Glowing Silhouette / Card Reveal */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="relative w-40 xs:w-48 sm:w-56 aspect-[750/1050] my-1 sm:my-2"
              >
                {/* Radiating Light Aura */}
                <div
                  className={cn(
                    "absolute inset-0 blur-xl opacity-60 rounded-xl animate-pulse",
                    highestRarityCard.rarity === '1-of-1 Shield'
                      ? "bg-[#D4FF00]"
                      : highestRarityCard.rarity === 'Gold Autograph'
                      ? "bg-amber-400"
                      : highestRarityCard.rarity === 'Silver Refractor'
                      ? "bg-cyan-300"
                      : "bg-emerald-400"
                  )}
                />

                <div className="relative w-full h-full border-3 sm:border-4 border-black bg-neutral-900 overflow-hidden shadow-[6px_6px_0px_0px_#D4FF00] sm:shadow-[12px_12px_0px_0px_#D4FF00]">
                  {walkoutStep >= 4 && highestRarityCard.imageUrl ? (
                    <img
                      src={highestRarityCard.imageUrl}
                      alt={highestRarityCard.player}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-neutral-800 to-black text-white">
                      <Shield size={44} className="text-[#D4FF00] mb-2 animate-bounce" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#D4FF00]">
                        TOP HIT READY
                      </span>
                      <span className="text-xs sm:text-sm font-black uppercase mt-1">
                        {walkoutStep >= 4 ? highestRarityCard.player : 'TAP TO UNVEIL'}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Walkout Action Controls */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full px-2">
                <button
                  onClick={() => setInspectingCard(highestRarityCard)}
                  className="bg-black hover:bg-neutral-900 text-[#D4FF00] border-2 border-[#D4FF00] px-3.5 py-2.5 sm:px-5 sm:py-3 font-mono font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#D4FF00] sm:shadow-[3px_3px_0px_0px_#D4FF00] transition-transform"
                >
                  <FileBadge size={14} />
                  <span>INSPECT INFO & SERIAL</span>
                </button>

                <button
                  onClick={() => setStage('reveal')}
                  className="bg-[#D4FF00] text-black hover:bg-white px-5 py-2.5 sm:px-7 sm:py-3 border-2 sm:border-4 border-black font-black uppercase tracking-widest text-xs sm:text-sm transition-all shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] sm:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex items-center gap-1.5"
                >
                  <span>CONTINUE TO ALL CARDS</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 4: CARD DECK REVEAL CHAMBER (SPOTLIGHT & GRID MODES)                */}
          {/* ========================================================================= */}
          {stage === 'reveal' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-3 sm:space-y-5 z-20 py-1"
            >
              {/* Header: Pulled status, Total pack value & View Mode Switcher */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 border-b border-neutral-800 pb-2.5">
                <div className="text-center sm:text-left space-y-0.5">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5">
                    <Sparkles className="text-[#D4FF00]" size={16} />
                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#D4FF00]">
                      PULLED FROM {pack.name} ({revealedIndices.size}/{drawnCards.length} REVEALED)
                    </span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3">
                    <span className="text-xs sm:text-sm font-mono font-black text-white">
                      EST. VALUE: <span className="text-[#D4FF00]">{formatCurrency(totalPackValue)}</span>
                    </span>
                    {highestRarityCard && (
                      <span className="text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700">
                        BEST: {highestRarityCard.rarity}
                      </span>
                    )}
                  </div>
                </div>

                {/* View Switcher: Spotlight vs Grid */}
                <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 p-1">
                  <button
                    onClick={() => setRevealMode('spotlight')}
                    className={cn(
                      "px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-colors",
                      revealMode === 'spotlight' ? "bg-[#D4FF00] text-black" : "text-neutral-400 hover:text-white"
                    )}
                  >
                    <Maximize2 size={12} />
                    <span>SPOTLIGHT</span>
                  </button>
                  <button
                    onClick={() => setRevealMode('grid')}
                    className={cn(
                      "px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-colors",
                      revealMode === 'grid' ? "bg-[#D4FF00] text-black" : "text-neutral-400 hover:text-white"
                    )}
                  >
                    <LayoutGrid size={12} />
                    <span>GRID ({drawnCards.length})</span>
                  </button>
                </div>
              </div>

              {/* ------------------------------------------------------------------- */}
              {/* VIEW MODE A: SPOTLIGHT (ONE-BY-ONE FLIP SHOWCASE)                   */}
              {/* ------------------------------------------------------------------- */}
              {revealMode === 'spotlight' && (
                <div className="flex flex-col items-center justify-center space-y-3 py-1">
                  {drawnCards[spotlightIndex] && (() => {
                    const card = drawnCards[spotlightIndex];
                    const isRevealed = revealedIndices.has(spotlightIndex);
                    const isShield = card.rarity === '1-of-1 Shield';
                    const isGold = card.rarity === 'Gold Autograph';
                    const isSilver = card.rarity === 'Silver Refractor';
                    const cardNation = getCardNationalTeam(card);
                    const cardFlag = cardNation ? getNationalTeamFlag(cardNation) : '';
                    const cardClub = getCardClubTeam(card) || card.team;

                    return (
                      <div className="flex flex-col items-center space-y-2.5 w-full">
                        {/* Spotlight Card Carousel */}
                        <div className="flex items-center justify-center gap-2 sm:gap-6 w-full max-w-md">
                          {/* Prev Button */}
                          <button
                            onClick={handlePrevSpotlight}
                            disabled={spotlightIndex === 0}
                            className="p-2 sm:p-3 bg-neutral-900 text-white border-2 border-black hover:bg-neutral-800 disabled:opacity-25 disabled:hover:bg-neutral-900 transition-colors shadow-[2px_2px_0px_0px_rgba(255,255,255,0.4)] shrink-0"
                            aria-label="Previous card"
                          >
                            <ArrowLeft size={16} />
                          </button>

                          {/* The 3D Flipping Card Container */}
                          <div
                            onClick={() => handleRevealCard(spotlightIndex)}
                            className="w-44 xs:w-52 sm:w-64 aspect-[750/1050] perspective-[1000px] cursor-pointer"
                          >
                            <motion.div
                              animate={{ rotateY: isRevealed ? 180 : 0 }}
                              transition={{ duration: 0.6, type: "spring", damping: 15 }}
                              style={{ transformStyle: 'preserve-3d' }}
                              className="relative w-full h-full"
                            >
                              {/* Card Back (Unrevealed Foil) */}
                              <div
                                style={{ backfaceVisibility: 'hidden' }}
                                className="absolute inset-0 w-full h-full border-3 sm:border-4 border-black bg-gradient-to-b from-neutral-800 via-neutral-900 to-black p-3 sm:p-4 flex flex-col items-center justify-between text-white shadow-[6px_6px_0px_0px_#D4FF00] sm:shadow-[8px_8px_0px_0px_#D4FF00]"
                              >
                                <div className="w-full flex justify-between items-center text-[8px] sm:text-[9px] font-black uppercase text-neutral-400">
                                  <span>CARD #{spotlightIndex + 1}</span>
                                  <span>ARTCARD</span>
                                </div>
                                <div className="flex flex-col items-center justify-center space-y-1.5">
                                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 border-[#D4FF00] flex items-center justify-center animate-bounce">
                                    <Sparkles size={18} className="text-[#D4FF00]" />
                                  </div>
                                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#D4FF00]">
                                    TAP TO FLIP
                                  </span>
                                </div>
                                <div className="text-[8px] sm:text-[9px] font-mono text-neutral-500 uppercase">
                                  TOUCH OR CLICK
                                </div>
                              </div>

                              {/* Card Front (Revealed State) */}
                              <div
                                style={{
                                  backfaceVisibility: 'hidden',
                                  transform: 'rotateY(180deg)'
                                }}
                                className={cn(
                                  "absolute inset-0 w-full h-full border-3 sm:border-4 overflow-hidden flex flex-col bg-white",
                                  isShield
                                    ? "border-[#D4FF00] shadow-[0_0_20px_#D4FF00]"
                                    : isGold
                                    ? "border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.8)]"
                                    : isSilver
                                    ? "border-slate-300 shadow-[0_0_12px_rgba(203,213,225,0.8)]"
                                    : "border-black shadow-[4px_4px_0px_0px_rgba(255,255,255,0.4)] sm:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.4)]"
                                )}
                              >
                                {card.imageUrl ? (
                                  <img src={card.imageUrl} alt={card.player} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="h-full flex flex-col justify-between p-3 bg-neutral-900 text-white relative">
                                    <div className={cn("absolute inset-0 opacity-40 bg-gradient-to-tr", card.imageGradient)} />
                                    <div className="relative z-10 text-left">
                                      <span className="text-[10px] font-black uppercase text-[#D4FF00]">{card.team}</span>
                                      <h4 className="text-sm sm:text-base font-black uppercase tracking-tight">{card.player}</h4>
                                    </div>
                                    <div className="relative z-10 text-[8px] sm:text-[9px] font-black uppercase text-neutral-400">
                                      {card.year} • {card.set}
                                    </div>
                                  </div>
                                )}

                                {/* Rarity Pill */}
                                <div className="absolute top-1.5 left-1.5 z-20">
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 text-[7px] sm:text-[8px] font-black uppercase tracking-widest border border-black",
                                      card.rarity === 'Base' && "bg-white text-black",
                                      card.rarity === 'Silver Refractor' && "bg-slate-200 text-black font-black",
                                      card.rarity === 'Gold Autograph' && "bg-amber-300 text-black font-black",
                                      card.rarity === '1-of-1 Shield' && "bg-black text-[#D4FF00] border-[#D4FF00] font-black"
                                    )}
                                  >
                                    {card.rarity}
                                  </span>
                                </div>

                                {/* Price Tag */}
                                <div className="absolute bottom-1.5 right-1.5 z-20 bg-black text-[#D4FF00] px-2 py-0.5 text-[10px] sm:text-xs font-mono font-black border border-white/20">
                                  {formatCurrency(card.currentPrice)}
                                </div>
                              </div>
                            </motion.div>
                          </div>

                          {/* Next Button */}
                          <button
                            onClick={handleNextSpotlight}
                            disabled={spotlightIndex === drawnCards.length - 1}
                            className="p-2 sm:p-3 bg-neutral-900 text-white border-2 border-black hover:bg-neutral-800 disabled:opacity-25 disabled:hover:bg-neutral-900 transition-colors shadow-[2px_2px_0px_0px_rgba(255,255,255,0.4)] shrink-0"
                            aria-label="Next card"
                          >
                            <ArrowRight size={16} />
                          </button>
                        </div>

                        {/* Card Details Bar */}
                        <div className="text-center space-y-1 flex flex-col items-center px-2">
                          <div className="text-base sm:text-lg font-black uppercase text-white tracking-tight">
                            {isRevealed ? card.player : `Card ${spotlightIndex + 1} of ${drawnCards.length}`}
                          </div>
                          {isRevealed && (
                            <>
                              <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold text-neutral-400">
                                {cardFlag && <span>{cardFlag}</span>}
                                <span>{cardClub}</span>
                                <span>•</span>
                                <span>{card.position}</span>
                                <span>•</span>
                                <span className="text-[#D4FF00]">{formatCurrency(card.currentPrice)}</span>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectingCard(card);
                                }}
                                className="mt-0.5 px-2.5 py-1 bg-black hover:bg-neutral-900 text-[#D4FF00] border border-[#D4FF00]/50 hover:border-[#D4FF00] text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_#D4FF00]"
                              >
                                <FileBadge size={11} />
                                <span>VIEW CARD INFO ({card.rarity})</span>
                              </button>
                            </>
                          )}
                        </div>

                        {/* Dots Pagination */}
                        <div className="flex items-center gap-1 pt-0.5">
                          {drawnCards.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSpotlightIndex(idx)}
                              className={cn(
                                "w-2 h-2 sm:w-2.5 sm:h-2.5 transition-all border border-black",
                                idx === spotlightIndex
                                  ? "bg-[#D4FF00] scale-125 shadow-[0_0_8px_#D4FF00]"
                                  : revealedIndices.has(idx)
                                  ? "bg-white"
                                  : "bg-neutral-700"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ------------------------------------------------------------------- */}
              {/* VIEW MODE B: ALL-IN-ONE GRID                                        */}
              {/* ------------------------------------------------------------------- */}
              {revealMode === 'grid' && (
                <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 max-h-[46vh] sm:max-h-[55vh] overflow-y-auto p-1">
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
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => handleRevealCard(idx)}
                        className="cursor-pointer group"
                      >
                        <div
                          className={cn(
                            "relative aspect-[750/1050] border-2 transition-all duration-300 overflow-hidden",
                            isRevealed
                              ? isShield
                                ? "border-[#D4FF00] shadow-[0_0_16px_#D4FF00]"
                                : isGold
                                ? "border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                                : isSilver
                                ? "border-slate-300 shadow-[0_0_10px_rgba(203,213,225,0.6)]"
                                : "border-black shadow-[3px_3px_0px_0px_rgba(255,255,255,0.4)]"
                              : "border-neutral-700 bg-neutral-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:border-[#D4FF00]"
                          )}
                        >
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
                                    <h4 className="text-xs font-black uppercase tracking-tight truncate">{card.player}</h4>
                                  </div>
                                  <div className="relative z-10 text-[8px] font-black uppercase text-neutral-400">
                                    {card.year} • {card.set}
                                  </div>
                                </div>
                              )}

                              {/* Rarity Corner Pill */}
                              <div className="absolute top-1 left-1 z-20">
                                <span
                                  className={cn(
                                    "px-1 py-0.2 text-[7px] font-black uppercase tracking-widest border border-black",
                                    card.rarity === 'Base' && "bg-white text-black",
                                    card.rarity === 'Silver Refractor' && "bg-slate-200 text-black",
                                    card.rarity === 'Gold Autograph' && "bg-amber-300 text-black",
                                    card.rarity === '1-of-1 Shield' && "bg-black text-[#D4FF00] border-[#D4FF00]"
                                  )}
                                >
                                  {card.rarity}
                                </span>
                              </div>

                              {/* Inspect Info Button in Grid */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectingCard(card);
                                }}
                                className="absolute top-1 right-1 z-20 p-1 bg-black/80 hover:bg-[#D4FF00] text-white hover:text-black border border-white/20 transition-colors"
                                title="Inspect Card Open Info & Serial"
                              >
                                <FileBadge size={10} />
                              </button>

                              {/* Price Tag */}
                              <div className="absolute bottom-1 right-1 z-20 bg-black text-[#D4FF00] px-1.5 py-0.5 text-[8px] font-mono font-black border border-white/20">
                                {formatCurrency(card.currentPrice)}
                              </div>
                            </div>
                          ) : (
                            /* Card Back (Foil Hidden State) */
                            <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-gradient-to-b from-neutral-800 to-neutral-950 text-white relative">
                              <div className="w-8 h-8 rounded-full border-2 border-[#D4FF00] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                <Sparkles size={14} className="text-[#D4FF00]" />
                              </div>
                              <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">
                                FLIP
                              </span>
                            </div>
                          )}
                        </div>

                        {isRevealed && (
                          <div className="mt-1 text-left px-0.5 flex items-center justify-between">
                            <div className="overflow-hidden">
                              <p className="text-xs font-black text-white uppercase truncate">{card.player}</p>
                              <p className="text-[9px] font-bold text-neutral-400 uppercase truncate">
                                {card.team} • {formatCurrency(card.currentPrice)}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectingCard(card);
                              }}
                              className="p-1 text-neutral-400 hover:text-[#D4FF00] shrink-0"
                              title="Inspect info"
                            >
                              <FileBadge size={13} />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Action Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-neutral-800 w-full">
                {revealedIndices.size < drawnCards.length && (
                  <button
                    onClick={handleRevealAll}
                    className="w-full sm:w-auto bg-white hover:bg-neutral-200 text-black px-4 py-2.5 sm:px-5 sm:py-3 font-black uppercase tracking-widest text-xs border-2 border-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center"
                  >
                    REVEAL ALL ({drawnCards.length - revealedIndices.size} LEFT)
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="w-full sm:w-auto bg-[#D4FF00] text-black hover:bg-white px-5 py-2.5 sm:px-7 sm:py-3.5 font-black uppercase tracking-widest text-xs sm:text-sm border-2 border-black transition-all shadow-[3px_3px_0px_0px_rgba(255,255,255,0.8)] flex items-center justify-center gap-2"
                >
                  <Check size={15} />
                  <span>COLLECT ALL & CLOSE</span>
                </button>

                {onOpenAnother && (
                  <button
                    onClick={onOpenAnother}
                    disabled={!isPreview && walletBalance < pack.price}
                    className={`w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3.5 font-black uppercase tracking-widest text-xs border-2 border-black transition-all flex items-center justify-center gap-2 ${
                      isPreview || walletBalance >= pack.price
                        ? 'bg-black text-[#D4FF00] hover:bg-neutral-900 border-[#D4FF00] shadow-[3px_3px_0px_0px_#D4FF00]'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border-neutral-700'
                    }`}
                  >
                    <RotateCcw size={14} />
                    <span className="truncate">
                      {isPreview
                        ? 'RIP ANOTHER PREVIEW'
                        : walletBalance >= pack.price
                        ? `OPEN ANOTHER (${formatCurrency(pack.price)})`
                        : 'INSUFFICIENT BALANCE'}
                    </span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* CARD OPEN INFO & AUTHENTICITY DOSSIER MODAL */}
      <CardOpenInfoModal
        card={inspectingCard}
        isOpen={!!inspectingCard}
        onClose={() => setInspectingCard(null)}
      />
    </div>
  );
}
