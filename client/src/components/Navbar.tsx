import { useLocation, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, User } from 'lucide-react';

const tabs = [
  { path: '/', label: '大厅', icon: Home },
  { path: '/create', label: '开汤', icon: PlusCircle },
  { path: '/profile', label: '我的', icon: User },
] as const;

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide navbar on login/register pages and channel pages
  if (
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/channel/')
  ) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 glass-nav safe-area-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {tabs.map(({ path, label, icon: Icon }) => {
          const isActive =
            path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(path);

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`
                flex flex-col items-center justify-center gap-1 flex-1 py-2
                cursor-pointer transition-all duration-200 ease-out
                ${
                  isActive
                    ? 'text-primary'
                    : 'text-text-muted hover:text-text'
                }
              `}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
