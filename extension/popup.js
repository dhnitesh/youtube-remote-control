// Popup Script - Extension Configuration UI

const DEFAULT_BACKEND_URL = 'http://localhost:5000';

const elements = {
    form: document.getElementById('settingsForm'),
    backendUrlInput: document.getElementById('backendUrl'),
    saveBtn: document.getElementById('saveBtn'),
    status: document.getElementById('status'),
    statusText: document.getElementById('statusText'),
    message: document.getElementById('message')
};

// Load saved settings
function loadSettings() {
    chrome.storage.local.get(['backendUrl', 'connected'], (result) => {
        const url = result.backendUrl || DEFAULT_BACKEND_URL;
        elements.backendUrlInput.value = url;

        // Update connection status
        updateConnectionStatus(result.connected || false);
    });
}

// Update connection status UI
function updateConnectionStatus(connected) {
    if (connected) {
        elements.status.className = 'status connected';
        elements.statusText.textContent = 'Connected to backend';
    } else {
        elements.status.className = 'status error';
        elements.statusText.textContent = 'Not connected';
    }
}

// Show message
function showMessage(text, type = 'success') {
    elements.message.textContent = text;
    elements.message.className = `message ${type}`;
    elements.message.style.display = 'block';

    setTimeout(() => {
        elements.message.style.display = 'none';
    }, 3000);
}

// Test connection to backend
async function testConnection(url) {
    try {
        const response = await fetch(`${url}/api/status`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        return response.ok;
    } catch (error) {
        console.error('Connection test failed:', error);
        return false;
    }
}

// Save settings
async function saveSettings(event) {
    event.preventDefault();

    const url = elements.backendUrlInput.value.trim();

    if (!url) {
        showMessage('Please enter a backend URL', 'error');
        return;
    }

    // Validate URL format
    try {
        new URL(url);
    } catch (error) {
        showMessage('Invalid URL format', 'error');
        return;
    }

    // Disable button while testing
    elements.saveBtn.disabled = true;
    elements.saveBtn.textContent = 'Testing connection...';

    // Test connection
    const connected = await testConnection(url);

    if (connected) {
        // Save to storage
        await chrome.storage.local.set({
            backendUrl: url,
            connected: true
        });

        updateConnectionStatus(true);
        showMessage('Settings saved successfully!', 'success');
    } else {
        await chrome.storage.local.set({
            backendUrl: url,
            connected: false
        });

        updateConnectionStatus(false);
        showMessage('Could not connect to backend. Please check the URL and make sure the Flask server is running.', 'error');
    }

    // Re-enable button
    elements.saveBtn.disabled = false;
    elements.saveBtn.textContent = 'Save & Test Connection';
}

// Event listeners
elements.form.addEventListener('submit', saveSettings);

// Load settings on popup open
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    // Check connection status
    chrome.storage.local.get(['connected'], (result) => {
        updateConnectionStatus(result.connected || false);
    });
});

// Listen for storage changes (from background script)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.connected) {
        updateConnectionStatus(changes.connected.newValue);
    }
});
