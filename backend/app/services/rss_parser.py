import feedparser
from bs4 import BeautifulSoup
from typing import List, Dict
from datetime import datetime
import time
import httpx

async def fetch_rss_feed(feed_url: str) -> List[Dict]:
    """
    Fetches and parses an RSS feed, returning a list of article dictionaries.
    """
    articles = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(feed_url, follow_redirects=True, timeout=15.0)
            response.raise_for_status()

        feed = feedparser.parse(response.text)
        print(f"📰 RSS parsing result: {len(feed.entries)} articles")

        for entry in feed.entries:
            # Improved time parsing
            published_date = parse_publish_date(entry)
            
            # Clean content
            content = entry.get("summary", entry.get("description", "No content available."))
            content = clean_html_content(content)
            
            article_data = {
                "title": entry.title,
                "article_url": entry.link,
                "content": content,
                "author": entry.get('author', 'Unknown Author'),
                "published_date": published_date,
                "fetched_at": datetime.now()
            }
            
            articles.append(article_data)
            
    except httpx.HTTPStatusError as e:
        print(f"❌ HTTP error fetching feed {feed_url}: {e}")
    except Exception as e:
        print(f"❌ An error occurred while processing feed {feed_url}: {e}")
    
    print(f"✅ Successfully parsed {len(articles)} articles")
    return articles

def parse_publish_date(entry) -> datetime:
    """Parse article publish time - Fix timezone issues"""
    # Try multiple time formats
    date_fields = ['published_parsed', 'updated_parsed']
    
    for field in date_fields:
        if hasattr(entry, field) and getattr(entry, field):
            time_struct = getattr(entry, field)
            try:
                # Create timezone-free datetime
                parsed_date = datetime.fromtimestamp(time.mktime(time_struct))
                print(f"📅 Parsed publish time: {parsed_date.strftime('%Y-%m-%d %H:%M:%S')}")
                return parsed_date
            except:
                continue
    
    # Try string formats
    date_strings = ['published', 'updated']
    for field in date_strings:
        if hasattr(entry, field) and getattr(entry, field):
            try:
                from email.utils import parsedate_to_datetime
                parsed_date = parsedate_to_datetime(getattr(entry, field))
                # Remove timezone info
                if parsed_date and parsed_date.tzinfo is not None:
                    parsed_date = parsed_date.replace(tzinfo=None)
                print(f"📅 Parsed time from string: {parsed_date.strftime('%Y-%m-%d %H:%M:%S')}")
                return parsed_date
            except Exception as e:
                print(f"⚠️ Time parsing failed: {str(e)}")
                continue
    
    # If all fail, return current time
    print(f"⚠️ Unable to parse publish time, using current time")
    return datetime.now()


def clean_html_content(content: str) -> str:
    """Clean HTML tags and limit length"""
    if not content:
        return "No content available."
    
    # Remove HTML tags
    try:
        soup = BeautifulSoup(content, 'html.parser')
        clean_text = soup.get_text()
    except:
        # Fallback: simple regex cleanup
        import re
        clean_text = re.sub(r'<[^>]+>', '', content)
    
    # Clean extra whitespace
    clean_text = ' '.join(clean_text.split())
    
    # Limit length
    if len(clean_text) > 1000:
        clean_text = clean_text[:1000] + "..."
    
    return clean_text