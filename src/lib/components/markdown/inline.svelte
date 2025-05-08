<script lang="ts">
	import DOMPurify from 'isomorphic-dompurify'
	import { toast } from 'svelte-sonner'
	import type { Token } from 'marked'
	import { browser } from '$app/environment'
	import katex from 'katex'
	import Self from './inline.svelte'
	import Link from './link.svelte'
	import Text from './text.svelte'
	import { UseClipboard } from '$lib/hooks/use-clipboard.svelte'

	let { tokens = [] }: { tokens: Token[] | undefined } = $props()

	function unescapeHtml(html: string) {
		if (!browser) return null
		const doc = new DOMParser().parseFromString(html, 'text/html')
		return doc.documentElement.textContent
	}

	const useClipboard = new UseClipboard()
</script>

{#each tokens as token, tokenIdx (tokenIdx)}
	{#if token.type === 'escape'}
		{unescapeHtml(token.text)}
	{:else if token.type === 'html'}
		{@const html = DOMPurify.sanitize(token.text)}
		{#if html && html.includes('<video')}
			{@html html}
		{:else}
			{token.text}
		{/if}
	{:else if token.type === 'link'}
		{#if token.tokens}
			<Link href={token.href} text={token.text} title={token.title}>
				{#snippet children()}
					<Self tokens={token.tokens} />
				{/snippet}
			</Link>
		{:else}
			<Link href={token.href} text={token.text} title={token.title} />
		{/if}
	{:else if token.type === 'strong'}
		<strong>
			<Self tokens={token.tokens} />
		</strong>
	{:else if token.type === 'em'}
		<em>
			<Self tokens={token.tokens} />
		</em>
	{:else if token.type === 'codespan'}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<code
			class="bg-secondary text-muted-foreground cursor-pointer rounded px-2 py-1 before:content-none after:content-none"
			onclick={async () => {
				await useClipboard.copy(token.text!)
				toast.success('Copied To Clipboard')
			}}>
			{token.text}
		</code>
	{:else if token.type === 'br'}
		<br />
	{:else if token.type === 'del'}
		<del>
			<Self tokens={token.tokens} />
		</del>
	{:else if token.type === 'inlineKatex'}
		{#if token.text}
			{@html katex.renderToString(token.text, {
				displayMode: token.displayMode ?? false,
				throwOnError: false,
			})}
		{/if}
	{:else if token.type === 'iframe'}
		<!-- <iframe
			src="{WEBUI_BASE_URL}/api/v1/files/{token.fileId}/content"
			title={token.fileId}
			width="100%"
			frameborder="0"
			onload="this.style.height=(this.contentWindow.document.body.scrollHeight+20)+'px';">
		</iframe> -->
	{:else if token.type === 'text'}
		<Text text={token.raw} />
		<!-- <span>
			{token.raw}
		</span> -->
	{/if}
{/each}
