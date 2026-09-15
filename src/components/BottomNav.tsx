import React from 'react';
import { Zap, ShieldAlert, BarChart3, Clock, Star } from 'lucide-react';

export type TabType = 'drill' | 'mistakes' | 'health' | 'mock' | 'doubts';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  activeMistakesCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab, activeMistakesCount }) => {
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        <button 
          className={`nav-item ${activeTab === 'drill' ? 'active' : ''}`}
          onClick={() => onChangeTab('drill')}
        >
          <div className="nav-icon-wrapper">
            <Zap size={20} />
          </div>
          <span>Drill</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'mistakes' ? 'active' : ''}`}
          onClick={() => onChangeTab('mistakes')}
        >
          <div className="nav-icon-wrapper">
            <ShieldAlert size={20} />
          </div>
          <span>Mistakes</span>
          {activeMistakesCount > 0 && (
            <span className="nav-badge">{activeMistakesCount}</span>
          )}
        </button>

        <button 
          className={`nav-item ${activeTab === 'health' ? 'active' : ''}`}
          onClick={() => onChangeTab('health')}
        >
          <div className="nav-icon-wrapper">
            <BarChart3 size={20} />
          </div>
          <span>Health</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'mock' ? 'active' : ''}`}
          onClick={() => onChangeTab('mock')}
        >
          <div className="nav-icon-wrapper">
            <Clock size={20} />
          </div>
          <span>CBT Mock</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'doubts' ? 'active' : ''}`}
          onClick={() => onChangeTab('doubts')}
        >
          <div className="nav-icon-wrapper">
            <Star size={20} />
          </div>
          <span>Doubts</span>
        </button>
      </div>
    </nav>
  );
};
