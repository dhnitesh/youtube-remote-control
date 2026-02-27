"""
Windows System Volume Controller
Uses pycaw to control Windows audio system
"""

from ctypes import cast, POINTER
from comtypes import CLSCTX_ALL
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume


class VolumeController:
    """Windows system volume controller using pycaw"""

    def __init__(self):
        """Initialize the volume controller"""
        try:
            devices = AudioUtilities.GetSpeakers()
            interface = devices.Activate(
                IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
            self.volume = cast(interface, POINTER(IAudioEndpointVolume))
        except Exception as e:
            print(f"Error initializing volume controller: {e}")
            self.volume = None

    def get_system_volume(self):
        """
        Get current system volume

        Returns:
            int: Volume level 0-100, or None if unavailable
        """
        if not self.volume:
            return None
        try:
            # Get volume as scalar (0.0 to 1.0)
            current_volume = self.volume.GetMasterVolumeLevelScalar()
            # Convert to percentage
            return int(current_volume * 100)
        except Exception as e:
            print(f"Error getting volume: {e}")
            return None

    def set_system_volume(self, level):
        """
        Set system volume

        Args:
            level (int): Volume level 0-100

        Returns:
            bool: True if successful, False otherwise
        """
        if not self.volume:
            return False
        try:
            # Clamp level between 0 and 100
            level = max(0, min(100, int(level)))
            # Convert to scalar (0.0 to 1.0)
            scalar_level = level / 100.0
            self.volume.SetMasterVolumeLevelScalar(scalar_level, None)
            return True
        except Exception as e:
            print(f"Error setting volume: {e}")
            return False

    def get_mute_state(self):
        """
        Check if system is muted

        Returns:
            bool: True if muted, False if not, None if unavailable
        """
        if not self.volume:
            return None
        try:
            return bool(self.volume.GetMute())
        except Exception as e:
            print(f"Error getting mute state: {e}")
            return None

    def set_mute(self, muted):
        """
        Set system mute state

        Args:
            muted (bool): True to mute, False to unmute

        Returns:
            bool: True if successful, False otherwise
        """
        if not self.volume:
            return False
        try:
            self.volume.SetMute(1 if muted else 0, None)
            return True
        except Exception as e:
            print(f"Error setting mute: {e}")
            return False

    def toggle_mute(self):
        """
        Toggle mute state

        Returns:
            bool: New mute state, or None if failed
        """
        current_mute = self.get_mute_state()
        if current_mute is None:
            return None
        new_mute = not current_mute
        if self.set_mute(new_mute):
            return new_mute
        return None


# Global instance
_volume_controller = None


def get_volume_controller():
    """
    Get or create the global volume controller instance

    Returns:
        VolumeController: The volume controller instance
    """
    global _volume_controller
    if _volume_controller is None:
        _volume_controller = VolumeController()
    return _volume_controller
