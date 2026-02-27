// Content Script - Injected into YouTube pages
// Monitors video state and executes playback commands

console.log('[YT Remote] Content script loaded');

let video = null;
let stateInterval = null;

// Find the video element
function findVideoElement() {
    const videoElement = document.querySelector('video');
    if (videoElement) {
        video = videoElement;
        console.log('[YT Remote] Video element found');
        return true;
    }
    return false;
}

// Extract video state
function getVideoState() {
    if (!video) return null;

    // Get title
    const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title');
    const title = titleElement?.textContent?.trim() || 'Unknown';

    // Get thumbnail
    const thumbnailElement = document.querySelector('meta[property="og:image"]');
    const thumbnail = thumbnailElement?.content || '';

    return {
        title: title,
        thumbnail: thumbnail,
        current_time: video.currentTime || 0,
        duration: video.duration || 0,
        playing: !video.paused,
        volume: Math.round((video.volume || 1) * 100)
    };
}

// Send state to background script
function sendState() {
    const state = getVideoState();
    if (state) {
        chrome.runtime.sendMessage({
            type: 'VIDEO_STATE',
            data: state
        }).catch(err => {
            // Ignore errors when extension context is invalidated
            if (!err.message.includes('Extension context')) {
                console.error('[YT Remote] Error sending state:', err);
            }
        });
    }
}

// Execute command on video
function executeCommand(command) {
    if (!video) {
        console.warn('[YT Remote] No video element found');
        return;
    }

    console.log('[YT Remote] Executing command:', command);
    console.log('[YT Remote] Video state before command - paused:', video.paused, 'currentTime:', video.currentTime);

    switch (command.action) {
        case 'play-pause':
            console.log('[YT Remote] Play-pause command - current state:', video.paused ? 'PAUSED' : 'PLAYING');
            if (video.paused) {
                console.log('[YT Remote] Attempting to PLAY video...');
                video.play().then(() => {
                    console.log('[YT Remote] Play SUCCESS');
                }).catch(err => {
                    console.error('[YT Remote] Play FAILED:', err);
                });
            } else {
                console.log('[YT Remote] Attempting to PAUSE video...');
                video.pause();
                console.log('[YT Remote] Pause command sent');
            }
            break;

        case 'seek':
            if (command.value !== undefined) {
                video.currentTime = command.value;
            }
            break;

        case 'set-volume':
            if (command.value !== undefined) {
                video.volume = Math.max(0, Math.min(100, command.value)) / 100;
            }
            break;

        case 'next':
            const nextButton = document.querySelector('.ytp-next-button');
            if (nextButton) {
                nextButton.click();
            }
            break;

        case 'previous':
            // YouTube doesn't have a previous button, so restart the video
            video.currentTime = 0;
            break;

        default:
            console.warn('[YT Remote] Unknown command:', command.action);
    }

    // Send updated state immediately after command
    setTimeout(sendState, 100);
}

// Listen for commands from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXECUTE_COMMAND') {
        executeCommand(message.command);
        sendResponse({ success: true });
    }
    return true;
});

// Initialize
function init() {
    // Try to find video element
    if (!findVideoElement()) {
        // Retry after a delay if not found
        setTimeout(() => {
            if (findVideoElement()) {
                startMonitoring();
            }
        }, 2000);
    } else {
        startMonitoring();
    }

    // Watch for navigation changes on YouTube (SPA)
    const observer = new MutationObserver(() => {
        if (!video || !document.contains(video)) {
            console.log('[YT Remote] Video element changed, re-finding...');
            findVideoElement();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Start monitoring video state
function startMonitoring() {
    console.log('[YT Remote] Starting state monitoring');

    // Send initial state
    sendState();

    // Send state updates every 2 seconds
    if (stateInterval) {
        clearInterval(stateInterval);
    }

    stateInterval = setInterval(sendState, 2000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (stateInterval) {
        clearInterval(stateInterval);
    }
});
