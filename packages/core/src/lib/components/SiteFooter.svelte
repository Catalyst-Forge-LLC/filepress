<script lang="ts">
	import type { SiteConfig } from '../config';

	let { site, year = new Date().getFullYear() }: { site: SiteConfig; year?: number } = $props();
</script>

<footer class="site-footer">
	<div class="wrap">
		<span>&copy; {year} {site.author}</span>
		<span class="footer-links">
			<a href="/rss.xml">RSS</a>
			<a href="/topics">Topics</a>
		</span>
	</div>
</footer>
