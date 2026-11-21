import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, LogOut } from 'lucide-react';
import {
  AccessoryId,
  AnyTrickId,
  PandaTrickId,
} from './shared/soloCatalog';
import {
  activateCheatUnlockAll,
  addPlayerXp,
  assignHomeTrickSlot,
  GameSettings,
  getPlayerLevelInfo,
  loadGameSettings,
  loadSoloProgress,
  purchaseAccessory,
  purchaseTrick,
  recordCampaignLevelSolve,
  recordDailyChallengeSolve,
  saveGameSettings,
  SoloProgressState,
  toggleEquipAccessory,
} from './utils/soloStorage';
import { useMultiplayer } from './hooks/useMultiplayer';
import { LobbyView } from './components/LobbyView';
import { DuelMenuStep, DuelMenuView } from './components/DuelMenuView';
import { MatchArena } from './components/MatchArena';
import { SoloArena, SoloSession } from './components/SoloArena';
import { SoloHubTab, SoloHubView } from './components/SoloHubView';
import { PandaStudioView } from './components/PandaStudioView';
import { XpProgressView } from './components/XpProgressView';
import { BambooIcon, XpIcon } from './components/PandaFoodIcon';
import {
  AnimatedDuelIcon,
  AnimatedHelpIcon,
  AnimatedPlayArrowIcon,
  AnimatedSettingsGearIcon,
  GameButton,
} from './components/GameAnimatedIcons';
import { HowToPlayModal } from './components/HowToPlayModal';
import { SettingsModal } from './components/SettingsModal';
import { soundFx } from './utils/sound';
import { preloadCampaignArt, SCENE_BG_IMAGES } from './utils/campaignArt';
import { preloadDailyChallengeArt } from './utils/dailyArt';

type AppScreen = 'home' | 'duel_menu' | 'solo_hub' | 'solo_play' | 'panda_studio' | 'xp_progress';

