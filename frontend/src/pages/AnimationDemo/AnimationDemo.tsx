import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Rss, 
  FileText, 
  Headphones,
  Calendar,
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
  const { animatePageEnter, animateCards, animateSelection } = useAnimations();

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
          Interactive Buttons
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatedButton
            onClick={() => handleButtonClick('primary')}
            variant="primary"
            animationType="pulse"
            icon={<FileText className="h-4 w-4" />}
          >
            Primary Button
          </AnimatedButton>
          
          <AnimatedButton
            onClick={() => handleButtonClick('success')}
            variant="accent"
            animationType="glow"
            icon={<CheckCircle className="h-4 w-4" />}
          >
            Success Action
          </AnimatedButton>
          
          <AnimatedButton
            onClick={() => handleButtonClick('error')}
            variant="danger"
            animationType="bounce"
            icon={<Zap className="h-4 w-4" />}
          >
            Error Demo
          </AnimatedButton>
          
          <AnimatedButton
            onClick={() => handleButtonClick('loading')}
            variant="secondary"
            loading={true}
            icon={<Headphones className="h-4 w-4" />}
          >
            Loading State
          </AnimatedButton>
        </div>
      </div>

      {/* Loading Animations */}
      <div className="demo-card glass-card p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Calendar className="mr-2 text-green-500" />
          Loading Animations
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Animation Type:</label>
          <select 
            value={loadingType} 
            onChange={(e) => setLoadingType(e.target.value as 'spinner' | 'pulse' | 'bounce' | 'wave')}
            className="px-3 py-2 border rounded-md"
          >
            <option value="spinner">Spinner</option>
            <option value="pulse">Pulse</option>
            <option value="bounce">Bounce</option>
            <option value="wave">Wave</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Small</h3>
            <LoadingSpinner size="sm" type={loadingType} />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Medium</h3>
            <LoadingSpinner 
              size="md" 
              type={loadingType} 
              text="Loading articles..."
            />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Large</h3>
            <LoadingSpinner 
              size="lg" 
              type={loadingType} 
              text="Generating podcast..."
              color="primary"
            />
          </div>
        </div>
      </div>

      {/* Notification Demo */}
      <div className="demo-card glass-card p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Users className="mr-2 text-purple-500" />
          Notification System
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['success', 'error', 'warning', 'info'] as const).map((type) => (
            <AnimatedButton
              key={type}
              onClick={() => {
                setNotificationType(type);
                setShowNotification(true);
              }}
              variant={type === 'error' ? 'danger' : 'primary'}
              size="sm"
            >
              Show {type.charAt(0).toUpperCase() + type.slice(1)}
            </AnimatedButton>
          ))}
        </div>
      </div>

      {/* Notification Toast */}
      {showNotification && (
        <NotificationToast
          type={notificationType}
          title={`${notificationType.charAt(0).toUpperCase() + notificationType.slice(1)} Notification`}
          message={`This is a ${notificationType} notification with beautiful animations!`}
          onClose={() => setShowNotification(false)}
          duration={4000}
          position="top-right"
        />
      )}

      {/* Footer */}
      <div className="text-center py-8">
        <p className="text-gray-500">
          🎭 All animations are powered by <strong>anime.js</strong> and <strong>Framer Motion</strong>
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Hover over cards and buttons to see more animations!
        </p>
      </div>
    </div>
  );
};

export default AnimationDemo;
