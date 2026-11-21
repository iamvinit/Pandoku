import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Music, Shapes, Sparkles, Volume2, X } from 'lucide-react';
import { GameSettings } from '../utils/soloStorage';
import { soundFx } from '../utils/sound';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  musicOn: boolean;
  onToggleMusic: () => void;
  sfxMuted: boolean;
  onToggleSfx: () => void;
}

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}

function ToggleRow({ icon, title, description, checked, onToggle }: ToggleRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`w-full min-h-[60px] px-3.5 py-3 rounded-[22px] flex items-center justify-between gap-3 text-left active:scale-[0.985] transition-all cursor-pointer ${
        checked
          ? 'bg-gradient-to-r from-[#EBFBF2] to-[#F4FDF8] shadow-[0_3px_0_#AEE2C4]'
          : 'bg-[#F2F7F4] shadow-[0_2px_0_#D8E5DD]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            checked ? 'bg-white text-[#158348] shadow-2xs' : 'bg-white/80 text-[#667D70]'
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-black text-[#173022] leading-tight">{title}</p>
          <p className="text-xs font-semibold text-[#536D5E] mt-0.5 leading-snug">{description}</p>
        </div>
      </div>

      <span
        className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 flex items-center shadow-inner ${
          checked ? 'bg-[#20A55E] justify-end' : 'bg-[#C4D6CB] justify-start'
        }`}
        aria-hidden="true"
      >
        <span className="w-5 h-5 rounded-full bg-white shadow-sm block" />
      </span>
    </button>
  );
}

export function SettingsModal({
  open,
  onClose,
  settings,
  onUpdateSettings,
  musicOn,
  onToggleMusic,
  sfxMuted,
  onToggleSfx,
}: SettingsModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-[#142D1F]/45 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[440px] bg-gradient-to-b from-[#FFFFFF] to-[#F3FAF5] rounded-t-[32px] sm:rounded-[32px] px-5 pt-3 pb-6 shadow-[0_24px_60px_rgba(14,48,28,0.28)] space-y-4"
          >
            <div className="w-11 h-1.5 rounded-full bg-[#CDE0D4] mx-auto sm:hidden" />

            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-black text-[#173022]">
                Settings
              </h2>
              <button
                type="button"
                onClick={() => {
                  soundFx.buttonTap();
                  onClose();
                }}
                aria-label="Close settings"
                className="w-10 h-10 rounded-full bg-[#EAF4EE] flex items-center justify-center text-[#3D5B4A] hover:bg-[#DCECE2] cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2.6]" />
              </button>
            </div>

            <div className="space-y-2.5">
              <ToggleRow
                icon={<Shapes className="w-5 h-5" />}
                title="Tile Patterns"
                description="Show distinct geometric patterns on each color"
                checked={settings.showPatterns}
                onToggle={() => {
                  soundFx.buttonTap();
                  onUpdateSettings({ ...settings, showPatterns: !settings.showPatterns });
                }}
              />

              <ToggleRow
                icon={<Sparkles className="w-5 h-5" />}
                title="Helper ×"
                description="Easy mode · adds light × marks where a panda can’t go"
                checked={settings.autoX}
                onToggle={() => {
                  soundFx.buttonTap();
                  onUpdateSettings({ ...settings, autoX: !settings.autoX });
                }}
              />

              <ToggleRow
                icon={<Music className="w-5 h-5" />}
                title="Background Music"
                description="Cozy bamboo melody (auto-pauses when minimized)"
                checked={musicOn}
                onToggle={onToggleMusic}
              />

              <ToggleRow
                icon={<Volume2 className="w-5 h-5" />}
                title="Sound Effects"
                description="Tile taps, swipes, panda chimes, and victory audio"
                checked={!sfxMuted}
                onToggle={onToggleSfx}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                soundFx.buttonTap();
                onClose();
              }}
              className="w-full min-h-[50px] font-display text-base font-black text-white bg-gradient-to-b from-[#34C776] via-[#20A55E] to-[#158348] shadow-[0_5px_0_#0D5C31,0_10px_20px_rgba(21,131,72,0.24),inset_0_2px_0_rgba(255,255,255,0.4)] rounded-[22px] active:translate-y-[2px] transition-all cursor-pointer"
            >
              Done
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
