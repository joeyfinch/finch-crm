#!/bin/bash
# Finch Future Collectors CRM startup script

# Get current script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Ensure venv exists and is activated
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Setting up..."
    python3 -m venv venv
    venv/bin/pip install flask
fi

# Activate virtual environment
source venv/bin/activate

# Default port
export PORT=5001
export FINCH_ADMIN_PASSWORD="finch2026"
export FLASK_SECRET_KEY="finch-secret-key-192837465"

echo "============================================="
echo "Starting Finch Future Collectors CRM Server..."
echo "Access URLs:"
echo "- Visitor Registration Page: http://localhost:$PORT/"
echo "- Staff Dashboard Portal:    http://localhost:$PORT/admin"
echo "  Passcode to unlock:         $FINCH_ADMIN_PASSWORD"
echo "============================================="

# Start Flask application
if [ "$1" == "--prod" ]; then
    echo "Starting in PRODUCTION mode using Gunicorn..."
    venv/bin/gunicorn -w 4 -b 0.0.0.0:$PORT app:app
else
    echo "Starting in DEVELOPMENT mode..."
    venv/bin/python3 app.py
fi
