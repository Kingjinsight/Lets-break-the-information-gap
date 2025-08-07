import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Rss, 
  Trash2, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle,
  Globe,
  Calendar,
  Loader,
  X,
  Zap
} from 'lucide-react';
import { rssApi, articlesApi } from '../../services/api';
import RssBridgeHelper from '../../components/RssBridgeHelper';
import SocialMediaQuickAdd from '../../components/SocialMediaQuickAdd';
import { animations } from '../../utils/animations';

const RssSources: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();

  // 获取 RSS 源列表
  const { data: sources, isLoading } = useQuery({
    queryKey: ['rssSources'],
    queryFn: () => rssApi.getSources(),
  });

  // 获取文章统计
  const { data: stats } = useQuery({
    queryKey: ['articleStats'],
    queryFn: () => articlesApi.getStats(),
  });

  // 删除 RSS 源
  const deleteMutation = useMutation({
    mutationFn: rssApi.deleteSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rssSources'] });
    },
  });

  // 刷新 RSS 源
  const refreshMutation = useMutation({
    mutationFn: rssApi.refreshSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rssSources'] });
    },
  });

  // 获取所有文章
  const fetchAllMutation = useMutation({
    mutationFn: rssApi.fetchAllArticles,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rssSources'] });
      queryClient.invalidateQueries({ queryKey: ['todayArticles'] });
    },
  });

  const handleDelete = async (sourceId: number) => {
    if (confirm('Are you sure you want to delete this RSS source?')) {
      deleteMutation.mutate(sourceId);
    }
  };

  const handleRefresh = (sourceId: number) => {
    refreshMutation.mutate(sourceId);
  };

  const handleFetchAll = () => {
    fetchAllMutation.mutate();
  };

  return (
    <motion.div 
      className="space-y-6"
      {...animations.pageEnter}
    >
      {/* Header */}
      <motion.div
        {...animations.pageTitle}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rss-header"
      >
        <div>
          <h1 className="text-4xl font-bold text-gradient">RSS Sources</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Manage your RSS feeds and news sources
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-accent flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add RSS Source</span>
          </button>
          
          <button
            onClick={handleFetchAll}
            disabled={fetchAllMutation.isPending}
            className="btn-secondary flex items-center space-x-2"
          >
            {fetchAllMutation.isPending ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>Fetch All Articles</span>
          </button>
        </div>
      </motion.div>

      {/* 统计信息 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <StatCard
          title="Total Sources"
          value={sources?.data?.length || 0}
          icon={Rss}
          color="var(--color-accent-500)"
        />
        <StatCard
          title="Active Sources"
          value={sources?.data?.filter((s: any) => s.is_active !== false).length || 0}
          icon={CheckCircle}
          color="#10b981"
        />
        <StatCard
          title="Articles Today"
          value={stats?.data?.articles_today || 0}
          icon={Calendar}
          color="#8b5cf6"
        />
      </motion.div>

      {/* RSS 源列表 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-bg-hover rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-bg-hover rounded mb-2"></div>
                    <div className="h-3 bg-bg-hover rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sources?.data?.length ? (
          sources.data.map((source: any, index: number) => (
            <RssSourceCard
              key={source.id}
              source={source}
              index={index}
              onDelete={() => handleDelete(source.id)}
              onRefresh={() => handleRefresh(source.id)}
              isDeleting={deleteMutation.isPending}
              isRefreshing={refreshMutation.isPending}
            />
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-12 text-center"
          >
            <div className="mb-4">
              <Rss className="h-16 w-16 mx-auto" style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              No RSS Sources Yet
            </h3>
            <p style={{ color: 'var(--color-text-muted)' }} className="mb-6">
              Add your first RSS feed to start collecting articles
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-accent"
            >
              Add RSS Source
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* 添加 RSS 源模态框 */}
      <AddRssSourceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </motion.div>
  );
};

// 统计卡片组件
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: any;
  color: string;
}> = ({ title, value, icon: Icon, color }) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    className="glass-card p-6"
  >
    <div className="flex items-center justify-between">
      <div>
        <p style={{ color: 'var(--color-text-muted)' }} className="text-sm font-medium mb-1">
          {title}
        </p>
        <p style={{ color: 'var(--color-text-primary)' }} className="text-2xl font-bold">
          {value}
        </p>
      </div>
      <div 
        className="p-3 rounded-xl"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="h-6 w-6" style={{ color }} />
      </div>
    </div>
  </motion.div>
);

