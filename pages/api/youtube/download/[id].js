import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get query parameters
    const { id } = req.query;
    let { format = 'best', customFilename } = req.query; // Get format and customFilename from query
    
    console.log(`[Download API] Received request for video ID: ${id}`);
    console.log(`[Download API] Format requested: ${format}`);
    console.log(`[Download API] Custom filename: ${customFilename || 'none'}`);
    
    if (!id) {
      return res.status(400).json({ message: 'Video ID is required' });
    }

    // Check for our custom prefix - MOVE THIS UP to define formatType early
    let formatType = 'video'; // Default to video
    
    // Check if format has our custom prefix
    if (format.startsWith('audio:')) {
      formatType = 'audio';
      format = format.substring(6); // Remove the 'audio:' prefix
    } else if (format.startsWith('video:')) {
      formatType = 'video';
      format = format.substring(6); // Remove the 'video:' prefix
    } else {
      // Fallback detection based on format string
      if (format.includes('bestaudio') || format.toLowerCase().includes('audio')) {
        formatType = 'audio';
      }
    }
    
    console.log(`[Download API] Format type detected: ${formatType}`);

    // Build YouTube URL
    const videoUrl = `https://www.youtube.com/watch?v=${id}`;
    
    // Create a temporary directory for downloading
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytdl-'));
    const tempFile = path.join(tempDir, 'video.mp4');
    
    console.log(`[Download API] Using temporary file: ${tempFile}`);
    
    // Options for yt-dlp with temp file
    let ytDlpArgs = [
      '--no-playlist',
      '--restrict-filenames', // Replace spaces with underscores and remove special chars
      '--output', tempFile, // Output to temp file
      '--quiet', // Reduce unnecessary output
      '--progress',  // Show download progress
      // Options for better compatibility
      '--prefer-ffmpeg', // Prefer ffmpeg for post-processing
      '--format', formatType === 'audio' ? 'bestaudio' : 'best[ext=mp4]/bestvideo[ext=mp4]+bestaudio'
    ];
    
    // Add specific options based on format type
    if (formatType === 'audio') {
      ytDlpArgs.push('--extract-audio', '--audio-format', 'mp3');
    } else {
      // For video, ensure we get a QuickTime compatible MP4
      ytDlpArgs.push('--recode-video', 'mp4');
      ytDlpArgs.push('--postprocessor-args', 'ffmpeg:-codec:v libx264 -codec:a aac -movflags +faststart');
    }
    
    // Format type is already detected above
    
    // Format selection is now handled in the ytDlpArgs initialization
    
    // Add the URL at the end
    ytDlpArgs.push(videoUrl);

    console.log(`[Download API] Starting direct download for video ${id}`);
    console.log(`[Download API] Format: ${format}, Format Type: ${formatType}`);
    console.log(`[Download API] Custom Filename: ${customFilename || 'none'}`)
    console.log(`[Download API] yt-dlp args: ${ytDlpArgs.join(' ')}`);
    
    // Get video information first to get the title for the filename
    const infoProcess = spawn('yt-dlp', [
      '--no-playlist',
      '--print', 'title', // Just get the title, not the full filename
      videoUrl
    ]);
    
    let videoTitle = '';
    
    infoProcess.stdout.on('data', (data) => {
      videoTitle += data.toString().trim();
    });
    
    // Wait for the info process to complete
    await new Promise((resolve, reject) => {
      infoProcess.on('close', (code) => {
        if (code === 0 && videoTitle) {
          resolve();
        } else {
          // If we can't get the title, use a default filename with the video ID
          videoTitle = `youtube-video-${id}.mp4`;
          resolve();
        }
      });
    });
    
    // Clean filename for HTTP headers (remove special characters) and set appropriate extension
    // First extract just the base name without any extension
    const baseName = videoTitle.split('.')[0].replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Choose extension based on format prefix - explicit audio vs video handling
    let extension = '.mp4'; // Default to mp4
    
    // Check if format has our custom prefix
    if (formatType === 'audio') {
      extension = '.mp3';
    } else {
      extension = '.mp4';
    }
    
    // Handle custom filename if provided, otherwise create one from title
    let cleanFilename;
    if (customFilename) {
      // Use the custom filename provided by the user
      cleanFilename = decodeURIComponent(customFilename);
      console.log(`[Download API] Using custom filename: ${cleanFilename}`);
      // Make sure the extension is correct
      if (!cleanFilename.endsWith(extension)) {
        cleanFilename = cleanFilename.replace(/\.[^/.]+$/, '') + extension;
      }
    } else {
      // Create clean filename with appropriate extension
      cleanFilename = baseName + extension;
      console.log(`[Download API] Using default filename: ${cleanFilename}`);
    }
    
    console.log(`[Download API] Using filename: ${cleanFilename}`);
    
    // Wait for yt-dlp to download to temp file
    try {
      // Start the download process
      const downloadProcess = spawn('yt-dlp', ytDlpArgs);
      
      // Log progress for debugging
      downloadProcess.stderr.on('data', (data) => {
        console.log(`[yt-dlp stderr] ${data.toString()}`);
      });
      
      // Wait for download to complete
      await new Promise((resolve, reject) => {
        downloadProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`yt-dlp process exited with code ${code}`));
          }
        });
      });
      
      console.log(`[Download API] Download completed to temp file: ${tempFile}`);
      
      // Check if file exists
      if (!fs.existsSync(tempFile)) {
        const mp3File = tempFile.replace(/\.mp4$/, '.mp3');
        if (formatType === 'audio' && fs.existsSync(mp3File)) {
          console.log(`[Download API] Found MP3 file instead: ${mp3File}`);
          // Update the temp file and extension
          tempFile = mp3File;
        } else {
          throw new Error('Download failed: Temporary file not found');
        }
      }
      
      // Set headers for direct download with attachment directive to force file save
      // Set content type based on file extension for better compatibility
      const fileExtension = path.extname(tempFile).toLowerCase();
      
      if (fileExtension === '.mp3' || formatType === 'audio') {
        res.setHeader('Content-Type', 'audio/mpeg');
      } else if (fileExtension === '.mp4') {
        res.setHeader('Content-Type', 'video/mp4');
      } else {
        // Fallback content type
        res.setHeader('Content-Type', 'application/octet-stream');
      }
      
      console.log(`[Download API] Set content type based on extension: ${fileExtension}`);
      
      
      // Content-Disposition with attachment forces the browser to display a Save dialog
      const safeFilename = cleanFilename.replace(/"/g, '');
      
      // Force the browser to show Save As dialog by using attachment disposition
      res.setHeader(
        'Content-Disposition', 
        `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(cleanFilename)}`
      );
      
      // Prevent caching to ensure Save As dialog appears consistently
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      
      // Get file size for Content-Length header
      const stats = fs.statSync(tempFile);
      res.setHeader('Content-Length', stats.size);
      
      // Stream the file to the response
      const fileStream = fs.createReadStream(tempFile);
      fileStream.pipe(res);
      
      // Clean up when done
      fileStream.on('end', () => {
        console.log(`[Download API] File stream completed for ${id}`);
        // Clean up the temporary file after short delay to ensure streaming is complete
        setTimeout(() => {
          try {
            fs.unlinkSync(tempFile);
            fs.rmdirSync(tempDir, { recursive: true });
            console.log(`[Download API] Cleaned up temporary files for ${id}`);
          } catch (err) {
            console.error(`[Download API] Error cleaning up temp files: ${err.message}`);
          }
        }, 1000);
      });
      
      // Handle stream errors
      fileStream.on('error', (err) => {
        console.error(`[Download API] File stream error: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error streaming file', error: err.message });
        } else if (!res.writableEnded) {
          res.end();
        }
      });
      
      // Handle client disconnect
      res.on('close', () => {
        fileStream.destroy();
        // Clean up the temporary file
        try {
          fs.unlinkSync(tempFile);
          fs.rmdirSync(tempDir, { recursive: true });
          console.log(`[Download API] Client disconnected, cleaned up temp files for ${id}`);
        } catch (err) {
          console.error(`[Download API] Error cleaning up temp files after disconnect: ${err.message}`);
        }
      });
    } catch (error) {
      console.error(`[Download API] Error during download: ${error.message}`);
      // Clean up temp directory in case of error
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir, { recursive: true });
        }
      } catch (cleanupError) {
        console.error(`[Download API] Error cleaning up after error: ${cleanupError.message}`);
      }
      
      if (!res.headersSent) {
        return res.status(500).json({
          message: 'Error downloading video', 
          error: error.message
        });
      } else if (!res.writableEnded) {
        res.end();
      }
    }
    
  } catch (error) {
    console.error('[Download API Error]:', error);
    
    // If headers haven't been sent yet, send error response
    if (!res.headersSent) {
      return res.status(500).json({ 
        message: 'Error downloading video', 
        error: error.message 
      });
    } else {
      // If headers already sent, just end the response
      res.end();
    }
  }
}