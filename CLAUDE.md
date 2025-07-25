# Video Learning Web App Setup

This file contains important information about the Video Learning Web App setup and commands.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- yt-dlp (for video downloads)
- ffmpeg (for merging video/audio and format conversion)

## Required Dependencies Installation

To use the download functionality, you need to install both yt-dlp and ffmpeg on your system:

### macOS:
```bash
# Install yt-dlp
brew install yt-dlp

# Install ffmpeg
brew install ffmpeg
```

### Linux:
```bash
# Install yt-dlp
sudo apt install yt-dlp
# or
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# Install ffmpeg
sudo apt-get install ffmpeg
```

### Windows:
- yt-dlp: Download from https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe
- ffmpeg: Download from https://ffmpeg.org/download.html

## Common Issues

- **Missing ffmpeg**: If you see the warning "ffmpeg not found", you need to install ffmpeg for optimal video conversion. Without ffmpeg, some video formats may not be available for download.

## Development Commands

- Start development server: `npm run dev`
- Build for production: `npm run build`
- Start production server: `npm run start`
- Lint code: `npm run lint`

## Environment Variables

Create a `.env.local` file with the following variables:
```
YOUTUBE_API_KEY=your_youtube_api_key_here
```