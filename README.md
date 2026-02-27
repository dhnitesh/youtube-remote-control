# 🎬 YouTube Remote Control

Control YouTube playback on your Windows PC from any device on your local network (phone, tablet, etc.)

## ✨ Features

- 🎮 **Remote Control**: Control YouTube from your phone/tablet
- 📱 **Mobile-Friendly**: Responsive web interface optimized for touch
- 🔊 **Dual Volume Control**: Control both YouTube player volume AND Windows system volume
- 📺 **Video Information**: See current video title, thumbnail, and progress
- ⏯️ **Full Playback Control**: Play/pause, next, previous, and seek
- 🌐 **Local Network Only**: Private and secure, no internet required

## 🏗️ Architecture

```
┌─────────────────┐
│  Mobile Device  │ ← Web UI controls
└────────┬────────┘
         │ HTTP (Flask API)
         ↓
┌─────────────────┐
│  Flask Backend  │ ← Coordinates everything
│   (Windows PC)  │ ← Controls system volume
└────────┬────────┘
         │ HTTP (REST API)
         ↓
┌─────────────────┐
│Browser Extension│ ← Monitors YouTube
│  (Content Script)│ ← Controls playback
└─────────────────┘
         │
         ↓
    YouTube.com
```

## 📋 Requirements

- **Windows PC** (for system volume control via pycaw)
- **Python 3.8+**
- **Chrome or Firefox** browser
- **Devices on the same local network** (WiFi)

## 🚀 Installation

### Step 1: Install Backend

1. **Navigate to the backend folder:**
   ```bash
   cd youtube-remote-control/backend
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Flask server:**
   ```bash
   python app.py
   ```

   The server will start on `http://0.0.0.0:5000`

   You should see output like:
   ```
   ============================================================
   YouTube Remote Control - Flask Backend
   ============================================================

   Server starting...
   Local access: http://localhost:5000
   Network access: http://<your-pc-ip>:5000

   Install browser extension and configure backend URL
   Then access control panel from mobile device

   Press Ctrl+C to stop
   ============================================================
   ```

4. **Find your PC's IP address:**
   ```bash
   ipconfig
   ```

   Look for "IPv4 Address" under your active network adapter (usually something like `192.168.1.100`)

### Step 2: Install Browser Extension

#### For Chrome:

1. Open Chrome and navigate to: `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the `youtube-remote-control/extension` folder
5. The extension should now appear in your toolbar

#### For Firefox:

1. Open Firefox and navigate to: `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on"**
3. Navigate to `youtube-remote-control/extension` and select `manifest.json`
4. The extension will be loaded (note: temporary extensions are removed when Firefox closes)

### Step 3: Generate Extension Icons (Optional)

The extension needs icons to display properly. You have two options:

#### Option A: Generate Basic Icons (Recommended)
```bash
cd youtube-remote-control/extension
python generate_icons.py
```

#### Option B: Use Your Own Icons
Place your own PNG icons in `extension/icons/`:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

### Step 4: Configure Extension

