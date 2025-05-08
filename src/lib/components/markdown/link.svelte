<script lang="ts">
	import type { Snippet } from 'svelte'

	let {
		href,
		text,
		title,
		children,
	}: {
		href: string
		text: string
		title: string
		children?: Snippet
	} = $props()
</script>

<a {href} target="_blank" rel="nofollow" {title}>
	{#if children}
		{@render children?.()}
	{:else}
		{text}
	{/if}
</a>
