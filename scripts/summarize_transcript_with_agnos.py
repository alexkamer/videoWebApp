import sys
import json
import os
from pathlib import Path

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    # Try to load from .env and .env.local in the project root
    env_path = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) / '.env.local'
    load_dotenv(env_path)
    # Silent loading
except ImportError:
    pass  # Silent failure if dotenv not installed
except Exception as e:
    pass  # Silent failure

# Import necessary modules or use fallback if not available
# Import required dependencies silently
try:
    from agno.agent import Agent
    import openai
    USING_AGNO = True
except ImportError as e:
    USING_AGNO = False

# Use custom OpenAI client instead of Agno's Azure OpenAI
if USING_AGNO:
    try:
        from openai import AzureOpenAI
    except ImportError as e:
        USING_AGNO = False

# Check environment variables silently
for env_var in ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_API_VERSION", "AZURE_OPENAI_ENDPOINT"]:
    if not os.environ.get(env_var):
        USING_AGNO = False  # Disable if any required env var is missing


# Initialize client and summarization function
llm = None

if USING_AGNO:
    try:
        # Get API key from environment
        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        deployment = "gpt-4-1"
        
        if not api_key:
            USING_AGNO = False
        else:            
            # Create OpenAI client directly
            client = AzureOpenAI(
                api_key=api_key,
                api_version=api_version,
                azure_endpoint=endpoint
            )
            
            # Simple summarization function using OpenAI directly
            def summarize_with_openai(text):
                response = client.chat.completions.create(
                    model=deployment,
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that summarizes video transcripts."},
                        {"role": "user", "content": f"Please summarize this transcript: {text[:4000]}..."}
                    ],
                    temperature=0.3,
                    max_tokens=500
                )
                return response.choices[0].message.content
            
            # Store the function for later use
            llm = summarize_with_openai
    except Exception as e:
        USING_AGNO = False



def load_transcript(path):
    """Load transcript from a JSON file (list of dicts with 'text' fields)."""
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def agno_summarize(transcript, video_title=None):
    """
    Summarize transcript using OpenAI or fallback to basic summarization.
    """
    # Extract all text from transcript segments
    if isinstance(transcript, list):
        # If transcript is a list of segments
        transcript_text = ' '.join([seg.get('text', '') for seg in transcript if 'text' in seg])
    else:
        # If transcript is already a string
        transcript_text = transcript
        
    # Clean the transcript text
    import re
    transcript_text = re.sub(r'<[^>]+>', '', transcript_text)  # Remove HTML tags
    transcript_text = re.sub(r'\s+', ' ', transcript_text).strip()  # Normalize whitespace
    
    # Use OpenAI if available
    if USING_AGNO and llm is not None:
        try:
            # Prepare prompt with title if available
            prompt = f"Please summarize this video transcript"
            if video_title:
                prompt += f" for the video titled: '{video_title}'"
                
            prompt += ". Focus on the main topics and key points.\n\n"
            prompt += transcript_text[:4000]  # Limit length to avoid token limits
            
            # Call OpenAI directly
            return llm(prompt)
        except Exception as e:
            # Continue to fallback silently
            pass
    
    # Fallback: basic summarization
    return fallback_summarize(transcript_text, video_title)


def fallback_summarize(text, title=None):
    """
    Basic fallback summarization when Agno is not available
    """
    # Clean the text
    import re
    text = re.sub(r'<[^>]+>', '', text)  # Remove HTML tags
    text = re.sub(r'\s+', ' ', text).strip()  # Normalize whitespace
    
    # Get a sample from beginning, middle and end
    words = text.split()
    total_words = len(words)
    
    if total_words < 50:
        return f"This video has very little spoken content. The transcript contains only {total_words} words."
    
    # Get samples from beginning, middle and end
    beginning = ' '.join(words[:100])
    middle_start = max(0, total_words // 2 - 50)
    middle = ' '.join(words[middle_start:middle_start + 100])
    end_start = max(0, total_words - 100)
    end = ' '.join(words[end_start:])
    
    title_text = f"Video: {title}\n\n" if title else ""
    
    return f"""{title_text}This is a basic summary as the AI summarization service is unavailable.

The video contains approximately {total_words} words of spoken content.

Beginning excerpt: {beginning}...

Middle excerpt: {middle}...

Ending excerpt: {end}...
"""


def main():
    if len(sys.argv) < 2:
        print("Usage: python summarize_transcript_with_agnos.py <transcript.json> [video_title]")
        sys.exit(1)
    transcript_path = sys.argv[1]
    video_title = sys.argv[2] if len(sys.argv) > 2 else None
    transcript = load_transcript(transcript_path)
    summary = agno_summarize(transcript, video_title)
    print(summary)

if __name__ == "__main__":
    main() 