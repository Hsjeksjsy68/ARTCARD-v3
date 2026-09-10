import React, { useState } from 'react';
import { FootballCard } from '../types';
import { getCardOpenInfo, CardOpenInfoSpec } from '../lib/cardOpenInfo';
import { packAudio } from '../lib/packAudio';
import { formatCurrency, cn } from '../lib/utils';
import {
  Shield,
  Award,
  Sparkles,
  CheckCircle2,
  Lock,
  Volume2,
  Copy,
  Check,
  X,
  ExternalLink,
  Flame,
  FileBadge,
  QrCode,
  Zap,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CardOpenInfoModalProps {
  card: FootballCard | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CardOpenInfoModal({ card, isOpen, onClose }: CardOpenInfoModalProps) {
  const [copied, setCopied] = useState(false);
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  if (!isOpen || !card) return null;

  const info: CardOpenInfoSpec = getCardOpenInfo(card);

  const handleCopyHash = () => {
    try {
      navigator.clipboard.writeText(info.authenticityCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handlePlaySoundProfile = () => {
    setIsPlayingSound(true);
    packAudio.playInfoOpenChime();
    setTimeout(() => {
      packAudio.playCardFlip(card.rarity);
      if (card.rarity === '1-of-1 Shield') {
        packAudio.playThunderClap();
      } else if (card.rarity === 'Gold Autograph') {
        packAudio.playWalkoutAlert('gold');
      } else if (card.rarity === 'Silver Refractor') {
        packAudio.playLaserBeam();
      } else {
        packAudio.playStadiumWhistle();
      }
      setTimeout(() => setIsPlayingSound(false), 1200);
    }, 200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-3 sm:p-4 overflow-y-auto backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="bg-neutral-950 border-4 border-black text-white w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-[12px_12px_0px_0px_rgba(212,255,0,0.9)] my-auto relative"
        >
          {/* Holographic Header Bar */}
          <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border-b-2 border-neutral-700 p-4 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#D4FF00] text-black border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <FileBadge size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn("px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border border-black", info.badgeBg)}>
                    {info.badge}
                  </span>
                  <span className="text-[10px] font-mono text-[#D4FF00] font-black">
                    {info.overallGrade}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-white mt-0.5">
                  OFFICIAL CARD OPEN INFO & AUTHENTICITY DOSSIER
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-neutral-300 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            {/* Card Showcase Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-900 border-2 border-neutral-800 p-3 sm:p-4 items-center">
              <div className="w-28 sm:w-36 aspect-[750/1050] mx-auto border-2 border-black overflow-hidden relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt={card.player} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-neutral-800 flex flex-col items-center justify-center p-2 text-center text-xs">
                    <Shield size={28} className="text-[#D4FF00] mb-1" />
                    <span className="text-[8px] font-bold uppercase">{card.player}</span>
                  </div>
                )}
                <div className="absolute top-1 left-1 bg-black text-[#D4FF00] px-1 py-0.2 text-[7px] font-mono font-black border border-[#D4FF00]/40">
                  {card.rarity}
                </div>
              </div>

              <div className="sm:col-span-2 space-y-2 text-left">
                <div>
                  <div className="text-[10px] font-mono font-black text-[#D4FF00] tracking-widest uppercase">
                    {card.team} • {card.position}
                  </div>
                  <h4 className="text-xl font-black uppercase text-white tracking-tight">
                    {card.player}
                  </h4>
                  <p className="text-xs text-neutral-400 font-medium leading-relaxed">
                    {info.tagline}
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-800 flex flex-wrap gap-2 text-[10px] font-mono">
                  <div className="bg-black px-2.5 py-1 border border-neutral-700">
                    <span className="text-neutral-400">EST. VALUE: </span>
                    <span className="text-[#D4FF00] font-black">{formatCurrency(card.currentPrice)}</span>
                  </div>
                  <div className="bg-black px-2.5 py-1 border border-neutral-700">
                    <span className="text-neutral-400">YEAR/SET: </span>
                    <span className="text-white font-black">{card.year} • {card.set}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Serial & Tamper Verification */}
            <div className="bg-neutral-900 border-2 border-neutral-700 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Lock size={12} className="text-[#D4FF00]" /> SERIAL IDENTIFIER & AUTHENTICITY HASH
                </span>
                <span className="text-[9px] font-mono text-[#D4FF00] bg-black px-2 py-0.5 border border-[#D4FF00]/30 font-black">
                  BLOCKCHAIN SECURED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-black p-3 border border-neutral-800 space-y-1">
                  <span className="text-[9px] font-black uppercase text-neutral-500">INDIVIDUAL SERIAL PRINT</span>
                  <div className="text-sm font-black font-mono text-[#D4FF00]">
                    {info.serialTag}
                  </div>
                  <span className="text-[9px] text-neutral-400 block">
                    {info.printRun}
                  </span>
                </div>

                <div className="bg-black p-3 border border-neutral-800 space-y-1">
                  <span className="text-[9px] font-black uppercase text-neutral-500">TAMPER-PROOF AUDIT CODE</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-white font-bold truncate">
                      {info.authenticityCode}
                    </span>
                    <button
                      onClick={handleCopyHash}
                      className="p-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-[#D4FF00] border border-neutral-600 transition-colors shrink-0"
                      title="Copy code"
                    >
                      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <span className="text-[9px] text-neutral-400 block">
                    Verified against official ARTCARD master ledger
                  </span>
                </div>
              </div>
            </div>

            {/* 4-Point Optical Mint Inspection Grade */}
            <div className="bg-neutral-900 border-2 border-neutral-700 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-[#D4FF00]" /> 4-POINT DIGITAL SUB-GRADE REPORT
                </span>
                <span className="text-xs font-mono font-black text-[#D4FF00]">
                  OVERALL: {info.overallGrade}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-black p-2.5 border border-neutral-800 text-center space-y-0.5">
                  <span className="text-[8px] font-black uppercase text-neutral-500 block">CENTERING</span>
                  <span className="text-xs font-mono font-black text-white block">{info.centeringGrade}</span>
                </div>
                <div className="bg-black p-2.5 border border-neutral-800 text-center space-y-0.5">
                  <span className="text-[8px] font-black uppercase text-neutral-500 block">CORNERS</span>
                  <span className="text-xs font-mono font-black text-white block">{info.cornersGrade}</span>
                </div>
                <div className="bg-black p-2.5 border border-neutral-800 text-center space-y-0.5">
                  <span className="text-[8px] font-black uppercase text-neutral-500 block">EDGES</span>
                  <span className="text-xs font-mono font-black text-white block">{info.edgesGrade}</span>
                </div>
                <div className="bg-black p-2.5 border border-neutral-800 text-center space-y-0.5">
                  <span className="text-[8px] font-black uppercase text-neutral-500 block">SURFACE</span>
                  <span className="text-xs font-mono font-black text-white block">{info.surfaceGrade}</span>
                </div>
              </div>
            </div>

            {/* Technical Substrate & Audio Profile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Foil & Hologram Specs */}
              <div className="bg-neutral-900 border-2 border-neutral-700 p-3.5 space-y-1.5">
                <span className="text-[9px] font-black uppercase text-neutral-400 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[#D4FF00]" /> SUBSTRATE & HOLOGRAM FINISH
                </span>
                <p className="text-xs font-bold text-white leading-tight">
                  {info.hologramType}
                </p>
                <p className="text-[10px] text-neutral-400">
                  Tier: <span className="text-[#D4FF00] font-mono">{info.tierScore}</span>
                </p>
              </div>

              {/* Acoustic Soundscape Profile */}
              <div className="bg-neutral-900 border-2 border-neutral-700 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-neutral-400 flex items-center gap-1.5">
                    <Volume2 size={12} className="text-[#D4FF00]" /> ACOUSTIC OPENING PROFILE
                  </span>
                  <button
                    onClick={handlePlaySoundProfile}
                    disabled={isPlayingSound}
                    className="px-2 py-0.5 bg-[#D4FF00] hover:bg-white text-black font-black text-[9px] uppercase transition-colors flex items-center gap-1"
                  >
                    <Volume2 size={10} />
                    {isPlayingSound ? 'PLAYING...' : 'TEST AUDIO'}
                  </button>
                </div>
                <p className="text-xs font-bold text-white leading-tight">
                  {info.soundProfile}
                </p>
                <p className="text-[10px] text-neutral-400">
                  Synthesized dynamically in-browser with Web Audio API
                </p>
              </div>
            </div>

            {/* Authentication Features Checklist */}
            <div className="bg-neutral-900/60 border border-neutral-800 p-4 space-y-2">
              <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider block">
                AUTHENTICATION & COLLECTOR RIGHTS:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {info.features.map((feat, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-neutral-300">
                    <CheckCircle2 size={14} className="text-[#D4FF00] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Vault Status Footer */}
            <div className="bg-black border-2 border-[#D4FF00]/40 p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-[#D4FF00] shrink-0" />
                <span className="text-[10px] font-mono text-neutral-300">
                  VAULT STORAGE: <strong className="text-white">{info.vaultStatus}</strong>
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2 bg-[#D4FF00] hover:bg-white text-black font-black text-xs uppercase tracking-widest border border-black shadow-[2px_2px_0px_0px_rgba(255,255,255,0.4)] transition-colors"
              >
                RETURN TO PACK
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
