#!/usr/bin/env python3
import subprocess
import sys

def main():
    print("=== Installed Python Packages ===")
    try:
        result = subprocess.run([sys.executable, '-m', 'pip', 'list'], capture_output=True, text=True)
        print(result.stdout)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()