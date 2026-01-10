import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL;

// Generate or retrieve session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('quit_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('quit_session_id', sessionId);
  }
  return sessionId;
};

/**
 * Track a page visit for analytics
 * @param {string} pagePath - The path of the page being visited
 * @param {string} token - The user's JWT token
 */
export const trackPageVisit = async (pagePath, token) => {
  if (!token || !BACKEND_URL) return;
  
  try {
    await axios.post(
      `${BACKEND_URL}/api/track-page`,
      {
        page_path: pagePath,
        session_id: getSessionId()
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
  } catch (error) {
    // Silently fail - analytics shouldn't break the app
    console.debug('Analytics tracking failed:', error.message);
  }
};

export default { trackPageVisit, getSessionId };
