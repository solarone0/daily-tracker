/**
 * Daily Tracker Configuration
 * Replace GOOGLE_SCRIPT_URL with your Google Apps Script Web App URL
 */

const CONFIG = {
    // Google Apps Script Web App URL
    // Instructions:
    // 1. Create a new Google Sheet
    // 2. Go to Extensions > Apps Script
    // 3. Paste the code from google-apps-script.gs
    // 4. Deploy as Web App and paste the URL here
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwRxEQdaI6B9cgZk38n1n-6shcINqE3K1gFy_0Dy1E_u4sUvw5unNzE5Qr8BCSZWOvRPw/exec',

    // Set to true once you've configured the Google Script URL
    USE_GOOGLE_SHEETS: true,

    // Local storage key for offline data
    LOCAL_STORAGE_KEY: 'daily-tracker-data'
};
