import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Copy, Check } from 'lucide-react';

interface RssBridgeHelperProps {
  onUrlGenerated: (url: string, title: string) => void;
}

const RssBridgeHelper: React.FC<RssBridgeHelperProps> = ({ onUrlGenerated }) => {
  const [inputs, setInputs] = useState({
    youtube: { channel: '', type: 'channel' },
  });
  const [copiedUrl, setCopiedUrl] = useState('');

  const RSSHUB_PUBLIC = 'https://rsshub.app';

  const generateYouTubeUrl = (channel: string, type: 'channel' | 'playlist' | 'search') => {
    if (!channel) return '';
    switch (type) {
      case 'channel':
        return `${RSSHUB_PUBLIC}/youtube/channel/${channel}`;
      case 'playlist':
        return `${RSSHUB_PUBLIC}/youtube/playlist/${channel}`;
      case 'search':
        return `${RSSHUB_PUBLIC}/youtube/search/${encodeURIComponent(channel)}`;
      default:
        return '';
    }
  };

  const getCurrentUrl = () => {
    return generateYouTubeUrl(inputs.youtube.channel, inputs.youtube.type as any);
  };

  const getCurrentTitle = () => {
    return inputs.youtube.channel ? `${inputs.youtube.channel} - YouTube` : '';
  };

  const handleUseUrl = () => {
    const url = getCurrentUrl();
    const title = getCurrentTitle();
    if (url && title) {
      onUrlGenerated(url, title);
    }
  };

  const handleCopyUrl = async () => {
    const url = getCurrentUrl();
    if (url) {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(''), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          YouTube RSS Feed
        </h3>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Generate RSS feeds for YouTube channels, playlists, or searches.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-3"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2"
                   style={{ color: 'var(--color-text-secondary)' }}>
              Feed Type
            </label>
            <select
              className="input-field w-full"
              value={inputs.youtube.type}
              onChange={(e) => setInputs(prev => ({
                ...prev,
                youtube: { ...prev.youtube, type: e.target.value }
              }))}
            >
              <option value="channel">Channel Videos</option>
              <option value="playlist">Playlist</option>
              <option value="search">Search Results</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2"
                   style={{ color: 'var(--color-text-secondary)' }}>
              {inputs.youtube.type === 'channel' ? 'Channel ID' : 
               inputs.youtube.type === 'playlist' ? 'Playlist ID' : 
               'Search Keywords'}
            </label>
            <input
              type="text"
              className="input-field w-full"
              placeholder={
                inputs.youtube.type === 'channel' ? 'UC1234567890' : 
                inputs.youtube.type === 'playlist' ? 'PLrAXtmRdnEQy4...' : 
                'search keywords'
              }
              value={inputs.youtube.channel}
              onChange={(e) => setInputs(prev => ({
                ...prev,
                youtube: { ...prev.youtube, channel: e.target.value }
              }))}
            />
          </div>
        </div>
      </motion.div>

      {getCurrentUrl() && (
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-hover)' }}>
          <label className="block text-sm font-medium mb-2"
                 style={{ color: 'var(--color-text-secondary)' }}>
            Generated RSS URL
          </label>
          <div className="flex items-center space-x-2">
            <div
              className="flex-1 p-2 rounded text-xs break-all font-mono"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-muted)'
              }}
            >
              {getCurrentUrl()}
            </div>
            <button
              onClick={handleCopyUrl}
              className="p-2 rounded transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent-400)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
            >
              {copiedUrl === getCurrentUrl() ?
                <Check className="h-4 w-4" /> :
                <Copy className="h-4 w-4" />
              }
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleUseUrl}
          disabled={!getCurrentUrl()}
          className="btn-accent flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Use This URL</span>
        </button>

        {getCurrentUrl() && (
          <a
            href={getCurrentUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center space-x-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Preview</span>
          </a>
        )}
      </div>
    </div>
  );
};

export default RssBridgeHelper;
