import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Lock, Play, Sparkles, X } from 'lucide-react';
import {
  AccessoryId,
  ALL_PANDA_TRICKS,
  AnyTrickId,
  PANDA_ACCESSORIES,
  PandaTrickId,
} from '../shared/soloCatalog';
import { SoloProgressState } from '../utils/soloStorage';
import { InteractivePanda, PandaSpeechOverride } from './InteractivePanda';
import { PandaFoodIcon } from './PandaFoodIcon';
import { TrickIcon } from './TrickIcons';
import { GameButton } from './GameAnimatedIcons';
import { SCENE_BG_IMAGES } from '../utils/campaignArt';
import { soundFx } from '../utils/sound';

interface PandaStudioViewProps {
  progress: SoloProgressState;
  onBuyAccessory: (id: AccessoryId) => void;
  onToggleEquip: (id: AccessoryId) => void;
  onBuyTrick: (id: PandaTrickId) => void;
  onAssignHomeTrick: (slotIndex: 0 | 1 | 2, trickId: AnyTrickId) => void;
}

const SLOT_LABELS: Record<string, string> = {
  head: 'Headwear',
  face: 'Eyewear',
  neck: 'Neckwear',
  prop: 'Held Prop',
};

const TRICK_BY_ID = new Map(ALL_PANDA_TRICKS.map((t) => [t.id, t]));
const ACCESSORY_BY_ID = new Map(PANDA_ACCESSORIES.map((a) => [a.id, a]));

const OUTFIT_CUSTOM_THANKS: Record<AccessoryId, { buy: string; equip: string }> = {
  leaf_bandana: {
    buy: 'Yaaay!! Tank youuu! Now I am a super cool bamboo explorer!',
    equip: 'Hehe! Tank you! My green bandana makes me feel so brave!',
  },
  red_bowtie: {
    buy: 'Ooooh!! Tank you bestie! Look at my fancy red bowtie!',
    equip: 'Hee-hee! Tank you! Do I look like a tiny gentleman panda?',
  },
  cool_shades: {
    buy: 'Whoa!! Tank youuu! I am the coolest panda in the whole world!',
    equip: 'Hehe! Tank you! Everything looks super sparkly through my shades!',
  },
  flower_clip: {
    buy: 'Aww!! Tank youuu! Dis pink flower smells sooo sweet!',
    equip: 'Hee-hee! Tank you! Does my pink blossom match my fluffy ear?',
  },
  party_hat: {
    buy: 'Yay yay yay!! Tank you!! Every day is panda party day now!',
    equip: 'Boing boing! Tank you! Let us have a silly party hat dance!',
  },
  chef_toque: {
    buy: 'Yummy!! Tank youuu! Chef Panda is gonna cook bamboo soup!',
    equip: 'Hehe! Tank you! Order up — one crispy yummy bamboo snack!',
  },
  golden_scarf: {
    buy: 'Mmmm!! Tank youuu! Dis fluffy scarf feels like a warm hug!',
    equip: 'Sooo cozy! Tank you bestie! My neck is super snuggly now!',
  },
  wizard_hat: {
    buy: 'Abracadabra!! Tank youuu! Now I am a magic starry wizard!',
    equip: 'Poof! Tank you! Watch me do super magic panda tricks!',
  },
  bamboo_staff: {
    buy: 'Whoaaa!! Tank youuu! My shiny green wand has panda magic!',
    equip: 'Swish swish! Tank you! Let us cast a happy puzzle spell!',
  },
  royal_crown: {
    buy: 'Yaaay!! Tank youuu! I am King Panda wif my shiny gold crown!',
    equip: 'Hehe! Tank you! Bow down to the cutest royal panda ever!',
  },
};