// RSS 源卡片组件
const RssSourceCard: React.FC<{
  source: any;
  index: number;
  onDelete: () => void;
  onRefresh: () => void;
  isDeleting: boolean;
  isRefreshing: boolean;
}> = ({ source, index, onDelete, onRefresh, isDeleting, isRefreshing }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.01, y: -1 }}
      className="glass-card p-6 group rss-card"
    >
      <div className="flex items-center space-x-4">
        {/* 图标 */}
        <div 
          className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-accent-500)' }}
        >
          <Rss className="h-6 w-6 text-white" />
        </div>

        {/* RSS 源信息 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg mb-1 truncate" 
              style={{ color: 'var(--color-text-primary)' }}>
            {source.title || 'Untitled RSS Source'}
          </h3>
          
          <div className="flex items-center space-x-4 text-sm mb-2" 
               style={{ color: 'var(--color-text-muted)' }}>
            <div className="flex items-center space-x-1">
              <Globe className="h-4 w-4" />
              <span className="truncate max-w-64">{source.url}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(source.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* 状态指示 */}
          <div className="flex items-center space-x-2">
            <span className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Active
              </span>
            </span>
            {source.description && (
              <span className="text-sm truncate max-w-48" 
                    style={{ color: 'var(--color-text-muted)' }}>
                {source.description}
              </span>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent-400)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
          >
            <ExternalLink className="h-4 w-4" />
          </motion.a>

          <motion.button
            onClick={onRefresh}
            disabled={isRefreshing}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent-400)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </motion.button>
          
          <motion.button
            onClick={onDelete}
            disabled={isDeleting}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
          >
            {isDeleting ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// 添加 RSS 源模态框
const AddRssSourceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState<'social' | 'quick' | 'manual'>('manual');
  const queryClient = useQueryClient();

  const validateUrl = async (urlToValidate: string) => {
    if (!urlToValidate.trim()) {
      setValidationResult(null);
      return;
    }

    try {
      const response = await rssApi.validateSource(urlToValidate);
      setValidationResult(response.data);
      
      // If validation is successful and no custom title is set, use the feed title
      if (response.data.valid && response.data.feed_info?.title && !title.trim()) {
        setTitle(response.data.feed_info.title);
      }
    } catch (err: any) {
      setValidationResult(null);
    }
  };

  const handleAdd = async () => {
    if (!url.trim()) return;
    
    // Validate one more time before adding
    if (!validationResult?.valid) {
      return;
    }
    
    setIsAdding(true);
    try {
      await rssApi.createSource(url, title || undefined);
      queryClient.invalidateQueries({ queryKey: ['rssSources'] });
      onClose();
      setUrl('');
      setTitle('');
      setValidationResult(null);
    } catch (err: any) {
      // Handle error silently or show a toast
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    // Clear validation timeout on close
    if (validationTimeout) {
      clearTimeout(validationTimeout);
      setValidationTimeout(null);
    }
    
    onClose();
    setUrl('');
    setTitle('');
    setValidationResult(null);
    setActiveTab('social');
  };

  // Handle URL generated from social media helper
  const handleUrlGenerated = (generatedUrl: string, generatedTitle: string) => {
    setUrl(generatedUrl);
    setTitle(generatedTitle);
    // Stay on current tab since URL is already generated
    // Trigger validation for the generated URL
    validateUrl(generatedUrl);
  };

  // Handle source selected from quick add
  const handleSourceSelect = (selectedUrl: string, selectedTitle: string) => {
    setUrl(selectedUrl);
    setTitle(selectedTitle);
    // Stay on current tab since URL is already selected
    // Trigger validation for the selected URL
    validateUrl(selectedUrl);
  };

  const tabs = [
    { id: 'manual' as const, label: 'Add RSS URL', icon: Globe },
    { id: 'social' as const, label: 'YouTube RSS', icon: Zap },
    { id: 'quick' as const, label: 'I break gaps', icon: Rss }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="glass-card p-6 mx-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Add RSS Source
                </h2>
                <button
                  onClick={handleClose}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex space-x-1 p-1 rounded-lg mb-6" 
                   style={{ backgroundColor: 'var(--color-bg-hover)' }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center ${
                      activeTab === tab.id 
                        ? '' 
                        : ''
                    }`}
                    style={{ 
                      color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                      backgroundColor: activeTab === tab.id ? 'var(--color-bg-secondary)' : 'transparent'
                    }}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'manual' && (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <Globe className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--color-accent-400)' }} />
                      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                        Add RSS Feed URL
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        Enter any RSS or Atom feed URL to add it to your sources
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                          RSS Feed URL *
                        </label>
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => {
                            const newUrl = e.target.value;
                            setUrl(newUrl);
                            
                            // Clear previous timeout
                            if (validationTimeout) {
                              clearTimeout(validationTimeout);
                            }
                            
                            // Set new timeout for validation (debounce)
                            const timeout = setTimeout(() => validateUrl(newUrl), 500);
                            setValidationTimeout(timeout);
                          }}
                          placeholder="https://example.com/rss.xml"
                          className="input-field"
                          style={{
                            borderColor: validationResult?.valid === false ? '#ef4444' : 
                                        validationResult?.valid === true ? '#10b981' : 'var(--color-border-light)'
                          }}
                        />
                        
                        {/* URL Validation Feedback */}
                        {validationResult && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 flex items-center space-x-2"
                          >
                            {validationResult.valid ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm text-green-600">
                                  Valid RSS feed - {validationResult.feed_info?.total_articles} articles found
                                </span>
                              </>
                            ) : (
                              <>
                                <X className="h-4 w-4 text-red-500" />
                                <span className="text-sm text-red-600">
                                  {validationResult.error} - {validationResult.details}
                                </span>
                              </>
                            )}
                          </motion.div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                          Custom Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Enter a custom name for this source"
                          className="input-field"
                        />
                        {validationResult?.valid && validationResult.feed_info?.title && (
                          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            Auto-detected: {validationResult.feed_info.title}
                          </p>
                        )}
                      </div>

                      {/* Feed Preview */}
                      {validationResult?.valid && validationResult.feed_info && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-4 rounded-lg border"
                          style={{ 
                            backgroundColor: 'var(--color-bg-hover)',
                            borderColor: 'var(--color-border-light)'
                          }}
                        >
                          <h4 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                            Feed Preview
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span style={{ color: 'var(--color-text-muted)' }}>Title: </span>
                              <span style={{ color: 'var(--color-text-primary)' }}>
                                {validationResult.feed_info.title}
                              </span>
                            </div>
                            {validationResult.feed_info.description && (
                              <div>
                                <span style={{ color: 'var(--color-text-muted)' }}>Description: </span>
                                <span style={{ color: 'var(--color-text-primary)' }}>
                                  {validationResult.feed_info.description}
                                </span>
                              </div>
                            )}
                            <div>
                              <span style={{ color: 'var(--color-text-muted)' }}>Articles: </span>
                              <span style={{ color: 'var(--color-accent-400)' }}>
                                {validationResult.feed_info.total_articles} available
                              </span>
                            </div>
                            {validationResult.feed_info.latest_article && (
                              <div>
                                <span style={{ color: 'var(--color-text-muted)' }}>Latest: </span>
                                <span style={{ color: 'var(--color-text-primary)' }}>
                                  {validationResult.feed_info.latest_article}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'social' && (
                  <RssBridgeHelper onUrlGenerated={handleUrlGenerated} />
                )}

                {activeTab === 'quick' && (
                  <SocialMediaQuickAdd onSourceSelect={handleSourceSelect} />
                )}
              </motion.div>

              {/* Selected URL Display */}
              {url && (
                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-hover)' }}>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Selected RSS Feed
                  </label>
                  <div className="space-y-2">
                    <div className="p-2 rounded text-xs break-all font-mono" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}>
                      {url}
                    </div>
                    {title && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Title:</span>
                        <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{title}</span>
                      </div>
                    )}
                    {validationResult && (
                      <div className="flex items-center space-x-2">
                        {validationResult.valid ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600">Valid RSS feed</span>
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-red-600">Invalid RSS feed</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6 pt-4 border-t" 
                   style={{ borderColor: 'var(--color-border-light)' }}>
                <button
                  onClick={handleClose}
                  className="btn-secondary flex-1"
                  disabled={isAdding}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  className="btn-accent flex-1 flex items-center justify-center space-x-2"
                  disabled={isAdding || !url.trim() || (url.trim() && validationResult && !validationResult.valid)}
                >
                  {isAdding ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : !url.trim() ? (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>
                        {activeTab === 'manual' ? 'Enter RSS URL First' : 
                         activeTab === 'social' ? 'Generate RSS URL First' : 
                         'Select RSS Source First'}
                      </span>
                    </>
                  ) : validationResult === null ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Validating...</span>
                    </>
                  ) : !validationResult.valid ? (
                    <>
                      <X className="h-4 w-4" />
                      <span>Invalid RSS URL</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Add Source</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RssSources;