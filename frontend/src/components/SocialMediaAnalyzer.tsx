import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Globe, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  Loader,
  Plus,
  Info
} from 'lucide-react';
import { rssApi } from '../services/api';

interface SocialMediaAnalyzerProps {
  onSourceSelect: (url: string, title: string) => void;
}

interface SuggestionItem {
  url: string;
  title: string;
  description: string;
}

interface AnalysisResult {
  valid: boolean;
  platform?: string;
  username?: string;
  suggestions: SuggestionItem[];
  error?: string;
}

const SocialMediaAnalyzer: React.FC<SocialMediaAnalyzerProps> = ({ onSourceSelect }) => {
  const [inputUrl, setInputUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>('');

  const handleAnalyze = async () => {
    if (!inputUrl.trim()) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setSelectedSuggestion('');

    try {
      const response = await rssApi.analyzeSocialUrl(inputUrl);
      setAnalysisResult(response.data);
      
      // Auto-select first suggestion if available
      if (response.data.suggestions && response.data.suggestions.length > 0) {
        setSelectedSuggestion(response.data.suggestions[0].url);
      }
    } catch (error: any) {
      setAnalysisResult({
        valid: false,
        error: error.response?.data?.detail || 'Analysis failed',
        suggestions: []
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUseSelected = () => {
    if (!selectedSuggestion || !analysisResult) return;
    
    const suggestion = analysisResult.suggestions.find(s => s.url === selectedSuggestion);
    if (suggestion) {
      onSourceSelect(suggestion.url, suggestion.title);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  };

  const getPlatformColor = (platform?: string) => {
    const colors: Record<string, string> = {
      instagram: '#E4405F',
      twitter: '#1DA1F2',
      x: '#1DA1F2',
      youtube: '#FF0000',
      github: '#333333',
      tiktok: '#000000',
      reddit: '#FF4500',
      bilibili: '#FB7299',
      weibo: '#E6162D',
      zhihu: '#0084FF',
      pixiv: '#0096FA'
    };
    return colors[platform || ''] || '#6B7280';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Social Media URL Analyzer
        </h3>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Paste any social media URL to get RSS options
        </p>
      </div>

      {/* URL Input */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-2" 
                 style={{ color: 'var(--color-text-secondary)' }}>
            Social Media URL
          </label>
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <input
                type="url"
                className="input-field w-full pr-10"
                placeholder="https://instagram.com/username or https://youtube.com/channel/..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Globe className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
              </div>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={!inputUrl.trim() || isAnalyzing}
              className="btn-accent flex items-center space-x-2 px-4 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>Analyze</span>
            </button>
          </div>
        </div>

        {/* Analysis Result */}
        {analysisResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg border"
            style={{ 
              backgroundColor: analysisResult.valid ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
              borderColor: analysisResult.valid ? 'var(--color-success-border)' : 'var(--color-error-border)'
            }}
          >
            {analysisResult.valid ? (
              <div className="space-y-3">
                {/* Platform Info */}
                <div className="flex items-center space-x-3">
                  <CheckCircle 
                    className="h-5 w-5" 
                    style={{ color: 'var(--color-success-text)' }} 
                  />
                  <div>
                    <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Platform detected: 
                      <span 
                        className="ml-2 px-2 py-1 rounded text-sm capitalize"
                        style={{ 
                          backgroundColor: getPlatformColor(analysisResult.platform),
                          color: 'white'
                        }}
                      >
                        {analysisResult.platform}
                      </span>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      User: <span className="font-mono">{analysisResult.username}</span>
                    </div>
                  </div>
                </div>

                {/* RSS Feed Options */}
                {analysisResult.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Available RSS Feeds:
                    </h4>
                    
                    <div className="space-y-2">
                      {analysisResult.suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <input
                            type="radio"
                            id={`suggestion-${index}`}
                            name="rss-suggestion"
                            value={suggestion.url}
                            checked={selectedSuggestion === suggestion.url}
                            onChange={(e) => setSelectedSuggestion(e.target.value)}
                            className="radio-input"
                          />
                          <label 
                            htmlFor={`suggestion-${index}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              {suggestion.title}
                            </div>
                            <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                              {suggestion.description}
                            </div>
                            <div 
                              className="text-xs font-mono mt-1 p-1 rounded"
                              style={{ 
                                backgroundColor: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-muted)'
                              }}
                            >
                              {suggestion.url}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <AlertCircle 
                  className="h-5 w-5" 
                  style={{ color: 'var(--color-error-text)' }} 
                />
                <div>
                  <div className="font-medium" style={{ color: 'var(--color-error-text)' }}>
                    Analysis Failed
                  </div>
                  <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {analysisResult.error}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Action Buttons */}
        {analysisResult?.valid && selectedSuggestion && (
          <div className="flex space-x-2">
            <button
              onClick={handleUseSelected}
              className="btn-accent flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Use Selected Feed</span>
            </button>
            
            <a
              href={selectedSuggestion}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center space-x-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Preview</span>
            </a>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="text-xs p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="flex items-start space-x-2">
          <Info className="h-4 w-4 mt-0.5" style={{ color: 'var(--color-text-muted)' }} />
          <div style={{ color: 'var(--color-text-muted)' }}>
            <p className="font-medium mb-1">Supported platforms:</p>
            <p>Instagram, Twitter/X, YouTube, GitHub, TikTok, Reddit, Bilibili, Weibo, Zhihu, Pixiv, and more.</p>
            <p className="mt-1">Just paste any social media profile or page URL and get RSS feed options automatically.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialMediaAnalyzer;
