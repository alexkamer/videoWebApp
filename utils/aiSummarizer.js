/**
 * Utility for summarizing video transcripts
 * 
 * This is a local implementation that does not require external API calls.
 * It uses simple text processing to create a summary.
 */
require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');

/**
 * Generates a summary of the video transcript using the AGNO Python agent.
 * Falls back to the local JS summary if the Python script fails.
 *
 * @param {Array} transcript - Array of transcript segments
 * @param {string} videoTitle - The title of the video
 * @returns {Promise<string>} - Generated summary
 */
async function summarizeTranscript(transcript, videoTitle) {
  try {
    if (!transcript || transcript.length === 0) {
      return "No transcript available to summarize.";
    }

    // Write transcript to a temporary file
    const fs = require('fs');
    const os = require('os');
    const tmp = require('tmp');
    const tmpFile = tmp.fileSync({ postfix: '.json' });
    fs.writeFileSync(tmpFile.name, JSON.stringify(transcript), 'utf-8');

    // Call the Python script
    const scriptPath = path.join(process.cwd(), 'scripts', 'summarize_transcript_with_agnos.py');
    const args = [scriptPath, tmpFile.name];
    if (videoTitle) args.push(videoTitle);

    // Use the virtual environment Python interpreter
    const pythonPath = process.env.VIRTUAL_ENV 
      ? path.join(process.env.VIRTUAL_ENV, 'bin', 'python')
      : path.join(process.cwd(), '.venv', 'bin', 'python');
    
    // Add debugging to console but not to client
    console.log(`Using Python interpreter: ${pythonPath}`);
    console.log(`Running script: ${scriptPath}`);
    console.log(`With arguments: ${args.join(' ')}`);
    
    const summary = await new Promise((resolve, reject) => {
      // Use the specific Python interpreter from the virtual environment
      const py = spawn(pythonPath, args);
      let output = '';
      let error = '';
      let inSummaryOutput = false;
      let actualSummary = '';
      
      py.stdout.on('data', (data) => { 
        const text = data.toString();
        output += text;
        
        // Process the output to extract just the summary part
        // Look for the summary start marker
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.includes("Here's a summary") || line.includes("## Video Summary")) {
            inSummaryOutput = true;
            actualSummary += line + '\n';
          } else if (inSummaryOutput) {
            actualSummary += line + '\n';
          }
        }
        
        // Log for server-side debugging only
        console.log(`Python stdout: ${text}`);
      });
      
      py.stderr.on('data', (data) => { 
        const text = data.toString();
        console.error(`Python stderr: ${text}`);
        error += text; 
      });
      
      py.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        if (code === 0) {
          if (actualSummary) {
            // If we successfully extracted the summary part, return just that
            resolve(actualSummary.trim());
          } else if (output.trim()) {
            // Fall back to the whole output if we couldn't extract
            resolve(output.trim());
          } else {
            reject(new Error('No summary was generated'));
          }
        } else {
          reject(new Error(error || 'Python summarizer failed'));
        }
      });
    });

    tmpFile.removeCallback();
    return summary;
  } catch (error) {
    console.error("Error generating transcript summary (Python):", error);
    // Fallback to JS summary
    return generateBasicSummary(
      transcript.map(seg => seg.text).join(' '),
      videoTitle || ''
    );
  }
}

/**
 * Generates an abstract summary based on content analysis
 * 
 * @param {string} text - Cleaned transcript text
 * @param {string} title - Video title
 * @returns {string} - Abstract summary
 */
function generateBasicSummary(text, title) {
  // If text is very short, provide a simple summary
  if (text.length < 100) {
    return `This appears to be a very brief video with limited spoken content.`;
  }
  
  // Find common topic keywords
  const words = text.toLowerCase().split(/\s+/);
  const wordFrequency = {};
  
  // Exclude common words
  const stopWords = new Set(['the', 'and', 'a', 'to', 'of', 'is', 'in', 'it', 'you', 'that', 
    'this', 'for', 'i', 'on', 'with', 'as', 'are', 'at', 'be', 'but', 'by', 'have', 'he', 
    'was', 'not', 'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 
    'use', 'an', 'each', 'which', 'do', 'how', 'if', 'will', 'up', 'about', 'out', 'many', 
    'then', 'them', 'so', 'some', 'her', 'would', 'make', 'like', 'him', 'into', 'has', 
    'look', 'two', 'more', 'go', 'see', 'no', 'way', 'could', 'my', 'than', 'been', 'call', 
    'who', 'its', 'now', 'long', 'did', 'get', 'well', 'just', 'yes', 'very']);
  
  // Count word frequencies
  words.forEach(word => {
    if (word.length > 2 && !stopWords.has(word)) {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }
  });
  
  // Get top keywords
  const topKeywords = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(entry => entry[0]);
  
  // Detect content type
  let contentType = "informational";
  const tutorialIndicators = ['how', 'tutorial', 'guide', 'learn', 'step', 'explain', 'create', 'build'];
  const entertainmentIndicators = ['fun', 'cool', 'awesome', 'amazing', 'wow', 'incredible', 'hilarious', 'laugh'];
  
  const tutorialScore = tutorialIndicators.filter(word => text.toLowerCase().includes(word)).length;
  const entertainmentScore = entertainmentIndicators.filter(word => text.toLowerCase().includes(word)).length;
  
  if (tutorialScore > 2) contentType = "tutorial";
  if (entertainmentScore > 2) contentType = "entertainment";
  
  // Check for interview/conversation pattern
  const conversationIndicators = text.match(/([?]\s+)|([:]\s+[A-Z])/g);
  if (conversationIndicators && conversationIndicators.length > 5) {
    contentType = "conversation or interview";
  }
  
  // Determine topic from title and keywords
  const titleWords = title.toLowerCase().split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));
  
  // Generate an abstract summary
  let summary = '';
  
  // Add introduction
  summary += `This video appears to be a ${contentType} about ${titleWords.join(' ')}. `;
  
  // Add content insight based on keywords
  summary += `The content primarily discusses topics related to ${topKeywords.slice(0, 3).join(', ')}`;  
  if (topKeywords.length > 3) {
    summary += `, with additional focus on ${topKeywords.slice(3, 6).join(', ')}.`;
  } else {
    summary += '.'; 
  }
  
  // Add content length insight
  const wordCount = words.length;
  if (wordCount < 500) {
    summary += ` This appears to be a relatively short video with concise content.`;
  } else if (wordCount > 2000) {
    summary += ` This is an in-depth video with extensive content.`;
  }
  
  return `
## Video Summary: ${title}

${summary}

**Main Topics:**
- ${topKeywords.slice(0, 5).join('\n- ')}

Note: This is an automatically generated summary that identifies key topics rather than providing a complete overview. For full context, please watch the video.
  `.trim();
}

module.exports = {
  summarizeTranscript
};