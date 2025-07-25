import { useState, useEffect, useCallback } from 'react';
import styles from '../styles/DownloadModal.module.css';

export default function DownloadModal({ isOpen, onClose, videoId, videoTitle }) {
  const [formats, setFormats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [downloadInfo, setDownloadInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [downloadType, setDownloadType] = useState(null); // 'video' or 'audio'
  const [selectedQuality, setSelectedQuality] = useState(null); // 'best', '1080p', '720p', '480p'
  const [availableResolutions, setAvailableResolutions] = useState([]);
  const [customFilename, setCustomFilename] = useState(''); // For user-editable filename

  // Fetch available formats when modal opens
  useEffect(() => {
    if (isOpen && videoId) {
      fetchFormats();
      // Reset states when modal reopens
      setDownloadType(null);
      setSelectedQuality(null);
      setSelectedFormat(null);
      setDownloadInfo(null);
    }
  }, [isOpen, videoId]);
  
  // Auto-select best quality for audio when audio type is selected
  useEffect(() => {
    if (downloadType === 'audio' && !selectedQuality && !downloadInfo) {
      // Short timeout to ensure UI renders before selection
      const timer = setTimeout(() => {
        handleSelectQuality('best');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [downloadType, selectedQuality, downloadInfo]);

  // Determine available resolutions when formats are loaded
  useEffect(() => {
    if (formats && formats.length > 0) {
      console.log('Processing formats for resolutions:', formats);
      const resolutions = new Set();
      
      // Always include 'best' option
      resolutions.add('best');
      
      // Add standard resolution options
      resolutions.add('1080p');
      resolutions.add('720p');
      resolutions.add('480p');
      
      // Try to detect available resolutions from format data
      formats.forEach(format => {
        if (format.resolution && 
            (format.format_note?.includes('video') || 
             format.height || 
             format.width)) {
          try {
            let height = 0;
            if (format.height) {
              height = parseInt(format.height);
            } else if (format.resolution) {
              const parts = format.resolution.split('x');
              if (parts.length > 1) {
                height = parseInt(parts[1]);
              }
            }
            
            console.log(`Detected height: ${height} for format: ${format.format_code}`);
          } catch (err) {
            console.error('Error parsing resolution:', err);
          }
        }
      });
      
      // Sort resolutions
      const sortedResolutions = Array.from(resolutions).sort((a, b) => {
        if (a === 'best') return -1;
        if (b === 'best') return 1;
        return parseInt(b) - parseInt(a); // Sort by resolution, highest first
      });
      
      console.log('Available resolutions:', sortedResolutions);
      setAvailableResolutions(sortedResolutions);
    } else {
      // Default resolutions if no format data available
      setAvailableResolutions(['best', '1080p', '720p', '480p']);
      console.log('No formats found, using default resolutions');
    }
  }, [formats]);

  const fetchFormats = async () => {
    setLoading(true);
    setError(null);
    
    // Default to showing standard resolutions
    setAvailableResolutions(['best', '1080p', '720p', '480p']);

    try {
      const response = await fetch(`/api/youtube/download/formats?id=${videoId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch formats');
      }

      const data = await response.json();
      
      // Process formats
      if (data.formats && data.formats.length > 0) {
        console.log('Formats received:', data.formats);
        setFormats(data.formats);
      } else {
        // If formats parsing failed, show error
        console.error('Format parsing failed, raw output:', data.raw_output);
        // Don't set error - we'll use default resolutions
      }
    } catch (err) {
      console.error('Error fetching formats:', err);
      // Don't set error - we'll use default resolutions
    } finally {
      setLoading(false);
    }
  };

  const fetchDownloadInfo = useCallback(async (formatCode, qualityLabel = '') => {
    setInfoLoading(true);
    setDownloadInfo(null);
    setSelectedFormat(formatCode);
    
    try {
      const response = await fetch(`/api/youtube/download/info?id=${videoId}&format=${formatCode}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch download info');
      }
      
      const data = await response.json();
      
      // Extract base filename without extension for the editable field
      const baseFilename = data.cleanFilename ? data.cleanFilename.replace(/\.[^/.]+$/, '') : '';
      setCustomFilename(baseFilename);
      
      setDownloadInfo({
        ...data,
        qualityLabel: qualityLabel || data.format
      });
    } catch (err) {
      console.error('Error fetching download info:', err);
      setError(err.message || 'Failed to fetch download information');
    } finally {
      setInfoLoading(false);
    }
  }, [videoId]);
  
  const handleDownload = useCallback((e) => {
    e.preventDefault(); // Prevent default form submission
    if (!selectedFormat) return;
    
    // Get extension from original filename or determine based on type
    const extension = downloadType === 'audio' ? '.mp3' : '.mp4';
      
    // Create filename from user's input + correct extension
    const finalFilename = customFilename.replace(/\.[^/.]+$/, '') + extension;
    
    console.log(`[Client] Downloading with custom filename: ${finalFilename}`);
    
    // Create blob URL from user input for download
    const createDownloadLink = async () => {
      try {
        // Show loading state
        setInfoLoading(true);
        
        // Make fetch request to download API with custom filename
        const encodedFilename = encodeURIComponent(finalFilename);
        const url = `/api/youtube/download/${videoId}?format=${selectedFormat}&customFilename=${encodedFilename}`;
        console.log(`[Client] Requesting download with URL: ${url}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error('Download failed');
        
        // Get the blob data
        const blob = await response.blob();
        
        // Create blob URL
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = finalFilename; // This will be the saved filename
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(blobUrl);
          setInfoLoading(false);
          onClose();
        }, 100);
      } catch (err) {
        console.error('Download error:', err);
        setError('Download failed. Please try again.');
        setInfoLoading(false);
      }
    };
    
    // Execute the download function
    createDownloadLink();
  }, [videoId, selectedFormat, downloadType, customFilename, setInfoLoading, setError, onClose]);

  // We're no longer filtering formats
  const filteredFormats = formats;

  // Quick download options
  const handleSelectType = (type) => {
    setDownloadType(type);
    setSelectedQuality(null); // Reset quality selection when type changes
    setSelectedFormat(null); // Reset format selection when type changes
    setDownloadInfo(null); // Reset download info when type changes
  };
  
  const handleSelectQuality = (quality) => {
    setSelectedQuality(quality);
    
    // Set the format string based on the selected type and quality
    let formatString = '';
    let formatLabel = '';
    
    if (downloadType === 'audio') {
      // For audio, use MP3 format - will be converted using extract-audio
      formatString = 'audio:bestaudio';
      formatLabel = 'MP3 Audio';
    } else {
      // For video, set format based on quality and explicitly mark as video
      switch (quality) {
        case 'best':
          formatString = 'video:best[ext=mp4]/bestvideo+bestaudio';
          formatLabel = 'Best Quality';
          break;
        case '1080p':
          formatString = 'video:bestvideo[height<=1080][ext=mp4]+bestaudio/best[height<=1080][ext=mp4]';
          formatLabel = '1080p';
          break;
        case '720p':
          formatString = 'video:bestvideo[height<=720][ext=mp4]+bestaudio/best[height<=720][ext=mp4]';
          formatLabel = '720p';
          break;
        case '480p':
          formatString = 'video:bestvideo[height<=480][ext=mp4]+bestaudio/best[height<=480][ext=mp4]';
          formatLabel = '480p';
          break;
        default:
          formatString = 'video:best[ext=mp4]';
          formatLabel = 'Standard Quality';
      }
    }
    
    // Fetch download info for the selected format
    fetchDownloadInfo(formatString, formatLabel);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Download Options</h3>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        
        {!downloadType ? (
          // Step 1: Select Video or Audio
          <div className={styles.downloadTypeSelection}>
            <h4 className={styles.optionsTitle}>What would you like to download?</h4>
            <div className={styles.optionsRow}>
              <button 
                className={styles.typeButton} 
                onClick={() => handleSelectType('video')}
              >
                Video (.mp4)
              </button>
              <button 
                className={styles.typeButton} 
                onClick={() => handleSelectType('audio')}
              >
                Audio Only (.mp3)
              </button>
            </div>
          </div>
        ) : downloadType === 'video' && !selectedQuality ? (
          // Step 2A: Select Video Quality
          <div className={styles.qualitySelection}>
            <h4 className={styles.optionsTitle}>Select Video Quality:</h4>
            <div className={styles.optionsRow}>
              {/* Default quality options if none are detected from the API */}
              {availableResolutions.length > 0 ? (
                availableResolutions.map(resolution => (
                  <button 
                    key={resolution}
                    className={styles.qualityButton}
                    onClick={() => handleSelectQuality(resolution)}
                  >
                    {resolution === 'best' ? 'Best Quality' : resolution}
                  </button>
                ))
              ) : (
                // Show default options if no resolutions were detected
                <>
                  <button 
                    className={styles.qualityButton}
                    onClick={() => handleSelectQuality('best')}
                  >
                    Best Quality
                  </button>
                  <button 
                    className={styles.qualityButton}
                    onClick={() => handleSelectQuality('1080p')}
                  >
                    1080p
                  </button>
                  <button 
                    className={styles.qualityButton}
                    onClick={() => handleSelectQuality('720p')}
                  >
                    720p
                  </button>
                  <button 
                    className={styles.qualityButton}
                    onClick={() => handleSelectQuality('480p')}
                  >
                    480p
                  </button>
                </>
              )}
            </div>
            <button 
              className={styles.backButton} 
              onClick={() => setDownloadType(null)}
            >
              ← Back
            </button>
          </div>
        ) : downloadType === 'audio' && !selectedQuality ? (
          // Step 2B: For Audio, immediately select default quality
          <div className={styles.audioConfirmation}>
            <div className={styles.loading}>Preparing audio download...</div>
          </div>
        ) : null}


        <div className={styles.content}>
          {downloadInfo ? (
            <div className={styles.downloadInfoContainer}>
              <h4 className={styles.downloadTitle}>Ready to download:</h4>
              <div className={styles.downloadInfo}>
                <div className={styles.filenameEdit}>
                  <label htmlFor="customFilename"><strong>Filename:</strong></label>
                  <div className={styles.filenameInputWrapper}>
                    <input 
                      type="text" 
                      id="customFilename"
                      className={styles.filenameInput}
                      value={customFilename} 
                      onChange={(e) => setCustomFilename(e.target.value)}
                    />
                    <span className={styles.extension}>
                      {downloadType === 'audio' ? '.mp3' : '.mp4'}
                    </span>
                  </div>
                </div>
                <p><strong>Quality:</strong> {downloadInfo.qualityLabel || downloadInfo.format}</p>
                <p><strong>Estimated Size:</strong> {downloadInfo.estimated_size}</p>
              </div>
              <div className={styles.downloadActions}>
                <form onSubmit={handleDownload}>
                  <button 
                    type="submit"
                    className={`${styles.downloadButton} ${styles.downloadNowButton}`}
                  >
                    Download Now
                  </button>
                </form>
                <button 
                  className={styles.backButton} 
                  onClick={() => {
                    setSelectedFormat(null);
                    setDownloadInfo(null);
                    // Return to type selection
                    setSelectedQuality(null);
                    setDownloadType(null);
                  }}
                >
                  ← Back
                </button>
              </div>
            </div>
          ) : infoLoading ? (
            <div className={styles.loading}>Preparing download...</div>
          ) : loading ? (
            <div className={styles.loading}>Loading available formats...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : (
            <div className={styles.formatListContainer}>
              <button 
                className={styles.backButton}
                onClick={() => setDownloadType(null)}
              >
                ← Back
              </button>
              
              <h4 className={styles.formatListHeader}>Available Formats:</h4>
              
              <ul className={styles.formatList}>
                {filteredFormats.map((format, index) => (
                  <li key={index} className={styles.formatItem}>
                    <div className={styles.formatInfo}>
                      <span className={styles.formatCode}>Format {format.format_code}</span>
                      <span className={styles.formatDetails}>
                        {format.format_note} • {format.extension} • {format.resolution} • {format.filesize}
                      </span>
                    </div>
                    <button 
                      className={styles.downloadButton}
                      onClick={() => fetchDownloadInfo(format.format_code)}
                    >
                      Select
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className={styles.footer}>
          <p className={styles.disclaimer}>
            For personal use only. Please respect copyright laws.
            {error && error.includes('ffmpeg not found') && (
              <span className={styles.error}>Note: ffmpeg is not installed. Install ffmpeg for better format support.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}