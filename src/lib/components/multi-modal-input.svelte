<script lang="ts">
	import { Textarea } from '$lib/components/ui/textarea/index.js'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import { ArrowDownIcon } from 'lucide-svelte'
	import { toast } from 'svelte-sonner'
	import type { ChatRequestOptions } from 'ai'
	import type {
		JSONValue,
		Message,
		UIMessage,
	} from '@ai-sdk/ui-utils'
	import type { UseAutoScroll } from '$lib/hooks/use-auto-scroll.svelte'
	import {
		Loader2Icon,
		MessageCircleIcon,
		SendIcon,
		SquareIcon,
	} from '@lucide/svelte'
	import * as Dialog from '$lib/components/ui/dialog/index.js'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
	import { Input } from '$lib/components/ui/input/index.js'
	import { Label } from '$lib/components/ui/label/index.js'
	import { cn } from '$lib/utils'
	import { GithubIcon, GitlabIcon } from '$lib/components/icons'
	import { capitalizeFirstLetter } from '$lib/utils/capitalize-first-letter'

	let {
		input = $bindable(),
		status,
		messages = $bindable(),
		data = $bindable(),
		handleSubmit,
		customData,
		autoScroll,
		stop,
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

	let openRepoDialog = $state(false)

	let provider = $state<'github' | 'gitlab'>('github')
	let url = $state('https://github.com/TZGyn/gitingest-js.git')
	let repo = $state('TZGyn/gitingest-js')
	let branch = $state('main')
	let commit = $state('latest')

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
					repo: url,
					branch: ['main', 'master', 'HEAD'].includes(branch)
						? null
						: branch,
					commit: commit === 'latest' ? null : commit,
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

	$effect(() => {
		const commitData = data?.find((data) => {
			// @ts-ignore
			return data?.type === 'commit'
		})

		if (commitData) {
			// @ts-ignore
			commit = commitData.commit
		}
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
		<div class="flex items-center gap-1">
			<Dialog.Root bind:open={openRepoDialog}>
				<Dialog.Trigger
					class={cn(
						buttonVariants({ variant: 'outline' }),
						'hover:bg-background/60 rounded-xl',
					)}>
					{#if provider === 'github'}
						<GithubIcon />
					{:else if provider === 'gitlab'}
						<GitlabIcon />
					{/if}
					{repo}
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header class="space-y-12">
						<div
							class="flex w-full flex-col items-center justify-center gap-6 pt-12">
							<div class="w-fit rounded-full p-4">
								{#if provider === 'github'}
									<GithubIcon class="size-32" />
								{:else if provider === 'gitlab'}
									<GitlabIcon class="size-32" />
								{/if}
							</div>
						</div>
						<div class="space-y-2">
							<Dialog.Title class="text-center">Repo</Dialog.Title>
							<Dialog.Description class="text-center">
								Enter the repo you want to chat with
							</Dialog.Description>
						</div>
					</Dialog.Header>
					<div class="grid gap-4 py-4">
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="url" class="text-right">Url</Label>
							<Input
								id="url"
								bind:value={url}
								onchange={(event) => {
									try {
										var urlData = new URL(url)
									} catch (error) {
										return
									}
									if (urlData.hostname === 'github.com') {
										provider === 'github'
									} else if (urlData.hostname === 'gitlab.com') {
										provider === 'gitlab'
									}

									repo = urlData.pathname
									if (repo.startsWith('/')) {
										repo = repo.slice(1)
									}
									if (repo.includes('.git')) {
										repo = repo.split('.git')[0]
									}
								}}
								class="col-span-3" />
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="username" class="text-right">
								Provider
							</Label>
							<DropdownMenu.Root>
								<DropdownMenu.Trigger
									id="provider"
									class={cn(
										buttonVariants({ variant: 'secondary' }),
									)}>
									{#if provider === 'github'}
										<GithubIcon />
									{:else if provider === 'gitlab'}
										<GitlabIcon />
									{/if}
									{capitalizeFirstLetter(provider)}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content>
									<DropdownMenu.Group>
										<DropdownMenu.GroupHeading>
											Provider
										</DropdownMenu.GroupHeading>
										<DropdownMenu.Separator />
										<DropdownMenu.Item
											onclick={() => {
												provider = 'github'

												const urlData = new URL(url)

												urlData.hostname = 'github.com'

												url = urlData.toString()
											}}>
											<GithubIcon />
											Github
										</DropdownMenu.Item>
										<DropdownMenu.Item
											onclick={() => {
												provider = 'gitlab'

												const urlData = new URL(url)

												urlData.hostname = 'gitlab.com'

												url = urlData.toString()
											}}>
											<GitlabIcon />
											Gitlab
										</DropdownMenu.Item>
									</DropdownMenu.Group>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="repo" class="text-right">Repo</Label>
							<Input id="repo" bind:value={repo} class="col-span-3" />
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="branch" class="text-right">Branch</Label>
							<Input
								id="branch"
								bind:value={branch}
								class="col-span-3" />
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="commit" class="text-right">Commit</Label>
							<Input
								id="commit"
								bind:value={commit}
								class="col-span-3" />
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Root>
		</div>
		<div class="flex items-center gap-2">
			{#if status === 'submitted' || status === 'streaming'}
				<Button
					onclick={() => stop()}
					class="rounded-full p-1"
					size="icon">
					<SquareIcon />
				</Button>
			{:else}
				<Button type="submit" class="rounded-full p-1" size="icon">
					<SendIcon />
				</Button>
			{/if}
		</div>
	</div>
</form>
