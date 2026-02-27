// YouTube Remote Control - Mobile UI Controller with WebSocket

const API_BASE = window.location.origin;

let socket = null;
let isSystemMuted = false;

// DOM Elements
const elements = {
    connectionStatus: document.getElementById('connectionStatus'),
    statusText: document.getElementById('statusText'),
    thumbnail: document.getElementById('thumbnail'),
    noThumbnail: document.getElementById('noThumbnail'),
    videoTitle: document.getElementById('videoTitle'),
    currentTime: document.getElementById('currentTime'),
    duration: document.getElementById('duration'),
    progressFill: document.getElementById('progressFill'),
    progressContainer: document.getElementById('progressContainer'),
    playPauseBtn: document.getElementById('playPauseBtn'),
    playIcon: document.getElementById('playIcon'),
    pauseIcon: document.getElementById('pauseIcon'),
    previousBtn: document.getElementById('previousBtn'),
    nextBtn: document.getElementById('nextBtn'),
    youtubeVolume: document.getElementById('youtubeVolume'),
    youtubeVolumeValue: document.getElementById('youtubeVolumeValue'),
    systemVolume: document.getElementById('systemVolume'),
    systemVolumeValue: document.getElementById('systemVolumeValue'),
    muteBtn: document.getElementById('muteBtn'),
    muteIcon: document.getElementById('muteIcon'),
    unmuteIcon: document.getElementById('unmuteIcon'),
    muteText: document.getElementById('muteText'),
    lastUpdate: document.getElementById('lastUpdate')
};

// Utility Functions
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateConnectionStatus(connected, error = false) {
    if (error) {
        elements.connectionStatus.className = 'connection-status error';
        elements.statusText.textContent = 'Connection Error';
    } else if (connected) {
        elements.connectionStatus.className = 'connection-status connected';
        elements.statusText.textContent = 'Connected';
    } else {
        elements.connectionStatus.className = 'connection-status';
        elements.statusText.textContent = 'Connecting...';
    }
}

// WebSocket connection
function connectWebSocket() {
    console.log('Connecting to WebSocket server...');

    socket = io('/mobile', {
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('✅ WebSocket connected!');
        updateConnectionStatus(true);
    });

    socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
        updateConnectionStatus(false, false);
    });

    socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        updateConnectionStatus(false, true);
    });

    // Receive initial state when connected
    socket.on('initial_state', (data) => {
        console.log('Received initial state:', data);
        updateUI(data);
        updateLastUpdate();
    });

    // Receive real-time YouTube state updates
    socket.on('youtube_state', (data) => {
        console.log('Received YouTube state update');
        updateUI({
            youtube: data,
            system: {
                volume: elements.systemVolume.value,
                muted: isSystemMuted
            }
        });
        updateLastUpdate();
    });
}

// Send command via WebSocket
function sendCommand(action, value = undefined) {
    if (!socket || !socket.connected) {
        console.error('WebSocket not connected');
        return;
    }

    const command = { action };
    if (value !== undefined) {
        command.value = value;
    }

    console.log('Sending command:', command);
    socket.emit('youtube_command', { command });
}

// Update last update timestamp
function updateLastUpdate() {
    const now = new Date();
    elements.lastUpdate.textContent = now.toLocaleTimeString();
}

