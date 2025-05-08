<script lang="ts">
	import { Textarea } from '$lib/components/ui/textarea/index.js'
	import { Button } from '$lib/components/ui/button'
	import { ArrowDownIcon } from 'lucide-svelte'
	import { toast } from 'svelte-sonner'
	import type { ChatRequestOptions } from 'ai'
	import type {
		JSONValue,
		Message,
		UIMessage,
	} from '@ai-sdk/ui-utils'
	import type { UseAutoScroll } from '$lib/hooks/use-auto-scroll.svelte'
	import { Loader2Icon, SendIcon, SquareIcon } from '@lucide/svelte'

	let {
		input = $bindable(),
		status,
		messages = $bindable(),
		data = $bindable(),
		handleSubmit,
		customData,
		autoScroll,
	}: {
		input: string
		status: 'submitted' | 'streaming' | 'ready' | 'error'
		messages: UIMessage[]
		data: JSONValue[] | undefined
		handleSubmit: (
			event?: {
				preventDefault?: () => void
			},
			chatRequestOptions?: ChatRequestOptions,
		) => void
		customData?: () => any
		autoScroll: UseAutoScroll
		stop: () => void
	} = $props()

	let inputElement: HTMLTextAreaElement | null = $state(null)

	function customSubmit(event: Event) {
		let custom = undefined
		if (customData) {
			custom = customData()
		}

		if (status === 'streaming') {
			toast.warning(
				'Please wait for the model to finish its response',
			)
		} else {
			data = []
			handleSubmit(event, {
				body: {
					...custom,
				},
			})
		}
	}

	$effect(() => {
		status && autoScroll?.scrollToBottom()
	})

	const adjustInputHeight = () => {
		if (inputElement) {
			inputElement.style.height = 'auto'
			inputElement.style.height = `${inputElement.scrollHeight + 2}px`
		}
	}

	$effect(() => {
		input
		adjustInputHeight()
	})
</script>

<form
	onsubmit={customSubmit}
	class="bg-secondary absolute right-1/2 bottom-4 flex h-auto w-full max-w-[700px] translate-x-1/2 flex-col rounded-xl p-2">
	<div
		class="absolute right-1/2 bottom-[calc(100%+0.5rem)] flex translate-x-1/2 flex-col gap-2">
		{#if !autoScroll?.isAtBottom}
			<Button
				class="rounded-full"
				variant="outline"
				size="icon"
				onclick={() => autoScroll?.scrollToBottom()}>
				<ArrowDownIcon />
			</Button>
		{/if}
	</div>
	<Textarea
		bind:value={input}
		bind:ref={inputElement}
		class="max-h-96 min-h-4 resize-none border-none bg-transparent !text-base focus-visible:ring-0 focus-visible:ring-offset-0"
		placeholder={'Ask a question...'}
		onkeydown={(event) => {
			if (event.key === 'Enter' && event.ctrlKey) {
				event.preventDefault()

				customSubmit(event)
			}
		}} />
	<div class="flex justify-between">
		<div class="flex items-center gap-1"></div>
		<div class="flex items-center gap-2">
			{#if status === 'submitted' || status === 'streaming'}
				{#if stop !== undefined}
					<Button
						onclick={() => stop()}
						class="rounded-full p-1"
						size="icon">
						<SquareIcon />
					</Button>
				{:else}
					<Button disabled class="rounded-full p-1" size="icon">
						<Loader2Icon class="animate-spin" />
					</Button>
				{/if}
			{:else}
				<Button type="submit" class="rounded-full p-1" size="icon">
					<SendIcon />
				</Button>
			{/if}
		</div>
	</div>
</form>
