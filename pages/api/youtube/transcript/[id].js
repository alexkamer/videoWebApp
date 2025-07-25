import { fetchTranscript } from '../../../../utils/transcriptFetcher';
import apiCache from '../../../../utils/apiCache';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ message: 'Video ID is required' });
  }
  
  try {
    // Generate cache key based on video ID
    const cacheKey = `youtube_transcript:${id}`;
    
    // Check if we have a cached response
    const cachedTranscript = apiCache.get(cacheKey);
    if (cachedTranscript) {
      console.log(`[Cache hit] YouTube transcript: ${id}`);
      return res.status(200).json({
        success: true,
        transcript: cachedTranscript
      });
    }
    
    console.log(`[Cache miss] YouTube transcript: ${id}`);
    
    const transcript = await fetchTranscript(id);
    
    // Cache the response before returning
    apiCache.set(cacheKey, transcript);
    
    return res.status(200).json({
      success: true,
      transcript
    });
  } catch (error) {
    console.error('Transcript fetch error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch transcript',
      error: error.message
    });
  }
}