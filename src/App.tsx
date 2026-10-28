import React, { useState, useEffect, useMemo } from 'react';
import {
  ClubSeason,
  FormationType,
  GameDifficulty,
  KnockoutMatch,
  ManagerCareer,
  MatchSimulationResult,
  MatchTeamInfo,
  Player,
  TeamAnalytics,
  TeamTactics,
  TournamentHistoryRecord,
  TournamentState,
} from './types/game';
import { ALL_CLUBS, getClubById } from './data/clubs';
import { calculateTeamAnalytics, FORMATIONS, getPositionalCompatibility } from './utils/formation';
import { initializeTournament } from './utils/tournament';
import { sound } from './utils/sound';
import {
  GameSettings,
  loadCareer,
  loadScoutedClubIds,
  loadSettings,
  loadTactics,
  recordTournamentCompletion,
  resetAllData,
  saveCareer,
  saveScoutedClubIds,
  saveSettings,
  saveTactics,
} from './utils/storage';

import { ActiveTab, Navbar } from './components/Navbar';
import { PreMatchSetup } from './components/PreMatchSetup';
import { ScoutDraftPitch } from './components/ScoutDraftPitch';
import { LiveCupView } from './components/LiveCupView';
import { PostRunSummary } from './components/PostRunSummary';
import { CareerModal } from './components/CareerModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  // Navigation: Step 1 (SETUP), Step 2 (SCOUT), Step 3 (PLAY), Step 4 (SUMMARY), or PICK (ROSTER)
  const [activeTab, setActiveTab] = useState<ActiveTab>('SETUP');

  // Storage states
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [career, setCareer] = useState<ManagerCareer>(() => loadCareer());
  const [tactics, setTactics] = useState<TeamTactics>(() => loadTactics());
  const [difficulty, setDifficulty] = useState<GameDifficulty>('Standard');
  const [scoutedClubIds, setScoutedClubIds] = useState<string[]>(() => loadScoutedClubIds());

  // Formation & Squad
  const [formation, setFormation] = useState<FormationType>('4-3-3');
  const [startingXI, setStartingXI] = useState<Record<string, Player | null>>(() => {
    const slots = FORMATIONS['4-3-3'].slots;
    const initial: Record<string, Player | null> = {};
    slots.forEach(s => { initial[s.id] = null; });
    return initial;
  });

  // Tournament & Campaign Record
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [campaignSummary, setCampaignSummary] = useState<TournamentHistoryRecord | null>(null);
  const [rerollsRemaining, setRerollsRemaining] = useState<number>(3);

  const handleUseReroll = (): boolean => {
    if (rerollsRemaining <= 0) return false;
    setRerollsRemaining(prev => prev - 1);
    return true;
  };

  // Modals
  const [isCareerOpen, setIsCareerOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Sync sound setting
  useEffect(() => {
    sound.setMuted(!settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Derived scouted clubs
  const scoutedClubs = useMemo(() => {
    return scoutedClubIds
      .map(id => getClubById(id))
      .filter((c): c is ClubSeason => c !== undefined);
  }, [scoutedClubIds]);

  // All available players from scouted clubs
  const availablePlayers = useMemo(() => {
    const map = new Map<string, Player>();
    scoutedClubs.forEach(club => {
      club.roster.forEach(player => {
        if (!map.has(player.id)) {
          map.set(player.id, player);
        }
      });
    });
    return Array.from(map.values());
  }, [scoutedClubs]);

  // Placed player IDs
  const selectedPlayerIdsInXI = useMemo(() => {
    return Object.values(startingXI).filter((p): p is Player => p !== null).map(p => p.id);
  }, [startingXI]);

  // Calculate live team analytics
  const analytics: TeamAnalytics = useMemo(() => {
    return calculateTeamAnalytics(startingXI, formation, tactics, availablePlayers.length);
  }, [startingXI, formation, tactics, availablePlayers.length]);

  // Change formation
  const handleChangeFormation = (newFormation: FormationType) => {
    setFormation(newFormation);
    const newConfig = FORMATIONS[newFormation];
    const newXI: Record<string, Player | null> = {};

    const unassigned = Object.values(startingXI).filter((p): p is Player => p !== null);
    newConfig.slots.forEach(slot => {
      newXI[slot.id] = null;
    });

    unassigned.forEach(player => {
      const bestSlot = newConfig.slots.find(
        s => newXI[s.id] === null && getPositionalCompatibility(player, s.position).score >= 0.75
      );
      if (bestSlot) {
        newXI[bestSlot.id] = player;
      }
    });

    setStartingXI(newXI);
  };

  // Place player into slot
  const handlePlacePlayer = (slotId: string, player: Player) => {
    setStartingXI(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(s => {
        if (next[s]?.id === player.id) {
          next[s] = null;
        }
      });
      next[slotId] = player;
      return next;
    });
  };

  // Build user MatchTeamInfo
  const buildUserMatchTeam = (): MatchTeamInfo => {
    const config = FORMATIONS[formation];
    const lineup: Player[] = config.slots
      .map(s => startingXI[s.id])
      .filter((p): p is Player => p !== null);

    return {
      id: 'user-team',
      name: career.clubName || 'RCL Dream XI',
      shortName: 'RCL',
      primaryColor: '#dc2626',
      secondaryColor: '#ffffff',
      rating: analytics.overallRating,
      lineup,
      tactics,
      isUser: true,
    };
  };

  // Launch Live Cup (Step 3)
  const handleLaunchLiveCup = () => {
    const userTeam = buildUserMatchTeam();
    const newTourney = initializeTournament(userTeam, 'standard_32');
    setTournament(newTourney);
    setActiveTab('PLAY');
    sound.playWhistle();
  };

  // Conclude campaign (Step 4)
  const handleCampaignComplete = (
    finish: TournamentHistoryRecord['finish'],
    groups: any[],
    knockoutMatches: KnockoutMatch[]
  ) => {
    const userTeamId = 'user-team';

    let matchesPlayed = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsScored = 0;
    let goalsConceded = 0;
    let cleanSheets = 0;

    const userGroup = groups.find(g => g.teams.some((t: any) => t.team.id === userTeamId));
    if (userGroup) {
      userGroup.fixtures.forEach((f: any) => {
        if (f.played && f.result && (f.homeTeamId === userTeamId || f.awayTeamId === userTeamId)) {
          matchesPlayed++;
          const isHome = f.homeTeamId === userTeamId;
          const gf = isHome ? f.result.homeScore : f.result.awayScore;
          const ga = isHome ? f.result.awayScore : f.result.homeScore;
          goalsScored += gf;
          goalsConceded += ga;
          if (ga === 0) cleanSheets++;
          if (gf > ga) wins++;
          else if (gf === ga) draws++;
          else losses++;
        }
      });
    }

    knockoutMatches.forEach(m => {
      if (m.played && m.result && (m.homeTeam?.id === userTeamId || m.awayTeam?.id === userTeamId)) {
        matchesPlayed++;
        const isHome = m.homeTeam?.id === userTeamId;
        const gf = isHome ? m.result.homeScore : m.result.awayScore;
        const ga = isHome ? m.result.awayScore : m.result.homeScore;
        goalsScored += gf;
        goalsConceded += ga;
        if (ga === 0) cleanSheets++;
        if (m.result.winnerId === userTeamId) wins++;
        else losses++;
      }
    });

    const lineup = Object.values(startingXI).filter((p): p is Player => p !== null);
    const topPlayer = lineup.sort((a, b) => b.overall - a.overall)[0] || { name: 'Romário', overall: 94 };

    const record: TournamentHistoryRecord = {
      id: `camp-${Date.now()}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      format: 'RCL Cup (32 Teams)',
      squadName: career.clubName,
      finish,
      matchesPlayed: Math.max(1, matchesPlayed),
      wins,
      draws,
      losses,
      goalsScored,
      goalsConceded,
      cleanSheets,
      topScorer: { name: topPlayer.name, goals: Math.max(2, Math.round(goalsScored * 0.45)) },
      topAssister: { name: lineup[1]?.name || 'Playmaker', assists: Math.max(1, Math.round(goalsScored * 0.35)) },
      bestPlayer: { name: topPlayer.name, rating: topPlayer.overall },
    };

    recordTournamentCompletion(record);
    setCareer(loadCareer());
    setCampaignSummary(record);
    setActiveTab('SUMMARY');
  };

  // Play Again: restart campaign from Step 1
  const handlePlayAgain = () => {
    // Clear squad
    const slots = FORMATIONS[formation].slots;
    const freshXI: Record<string, Player | null> = {};
    slots.forEach(s => { freshXI[s.id] = null; });
    setStartingXI(freshXI);
    setTournament(null);
    setCampaignSummary(null);
    setRerollsRemaining(3);
    setActiveTab('SETUP');
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans">
      {/* Top Bar with Step Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          sound.playCardSelect();
        }}
        soundEnabled={settings.soundEnabled}
        onToggleSound={() => {
          const updated = { ...settings, soundEnabled: !settings.soundEnabled };
          setSettings(updated);
          saveSettings(updated);
        }}
        guidedEnabled={settings.guidedEnabled}
        onToggleGuided={() => {
          const updated = { ...settings, guidedEnabled: !settings.guidedEnabled };
          setSettings(updated);
          saveSettings(updated);
        }}
        onOpenCareer={() => setIsCareerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        validLineupCount={selectedPlayerIdsInXI.length}
        hasCompletedCampaign={campaignSummary !== null}
      />

      {/* Main Game Stage Surface */}
      <main className="flex-1 pb-16">
        {/* Step 1: Pre-Match Setup & Tactical Configuration */}
        {activeTab === 'SETUP' && (
          <PreMatchSetup
            difficulty={difficulty}
            onChangeDifficulty={setDifficulty}
            formation={formation}
            onChangeFormation={handleChangeFormation}
            tactics={tactics}
            onChangeTactics={(newTactics) => {
              setTactics(newTactics);
              saveTactics(newTactics);
            }}
            onProceedToScouting={() => setActiveTab('SCOUT')}
          />
        )}

        {/* Step 2: Scouting & Player Drafting (Squad Assembly) */}
        {activeTab === 'SCOUT' && (
          <ScoutDraftPitch
            formation={formation}
            startingXI={startingXI}
            onPlacePlayerInSlot={handlePlacePlayer}
            analytics={analytics}
            onLaunchLiveCup={handleLaunchLiveCup}
            rerollsRemaining={rerollsRemaining}
            onUseReroll={handleUseReroll}
          />
        )}

        {/* Step 3: Live Cup Simulation (Tournament Mode) */}
        {activeTab === 'PLAY' && (
          tournament ? (
            <LiveCupView
              tournament={tournament}
              onUpdateTournament={setTournament}
              onCampaignComplete={handleCampaignComplete}
              userTeam={buildUserMatchTeam()}
            />
          ) : (
            <div className="max-w-md mx-auto py-16 text-center space-y-4">
              <div className="text-sm text-slate-400">
                You must assemble your 11-man starting eleven before launching the Live Cup.
              </div>
              <button
                onClick={() => setActiveTab('SCOUT')}
                className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider"
              >
                Go to Scouting & Drafting
              </button>
            </div>
          )
        )}

        {/* Step 4: Post-Run Summary & Campaign Review */}
        {activeTab === 'SUMMARY' && campaignSummary && (
          <PostRunSummary
            summary={campaignSummary}
            totalTrophiesSecured={career.trophiesWon}
            onPlayAgain={handlePlayAgain}
          />
        )}
      </main>

      {/* Career Profile Modal */}
      {isCareerOpen && (
        <CareerModal
          career={career}
          onClose={() => setIsCareerOpen(false)}
          onUpdateManagerName={(name, clubName) => {
            const updated = { ...career, managerName: name, clubName };
            setCareer(updated);
            saveCareer(updated);
          }}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={(updated) => {
            setSettings(updated);
            saveSettings(updated);
          }}
          onResetData={() => {
            resetAllData();
            setSettings(loadSettings());
            setCareer(loadCareer());
            setScoutedClubIds(loadScoutedClubIds());
            setTactics(loadTactics());
            setTournament(null);
            setCampaignSummary(null);
            setRerollsRemaining(3);
            const freshXI: Record<string, Player | null> = {};
            FORMATIONS[formation].slots.forEach(s => { freshXI[s.id] = null; });
            setStartingXI(freshXI);
            setActiveTab('SETUP');
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
