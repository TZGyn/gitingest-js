<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar'
	import { cn } from '$lib/utils'
	import type { JSONValue, UIMessage } from 'ai'
	import { Button } from '$lib/components/ui/button'
	import { Loader2Icon, SplitIcon, SquareIcon } from 'lucide-svelte'
	import GoogleGroundingSection from '$lib/components/google-grounding-section.svelte'
	import Markdown from '../markdown'
	import Attachments from './attachments.svelte'
	import CopyButton from '$lib/components/copy-button.svelte'
	import Reasoning from '../markdown/reasoning.svelte'
	import { SparklesIcon } from '@lucide/svelte'

	let {
		isLast,
		message,
		status,
		role,
		data = [],
	}: {
		role: 'system' | 'user' | 'assistant' | 'data'
		message: UIMessage
		isLast: boolean
		status: 'submitted' | 'streaming' | 'ready' | 'error'
		data?: JSONValue[]
	} = $props()
</script>

{#key message.id}
	<div
		class={cn(
			'flex gap-2',
			role === 'user' ? 'place-self-end' : 'place-self-start',
			isLast &&
				status !== 'submitted' &&
				'min-h-[calc(100svh-18rem)]',
		)}>
		<div class="group flex flex-col gap-2">
			{#if role !== 'user'}
				<div class="flex items-center gap-4">
					<div
						class="ring-border flex size-8 shrink-0 items-center justify-center rounded-full bg-black ring-1">
						<div class="translate-y-px">
							<div
								class="ring-border flex size-8 shrink-0 items-center justify-center rounded-full bg-black ring-1">
								<div class="translate-y-px">
									<div
										class="relative flex size-4 shrink-0 overflow-visible rounded-full">
										<SparklesIcon class="size-4" />
									</div>
								</div>
							</div>
						</div>
					</div>

					{#if status === 'streaming' && isLast}
						{#if data}
							{/* @ts-ignore */ null}
							{#if data.filter((data) => data.type === 'message').length > 0}
								<div class="flex animate-pulse items-center gap-2">
									<Loader2Icon class="size-4 animate-spin" />
									{/* @ts-ignore */ null}
									<!-- prettier-ignore -->
									{data.filter((data) => data.type === 'message')[data.filter((data) => data.type === 'message').length-1].message}
								</div>
							{/if}
						{/if}
					{/if}

					{#each message.annotations ?? [] as annotation}
						{/* @ts-ignore */ null}
						{#if annotation['type'] === 'model' && annotation['model'] !== null}
							<div class="text-muted-foreground">
								{/* @ts-ignore */ null}
								{m.model()}: {annotation.model}
							</div>
						{/if}
					{/each}
				</div>
			{/if}

			{#if message.parts.length > 0}
				<div class="flex w-full flex-col gap-5">
					{#each message.parts as part, index (index)}
						{#if part.type === 'reasoning'}
							<Reasoning reasoning={part.reasoning} />
						{:else if part.type === 'text'}
							<div
								class={cn(
									'max-w-[100cqw] rounded-xl',
									message.role === 'user'
										? 'bg-secondary w-fit place-self-end p-4'
										: 'bg-background w-screen',
								)}>
								<Markdown
									content={part.text}
									id={message.id}
									class={message.role === 'user'
										? 'w-fit'
										: 'max-w-[100cqw]'} />
							</div>
						{/if}
					{/each}
				</div>
			{/if}
			<Attachments attachments={message.experimental_attachments} />

			{#each message.annotations ?? [] as annotation}
				{/* @ts-ignore */ null}
				{#if annotation['type'] === 'google-grounding'}
					{/* @ts-ignore */ null}
					{#if annotation?.data}
						{/* @ts-ignore */ null}
						<!-- prettier-ignore -->
						<GoogleGroundingSection metadata={annotation?.data}/>
					{/if}
				{/if}
			{/each}

			{#each message.annotations ?? [] as annotation}
				{/* @ts-ignore */ null}
				{#if annotation['type'] === 'kon_chat'}
					{/* @ts-ignore */ null}
					{#if annotation?.status === 'error'}
						<div
							class="bg-destructive/20 border-destructive/50 flex w-[100cqw] items-center gap-2 rounded border px-4 py-3">
							{/* @ts-ignore */ null}
							{#if annotation?.error.type === 'stopped_by_user'}
								<SquareIcon class="size-4" />
							{/if}
							<span class="text-sm">
								{/* @ts-ignore */ null}
								{annotation?.error.message}
							</span>
						</div>
					{/if}
				{/if}
			{/each}

			{#if message.role !== 'user'}
				<div
					class={cn(
						'flex items-center',
						status !== 'streaming' || !isLast
							? 'visible'
							: 'invisible',
					)}>
					{#if message.content}
						<CopyButton text={message.content} class="border" />
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/key}
