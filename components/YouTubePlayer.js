import { useEffect, useRef, useState } from 'react';
import styles from '../styles/YouTubePlayer.module.css';

export default function YouTubePlayer({ videoId, onReady }) {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!videoId || typeof window === 'undefined') return;
    
    // Cleanup function for when component unmounts or videoId changes
    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error('Error destroying player:', e);
        }
        playerRef.current = null;
      }
    };
  }, [videoId]);
  
  useEffect(() => {
    if (!videoId || typeof window === 'undefined') return;
    
    // Function to safely check if YT API is ready
    const isYTApiReady = () => {
      return window.YT && window.YT.Player && typeof window.YT.Player === 'function';
    };
    
    // Handle player creation once API is ready
    const initializePlayer = () => {
      console.log('Initializing YouTube player...');
      // Check if element exists
      if (!containerRef.current) {
        console.error('Container ref is not available');
        return;
      }
      
      // Double check YT API is available
      if (!isYTApiReady()) {
        console.error('YT API not ready when initializing player');
        return;
      }
      
      // Clean up any previous instances
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }
      
      try {
        // Create player with iframe directly
        const iframe = document.createElement('iframe');
        iframe.id = `youtube-iframe-${videoId}`;
        iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&rel=0&modestbranding=1`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        
        // Clear container and append iframe
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        containerRef.current.appendChild(iframe);
        
        // Create player using the iframe
        playerRef.current = new window.YT.Player(iframe, {
          events: {
            onReady: handlePlayerReady,
            onStateChange: handlePlayerStateChange,
            onError: handlePlayerError
          }
        });
        
        // Set global reference for compatibility with existing code
        window.player = playerRef.current;
      } catch (error) {
        console.error('Error creating YouTube player:', error);
        setIsLoading(false);
        
        // Fallback: create basic iframe without API
        createFallbackIframe();
      }
    };
    
    // Fallback function when YT API fails
    const createFallbackIframe = () => {
      console.log('Creating fallback iframe...');
      if (!containerRef.current) return;
      
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      
      // Clear container and append iframe
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      containerRef.current.appendChild(iframe);
      
      // Mark as loaded
      setIsLoading(false);
      
      // Let parent component know
      if (typeof onReady === 'function') {
        onReady({seekTo: () => console.warn('Player API not available in fallback mode')});
      }
    };
    
    // Handle player events
    const handlePlayerReady = (event) => {
      console.log('YouTube player ready');
      setIsLoading(false);
      
      // Fire onReady callback if provided
      if (typeof onReady === 'function') {
        onReady(event.target);
      }
      
      // Dispatch event for backward compatibility
      window.dispatchEvent(new CustomEvent('youtubePlayerReady', { 
        detail: event.target 
      }));
    };
    
    const handlePlayerStateChange = (event) => {
      // Handle state changes if needed
    };
    
    const handlePlayerError = (event) => {
      console.error('YouTube player error:', event.data);
      setIsLoading(false);
      createFallbackIframe();
    };
    
    // Load YouTube API and initialize player
    const loadYouTubeAPI = () => {
      // If API is already available, initialize player directly
      if (isYTApiReady()) {
        initializePlayer();
        return;
      }
      
      // If script tag already exists but API isn't ready yet,
      // wait for onYouTubeIframeAPIReady to be called
      if (document.getElementById('youtube-api')) {
        const originalCallback = window.onYouTubeIframeAPIReady || function() {};
        window.onYouTubeIframeAPIReady = function() {
          originalCallback();
          initializePlayer();
        };
        return;
      }
      
      // Create script tag and set up callback
      const tag = document.createElement('script');
      tag.id = 'youtube-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      
      // Set up callback before adding script to DOM
      window.onYouTubeIframeAPIReady = function() {
        console.log('YouTube iframe API ready');
        // Small delay to ensure API is fully initialized
        setTimeout(initializePlayer, 100);
      };
      
      // Add script to page
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      
      // Set timeout to use fallback if API doesn't load
      setTimeout(() => {
        if (!isYTApiReady() && isLoading) {
          console.warn('YouTube API load timeout - using fallback');
          createFallbackIframe();
        }
      }, 5000);
    };
    
    // Start loading
    loadYouTubeAPI();
    
    // Cleanup function
    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error('Error destroying player:', e);
        }
      }
    };
  }, [videoId, onReady, isLoading]); // Added isLoading to dependencies to avoid eslint warning
  
  return (
    <div className={styles.container}>
      <div ref={containerRef} className={styles.player}></div>
      {isLoading && (
        <div className={styles.loading}>
          <span>Loading player...</span>
        </div>
      )}
    </div>
  );
}