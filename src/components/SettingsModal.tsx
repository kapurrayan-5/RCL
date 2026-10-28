import React from 'react';
import { GameSettings } from '../utils/storage';
import { Settings as SettingsIcon, Volume2, HelpCircle, FastForward, RotateCcw, X } from 'lucide-react';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (settings: GameSettings) => void;
  onResetData: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetData,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b111c] border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 my-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-white tracking-wide">RCL SETTINGS</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-bold text-white">Audio & Synthesizer FX</div>
                <div className="text-[11px] text-slate-400">Match cheers, referee whistles, and UI clicks</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => onUpdateSettings({ ...settings, soundEnabled: e.target.checked })}
              className="w-4 h-4 accent-red-600 rounded"
            />
          </div>

          {/* Guided Mode Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <div>
                <div className="font-bold text-white">Guided Mode Tips</div>
                <div className="text-[11px] text-slate-400">Contextual tactical advice across all views</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.guidedEnabled}
              onChange={(e) => onUpdateSettings({ ...settings, guidedEnabled: e.target.checked })}
              className="w-4 h-4 accent-red-600 rounded"
            />
          </div>

          {/* Simulation Default Speed */}
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-3">
              <FastForward className="w-4 h-4 text-sky-400" />
              <div>
                <div className="font-bold text-white">Default Simulation Speed</div>
                <div className="text-[11px] text-slate-400">Speed when starting live matches</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {(['slow', 'normal', 'fast', 'ultra'] as const).map(speed => (
                <button
                  key={speed}
                  onClick={() => onUpdateSettings({ ...settings, simulationSpeed: speed })}
                  className={`py-1.5 font-bold rounded-lg capitalize ${
                    settings.simulationSpeed === speed
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {speed}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Progress */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                if (window.confirm('Reset all career statistics, saved squads, and scouting reports?')) {
                  onResetData();
                  onClose();
                }
              }}
              className="w-full py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold rounded-xl border border-rose-800/50 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset All Career Progress</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
