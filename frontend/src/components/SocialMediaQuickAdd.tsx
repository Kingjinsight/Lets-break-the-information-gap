import React from 'react';
import { motion } from 'framer-motion';
import { Youtube, Rss, TrendingUp } from 'lucide-react';

interface SocialMediaQuickAddProps {
  onSourceSelect: (url: string, title: string) => void;
}

interface PredefinedSource {
  id: string;
  title: string;
  url: string;
  description: string;
  category: 'youtube';
  icon: React.ElementType;
  color: string;
  popular?: boolean;
}

const SocialMediaQuickAdd: React.FC<SocialMediaQuickAddProps> = ({ onSourceSelect }) => {
  // RSSHub基础URL - 使用公共实例
  const RSSHUB_PUBLIC = 'https://rsshub.app';

  const predefinedSources: PredefinedSource[] = [
    // YouTube热门频道
    {
      id: 'youtube-tech',
      title: 'Marques Brownlee - MKBHD',
      url: `${RSSHUB_PUBLIC}/youtube/channel/UCBJycsmduvYEL83R_U4JriQ`,
      description: 'Tech reviews and updates',
      category: 'youtube',
      icon: Youtube,
      color: '#ff0000',
      popular: true
    },
    {
      id: 'youtube-programming',
      title: 'Fireship',
      url: `${RSSHUB_PUBLIC}/youtube/channel/UCsBjURrPoezykLs9EqgamOA`,
      description: 'Programming tutorials and tips',
      category: 'youtube',
      icon: Youtube,
      color: '#ff0000',
      popular: true
    },
    {
      id: 'youtube-ai',
      title: 'Two Minute Papers',
      url: `${RSSHUB_PUBLIC}/youtube/channel/UCbfYPyITQ-7l4upoX8nvctg`,
      description: 'AI research paper summaries',
      category: 'youtube',
      icon: Youtube,
      color: '#ff0000',
      popular: true
    },
    {
      id: 'youtube-dev',
      title: 'The Coding Train',
      url: `${RSSHUB_PUBLIC}/youtube/channel/UCvjgXvBlbQiydffZU7m1_aw`,
      description: 'Creative coding and tutorials',
      category: 'youtube',
      icon: Youtube,
      color: '#ff0000'
    },
    {
      id: 'youtube-tech-news',
      title: 'Linus Tech Tips',
      url: `${RSSHUB_PUBLIC}/youtube/channel/UCXuqSBlHAE6Xw-yeJA0Tunw`,
      description: 'Tech news and reviews',
      category: 'youtube',
      icon: Youtube,
      color: '#ff0000'
    }
  ];

  const categories = [
    { id: 'popular', label: 'Popular', icon: TrendingUp, sources: predefinedSources.filter(s => s.popular) },
    { id: 'youtube', label: 'YouTube', icon: Youtube, sources: predefinedSources.filter(s => s.category === 'youtube') }
  ];

  const [activeCategory, setActiveCategory] = React.useState('popular');

  const handleSourceClick = (source: PredefinedSource) => {
    onSourceSelect(source.url, source.title);
  };

  const currentSources = categories.find(c => c.id === activeCategory)?.sources || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Quick Add Sources
        </h3>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Popular YouTube RSS feeds
        </p>
      </div>

      {/* 分类选择 */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeCategory === category.id 
                ? 'bg-blue-500 text-white' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            style={{ 
              backgroundColor: activeCategory === category.id ? 'var(--color-accent-500)' : 'var(--color-bg-hover)',
              color: activeCategory === category.id ? 'white' : 'var(--color-text-muted)'
            }}
          >
            <category.icon className="h-4 w-4" />
            <span>{category.label}</span>
            <span className="text-xs opacity-75">({category.sources.length})</span>
          </button>
        ))}
      </div>

      {/* 源列表 */}
      <motion.div
        key={activeCategory}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-2 max-h-64 overflow-y-auto"
      >
        {currentSources.map((source) => (
          <motion.div
            key={source.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-3 rounded-lg cursor-pointer transition-all border overflow-hidden"
            style={{ 
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border-light)',
              position: 'relative'
            }}
            onClick={() => handleSourceClick(source)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = source.color;
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
              e.currentTarget.style.boxShadow = `0 0 0 1px ${source.color}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-light)';
              e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div className="flex items-start space-x-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${source.color}20` }}
              >
                <source.icon 
                  className="h-4 w-4" 
                  style={{ color: source.color }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium truncate" 
                      style={{ color: 'var(--color-text-primary)' }}>
                    {source.title}
                  </h4>
                  {source.popular && (
                    <span 
                      className="px-2 py-1 text-xs rounded-full font-medium"
                      style={{ 
                        backgroundColor: 'var(--color-accent-100)',
                        color: 'var(--color-accent-700)'
                      }}
                    >
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-sm mt-1" 
                   style={{ color: 'var(--color-text-muted)' }}>
                  {source.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
        
        {currentSources.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
            <Rss className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No sources available in this category</p>
          </div>
        )}
      </motion.div>

      <div className="text-xs text-center pt-4 border-t" 
           style={{ 
             color: 'var(--color-text-muted)',
             borderColor: 'var(--color-border-light)'
           }}>
        <p>RSS feeds generated using RSSHub service</p>
        <p className="mt-1">
          <a 
            href="https://docs.rsshub.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:no-underline"
            style={{ color: 'var(--color-accent-500)' }}
          >
            Learn more about RSSHub
          </a>
        </p>
      </div>
    </div>
  );
};

export default SocialMediaQuickAdd;
