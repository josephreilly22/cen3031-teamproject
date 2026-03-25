# Imports
import os
from pathlib import Path

# Variables

# Functions
def load_env():
    current = Path(__file__).resolve()

    for parent in current.parents:
        env_path = parent / ".env"
        if not env_path.exists(): continue

        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line: continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()

            if key and key not in os.environ: os.environ[key] = value

        return env_path

    return None

# Initialize
__all__ = ["load_env"]