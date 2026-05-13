#!/usr/bin/env python3
import requests
import sys

def main():
    if len(sys.argv) < 2:
        print('Usage: python header_checker.py <url>')
        return
    url = sys.argv[1]
    try:
        r = requests.get(url, timeout=10)
        print(f'Status: {r.status_code}')
        for k, v in r.headers.items():
            print(f'{k}: {v}')
    except Exception as e:
        print(f'Error: {e}')

if __name__ == '__main__':
    main()