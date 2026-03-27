---
name: vimeo-player
description: Vimeo Player SDK reference — @vimeo/player for embedded video playback in A3 training/resource content
version: 0.1.0
---

# Vimeo Player SDK Reference

## Package: @vimeo/player

The official Vimeo Player JavaScript SDK for controlling embedded Vimeo videos. A3 uses this for training videos, resource content, and compliance course playback.

### Installation

```bash
pnpm add @vimeo/player
```

### Import

```typescript
import Player from '@vimeo/player';
```

## Player Constructor

### From a Container Element (Recommended)

```typescript
const container = document.getElementById('vimeo-container');

const player = new Player(container, {
  id: 123456789,              // Vimeo video ID
  width: 640,                  // Player width in px
  height: 360,                 // Player height in px
  autoplay: false,
  loop: false,
  muted: false,
  autopause: true,             // Pause when another Vimeo player starts
  background: false,           // Background mode (no controls, loops, muted)
  byline: false,               // Hide uploader byline
  color: '1a73e8',             // Player accent color (hex without #)
  controls: true,
  dnt: false,                  // Do Not Track
  keyboard: true,              // Keyboard input
  pip: true,                   // Picture-in-Picture button
  playsinline: true,           // Inline playback on mobile
  portrait: false,             // Hide uploader portrait
  quality: 'auto',             // 'auto' | '4K' | '2K' | '1080p' | '720p' | '540p' | '360p'
  responsive: true,            // Auto-resize to container
  speed: true,                 // Show speed controls
  title: false,                // Hide video title
  transparent: true,           // Transparent background on player
});
```

### From a URL

```typescript
const player = new Player(container, {
  url: 'https://vimeo.com/123456789',
  responsive: true,
});
```

### From an Existing iframe

```typescript
// If there's already a Vimeo iframe in the DOM
const iframe = document.querySelector<HTMLIFrameElement>('#vimeo-iframe');
const player = new Player(iframe);
```

## Player Methods

All methods return Promises.

### Playback Control

```typescript
// Play
await player.play();

// Pause
await player.pause();

// Check if paused
const paused = await player.getPaused(); // boolean

// Check if video ended
const ended = await player.getEnded(); // boolean

// Seek to time (in seconds)
await player.setCurrentTime(30.5);
const currentTime = await player.getCurrentTime(); // number (seconds)

// Set playback rate
await player.setPlaybackRate(1.5); // 0.5 to 2
const rate = await player.getPlaybackRate();
```

### Volume

```typescript
await player.setVolume(0.75); // 0 to 1
const volume = await player.getVolume();

await player.setMuted(true);
const muted = await player.getMuted();
```

### Video Information

```typescript
const title = await player.getVideoTitle();
const duration = await player.getDuration();       // Total seconds
const videoId = await player.getVideoId();
const videoUrl = await player.getVideoUrl();
const width = await player.getVideoWidth();
const height = await player.getVideoHeight();

// Quality
const qualities = await player.getQualities();      // Available qualities
const quality = await player.getQuality();           // Current quality
await player.setQuality('1080p');
```

### Chapters and Text Tracks

```typescript
const chapters = await player.getChapters();
// => [{ startTime: 0, title: 'Intro', index: 1 }, ...]

const currentChapter = await player.getCurrentChapter();

// Text tracks (subtitles/captions)
const textTracks = await player.getTextTracks();
await player.enableTextTrack('en');   // Enable English captions
await player.disableTextTrack();
```

### Player State

```typescript
// Get buffered percentage
const buffered = await player.getBuffered(); // 0 to 1

// Get played ranges (TimeRanges-like)
const played = await player.getPlayed();

// Get seeking state
const seeking = await player.getSeeking();
```

### Destroy

```typescript
// Remove the player and clean up
await player.destroy();
// Container element is emptied
```

## Events

### Registering Event Listeners

```typescript
player.on('play', (data) => {
  console.log('Playing at', data.seconds, 'of', data.duration);
});

player.on('pause', (data) => {
  console.log('Paused at', data.seconds);
});

player.on('ended', (data) => {
  console.log('Video ended');
  markTrainingComplete();
});

player.on('timeupdate', (data) => {
  // Fires ~4 times per second during playback
  console.log('Time:', data.seconds);
  console.log('Percent:', data.percent); // 0 to 1
  console.log('Duration:', data.duration);
  updateProgressBar(data.percent);
});

player.on('progress', (data) => {
  // Buffering progress
  console.log('Buffered:', data.percent);
});

player.on('seeked', (data) => {
  console.log('Seeked to', data.seconds);
});

player.on('volumechange', (data) => {
  console.log('Volume:', data.volume);
});

player.on('playbackratechange', (data) => {
  console.log('Speed:', data.playbackRate);
});

player.on('loaded', (data) => {
  console.log('Video loaded, ID:', data.id);
});

player.on('error', (data) => {
  console.error('Player error:', data.message);
  // data.method — the method that triggered the error
  // data.name — error name
});

// Chapter change
player.on('chapterchange', (data) => {
  console.log('Chapter:', data.title, 'at', data.startTime);
});

// Quality change
player.on('qualitychange', (data) => {
  console.log('Quality changed to:', data.quality);
});
```

