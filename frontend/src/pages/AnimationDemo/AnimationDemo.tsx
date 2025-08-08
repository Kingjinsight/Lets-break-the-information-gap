import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Rss, 
  FileText, 
  Headphones,
  Users,
  Zap,
  CheckCircle
} from 'lucide-react';
import { useAnimations } from '../../hooks/useAnimations';
import StatCard from '../../components/StatCard';
import AnimatedButton from '../../components/AnimatedButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import NotificationToast from '../../components/NotificationToast';

const AnimationDemo: React.FC = () => {
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [loadingType, setLoadingType] = useState<'spinner' | 'pulse' | 'bounce' | 'wave'>('spinner');
  
  const pageRef = useRef<HTMLDivElement>(null);
  const { animatePageEnter, animateCards } = useAnimations();

  // Page entrance animation
  useEffect(() => {
    const timer = setTimeout(() => {
      animatePageEnter('.demo-header');
      setTimeout(() => animateCards('.demo-card'), 300);
    }, 100);

    return () => clearTimeout(timer);
  }, [animatePageEnter, animateCards]);

  const handleButtonClick = (type: string) => {
    console.log(`${type} button clicked with animation!`);
    
    // Show notification
    if (type === 'success') {
      setNotificationType('success');
      setShowNotification(true);
    } else if (type === 'error') {
      setNotificationType('error');
      setShowNotification(true);
    }
  };

  const statsData = [
    {
      title: 'Total Articles',
      value: 1247,
      icon: <FileText className="h-6 w-6" />,
      color: '#6366f1',
      trend: { value: 12, isPositive: true }
    },
    {
      title: 'RSS Sources',
      value: 24,
      icon: <Rss className="h-6 w-6" />,
      color: '#10b981',
      trend: { value: 8, isPositive: true }
    },
    {
      title: 'Podcasts Generated',
      value: 87,
      icon: <Headphones className="h-6 w-6" />,
      color: '#f59e0b',
      trend: { value: 15, isPositive: true }
    },
    {
      title: 'Active Users',
      value: 156,
      icon: <Users className="h-6 w-6" />,
      color: '#ef4444',
      trend: { value: 5, isPositive: false }
    }
  ];

  return (
    <div ref={pageRef} className="min-h-screen p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="demo-header text-center space-y-4"
      >
        <h1 className="text-5xl font-bold text-gradient mb-4">
          🎨 Animation Showcase
        </h1>
        <p className="text-xl text-gray-600">
          Beautiful animations powered by anime.js and Framer Motion
        </p>
      </motion.div>

      {/* Statistics Cards */}
      <div className="demo-card">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Zap className="mr-2 text-yellow-500" />
          Animated Statistics Cards
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map((stat, index) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              change={stat.trend?.value}
              delay={index * 100}
              animateValue={typeof stat.value === 'number'}
            />
          ))}
        </div>
      </div>

      {/* Animated Buttons */}
      <div className="demo-card glass-card p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Play className="mr-2 text-blue-500" />
          Animated Buttons
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnimatedButton
            onClick={() => handleButtonClick('success')}
            variant="primary"
            icon={<Play />}
          >
            Primary Action
          </AnimatedButton>
          <AnimatedButton
            onClick={() => handleButtonClick('accent')}
            variant="accent"
            icon={<CheckCircle />}
          >
            Accent Action
          </AnimatedButton>
          <AnimatedButton
            onClick={() => handleButtonClick('error')}
            variant="danger"
            icon={<Rss />}
          >
            Danger Action
          </AnimatedButton>
        </div>
      </div>

      {/* Loading Spinners */}
      <div className="demo-card">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Zap className="mr-2 text-yellow-500" />
          Loading Spinners
        </h2>
        <div className="flex items-center justify-around p-4">
          <LoadingSpinner size="sm" />
          <LoadingSpinner size="md" text="Loading..." />
          <LoadingSpinner size="lg" text="Processing data..." color="primary" />
        </div>
        <div className="mt-4 text-center">
          <select 
            value={loadingType} 
            onChange={(e) => setLoadingType(e.target.value as any)}
            className="p-2 rounded bg-gray-700 text-white"
          >
            <option value="spinner">Spinner</option>
            <option value="pulse">Pulse</option>
            <option value="bounce">Bounce</option>
            <option value="wave">Wave</option>
          </select>
        </div>
      </div>

      {/* Notification Toasts */}
      <div className="demo-card">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Zap className="mr-2 text-yellow-500" />
          Notification Toasts
        </h2>
        {showNotification && (
          <NotificationToast
            type={notificationType}
            title={`${notificationType.charAt(0).toUpperCase() + notificationType.slice(1)}!`}
            message={`This is a sample ${notificationType} notification.`}
            onClose={() => setShowNotification(false)}
            duration={5000}
          />
        )}
        <div className="flex space-x-4">
          <button onClick={() => { setNotificationType('success'); setShowNotification(true); }} className="btn-primary">Success</button>
          <button onClick={() => { setNotificationType('error'); setShowNotification(true); }} className="btn-danger">Error</button>
          <button onClick={() => { setNotificationType('warning'); setShowNotification(true); }} className="btn-warning">Warning</button>
          <button onClick={() => { setNotificationType('info'); setShowNotification(true); }} className="btn-info">Info</button>
        </div>
      </div>
    </div>
  );
};

export default AnimationDemo;
