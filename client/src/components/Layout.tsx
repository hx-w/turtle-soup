import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { LogOut, User, ChevronDown } from 'lucide-react';
import TurtleLogo from './TurtleLogo';
import Avatar from './Avatar';
import Navbar from './Navbar';
import { useAuthStore } from '../stores/authStore';

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAuthPage =
    location.pathname === '/login' || location.pathname === '/register';

  const isChannelPage = location.pathname.startsWith('/channel/');

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setDropdownOpen(false);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar - hidden on auth pages */}
      {!isAuthPage && (
        <header className="sticky top-0 z-50 glass-nav">
          <div className="flex items-center justify-between h-14 px-4 max-w-5xl mx-auto">
            {/* Logo */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 cursor-pointer"
              aria-label="Home"
            >
              <TurtleLogo size={32} />
              <span className="font-heading font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                海龟汤
              </span>
            </button>

            {/* User menu */}
            {user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-xl
                             hover:bg-card/60 transition-all duration-200 ease-out"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  aria-label="User menu"
                >
                  <Avatar seed={user.avatarSeed} size={28} />
                  <span className="text-sm font-medium hidden sm:block">
                    {user.nickname}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-text-muted transition-transform duration-200 ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 glass-card shadow-xl shadow-black/20 py-2"
                    role="menu"
                  >
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-muted
                                 hover:text-text hover:bg-card/80 transition-all duration-200 ease-out cursor-pointer"
                      role="menuitem"
                    >
                      <User size={16} />
                      <span>个人中心</span>
                    </button>
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-no
                                 hover:bg-no/10 transition-all duration-200 ease-out cursor-pointer"
                      role="menuitem"
                    >
                      <LogOut size={16} />
                      <span>退出登录</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
      )}

      {/* Main content */}
      <main
        className={`flex-1 ${
          !isAuthPage && !isChannelPage ? 'pb-20' : ''
        } ${!isAuthPage ? 'pt-2' : ''}`}
      >
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <Navbar />
    </div>
  );
}
