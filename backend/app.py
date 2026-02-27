"""
Flask Backend for YouTube Remote Control
Coordinates between browser extension and mobile web UI
Uses WebSockets for real-time communication
"""

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import youtube_state
from volume_controller import get_volume_controller

app = Flask(__name__)
CORS(app)  # Enable CORS for browser extension communication

# Initialize SocketIO for WebSocket support
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Initialize volume controller
volume_ctrl = get_volume_controller()

# Track connected clients
extension_sid = None  # Extension socket ID
mobile_clients = set()  # Mobile UI socket IDs


# ============================================================================
# Web UI Routes
# ============================================================================

@app.route('/')
def index():
    """Serve the mobile control panel"""
    return render_template('index.html')


# ============================================================================
# WebSocket Events (Extension Communication)
# ============================================================================

@socketio.on('connect', namespace='/extension')
def extension_connect():
    """Extension WebSocket connection established"""
    global extension_sid
    extension_sid = request.sid
    print(f'[WebSocket] Extension connected: {extension_sid}')
    emit('connected', {'status': 'success'})


@socketio.on('disconnect', namespace='/extension')
def extension_disconnect():
    """Extension WebSocket disconnected"""
    global extension_sid
    print(f'[WebSocket] Extension disconnected: {extension_sid}')
    extension_sid = None


@socketio.on('video_state', namespace='/extension')
def handle_video_state(data):
    """
    Extension sends current YouTube video state in real-time
    Broadcasts to all connected mobile clients
    """
    try:
        youtube_state.update_state(data)
        # Broadcast state to all mobile clients
        socketio.emit('youtube_state', data, namespace='/mobile')
        return {'status': 'success'}
    except Exception as e:
        print(f'[WebSocket] Error handling video state: {e}')
        return {'status': 'error', 'message': str(e)}


# ============================================================================
# Status API (Mobile UI)
# ============================================================================

@app.route('/api/status', methods=['GET'])
def get_status():
    """
    Get current YouTube state and system volume
    Called by mobile UI to refresh status
    """
    try:
        yt_state = youtube_state.get_state()
        system_volume = volume_ctrl.get_system_volume()
        system_muted = volume_ctrl.get_mute_state()

        return jsonify({
            'youtube': yt_state,
            'system': {
                'volume': system_volume if system_volume is not None else 50,
                'muted': system_muted if system_muted is not None else False
            }
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# WebSocket Events (Mobile UI Communication)
# ============================================================================

@socketio.on('connect', namespace='/mobile')
def mobile_connect():
    """Mobile client WebSocket connection established"""
    mobile_clients.add(request.sid)
    print(f'[WebSocket] Mobile client connected: {request.sid} (Total: {len(mobile_clients)})')

    # Send current state immediately
    current_state = youtube_state.get_state()
    system_volume = volume_ctrl.get_system_volume()
    system_muted = volume_ctrl.get_mute_state()

    emit('initial_state', {
        'youtube': current_state,
        'system': {
            'volume': system_volume if system_volume is not None else 50,
            'muted': system_muted if system_muted is not None else False
        }
    })


@socketio.on('disconnect', namespace='/mobile')
def mobile_disconnect():
    """Mobile client WebSocket disconnected"""
    mobile_clients.discard(request.sid)
    print(f'[WebSocket] Mobile client disconnected: {request.sid} (Total: {len(mobile_clients)})')


@socketio.on('youtube_command', namespace='/mobile')
def handle_youtube_command(data):
    """
    Mobile UI sends YouTube control command
    Forwards immediately to extension via WebSocket
    """
    global extension_sid

    if not extension_sid:
        return {'status': 'error', 'message': 'Extension not connected'}

    try:
        command = data.get('command')
        print(f'[WebSocket] Forwarding command to extension: {command}')

        # Send command directly to extension via WebSocket
        socketio.emit('execute_command', command, namespace='/extension', to=extension_sid)

        return {'status': 'success'}
    except Exception as e:
        print(f'[WebSocket] Error handling YouTube command: {e}')
        return {'status': 'error', 'message': str(e)}


# ============================================================================
# YouTube Control API (Mobile UI) - Legacy HTTP endpoints for compatibility
# ============================================================================

@app.route('/api/youtube/play-pause', methods=['POST'])
def youtube_play_pause():
    """Toggle YouTube playback"""
    global extension_sid

    if not extension_sid:
        return jsonify({'status': 'error', 'message': 'Extension not connected'}), 503

    try:
        socketio.emit('execute_command', {'action': 'play-pause'}, namespace='/extension', to=extension_sid)
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/youtube/seek', methods=['POST'])
def youtube_seek():
    """Seek to specific time in video"""
    global extension_sid

    if not extension_sid:
        return jsonify({'status': 'error', 'message': 'Extension not connected'}), 503

    try:
        data = request.get_json()
        time = data.get('time', 0)
        socketio.emit('execute_command', {'action': 'seek', 'value': time}, namespace='/extension', to=extension_sid)
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/youtube/set-volume', methods=['POST'])
def youtube_set_volume():
    """Set YouTube player volume"""
    global extension_sid

    if not extension_sid:
        return jsonify({'status': 'error', 'message': 'Extension not connected'}), 503

    try:
        data = request.get_json()
        volume = data.get('volume', 100)
        socketio.emit('execute_command', {'action': 'set-volume', 'value': volume}, namespace='/extension', to=extension_sid)
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/youtube/next', methods=['POST'])
def youtube_next():
    """Skip to next video"""
    global extension_sid

    if not extension_sid:
        return jsonify({'status': 'error', 'message': 'Extension not connected'}), 503

    try:
        socketio.emit('execute_command', {'action': 'next'}, namespace='/extension', to=extension_sid)
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/youtube/previous', methods=['POST'])
def youtube_previous():
    """Go to previous video"""
    global extension_sid

    if not extension_sid:
        return jsonify({'status': 'error', 'message': 'Extension not connected'}), 503

    try:
        socketio.emit('execute_command', {'action': 'previous'}, namespace='/extension', to=extension_sid)
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# System Volume Control API (Mobile UI)
# ============================================================================

@app.route('/api/system/volume', methods=['POST'])
def set_system_volume():
    """Set Windows system volume"""
    try:
        data = request.get_json()
        volume = data.get('volume', 50)
        success = volume_ctrl.set_system_volume(volume)
        if success:
            return jsonify({'status': 'success', 'volume': volume}), 200
        else:
            return jsonify({'status': 'error', 'message': 'Failed to set volume'}), 500
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/system/mute', methods=['POST'])
def toggle_system_mute():
    """Toggle system mute"""
    try:
        new_mute = volume_ctrl.toggle_mute()
        if new_mute is not None:
            return jsonify({'status': 'success', 'muted': new_mute}), 200
        else:
            return jsonify({'status': 'error', 'message': 'Failed to toggle mute'}), 500
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ============================================================================
# Main
# ============================================================================

if __name__ == '__main__':
    print("=" * 60)
    print("YouTube Remote Control - Flask Backend with WebSockets")
    print("=" * 60)
    print("\nServer starting...")
    print(f"Local access: http://localhost:5000")
    print(f"Network access: http://<your-pc-ip>:5000")
    print("\nWebSocket namespaces:")
    print("  - /extension : Browser extension connection")
    print("  - /mobile    : Mobile UI connection")
    print("\nInstall browser extension and configure backend URL")
    print("Then access control panel from mobile device")
    print("\nPress Ctrl+C to stop")
    print("=" * 60)

    # Run on all interfaces to allow network access with WebSocket support
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
