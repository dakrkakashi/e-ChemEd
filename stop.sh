#!/usr/bin/env bash

cd "$(cd "$(dirname "$0")" && pwd)"

echo "======================================================"
echo "          Stopping e-chemEd Platform...               "
echo "======================================================"

node scripts/kill-pids.js
