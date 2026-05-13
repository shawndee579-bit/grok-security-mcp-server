#!/bin/bash
if [ -z "$1" ]; then
  echo "Usage: ./ping_test.sh <host>"
  exit 1
fi

echo "Pinging $1..."
ping -c 4 "$1"