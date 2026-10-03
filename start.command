#!/usr/bin/env bash

# Resolve directory of this script (handles spaces in path)
cd "$(cd "$(dirname "$0")" && pwd)"

echo "======================================================================"
echo "          Starting e-chemEd Engineering Chemistry Platform            "
echo "======================================================================"
echo ""

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js is not installed or not in PATH."
    echo "Node.js 18 or higher is required."
    echo "Opening https://nodejs.org in your browser..."
    open "https://nodejs.org" 2>/dev/null || xdg-open "https://nodejs.org" 2>/dev/null
    read -p "Press Enter to exit..."
    exit 1
fi

# 2. Check Node version >= 18
NODE_STATUS=$(node -e "const v = parseInt(process.versions.node.split('.')[0], 10); console.log(v < 18 ? 'OUTDATED' : 'OK');")
if [ "$NODE_STATUS" = "OUTDATED" ]; then
    echo "[ERROR] Your Node.js version is older than 18."
    echo "Node.js 18 or higher is required."
    open "https://nodejs.org" 2>/dev/null || xdg-open "https://nodejs.org" 2>/dev/null
    read -p "Press Enter to exit..."
    exit 1
fi

# 3. Check backend/node_modules
if [ ! -d "backend/node_modules" ]; then
    echo "[SETUP] Installing backend dependencies (first-time setup)..."
    cd backend
    if ! npm install; then
        echo ""
        echo "======================================================================"
        echo "[ERROR] 'npm install' failed in backend directory!"
        echo "Please ensure you are using Node LTS (v20 or v22) and standard build tools."
        echo "======================================================================"
        cd ..
        read -p "Press Enter to exit..."
        exit 1
    fi
    cd ..
fi

# 4. Initialize .env if missing
node scripts/init-env.js

# 5. Check ports 3000 and 3001
if ! node scripts/check-ports.js; then
    read -p "Press Enter to exit..."
    exit 1
fi

# 6. Launch Backend & Frontend servers and capture PIDs
node backend/server.js &
BACKEND_PID=$!

node scripts/serve-frontend.js &
FRONTEND_PID=$!

echo "BACKEND_PID=$BACKEND_PID" > .pids
echo "FRONTEND_PID=$FRONTEND_PID" >> .pids

# Clean shutdown function
cleanup() {
    echo ""
    echo "Stopping servers..."
    node scripts/kill-pids.js
    exit 0
}

trap cleanup INT TERM EXIT

# 7. Wait for backend health and auto-open browser
node scripts/wait-and-launch.js

# 8. Print LAN access info
node scripts/print-lan.js

echo "======================================================================"
echo "Press Enter or Ctrl+C to stop both e-chemEd servers and exit..."
echo "======================================================================"
read -r
