import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../styles/Results.module.css';
import ContentTypeFilter, { CONTENT_TYPES } from '../components/ContentTypeFilter';
import SearchBar from '../components/SearchBar';
import VideoCard from '../components/VideoCard';
import Logo from '../components/Logo';
import Pagination from '../components/Pagination';
import { paginateItems } from '../utils/clientPagination';

export default function ResultsPage() {
  const router = useRouter();
  const { search_query, page, content_type } = router.query;
  
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [contentType, setContentType] = useState(CONTENT_TYPES.ALL);
  const [allVideos, setAllVideos] = useState([]);
  const [paginationInfo, setPaginationInfo] = useState({
    pageInfo: { totalResults: 0, resultsPerPage: 10, totalPages: 0 },
    currentPage: 1,
    hasNextPage: false,
    hasPrevPage: false
  });


  // Determine current page from URL or default to 1
  useEffect(() => {
    const pageNum = page ? parseInt(page) : 1;
    setCurrentPage(pageNum);
  }, [page]);
  
  // Set content type from URL or default to ALL
  useEffect(() => {
    if (content_type && Object.values(CONTENT_TYPES).includes(content_type)) {
      setContentType(content_type);
    } else {
      setContentType(CONTENT_TYPES.ALL);
    }
  }, [content_type]);

  
  // Apply client-side filtering based on content type
  useEffect(() => {
    if (!videos.length) {
      setFilteredVideos([]);
      return;
    }
    
    // Apply client-side filtering for short vs regular videos
    if (contentType === CONTENT_TYPES.SHORT) {
      // For videos marked as shorts (duration <= 60 seconds)
      setFilteredVideos(videos.filter(video => video.isShort === true));
    } else if (contentType === CONTENT_TYPES.VIDEO) {
      // For regular videos (duration > 60 seconds)
      setFilteredVideos(videos.filter(video => video.isShort === false));
    } else {
      // For "All" content type, show everything
      setFilteredVideos(videos);
    }
  }, [videos, contentType]);

  // Perform search when query or content type changes
  useEffect(() => {
    if (!search_query) return;
    
    // Reset to page 1 when doing a new search
    performSearch(search_query, contentType);
  }, [search_query, contentType]);
  
  // Apply pagination when page or filtered videos change
  useEffect(() => {
    if (videos.length > 0) {
      // Apply client-side pagination to the videos
      const pageSize = 10; // Number of videos per page
      const paginatedData = paginateItems(videos, currentPage, pageSize);
      
      setAllVideos(videos); // Store all videos
      setFilteredVideos(paginatedData.items); // Set current page's videos
      setPaginationInfo({
        pageInfo: paginatedData.pageInfo,
        currentPage: paginatedData.currentPage,
        hasNextPage: paginatedData.hasNextPage,
        hasPrevPage: paginatedData.hasPrevPage
      });
    }
  }, [videos, currentPage]);
  
  
  const performSearch = async (query, type = CONTENT_TYPES.ALL) => {
    setLoading(true);
    setError(null);
    
    try {
      // Build URL with search query and content type, no pagination tokens
      const url = `/api/youtube/search?query=${encodeURIComponent(query)}&contentType=${type}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch videos');
      }
      
      const data = await response.json();
      setVideos(data.items || []);
      
      // Add to search history
        const savedHistory = localStorage.getItem('searchHistory');
        let searchHistory = [];
        
        if (savedHistory) {
          try {
            searchHistory = JSON.parse(savedHistory);
          } catch (e) {
            console.error('Failed to parse search history:', e);
          }
        }
        
        if (query && !searchHistory.includes(query)) {
          const updatedHistory = [query, ...searchHistory.slice(0, 9)];
          localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
        }
      
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    // Update URL with new search query (reset pagination)
    router.push({
      pathname: '/results',
      query: {
        search_query: encodeURIComponent(query),
        content_type: contentType
      }
    });
  };
  
  const handleContentTypeChange = (type) => {
    // Update URL with new content type
    router.push({
      pathname: '/results',
      query: {
        ...router.query,
        content_type: type,
        page: 1 // Reset to page 1
      }
    });
    
    setContentType(type);
  };
  

  return (
    <div className={styles.container}>
      <Head>
        <title>
          {search_query 
            ? `${search_query} - ${contentType !== CONTENT_TYPES.ALL ? (contentType === CONTENT_TYPES.VIDEO ? 'Videos' : 'Shorts') : 'All'} - Page ${currentPage} - Search Results - Video Learning`
            : 'Search Results - Video Learning'}
        </title>
        <meta name="description" content={`Search results for ${search_query || 'videos'}`} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Logo />
          <div className={styles.searchBarContainer}>
            <SearchBar onSearch={handleSearch} initialQuery={search_query} />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {search_query && (
          <div className={styles.resultsHeader}>
            <h1 className={styles.resultsTitle}>
              Search results for <span>"{search_query}"</span>
              {currentPage > 1 && <span className={styles.pageIndicator}> - Page {currentPage}</span>}
            </h1>
            
            <ContentTypeFilter 
              selectedType={contentType} 
              onTypeChange={handleContentTypeChange} 
            />
          </div>
        )}
        

        {loading && (
          <div className={styles.loading}>Loading...</div>
        )}

        {error && (
          <div className={styles.error}>{error}</div>
        )}

        {filteredVideos.length > 0 ? (
          <>
            <div className={styles.results}>
              {filteredVideos.map((video) => (
                <div 
                  key={video.id.videoId || video.id} 
                  className={styles.videoCardWrapper}
                >
                  <VideoCard video={video} />
                </div>
              ))}
            </div>
            
            {/* Show pagination */}
            {(
              <Pagination 
                pageInfo={paginationInfo.pageInfo}
                currentPage={currentPage}
                searchQuery={search_query}
                hasNextPage={paginationInfo.hasNextPage}
                hasPrevPage={paginationInfo.hasPrevPage}
              />
            )}
          </>
        ) : videos.length > 0 && filteredVideos.length === 0 ? (
          <div className={styles.noResults}>
            No {contentType === CONTENT_TYPES.SHORT ? 'short videos' : 'regular videos'} found matching your search.
            Try a different filter or search term.
          </div>
        ) : !loading && !error ? (
          <div className={styles.noResults}>
            {
              'No videos found. Try a different search term.'
            }
          </div>
        ) : null}
      </main>
    </div>
  );
}