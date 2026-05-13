#!/usr/bin/env python3
import sys

def main():
    if len(sys.argv) < 2:
        print('Usage: python simple_fuzzer.py <target>')
        return
    print(f'[Simple Fuzzer] Target: {sys.argv[1]}')
    print('Add your real fuzzer logic here.')

if __name__ == '__main__':
    main()