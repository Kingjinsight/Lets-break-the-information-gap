import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  RefreshCw,
  CheckCircle2,
  Circle,
  Archive
} from 'lucide-react';
import { articlesApi, podcastsApi, settingsApi } from '../../services/api';
import ArticleCard from '../../components/ArticleCard';
import { useToast } from '../../contexts/ToastContext';
import { animations } from '../../utils/animations';

const Articles: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedArticles, setSelectedArticles] = useState<Set<number>>(new Set());
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  // 获取今日文章
  const { data: articles, isLoading, refetch } = useQuery({
    queryKey: ['articles', 'today'],
    queryFn: () => articlesApi.getTodayArticles(),
  });

  // 过滤和搜索逻辑 - moved before useEffect
  const filteredArticles = useMemo(() => {
    if (!articles?.data) return [];

    let filtered = articles.data;

    // 按阅读状态过滤
    if (selectedFilter !== 'all') {
      filtered = filtered.filter((article: any) => 
        selectedFilter === 'read' ? article.is_read : !article.is_read
      );
    }

    // 按来源过滤
    if (selectedSource !== 'all') {
      filtered = filtered.filter((article: any) => 
        article.source?.name === selectedSource
      );
    }

    // 搜索过滤
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((article: any) =>
        article.title.toLowerCase().includes(term) ||
        article.summary?.toLowerCase().includes(term) ||
        article.source?.name?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [articles?.data, searchTerm, selectedFilter, selectedSource]);

  // 标记已读的 mutation
  const markAsReadMutation = useMutation({
    mutationFn: articlesApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles', 'today'] });
    },
    onError: (error) => {
      console.error('Failed to mark as read:', error);
      alert('Failed to mark article as read');
    }
  });

  // 标记未读的 mutation
  const markAsUnreadMutation = useMutation({
    mutationFn: articlesApi.markAsUnread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles', 'today'] });
    },
    onError: (error) => {
      console.error('Failed to mark as unread:', error);
      alert('Failed to mark article as unread');
    }
  });

  // 获取所有来源
  const sources = useMemo(() => {
    if (!articles?.data) return [];
    const sourceSet = new Set(articles.data.map((article: any) => article.source?.name).filter(Boolean));
    return Array.from(sourceSet) as string[];
  }, [articles?.data]);

  // 切换文章选择
  const toggleArticleSelection = (articleId: number) => {
    const newSelected = new Set(selectedArticles);
    if (newSelected.has(articleId)) {
      newSelected.delete(articleId);
    } else {
      newSelected.add(articleId);
    }
    setSelectedArticles(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedArticles.size === filteredArticles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(filteredArticles.map((article: any) => article.id)));
    }
  };

  // 标记为已读
  const markAsRead = (articleId: number) => {
    markAsReadMutation.mutate(articleId);
  };

  // 标记为未读
  const markAsUnread = (articleId: number) => {
    markAsUnreadMutation.mutate(articleId);
  };

  // 生成播客
  const generatePodcast = async () => {
    if (selectedArticles.size === 0) {
      showError('No Articles Selected', 'Please select articles first');
      return;
    }

    try {
      setIsGeneratingPodcast(true);
      
      // Check if user has API key configured
      try {
        const settingsResponse = await settingsApi.getSettings();
        const userSettings = settingsResponse.data;
        
        if (!userSettings.google_api_key || !userSettings.google_api_key.trim()) {
          showError(
            'API Key Required', 
            'Please configure your Google API key in Settings before generating podcasts.'
          );
          return;
        }
      } catch (error) {
        console.error('Failed to check user settings:', error);
        showError(
          'Settings Check Failed', 
          'Unable to verify API key configuration. Please check your Settings.'
        );
        return;
      }
      
      await podcastsApi.createPodcastFromArticles(Array.from(selectedArticles));
      showSuccess('Podcast Generation Started!', `${selectedArticles.size} articles selected for podcast creation`);
      setSelectedArticles(new Set());
    } catch (error) {
      console.error('Failed to generate podcast:', error);
      showError('Podcast Generation Failed', 'Unable to start podcast creation. Please try again.');
    } finally {
      setIsGeneratingPodcast(false);
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      {...animations.pageEnter}
    >
      {/* Header */}
      <motion.div
        {...animations.pageTitle}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 articles-header"
      >
        <div>
          <h1 className="text-4xl font-bold text-gradient">Today's Articles</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {filteredArticles.length} articles found
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {selectedArticles.size > 0 && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={generatePodcast}
              disabled={isGeneratingPodcast}
              className={`btn-accent flex items-center space-x-2 ${
                isGeneratingPodcast ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              whileTap={{ scale: isGeneratingPodcast ? 1 : 0.95 }}
            >
              {isGeneratingPodcast ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating Podcast...</span>
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  <span>Generate Podcast ({selectedArticles.size})</span>
                </>
              )}
            </motion.button>
          )}
          
          <button
            onClick={() => refetch()}
            className="btn-secondary"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      {/* 搜索和过滤器 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" 
                   style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-bg-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>

          {/* 阅读状态过滤器 */}
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value as 'all' | 'read' | 'unread')}
            className="px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-bg-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <option value="all">All Articles</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>

          {/* 来源过滤器 */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-bg-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <option value="all">All Sources</option>
            {sources.map((source: string) => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>

        {/* 批量操作 */}
        {filteredArticles.length > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between" 
               style={{ borderColor: 'var(--color-bg-border)' }}>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSelectAll}
                className="flex items-center space-x-2 text-sm hover:opacity-80 transition-opacity"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {selectedArticles.size === filteredArticles.length ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
                <span>
                  {selectedArticles.size === filteredArticles.length ? 'Deselect All' : 'Select All'}
                </span>
              </button>
              
              {selectedArticles.size > 0 && (
                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {selectedArticles.size} selected
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* 文章列表 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4 articles-grid"
      >
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="flex space-x-4">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--color-bg-hover)' }}></div>
                  <div className="flex-1">
                    <div className="h-4 rounded mb-2" style={{ backgroundColor: 'var(--color-bg-hover)' }}></div>
                    <div className="h-3 rounded w-2/3 mb-2" style={{ backgroundColor: 'var(--color-bg-hover)' }}></div>
                    <div className="h-3 rounded w-1/3" style={{ backgroundColor: 'var(--color-bg-hover)' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredArticles.length > 0 ? (
          filteredArticles.map((article: any, index: number) => (
            <ArticleCard
              key={article.id}
              article={article}
              index={index}
              isSelected={selectedArticles.has(article.id)}
              isExpanded={expandedArticle === article.id}
              onToggleSelect={() => toggleArticleSelection(article.id)}
              onMarkAsRead={() => markAsRead(article.id)}
              onMarkAsUnread={() => markAsUnread(article.id)}
              onToggleExpand={() => setExpandedArticle(
                expandedArticle === article.id ? null : article.id
              )}
              isMarkingRead={markAsReadMutation.isPending}
              isMarkingUnread={markAsUnreadMutation.isPending}
            />
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-12 text-center"
          >
            <Search className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--color-text-muted)' }} />
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              No Articles Found
            </h3>
            <p style={{ color: 'var(--color-text-muted)' }}>
              {searchTerm ? 'Try adjusting your search terms or filters' : 'No articles available for today'}
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Articles;