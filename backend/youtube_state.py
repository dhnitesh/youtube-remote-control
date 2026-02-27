"""
YouTube State Manager
Stores current YouTube video state and command queue in memory
"""

from threading import Lock
from datetime import datetime

# Global state storage
_state = {
    'title': 'No video playing',
    'thumbnail': '',
    'current_time': 0,
    'duration': 0,
    'playing': False,
    'volume': 100,
    'last_update': None
}

# Command queue
_commands = []

# Thread lock for thread-safe operations
_state_lock = Lock()
_command_lock = Lock()


def update_state(data):
    """
    Update YouTube state from extension

    Args:
        data (dict): State data from extension containing:
            - title: Video title
            - thumbnail: Thumbnail URL
            - current_time: Current playback time in seconds
            - duration: Video duration in seconds
            - playing: Boolean playback state
            - volume: Volume level 0-100
    """
    global _state
    with _state_lock:
        _state.update(data)
        _state['last_update'] = datetime.now().isoformat()


def get_state():
    """
    Get current YouTube state

    Returns:
        dict: Current state dictionary
    """
    with _state_lock:
        return _state.copy()


def add_command(command):
    """
    Add a command to the queue for extension to execute

    Args:
        command (dict): Command object containing:
            - action: Command action (play-pause, seek, set-volume, next, previous)
            - value: Optional value for the command (e.g., seek position, volume level)
    """
    global _commands
    with _command_lock:
        _commands.append(command)


def get_pending_commands():
    """
    Get all pending commands and clear the queue

    Returns:
        list: List of command dictionaries
    """
    global _commands
    with _command_lock:
        pending = _commands.copy()
        _commands.clear()
        return pending


def clear_state():
    """
    Reset state to defaults (useful when video stops or browser closes)
    """
    global _state
    with _state_lock:
        _state = {
            'title': 'No video playing',
            'thumbnail': '',
            'current_time': 0,
            'duration': 0,
            'playing': False,
            'volume': 100,
            'last_update': None
        }
