import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/Watch.module.css';
import Logo from '../../components/Logo';
import TranscriptViewer from '../../components/TranscriptViewer';
import AISummary from '../../components/AISummary';
import YouTubePlayer from '../../components/YouTubePlayer';

export default function WatchPage() {
  const router = useRouter();
  const { id } = router.query;
  const [videoDetails, setVideoDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMoreButton, setShowMoreButton] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [playerReady, setPlayerReady] = useState(false);
  const descriptionRef = useRef(null);

  useEffect(() => {
    if (!id) return;

    async function fetchVideoDetails() {
      try {
        const response = await fetch(`/api/youtube/video/${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch video details');
        }
        
        const data = await response.json();
        setVideoDetails(data.items && data.items[0] ? data.items[0] : null);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching video:', err);
        setError('Failed to load video details. Please try again.');
        setLoading(false);
      }
    }

    fetchVideoDetails();
  }, [id]);
  
  // Initialize YouTube iframe API
  // The player initialization is now handled by the YouTubePlayer component
  // This keeps the code clean and ensures consistent player behavior
  
  // Check if description needs a "Show more" button
  useEffect(() => {
    if (!videoDetails || !descriptionRef.current) return;
    
    // If the description is long enough, show the toggle button
    const description = videoDetails.snippet.description;
    
    // Check if description is long enough to need expansion
    // Either by character count or if there are multiple paragraphs
    const isLongDescription = description.length > 300 || description.split('\\n').length > 3;
    
    setShowMoreButton(isLongDescription);
  }, [videoDetails]);

  if (loading) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <Logo />
        </header>
        <div className={styles.loading}>Loading video...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <Logo />
        </header>
        <div className={styles.error}>{error}</div>
        <Link href="/" className={styles.backButton}>
          Back to Search
        </Link>
      </div>
    );
  }

  const videoTitle = videoDetails?.snippet?.title || 'Video';
  
  return (
    <div className={styles.container}>
      <Head>
        <title>{videoTitle} | Video Learning</title>
        <meta name="description" content={videoDetails?.snippet?.description || 'Watch this video'} />
      </Head>
      
      <header className={styles.header}>
        <Logo />
      </header>
      
      <main className={styles.main}>
        <div className={styles.videoContainer}>
          {id && (
            <iframe
              className={styles.videoPlayer}
              src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
              title={videoTitle}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          )}
        </div>
        
        {videoDetails && (
          <div className={styles.videoInfo}>
            <h1 className={styles.title}>{videoDetails.snippet.title}</h1>
            
            <div className={styles.meta}>
              <div className={styles.channel}>
                {videoDetails.snippet.channelTitle}
              </div>
              
              {videoDetails.statistics && (
                <div className={styles.stats}>
                  <span className={styles.views}>
                    {parseInt(videoDetails.statistics.viewCount).toLocaleString()} views
                  </span>
                  
                  {videoDetails.statistics.likeCount && (
                    <span className={styles.likes}>
                      {parseInt(videoDetails.statistics.likeCount).toLocaleString()} likes
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div 
              className={`${styles.description} ${isExpanded ? styles.expanded : styles.collapsed}`}
              ref={descriptionRef}
            >
              <div className={styles.descriptionContent}>
                {videoDetails.snippet.description.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              
              {showMoreButton && (
                <button 
                  className={styles.toggleButton}
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* AI Summary section - between description and transcript */}
        <div className={styles.summarySection}>
          <AISummary 
            videoId={id} 
            videoTitle={videoDetails?.snippet?.title || ''}
            transcript={transcript}
          />
        </div>
        
        {/* Transcript section */}
        <div className={styles.transcriptSection}>
          <TranscriptViewer 
            videoId={id} 
            onTranscriptLoaded={(transcriptData) => setTranscript(transcriptData)}
          />
        </div>
        
        <Link href="/results" className={styles.backButton}>
          Back to Results
        </Link>
      </main>
    </div>
  );
}