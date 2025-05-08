<script lang="ts">
	import { Toggle } from '$lib/components/ui/toggle/index.js'
	import { UseAutoScroll } from '$lib/hooks/use-auto-scroll.svelte'
	import { nanoid } from '$lib/utils/nanoid'
	import { ChevronDownIcon } from 'lucide-svelte'
	import Markdown from './markdown.svelte'

	let { reasoning }: { reasoning: string } = $props()

	const autoScroll = new UseAutoScroll()

	const now = Date.now()
</script>

<div>
	<Toggle
		size="sm"
		class="text-muted-foreground group peer bg-secondary w-full justify-between rounded border data-[state=on]:rounded-b-none">
		Reasoning
		<ChevronDownIcon
			class={'transition-transform group-data-[state=on]:rotate-180'} />
	</Toggle>
	<div
		bind:this={autoScroll.ref}
		class="text-muted-foreground hidden max-h-[350px] overflow-y-scroll rounded-md rounded-t-none border p-2 text-sm peer-data-[state=on]:block">
		<div class="prose prose-neutral dark:prose-invert prose-p:my-0">
			<Markdown content={reasoning} id={`reasoning-${nanoid()}`} />
		</div>
	</div>
</div>
