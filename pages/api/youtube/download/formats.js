import { spawn } from 'child_process';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ message: 'Video ID is required' });
    }

    // Build YouTube URL
    const videoUrl = `https://www.youtube.com/watch?v=${id}`;
    
    // Options for yt-dlp to list formats
    const ytDlpArgs = [
      '--no-playlist',
      '--dump-json',
      '-F',
      videoUrl
    ];

    console.log(`[Format API] Fetching formats for video ${id}`);
    
    // Initialize process to get formats
    const formatProcess = spawn('yt-dlp', ytDlpArgs);
    
    let formatsOutput = '';
    let error = null;
    
    // Collect stdout data
    formatProcess.stdout.on('data', (data) => {
      formatsOutput += data.toString();
    });

    formatProcess.stderr.on('data', (data) => {
      console.error(`[yt-dlp stderr] ${data}`);
      error = data.toString();
    });

    // Wait for process to complete
    await new Promise((resolve, reject) => {
      formatProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`yt-dlp exited with code ${code}: ${error || 'Unknown error'}`));
        }
      });
    });

    // Process the formats output
    const formatLines = formatsOutput.trim().split('\\n');
    
    // Parse format information
    const formats = [];
    let parsingFormats = false;
    
    for (const line of formatLines) {
      if (line.includes('format code')) {
        parsingFormats = true;
        continue;
      }
      
      if (parsingFormats && line.trim()) {
        // Example line: "251 webm audio only tiny 49k , webm_dash container, opus @160k (48000Hz), 1.77MiB"
        const match = line.match(/^(\S+)\s+(\S+)\s+(.*?)(\d+x\d+|\S+)\s+(\S+)\s*,\s*(.*)/);
        
        if (match) {
          const [, formatCode, extension, formatNote, resolution, filesize, additionalInfo] = match;
          
          formats.push({
            format_code: formatCode.trim(),
            extension: extension.trim(),
            format_note: formatNote.trim(),
            resolution: resolution.trim(),
            filesize: filesize.trim(),
            additional_info: additionalInfo.trim()
          });
        }
      }
    }

    // Return the available formats
    return res.status(200).json({
      video_id: id,
      formats: formats,
      raw_output: formatsOutput // Include raw output for debugging
    });
    
  } catch (error) {
    console.error('[Format API Error]:', error);
    return res.status(500).json({ 
      message: 'Error fetching video formats', 
      error: error.message 
    });
  }
}