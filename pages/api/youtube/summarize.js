import { summarizeTranscript } from '../../../utils/aiSummarizer';
import apiCache from '../../../utils/apiCache';
import rateLimiter from '../../../utils/rateLimiter';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check rate limits before proceeding
    const rateLimitKey = 'ai_summary';
    if (!rateLimiter.isAllowed(rateLimitKey, { maxRequests: 10, windowMs: 60 * 1000 })) {
      const resetTime = rateLimiter.timeUntilReset(rateLimitKey);
      const resetSeconds = Math.ceil(resetTime / 1000);
      
      return res.status(429).json({
        message: `Rate limit exceeded. Please try again in ${resetSeconds} seconds.`,
        resetIn: resetSeconds
      });
    }

    const { transcript, videoTitle, videoId } = req.body;
    
    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid transcript array is required' 
      });
    }
    
    // Generate cache key based on video ID
    const cacheKey = `ai_summary:${videoId}`;
    
    // Check if we have a cached response
    const cachedSummary = apiCache.get(cacheKey);
    if (cachedSummary) {
      console.log(`[Cache hit] AI Summary for video: ${videoId}`);
      return res.status(200).json({
        success: true,
        summary: cachedSummary
      });
    }
    
    console.log(`[Cache miss] Generating AI Summary for video: ${videoId}`);
    
    // Generate summary using Azure OpenAI
    const summary = await summarizeTranscript(transcript, videoTitle || 'Unknown Video Title');
    
    // Cache the summary
    if (summary && videoId) {
      apiCache.set(cacheKey, summary, 24 * 60 * 60 * 1000); // Cache for 24 hours
    }
    
    return res.status(200).json({
      success: true,
      summary
    });
    
  } catch (error) {
    console.error('AI Summary Error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error generating summary', 
      error: error.message 
    });
  }
}