// UI Update Functions
function updateUI(data) {
    const { youtube, system } = data;

    // Update video info
    if (youtube.title && youtube.title !== 'No video playing') {
        elements.videoTitle.textContent = youtube.title;

        // Update thumbnail
        if (youtube.thumbnail) {
            elements.thumbnail.src = youtube.thumbnail;
            elements.thumbnail.style.display = 'block';
            elements.noThumbnail.style.display = 'none';
        } else {
            elements.thumbnail.style.display = 'none';
            elements.noThumbnail.style.display = 'flex';
        }
    } else {
        elements.videoTitle.textContent = 'No video playing';
        elements.thumbnail.style.display = 'none';
        elements.noThumbnail.style.display = 'flex';
    }

    // Update time and progress
    elements.currentTime.textContent = formatTime(youtube.current_time);
    elements.duration.textContent = formatTime(youtube.duration);

    const progress = youtube.duration > 0
        ? (youtube.current_time / youtube.duration) * 100
        : 0;
    elements.progressFill.style.width = `${progress}%`;

    // Update play/pause button
    if (youtube.playing) {
        elements.playIcon.style.display = 'none';
        elements.pauseIcon.style.display = 'block';
    } else {
        elements.playIcon.style.display = 'block';
        elements.pauseIcon.style.display = 'none';
    }

    // Update YouTube volume (without triggering change event)
    if (Math.abs(elements.youtubeVolume.value - youtube.volume) > 1) {
        elements.youtubeVolume.value = Math.round(youtube.volume);
        elements.youtubeVolumeValue.textContent = `${Math.round(youtube.volume)}%`;
    }

    // Update system volume
    if (Math.abs(elements.systemVolume.value - system.volume) > 1) {
        elements.systemVolume.value = Math.round(system.volume);
        elements.systemVolumeValue.textContent = `${Math.round(system.volume)}%`;
    }

    // Update mute state
    isSystemMuted = system.muted;
    updateMuteButton();
}

function updateMuteButton() {
    if (isSystemMuted) {
        elements.muteIcon.style.display = 'block';
        elements.unmuteIcon.style.display = 'none';
        elements.muteText.textContent = 'Unmute System';
    } else {
        elements.muteIcon.style.display = 'none';
        elements.unmuteIcon.style.display = 'block';
        elements.muteText.textContent = 'Mute System';
    }
}

// Event Handlers
function setupEventListeners() {
    // Play/Pause
    elements.playPauseBtn.addEventListener('click', () => {
        sendCommand('play-pause');
    });

    // Previous
    elements.previousBtn.addEventListener('click', () => {
        sendCommand('previous');
    });

    // Next
    elements.nextBtn.addEventListener('click', () => {
        sendCommand('next');
    });

    // YouTube Volume
    let youtubeVolumeTimeout;
    elements.youtubeVolume.addEventListener('input', (e) => {
        const volume = e.target.value;
        elements.youtubeVolumeValue.textContent = `${volume}%`;

        // Debounce volume changes
        clearTimeout(youtubeVolumeTimeout);
        youtubeVolumeTimeout = setTimeout(() => {
            sendCommand('set-volume', parseInt(volume));
        }, 150);
    });

    // System Volume (using HTTP API for system control)
    let systemVolumeTimeout;
    elements.systemVolume.addEventListener('input', (e) => {
        const volume = e.target.value;
        elements.systemVolumeValue.textContent = `${volume}%`;

        // Debounce volume changes
        clearTimeout(systemVolumeTimeout);
        systemVolumeTimeout = setTimeout(() => {
            fetch(`${API_BASE}/api/system/volume`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ volume: parseInt(volume) })
            }).catch(err => console.error('Error setting system volume:', err));
        }, 150);
    });

    // Mute Toggle (using HTTP API for system control)
    elements.muteBtn.addEventListener('click', () => {
        fetch(`${API_BASE}/api/system/mute`, {
            method: 'POST'
        }).then(res => res.json())
          .then(data => {
              if (data.muted !== undefined) {
                  isSystemMuted = data.muted;
                  updateMuteButton();
              }
          })
          .catch(err => console.error('Error toggling mute:', err));
    });

    // Progress Bar Click
    elements.progressContainer.addEventListener('click', (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;

        // Get duration from the UI
        const durationText = elements.duration.textContent;
        const [mins, secs] = durationText.split(':').map(Number);
        const totalSeconds = (mins * 60) + secs;

        const seekTime = totalSeconds * percentage;
        sendCommand('seek', seekTime);
    });
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('YouTube Remote Control - Initializing with WebSocket...');
    setupEventListeners();
    connectWebSocket();
    console.log('Ready!');
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (socket) {
        socket.disconnect();
    }
});
