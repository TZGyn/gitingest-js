<!--
	jsrepo 1.41.3
	Installed from github/ieedan/shadcn-svelte-extras
	11-04-2025
-->

<script lang="ts">
	import { cn } from '$lib/utils'
	import { tv, type VariantProps } from 'tailwind-variants'
	import { CopyButton } from '$lib/components/ui/copy-button'

	const style = tv({
		base: 'relative w-full max-w-full rounded-md border bg-background py-2.5 pl-3 pr-12',
		variants: {
			variant: {
				default: 'border-border',
				secondary: 'border-border bg-accent',
				destructive: 'border-destructive bg-destructive',
				primary: 'border-primary bg-primary text-primary-foreground',
			},
		},
	})

	type Variant = VariantProps<typeof style>['variant']

	type Props = {
		variant?: Variant
		text: string | string[]
		class?: string
		singleLineClass?: string
		onCopy?: () => void
	}

	let {
		text,
		variant = 'default',
		onCopy,
		class: className,
		singleLineClass,
	}: Props = $props()
</script>

<div class={cn(style({ variant, className: className }))}>
	{#if typeof text == 'string'}
		<pre
			class={cn(
				'overflow-y-auto text-left font-mono text-sm whitespace-nowrap',
				singleLineClass,
			)}>
			{text}
		</pre>
	{:else}
		{#each text as line, i (i)}
			<pre
				class={cn(
					'overflow-y-auto text-left font-mono text-sm whitespace-nowrap',
				)}>
			{line}
		</pre>
		{/each}
	{/if}

	<CopyButton
		class="hover:text-opacity-80 absolute top-1/2 right-2 size-7 -translate-y-1/2 transition-opacity ease-in-out hover:bg-transparent"
		text={typeof text === 'string' ? text : text.join('\n')}
		{onCopy} />
</div>
