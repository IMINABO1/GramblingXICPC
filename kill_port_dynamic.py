"""Find and kill all processes on port 8000."""
import subprocess
import re
import time

def get_pids_on_port(port=8000):
    """Get all PIDs listening on the given port."""
    result = subprocess.run(["netstat", "-ano"], capture_output=True, text=True)
    pids = set()
    for line in result.stdout.splitlines():
        if f":{port}" in line and "LISTENING" in line:
            parts = line.split()
            if parts:
                try:
                    pid = int(parts[-1])
                    pids.add(pid)
                except ValueError:
                    pass
    return pids

# Kill all processes on port 8000
pids = get_pids_on_port(8000)
print(f"Found {len(pids)} processes on port 8000: {pids}")

for pid in pids:
    try:
        subprocess.run(["taskkill", "/F", "/PID", str(pid)],
                      capture_output=True, check=False)
        print(f"Killed PID {pid}")
    except Exception as e:
        print(f"Failed to kill {pid}: {e}")

# Wait and verify
time.sleep(2)
remaining = get_pids_on_port(8000)
if remaining:
    print(f"WARNING: {len(remaining)} processes still on port 8000: {remaining}")
else:
    print("Port 8000 is now clear!")
