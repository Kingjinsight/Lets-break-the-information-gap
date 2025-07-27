import httpx
import feedparser
from bs4 import BeautifulSoup
from typing import List, Dict

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

        for entry in feed.entries:
            articles.append({
                "title": entry.title,
                "article_url": entry.link,
                "content": entry.get("summary", "No summary available.")
            })
    except httpx.HTTPStatusError as e:
        print(f"HTTP error fetching feed {feed_url}: {e}")
    except Exception as e:
        print(f"An error occurred while processing feed {feed_url}: {e}")
    
    return articles