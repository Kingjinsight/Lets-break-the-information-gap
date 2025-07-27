import google.genai as genai
from app.config import settings

client = genai.Client(api_key=settings.google_api_key)

def create_script_prompt(articles: list) -> str:
    """Creates a detailed prompt for the AI scriptwriter."""
    article_content = ""
    for i, article in enumerate(articles):
        if hasattr(article, 'title'):
            title = article.title
            content = article.content
        else:
            title = article['title']
            content = article['content']
        article_content += f"Article {i+1} Title: {title}\n"
        article_content += f"Article {i+1} Content: {content}\n\n"
    prompt = f"""
    You are an expert podcast scriptwriter. Your task is to transform the following articles into a natural and engaging two-person dialogue script between a host, "Joe", and an expert guest, "Jane".

    - The script must be a concise summary of the articles' key points.
    - Start with a brief introduction from Joe.
    - The entire output must be only the script itself, following this format exactly:
      Joe: [Joe's dialogue]
      Jane: [Jane's dialogue]

    Here are the articles to transform:
    ---
    {article_content}
    ---
    Script:
    """
    return prompt

def generate_script_from_articles(articles: list) -> str:
    """Generates a podcast script from a list of articles."""
    print("Generating podcast script...")
    prompt = create_script_prompt(articles)
    response = client.models.generate_content(
        model=settings.text_model_name,
        contents=[prompt]
    )
    print("Script generated successfully.")
    return response.text