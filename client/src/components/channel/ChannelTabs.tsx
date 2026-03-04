
import { MessageSquare, HelpCircle, Lightbulb } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type TabKey = 'qa' | 'discussion' | 'hints';

interface ChannelTabsProps {

  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  answeredCount: number;
  unreadCount: number;
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
  aiHintEnabled = false,
}: ChannelTabsProps) {
  const tabs: TabDef[] = [
    { key: 'qa', label: '提问', icon: HelpCircle },
    { key: 'discussion', label: '讨论', icon: MessageSquare },
  ];

  if (aiHintEnabled) {
    tabs.push({ key: 'hints', label: '线索', icon: Lightbulb });
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

              {/* Unread dot for discussion */}
              {tab.key === 'discussion' && unreadCount > 0 && !isActive && (
                <span className="relative flex h-2 w-2 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
