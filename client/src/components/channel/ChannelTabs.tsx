import { motion } from 'framer-motion';
import { MessageSquare, HelpCircle } from 'lucide-react';

export type TabKey = 'qa' | 'discussion';

interface ChannelTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  answeredCount: number;
  unreadCount: number;
}

const tabs: { key: TabKey; label: string; icon: typeof HelpCircle }[] = [
  { key: 'qa', label: '提问', icon: HelpCircle },
  { key: 'discussion', label: '讨论', icon: MessageSquare },
];

export default function ChannelTabs({
  activeTab,
  onTabChange,
  answeredCount,
  unreadCount,
}: ChannelTabsProps) {
  return (
    <div className="flex-shrink-0 flex border-b border-border bg-surface/40 relative">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`
              relative flex-1 flex items-center justify-center gap-1.5
              py-2.5 text-sm font-medium transition-colors duration-200
              cursor-pointer
              ${isActive ? 'text-primary' : 'text-text-muted hover:text-text'}
            `}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>

            {/* Count badge for Q&A */}
            {tab.key === 'qa' && answeredCount > 0 && (
              <span className="text-xs text-text-muted/70 ml-0.5">
                {answeredCount}
              </span>
            )}

            {/* Unread dot for discussion */}
            {tab.key === 'discussion' && unreadCount > 0 && !isActive && (
              <span className="relative flex h-2 w-2 ml-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
            )}

            {/* Active indicator */}
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
