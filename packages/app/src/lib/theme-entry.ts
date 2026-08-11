/**
 * Essay chrome + fonts, then site theme.
 * Site rules use higher-specificity selectors (`:root:root`, `header.site-header …`)
 * so they win even if Vite emits Essay CSS after the site sheet.
 */
import '@downpress/core/theme';
import '$site-theme';
