import { motion, AnimatePresence } from 'framer-motion';
import { X, Users } from 'lucide-react';
import RoleBadge from './RoleBadge';

interface OnlineUser {
  id: string;
  nickname: string;
  avatarSeed?: string;
  role?: 'creator' | 'host' | 'player';
}

interface OnlineUsersProps {
  users: OnlineUser[];
  onClose: () => void;
}

export default function OnlineUsers({ users, onClose }: OnlineUsersProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
        />

        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute right-0 top-0 bottom-0 w-72 max-w-[85vw]
                     bg-card/80 backdrop-blur-xl border-l border-border
                     shadow-2xl shadow-black/30 flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-light" />
              <h3 className="font-heading font-semibold text-text">
                在线用户
              </h3>
              <span className="text-xs text-text-muted bg-surface px-2 py-0.5 rounded-full">
                {users.length}
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="关闭在线用户"
              className="p-1.5 rounded-lg hover:bg-surface text-text-muted
                         hover:text-text transition-colors duration-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {users.length === 0 && (
              <p className="text-center text-text-muted text-sm py-8">
                暂无在线用户
              </p>
            )}

            {users.map((user) => {
              const avatarUrl = user.avatarSeed
                ? `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.avatarSeed}`
                : `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.id}`;

              return (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface/50
                             transition-colors duration-200"
                >
                  <img
                    src={avatarUrl}
                    alt={user.nickname}
                    className="w-8 h-8 rounded-full bg-surface flex-shrink-0"
                  />
                  <span className="text-sm text-text truncate flex-1">
                    @{user.nickname}
                  </span>
                  {user.role && <RoleBadge role={user.role} />}
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
