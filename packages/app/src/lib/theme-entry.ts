/**
 * Load Essay + site theme from one module so Vite injects a single stylesheet
 * graph (no frame of Essay tokens before site overrides).
 */
import '@downpress/core/theme';
import '$site-theme';
