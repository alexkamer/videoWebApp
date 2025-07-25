import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../../styles/VideoPage.module.css';
import TranscriptViewer from '../../components/TranscriptViewer';
import AISummary from '../../components/AISummary';

export default function VideoPage() {
  const router = useRouter();
  const { id, mode: initialMode } = router.query;
  const [mode, setMode] = useState('watch'); // 'watch', 'learn', or 'quiz'
  const [transcript, setTranscript] = useState([]);
  
  // Update mode when the URL changes
  useEffect(() => {
    if (initialMode && ['watch', 'learn', 'quiz'].includes(initialMode)) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Sample video data - in a real app, this would be fetched based on ID
  const videoData = {
    id: id,
    title: 'Sample Video Title',
    description: 'This is a detailed description of the video content. It would include information about what the video covers, who it is for, and what viewers can expect to learn.',
    videoUrl: 'https://www.example.com/sample-video.mp4',
    thumbnail: 'https://placehold.co/800x450/0070f3/FFFFFF/png?text=Video+Player',
    duration: '15:30',
    views: '10,234',
    tags: ['JavaScript', 'Programming', 'Web Development'],
    transcript: `
      This is a sample transcript of the video content.
      It would contain the full text of what is spoken in the video.
      This allows users to read along or search for specific content.
      In a real application, this would be generated automatically or provided by the content creator.
    `
  };

  // Sample quiz questions
  const quizQuestions = [
    {
      id: 1,
      question: 'What is the main topic of this video?',
      options: [
        'JavaScript basics',
        'Advanced CSS techniques',
        'Database design',
        'Network protocols'
      ],
      correctAnswer: 'JavaScript basics'
    },
    {
      id: 2,
      question: 'Which concept was NOT covered in this video?',
      options: [
        'Variables',
        'Functions',
        'Classes',
        'WebSockets'
      ],
      correctAnswer: 'WebSockets'
    }
  ];

  // AI insights for learn mode
  const aiInsights = [
    {
      timestamp: '00:45',
      text: 'Key concept: Variables are containers for storing data values.'
    },
    {
      timestamp: '03:12',
      text: 'Important distinction: let vs const - use const when the value should not change.'
    },
    {
      timestamp: '07:30',
      text: 'Common misconception: JavaScript is not the same as Java, despite the similar name.'
    }
  ];

  return (
    <div className={styles.container}>
      <Head>
        <title>{videoData.title} | Video Learning App</title>
        <meta name="description" content={videoData.description} />
      </Head>

      <main className={styles.main}>
        <div className={styles.videoContainer}>
          {/* Real YouTube embed */}
          {id && (
            <div className={styles.videoPlayer}>
              <iframe
                width="100%"
                height="450"
                src={`https://www.youtube.com/embed/${id}`}
                title={videoData.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          )}
          <div className={styles.videoControls}>
            <button 
              className={`${styles.modeButton} ${mode === 'watch' ? styles.active : ''}`}
              onClick={() => {
                setMode('watch');
                router.push(`/video/${id}?mode=watch`, undefined, { shallow: true });
              }}
            >
              Watch Mode
            </button>
            <button 
              className={`${styles.modeButton} ${mode === 'learn' ? styles.active : ''}`}
              onClick={() => {
                setMode('learn');
                router.push(`/video/${id}?mode=learn`, undefined, { shallow: true });
              }}
            >
              Learn Mode
            </button>
            <button 
              className={`${styles.modeButton} ${mode === 'quiz' ? styles.active : ''}`}
              onClick={() => {
                setMode('quiz');
                router.push(`/video/${id}?mode=quiz`, undefined, { shallow: true });
              }}
            >
              Quiz Mode
            </button>
          </div>
        </div>

        <div className={styles.videoInfo}>
          <h1>{videoData.title}</h1>
          <div className={styles.meta}>
            <span>{videoData.views} views</span>
            <span>{videoData.duration}</span>
            <div className={styles.tags}>
              {videoData.tags.map(tag => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          </div>
          <p className={styles.description}>{videoData.description}</p>
        </div>

        <div className={styles.contentSection}>
          {/* AI Summary always shown above transcript */}
          {id && transcript && transcript.length > 0 && (
            <AISummary videoId={id} videoTitle={videoData.title} transcript={transcript} />
          )}
          {/* Always show transcript below video */}
          {id && <TranscriptViewer videoId={id} onTranscriptLoaded={setTranscript} />}

          {mode === 'learn' && (
            <div className={styles.learningSection}>
              <h2>AI Insights</h2>
              <div className={styles.insights}>
                {aiInsights.map((insight, index) => (
                  <div key={index} className={styles.insightCard}>
                    <div className={styles.timestamp}>{insight.timestamp}</div>
                    <div className={styles.insightText}>{insight.text}</div>
                  </div>
                ))}
              </div>
              <div className={styles.summary}>
                <h3>Video Summary</h3>
                <p>
                  This video covers the fundamentals of JavaScript programming language,
                  including variables, data types, and basic functions. It provides clear
                  examples and practical demonstrations of core concepts for beginners.
                </p>
              </div>
            </div>
          )}

          {mode === 'quiz' && (
            <div className={styles.quizSection}>
              <h2>Test Your Knowledge</h2>
              {quizQuestions.map(question => (
                <div key={question.id} className={styles.questionCard}>
                  <h3>{question.question}</h3>
                  <div className={styles.options}>
                    {question.options.map((option, index) => (
                      <label key={index} className={styles.option}>
                        <input 
                          type="radio" 
                          name={`question-${question.id}`} 
                          value={option} 
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button className={styles.submitButton}>Check Answers</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}