1. Click the extension icon in your browser toolbar
2. Enter your Flask backend URL:
   - For local testing: `http://localhost:5000`
   - For network access: `http://192.168.x.x:5000` (use your PC's IP)
3. Click **"Save & Test Connection"**
4. Verify the status shows "Connected to backend"

## 📱 Usage

### 1. Start Playing YouTube

1. Open YouTube in your browser (Chrome/Firefox with extension installed)
2. Play any video
3. The extension will automatically start monitoring the video

### 2. Access Mobile Control Panel

On your phone/tablet:

1. Connect to the **same WiFi network** as your PC
2. Open a web browser
3. Navigate to: `http://<your-pc-ip>:5000`
   - Example: `http://192.168.1.100:5000`

### 3. Control Playback

From the mobile interface, you can:

- **View** current video information (title, thumbnail, time)
- **Play/Pause** the video
- **Skip** to next/previous video
- **Seek** by clicking on the progress bar
- **Adjust** YouTube player volume
- **Control** Windows system volume
- **Mute/Unmute** system audio

### 4. Status Updates

The mobile UI automatically refreshes every 2 seconds to show:
- Current playback state (playing/paused)
- Video progress
- Volume levels

## 🔧 Troubleshooting

### Extension Not Working

**Problem**: Extension doesn't detect YouTube video

**Solutions**:
- Refresh the YouTube page
- Make sure you're on a `/watch` page (not homepage or search)
- Check browser console (F12) for errors
- Reload the extension

### Connection Issues

**Problem**: Mobile device can't connect to Flask server

**Solutions**:
- Verify both devices are on the same WiFi network
- Check Windows Firewall isn't blocking port 5000:
  ```bash
  # Allow port 5000 in Windows Firewall
  netsh advfirewall firewall add rule name="Flask YouTube Control" dir=in action=allow protocol=TCP localport=5000
  ```
- Try accessing from PC first: `http://localhost:5000`
- Verify Flask server is running (check terminal)

**Problem**: "Connection Error" in mobile UI

**Solutions**:
- Ensure Flask backend is running
- Verify the IP address is correct
- Check extension is installed and configured
- Verify extension shows "Connected" status

### Volume Control Issues

**Problem**: System volume control doesn't work

**Solutions**:
- Ensure you're running on Windows (pycaw requires Windows)
- Try restarting the Flask server
- Check Python has permissions to access audio devices

### Commands Not Executing

**Problem**: Buttons don't control the video

**Solutions**:
- Verify extension is installed and enabled
- Check extension popup shows "Connected"
- Ensure YouTube tab is open
- Look for errors in extension console (chrome://extensions → Details → Errors)

## 🌐 API Endpoints

The Flask backend exposes these API endpoints:

### YouTube Control
- `POST /api/youtube/state` - Update video state (extension → backend)
- `GET /api/youtube/command` - Poll for commands (extension ← backend)
- `POST /api/youtube/play-pause` - Toggle playback
- `POST /api/youtube/seek` - Seek to position `{"time": seconds}`
- `POST /api/youtube/set-volume` - Set volume `{"volume": 0-100}`
- `POST /api/youtube/next` - Next video
- `POST /api/youtube/previous` - Previous video

### System Control
- `GET /api/status` - Get current state (YouTube + system)
- `POST /api/system/volume` - Set system volume `{"volume": 0-100}`
- `POST /api/system/mute` - Toggle system mute

## 🔒 Security Notes

- This system is designed for **local network use only**
- No authentication is implemented (assumes private trusted network)
- The Flask server is accessible to anyone on your local network
- Do not expose the Flask server to the internet without adding authentication

## 🛠️ Development

### Project Structure

```
youtube-remote-control/
├── backend/                      # Flask backend
│   ├── app.py                    # Main Flask application
│   ├── requirements.txt          # Python dependencies
│   ├── volume_controller.py      # Windows volume control
│   ├── youtube_state.py          # State management
│   ├── templates/
│   │   └── index.html            # Mobile UI
│   └── static/
│       ├── css/style.css         # Responsive styles
│       └── js/control.js         # UI logic
│
└── extension/                    # Browser extension
    ├── manifest.json             # Extension manifest
    ├── content.js                # YouTube page script
    ├── background.js             # Backend communication
    ├── popup.html                # Settings UI
    ├── popup.js                  # Settings logic
    ├── generate_icons.py         # Icon generator
    └── icons/                    # Extension icons
```

### Running in Development

1. **Backend** (with auto-reload):
   ```bash
   cd backend
   python app.py
   ```
   Flask runs with `debug=True` by default

2. **Extension**:
   - Make changes to extension files
   - Go to `chrome://extensions/`
   - Click the refresh icon on your extension

## 🎯 Future Enhancements

Potential improvements (not currently implemented):

- [ ] WebSocket support for real-time updates (remove polling)
- [ ] Support for YouTube Music
- [ ] Playlist management
- [ ] Queue controls
- [ ] Support for other video platforms (Twitch, Vimeo)
- [ ] Authentication/PIN protection
- [ ] HTTPS with self-signed certificates
- [ ] Desktop notifications for track changes

## 📄 License

This is a personal project for educational purposes. Feel free to modify and use as needed.

## 🤝 Contributing

This is a simple local project, but suggestions and improvements are welcome!

## ❓ FAQ

**Q: Can I use this over the internet?**
A: Not recommended. This is designed for local network use only. You would need to add authentication and HTTPS for internet use.

**Q: Does this work on Mac/Linux?**
A: The extension and web UI work on any platform, but system volume control (pycaw) only works on Windows.

**Q: Can I control multiple YouTube tabs?**
A: Currently it controls the first/active YouTube tab. Multi-tab support could be added.

**Q: Why not use WebSockets instead of polling?**
A: Polling is simpler for a local network application. WebSockets would be better for real-time updates but add complexity.

**Q: Can I run this on my phone as the host?**
A: No, the Flask backend needs to run on the PC where the browser with YouTube is running.

## 🐛 Reporting Issues

If you encounter issues:

1. Check the troubleshooting section
2. Check browser console (F12) for errors
3. Check Flask server logs in terminal
4. Check extension errors at `chrome://extensions`

---

**Made with ❤️ for controlling YouTube from the couch!**
