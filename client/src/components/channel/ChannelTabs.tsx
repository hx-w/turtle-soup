
import { MessageSquare, HelpCircle, Network } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
export type TabKey = 'qa' | 'discussion' | 'clues';

interface ChannelTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  answeredCount: number;
  unreadCount: number;
  hintsCount: number;
  aiHintEnabled?: boolean;
}

interface TabDef {
  key: TabKey;
  label: string;
  icon: LucideIcon;
}

export default function ChannelTabs({
  activeTab,
  onTabChange,
  answeredCount,
  unreadCount,
  hintsCount,
  aiHintEnabled = false,
}: ChannelTabsProps) {
  const tabs: TabDef[] = [
    { key: 'qa', label: '提问', icon: HelpCircle },
    { key: 'discussion', label: '讨论', icon: MessageSquare },
  ];


  // Clues board tab - shows visual clue graph with hints list integrated
  if (aiHintEnabled) {
    tabs.push({ key: 'clues', label: '线索', icon: Network });
  }

  return (
    <div className="flex-shrink-0 px-4 pb-2 pt-1">
      <div className="flex gap-1 bg-surface/60 rounded-xl p-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`
                relative flex-1 flex items-center justify-center gap-1.5
                py-2 text-sm font-medium rounded-lg transition-all duration-200
                ease-out cursor-pointer touch-manipulation focus:outline-none
                ${isActive ? 'bg-card text-text shadow-sm' : 'text-text-muted hover:text-text'}
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>

              {/* Count badge for Q&A */}
              {tab.key === 'qa' && answeredCount > 0 && (
                <span className="text-[11px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md ml-0.5">
                  {answeredCount}
                </span>
              )}

              {/* Count badge for discussion */}
              {tab.key === 'discussion' && unreadCount > 0 && (
                <span className="w-2 h-2 bg-orange-500 rounded-full ml-0.5" />
              )}

              {/* Count badge for clues */}
              {tab.key === 'clues' && hintsCount > 0 && (
                <span className="text-[11px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md ml-0.5">
                  {hintsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