### Removing Listeners

```typescript
// Remove a specific handler
player.off('timeupdate', myHandler);

// Remove all handlers for an event
player.off('timeupdate');
```

## Responsive Embedding

For responsive layouts, use the `responsive: true` option and ensure the container has a defined width:

```html
<div id="vimeo-container" style="width: 100%; max-width: 800px;"></div>
```

```typescript
const player = new Player(container, {
  id: 123456789,
  responsive: true,
});
```

The SDK injects an iframe wrapped in a `<div>` with `padding-bottom` to maintain 16:9 aspect ratio.

### Custom Aspect Ratio

```css
.vimeo-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 */
  overflow: hidden;
}

.vimeo-wrapper iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

## Ember Component Integration

A3 pattern for wrapping the Vimeo player in a Glimmer component:

```typescript
// app/components/vimeo-player.gts
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { modifier } from 'ember-modifier';
import Player from '@vimeo/player';

interface VimeoPlayerSignature {
  Args: {
    videoId: number;
    onEnded?: () => void;
    onProgress?: (percent: number) => void;
    autoplay?: boolean;
  };
  Element: HTMLDivElement;
}

export default class VimeoPlayerComponent extends Component<VimeoPlayerSignature> {
  @tracked player: Player | null = null;
  @tracked isPlaying = false;
  @tracked progress = 0;

  setupPlayer = modifier((element: HTMLDivElement) => {
    const player = new Player(element, {
      id: this.args.videoId,
      responsive: true,
      autoplay: this.args.autoplay ?? false,
      title: false,
      byline: false,
      portrait: false,
    });

    this.player = player;

    player.on('play', () => {
      this.isPlaying = true;
    });

    player.on('pause', () => {
      this.isPlaying = false;
    });

    player.on('timeupdate', (data) => {
      this.progress = data.percent;
      this.args.onProgress?.(data.percent);
    });

    player.on('ended', () => {
      this.isPlaying = false;
      this.args.onEnded?.();
    });

    // Cleanup on element destruction
    return () => {
      player.destroy();
    };
  });

  @action async togglePlay() {
    if (!this.player) return;
    const paused = await this.player.getPaused();
    if (paused) {
      await this.player.play();
    } else {
      await this.player.pause();
    }
  }
}
```

### Template Usage

```handlebars
<VimeoPlayer
  @videoId={{12345}}
  @onEnded={{this.markComplete}}
  @onProgress={{this.trackProgress}}
/>
```

## Tracking Video Completion in A3

A3 tracks training video completion by monitoring playback progress:

```typescript
// Track watched segments to prevent skipping
const watchedSegments: Set<number> = new Set();

player.on('timeupdate', (data) => {
  // Record each second watched
  const second = Math.floor(data.seconds);
  watchedSegments.add(second);

  // Calculate actual watch percentage (not just seek position)
  const totalSeconds = Math.floor(data.duration);
  const watchedPercent = watchedSegments.size / totalSeconds;

  if (watchedPercent >= 0.9) {
    // User has watched at least 90% of unique content
    markVideoComplete(videoId);
  }
});
```

## Loading Videos Dynamically

```typescript
// Change the video without destroying the player
await player.loadVideo(newVideoId);
// or
await player.loadVideo('https://vimeo.com/987654321');

// The 'loaded' event fires when the new video is ready
player.on('loaded', (data) => {
  console.log('New video loaded:', data.id);
});
```

## Privacy and DRM

```typescript
const player = new Player(container, {
  id: videoId,
  dnt: true,    // Do Not Track — disables tracking cookies and analytics
});
```

For private/domain-restricted videos, ensure the embedding domain is whitelisted in Vimeo video settings.

## Common Pitfalls

1. **Destroyed player:** Calling methods on a destroyed player throws. Always null-check before method calls.
2. **Multiple instances:** `autopause: true` (default) pauses other Vimeo players when one starts. Set to `false` if you need simultaneous playback.
3. **Mobile autoplay:** Browsers block autoplay with sound on mobile. Use `muted: true` with `autoplay: true` for mobile-safe autoplay.
4. **Responsive + fixed height:** Do not set both `responsive: true` and `height`. The responsive wrapper uses padding-based scaling that conflicts with fixed dimensions.
5. **Rate limiting:** Vimeo API calls from the SDK are rate-limited. Cache video metadata instead of fetching repeatedly.
