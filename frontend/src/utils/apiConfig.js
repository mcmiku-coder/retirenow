/**
 * API Configuration
 * 
 * Centralized logic for determining the Backend API URL.
 * 
 * Logic:
 * 1. If REACT_APP_BACKEND_URL is set in .env, use it.
 * 2. If running locally (localhost), default to http://localhost:8000.
 * 3. In production (if no env var), assume relative path /api (if served from same origin) 
 *    OR fallback to specific production URL if logic dictates.
 * 
 * Current strategy: Default to localhost:8000 if not specified, assuming Dev.
 * For production, REACT_APP_BACKEND_URL must be set in the build environment (Render).
 */

const getBaseUrl = () => {
    if (process.env.REACT_APP_BACKEND_URL) {
        return process.env.REACT_APP_BACKEND_URL.replace(/\/$/, ''); // Remove trailing slash
    }

    // Check if we are in development mode (running on localhost)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8000';
    }

    // Fallback for production if env var is missing:
    // If the frontend is served by the same backend, we might want empty string (relative paths like /api/...)
    // But since this is a separate React App, we often need a full URL.
    // For now, we'll return an empty string to allow relative paths (e.g. /api/...) 
    // which works if the React app is served via Nginx/FastAPI static mounts.
    return '';
};

export const API_BASE_URL = getBaseUrl();
