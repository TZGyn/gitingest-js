<script lang="ts">
	import { makeClient } from '$lib/api-client'
	import { Chat } from '@ai-sdk/svelte'
	import MultiModalInput from '$lib/components/multi-modal-input.svelte'
	import { UseAutoScroll } from '$lib/hooks/use-auto-scroll.svelte'
	import { type ChatRequestOptions } from 'ai'
	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import MessageBlock from '$lib/components/message/message-block.svelte'
	import { cn } from '$lib/utils'
	import { Loader2Icon, SparklesIcon } from '@lucide/svelte'

	const client = makeClient(fetch)

	let provider = $state<'github' | 'gitlab'>('github')
	let repo = $state('https://github.com/TZGyn/gitingest-js.git')
	let branch = $state('')
	let commit = $state('')

	const autoScroll = new UseAutoScroll()

	let useChat = new Chat({
		initialMessages: [],
		api: '/api/chat',
		onError: (error) => {
			useChat.messages[useChat.messages.length - 1].annotations?.push(
				{
					type: 'kon_chat',
					status: 'error',
					error: {
						type: error.name,
						message: error.message,
					},
				},
			)
		},
		credentials: 'include',
	})
</script>

<!-- svelte-ignore a11y_consider_explicit_label -->
<!-- <button
	onclick={async () => {
		const tasks = await client.ingest.$get({
			query: {
				repo: repo,
				branch,
				commit,
			},
		})
	}}>
	Fetch
</button> -->
<div class="relative flex flex-1 overflow-hidden">
	<div
		bind:this={autoScroll.ref}
		class="@container flex flex-1 flex-col items-center overflow-y-scroll p-4">
		<div class="flex w-full flex-col items-center pt-20 pb-40">
			<div
				class="@container/chat flex w-full max-w-[600px] flex-col gap-8">
				{#each useChat.messages as message, index (index)}
					<MessageBlock
						data={useChat.data}
						{message}
						role={message.role}
						status={useChat.status}
						isLast={index === useChat.messages.length - 1} />
				{/each}
				{#if useChat.status === 'submitted'}
					<div
						class={cn(
							'flex min-h-[calc(100vh-18rem)] gap-2 place-self-start',
						)}>
						<div class="group flex flex-col gap-2">
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
								<div class="flex animate-pulse items-center gap-2">
									<Loader2Icon class="size-4 animate-spin" />
									Submitting Prompt
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<MultiModalInput
	bind:input={useChat.input}
	handleSubmit={(e, chatRequestOptions?: ChatRequestOptions) => {
		useChat.handleSubmit(e, chatRequestOptions)
	}}
	bind:messages={useChat.messages}
	bind:data={useChat.data}
	status={useChat.status}
	{autoScroll}
	stop={() => {
		useChat.stop()
	}} />
