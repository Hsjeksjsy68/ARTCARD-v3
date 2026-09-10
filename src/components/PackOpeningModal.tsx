import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FootballCard, Pack } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { packAudio } from '../lib/packAudio';
import { getCardNationalTeam, getNationalTeamFlag, getCardClubTeam } from '../lib/teams';
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
  ChevronRight
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

  const hasWalkoutCandidate = useMemo(() => {
    if (!highestRarityCard) return false;
    return (
      highestRarityCard.rarity === '1-of-1 Shield' ||
      highestRarityCard.rarity === 'Gold Autograph' ||
      highestRarityCard.rarity === 'Silver Refractor'
    );
  }, [highestRarityCard]);

  // Total pack market value
  const totalPackValue = useMemo(() => {
    return drawnCards.reduce((acc, c) => acc + (c.currentPrice || 0), 0);
  }, [drawnCards]);

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

    // Audio cues
    packAudio.playRipStrip();
    setTimeout(() => {
      packAudio.playSuspenseCharge();
    }, 150);

    setTimeout(() => {
      packAudio.playPackBurst();

      // Check if we should trigger Walkout suspense
      if (hasWalkoutCandidate) {
        setStage('walkout');
        const tier =
          highestRarityCard?.rarity === '1-of-1 Shield'
            ? 'shield'
            : highestRarityCard?.rarity === 'Gold Autograph'
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
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-3 sm:p-6 overflow-y-auto backdrop-blur-xl select-none">
      {/* Top Floating Control Bar */}
      <div className="w-full max-w-6xl flex items-center justify-between py-2 px-4 z-50 mb-2">
        <div className="flex items-center gap-2">
          <span className="bg-[#D4FF00] text-black px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border border-black shadow-[2px_2px_0px_0px_rgba(255,255,255,0.4)]">
            {isPreview ? 'DEMO INTRO' : 'OFFICIAL OPENING'}
          </span>
          <span className="text-white text-xs font-black uppercase tracking-wider hidden sm:inline-block">
            {pack.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Mute/Unmute Toggle */}
          <button
            onClick={handleToggleMute}
            className="p-2 bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 transition-colors flex items-center gap-1.5 text-xs font-bold"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={15} className="text-red-400" /> : <Volume2 size={15} className="text-[#D4FF00]" />}
            <span className="text-[10px] uppercase hidden sm:inline">{isMuted ? 'MUTED' : 'AUDIO ON'}</span>
          </button>

          {/* Quick Skip button (if in inspect or ripping stage) */}
          {(stage === 'inspect' || stage === 'ripping' || stage === 'walkout') && (
            <button
              onClick={handleSkipIntro}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              SKIP INTRO
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-black hover:bg-red-600 text-white border border-neutral-700 transition-colors text-sm font-black"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* STAGE CONTAINER */}
      <div className="w-full max-w-5xl flex-1 flex flex-col items-center justify-center relative min-h-[560px]">
        {/* Ambient Stadium Light Flares */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          <div
            className={cn(
              "w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full blur-[140px] opacity-25 transition-all duration-1000",
              highestRarityCard?.rarity === '1-of-1 Shield'
                ? "bg-[#D4FF00] opacity-40 scale-125"
                : highestRarityCard?.rarity === 'Gold Autograph'
                ? "bg-amber-400 opacity-35"
                : "bg-blue-500 opacity-20"
            )}
          />
        </div>

        {/* ========================================================================= */}
        {/* STAGE 1: SEALED PACK INSPECTION & FOIL RIP SETUP                          */}
        {/* ========================================================================= */}
        {stage === 'inspect' && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex flex-col items-center justify-center space-y-6 text-center w-full z-10 py-4"
          >
            {/* Title & Series Info */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-center gap-2">
                <span className="bg-black text-[#D4FF00] border border-[#D4FF00]/40 px-3 py-0.5 text-[9px] font-black uppercase tracking-widest animate-pulse">
                  ⚡ READY TO RIP
                </span>
                {pack.badgeText && (
                  <span className="bg-[#D4FF00] text-black border border-black px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                    {pack.badgeText}
                  </span>
                )}
              </div>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter text-white">
                {pack.name}
              </h2>
              <p className="text-neutral-400 font-bold uppercase tracking-widest text-xs">
                CONTAINS <strong className="text-[#D4FF00]">{pack.size} GUARANTEED CARDS</strong> • DIGITAL BOOSTER PACK
              </p>
            </div>

            {/* Realistic 3D Foil Booster Pack */}
            <div
              className="perspective-[1200px] py-2 cursor-pointer group"
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
                className={cn(
                  "w-64 sm:w-72 aspect-[750/1140] border-4 border-black relative flex flex-col justify-between overflow-hidden shadow-[16px_16px_0px_0px_#D4FF00] transition-shadow duration-300 group-hover:shadow-[20px_20px_0px_0px_#ffffff]",
                  pack.color || "bg-neutral-900"
                )}
              >
                {/* Top Crimped Heat-Seal Edge */}
                <div className="h-6 w-full bg-gradient-to-r from-neutral-800 via-neutral-600 to-neutral-800 border-b-2 border-black flex items-center justify-center overflow-hidden z-20">
                  <div
                    className="w-full h-full opacity-60"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(90deg, #000 0px, #000 3px, #fff 3px, #fff 6px)'
                    }}
                  />
                </div>

                {/* Foil Hologram Sheen (Animated across pack) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform pointer-events-none z-10" />

                {/* Pack Branding Header */}
                <div className="p-4 text-center z-10 space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-neutral-300">
                    <Award size={13} className="text-[#D4FF00]" />
                    <span>ARTCARD OFFICIAL</span>
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {pack.name}
                  </h3>
                  {pack.editions && pack.editions.length > 0 && (
                    <div className="inline-block text-[8px] font-black uppercase bg-black text-[#D4FF00] px-2 py-0.5 border border-[#D4FF00]/40">
                      {pack.editions.join(' • ')}
                    </div>
                  )}
                </div>

                {/* Pack Poster Artwork or Emblem */}
                <div className="flex-1 flex items-center justify-center px-4 py-1 z-10">
                  {pack.coverPhotoUrl ? (
                    <div className="w-36 aspect-[750/1050] overflow-hidden border-2 border-black bg-black shadow-lg relative group-hover:scale-105 transition-transform duration-300">
                      <img src={pack.coverPhotoUrl} alt={pack.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-black bg-black/40 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                      <PackageOpen size={60} className="text-[#D4FF00]" />
                    </div>
                  )}
                </div>

                {/* SERRATED TEAR STRIP (TACTILE RIP PERFORATION) */}
                <div className="w-full my-1 relative z-30 px-2">
                  <div className="w-full h-9 bg-black border-2 border-[#D4FF00] flex items-center justify-between px-2 text-[#D4FF00] shadow-[0_0_12px_rgba(212,255,0,0.3)] animate-pulse">
                    <div className="flex items-center gap-1">
                      <Zap size={13} className="fill-[#D4FF00]" />
                      <span className="text-[10px] font-black uppercase tracking-widest">PULL TO RIP</span>
                    </div>
                    {/* Perforation Dashes */}
                    <div className="flex-1 mx-2 flex items-center justify-center overflow-hidden">
                      <span className="font-mono text-xs tracking-widest text-[#D4FF00]/80">-- - -- - --</span>
                    </div>
                    <ChevronRight size={16} className="animate-bounce" />
                  </div>
                </div>

                {/* Bottom Crimped Heat-Seal Edge */}
                <div className="h-6 w-full bg-gradient-to-r from-neutral-800 via-neutral-600 to-neutral-800 border-t-2 border-black flex items-center justify-center overflow-hidden z-20">
                  <div
                    className="w-full h-full opacity-60"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(90deg, #000 0px, #000 3px, #fff 3px, #fff 6px)'
                    }}
                  />
                </div>
              </motion.div>
            </div>

            {/* Big Neo-Brutalist Trigger Button */}
            <div className="space-y-2 pt-2">
              <button
                onClick={triggerRip}
                className="bg-[#D4FF00] text-black hover:bg-white hover:text-black px-10 py-4 border-4 border-black font-black uppercase tracking-widest text-lg sm:text-xl transition-all shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:translate-x-1 hover:translate-y-1 flex items-center gap-2 mx-auto"
              >
                <Zap size={22} className="fill-black" />
                <span>RIP OPEN FOIL PACK</span>
              </button>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                TIP: TAP THE PACK OR DRAG THE RIP STRIP TO TEAR
              </p>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 2: VISCERAL TEAR & PARTICLE EXPLOSION                               */}
        {/* ========================================================================= */}
        {stage === 'ripping' && (
          <div className="flex flex-col items-center justify-center z-20 relative">
            {/* Shaking Torn Pack */}
            <motion.div
              animate={{
                x: [-6, 6, -5, 5, -3, 3, 0],
                y: [0, -3, 3, -2, 2, 0],
                scale: [1, 1.05, 1.1, 1.15]
              }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="relative w-64 sm:w-72 aspect-[750/1140] flex flex-col items-center justify-center"
            >
              {/* Torn Top Foil Flap (Rotates Backward / Flies Off) */}
              <motion.div
                initial={{ rotateX: 0, y: 0 }}
                animate={{ rotateX: -95, y: -70, opacity: 0.8 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className={cn(
                  "w-full h-24 border-4 border-black relative overflow-hidden",
                  pack.color || "bg-neutral-900"
                )}
                style={{ transformOrigin: 'top center' }}
              >
                <div className="h-4 w-full bg-gradient-to-r from-neutral-800 via-neutral-600 to-neutral-800 border-b-2 border-black" />
                <div className="p-2 text-center text-white font-black text-xs uppercase">
                  {pack.name}
                </div>
              </motion.div>

              {/* Radiant Volumetric Light Beams Blasting Through Tear Opening */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5, 3], opacity: [0, 1, 0.8], rotate: 180 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div
                  className="w-[450px] h-[450px] rounded-full blur-sm"
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent, #D4FF00, transparent 45deg, #ffffff, transparent 90deg, #D4FF00, transparent 180deg, #D4FF00)'
                  }}
                />
              </motion.div>

              {/* Lower Pack Body */}
              <motion.div
                animate={{ y: [0, 15, 25] }}
                transition={{ duration: 0.7 }}
                className={cn(
                  "w-full flex-1 border-4 border-black relative overflow-hidden flex flex-col items-center justify-center p-4",
                  pack.color || "bg-neutral-900"
                )}
              >
                <PackageOpen size={72} className="text-[#D4FF00] animate-bounce" />
                <span className="text-white font-black text-sm uppercase tracking-widest mt-2 animate-pulse">
                  BURSTING OPEN...
                </span>
              </motion.div>

              {/* Floating Confetti / Foil Shards */}
              {Array.from({ length: 18 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    x: 0,
                    y: 0,
                    scale: 0,
                    rotate: 0
                  }}
                  animate={{
                    x: (Math.random() - 0.5) * 450,
                    y: (Math.random() - 0.5) * 450,
                    scale: [0, 1.4, 0.6],
                    rotate: Math.random() * 720
                  }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                  className={cn(
                    "absolute w-3 h-3 border border-black",
                    i % 3 === 0 ? "bg-[#D4FF00]" : i % 3 === 1 ? "bg-white" : "bg-amber-400"
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
            className="w-full flex flex-col items-center justify-center space-y-6 text-center z-30 py-4"
          >
            {/* Walkout Banner */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="space-y-1"
            >
              <div className="inline-flex items-center gap-2 bg-[#D4FF00] text-black px-4 py-1 text-xs font-black uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
                <Trophy size={14} />
                <span>
                  {highestRarityCard.rarity === '1-of-1 Shield'
                    ? '👑 MYTHIC 1-OF-1 SHIELD DETECTED!'
                    : highestRarityCard.rarity === 'Gold Autograph'
                    ? '🔥 GOLD AUTOGRAPH HIT!'
                    : '✨ SILVER REFRACTOR DETECTED!'}
                </span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter text-white">
                SPECIAL WALKOUT
              </h2>
            </motion.div>

            {/* Stadium Tease Badges (Staggered walkout reveal) */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-lg">
              {/* 1. Nation Flag Tease */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={walkoutStep >= 1 ? { scale: 1, opacity: 1 } : {}}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                  "px-4 py-2 border-2 border-black font-black uppercase tracking-wider text-sm flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  walkoutStep >= 1 ? "bg-white text-black" : "bg-neutral-800 text-neutral-500 border-neutral-700"
                )}
              >
                <span className="text-xl">{walkoutStep >= 1 ? walkoutFlag : '❓'}</span>
                <span>{walkoutStep >= 1 ? walkoutNation || 'INTERNATIONAL' : 'NATIONALITY'}</span>
              </motion.div>

              {/* 2. Position Tease */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={walkoutStep >= 2 ? { scale: 1, opacity: 1 } : {}}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                  "px-4 py-2 border-2 border-black font-black uppercase tracking-wider text-sm flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
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
                  "px-4 py-2 border-2 border-black font-black uppercase tracking-wider text-sm flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  walkoutStep >= 3 ? "bg-white text-black" : "bg-neutral-800 text-neutral-500 border-neutral-700"
                )}
              >
                <span>CLUB:</span>
                <span>{walkoutStep >= 3 ? walkoutClub || 'CLUB SQUAD' : '???'}</span>
              </motion.div>
            </div>

            {/* Glowing Silhouette / Card Reveal */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative w-52 sm:w-60 aspect-[750/1050] my-2"
            >
              {/* Radiating Light Aura */}
              <div className="absolute inset-0 bg-[#D4FF00] blur-2xl opacity-60 rounded-xl animate-pulse" />

              <div className="relative w-full h-full border-4 border-black bg-neutral-900 overflow-hidden shadow-[12px_12px_0px_0px_#D4FF00]">
                {walkoutStep >= 4 && highestRarityCard.imageUrl ? (
                  <img
                    src={highestRarityCard.imageUrl}
                    alt={highestRarityCard.player}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-neutral-800 to-black text-white">
                    <Shield size={64} className="text-[#D4FF00] mb-2 animate-bounce" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#D4FF00]">
                      TOP HIT READY
                    </span>
                    <span className="text-base font-black uppercase mt-1">
                      {walkoutStep >= 4 ? highestRarityCard.player : 'TAP TO UNVEIL'}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Walkout Continue Button */}
            <button
              onClick={() => setStage('reveal')}
              className="bg-[#D4FF00] text-black hover:bg-white px-8 py-3.5 border-4 border-black font-black uppercase tracking-widest text-base transition-all shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-1 hover:translate-y-1 flex items-center gap-2"
            >
              <span>CONTINUE TO ALL CARDS</span>
              <ArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 4: CARD DECK REVEAL CHAMBER (SPOTLIGHT & GRID MODES)                */}
        {/* ========================================================================= */}
        {stage === 'reveal' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-5 z-20"
          >
            {/* Header: Pulled status, Total pack value & View Mode Switcher */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-neutral-800 pb-3">
              <div className="text-left space-y-0.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-[#D4FF00]" size={18} />
                  <span className="text-xs font-black uppercase tracking-widest text-[#D4FF00]">
                    PULLED FROM {pack.name} ({revealedIndices.size}/{drawnCards.length} REVEALED)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono font-black text-white">
                    EST. PACK VALUE: <span className="text-[#D4FF00]">{formatCurrency(totalPackValue)}</span>
                  </span>
                  {highestRarityCard && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700">
                      BEST: {highestRarityCard.rarity}
                    </span>
                  )}
                </div>
              </div>

              {/* View Switcher: Spotlight vs Grid */}
              <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 p-1">
                <button
                  onClick={() => setRevealMode('spotlight')}
                  className={cn(
                    "px-3 py-1 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors",
                    revealMode === 'spotlight' ? "bg-[#D4FF00] text-black" : "text-neutral-400 hover:text-white"
                  )}
                >
                  <Maximize2 size={13} />
                  <span>SPOTLIGHT</span>
                </button>
                <button
                  onClick={() => setRevealMode('grid')}
                  className={cn(
                    "px-3 py-1 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors",
                    revealMode === 'grid' ? "bg-[#D4FF00] text-black" : "text-neutral-400 hover:text-white"
                  )}
                >
                  <LayoutGrid size={13} />
                  <span>GRID ({drawnCards.length})</span>
                </button>
              </div>
            </div>

            {/* ------------------------------------------------------------------- */}
            {/* VIEW MODE A: SPOTLIGHT (ONE-BY-ONE FLIP SHOWCASE)                   */}
            {/* ------------------------------------------------------------------- */}
            {revealMode === 'spotlight' && (
              <div className="flex flex-col items-center justify-center space-y-4 py-2">
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
                    <div className="flex flex-col items-center space-y-3">
                      {/* Spotlight Card Carousel */}
                      <div className="flex items-center justify-center gap-4 sm:gap-8">
                        {/* Prev Button */}
                        <button
                          onClick={handlePrevSpotlight}
                          disabled={spotlightIndex === 0}
                          className="p-3 bg-neutral-900 text-white border-2 border-black hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-900 transition-colors shadow-[2px_2px_0px_0px_rgba(255,255,255,0.4)]"
                        >
                          <ArrowLeft size={18} />
                        </button>

                        {/* The 3D Flipping Card Container */}
                        <div
                          onClick={() => handleRevealCard(spotlightIndex)}
                          className="w-56 sm:w-64 aspect-[750/1050] perspective-[1000px] cursor-pointer"
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
                              className="absolute inset-0 w-full h-full border-4 border-black bg-gradient-to-b from-neutral-800 via-neutral-900 to-black p-4 flex flex-col items-center justify-between text-white shadow-[8px_8px_0px_0px_#D4FF00]"
                            >
                              <div className="w-full flex justify-between items-center text-[9px] font-black uppercase text-neutral-400">
                                <span>CARD #{spotlightIndex + 1}</span>
                                <span>ARTCARD</span>
                              </div>
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <div className="w-14 h-14 rounded-full border-2 border-[#D4FF00] flex items-center justify-center animate-bounce">
                                  <Sparkles size={24} className="text-[#D4FF00]" />
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest text-[#D4FF00]">
                                  CLICK TO FLIP
                                </span>
                              </div>
                              <div className="text-[9px] font-mono text-neutral-500 uppercase">
                                TAP OR CLICK
                              </div>
                            </div>

                            {/* Card Front (Revealed State) */}
                            <div
                              style={{
                                backfaceVisibility: 'hidden',
                                transform: 'rotateY(180deg)'
                              }}
                              className={cn(
                                "absolute inset-0 w-full h-full border-4 overflow-hidden flex flex-col bg-white",
                                isShield
                                  ? "border-[#D4FF00] shadow-[0_0_25px_#D4FF00]"
                                  : isGold
                                  ? "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.8)]"
                                  : isSilver
                                  ? "border-slate-300 shadow-[0_0_15px_rgba(203,213,225,0.8)]"
                                  : "border-black shadow-[8px_8px_0px_0px_rgba(255,255,255,0.4)]"
                              )}
                            >
                              {card.imageUrl ? (
                                <img src={card.imageUrl} alt={card.player} className="w-full h-full object-cover" />
                              ) : (
                                <div className="h-full flex flex-col justify-between p-4 bg-neutral-900 text-white relative">
                                  <div className={cn("absolute inset-0 opacity-40 bg-gradient-to-tr", card.imageGradient)} />
                                  <div className="relative z-10 text-left">
                                    <span className="text-xs font-black uppercase text-[#D4FF00]">{card.team}</span>
                                    <h4 className="text-base font-black uppercase tracking-tight">{card.player}</h4>
                                  </div>
                                  <div className="relative z-10 text-[9px] font-black uppercase text-neutral-400">
                                    {card.year} • {card.set}
                                  </div>
                                </div>
                              )}

                              {/* Rarity Pill */}
                              <div className="absolute top-2 left-2 z-20">
                                <span
                                  className={cn(
                                    "px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border border-black",
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
                              <div className="absolute bottom-2 right-2 z-20 bg-black text-[#D4FF00] px-2.5 py-1 text-xs font-mono font-black border border-white/20">
                                {formatCurrency(card.currentPrice)}
                              </div>
                            </div>
                          </motion.div>
                        </div>

                        {/* Next Button */}
                        <button
                          onClick={handleNextSpotlight}
                          disabled={spotlightIndex === drawnCards.length - 1}
                          className="p-3 bg-neutral-900 text-white border-2 border-black hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-900 transition-colors shadow-[2px_2px_0px_0px_rgba(255,255,255,0.4)]"
                        >
                          <ArrowRight size={18} />
                        </button>
                      </div>

                      {/* Card Details Bar */}
                      <div className="text-center space-y-1">
                        <div className="text-lg font-black uppercase text-white tracking-tight">
                          {isRevealed ? card.player : `Card ${spotlightIndex + 1} of ${drawnCards.length}`}
                        </div>
                        {isRevealed && (
                          <div className="flex items-center justify-center gap-2 text-xs font-bold text-neutral-400">
                            {cardFlag && <span>{cardFlag}</span>}
                            <span>{cardClub}</span>
                            <span>•</span>
                            <span>{card.position}</span>
                            <span>•</span>
                            <span className="text-[#D4FF00]">{formatCurrency(card.currentPrice)}</span>
                          </div>
                        )}
                      </div>

                      {/* Dots Pagination */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {drawnCards.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSpotlightIndex(idx)}
                            className={cn(
                              "w-2.5 h-2.5 transition-all border border-black",
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[55vh] overflow-y-auto p-1">
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
                        <div className="mt-1 text-left px-0.5">
                          <p className="text-xs font-black text-white uppercase truncate">{card.player}</p>
                          <p className="text-[9px] font-bold text-neutral-400 uppercase truncate">
                            {card.team} • {formatCurrency(card.currentPrice)}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Bottom Action Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-neutral-800">
              {revealedIndices.size < drawnCards.length && (
                <button
                  onClick={handleRevealAll}
                  className="bg-white hover:bg-neutral-200 text-black px-5 py-3 font-black uppercase tracking-widest text-xs border-2 border-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  REVEAL ALL ({drawnCards.length - revealedIndices.size} LEFT)
                </button>
              )}

              <button
                onClick={onClose}
                className="bg-[#D4FF00] text-black hover:bg-white px-7 py-3.5 font-black uppercase tracking-widest text-xs sm:text-sm border-2 border-black transition-all shadow-[4px_4px_0px_0px_rgba(255,255,255,0.8)] flex items-center gap-2"
              >
                <Check size={16} />
                <span>COLLECT ALL TO VAULT & CLOSE</span>
              </button>

              {onOpenAnother && (
                <button
                  onClick={onOpenAnother}
                  disabled={!isPreview && walletBalance < pack.price}
                  className={`px-5 py-3.5 font-black uppercase tracking-widest text-xs border-2 border-black transition-all flex items-center gap-2 ${
                    isPreview || walletBalance >= pack.price
                      ? 'bg-black text-[#D4FF00] hover:bg-neutral-900 border-[#D4FF00] shadow-[3px_3px_0px_0px_#D4FF00]'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border-neutral-700'
                  }`}
                >
                  <RotateCcw size={14} />
                  <span>
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
  );
}
