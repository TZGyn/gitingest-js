<script lang="ts">
	import type { Snippet } from 'svelte'
	import { File } from '@lucide/svelte'
	import type { HTMLButtonAttributes } from 'svelte/elements'
	import { cn } from '$lib/utils'

	interface Props extends HTMLButtonAttributes {
		name: string
		icon?: Snippet<[{ name: string }]>
	}

	let {
		name,
		icon,
		type = 'button',
		class: className,
		...rest
	}: Props = $props()
</script>

<button
	{type}
	class={cn('flex place-items-center gap-1 pl-[3px]', className)}
	{...rest}>
	{#if icon}
		{@render icon({ name })}
	{:else}
		<File class="size-4" />
	{/if}
	<span class="line-clamp-1 text-start">{name}</span>
</button>
