import { useState, useEffect } from 'react';
import styles from '../styles/ContentTypeFilter.module.css';

// Content type options
const CONTENT_TYPES = {
  ALL: 'all',
  VIDEO: 'video',
  SHORT: 'short'
};

export default function ContentTypeFilter({ selectedType, onTypeChange }) {
  // Map content type to display name
  const getDisplayName = (type) => {
    switch(type) {
      case CONTENT_TYPES.ALL:
        return 'All';
      case CONTENT_TYPES.VIDEO:
        return 'Videos';
      case CONTENT_TYPES.SHORT:
        return 'Shorts';
      default:
        return 'All';
    }
  };

  return (
    <div className={styles.filterContainer}>
      <div className={styles.filterButtonsGroup}>
        {Object.values(CONTENT_TYPES).map((type) => (
          <button
            key={type}
            className={`${styles.filterButton} ${selectedType === type ? styles.active : ''}`}
            onClick={() => onTypeChange(type)}
            aria-pressed={selectedType === type}
          >
            {getDisplayName(type)}
          </button>
        ))}
      </div>
    </div>
  );
}

// Export content types for use in other components
export { CONTENT_TYPES };