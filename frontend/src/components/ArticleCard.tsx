import React from 'react';
import { motion } from 'framer-motion';
import { 
  ExternalLink, 
  Clock, 
  Calendar,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  User,
  Rss
} from 'lucide-react';

interface ArticleCardProps {
  article: any;
  index: number;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onMarkAsRead: () => void;
  onMarkAsUnread: () => void;
  onToggleExpand: () => void;
  isMarkingRead: boolean;
  isMarkingUnread: boolean;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ 
  article, 
  index,
  isSelected,
  isExpanded,
  onToggleSelect,
  onMarkAsRead,
  onMarkAsUnread,
  onToggleExpand,
  isMarkingRead,
  isMarkingUnread
}) => {
  // Handle button clicks
  const handleToggleSelect = () => {
    onToggleSelect();
  };

  const handleMarkAsRead = () => {
    onMarkAsRead();
  };

  const handleMarkAsUnread = () => {
    onMarkAsUnread();
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: isSelected ? 1.02 : 1,
        borderColor: isSelected ? 'var(--color-accent-500)' : 'var(--color-bg-border)'
      }}
      transition={{ 
        delay: index * 0.1,
        duration: 0.3,
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      className={`glass-card article-card animate-card cursor-pointer transition-all duration-300 ${
        isSelected ? 'ring-2 ring-opacity-50' : ''
      } ${article.is_read ? 'opacity-75' : ''}`}
      style={{
        borderColor: isSelected ? 'var(--color-accent-500)' : 'var(--color-bg-border)',
        boxShadow: isSelected 
          ? '0 8px 25px rgba(99, 102, 241, 0.15)' 
          : '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onToggleExpand();
      }}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start space-x-4 mb-4">
          {/* Selection Checkbox */}
          <div 
            className="mt-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleSelect();
            }}
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isSelected ? (
                <CheckCircle2 
                  className="h-5 w-5 text-accent-500" 
                  style={{ color: 'var(--color-accent-500)' }}
                />
              ) : (
                <Circle 
                  className="h-5 w-5 hover:text-accent-500 transition-colors" 
                  style={{ color: 'var(--color-text-muted)' }}
                />
              )}
            </motion.div>
          </div>

          {/* Article Content */}
          <div className="flex-1">
            {/* Title */}
            <h3 className="text-lg font-semibold mb-2 line-clamp-2 hover:text-accent-500 transition-colors">
              {article.title}
            </h3>

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 text-sm mb-3" 
                 style={{ color: 'var(--color-text-muted)' }}>
              {/* Source */}
              {article.source?.name && (
                <div className="flex items-center space-x-1">
                  <Rss className="h-3 w-3" />
                  <span>{article.source.name}</span>
                </div>
              )}

              {/* Author */}
              {article.author && (
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>{article.author}</span>
                </div>
              )}

              {/* Date */}
              {article.published_at && (
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(article.published_at)}</span>
                </div>
              )}

              {/* Reading Time */}
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{Math.ceil(article.content?.length / 1000) || 1} min read</span>
              </div>
            </div>

            {/* Summary */}
            {article.summary && (
              <p className="text-sm mb-4 line-clamp-2" 
                 style={{ color: 'var(--color-text-secondary)' }}>
                {article.summary}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t"
             style={{ borderColor: 'var(--color-bg-border)' }}>
          <div className="flex items-center space-x-2">
            {/* Read Status Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                article.is_read ? handleMarkAsUnread() : handleMarkAsRead();
              }}
              disabled={isMarkingRead || isMarkingUnread}
              className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-colors hover:bg-opacity-80"
              style={{
                backgroundColor: article.is_read 
                  ? 'var(--color-success-100)' 
                  : 'var(--color-warning-100)',
                color: article.is_read 
                  ? 'var(--color-success-700)' 
                  : 'var(--color-warning-700)'
              }}
            >
              {article.is_read ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              <span>{article.is_read ? 'Read' : 'Unread'}</span>
            </motion.button>

            {/* External Link */}
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href={article.article_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-colors hover:bg-opacity-80"
              style={{
                backgroundColor: 'var(--color-primary-100)',
                color: 'var(--color-primary-700)'
              }}
            >
              <ExternalLink className="h-3 w-3" />
              <span>Visit</span>
            </motion.a>
          </div>

          {/* Expand Toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-1 rounded-full hover:bg-opacity-20 transition-colors"
            style={{ backgroundColor: 'var(--color-bg-hover)' }}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
            ) : (
              <ChevronDown className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
            )}
          </motion.button>
        </div>

        {/* Expanded Content */}
        <motion.div
          initial={false}
          animate={{ 
            height: isExpanded ? 'auto' : 0,
            opacity: isExpanded ? 1 : 0
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          {isExpanded && (
            <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--color-bg-border)' }}>
              <div 
                className="prose prose-sm max-w-none"
                style={{ color: 'var(--color-text-secondary)' }}
                dangerouslySetInnerHTML={{ __html: article.content || 'No content available.' }}
              />
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ArticleCard;
