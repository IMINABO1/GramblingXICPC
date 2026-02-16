"""Kill all processes listening on port 8000."""
import subprocess
import sys

pids = [12556, 24768, 64448, 68324]

for pid in pids:
    try:
        subprocess.run(["taskkill", "/F", "/PID", str(pid)],
                      capture_output=True, check=False)
        print(f"Killed PID {pid}")
    except Exception as e:
        print(f"Failed to kill {pid}: {e}")

print("Done")
