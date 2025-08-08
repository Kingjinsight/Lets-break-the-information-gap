import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Rss, 
  FileText, 
  Sparkles,
  Plus,
  Loader
} from 'lucide-react';
import { articlesApi, podcastsApi, rssApi, settingsApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { animations } from '../../utils/animations';

// Helper function to calculate time ago
const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const { showSuccess, showError } = useToast();

  // 获取数据
  const { data: todayArticles } = useQuery({
    queryKey: ['todayArticles'],
    queryFn: () => articlesApi.getTodayArticles(),
  });

  const { data: podcasts } = useQuery({
    queryKey: ['podcasts'],
    queryFn: () => podcastsApi.getPodcasts(),
  });

  const { data: rssSources } = useQuery({
    queryKey: ['rssSources'],
    queryFn: () => rssApi.getSources(),
  });

  // 生成今日播客的mutation
  const generateTodayPodcastMutation = useMutation({
    mutationFn: async () => {
      // Check if user has API key configured
      try {
        const settingsResponse = await settingsApi.getSettings();
        const userSettings = settingsResponse.data;
        
        if (!userSettings.google_api_key || !userSettings.google_api_key.trim()) {
          throw new Error('API key is required for podcast generation. Please configure your Google API key in Settings.');
        }
      } catch (error: any) {
        if (error.message.includes('API key is required')) {
          throw error;
        }
        console.error('Failed to check user settings:', error);
        throw new Error('Unable to verify API key configuration. Please check your Settings.');
      }
      
      // 先刷新所有RSS源获取最新文章
      await rssApi.fetchAllArticles();
      // 然后生成播客
      return podcastsApi.generateTodayPodcast();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['podcasts'] });
      queryClient.invalidateQueries({ queryKey: ['todayArticles'] });
      setIsGeneratingPodcast(false);
      showSuccess('Podcast Generation Started!', 'Your daily podcast is being created from today\'s articles');
    },
    onError: (error: any) => {
      console.error('Failed to generate podcast:', error);
      setIsGeneratingPodcast(false);
      
      // Show appropriate error message
      if (error.message?.includes('API key')) {
        showError('API Key Required', error.message);
      } else {
        showError('Podcast Generation Failed', 'Unable to start podcast creation. Please try again.');
      }
    }
  });

  // 处理快速操作
  const handleQuickAction = async (action: string) => {
    switch (action) {
      case 'generate-today':
        setIsGeneratingPodcast(true);
        generateTodayPodcastMutation.mutate();
        break;
      case 'add-rss':
        navigate('/rss-sources');
        break;
      case 'view-articles':
        navigate('/articles');
        break;
      default:
        break;
    }
  };

  const stats = [
    {
      name: "Today's Articles",
      value: todayArticles?.data?.length || 0,
      change: "",
      icon: FileText,
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      name: 'Total Podcasts',
      value: podcasts?.data?.length || 0,
      change: "",
      icon: Play,
      gradient: 'from-green-500 to-green-600',
    },
    {
      name: 'RSS Sources',
      value: rssSources?.data?.length || 0,
      change: "",
      icon: Rss,
      gradient: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <motion.div 
      className="space-y-8"
      {...animations.pageEnter}
    >
      {/* Header */}
      <motion.div
        {...animations.pageTitle}
        className="relative"
      >
        <motion.h1 
          className="text-4xl font-bold text-gradient mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Dashboard
        </motion.h1>
        <motion.p 
          style={{ color: 'var(--color-text-secondary)' }} 
          className="text-lg"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Welcome back! Here's your daily briefing overview.
        </motion.p>
        
        {/* 装饰元素 */}
        <motion.div 
          className="absolute -top-2 -right-2 w-20 h-20 rounded-full blur-xl opacity-10"
          style={{ backgroundColor: 'var(--color-accent-500)' }}
          animate={{ 
            scale: [1, 1.1, 1], 
            rotate: [0, 180, 360] 
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            ease: 'linear' 
          }}
        />
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          delay: 0.3, 
          duration: 0.6,
          staggerChildren: 0.1 
        }}
      >
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            {...animations.statCard}
            transition={{ 
              delay: 0.4 + index * 0.1, 
              duration: 0.5
            }}
            whileHover={{ 
              scale: 1.03, 
              y: -5,
              transition: { duration: 0.2 }
            }}
            whileTap={{ 
              scale: 0.98,
              transition: { duration: 0.1 }
            }}
            className="glass-card p-6 relative overflow-hidden group cursor-pointer"
          >
            {/* 背景渐变 */}
            <motion.div 
              className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
              style={{ 
                background: `linear-gradient(135deg, var(--color-accent-500), var(--color-accent-600))` 
              }}
              whileHover={{ opacity: 0.1 }}
            />
            
            <div className="relative flex items-center justify-between">
              <div>
                <motion.p 
                  style={{ color: 'var(--color-text-muted)' }}
                  className="text-sm font-medium mb-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  {stat.name}
                </motion.p>
                <div className="flex items-end space-x-2">
                  <motion.p 
                    style={{ color: 'var(--color-text-primary)' }}
                    className="text-3xl font-bold"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ 
                      delay: 0.7 + index * 0.1,
                      duration: 0.4,
                      ease: 'backOut'
                    }}
                  >
                    {stat.value}
                  </motion.p>
                  <motion.span 
                    style={{ color: 'var(--color-accent-400)' }}
                    className="text-sm font-medium"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                  >
                    {stat.change}
                  </motion.span>
                </div>
              </div>
              
              <motion.div 
                className="p-3 rounded-xl shadow-lg"
                style={{ 
                  background: `linear-gradient(135deg, var(--color-accent-500), var(--color-accent-600))` 
                }}
                initial={{ rotate: -10, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ 
                  delay: 0.5 + index * 0.1,
                  duration: 0.4 
                }}
                whileHover={{ 
                  rotate: [0, -5, 5, 0],
                  transition: { duration: 0.4 }
                }}
              >
                <stat.icon className="h-6 w-6 text-white" />
              </motion.div>
            </div>

            {/* 发光边框效果 */}
            <motion.div 
              className="absolute inset-0 rounded-xl opacity-0"
              style={{ 
                background: `linear-gradient(90deg, rgba(249, 115, 22, 0.2), transparent, rgba(249, 115, 22, 0.2))` 
              }}
              whileHover={{ 
                opacity: 1,
                transition: { duration: 0.3 }
              }}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-8"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Sparkles className="h-6 w-6" style={{ color: 'var(--color-accent-500)' }} />
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Quick Actions
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <QuickActionCard
            title="Generate Today's Podcast"
            description="Create a podcast from today's articles"
            icon={Play}
            action="generate-today"
            onClick={() => handleQuickAction('generate-today')}
            isLoading={isGeneratingPodcast}
          />
          <QuickActionCard
            title="Add RSS Source"
            description="Add a new RSS feed to track"
            icon={Plus}
            action="add-rss"
            onClick={() => handleQuickAction('add-rss')}
          />
          <QuickActionCard
            title="Browse Articles"
            description="View and select articles"
            icon={FileText}
            action="view-articles"
            onClick={() => handleQuickAction('view-articles')}
          />
        </div>
      </motion.div>

      {/* Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RecentActivity />
        <TodayStats />
      </div>
    </motion.div>
  );
};

// 快速操作卡片
const QuickActionCard: React.FC<{
  title: string;
  description: string;
  icon: any;
  action: string;
  onClick?: () => void;
  isLoading?: boolean;
}> = ({ title, description, icon: Icon, onClick, isLoading = false }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={isLoading}
      className="relative p-6 glass-card text-left group overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* 悬停背景 */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-all duration-300"
        style={{ 
          background: `linear-gradient(135deg, var(--color-accent-500), var(--color-accent-600))` 
        }}
      />
      
      <div className="relative">
        <div 
          className="inline-flex p-3 rounded-xl mb-4 shadow-lg group-hover:shadow-glow transition-shadow duration-300"
          style={{ 
            background: `linear-gradient(135deg, var(--color-accent-500), var(--color-accent-600))` 
          }}
        >
          {isLoading ? (
            <Loader className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Icon className="h-6 w-6 text-white" />
          )}
        </div>
        
        <h3 
          className="font-bold mb-2 group-hover:text-gradient transition-colors"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </h3>
        <p 
          style={{ color: 'var(--color-text-muted)' }}
          className="text-sm leading-relaxed"
        >
          {isLoading ? 'Processing...' : description}
        </p>
      </div>

      {/* 悬停边框发光 */}
      <div 
        className="absolute inset-0 rounded-xl border border-transparent group-hover:border-accent-500/30 transition-colors duration-300"
        style={{ borderColor: 'transparent' }}
      />
    </motion.button>
  );
};

