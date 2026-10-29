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
import { MultiplayerRoom } from './types/multiplayer';
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
import { subscribeToRoomSocket } from './services/multiplayerApi';

import { ActiveTab, Navbar } from './components/Navbar';
import { PreMatchSetup } from './components/PreMatchSetup';
import { ScoutDraftPitch } from './components/ScoutDraftPitch';
import { LiveCupView } from './components/LiveCupView';
import { PostRunSummary } from './components/PostRunSummary';
import { CareerModal } from './components/CareerModal';
import { SettingsModal } from './components/SettingsModal';
import { MultiplayerLobbyModal } from './components/MultiplayerLobbyModal';
import { MultiplayerDraftView } from './components/MultiplayerDraftView';
import { H2HComparisonView } from './components/H2HComparisonView';
import { H2HMatchView } from './components/H2HMatchView';
import { LeaderboardModal } from './components/LeaderboardModal';

export default function App() {
  // Navigation: Step 1 (SETUP), Step 2 (SCOUT), Step 3 (PLAY), Step 4 (SUMMARY), or MP modes
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
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);

  // Multiplayer State
  const [multiplayerRoom, setMultiplayerRoom] = useState<MultiplayerRoom | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  // Check URL for invite code on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setIsMultiplayerOpen(true);
    }
  }, []);

  // Sync sound setting
  useEffect(() => {
    sound.setMuted(!settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Subscribe to real-time room updates via WebSocket
  useEffect(() => {
    if (!multiplayerRoom || !currentMemberId) return;

    const cleanup = subscribeToRoomSocket(multiplayerRoom.code, currentMemberId, (updatedRoom) => {
      setMultiplayerRoom(updatedRoom);

      // Auto-transition UI when room progresses
      if (updatedRoom.status === 'DRAFT' && activeTab !== 'MP_DRAFT') {
        setActiveTab('MP_DRAFT');
        setIsMultiplayerOpen(false);
      } else if (updatedRoom.status === 'READY_BATTLE' && activeTab !== 'MP_COMPARE') {
        setActiveTab('MP_COMPARE');
      } else if ((updatedRoom.status === 'MATCH' || updatedRoom.status === 'COMPLETED') && activeTab !== 'MP_MATCH') {
        setActiveTab('MP_MATCH');
      }
    });

    return cleanup;
  }, [multiplayerRoom?.code, currentMemberId, activeTab]);

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
      secondaryColor: '#f59e0b',
      rating: analytics.overallRating || 82,
      lineup,
      tactics,
      isUser: true,
    };
  };

  // Launch Solo Live Cup
  const handleLaunchLiveCup = () => {
    const userTeam = buildUserMatchTeam();
    const newTournament = initializeTournament(userTeam, 'standard_32');
    setTournament(newTournament);
    setActiveTab('PLAY');
    sound.playGoalCelebration();
  };

  // Solo Campaign completion
  const handleCampaignComplete = (summary: TournamentHistoryRecord) => {
    setCampaignSummary(summary);
    setActiveTab('SUMMARY');

    // Update career stats
    recordTournamentCompletion(summary);
    setCareer(loadCareer());
  };

  // Play Again from Solo Summary
  const handlePlayAgain = () => {
    setTournament(null);
    setCampaignSummary(null);
    setRerollsRemaining(3);
    const newXI: Record<string, Player | null> = {};
    FORMATIONS[formation].slots.forEach(s => { newXI[s.id] = null; });
    setStartingXI(newXI);
    setActiveTab('SETUP');
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Top Persistent Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
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
        onOpenMultiplayer={() => setIsMultiplayerOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        validLineupCount={selectedPlayerIdsInXI.length}
        hasCompletedCampaign={campaignSummary !== null}
        activeRoomCode={multiplayerRoom?.code}
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

        {/* MULTIPLAYER: Head-to-Head Squad Building with Exclusive Draft Pool */}
        {activeTab === 'MP_DRAFT' && multiplayerRoom && currentMemberId && (
          <MultiplayerDraftView
            room={multiplayerRoom}
            currentMemberId={currentMemberId}
            onRoomUpdated={setMultiplayerRoom}
            onAdvanceToComparison={() => setActiveTab('MP_COMPARE')}
          />
        )}

        {/* MULTIPLAYER: Head-to-Head Tactical Comparison */}
        {activeTab === 'MP_COMPARE' && multiplayerRoom && currentMemberId && (
          <H2HComparisonView
            room={multiplayerRoom}
            currentMemberId={currentMemberId}
            onRoomUpdated={setMultiplayerRoom}
            onLaunchMatch={() => setActiveTab('MP_MATCH')}
            onBackToDraft={() => setActiveTab('MP_DRAFT')}
          />
        )}

        {/* MULTIPLAYER: Direct Match Battle Simulation ("See If You Can Beat Them") */}
        {activeTab === 'MP_MATCH' && multiplayerRoom && currentMemberId && (
          <H2HMatchView
            room={multiplayerRoom}
            currentMemberId={currentMemberId}
            onRoomUpdated={setMultiplayerRoom}
            onReturnToLobby={() => {
              setIsMultiplayerOpen(true);
              setActiveTab('SETUP');
            }}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          />
        )}
      </main>

      {/* Multiplayer Lobby Modal */}
      {isMultiplayerOpen && (
        <MultiplayerLobbyModal
          currentRoom={multiplayerRoom}
          currentMemberId={currentMemberId}
          managerName={career.managerName}
          clubName={career.clubName}
          onRoomUpdated={(room, memberId) => {
            setMultiplayerRoom(room);
            setCurrentMemberId(memberId);
          }}
          onClose={() => setIsMultiplayerOpen(false)}
          onStartDraft={() => {
            setIsMultiplayerOpen(false);
            setActiveTab('MP_DRAFT');
          }}
        />
      )}

      {/* Online Global Leaderboards Modal */}
      {isLeaderboardOpen && (
        <LeaderboardModal
          currentManagerName={career.managerName}
          onClose={() => setIsLeaderboardOpen(false)}
        />
      )}

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
