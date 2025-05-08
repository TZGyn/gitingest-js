<script lang="ts">
	import type { Attachment } from 'ai'
	import { ExternalLinkIcon, FileTextIcon } from 'lucide-svelte'
	import { Button } from '$lib/components/ui/button'

	let { attachments }: { attachments?: Attachment[] } = $props()
</script>

{#if attachments}
	{#each attachments as attachment}
		{#if attachment.contentType?.startsWith('image/')}
			<div class="bg-secondary rounded border">
				<img
					src={attachment.url}
					alt={attachment.name}
					class="w-[300px]" />
			</div>
		{/if}
		{#if attachment.contentType === 'application/pdf'}
			<Button variant="outline" href={attachment.url} target="_blank">
				<FileTextIcon />
				<span>{decodeURIComponent(attachment.name!)}</span>
				<ExternalLinkIcon class="text-muted-foreground" />
			</Button>
		{/if}
	{/each}
{/if}
