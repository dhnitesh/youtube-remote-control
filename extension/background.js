// Background Service Worker
// Coordinates between content script and Flask backend using WebSockets

console.log('[YT Remote] Background service worker started');

const DEFAULT_BACKEND_URL = 'http://localhost:5000';
let backendUrl = DEFAULT_BACKEND_URL;
let socket = null;
let reconnectInterval = null;
let lastVideoState = null;
let stateUpdateInterval = null;

// Load backend URL from storage
chrome.storage.local.get(['backendUrl'], (result) => {
    if (result.backendUrl) {
        backendUrl = result.backendUrl;
        console.log('[YT Remote] Backend URL loaded:', backendUrl);
    }
    startBackgroundTasks();
});

// Listen for backend URL updates
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.backendUrl) {
        backendUrl = changes.backendUrl.newValue;
        console.log('[YT Remote] Backend URL updated:', backendUrl);
        // Restart background tasks with new URL
        stopBackgroundTasks();
        startBackgroundTasks();
    }
});

// Connect to WebSocket server
function connectWebSocket() {
    try {
        const wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://');
        const socketUrl = `${wsUrl}/socket.io/?EIO=4&transport=websocket&namespace=/extension`;

        console.log('[YT Remote] Connecting to WebSocket:', socketUrl);

        socket = new WebSocket(socketUrl);

        socket.onopen = () => {
            console.log('[YT Remote] ✅ WebSocket connected!');
            chrome.storage.local.set({ connected: true });

            // Send initial handshake (Socket.IO protocol)
            socket.send('40/extension,');

            // Start sending state updates
            startStateUpdates();
        };

        socket.onmessage = (event) => {
            handleWebSocketMessage(event.data);
        };

        socket.onerror = (error) => {
            console.error('[YT Remote] WebSocket error:', error);
            chrome.storage.local.set({ connected: false });
        };

        socket.onclose = () => {
            console.log('[YT Remote] WebSocket disconnected. Reconnecting in 3 seconds...');
            chrome.storage.local.set({ connected: false });
            socket = null;

            // Stop state updates
            if (stateUpdateInterval) {
                clearInterval(stateUpdateInterval);
                stateUpdateInterval = null;
            }

            // Attempt to reconnect
            setTimeout(connectWebSocket, 3000);
        };
    } catch (error) {
        console.error('[YT Remote] Failed to create WebSocket:', error);
        setTimeout(connectWebSocket, 3000);
    }
}

// Handle incoming WebSocket messages
function handleWebSocketMessage(data) {
    // Socket.IO protocol parsing
    if (data.startsWith('42/extension,')) {
        const jsonData = data.substring(13); // Remove '42/extension,'
        try {
            const [eventName, payload] = JSON.parse(jsonData);

            if (eventName === 'execute_command') {
                console.log('[YT Remote] ========================================');
                console.log('[YT Remote] Received command via WebSocket');
                console.log('[YT Remote] Command:', JSON.stringify(payload));
                console.log('[YT Remote] ========================================');

                sendCommandToContentScript(payload);
            }
        } catch (error) {
            console.error('[YT Remote] Error parsing WebSocket message:', error);
        }
    }
}

// Send video state to Flask backend via WebSocket
function sendStateToBackend(state) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
    }

    try {
        // Socket.IO protocol: 42/extension,["event_name", data]
        const message = `42/extension,${JSON.stringify(['video_state', state])}`;
        socket.send(message);
    } catch (error) {
        console.error('[YT Remote] Error sending state to backend:', error);
    }
}

// Start periodic state updates
function startStateUpdates() {
    if (stateUpdateInterval) {
        clearInterval(stateUpdateInterval);
    }

    // Send state every 2 seconds
    stateUpdateInterval = setInterval(() => {
        if (lastVideoState) {
            sendStateToBackend(lastVideoState);
        }
    }, 2000);
}

// Send command to content script
async function sendCommandToContentScript(command) {
    try {
        // Find YouTube tab
        const tabs = await chrome.tabs.query({ url: '*://www.youtube.com/watch*' });

        console.log('[YT Remote] Found', tabs.length, 'YouTube tabs');

        if (tabs.length === 0) {
            console.warn('[YT Remote] No YouTube tab found - make sure you have a YouTube video open');
            return;
        }

        // Send to the first YouTube tab (or active one if multiple)
        const targetTab = tabs.find(tab => tab.active) || tabs[0];

        console.log('[YT Remote] Sending command to tab:', targetTab.id, targetTab.url);
        console.log('[YT Remote] Command:', JSON.stringify(command));

        await chrome.tabs.sendMessage(targetTab.id, {
            type: 'EXECUTE_COMMAND',
            command: command
        });

        console.log('[YT Remote] Command sent successfully to content script');
    } catch (error) {
        console.error('[YT Remote] Error sending command to content script:', error);
    }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'VIDEO_STATE') {
        lastVideoState = message.data;
        // Don't send every state update, let the interval handle it
        sendResponse({ received: true });
    }
    return true;
});

// Start background tasks
function startBackgroundTasks() {
    console.log('[YT Remote] Starting WebSocket connection');
    connectWebSocket();
}

// Stop background tasks
function stopBackgroundTasks() {
    console.log('[YT Remote] Stopping background tasks');

    if (stateUpdateInterval) {
        clearInterval(stateUpdateInterval);
        stateUpdateInterval = null;
    }

    if (socket) {
        socket.close();
        socket = null;
    }
}

// Handle extension lifecycle
chrome.runtime.onSuspend.addListener(() => {
    console.log('[YT Remote] Service worker suspending');
    stopBackgroundTasks();
});

// Test backend connection
async function testConnection(url) {
    try {
        const response = await fetch(`${url}/api/status`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        return response.ok;
    } catch (error) {
        console.error('[YT Remote] Connection test failed:', error);
        return false;
    }
}

// Export for popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TEST_CONNECTION') {
        testConnection(message.url).then(result => {
            sendResponse({ connected: result });
        });
        return true; // Indicate async response
    }
});