// 最近活动组件
const RecentActivity: React.FC = () => {
  const { data: podcasts } = useQuery({
    queryKey: ['podcasts'],
    queryFn: () => podcastsApi.getPodcasts(),
  });

  const { data: rssSources } = useQuery({
    queryKey: ['rssSources'],
    queryFn: () => rssApi.getSources(),
  });

  const { data: todayArticles } = useQuery({
    queryKey: ['todayArticles'],
    queryFn: () => articlesApi.getTodayArticles(),
  });

  // Generate realistic recent activities based on actual data
  const activities = [];
  
  // Add recent podcasts
  if (podcasts?.data && podcasts.data.length > 0) {
    const recentPodcasts = podcasts.data
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2);
    
    recentPodcasts.forEach((podcast: any) => {
      const timeAgo = getTimeAgo(new Date(podcast.created_at));
      const articleCount = podcast.articles ? podcast.articles.length : 0;
      activities.push({
        title: `Generated podcast "${podcast.title || 'Daily Briefing'}"`,
        subtitle: `${articleCount} articles converted to audio`,
        time: timeAgo,
        type: 'podcast',
        icon: Play
      });
    });
  }

  // Add recent RSS fetches
  if (todayArticles?.data && todayArticles.data.length > 0) {
    const latestFetch = todayArticles.data
      .sort((a: any, b: any) => new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime())[0];
    
    const timeAgo = getTimeAgo(new Date(latestFetch.fetched_at));
    const sourceName = latestFetch.source?.name || 'RSS Source';
    activities.push({
      title: `Fetched articles from ${sourceName}`,
      subtitle: `${todayArticles.data.length} new articles available`,
      time: timeAgo,
      type: 'articles',
      icon: FileText
    });
  }

  // Add RSS sources
  if (rssSources?.data && rssSources.data.length > 0) {
    const recentSource = rssSources.data
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    
    const timeAgo = getTimeAgo(new Date(recentSource.created_at));
    activities.push({
      title: `Added RSS source "${recentSource.name || 'New Source'}"`,
      subtitle: `Now monitoring ${rssSources.data.length} sources`,
      time: timeAgo,
      type: 'rss',
      icon: Rss
    });
  }

  // If no real data, show getting started activities
  if (activities.length === 0) {
    activities.push({
      title: 'Welcome to Let\'s break the information gap!',
      subtitle: 'Start by adding your first RSS source',
      time: 'Getting started',
      type: 'welcome',
      icon: Sparkles
    });
  }

  // Sort by most recent and limit to 4 items
  const sortedActivities = activities
    .sort((a, b) => {
      if (a.time === 'Getting started') return 1;
      if (b.time === 'Getting started') return -1;
      return 0; // Keep original order for time-sorted items
    })
    .slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card p-6"
    >
      <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
        Recent Activity
      </h2>
      <div className="space-y-4">
        {sortedActivities.map((activity, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start space-x-4 p-4 rounded-lg hover:bg-opacity-70 transition-colors"
            style={{ backgroundColor: 'rgba(42, 42, 42, 0.5)' }}
          >
            <div 
              className="p-2 rounded-lg shadow-sm"
              style={{ backgroundColor: 'var(--color-accent-500)' }}
            >
              <activity.icon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {activity.title}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {activity.subtitle}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-accent-400)' }}>
                {activity.time}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// 今日统计组件
const TodayStats: React.FC = () => {
  const { data: todayArticles } = useQuery({
    queryKey: ['todayArticles'],
    queryFn: () => articlesApi.getTodayArticles(),
  });

  const { data: podcasts } = useQuery({
    queryKey: ['podcasts'],
    queryFn: () => podcastsApi.getPodcasts(),
  });

  const { data: rssSources } = useQuery({
    queryKey: ['rssSources'],
    queryFn: () => rssApi.getSources(),
  });

  // Calculate today's podcasts
  const today = new Date().toDateString();
  const todaysPodcasts = podcasts?.data?.filter((podcast: any) => 
    new Date(podcast.created_at).toDateString() === today
  ) || [];

  // Calculate this week's articles
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of this week
  weekStart.setHours(0, 0, 0, 0);

  const thisWeekArticles = todayArticles?.data?.filter((article: any) => 
    new Date(article.fetched_at) >= weekStart
  ) || [];

  const stats = [
    { 
      label: 'Articles Fetched Today', 
      value: (todayArticles?.data?.length || 0).toString(),
      description: 'Fresh content ready for podcasting'
    },
    { 
      label: 'Podcasts Created Today', 
      value: todaysPodcasts.length.toString(),
      description: 'Audio content generated today'
    },
    { 
      label: 'RSS Sources Active', 
      value: (rssSources?.data?.length || 0).toString(),
      description: 'Monitored news sources'
    },
    { 
      label: 'Articles This Week', 
      value: thisWeekArticles.length.toString(),
      description: 'Total content collected this week'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.7 }}
      className="glass-card p-6"
    >
      <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
        Today's Summary
      </h2>
      <div className="space-y-4">
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col space-y-1 p-4 rounded-lg" style={{ backgroundColor: 'rgba(42, 42, 42, 0.3)' }}>
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--color-text-secondary)' }}>{stat.label}</span>
              <span className="font-bold text-2xl" style={{ color: 'var(--color-accent-400)' }}>
                {stat.value}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {stat.description}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default Dashboard;