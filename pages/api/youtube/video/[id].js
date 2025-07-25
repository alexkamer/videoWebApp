import apiCache from '../../../../utils/apiCache';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ message: 'Video ID is required' });
    }
    
    // Generate cache key based on video ID
    const cacheKey = `youtube_video:${id}`;
    
    // Check if we have a cached response
    const cachedResponse = apiCache.get(cacheKey);
    if (cachedResponse) {
      console.log(`[Cache hit] YouTube video details: ${id}`);
      return res.status(200).json(cachedResponse);
    }
    
    console.log(`[Cache miss] YouTube video details: ${id}`);

    // Get API key from environment
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ message: 'YouTube API key not configured' });
    }

    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,topicDetails&id=${id}&key=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message || 'Failed to fetch video details');
    }

    const data = await response.json();
    
    // Cache the response before returning
    apiCache.set(cacheKey, data);
    
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('YouTube API Error:', error);
    return res.status(500).json({ 
      message: 'Error fetching video details', 
      error: error.message 
    });
  }
}