<script lang="ts">
	import { markedKatexExtension } from './katex-extension'
	import { marked } from 'marked'
	import MarkdownRenderer from './renderer.svelte'
	import { cn } from '$lib/utils'

	let {
		content,
		id,
		class: className,
	}: { content: string; id: string; class?: string } = $props()

	const options = {
		throwOnError: false,
	}
	marked.use(markedKatexExtension(options))
	let tokens = $derived(marked.lexer(content.trim()))
</script>

{#key id}
	<div
		class={cn(
			'prose prose-neutral dark:prose-invert prose-p:my-0 prose-pre:m-0 prose-pre:bg-transparent prose-pre:rounded-t-none',
			className,
		)}>
		<MarkdownRenderer {tokens} />
	</div>
{/key}
