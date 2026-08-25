/**
 * Essay chrome + fonts, then a named preset, then the site theme.
 * Site rules use higher-specificity selectors (`:root:root`, `header.site-header …`)
 * so they win even if Vite emits Essay CSS after the site sheet.
 */
import '@filepress/core/theme';
import '$site-preset';
import '$site-theme';
