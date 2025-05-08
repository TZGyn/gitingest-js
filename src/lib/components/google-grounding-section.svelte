<script lang="ts">
	import { Toggle } from '$lib/components/ui/toggle'
	import { type GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google'
	import { ChevronDownIcon } from 'lucide-svelte'

	let { metadata }: { metadata: GoogleGenerativeAIProviderMetadata } =
		$props()

	let groundingMetadata = $derived(metadata.groundingMetadata)
	let searchQueries = $derived(groundingMetadata?.webSearchQueries)
	let groundingChunks = $derived(groundingMetadata?.groundingChunks)
	let groundingSupport = $derived(
		groundingMetadata?.groundingSupports,
	)
</script>

{#if groundingMetadata && (searchQueries || groundingChunks)}
	<Toggle size="sm" class="text-muted-foreground group peer w-fit">
		Search Grounding Details
		<ChevronDownIcon
			class={'transition-transform group-data-[state="on"]:rotate-180'} />
	</Toggle>
	<div
		class="text-muted-foreground hidden flex-col gap-2 peer-data-[state='on']:flex">
		{#if searchQueries}
			<div class="flex flex-wrap gap-1">
				<span>
					Search Queries: <span class="text-xs">
						{searchQueries.join(', ')}
					</span>
				</span>
				<!-- {#each searchQueries as query}
					<span class="text-xs">
						{query}
					</span>
				{/each} -->
			</div>
		{/if}
		{#if groundingChunks}
			<div class="flex flex-col gap-1">
				<div class="text-muted-foreground">Grounding Data:</div>
				<div class="grid grid-cols-2 gap-2">
					{#each groundingChunks as chunk}
						{#if chunk.web}
							<a href={chunk.web.uri} target="_blank">
								<div
									class="bg-secondary hover:bg-accent flex gap-1 rounded-md border p-3">
									<span class="line-clamp-1">
										{chunk.web.title}
									</span>
								</div>
							</a>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}
