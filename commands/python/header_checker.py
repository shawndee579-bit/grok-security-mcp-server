#!/usr/bin/env python3
import requests
import sys

def main():
    if len(sys.argv) < 2:
        print("Usage: python header_checker.py <url>")
        return
    url = sys.argv[1]
    try:
        response = requests.get(url, timeout=10)
        print(f"Status Code: {response.status_code}")
        print("\nResponse Headers:")
        for key, value in response.headers.items():
            print(f"  {key}: {value}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()