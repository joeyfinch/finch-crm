import sys
import os

# Add the current directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

# Configure production environment variables
os.environ['FINCH_ADMIN_PASSWORD'] = 'finch2026'
os.environ['FLASK_SECRET_KEY'] = 'finch-secret-key-192837465'

# Phusion Passenger looks for the global variable 'application'
from app import app as application
