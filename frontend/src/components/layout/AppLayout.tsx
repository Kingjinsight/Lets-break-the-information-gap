import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Rss, 
  FileText, 
  Headphones, 
  Settings, 
  LogOut,
  Menu,
  X,
  Zap
} from 'lucide-react';

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Handle resize events
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false); // Close mobile sidebar when switching to desktop
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'RSS Sources', href: '/rss-sources', icon: Rss },
    { name: 'Articles', href: '/articles', icon: FileText },
    { name: 'Podcasts', href: '/podcasts', icon: Headphones },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleNavigation = (href: string) => {
    navigate(href);
    if (isMobile) {
      setSidebarOpen(false); // Close sidebar after navigation on mobile
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-5"
          style={{ backgroundColor: 'var(--color-accent-500)' }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-3"
          style={{ backgroundColor: 'var(--color-accent-600)' }}
        />
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        <motion.div 
          initial={{ x: -256 }}
          animate={{ x: (!isMobile || sidebarOpen) ? 0 : -256 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed inset-y-0 left-0 z-50 w-64 lg:translate-x-0"
        >
          <div className="h-full glass-card m-4 relative overflow-hidden">
            {/* Logo区域 */}
            <div className="pt-4 pb-6 px-4">
              <div className="h-32 flex items-center justify-center relative rounded-lg overflow-hidden">
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{ 
                    background: `linear-gradient(to right, var(--color-accent-500), var(--color-accent-600))` 
                  }}
                />
                <div className="relative flex flex-col items-center text-center">
                  <Zap className="h-10 w-10 mb-2" style={{ color: 'var(--color-accent-500)' }} />
                  <h1 className="text-base font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                    Let's break the 
                    <br />
                    information gap
                  </h1>
                </div>
              </div>
            </div>

            <div className="divider my-4" />

            {/* Navigation */}
            <nav className="px-4 space-y-2">
              {navigation.map((item, index) => {
                const isActive = location.pathname === item.href;
                return (
                  <motion.button
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative group ${
                      isActive 
                        ? 'shadow-inner-glow' 
                        : ''
                    }`}
                    style={{
                      backgroundColor: isActive 
                        ? 'rgba(249, 115, 22, 0.2)' 
                        : 'transparent',
                      color: isActive 
                        ? 'var(--color-accent-400)' 
                        : 'var(--color-text-secondary)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                        e.currentTarget.style.color = 'var(--color-text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--color-text-secondary)';
                      }
                    }}
                  >
                    {/* 选中状态的左侧指示条 */}
                    {isActive && (
                        <motion.div 
                            layoutId="activeTab"
                            className="absolute left-0 top-0 w-1 h-full rounded-r-full"
                            style={{ 
                            backgroundColor: 'var(--color-accent-500)'
                            }}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    
                    <item.icon 
                      className="mr-3 h-5 w-5 transition-colors"
                      style={{
                        color: isActive 
                          ? 'var(--color-accent-400)' 
                          : 'var(--color-text-muted)'
                      }}
                    />
                    
                    <span className="relative">{item.name}</span>
                  </motion.button>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="divider mb-4" />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group"
                style={{ color: '#ef4444' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <LogOut className="mr-3 h-5 w-5" />
                <span>Logout</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Mobile header */}
        <div className="lg:hidden">
          <div className="h-16 glass-card m-4 flex items-center justify-between px-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent-400)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
            >
              {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </motion.button>
            
            <div className="flex items-center space-x-2">
              <Zap className="h-6 w-6" style={{ color: 'var(--color-accent-500)' }} />
              <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                RSS Cast
              </h1>
            </div>
            
            <div className="w-6" />
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AppLayout;