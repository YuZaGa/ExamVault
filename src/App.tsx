import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { CustomDrillBuilder } from './components/CustomDrillBuilder';
import { CommuteDrill } from './components/CommuteDrill';
import { MistakeVault } from './components/MistakeVault';
import { HealthMeter } from './components/HealthMeter';
import { MockSimulator } from './components/MockSimulator';
import { StarredDoubtList } from './components/StarredDoubtList';
import { SyncModal } from './components/SyncModal';
import { RoutineTracker } from './components/RoutineTracker';

import { questionService } from './services/questionService';
import { storageService } from './services/storageService';
import { Manifest, DrillConfig, Question, UnitHealth, DailyHabit } from './types';
import { AdminReportPanel } from './components/AdminReportPanel';
import { reportService } from './services/reportService';

export const App: React.FC = () => {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('drill');
  const [unitHealths, setUnitHealths] = useState<UnitHealth[]>([]);
  const [activeMistakesCount, setActiveMistakesCount] = useState<number>(0);
  const [profile, setProfile] = useState(storageService.getProfile());
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [todayHabit, setTodayHabit] = useState<DailyHabit>(storageService.getTodayHabit());
  const [restoredNotification, setRestoredNotification] = useState<string | null>(null);

  // Admin View State
  const [isAdminView, setIsAdminView] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return window.location.pathname.startsWith('/admin') || params.get('admin') === 'true';
    }
    return false;
  });

  // Active Drill State
  const [activeDrillQuestions, setActiveDrillQuestions] = useState<Question[] | null>(null);
  const [activeDrillMode, setActiveDrillMode] = useState<'practice' | 'exam'>('practice');
  const [activeTimeBudget, setActiveTimeBudget] = useState<number | undefined>(undefined);
  const [activeDrillRoutineType, setActiveDrillRoutineType] = useState<'morning' | 'midday' | 'evening' | null>(null);

  // Preselection for drill builder when triggered from Health Meter
  const [builderInitialUnit, setBuilderInitialUnit] = useState<number | undefined>(undefined);
  const [builderInitialPaper, setBuilderInitialPaper] = useState<1 | 2>(2);

  // Load manifest & sync param on mount
  useEffect(() => {
    // Check for 1-click sync link in URL
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const syncPayload = urlParams.get('sync');
      if (syncPayload) {
        const imported = storageService.importStateJson(decodeURIComponent(syncPayload));
        if (imported) {
          // Clean URL without reloading
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }

    refreshData();

    // Check if any admin-approved question fixes can be restored
    reportService.checkAndRestoreApprovedFixes().then((restored) => {
      if (restored.length > 0) {
        setRestoredNotification(`🎉 ${restored.length} reported question${restored.length > 1 ? 's' : ''} fixed & restored by admin!`);
        setTimeout(() => setRestoredNotification(null), 6000);
        refreshData();
      }
    });

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setIsAdminView(window.location.pathname.startsWith('/admin') || params.get('admin') === 'true');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const refreshData = async () => {
    const m = await questionService.getManifest();
    setManifest(m);
    setUnitHealths(storageService.calculateUnitHealth(m.units));
    setActiveMistakesCount(storageService.getActiveMistakes().length);
    setProfile(storageService.getProfile());
    setTodayHabit(storageService.getTodayHabit());
  };

  // Launch a custom drill from the builder
  const handleStartDrill = async (config: DrillConfig) => {
    const qs = await questionService.generateDrillQuestions(config);
    if (qs.length > 0) {
      setActiveDrillQuestions(qs);
      setActiveDrillMode(config.mode);
      setActiveTimeBudget(config.targetMode === 'time' ? config.targetMinutes : undefined);
    }
  };

  // Launch drill from Mistake Vault
  const handleStartMistakeDrill = (questions: Question[]) => {
    setActiveDrillQuestions(questions);
    setActiveDrillMode('practice');
    setActiveTimeBudget(undefined);
  };

  // Launch drill from Health Meter ("Drill This Unit")
  const handleDrillUnitFromHealth = async (paper: 1 | 2, unitId: number) => {
    setBuilderInitialPaper(paper);
    setBuilderInitialUnit(unitId);
    const config: DrillConfig = {
      paper,
      selectedUnits: [unitId],
      targetMode: 'count',
      targetCount: 10,
      targetMinutes: 12,
      mode: 'practice'
    };
    const qs = await questionService.generateDrillQuestions(config);
    if (qs.length > 0) {
      setActiveDrillQuestions(qs);
      setActiveDrillMode('practice');
      setActiveTimeBudget(undefined);
    }
  };

  // Daily Routine Quick-Launch Handlers
  const handleLaunchMorning = async () => {
    const config: DrillConfig = {
      paper: 1,
      selectedUnits: [],
      targetMode: 'count',
      targetCount: 10,
      targetMinutes: 12,
      mode: 'practice'
    };
    setActiveDrillRoutineType('morning');
    await handleStartDrill(config);
  };

  const handleLaunchMidday = () => {
    const mistakes = questionService.getMistakeQuestions().slice(0, 5);
    if (mistakes.length > 0) {
      setActiveDrillRoutineType('midday');
      handleStartMistakeDrill(mistakes);
    }
  };

  const handleLaunchEvening = async () => {
    const config: DrillConfig = {
      paper: 2,
      selectedUnits: [],
      targetMode: 'count',
      targetCount: 15,
      targetMinutes: 18,
      mode: 'practice'
    };
    setActiveDrillRoutineType('evening');
    await handleStartDrill(config);
  };

  const handleFinishDrill = () => {
    if (activeDrillRoutineType === 'morning') {
      storageService.updateTodayHabit({ morningCommuteDone: true });
    } else if (activeDrillRoutineType === 'midday') {
      storageService.updateTodayHabit({ recessMistakeDone: true });
    } else if (activeDrillRoutineType === 'evening') {
      storageService.updateTodayHabit({ eveningDrillDone: true });
    } else if (activeDrillQuestions && activeDrillQuestions.length >= 10) {
      const firstQ = activeDrillQuestions[0];
      if (firstQ?.paper === 1) {
        storageService.updateTodayHabit({ morningCommuteDone: true });
      } else if (firstQ?.paper === 2) {
        storageService.updateTodayHabit({ eveningDrillDone: true });
      }
    }

    setActiveDrillRoutineType(null);
    setActiveDrillQuestions(null);
    refreshData();
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        onOpenSync={() => setShowSyncModal(true)}
        onOpenAdmin={() => setIsAdminView(true)}
        streakDays={profile.streakDays}
      />

      {/* Main View Router */}
      <main style={{ flex: 1 }}>
        {isAdminView ? (
          <AdminReportPanel
            onBack={() => {
              setIsAdminView(false);
              if (window.location.pathname.startsWith('/admin')) {
                window.history.replaceState({}, document.title, '/');
              } else if (new URLSearchParams(window.location.search).has('admin')) {
                const url = new URL(window.location.href);
                url.searchParams.delete('admin');
                window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
              }
              refreshData();
            }}
          />
        ) : activeDrillQuestions ? (
          <CommuteDrill
            questions={activeDrillQuestions}
            mode={activeDrillMode}
            timeBudgetMinutes={activeTimeBudget}
            onFinish={handleFinishDrill}
            onBack={() => {
              setActiveDrillRoutineType(null);
              setActiveDrillQuestions(null);
              refreshData();
            }}
          />
        ) : (
          <>
            {activeTab === 'drill' && manifest && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 16px 0 16px' }}>
                  <RoutineTracker
                    habit={todayHabit}
                    streakDays={profile.streakDays}
                    activeMistakesCount={activeMistakesCount}
                    onLaunchMorning={handleLaunchMorning}
                    onLaunchMidday={handleLaunchMidday}
                    onLaunchEvening={handleLaunchEvening}
                    onLaunchMock={() => setActiveTab('mock')}
                  />
                </div>
                <CustomDrillBuilder
                  manifestUnits={manifest.units}
                  unitHealths={unitHealths}
                  onStartDrill={handleStartDrill}
                  initialUnitId={builderInitialUnit}
                  initialPaper={builderInitialPaper}
                />
              </div>
            )}

            {activeTab === 'mistakes' && (
              <MistakeVault
                onStartMistakeDrill={handleStartMistakeDrill}
              />
            )}

            {activeTab === 'health' && (
              <HealthMeter
                unitHealths={unitHealths}
                onDrillUnit={handleDrillUnitFromHealth}
              />
            )}

            {activeTab === 'mock' && (
              <MockSimulator
                onBack={() => setActiveTab('drill')}
              />
            )}

            {activeTab === 'doubts' && (
              <StarredDoubtList />
            )}
          </>
        )}
      </main>

      {/* Fixed Mobile Bottom Navigation */}
      {!activeDrillQuestions && !isAdminView && (
        <BottomNav
          activeTab={activeTab}
          onChangeTab={(tab) => {
            setActiveTab(tab);
            refreshData();
          }}
          activeMistakesCount={activeMistakesCount}
        />
      )}

      {/* Auto-Restoration Alert Toast */}
      {restoredNotification && (
        <div 
          style={{
            position: 'fixed',
            bottom: activeDrillQuestions || isAdminView ? '24px' : '84px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '14px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
            fontSize: '0.88rem',
            fontWeight: 600,
            maxWidth: '90%',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {restoredNotification}
        </div>
      )}

      {/* Sync Modal */}
      {showSyncModal && (
        <SyncModal onClose={() => setShowSyncModal(false)} />
      )}
    </div>
  );
};
