import google.genai as genai
from app.config import settings
from datetime import datetime

def create_script_prompt(articles: list) -> str:
    """Creates a morning news podcast script with source attribution."""
    
    # Get today's date and time
    today = datetime.now().strftime("%B %d, %Y")
    current_hour = datetime.now().hour
    
    # Adjust greeting based on time
    if 5 <= current_hour < 12:
        time_greeting = "Good morning"
        time_context = "as you start your day"
    elif 12 <= current_hour < 17:
        time_greeting = "Good afternoon" 
        time_context = "during your day"
    elif 17 <= current_hour < 21:
        time_greeting = "Good evening"
        time_context = "as you wrap up your day"
    else:
        time_greeting = "Hello"
        time_context = "wherever you are"
    
    # Build article content with author and source information
    article_content = ""
    for i, article in enumerate(articles):
        if hasattr(article, 'title'):
            title = article.title
            content = article.content
            author = getattr(article, 'author', 'Unknown Author')
            source_url = getattr(article, 'article_url', '')
            # Extract source name from URL
            source_name = extract_source_name(source_url) if source_url else 'Unknown Source'
        else:
            title = article.get('title', 'Untitled')
            content = article.get('content', '')
            author = article.get('author', 'Unknown Author')
            source_url = article.get('article_url', '')
            source_name = extract_source_name(source_url) if source_url else 'Unknown Source'
        
        article_content += f"""📰 Story {i+1}: {title}
Author: {author}
Source: {source_name}
Content: {content}

"""
    
    prompt = f"""
You are a professional scriptwriter for "Daily Briefing" - a personalized morning news podcast. Create an engaging dialogue between two hosts:

🎙️ **Joe** - The main host (warm, energetic morning voice, relatable)
🎙️ **Jane** - The news analyst (knowledgeable, provides context and insights)

**Today's Date**: {today}
**Target Audience**: Busy people getting ready for work/school, commuting, or starting their day

**Podcast Purpose**: 
- Help listeners catch up on what happened in the world overnight/recently
- Provide personalized news from their chosen RSS sources
- Perfect for listening during morning routine, commute, or coffee break
- Keep them informed without overwhelming them

**Style Guidelines**:
- Length: The script should have 800 - 1200 words 
- Time: The podcast should play in 8 to 12 minutes.
- If the number of articles exceed 50, try to catch interesting topic among articles, and keep the numbr of articles that used to generate podcast below 50. 
- {time_greeting} energy - warm and welcoming
- Acknowledge this is their personal news briefing from their RSS feeds
- Mention article authors and sources naturally (e.g., "According to Sarah Johnson from TechCrunch...")
- Reference timing: "while you were sleeping", "overnight", "this morning", "breaking news"
- Keep it conversational but informative
- Perfect length for a commute or morning routine (10-20 minutes)
- Include natural reactions: "That's fascinating", "This is important", etc.

**Format Requirements**:
- Start with: "Joe: {time_greeting}, and welcome to your Daily Briefing for {today}..."
- Use ONLY dialogue format:
  Joe: [Joe's words]
  Jane: [Jane's words]
- NO stage directions, NO descriptions, ONLY spoken dialogue
- Naturally mention authors and sources in conversation
- End with encouraging sign-off for the day ahead

**Today's Personalized News** (from user's RSS sources):
---
{article_content}
---

Create a personalized morning news podcast script that makes listeners feel informed and ready for their day:
"""
    return prompt

def extract_source_name(url: str) -> str:
    """Extract readable source name from URL."""
    if not url:
        return "Unknown Source"
    
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
     
        if domain.startswith('www.'):
            domain = domain[4:]
        
        source_mapping = {
            'techcrunch.com': 'TechCrunch',
            'arstechnica.com': 'Ars Technica',
            'theverge.com': 'The Verge',
            'reuters.com': 'Reuters',
            'bbc.com': 'BBC News',
            'cnn.com': 'CNN',
            'nytimes.com': 'New York Times',
            'washingtonpost.com': 'Washington Post',
            'github.com': 'GitHub',
            'medium.com': 'Medium',
            'dev.to': 'Dev.to',
            'hackernews.ycombinator.com': 'Hacker News',
            'news.ycombinator.com': 'Hacker News'
        }
        
        if domain in source_mapping:
            return source_mapping[domain]
        
        clean_name = domain.replace('.com', '').replace('.org', '').replace('.net', '')
        return clean_name.replace('.', ' ').title()
        
    except Exception:
        return "Unknown Source"

def generate_script_from_articles(articles: list, api_key: str = None) -> str:
    """Generates a personalized morning news podcast script."""
    print(f"🌅 Generating personalized morning briefing for {len(articles)} stories...")
    
    prompt = create_script_prompt(articles)
    
    # Use user's API key if provided, otherwise fall back to system default
    google_api_key = api_key or settings.google_api_key
    client = genai.Client(api_key=google_api_key)
    
    try:
        response = client.models.generate_content(
            model=settings.text_model_name,
            contents=[prompt]
        )
        
        script = response.text.strip()
        
        if not script.startswith("Joe:"):
            print("⚠️ Adjusting script format...")
            current_hour = datetime.now().hour
            greeting = "Good morning" if 5 <= current_hour < 12 else "Hello"
            today = datetime.now().strftime("%B %d, %Y")
            script = f"Joe: {greeting}, and welcome to your Daily Briefing for {today}.\n\n" + script
        
        print(f"✅ Morning briefing script generated: {len(script)} characters")
        print(f"📊 Stories covered: {len(articles)}")
        
        return script
        
    except Exception as e:
        print(f"❌ Script generation failed: {e}")
        return create_fallback_morning_script(articles)

def create_fallback_morning_script(articles: list) -> str:
    """Creates a fallback morning news script."""
    today = datetime.now().strftime("%B %d, %Y")
    current_hour = datetime.now().hour
    greeting = "Good morning" if 5 <= current_hour < 12 else "Hello"
    
    script = f"""Joe: {greeting}, and welcome to your Daily Briefing for {today}. I'm Joe, and I'm here with Jane to bring you the latest from your personalized news sources.

Jane: That's right, Joe. We've gathered {len(articles)} stories from your RSS feeds to keep you informed as you start your day.

"""
    
    for i, article in enumerate(articles):
        if isinstance(article, dict):
            title = article.get('title', 'Breaking News')
            author = article.get('author', 'Staff Reporter')
            source_url = article.get('article_url', '')
        else:
            title = getattr(article, 'title', 'Breaking News')
            author = getattr(article, 'author', 'Staff Reporter')
            source_url = getattr(article, 'article_url', '')
        
        source_name = extract_source_name(source_url)
        
        script += f"""Joe: Let's dive into story number {i+1} - {title}.

Jane: This comes to us from {author} at {source_name}. Here's what you need to know...

"""
    
    script += f"""Joe: That's your briefing for this {greeting.lower()}. Stay informed, stay curious.

Jane: Have a great day ahead, and we'll catch you tomorrow with more news from your sources.

Joe: This has been your Daily Briefing. Take care!"""
    
    return script