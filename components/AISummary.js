import { useState, useEffect } from 'react';
import styles from '../styles/AISummary.module.css';
import ReactMarkdown from 'react-markdown';

export default function AISummary({ videoId, videoTitle, transcript }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!videoId || !transcript || transcript.length === 0) {
      setLoading(false);
      setError('Missing required data for summary generation.');
      return;
    }

    async function generateSummary() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/youtube/summarize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcript,
            videoTitle,
            videoId
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to generate summary');
        }
        
        const data = await response.json();
        
        if (data.success && data.summary) {
          setSummary(data.summary);
        } else {
          throw new Error('Invalid summary data received');
        }
      } catch (err) {
        console.error('Error generating summary:', err);
        setError(err.message || 'Failed to generate summary');
      } finally {
        setLoading(false);
      }
    }
    
    generateSummary();
  }, [videoId, videoTitle, transcript]);
  
  // Render markdown summary
  const formattedSummary = summary ? (
    <div className={styles.markdown}>
      <ReactMarkdown>{summary}</ReactMarkdown>
    </div>
  ) : null;
  
  return (
    <div className={styles.container}>
      <div 
        className={styles.header} 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2>AI Summary</h2>
        <button className={styles.toggleButton}>
          {isExpanded ? 'Hide' : 'Show'}
        </button>
      </div>
      
      <div className={`${styles.content} ${isExpanded ? '' : styles.collapsed}`}>
        {loading ? (
          <div className={styles.loading}>
            Generating AI summary...
          </div>
        ) : error ? (
          <div className={styles.error}>
            {error}
          </div>
        ) : summary ? (
          <div className={styles.summary}>
            {formattedSummary}
          </div>
        ) : (
          <div className={styles.empty}>
            No summary available.
          </div>
        )}
      </div>
    </div>
  );
}