import React from 'react';
import { Volume2, VolumeX, HelpCircle, Trophy, Settings as SettingsIcon, Shield, Sliders } from 'lucide-react';

export type ActiveTab = 'SETUP' | 'SCOUT' | 'PICK' | 'PLACE' | 'PLAY' | 'SUMMARY';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  guidedEnabled: boolean;
  onToggleGuided: () => void;
  onOpenCareer: () => void;
  onOpenSettings: () => void;
  validLineupCount: number;
  hasCompletedCampaign: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  soundEnabled,
  onToggleSound,
  guidedEnabled,
  onToggleGuided,
  onOpenCareer,
  onOpenSettings,
  validLineupCount,
  hasCompletedCampaign,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#090e17]/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: RCL Brand Title and WIN IT ALL Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onSelectTab('SETUP')}>
            <div className="w-9 h-9 bg-gradient-to-br from-red-600 via-red-700 to-red-900 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.4)] border border-red-500/30">
              <span className="font-athletic font-black text-xl tracking-tighter text-white">RCL</span>
            </div>
            <div className="flex flex-col">
              <span className="font-athletic font-black text-xl tracking-wider text-white leading-none">
                RCL
              </span>
              <span className="text-[10px] tracking-widest text-amber-400 font-bold uppercase">
                WIN IT ALL
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Four Core Steps) */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Step 1: SETUP */}
          <button
            onClick={() => onSelectTab('SETUP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'SETUP'
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.5)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            1. SETUP
          </button>

          {/* Step 2: SCOUT & DRAFT */}
          <button
            onClick={() => onSelectTab('SCOUT')}
            className={`relative px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'SCOUT'
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.5)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>2. SCOUT</span>
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full font-athletic font-bold tabular-nums ${
              validLineupCount === 11 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {validLineupCount}/11
            </span>
          </button>

          {/* Step 3: LIVE CUP */}
          <button
            onClick={() => onSelectTab('PLAY')}
            className={`relative px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'PLAY'
                ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : validLineupCount === 11
                ? 'text-emerald-400 hover:bg-emerald-950/40'
                : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800/40'
            }`}
          >
            3. LIVE CUP
          </button>

          {/* Step 4: SUMMARY (if completed) */}
          {hasCompletedCampaign && (
            <button
              onClick={() => onSelectTab('SUMMARY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all whitespace-nowrap ${
                activeTab === 'SUMMARY'
                  ? 'bg-amber-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'text-amber-400 hover:text-white hover:bg-amber-950/40'
              }`}
            >
              4. SUMMARY
            </button>
          )}

          {/* Quick Roster Inspection Tab */}
          <button
            onClick={() => onSelectTab('PICK')}
            className={`hidden md:inline-block px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors ${
              activeTab === 'PICK' ? 'text-white bg-slate-800' : ''
            }`}
          >
            ROSTER
          </button>
        </nav>

        {/* Zone 3: Manager Profile & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Guided Mode Toggle */}
          <button
            onClick={onToggleGuided}
            title={guidedEnabled ? 'Guided Tips Enabled' : 'Guided Tips Disabled'}
            className={`p-2 rounded-lg text-xs font-medium transition-colors ${
              guidedEnabled ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
            className={`p-2 rounded-lg text-xs font-medium transition-colors ${
              soundEnabled ? 'bg-slate-800 text-emerald-400' : 'bg-slate-800/50 text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Manager Career / Profile */}
          <button
            onClick={onOpenCareer}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">CAREER</span>
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
