"""
Cross-platform System Volume Controller
Uses pycaw on Windows, osascript on macOS
"""

import platform
import subprocess

system = platform.system()


class VolumeController:
    """Cross-platform system volume controller"""

    def get_system_volume(self):
        if system == "Darwin":
            result = subprocess.run(
                ["osascript", "-e", "output volume of (get volume settings)"],
                capture_output=True, text=True
            )
            return int(result.stdout.strip()) if result.returncode == 0 else None
        elif system == "Windows":
            return self._windows_get_volume()
        return None

    def set_system_volume(self, level):
        level = max(0, min(100, int(level)))
        if system == "Darwin":
            result = subprocess.run(
                ["osascript", "-e", f"set volume output volume {level}"],
                capture_output=True, text=True
            )
            return result.returncode == 0
        elif system == "Windows":
            return self._windows_set_volume(level)
        return False

    def get_mute_state(self):
        if system == "Darwin":
            result = subprocess.run(
                ["osascript", "-e", "output muted of (get volume settings)"],
                capture_output=True, text=True
            )
            if result.returncode == 0:
                return result.stdout.strip() == "true"
            return None
        elif system == "Windows":
            return self._windows_get_mute()
        return None

    def set_mute(self, muted):
        if system == "Darwin":
            val = "true" if muted else "false"
            result = subprocess.run(
                ["osascript", "-e", f"set volume output muted {val}"],
                capture_output=True, text=True
            )
            return result.returncode == 0
        elif system == "Windows":
            return self._windows_set_mute(muted)
        return False

    def toggle_mute(self):
        current_mute = self.get_mute_state()
        if current_mute is None:
            return None
        new_mute = not current_mute
        if self.set_mute(new_mute):
            return new_mute
        return None

    # --- Windows helpers (lazy import to avoid errors on other platforms) ---

    def _get_windows_volume(self):
        if not hasattr(self, "_win_vol"):
            from ctypes import cast, POINTER
            from comtypes import CLSCTX_ALL
            from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
            devices = AudioUtilities.GetSpeakers()
            interface = devices.Activate(
                IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
            self._win_vol = cast(interface, POINTER(IAudioEndpointVolume))
        return self._win_vol

    def _windows_get_volume(self):
        try:
            vol = self._get_windows_volume()
            return int(vol.GetMasterVolumeLevelScalar() * 100)
        except Exception as e:
            print(f"Error getting volume: {e}")
            return None

    def _windows_set_volume(self, level):
        try:
            vol = self._get_windows_volume()
            vol.SetMasterVolumeLevelScalar(level / 100.0, None)
            return True
        except Exception as e:
            print(f"Error setting volume: {e}")
            return False

    def _windows_get_mute(self):
        try:
            vol = self._get_windows_volume()
            return bool(vol.GetMute())
        except Exception as e:
            print(f"Error getting mute state: {e}")
            return None

    def _windows_set_mute(self, muted):
        try:
            vol = self._get_windows_volume()
            vol.SetMute(1 if muted else 0, None)
            return True
        except Exception as e:
            print(f"Error setting mute: {e}")
            return False


# Global instance
_volume_controller = None


def get_volume_controller():
    global _volume_controller
    if _volume_controller is None:
        _volume_controller = VolumeController()
    return _volume_controller
