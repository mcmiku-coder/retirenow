import { toast as sonnerToast } from 'sonner';

export const SHOW_ERROR_EVENT = 'app-show-error-modal';

/**
 * Custom toast wrapper to silence informational messages 
 * and redirect errors to a centered modal.
 */
const toast = {
  success: (message, options) => {
    console.log('Toast Success (silenced):', message);
    return null;
  },
  error: (message, options) => {
    console.log('Toast Error (redirected to modal):', message);
    const event = new CustomEvent(SHOW_ERROR_EVENT, { 
      detail: { 
        message: typeof message === 'string' ? message : message?.toString() || 'Unknown error', 
        ...options 
      } 
    });
    window.dispatchEvent(event);
    return 'error-modal-trigger';
  },
  warning: (message, options) => {
    console.log('Toast Warning (redirected to modal):', message);
    const event = new CustomEvent(SHOW_ERROR_EVENT, { 
      detail: { 
        message: typeof message === 'string' ? message : message?.toString() || 'Warning', 
        type: 'warning',
        ...options 
      } 
    });
    window.dispatchEvent(event);
    return 'warning-modal-trigger';
  },
  info: (message, options) => {
    console.log('Toast Info (silenced):', message);
    return null;
  },
  // Generic call (default to silencing if not explicitly categorized)
  custom: (message, options) => {
    console.log('Toast Custom (silenced):', message);
    return null;
  },
  dismiss: (id) => sonnerToast.dismiss(id),
  loading: (message, options) => sonnerToast.loading(message, options)
};

// Also handle the default function call toast('message')
const toastFn = (message, options) => {
    console.log('Toast Generic (silenced):', message);
    return null;
};

// Merge methods into function
Object.assign(toastFn, toast);

export { toastFn as toast };
