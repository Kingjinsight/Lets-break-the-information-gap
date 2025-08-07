import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Play, 
  Pause, 
  Download, 
  Trash2, 
  Calendar, 
  Clock,
  Volume2,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';
import { podcastsApi, settingsApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { animations } from '../../utils/animations';

// 辅助函数
const formatTime = (time: number) => {
  if (!time || !isFinite(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const getCurrentDateString = () => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return now.toLocaleDateString('en-US', options);
};

const Podcasts: React.FC = () => {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // 使用单一的音频实例
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // 防止重复操作的锁
  const operationLockRef = useRef(false);
  // 缓存已加载的音频blob URL
  const audioCacheRef = useRef<Map<number, string>>(new Map());
  // 当前正在加载的播客ID，用于取消之前的加载
  const loadingPodcastRef = useRef<number | null>(null);
  // AbortController 用于取消请求
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const queryClient = useQueryClient();

  // 获取播客列表
  const { data: podcasts, isLoading: isLoadingPodcasts } = useQuery({
    queryKey: ['podcasts'],
    queryFn: () => podcastsApi.getPodcasts(),
  });

  // 删除播客
  const deleteMutation = useMutation({
    mutationFn: podcastsApi.deletePodcast,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['podcasts'] });
      stopAllAudio();
    },
  });

  // 显示错误信息
  const showError = useCallback((message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 3000);
  }, []);

  // 完全停止所有音频播放
  const stopAllAudio = useCallback(() => {
    console.log('🛑 Stopping all audio');
    
    // 取消正在进行的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
      audioRef.current = null;
    }
    
    setCurrentlyPlaying(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(null);
    loadingPodcastRef.current = null;
    operationLockRef.current = false;
  }, []);

  // 清理缓存
  const clearCache = useCallback(() => {
    audioCacheRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    audioCacheRef.current.clear();
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopAllAudio();
      clearCache();
    };
  }, [stopAllAudio, clearCache]);

  // 获取或缓存音频
  const getAudioUrl = useCallback(async (podcastId: number, signal?: AbortSignal): Promise<string> => {
    // 检查缓存
    const cachedUrl = audioCacheRef.current.get(podcastId);
    if (cachedUrl) {
      console.log('📦 Using cached audio for podcast:', podcastId);
      return cachedUrl;
    }

    console.log('📡 Fetching audio for podcast:', podcastId);
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(podcastsApi.getAudioStream(podcastId), {
      headers: { 'Authorization': `Bearer ${token}` },
      signal, // 添加信号以支持取消
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    
    // 检查请求是否被取消
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }
    
    const audioUrl = URL.createObjectURL(blob);
    
    // 缓存音频URL
    audioCacheRef.current.set(podcastId, audioUrl);
    console.log('💾 Cached audio for podcast:', podcastId);
    
    return audioUrl;
  }, []);

  // 播放指定播客
  const playPodcast = useCallback(async (podcastId: number) => {
    console.log('▶️ Playing podcast:', podcastId);
    
    // 检查是否还是当前要播放的播客
    if (loadingPodcastRef.current !== podcastId) {
      console.log('🚫 Podcast changed during loading, aborting');
      return;
    }
    
    try {
      // 创建新的 AbortController
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      const audioUrl = await getAudioUrl(podcastId, abortController.signal);
      
      // 再次检查是否还是当前要播放的播客
      if (loadingPodcastRef.current !== podcastId || abortController.signal.aborted) {
        console.log('🚫 Podcast changed or aborted, cleaning up');
        URL.revokeObjectURL(audioUrl);
        return;
      }
      
      // 创建新的音频实例
      const audio = new Audio(audioUrl);
      audio.volume = 1;
      
      // 先设置状态，再设置音频引用
      setCurrentlyPlaying(podcastId);
      audioRef.current = audio;
      
      // 设置事件监听器 - 移除对currentlyPlaying的依赖
      audio.onloadedmetadata = () => {
        console.log('📊 Metadata loaded, duration:', audio.duration);
        if (audioRef.current === audio && loadingPodcastRef.current === podcastId) {
          setDuration(audio.duration || 0);
          setIsLoading(null);
          loadingPodcastRef.current = null;
          operationLockRef.current = false; // 在这里释放锁
        }
      };

      audio.ontimeupdate = () => {
        // 直接检查音频实例，不依赖状态
        if (audioRef.current === audio) {
          setCurrentTime(audio.currentTime);
        }
      };

      audio.onended = () => {
        if (audioRef.current === audio) {
          console.log('🏁 Playback ended');
          stopAllAudio();
        }
      };

      audio.onerror = (e) => {
        if (audioRef.current === audio) {
          console.error('❌ Audio error:', e);
          stopAllAudio();
          showError('Audio playback failed');
        }
      };

      // 开始播放
      await audio.play();
      
      if (audioRef.current === audio) {
        setIsPlaying(true);
        console.log('✅ Started playing podcast:', podcastId);
      }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🚫 Audio loading was aborted');
        return;
      }
      console.error('Failed to play podcast:', error);
      if (loadingPodcastRef.current === podcastId) {
        stopAllAudio();
        showError('Failed to load podcast');
      }
    }
  }, [getAudioUrl, stopAllAudio, showError]);

  // 主播放控制函数
  const handlePlay = useCallback(async (podcastId: number) => {
    console.log('🎵 Play button clicked for podcast:', podcastId);
    
    // 防止重复操作
    if (operationLockRef.current) {
      console.log('🔒 Operation locked, ignoring click');
      return;
    }
    
    operationLockRef.current = true;
    
    try {
      // 如果点击的是当前正在播放的播客
      if (currentlyPlaying === podcastId && !isLoading) {
        if (audioRef.current) {
          if (isPlaying) {
            console.log('⏸️ Pausing current podcast');
            audioRef.current.pause();
            setIsPlaying(false);
            operationLockRef.current = false; // 立即释放锁
          } else {
            console.log('▶️ Resuming current podcast');
            await audioRef.current.play();
            setIsPlaying(true);
            operationLockRef.current = false; // 立即释放锁
          }
        } else {
          // 音频实例丢失，重新播放
          console.log('🔄 Audio instance lost, restarting...');
          setIsLoading(podcastId);
          loadingPodcastRef.current = podcastId;
          await playPodcast(podcastId);
          // 锁会在 playPodcast 的 onloadedmetadata 中释放
        }
      } else {
        // 切换到新的播客
        console.log('🔄 Switching to new podcast:', podcastId);
        
        // 先停止所有播放
        stopAllAudio();
        
        // 设置新的加载状态
        setIsLoading(podcastId);
        loadingPodcastRef.current = podcastId;
        
        // 开始播放新的播客
        await playPodcast(podcastId);
        // 锁会在 playPodcast 的 onloadedmetadata 中释放
      }
    } catch (error) {
      console.error('Error in handlePlay:', error);
      stopAllAudio();
      showError('Playback failed');
      operationLockRef.current = false;
    }
  }, [currentlyPlaying, isPlaying, isLoading, playPodcast, stopAllAudio, showError]);

  // 进度条控制
  const handleSeek = useCallback((seekTime: number) => {
    if (audioRef.current && duration > 0) {
      console.log('⏭️ Seeking to:', seekTime);
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  }, [duration]);

  // 下载播客
  const handleDownload = useCallback(async (podcastId: number, title: string) => {
    if (isDownloading === podcastId) return;
    
    try {
      setIsDownloading(podcastId);
      const response = await podcastsApi.downloadAudio(podcastId);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.wav`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      showError('Download failed');
    } finally {
      setIsDownloading(null);
    }
  }, [isDownloading, showError]);

  // 删除播客
  const handleDelete = useCallback((podcastId: number) => {
    if (confirm('确定要删除这个播客吗？')) {
      // 如果删除的是当前播放的播客，先停止播放
      if (currentlyPlaying === podcastId) {
        stopAllAudio();
      }
      // 清除缓存
      const cachedUrl = audioCacheRef.current.get(podcastId);
      if (cachedUrl) {
        URL.revokeObjectURL(cachedUrl);
        audioCacheRef.current.delete(podcastId);
      }
      deleteMutation.mutate(podcastId);
    }
  }, [currentlyPlaying, stopAllAudio, deleteMutation]);

  return (
    <motion.div 
      className="space-y-6"
      {...animations.pageEnter}
    >
      {/* 错误提示 */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50"
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-bold text-gradient">Podcasts</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Manage and listen to your generated podcasts
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="btn-accent flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Generate Today's Podcast</span>
          </button>
          
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['podcasts'] })}
            className="btn-secondary"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <StatCard
          title="Total Podcasts"
          value={podcasts?.data?.length || 0}
          icon={Play}
          color="var(--color-accent-500)"
        />
        <StatCard
          title="Currently Playing"
          value={currentlyPlaying ? '1' : '0'}
          icon={Volume2}
          color="#10b981"
        />
      </motion.div>

      {/* 播客列表 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {isLoadingPodcasts ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card p-6 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-bg-hover rounded-xl"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-bg-hover rounded mb-2"></div>
                    <div className="h-3 bg-bg-hover rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : podcasts?.data?.length ? (
          podcasts.data.map((podcast: any, index: number) => (
            <PodcastCard
              key={podcast.id}
              podcast={podcast}
              index={index}
              isPlaying={currentlyPlaying === podcast.id && isPlaying}
              isLoading={isLoading === podcast.id}
              currentTime={currentlyPlaying === podcast.id ? currentTime : 0}
              duration={currentlyPlaying === podcast.id ? duration : 0}
              isCurrentlyPlaying={currentlyPlaying === podcast.id}
              onPlay={() => handlePlay(podcast.id)}
              onSeek={handleSeek}
              onDownload={() => handleDownload(podcast.id, podcast.title)}
              onDelete={() => handleDelete(podcast.id)}
              isDeleting={deleteMutation.isPending}
              isDownloading={isDownloading === podcast.id}
            />
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-12 text-center"
          >
            <div className="mb-4">
              <Volume2 className="h-16 w-16 mx-auto" style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              No Podcasts Yet
            </h3>
            <p style={{ color: 'var(--color-text-muted)' }} className="mb-6">
              Generate your first podcast from today's articles
            </p>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="btn-accent"
            >
              Generate Podcast
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* 生成播客模态框 */}
      <GeneratePodcastModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
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

// 播客卡片组件
const PodcastCard: React.FC<{
  podcast: any;
  index: number;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  isCurrentlyPlaying: boolean;
  onPlay: () => void;
  onSeek: (seekTime: number) => void;
  onDownload: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  isDownloading: boolean;
}> = ({ 
  podcast, 
  index, 
  isPlaying, 
  isLoading,
  currentTime,
  duration,
  isCurrentlyPlaying,
  onPlay, 
  onSeek,
  onDownload, 
  onDelete, 
  isDeleting, 
  isDownloading
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.01, y: -1 }}
      className="glass-card p-6 group"
    >
      <div className="flex items-center space-x-6">
        {/* 播放按钮 */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPlay}
          disabled={isLoading}
          className="flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-50"
          style={{ 
            background: isPlaying 
              ? `linear-gradient(135deg, var(--color-accent-500), var(--color-accent-600))`
              : 'var(--color-bg-tertiary)',
            boxShadow: isPlaying ? 'var(--shadow-glow)' : 'none'
          }}
        >
          {isLoading ? (
            <Loader className="h-6 w-6 text-white animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-6 w-6 text-white" />
          ) : (
            <Play className="h-6 w-6 text-white ml-1" />
          )}
        </motion.button>

        {/* 播客信息 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg mb-1 truncate" 
              style={{ color: 'var(--color-text-primary)' }}>
            {podcast.title}
          </h3>
          
          <div className="flex items-center space-x-4 text-sm" 
               style={{ color: 'var(--color-text-muted)' }}>
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(podcast.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{isCurrentlyPlaying && duration > 0 ? formatTime(duration) : 'Unknown'}</span>
            </div>
            <div className="flex items-center space-x-1">
              {podcast.audio_file_path ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span>{podcast.audio_file_path ? 'Ready' : 'Processing'}</span>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {podcast.audio_file_path && (
            <motion.button
              onClick={onDownload}
              disabled={isDownloading}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg transition-colors disabled:opacity-50"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => !isDownloading && (e.currentTarget.style.color = 'var(--color-accent-400)')}
              onMouseLeave={(e) => !isDownloading && (e.currentTarget.style.color = 'var(--color-text-muted)')}
            >
              {isDownloading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </motion.button>
          )}
          
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

      {/* 播放进度条 */}
      {isCurrentlyPlaying && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 pt-4 border-t"
          style={{ borderColor: 'var(--color-bg-border)' }}
        >
          <div className="flex items-center space-x-4">
            <span className="text-sm font-mono" style={{ color: 'var(--color-text-muted)' }}>
              {formatTime(currentTime)}
            </span>
            <div 
              className="flex-1 h-2 rounded-full cursor-pointer relative" 
              style={{ backgroundColor: 'var(--color-bg-hover)' }}
              onClick={(e) => {
                if (duration > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickPosition = (e.clientX - rect.left) / rect.width;
                  const seekTime = clickPosition * duration;
                  onSeek(seekTime);
                }
              }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ 
                  backgroundColor: 'var(--color-accent-500)',
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`
                }}
              />
              {/* 加载指示器 */}
              {duration === 0 && isCurrentlyPlaying && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Loading...
                  </div>
                </div>
              )}
            </div>
            <span className="text-sm font-mono" style={{ color: 'var(--color-text-muted)' }}>
              {duration > 0 ? formatTime(duration) : '--:--'}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// 生成播客模态框组件
const GeneratePodcastModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
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
      
      await podcastsApi.generateTodayPodcast(title || undefined);
      queryClient.invalidateQueries({ queryKey: ['podcasts'] });
      onClose();
      setTitle('');
      showSuccess('Podcast Generation Started!', 'Your podcast is being created from today\'s articles');
    } catch (error) {
      console.error('Generation error:', error);
      showError('Podcast Generation Failed', 'Unable to start podcast creation. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="glass-card p-6 mx-4">
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                Generate Today's Podcast
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" 
                         style={{ color: 'var(--color-text-secondary)' }}>
                    Podcast Title (Optional)
                  </label>
                  <input
                    type="text"
                    className="input-field w-full"
                    placeholder={`Daily Briefing - ${getCurrentDateString()}`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="btn-secondary flex-1"
                    disabled={isGenerating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="btn-accent flex-1 flex items-center justify-center space-x-2"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        <span>Generate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Podcasts;