export default function App() {
  const mp = useMultiplayer();

  const [initialInviteCode] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('room') || '').trim().toUpperCase();
  });

  const [screen, setScreen] = useState<AppScreen>(() =>
    initialInviteCode ? 'duel_menu' : 'home'
  );
  const [duelMenuStep, setDuelMenuStep] = useState<DuelMenuStep>(() =>
    initialInviteCode ? 'join' : 'choose'
  );
  const [soloHubTab, setSoloHubTab] = useState<SoloHubTab>('campaigns');
  const [soloSession, setSoloSession] = useState<SoloSession | null>(null);
  const [soloProgress, setSoloProgress] = useState<SoloProgressState>(() =>
    loadSoloProgress()
  );

  const [gameSettings, setGameSettings] = useState<GameSettings>(() =>
    loadGameSettings()
  );
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [sfxMuted, setSfxMuted] = useState<boolean>(false);
  const [musicOn, setMusicOn] = useState<boolean>(true);
  const [soloIsActivelyPlaying, setSoloIsActivelyPlaying] = useState<boolean>(false);
  const [leaveConfirm, setLeaveConfirm] = useState<{
    kind: 'solo' | 'duel';
    destination: 'back' | 'xp_progress' | 'panda_studio';
  } | null>(null);
  const levelCheatSeqRef = useRef<number[]>([]);
  const creditedDuelKeyRef = useRef<string | null>(null);

  useEffect(() => {
    preloadCampaignArt();
    preloadDailyChallengeArt();
    const unlock = () => {
      soundFx.unlockAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (mp.roomState) {
      setScreen('home');
      setSoloSession(null);
    }
  }, [mp.roomState]);

  // Credit 1v1 Duel score into player's lifetime XP meter once per completed match
  useEffect(() => {
    const room = mp.roomState;
    if (!room || !mp.playerId || room.phase !== 'MATCH_OVER') return;
    const matchKey = `${room.code}:${room.roundSummaries.length}:${room.players.map((p) => p.score).join('-')}`;
    if (creditedDuelKeyRef.current === matchKey) return;
    creditedDuelKeyRef.current = matchKey;
    const me = room.players.find((p) => p.id === mp.playerId);
    if (me && me.score > 0) {
      setSoloProgress((prev) => addPlayerXp(prev, me.score));
    }
  }, [mp.roomState, mp.playerId]);

  const inMultiplayerMatch = Boolean(
    mp.roomState && mp.roomState.phase !== 'LOBBY' && mp.playerId
  );
  const inMultiplayerRoom = Boolean(mp.roomState);
  const isSubScreen = inMultiplayerRoom || screen !== 'home';

  useEffect(() => {
    if (!inMultiplayerMatch) {
      if (screen === 'solo_play') {
        soundFx.setMusicMood('solo');
      } else {
        soundFx.setMusicMood('start');
      }
    }
  }, [inMultiplayerMatch, screen]);

  const handleToggleSfx = () => {
    setSfxMuted((prev) => {
      const next = !prev;
      soundFx.setSfxMuted(next);
      if (!next) soundFx.buttonTap();
      return next;
    });
  };

  const handleToggleMusic = () => {
    setMusicOn((prev) => {
      const next = !prev;
      soundFx.setMusicEnabled(next);
      soundFx.buttonTap();
      return next;
    });
  };

  const handleBack = () => {
    soundFx.buttonTap();
    if (inMultiplayerMatch && mp.roomState?.phase !== 'MATCH_OVER') {
      setLeaveConfirm({ kind: 'duel', destination: 'back' });
      return;
    }
    if (screen === 'solo_play' && soloIsActivelyPlaying) {
      setLeaveConfirm({ kind: 'solo', destination: 'back' });
      return;
    }
    if (inMultiplayerRoom) {
      mp.leaveRoom();
    } else if (screen === 'solo_play') {
      setSoloSession(null);
      setScreen('solo_hub');
    } else if (
      screen === 'solo_hub' ||
      screen === 'duel_menu' ||
      screen === 'panda_studio' ||
      screen === 'xp_progress'
    ) {
      setScreen('home');
    }
  };

  const handleOpenXpProgress = () => {
    soundFx.buttonTap();
    if (inMultiplayerMatch && mp.roomState?.phase !== 'MATCH_OVER') {
      setLeaveConfirm({ kind: 'duel', destination: 'xp_progress' });
      return;
    }
    if (screen === 'solo_play' && soloIsActivelyPlaying) {
      setLeaveConfirm({ kind: 'solo', destination: 'xp_progress' });
      return;
    }
    if (inMultiplayerRoom) {
      mp.leaveRoom();
    }
    if (screen !== 'xp_progress') {
      setSoloSession(null);
      setScreen('xp_progress');
    }
  };

  const handleOpenPandaStudio = () => {
    soundFx.buttonTap();
    if (inMultiplayerMatch && mp.roomState?.phase !== 'MATCH_OVER') {
      setLeaveConfirm({ kind: 'duel', destination: 'panda_studio' });
      return;
    }
    if (screen === 'solo_play' && soloIsActivelyPlaying) {
      setLeaveConfirm({ kind: 'solo', destination: 'panda_studio' });
      return;
    }
    if (inMultiplayerRoom) {
      mp.leaveRoom();
    }
    if (screen !== 'panda_studio') {
      setSoloSession(null);
      setScreen('panda_studio');
    }
  };

  const handleConfirmLeaveGame = () => {
    soundFx.buttonTap();
    const pending = leaveConfirm;
    setLeaveConfirm(null);
    if (!pending) return;

    if (pending.kind === 'duel') {
      mp.leaveRoom();
      if (pending.destination === 'xp_progress') {
        setScreen('xp_progress');
      } else if (pending.destination === 'panda_studio') {
        setScreen('panda_studio');
      }
    } else if (pending.kind === 'solo') {
      setSoloIsActivelyPlaying(false);
      setSoloSession(null);
      if (pending.destination === 'xp_progress') {
        setScreen('xp_progress');
      } else if (pending.destination === 'panda_studio') {
        setScreen('panda_studio');
      } else {
        setScreen('solo_hub');
      }
    }
  };

  const handleCancelLeaveGame = () => {
    soundFx.buttonTap();
    setLeaveConfirm(null);
  };

  const handleCompleteSoloSession = useCallback(
    (session: SoloSession, stars: 1 | 2 | 3, solveTimeMs: number, xpEarned: number) => {
      let foodEarned = 0;
      let newTotalFood = soloProgress.pandaFood;
      let isNewBest = false;

      if (session.kind === 'daily') {
        const res = recordDailyChallengeSolve(
          soloProgress,
          session.spec.dateKey,
          stars,
          solveTimeMs,
          xpEarned
        );
        foodEarned = res.foodEarned;
        newTotalFood = res.nextState.pandaFood;
        isNewBest = res.isNewBest;
        setSoloProgress(res.nextState);
      } else {
        const res = recordCampaignLevelSolve(
          soloProgress,
          session.level.id,
          stars,
          solveTimeMs,
          xpEarned
        );
        foodEarned = res.foodEarned;
        newTotalFood = res.nextState.pandaFood;
        isNewBest = res.isNewBest;
        setSoloProgress(res.nextState);
      }

      return { foodEarned, newTotalFood, isNewBest };
    },
    [soloProgress]
  );

  const handleBuyAccessory = useCallback((id: AccessoryId) => {
    setSoloProgress((prev) => purchaseAccessory(prev, id) ?? prev);
  }, []);

  const handleToggleEquip = useCallback((id: AccessoryId) => {
    setSoloProgress((prev) => toggleEquipAccessory(prev, id));
  }, []);

  const handleBuyTrick = useCallback((id: PandaTrickId) => {
    setSoloProgress((prev) => purchaseTrick(prev, id) ?? prev);
  }, []);

  const handleAssignHomeTrick = useCallback((slotIndex: 0 | 1 | 2, trickId: AnyTrickId) => {
    setSoloProgress((prev) => assignHomeTrickSlot(prev, slotIndex, trickId));
  }, []);

  const handleCheatUnlockAll = useCallback(() => {
    setSoloProgress((prev) => activateCheatUnlockAll(prev));
  }, []);

  /** Single-player secret cheat code: pressing level tiles 1 -> 3 -> 9 -> 7 unlocks all levels & gives +100 Bamboo */
  const handleSoloLevelCheatTap = useCallback((levelId: number): boolean => {
    const nextSeq = [...levelCheatSeqRef.current, levelId].slice(-4);
    levelCheatSeqRef.current = nextSeq;
    if (
      nextSeq.length === 4 &&
      nextSeq[0] === 1 &&
      nextSeq[1] === 3 &&
      nextSeq[2] === 9 &&
      nextSeq[3] === 7
    ) {
      levelCheatSeqRef.current = [];
      setSoloProgress((prev) => activateCheatUnlockAll(prev));
      soundFx.unlockItem();
      return true;
    }
    return false;
  }, []);

  const handleUpdateGameSettings = useCallback((next: GameSettings) => {
    setGameSettings(next);
    saveGameSettings(next);
  }, []);

  const totalUnlockedCount =
    soloProgress.unlockedAccessories.length + soloProgress.unlockedTricks.length;
  const levelInfo = getPlayerLevelInfo(soloProgress.totalXp);

  const renderHeaderTitle = () => {
    if (inMultiplayerMatch) {
      return (
        <span className="inline-flex items-center justify-center gap-2 font-display text-[15px] font-black text-[#18201C] leading-none">
          <span className="w-6 h-6 rounded-lg bg-[#1B7A4E] inline-flex items-center justify-center shrink-0">
            <AnimatedDuelIcon className="w-4 h-4" />
          </span>
          <span>1v1 Duel</span>
        </span>
      );
    }
    if (inMultiplayerRoom) {
      return (
        <span className="inline-flex items-center justify-center gap-2 font-display text-[15px] font-black text-[#18201C] leading-none">
          <span className="w-6 h-6 rounded-lg bg-[#1B7A4E] inline-flex items-center justify-center shrink-0">
            <AnimatedDuelIcon className="w-4 h-4" />
          </span>
          <span>Duel Lobby</span>
        </span>
      );
    }
    if (
      screen === 'solo_hub' ||
      screen === 'solo_play' ||
      screen === 'panda_studio' ||
      screen === 'duel_menu' ||
      screen === 'xp_progress'
    ) {
      // Solo Hub/Play, Panda Shop, Trick School, 1v1 Duel & XP screens render their own focused visuals cleanly without a sub-header!
      return null;
    }
    return null;
  };

  const headerTitleNode = renderHeaderTitle();

  const isFullScreenDuelBg = screen === 'duel_menu' && !inMultiplayerRoom;
  const isCompactDuelStep = isFullScreenDuelBg && duelMenuStep !== 'choose';

  return (
    <div className="fixed inset-0 h-full w-full bg-gradient-to-b from-[#CBEAD7] via-[#D9F1E2] to-[#C2E3CF] flex items-center justify-center sm:py-4 sm:px-4 overflow-hidden">
      <div
        className={`w-full max-w-[440px] h-full sm:h-[min(860px,calc(100%-2rem))] sm:max-h-[900px] sm:rounded-[38px] sm:shadow-[0_28px_70px_rgba(16,66,40,0.22),0_0_0_6px_rgba(255,255,255,0.65)] flex flex-col overflow-hidden relative pb-[env(safe-area-inset-bottom)] ${
          isFullScreenDuelBg
            ? 'bg-[#132224]'
            : 'bg-gradient-to-b from-[#E3F5FF] via-[#F5FCF7] to-[#E5F6E9]'
        }`}
      >
        {/* Full-Screen 9:16 Portrait Bamboo Duel Dojo — Smoothly pans so stone platform ALWAYS grounds the pandas! */}
        {isFullScreenDuelBg ? (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#132224]">
            <motion.div
              initial={false}
              animate={{ y: isCompactDuelStep ? '-20%' : '0%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              className="absolute inset-0 w-full h-full"
            >
              <img
                src={SCENE_BG_IMAGES.duelArena}
                alt=""
                loading="eager"
                decoding="sync"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center select-none"
              />
              {/* Seamless mossy dark blend at the very bottom edge when panned upward on Create/Join */}
              <div
                className="absolute inset-x-0 bottom-0 h-28"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(19,34,36,0) 0%, rgba(19,34,36,0.92) 78%, #132224 100%)',
                }}
              />
            </motion.div>
            {/* Subtle top sky & lower button readability veil while keeping the lit stone platform crystal clear */}
            <div
              className="absolute inset-0"
              style={{
                background: isCompactDuelStep
                  ? 'linear-gradient(180deg, rgba(16,24,34,0.24) 0%, rgba(16,24,34,0.04) 24%, rgba(15,28,30,0.52) 44%, rgba(15,28,30,0.78) 100%)'
                  : 'linear-gradient(180deg, rgba(16,24,34,0.22) 0%, rgba(16,24,34,0.02) 48%, rgba(14,26,28,0.28) 68%, rgba(13,24,26,0.62) 100%)',
              }}
            />
          </div>
        ) : (
          /* Soft Sunlit Sky Glow behind Top HUD */
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 w-[360px] h-[140px] rounded-full bg-[#FFF7CF]/70 blur-2xl"
          />
        )}

        {/* Always-Visible Mobile Game Top HUD Bar — Safe-Area Padded & Responsive Across All Phone Widths */}
        <header className="shrink-0 z-30 flex flex-col relative pt-[env(safe-area-inset-top)]">
          {/* Row 1: Permanent Back slot + Equal-Width XP & Bamboo Jewel Capsules + Round Toy Settings & Help */}
          <div className="w-full min-w-0 h-[52px] min-[380px]:h-[56px] min-[400px]:h-[58px] px-2 min-[380px]:px-2.5 flex items-center gap-1 min-[380px]:gap-1.5">
            {/* Permanent Back Button Slot (always reserves identical width so XP & Bamboo never shift) */}
            {isSubScreen ? (
              <motion.button
                type="button"
                whileHover={{ scale: 1.07, y: -1 }}
                whileTap={{ scale: 0.91, y: 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                onClick={handleBack}
                aria-label="Go back"
                className="h-[38px] w-[38px] min-[380px]:h-[40px] min-[380px]:w-[40px] min-[400px]:h-[42px] min-[400px]:w-[42px] inline-flex items-center justify-center rounded-full bg-gradient-to-b from-[#FFFFFF] to-[#EBF6EF] text-[#17462E] shadow-[0_3.5px_0_#B4D0BE,0_6px_14px_rgba(20,64,38,0.14),inset_0_2px_0_#FFFFFF] cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-5 h-5 min-[400px]:w-6 min-[400px]:h-6 stroke-[2.8]" />
              </motion.button>
            ) : (
              <div
                aria-hidden="true"
                className="h-[38px] w-[38px] min-[380px]:h-[40px] min-[380px]:w-[40px] min-[400px]:h-[42px] min-[400px]:w-[42px] shrink-0"
              />
            )}

            {/* Equal-Width Center Pair: Blue XP Jewel Bar & Emerald Bamboo Counter */}
            <div className="flex-1 min-w-0 grid grid-cols-2 gap-1 min-[380px]:gap-1.5">
              {/* Blue Level & Progress Bar (exact same width & number size as Bamboo, bar-only without XP text) */}
              <motion.button
                type="button"
                whileHover={{ y: -1.5, scale: 1.02 }}
                whileTap={{ y: 2, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 480, damping: 22 }}
                onClick={handleOpenXpProgress}
                aria-label={`Level ${levelInfo.level}: ${levelInfo.currentSlotXp.toLocaleString()} of ${levelInfo.requiredSlotXp.toLocaleString()} XP. Tap for XP details`}
                className="w-full min-w-0 h-[38px] min-[380px]:h-[40px] min-[400px]:h-[42px] px-2 min-[380px]:px-2.5 bg-gradient-to-b from-[#FFFFFF] to-[#E6F2FF] rounded-full flex items-center gap-1.5 min-[380px]:gap-2 shadow-[0_3.5px_0_#9EC5F8,0_6px_14px_rgba(37,99,235,0.14),inset_0_2px_0_#FFFFFF] overflow-hidden cursor-pointer"
              >
                <XpIcon className="w-[19px] h-[19px] min-[380px]:w-[21px] min-[380px]:h-[21px] min-[400px]:w-[23px] min-[400px]:h-[23px] shrink-0 drop-shadow-[0_1px_1px_rgba(29,78,216,0.22)]" />
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-[3px]">
                  <span className="font-mono text-[14px] min-[380px]:text-[15px] min-[400px]:text-[16px] font-black text-[#1649A8] tabular-nums leading-none">
                    {levelInfo.level}
                  </span>
                  <div className="w-full h-[5.5px] min-[380px]:h-[6px] rounded-full bg-[#C7DFFA] overflow-hidden shadow-[inset_0_1px_2px_rgba(29,78,216,0.18)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#60A5FA] via-[#3B82F6] to-[#1D4ED8] transition-all duration-500"
                      style={{ width: `${Math.max(10, Math.round(levelInfo.progressRatio * 100))}%` }}
                    />
                  </div>
                </div>
              </motion.button>

              {/* Bamboo Counter (exact same width as XP!) */}
              <motion.button
                type="button"
                whileHover={{ y: -1.5, scale: 1.02 }}
                whileTap={{ y: 2, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 480, damping: 22 }}
                onClick={handleOpenPandaStudio}
                aria-label={`Bamboo balance: ${soloProgress.pandaFood}. Open Panda Shop`}
                className="w-full min-w-0 h-[38px] min-[380px]:h-[40px] min-[400px]:h-[42px] inline-flex items-center justify-center gap-1 min-[380px]:gap-1.5 px-2 min-[380px]:px-2.5 bg-gradient-to-b from-[#FFFFFF] to-[#E2F8EB] rounded-full shadow-[0_3.5px_0_#92D6AE,0_6px_14px_rgba(22,128,71,0.14),inset_0_2px_0_#FFFFFF] overflow-hidden cursor-pointer"
              >
                <BambooIcon className="w-[19px] h-[19px] min-[380px]:w-[21px] min-[380px]:h-[21px] min-[400px]:w-[23px] min-[400px]:h-[23px] shrink-0 drop-shadow-[0_1px_1px_rgba(20,85,54,0.2)]" />
                <span className="font-mono text-[14px] min-[380px]:text-[15px] min-[400px]:text-[16px] font-black text-[#125835] tabular-nums leading-none truncate">
                  {soloProgress.pandaFood}
                </span>
              </motion.button>
            </div>

            {/* Right Utility Controls: Round Glossy Toy Settings & Help */}
            <div className="flex items-center gap-1 min-[380px]:gap-1.5 shrink-0">
              <motion.button
                type="button"
                whileHover={{ y: -1.5, scale: 1.07 }}
                whileTap={{ y: 2, scale: 0.91 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                onClick={() => {
                  soundFx.buttonTap();
                  setShowSettings(true);
                }}
                aria-label="Open settings"
                title="Settings"
                className="h-[38px] w-[38px] min-[380px]:h-[40px] min-[380px]:w-[40px] min-[400px]:h-[42px] min-[400px]:w-[42px] inline-flex items-center justify-center rounded-full bg-gradient-to-b from-[#FFFFFF] to-[#EAF3EE] shadow-[0_3.5px_0_#B4C9BC,0_6px_14px_rgba(24,58,38,0.12),inset_0_2px_0_#FFFFFF] cursor-pointer"
              >
                <AnimatedSettingsGearIcon className="w-[19px] h-[19px] min-[380px]:w-[21px] min-[380px]:h-[21px] min-[400px]:w-[23px] min-[400px]:h-[23px]" />
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ y: -1.5, scale: 1.07 }}
                whileTap={{ y: 2, scale: 0.91 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                onClick={() => {
                  soundFx.buttonTap();
                  setShowRules(true);
                }}
                aria-label="How to play"
                title="How to play"
                className="h-[38px] w-[38px] min-[380px]:h-[40px] min-[380px]:w-[40px] min-[400px]:h-[42px] min-[400px]:w-[42px] inline-flex items-center justify-center rounded-full bg-gradient-to-b from-[#FFFDF2] to-[#FDEBB4] shadow-[0_3.5px_0_#DFB256,0_6px_14px_rgba(184,122,20,0.16),inset_0_2px_0_#FFFFFF] cursor-pointer"
              >
                <AnimatedHelpIcon className="w-[19px] h-[19px] min-[380px]:w-[21px] min-[380px]:h-[21px] min-[400px]:w-[23px] min-[400px]:h-[23px]" />
              </motion.button>
            </div>
          </div>

          {/* Row 2: Soft Floating Ribbon for titled sub-screens (NO grey React box!) */}
          {headerTitleNode && (
            <div className="px-4 pb-1 flex justify-center">
              <div className="px-4 py-1 rounded-full bg-white/75 backdrop-blur-xs shadow-[0_3px_10px_rgba(24,62,40,0.08)] inline-flex items-center justify-center">
                {headerTitleNode}
              </div>
            </div>
          )}
        </header>

        <main
          className={`flex-1 min-h-0 flex flex-col relative z-10 ${
            screen === 'home' ||
            screen === 'solo_play' ||
            screen === 'solo_hub' ||
            screen === 'panda_studio' ||
            screen === 'duel_menu' ||
            screen === 'xp_progress' ||
            (inMultiplayerRoom && mp.roomState?.phase === 'LOBBY') ||
            (inMultiplayerMatch && mp.roomState?.phase === 'PLAYING')
              ? 'overflow-hidden overscroll-none'
              : 'overflow-y-auto kid-scrollbar'
          }`}
        >
          {inMultiplayerMatch && mp.roomState && mp.playerId ? (
            <MatchArena
              roomState={mp.roomState}
              playerId={mp.playerId}
              serverOffsetMs={mp.serverOffsetMs}
              submissionError={mp.submissionError}
              equippedAccessories={soloProgress.equippedAccessories}
              showPatterns={gameSettings.showPatterns}
              autoX={gameSettings.autoX}
              onReportProgress={mp.reportProgress}
              onSubmitSolution={mp.submitSolution}
              onReadyNextRound={mp.readyNextRound}
              onRematch={mp.requestRematch}
              onLeaveRoom={mp.leaveRoom}
            />
          ) : screen === 'solo_play' && soloSession ? (
            <SoloArena
              session={soloSession}
              currentPandaFood={soloProgress.pandaFood}
              equippedAccessories={soloProgress.equippedAccessories}
              showPatterns={gameSettings.showPatterns}
              autoX={gameSettings.autoX}
              onCompleteSession={handleCompleteSoloSession}
              onSelectSession={(next) => setSoloSession(next)}
              onBackToHub={() => {
                setSoloSession(null);
                setScreen('solo_hub');
              }}
              onOpenStudio={() => {
                setSoloSession(null);
                setScreen('panda_studio');
              }}
              externalPaused={leaveConfirm?.kind === 'solo'}
              onActivePlayChange={setSoloIsActivelyPlaying}
            />
          ) : screen === 'solo_hub' ? (
            <SoloHubView
              progress={soloProgress}
              activeTab={soloHubTab}
              onTabChange={setSoloHubTab}
              onLevelTileTap={handleSoloLevelCheatTap}
              onStartDaily={(spec) => {
                setSoloHubTab('daily');
                setSoloSession({ kind: 'daily', spec });
                setScreen('solo_play');
              }}
              onStartLevel={(level) => {
                setSoloHubTab('campaigns');
                setSoloSession({ kind: 'campaign', level });
                setScreen('solo_play');
              }}
            />
          ) : screen === 'duel_menu' && !inMultiplayerRoom ? (
            <DuelMenuView
              initialInviteCode={initialInviteCode}
              equippedAccessories={soloProgress.equippedAccessories}
              connectionStatus={mp.status}
              error={mp.error}
              onStepChange={setDuelMenuStep}
              onClearError={mp.clearError}
              onCreateRoom={mp.createRoom}
              onJoinRoom={mp.joinRoom}
            />
          ) : screen === 'panda_studio' ? (
            <PandaStudioView
              progress={soloProgress}
              onBuyAccessory={handleBuyAccessory}
              onToggleEquip={handleToggleEquip}
              onBuyTrick={handleBuyTrick}
              onAssignHomeTrick={handleAssignHomeTrick}
            />
          ) : screen === 'xp_progress' ? (
            <XpProgressView
              progress={soloProgress}
              equippedAccessories={soloProgress.equippedAccessories}
            />
          ) : (
            <LobbyView
              roomState={mp.roomState}
              playerId={mp.playerId}
              error={mp.error}
              equippedAccessories={soloProgress.equippedAccessories}
              homeTricks={soloProgress.homeTricks}
              unlockedCount={totalUnlockedCount}
              onUpdateSettings={mp.updateSettings}
              onToggleReady={mp.toggleReady}
              onStartMatch={mp.startMatch}
              onLeaveRoom={mp.leaveRoom}
              onOpenDuelMenu={() => {
                mp.clearError();
                setDuelMenuStep('choose');
                setScreen('duel_menu');
              }}
              onOpenSoloHub={() => setScreen('solo_hub')}
              onOpenStudio={() => setScreen('panda_studio')}
              onCheatUnlockAll={handleCheatUnlockAll}
            />
          )}
        </main>
      </div>

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={gameSettings}
        onUpdateSettings={handleUpdateGameSettings}
        musicOn={musicOn}
        onToggleMusic={handleToggleMusic}
        sfxMuted={sfxMuted}
        onToggleSfx={handleToggleSfx}
      />
      <HowToPlayModal open={showRules} onClose={() => setShowRules(false)} />

      {/* Intuitive Child-Friendly Leave Game Confirmation Popup (Yes / No) */}
      <AnimatePresence>
        {leaveConfirm && (
          <motion.div
            key="leave-game-confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={handleCancelLeaveGame}
            className="fixed inset-0 z-50 bg-[#0F2418]/50 backdrop-blur-[3px] flex items-center justify-center p-5"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="leave-confirm-title"
              initial={{ opacity: 0, scale: 0.84, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 12 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[324px] rounded-[32px] bg-gradient-to-b from-[#FFFDF7] via-[#F7FDF9] to-[#E6F6EC] p-5 shadow-[0_10px_0_#AEE0C2,0_24px_54px_rgba(10,36,22,0.34),inset_0_2px_0_#FFFFFF] flex flex-col items-center text-center gap-3.5"
            >
              {/* Curious Tilting Panda Visual */}
              <motion.div
                animate={{ rotate: [-5, 5, -5], y: [0, -3, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-18 h-18 rounded-full bg-gradient-to-b from-[#FFF6D1] to-[#FFE184] shadow-[0_4px_0_#DFB03E] flex items-center justify-center"
                aria-hidden="true"
              >
                <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
                  <circle cx="18" cy="19" r="8" fill="#18201C" />
                  <circle cx="46" cy="19" r="8" fill="#18201C" />
                  <ellipse cx="32" cy="35" rx="19" ry="17" fill="#FFFFFF" stroke="#18201C" strokeWidth="2.8" />
                  <ellipse cx="24" cy="33" rx="5.2" ry="6" transform="rotate(-10 24 33)" fill="#18201C" />
                  <ellipse cx="40" cy="33" rx="5.2" ry="6" transform="rotate(10 40 33)" fill="#18201C" />
                  <circle cx="25" cy="31.5" r="2.1" fill="#FFFFFF" />
                  <circle cx="41" cy="31.5" r="2.1" fill="#FFFFFF" />
                  <ellipse cx="32" cy="39.5" rx="3" ry="2.1" fill="#18201C" />
                  <path d="M29 44 Q32 42 35 44" stroke="#18201C" strokeWidth="2.2" strokeLinecap="round" />
                  <circle cx="18.5" cy="39.5" r="3" fill="#FF9EB5" opacity="0.6" />
                  <circle cx="45.5" cy="39.5" r="3" fill="#FF9EB5" opacity="0.6" />
                </svg>
                <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-b from-[#FFCA45] to-[#E58A06] text-white font-display text-base font-black flex items-center justify-center border-2 border-white shadow-sm">
                  ?
                </span>
              </motion.div>

              <div>
                <h2
                  id="leave-confirm-title"
                  className="font-display text-[23px] font-black text-[#163826] leading-tight"
                >
                  {leaveConfirm.kind === 'duel' ? 'Leave this duel?' : 'Leave this puzzle?'}
                </h2>
                <p className="mt-1.5 text-[13px] font-extrabold text-[#4D6C5B] leading-snug">
                  {leaveConfirm.kind === 'duel'
                    ? 'Your friend is still playing this match!'
                    : 'Your pandas on this board will disappear!'}
                </p>
              </div>

              {/* Big, Playful, Super-Interactive Yes / No Buttons */}
              <div className="w-full grid grid-cols-2 gap-2.5 pt-1">
                <GameButton
                  variant="emerald"
                  size="lg"
                  fullWidth
                  icon={<AnimatedPlayArrowIcon className="w-4 h-4 text-white" />}
                  onClick={handleCancelLeaveGame}
                >
                  <span
                    className="font-display text-[16px] tracking-wide"
                    style={{ textShadow: '0 1.5px 0 rgba(10,65,34,0.35)' }}
                  >
                    No, Play!
                  </span>
                </GameButton>

                <motion.button
                  type="button"
                  whileHover={{ y: -2, scale: 1.03 }}
                  whileTap={{ y: 3, scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 18 }}
                  onClick={handleConfirmLeaveGame}
                  className="min-h-[52px] px-3 rounded-[22px] bg-gradient-to-b from-[#FF7B8E] to-[#E14560] text-white shadow-[0_5px_0_#B12741,0_10px_18px_rgba(225,69,96,0.28),inset_0_2px_0_rgba(255,255,255,0.45)] inline-flex items-center justify-center gap-1.5 cursor-pointer select-none whitespace-nowrap"
                >
                  <LogOut className="w-4.5 h-4.5 stroke-[2.6] shrink-0" />
                  <span
                    className="font-display text-[16px] font-black tracking-wide"
                    style={{ textShadow: '0 1.5px 0 rgba(135,20,42,0.35)' }}
                  >
                    Yes, Quit
                  </span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
