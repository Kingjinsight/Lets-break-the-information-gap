import re
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse, parse_qs

class SocialMediaRSSHelper:
    """
    Helper service for working with social media RSS sources
    Leverages RSSHub's comprehensive social media coverage
    """
    
    RSSHUB_LOCAL = "http://localhost:1200"
    RSSHUB_PUBLIC = "https://rsshub.app"
    
    @classmethod
    def get_rsshub_base(cls, use_local: bool = True) -> str:
        """Get RSSHub base URL, preferring local instance"""
        return cls.RSSHUB_LOCAL if use_local else cls.RSSHUB_PUBLIC
    
    RSSHUB_BASE = RSSHUB_LOCAL
    
    PLATFORM_PATTERNS = {
        'instagram': r'instagram\.com/([^/]+)',
        'youtube': r'youtube\.com/(?:channel/|c/|@)?([^/]+)',
        'github': r'github\.com/([^/]+)',
        'twitter': r'twitter\.com/([^/]+)',
        'x': r'x\.com/([^/]+)',
        'tiktok': r'tiktok\.com/@([^/]+)',
        'bilibili': r'bilibili\.com/video/([^/]+)',
        'weibo': r'weibo\.com/u/([^/]+)',
        'zhihu': r'zhihu\.com/people/([^/]+)',
        'pixiv': r'pixiv\.net/users/([^/]+)',
        'reddit': r'reddit\.com/r/([^/]+)',
    }
    
    @classmethod
    def detect_platform(cls, url: str) -> Optional[str]:
        """
        Detect social media platform from URL
        """
        for platform, pattern in cls.PLATFORM_PATTERNS.items():
            if re.search(pattern, url.lower()):
                return platform
        return None
    
    @classmethod
    def extract_username(cls, url: str, platform: str) -> Optional[str]:
        """
        Extract username/identifier from social media URL
        """
        pattern = cls.PLATFORM_PATTERNS.get(platform)
        if not pattern:
            return None
            
        match = re.search(pattern, url.lower())
        return match.group(1) if match else None
    
    @classmethod
    def generate_rsshub_routes(cls, platform: str, username: str) -> List[Dict[str, str]]:
        """
        Generate possible RSSHub routes for a platform and username
        Returns list of route options with descriptions
        """
        routes = []
        base = cls.RSSHUB_BASE
        
        if platform == 'instagram':
            routes = [
                {
                    'url': f"{base}/instagram/user/{username}",
                    'title': f"@{username} - Instagram Posts",
                    'description': "Recent posts from user's profile"
                }
            ]
        
        elif platform in ['twitter', 'x']:
            routes = [
                {
                    'url': f"{base}/twitter/user/{username}",
                    'title': f"@{username} - Twitter/X Posts",
                    'description': "User timeline tweets"
                },
                {
                    'url': f"{base}/twitter/user/{username}/media",
                    'title': f"@{username} - Twitter/X Media",
                    'description': "Media posts only"
                }
            ]
        
        elif platform == 'youtube':
            # Handle different YouTube URL formats
            if username.startswith('UC') and len(username) == 24:
                # Channel ID format
                routes = [
                    {
                        'url': f"{base}/youtube/channel/{username}",
                        'title': f"{username} - YouTube Channel",
                        'description': "Latest videos from channel"
                    }
                ]
            else:
                # Username or custom URL
                routes = [
                    {
                        'url': f"{base}/youtube/user/{username}",
                        'title': f"{username} - YouTube Channel",
                        'description': "Latest videos from channel"
                    }
                ]
        
        elif platform == 'github':
            routes = [
                {
                    'url': f"{base}/github/user/repo/{username}",
                    'title': f"{username} - GitHub Repositories",
                    'description': "New repositories and updates"
                },
                {
                    'url': f"{base}/github/user/followers/{username}",
                    'title': f"{username} - GitHub Followers",
                    'description': "New followers"
                }
            ]
        
        elif platform == 'tiktok':
            routes = [
                {
                    'url': f"{base}/tiktok/user/{username}",
                    'title': f"@{username} - TikTok Posts",
                    'description': "Recent TikTok videos"
                }
            ]
        
        elif platform == 'bilibili':
            routes = [
                {
                    'url': f"{base}/bilibili/user/video/{username}",
                    'title': f"{username} - Bilibili Videos",
                    'description': "Latest videos from user"
                },
                {
                    'url': f"{base}/bilibili/user/dynamic/{username}",
                    'title': f"{username} - Bilibili Dynamics",
                    'description': "User dynamics and updates"
                }
            ]
        
        elif platform == 'weibo':
            routes = [
                {
                    'url': f"{base}/weibo/user/{username}",
                    'title': f"{username} - Weibo Posts",
                    'description': "Recent Weibo posts"
                }
            ]
        
        elif platform == 'zhihu':
            routes = [
                {
                    'url': f"{base}/zhihu/people/activities/{username}",
                    'title': f"{username} - Zhihu Activities",
                    'description': "User activities and posts"
                },
                {
                    'url': f"{base}/zhihu/people/answers/{username}",
                    'title': f"{username} - Zhihu Answers",
                    'description': "User answers to questions"
                }
            ]
        
        elif platform == 'pixiv':
            routes = [
                {
                    'url': f"{base}/pixiv/user/{username}",
                    'title': f"{username} - Pixiv Artworks",
                    'description': "Latest artworks from user"
                }
            ]
        
        elif platform == 'reddit':
            routes = [
                {
                    'url': f"{base}/reddit/r/{username}",
                    'title': f"r/{username} - Reddit",
                    'description': "Latest posts from subreddit"
                }
            ]
        
        return routes
    
    @classmethod
    def suggest_rss_sources(cls, url: str) -> List[Dict[str, str]]:
        """
        Given a social media URL, suggest possible RSS feeds
        """
        platform = cls.detect_platform(url)
        if not platform:
            return []
        
        username = cls.extract_username(url, platform)
        if not username:
            return []
        
        return cls.generate_rsshub_routes(platform, username)
    
    @classmethod
    def validate_social_url(cls, url: str) -> Dict:
        """
        Validate and analyze a social media URL
        """
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return {
                    'valid': False,
                    'error': 'Invalid URL format',
                    'suggestions': []
                }
            
            platform = cls.detect_platform(url)
            if not platform:
                return {
                    'valid': False,
                    'error': 'Unsupported social media platform',
                    'suggestions': []
                }
            
            username = cls.extract_username(url, platform)
            if not username:
                return {
                    'valid': False,
                    'error': 'Could not extract username/identifier',
                    'suggestions': []
                }
            
            suggestions = cls.generate_rsshub_routes(platform, username)
            
            return {
                'valid': True,
                'platform': platform,
                'username': username,
                'suggestions': suggestions
            }
        
        except Exception as e:
            return {
                'valid': False,
                'error': f'URL parsing failed: {str(e)}',
                'suggestions': []
            }
    
    @classmethod
    def get_platform_info(cls) -> Dict:
        """
        Get information about supported platforms
        """
        return {
            'instagram': {
                'name': 'Instagram',
                'description': 'User posts and tagged content',
                'routes': ['user posts', 'tagged posts'],
                'example_url': 'https://instagram.com/username'
            },
            'twitter': {
                'name': 'Twitter/X',
                'description': 'Tweets, media, and timeline',
                'routes': ['timeline', 'media only', 'likes', 'lists'],
                'example_url': 'https://twitter.com/username'
            },
            'youtube': {
                'name': 'YouTube',
                'description': 'Channel videos and playlists',
                'routes': ['channel videos', 'playlists', 'community posts'],
                'example_url': 'https://youtube.com/channel/UC...'
            },
            'github': {
                'name': 'GitHub',
                'description': 'Repositories, releases, and activity',
                'routes': ['repositories', 'releases', 'followers', 'starred'],
                'example_url': 'https://github.com/username'
            },
            'tiktok': {
                'name': 'TikTok',
                'description': 'User videos and posts',
                'routes': ['user videos'],
                'example_url': 'https://tiktok.com/@username'
            },
            'bilibili': {
                'name': 'Bilibili',
                'description': 'Videos and user dynamics',
                'routes': ['videos', 'dynamics', 'bangumi'],
                'example_url': 'https://bilibili.com/video/...'
            },
            'weibo': {
                'name': 'Weibo',
                'description': 'Chinese microblogging platform',
                'routes': ['user posts', 'hot topics', 'search'],
                'example_url': 'https://weibo.com/u/...'
            },
            'zhihu': {
                'name': 'Zhihu',
                'description': 'Chinese Q&A platform',
                'routes': ['activities', 'answers', 'articles'],
                'example_url': 'https://zhihu.com/people/username'
            },
            'pixiv': {
                'name': 'Pixiv',
                'description': 'Artwork sharing platform',
                'routes': ['user artworks', 'rankings', 'bookmarks'],
                'example_url': 'https://pixiv.net/users/...'
            },
            'reddit': {
                'name': 'Reddit',
                'description': 'Discussion forums and communities',
                'routes': ['subreddit posts', 'user posts'],
                'example_url': 'https://reddit.com/r/subreddit'
            }
        }
