import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Ticket, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';

export default function RegisterPage() {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const register = useAuthStore((s) => s.register);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await register(nickname, password, inviteCode);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-card border border-border
                   text-text-muted hover:text-text shadow-sm transition-all duration-200 ease-out cursor-pointer"
        aria-label={theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'}
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="glass-card p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img src="/icons/icon-192x192.png" alt="海龟汤" className="w-16 h-16" />
            <h1 className="font-heading font-bold text-3xl mt-4 text-primary">
              海龟汤
            </h1>
            <p className="text-text-muted text-sm mt-1">创建你的账号</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-no/10 border border-no/30 text-no text-sm text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-nickname" className="block text-sm font-medium text-text-muted mb-1.5">
                昵称
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted/60"
                />
                <input
                  id="reg-nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="2-16个字符"
                  className="input-field pl-11"
                  required
                  minLength={2}
                  maxLength={16}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-text-muted mb-1.5">
                密码
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted/60"
                />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8-32个字符，需包含字母和数字"
                  className="input-field pl-11 pr-11"
                  required
                  minLength={8}
                  maxLength={32}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted/60
                             hover:text-text transition-colors duration-200 cursor-pointer"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="invite-code" className="block text-sm font-medium text-text-muted mb-1.5">
                邀请码
              </label>
              <div className="relative">
                <Ticket
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted/60"
                />
                <input
                  id="invite-code"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="输入邀请码"
                  className="input-field pl-11"
                  required
                  autoComplete="off"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !nickname || !password || !inviteCode}
              className="btn-primary w-full mt-6"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  注册中...
                </span>
              ) : (
                '注册'
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-text-muted mt-6">
            已有账号？{' '}
            <Link
              to="/login"
              className="text-primary hover:text-primary-light transition-colors duration-200 font-medium cursor-pointer"
            >
              返回登录
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