export function PandaStudioView({
  progress,
  onBuyAccessory,
  onToggleEquip,
  onBuyTrick,
  onAssignHomeTrick,
}: PandaStudioViewProps) {
  const [tab, setTab] = useState<'accessories' | 'tricks'>('accessories');
  const [previewAccessoryId, setPreviewAccessoryId] = useState<AccessoryId | null>(null);
  const [activeTrick, setActiveTrick] = useState<{ id: AnyTrickId; seq: number } | null>(null);
  const [studioSpeech, setStudioSpeech] = useState<PandaSpeechOverride | null>(null);
  const [selectedHomeSlot, setSelectedHomeSlot] = useState<0 | 1 | 2>(0);
  const [insufficientId, setInsufficientId] = useState<string | null>(null);

  const sayThanks = (text: string, reactAction: 'hop' | 'dance' | 'giggle') => {
    setStudioSpeech((prev) => ({
      text,
      seq: (prev?.seq ?? 0) + 1,
      reactAction,
    }));
  };

  const triggerInsufficient = (id: string) => {
    soundFx.conflict();
    setInsufficientId(id);
    setTimeout(() => {
      setInsufficientId((prev) => (prev === id ? null : prev));
    }, 850);
  };

  const handleAccessoryCardClick = (id: AccessoryId, owned: boolean) => {
    const item = ACCESSORY_BY_ID.get(id);
    if (owned) {
      soundFx.equipItem();
      setPreviewAccessoryId(null);
      const isCurrentlyEquipped = item ? progress.equippedAccessories[item.slot] === id : false;
      onToggleEquip(id);
      if (item && !isCurrentlyEquipped) {
        sayThanks(OUTFIT_CUSTOM_THANKS[id].equip, 'hop');
      }
      return;
    }
    // Locked accessories are clickable to preview live on the 3D Panda!
    soundFx.buttonTap();
    setPreviewAccessoryId((prev) => (prev === id ? null : id));
  };

  const handlePurchaseAccessory = (id: AccessoryId, price: number) => {
    if (progress.pandaFood < price) {
      triggerInsufficient(id);
      return;
    }
    soundFx.unlockItem();
    setPreviewAccessoryId(null);
    onBuyAccessory(id);
    sayThanks(OUTFIT_CUSTOM_THANKS[id].buy, 'dance');
  };

  const handleTrickCardClick = (trickId: AnyTrickId, price: number, owned: boolean) => {
    if (owned) {
      setActiveTrick((prev) => ({ id: trickId, seq: (prev?.seq ?? 0) + 1 }));
      return;
    }
    if (progress.pandaFood < price) {
      triggerInsufficient(trickId);
      return;
    }
    soundFx.unlockItem();
    onBuyTrick(trickId as PandaTrickId);
    setActiveTrick((prev) => ({ id: trickId, seq: (prev?.seq ?? 0) + 1 }));
  };

  const previewItem = previewAccessoryId ? ACCESSORY_BY_ID.get(previewAccessoryId) ?? null : null;
  const totalUnlockedTricks = 3 + progress.unlockedTricks.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col pb-3 gap-2 overflow-hidden"
    >
      {/* Full-Bleed Edge-to-Edge Animated Environment Stage: Boutique Outfit Shop <-> Trick School */}
      <div
        className={`shrink-0 relative w-full shadow-[0_8px_22px_rgba(45,35,20,0.16)] overflow-hidden transition-colors duration-300 ${
          tab === 'accessories' ? 'bg-[#FFF8ED]' : 'bg-[#EDF8FF]'
        }`}
      >
        {/* Illustrated Living Scene Backdrop Image (Outfits Boutique vs. Trick School Classroom!) */}
        <img
          src={tab === 'accessories' ? SCENE_BG_IMAGES.outfitShop : SCENE_BG_IMAGES.trickSchool}
          alt={tab === 'accessories' ? 'Panda outfit boutique shop interior' : 'Panda trick school classroom'}
          loading="eager"
          decoding="sync"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none transition-opacity duration-300"
        />
        {/* Soft vignette edge glow so the 3D Panda & signboard pop crisply over the interior art */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              tab === 'accessories'
                ? 'radial-gradient(ellipse at 50% 62%, rgba(255,250,238,0.12) 0%, rgba(72,42,18,0.16) 100%)'
                : 'radial-gradient(ellipse at 50% 62%, rgba(255,255,255,0.08) 0%, rgba(20,58,88,0.18) 100%)',
          }}
        />

        {/* Animated Floating Boutique Sparkles (Shop) / Chalkboard Magic Stars (School) */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {[
            { left: '14%', top: '34%', dur: 2.8, delay: 0.1 },
            { left: '84%', top: '38%', dur: 3.2, delay: 0.7 },
            { left: '22%', top: '66%', dur: 2.5, delay: 1.3 },
            { left: '78%', top: '62%', dur: 3.0, delay: 0.4 },
          ].map((mote, i) => (
            <motion.span
              key={`${tab}-mote-${i}`}
              className={`absolute w-2 h-2 rounded-full ${
                tab === 'accessories'
                  ? 'bg-[#FFE78F] shadow-[0_0_8px_#FFC93C]'
                  : 'bg-[#FFFFFF] shadow-[0_0_8px_#60D2FF]'
              }`}
              style={{ left: mote.left, top: mote.top }}
              animate={{ opacity: [0.2, 0.95, 0.2], scale: [0.6, 1.25, 0.6], y: [0, -7, 0] }}
              transition={{ duration: mote.dur, delay: mote.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>

        {/* Top Architectural Roof & Hanging Signboard — Switches cleanly between PANDA SHOP & TRICK SCHOOL! */}
        <div className="relative z-20 select-none pointer-events-none">
          {tab === 'accessories' ? (
            <>
              {/* Striped Scalloped Boutique Shop Awning */}
              <div className="h-[16px] w-full grid grid-cols-8">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={
                      i % 2 === 0
                        ? 'bg-gradient-to-b from-[#F05A66] to-[#D93D4C]'
                        : 'bg-gradient-to-b from-[#FFFDF7] to-[#FCEFD8]'
                    }
                  />
                ))}
              </div>
              <div className="w-full grid grid-cols-8 -mt-[1px]">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-[9px] rounded-b-full shadow-[0_3px_4px_rgba(110,45,30,0.2)] ${
                      i % 2 === 0 ? 'bg-[#C93342]' : 'bg-[#F5E0BD]'
                    }`}
                  />
                ))}
              </div>

              {/* Twinkling Warm Boutique Fairy Lights */}
              <div className="flex items-center justify-around px-4 -mt-1">
                {[0, 1, 2, 3, 4, 5, 6].map((bulb) => (
                  <motion.span
                    key={bulb}
                    className="w-2 h-2 rounded-full bg-[#FFE27A] shadow-[0_0_8px_#FFC83D]"
                    animate={{ opacity: [0.45, 1, 0.45], scale: [0.85, 1.18, 0.85] }}
                    transition={{
                      duration: 1.6,
                      delay: bulb * 0.22,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>

              {/* Hanging Stylized Boutique Signboard */}
              <div className="flex justify-center -mt-2 pb-0.5">
                <div
                  className="relative px-5 py-1 rounded-2xl bg-gradient-to-b from-[#FFFDF7] to-[#FCEFD5] border-2 border-[#D99B4E] shadow-[0_4px_12px_rgba(90,48,12,0.24)]"
                  style={{
                    transformOrigin: '50% -6px',
                    animation: 'pandoku-awning-sway 4.4s ease-in-out infinite',
                  }}
                >
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#F05A66]" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#F05A66]" />
                  <h1
                    className="font-display text-[20px] font-black tracking-wide leading-none bg-gradient-to-b from-[#D93D4C] via-[#B82F3D] to-[#7D1D28] bg-clip-text text-transparent"
                    style={{ filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.9))' }}
                  >
                    PANDA SHOP
                  </h1>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Sunny Schoolhouse Roof Trim + Colorful Swaying Classroom Pennant Bunting */}
              <div className="h-[12px] w-full bg-gradient-to-b from-[#3B82F6] to-[#2563EB] border-b-2 border-[#1D4ED8]" />
              <div className="flex items-start justify-around px-2 -mt-[1px]">
                {['#F59E0B', '#22C55E', '#EF4444', '#38BDF8', '#A855F7', '#F59E0B', '#22C55E', '#EF4444'].map(
                  (color, idx) => (
                    <motion.div
                      key={idx}
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: '11px solid transparent',
                        borderRight: '11px solid transparent',
                        borderTop: `14px solid ${color}`,
                        transformOrigin: '50% 0%',
                      }}
                      animate={{ rotate: [idx % 2 === 0 ? -4 : 4, idx % 2 === 0 ? 4 : -4, idx % 2 === 0 ? -4 : 4] }}
                      transition={{ duration: 2.6, delay: idx * 0.14, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )
                )}
              </div>

              {/* Hanging Stylized Chalkboard Timber Signboard: TRICK SCHOOL */}
              <div className="flex justify-center -mt-2.5 pb-0.5">
                <div
                  className="relative px-5 py-1 rounded-2xl bg-gradient-to-b from-[#1F6B48] to-[#144B32] border-[2.5px] border-[#D99B4E] shadow-[0_4px_12px_rgba(14,50,34,0.28)]"
                  style={{
                    transformOrigin: '50% -6px',
                    animation: 'pandoku-awning-sway 4.2s ease-in-out infinite',
                  }}
                >
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#FDE047]" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#FDE047]" />
                  <h1 className="font-display text-[20px] font-black tracking-wide leading-none text-[#FFFBEB] drop-shadow-[0_1.5px_0_rgba(10,36,24,0.65)]">
                    TRICK SCHOOL
                  </h1>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Live 3D Panda standing right on the Boutique Rug / Trick School Wooden Stage! */}
        <div className="relative z-10 -mt-2 px-1 pb-1">
          <InteractivePanda
            equippedAccessories={progress.equippedAccessories}
            previewAccessory={previewAccessoryId}
            activeTrick={activeTrick}
            speechOverride={studioSpeech}
            compact
            hideStageProps
          />
        </div>
      </div>

      {/* Live Preview Purchase Bar when trying on a locked accessory */}
      {previewItem && !progress.unlockedAccessories.includes(previewItem.id) && (
        <div className="mx-3.5 bg-gradient-to-r from-[#FFF7DB] to-[#FFEAB0] rounded-[22px] px-3.5 py-2 flex items-center justify-between gap-2 shadow-[0_4px_0_#E3BC60,0_8px_16px_rgba(196,138,28,0.15)] shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-black text-[#5D3703] truncate">
              Trying on {previewItem.name}
            </p>
            <p className="text-[11px] font-bold text-[#8B5A12]">Tap Buy to keep it forever</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <motion.button
              type="button"
              animate={insufficientId === previewItem.id ? { x: [0, -5, 5, -3, 3, 0] } : { x: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => handlePurchaseAccessory(previewItem.id, previewItem.price)}
              className={`min-h-[38px] inline-flex items-center gap-1.5 px-3.5 text-xs font-black rounded-full active:translate-y-[1px] transition-all cursor-pointer whitespace-nowrap tabular-nums ${
                progress.pandaFood >= previewItem.price
                  ? 'bg-gradient-to-b from-[#34C776] to-[#178A4C] text-white shadow-[0_3px_0_#0D5C31]'
                  : 'bg-white/80 text-[#607568] shadow-[0_2px_0_#C2D4C9]'
              }`}
            >
              <span>Buy</span>
              <PandaFoodIcon className="w-4 h-4" />
              <span>{previewItem.price}</span>
            </motion.button>

            <button
              type="button"
              onClick={() => {
                soundFx.buttonTap();
                setPreviewAccessoryId(null);
              }}
              aria-label="Clear preview"
              className="w-8 h-8 rounded-full bg-white/75 inline-flex items-center justify-center text-[#7A5417] hover:bg-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Consistent Sculpted 3D Toy Menu Buttons: Outfits vs Tricks */}
      <div className="mx-3.5 grid grid-cols-2 gap-2.5 shrink-0">
        <GameButton
          variant={tab === 'accessories' ? 'violet' : 'white'}
          size="sm"
          fullWidth
          onClick={() => {
            soundFx.buttonTap();
            setTab('accessories');
          }}
          className={`min-h-[42px] ${tab === 'accessories' ? '' : 'opacity-85'}`}
        >
          <span
            className="font-display text-[14.5px] tracking-wide"
            style={
              tab === 'accessories'
                ? { textShadow: '0 1.5px 0 rgba(56,22,126,0.35)' }
                : undefined
            }
          >
            Outfits ({progress.unlockedAccessories.length}/10)
          </span>
        </GameButton>

        <GameButton
          variant={tab === 'tricks' ? 'sky' : 'white'}
          size="sm"
          fullWidth
          onClick={() => {
            soundFx.buttonTap();
            setTab('tricks');
            setPreviewAccessoryId(null);
          }}
          className={`min-h-[42px] ${tab === 'tricks' ? '' : 'opacity-85'}`}
        >
          <span
            className="font-display text-[14.5px] tracking-wide"
            style={
              tab === 'tricks'
                ? { textShadow: '0 1.5px 0 rgba(13,92,153,0.35)' }
                : undefined
            }
          >
            Tricks ({totalUnlockedTricks}/13)
          </span>
        </GameButton>
      </div>

      {/* Scrollable Catalog Content with Always-Visible Kid-Friendly Scrollbar */}
      <div className="flex-1 min-h-0 overflow-y-auto kid-scrollbar pl-3.5 pr-2 space-y-2.5">
        {tab === 'accessories' ? (
          <div className="grid grid-cols-2 gap-2.5 pb-2">
            {PANDA_ACCESSORIES.map((item) => {
              const owned = progress.unlockedAccessories.includes(item.id);
              const equipped = progress.equippedAccessories[item.slot] === item.id;
              const isPreviewing = previewAccessoryId === item.id;
              const canAfford = progress.pandaFood >= item.price;
              const shook = insufficientId === item.id;

              return (
                <motion.div
                  key={item.id}
                  animate={shook ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => handleAccessoryCardClick(item.id, owned)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleAccessoryCardClick(item.id, owned);
                    }
                  }}
                  className={`relative overflow-hidden text-left p-3 rounded-[24px] flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${
                    equipped
                      ? 'bg-gradient-to-b from-[#FFFFFF] to-[#DEFCEB] shadow-[0_4px_0_#59C789,0_8px_18px_rgba(22,128,71,0.14)]'
                      : isPreviewing
                        ? 'bg-gradient-to-b from-[#FFFFFF] to-[#FFF1C7] shadow-[0_4px_0_#E6B03C,0_8px_18px_rgba(212,138,16,0.16)]'
                        : 'toy-surface'
                  }`}
                >
                  {/* Soft watercolor top tint matching the accessory color */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-md"
                    style={{ backgroundColor: item.accentColor }}
                  />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className="w-5 h-5 rounded-full shrink-0 shadow-[0_2px_4px_rgba(0,0,0,0.16),inset_0_2px_0_rgba(255,255,255,0.5)]"
                        style={{ backgroundColor: item.accentColor }}
                        aria-hidden="true"
                      />
                      <span className="text-[10.5px] font-extrabold text-[#5A7466]">
                        {SLOT_LABELS[item.slot]}
                      </span>
                    </div>

                    <p className="font-display text-[14px] font-black text-[#173022] mt-1.5 leading-snug">
                      {item.name}
                    </p>
                    <p className="text-[11px] font-semibold text-[#566F61] mt-0.5 leading-snug line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <div className="relative z-10 flex items-center justify-between pt-1 gap-1.5">
                    {equipped ? (
                      <span className="w-full py-1.5 px-2.5 rounded-full bg-gradient-to-b from-[#34C776] to-[#178A4C] text-white shadow-[0_2.5px_0_#0D5C31] inline-flex items-center justify-center gap-1 text-[11px] font-black">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Wearing</span>
                      </span>
                    ) : owned ? (
                      <span className="w-full py-1.5 px-2.5 rounded-full bg-[#E5F4EB] text-[#14603D] inline-flex items-center justify-center text-[11px] font-black">
                        Tap to Wear
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 text-xs font-black text-[#173625] tabular-nums">
                          <PandaFoodIcon className="w-4 h-4" />
                          <span>{item.price}</span>
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePurchaseAccessory(item.id, item.price);
                          }}
                          className={`min-h-[30px] px-3 inline-flex items-center gap-1 text-[11px] font-black rounded-full transition-all cursor-pointer whitespace-nowrap ${
                            canAfford
                              ? 'bg-gradient-to-b from-[#34C776] to-[#178A4C] text-white shadow-[0_2.5px_0_#0D5C31]'
                              : 'bg-[#E9F1EC] text-[#697F72]'
                          }`}
                        >
                          {canAfford ? (
                            <>
                              <Sparkles className="w-3 h-3" />
                              <span>Buy</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>Buy</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2.5 pb-2">
            {/* Special Golden Spotlight Cushion: Selected Star Tricks (Zero harsh border!) */}
            <div className="relative overflow-hidden bg-gradient-to-b from-[#FFFBE2] via-[#FFF0B8] to-[#FDE08A] rounded-[26px] p-3 space-y-2.5 shadow-[0_5px_0_#DFB14B,0_10px_22px_rgba(204,138,14,0.18),inset_0_2px_0_#FFFFFF]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-56 h-24 rounded-full bg-white/65 blur-xl"
              />

              <div className="relative z-10 flex items-center justify-between px-0.5">
                <span className="inline-flex items-center gap-1.5 font-display text-[15px] font-black text-[#734000]">
                  <Sparkles className="w-4 h-4 text-[#D9820B] shrink-0" />
                  <span>My Star Tricks</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/80 text-[10.5px] font-extrabold text-[#965805]">
                  Tap to swap!
                </span>
              </div>

              <div className="relative z-10 grid grid-cols-3 gap-2">
                {([0, 1, 2] as const).map((slotIdx) => {
                  const id = progress.homeTricks[slotIdx];
                  const item = TRICK_BY_ID.get(id);
                  const activeSlot = selectedHomeSlot === slotIdx;

                  return (
                    <motion.button
                      key={slotIdx}
                      type="button"
                      whileHover={{ y: -2, scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => {
                        soundFx.buttonTap();
                        setSelectedHomeSlot(slotIdx);
                      }}
                      className={`relative min-h-[66px] px-2 py-2 rounded-[20px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        activeSlot
                          ? 'bg-gradient-to-b from-[#FFFFFF] to-[#E2FAEC] text-[#145536] shadow-[0_4px_0_#3BB873,0_0_0_3px_#FFFFFF]'
                          : 'bg-white/88 text-[#5F4110] shadow-[0_3px_0_#DFBC68]'
                      }`}
                    >
                      {/* Little Golden Stage Number Star */}
                      <span
                        className={`absolute -top-2 -left-1.5 w-5 h-5 rounded-full font-display text-[10px] font-black inline-flex items-center justify-center shadow-xs ${
                          activeSlot
                            ? 'bg-gradient-to-b from-[#34C776] to-[#178A4C] text-white'
                            : 'bg-gradient-to-b from-[#FFC43D] to-[#E08A05] text-white'
                        }`}
                      >
                        {slotIdx + 1}
                      </span>
                      <TrickIcon id={id} className="w-7 h-7 shrink-0" />
                      <span className="block text-[11px] font-black truncate max-w-full leading-none">
                        {item?.shortLabel ?? id}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* All 13 Animations (Borderless Soft Collectible Toy Tiles!) */}
            <div className="grid grid-cols-2 gap-2.5">
              {ALL_PANDA_TRICKS.map((trick) => {
                const owned =
                  Boolean(trick.isDefault) ||
                  progress.unlockedTricks.includes(trick.id as PandaTrickId);
                const homeSlotIndex = progress.homeTricks.indexOf(trick.id);
                const isPinnedToHome = homeSlotIndex !== -1;
                const canAfford = progress.pandaFood >= trick.price;
                const shook = insufficientId === trick.id;
                const isPlaying = activeTrick?.id === trick.id;

                return (
                  <motion.div
                    key={trick.id}
                    animate={shook ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => handleTrickCardClick(trick.id, trick.price, owned)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTrickCardClick(trick.id, trick.price, owned);
                      }
                    }}
                    className={`text-left p-3 rounded-[24px] flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${
                      isPlaying
                        ? 'bg-gradient-to-b from-[#FFFFFF] to-[#FFF1C7] shadow-[0_4px_0_#E6B03C,0_8px_18px_rgba(212,138,16,0.18)]'
                        : 'toy-surface'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="w-10 h-10 rounded-2xl bg-gradient-to-b from-[#EEF8FF] to-[#DDF0FF] flex items-center justify-center shrink-0">
                          <TrickIcon id={trick.id} className="w-7 h-7" />
                        </span>
                        <span className="text-[10.5px] font-extrabold text-[#5A7466]">
                          {trick.isDefault ? 'Free' : '3D Trick'}
                        </span>
                      </div>

                      <p className="font-display text-[14px] font-black text-[#173022] mt-1.5 leading-snug">
                        {trick.name}
                      </p>
                      <p className="text-[11px] font-semibold text-[#566F61] mt-0.5 leading-snug line-clamp-2">
                        {trick.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 gap-1.5">
                      {owned ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#147A46]">
                            <Play className="w-3.5 h-3.5 fill-[#147A46]" />
                            <span>Play</span>
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              soundFx.equipItem();
                              onAssignHomeTrick(selectedHomeSlot, trick.id);
                            }}
                            className={`min-h-[28px] px-2.5 inline-flex items-center gap-1 text-[10.5px] font-black rounded-full transition-all cursor-pointer whitespace-nowrap ${
                              isPinnedToHome
                                ? 'bg-gradient-to-b from-[#FFD24C] to-[#EDA21F] text-[#5C3500] shadow-[0_2px_0_#C27C08]'
                                : 'bg-[#E7F4EC] text-[#174A2F]'
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>
                              {isPinnedToHome
                                ? `Star ${homeSlotIndex + 1}`
                                : `Pick #${selectedHomeSlot + 1}`}
                            </span>
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1 text-xs font-black text-[#173625] tabular-nums">
                            <PandaFoodIcon className="w-4 h-4" />
                            <span>{trick.price}</span>
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTrickCardClick(trick.id, trick.price, false);
                            }}
                            className={`min-h-[30px] px-3 inline-flex items-center gap-1 text-[11px] font-black rounded-full transition-all cursor-pointer whitespace-nowrap ${
                              canAfford
                                ? 'bg-gradient-to-b from-[#FFC43D] to-[#E28606] text-white shadow-[0_2.5px_0_#A15600]'
                                : 'bg-[#E9F1EC] text-[#697F72]'
                            }`}
                          >
                            {canAfford ? (
                              <>
                                <Sparkles className="w-3 h-3" />
                                <span>Buy</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>Buy</span>
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
