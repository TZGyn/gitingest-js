<script lang="ts">
	import type { ToolInvocation } from '@ai-sdk/ui-utils'
	import type { UIMessage } from 'ai'
	import GetRepo from './tool/get-repo.svelte'
	import { ImageIcon } from '@lucide/svelte'
	import GitIcon from '$lib/components/icons/git-icon.svelte'

	let {
		toolInvocation,
		message,
	}: { toolInvocation: ToolInvocation; message: UIMessage } = $props()
</script>

{#if toolInvocation.toolName === 'getRepo'}
	{#if 'result' in toolInvocation}
		<GetRepo result={toolInvocation.result} />
		<!-- https://github.com/cruip/cruip-tutorials/blob/main/animated-gradient-border/index.html -->
	{:else}
		<div
			class="h-96 w-full animate-[border_4s_linear_infinite] rounded-2xl border border-transparent [background:linear-gradient(45deg,hsl(var(--background)))_padding-box,conic-gradient(from_var(--border-angle),hsl(var(--secondary))_80%,hsl(var(--primary))_86%,hsl(var(--primary))_90%,hsl(var(--primary))_94%,hsl(var(--secondary)))_border-box]">
			<div class="flex h-full items-center justify-center gap-4 p-4">
				<div
					class="flex size-32 animate-pulse items-center justify-center rounded-full border object-cover p-3">
					<GitIcon class="size-16" />
				</div>
			</div>
		</div>
	{/if}
{/if}

<style lang="postcss">
	@property --border-angle {
		inherits: false;
		initial-value: 0deg;
		syntax: '<angle>';
	}
</style>
