#!/usr/bin/env python3
"""
Transcript Summarization Script using Agno agents

This script uses Agno agents to summarize YouTube video transcripts.
It retrieves transcripts from the web app's API and uses Agno for summarization.
"""

import os
import sys
import json
import argparse
import requests
from agno.agent import Agent
from agno.models.azure.openai_chat import AzureOpenAI

def get_llm():
    """Initialize and return the Azure OpenAI model"""
    return AzureOpenAI(
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        azure_deployment="gpt-4-1"
    )

def fetch_transcript(video_id, api_base_url="http://localhost:3000"):
    """Fetch transcript from the web app's API"""
    url = f"{api_base_url}/api/youtube/transcript/{video_id}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        if data.get("success") and data.get("transcript"):
            return data["transcript"]
        else:
            raise Exception(f"Failed to fetch transcript: {data.get('message', 'Unknown error')}")
    
    except requests.RequestException as e:
        print(f"Error fetching transcript: {e}")
        return None

def fetch_video_details(video_id, api_base_url="http://localhost:3000"):
    """Fetch video details from the web app's API"""
    url = f"{api_base_url}/api/youtube/video/{video_id}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        if data.get("items") and len(data["items"]) > 0:
            return data["items"][0]
        else:
            raise Exception("No video details found")
    
    except requests.RequestException as e:
        print(f"Error fetching video details: {e}")
        return None

def clean_transcript_text(segments):
    """Clean transcript text by removing HTML tags and timestamps"""
    if not segments:
        return ""
    
    import re
    
    cleaned_texts = []
    for segment in segments:
        text = segment["text"]
        
        # Remove HTML-style timing tags like <00:00:11.200>
        text = re.sub(r'<\d{2}:\d{2}:\d{2}\.\d{3}>', '', text)
        
        # Remove style tags like <c>text</c>
        text = re.sub(r'</?[a-z][^>]*>', '', text)
        
        # Remove any leftover angle brackets and their contents
        text = re.sub(r'<[^>]*>', '', text)
        
        # Replace multiple spaces with a single space
        text = re.sub(r'\s+', ' ', text)
        
        cleaned_texts.append(text.strip())
    
    return " ".join(cleaned_texts)

def summarize_with_agno(transcript_text, video_title):
    """Use Agno agent to summarize the transcript"""
    if not transcript_text:
        return "No transcript available to summarize."
    
    # Initialize LLM
    llm = get_llm()
    
    # Create an Agno agent
    agent = Agent(
        name="TranscriptSummarizer",
        llm=llm,
        description="An agent that summarizes video transcripts"
    )
    
    # Create the prompt
    prompt = f"""
    You are tasked with creating a concise summary of the following video transcript.
    
    The video title is: "{video_title}"
    
    Based on the transcript, provide:
    1. A brief 2-3 sentence summary of what the video is about
    2. 3-5 key points or main takeaways from the content
    3. The overall tone or style of the video (educational, entertainment, tutorial, etc.)
    
    Format your response in clear, well-organized paragraphs.
    
    Here is the transcript:
    {transcript_text[:10000]}  # Limiting to first 10,000 chars to avoid token limits
    """
    
    # Get summary from agent
    response = agent.generate(prompt)
    return response

def main():
    """Main function to run the script"""
    parser = argparse.ArgumentParser(description="Summarize YouTube video transcripts using Agno")
    parser.add_argument("video_id", help="YouTube video ID")
    parser.add_argument("--api-url", default="http://localhost:3000", help="Base URL for the web app API")
    parser.add_argument("--output", help="Output file for summary (if not specified, print to console)")
    args = parser.parse_args()
    
    print(f"Fetching transcript for video: {args.video_id}")
    transcript = fetch_transcript(args.video_id, args.api_url)
    
    if not transcript:
        sys.exit(1)
    
    print("Fetching video details...")
    video_details = fetch_video_details(args.video_id, args.api_url)
    video_title = video_details.get("snippet", {}).get("title", "Untitled Video") if video_details else "Untitled Video"
    
    print(f"Processing transcript with {len(transcript)} segments")
    transcript_text = clean_transcript_text(transcript)
    
    print("Generating summary with Agno agent...")
    summary = summarize_with_agno(transcript_text, video_title)
    
    # Format the output
    result = {
        "video_id": args.video_id,
        "title": video_title,
        "summary": summary
    }
    
    # Output the result
    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2)
        print(f"Summary saved to {args.output}")
    else:
        print("\n" + "=" * 40 + "\n")
        print(f"Summary for: {video_title}\n")
        print(summary)
        print("\n" + "=" * 40)

if __name__ == "__main__":
    main()