<script lang="ts">
	import {
		bundledLanguages,
		codeToTokens,
		type BundledLanguage,
		type ThemedToken,
	} from 'shiki'
	import CopyButton from '../copy-button.svelte'
	import { Button, buttonVariants } from '../ui/button'
	import { loadPyodide } from 'pyodide'
	import {
		DownloadIcon,
		TerminalIcon,
		TriangleIcon,
	} from 'lucide-svelte'
	import mermaid from 'mermaid'
	import { nanoid } from '$lib/utils/nanoid'
	import { onMount } from 'svelte'
	import { ScrollArea } from '../ui/scroll-area'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
	import * as Tabs from '$lib/components/ui/tabs/index.js'
	import { cn } from '$lib/utils'
	import { UseAutoScroll } from '$lib/hooks/use-auto-scroll.svelte'
	import { mode } from 'mode-watcher'

	let { code, lang }: { code: string; lang: string } = $props()

	const autoScroll = new UseAutoScroll()

	let codeTokens = $state<ThemedToken[][]>([])
	onMount(() => {
		mermaid.initialize({
			startOnLoad: true,
			theme: 'dark',
			securityLevel: 'loose',
		})
	})

	const fontStyle = {
		0: 'None',
		1: 'Italic',
		2: 'Bold',
		3: 'Underline',
	}

	const updateHTML = async (code: string) => {
		const { tokens } = await codeToTokens(code, {
			lang:
				lang in bundledLanguages
					? (lang as BundledLanguage)
					: ('text' as const),
			theme:
				mode.current === 'light' ? 'github-light' : 'one-dark-pro',
		})
		codeTokens = tokens
	}

	let updateHTMLID: number
	$effect(() => {
		code
		if (updateHTMLID) {
			cancelIdleCallback(updateHTMLID)
		}
		updateHTMLID = requestIdleCallback(() => {
			updateHTML(code)
		})
	})

	interface ConsoleOutputContent {
		type: 'text' | 'image'
		value: string
	}

	let iframehtml = $derived.by(() => {
		if (lang !== 'html') return ''
		if (!code) return ``
		const htmlLines = code.split('\n')
		htmlLines.splice(2, 0, `    <base href='about:srcdoc'>`)
		return htmlLines.join('\n')
	})

	let consoleOutput = $state<ConsoleOutputContent[][]>([])

	function detectRequiredHandlers(code: string): string[] {
		const handlers: string[] = ['basic']

		if (code.includes('matplotlib') || code.includes('plt.')) {
			handlers.push('matplotlib')
		}

		return handlers
	}
	const OUTPUT_HANDLERS = {
		matplotlib: `
    import io
    import base64
    from matplotlib import pyplot as plt

    # Clear any existing plots
    plt.clf()
    plt.close('all')

    # Switch to agg backend
    plt.switch_backend('agg')

    def setup_matplotlib_output():
        def custom_show():
            if plt.gcf().get_size_inches().prod() * plt.gcf().dpi ** 2 > 25_000_000:
                print("Warning: Plot size too large, reducing quality")
                plt.gcf().set_dpi(100)

            png_buf = io.BytesIO()
            plt.savefig(png_buf, format='png')
            png_buf.seek(0)
            png_base64 = base64.b64encode(png_buf.read()).decode('utf-8')
            print(f'data:image/png;base64,{png_base64}')
            png_buf.close()

            plt.clf()
            plt.close('all')

        plt.show = custom_show
  `,
		basic: `
    # Basic output capture setup
  `,
	}

	let runningCode = $state(false)

	const runPython = async (code: string) => {
		runningCode = true
		const currentPyodideInstance = await loadPyodide({
			indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.5/full/',
		})

		const outputArray: ConsoleOutputContent[] = []

		currentPyodideInstance.setStdout({
			batched: (output: string) => {
				outputArray.push({
					type: output.startsWith('data:image/png;base64')
						? 'image'
						: 'text',
					value: output,
				})
			},
		})

		await currentPyodideInstance.loadPackagesFromImports(code, {
			// messageCallback: (message: string) => {
			// 	setMetadata((metadata) => ({
			// 		...metadata,
			// 		outputs: [
			// 			...metadata.outputs.filter(
			// 				(output) => output.id !== runId,
			// 			),
			// 			{
			// 				id: runId,
			// 				contents: [{ type: 'text', value: message }],
			// 				status: 'loading_packages',
			// 			},
			// 		],
			// 	}))
			// },
		})

		const requiredHandlers = detectRequiredHandlers(code)
		for (const handler of requiredHandlers) {
			if (OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS]) {
				await currentPyodideInstance.runPythonAsync(
					OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS],
				)

				if (handler === 'matplotlib') {
					await currentPyodideInstance.runPythonAsync(
						'setup_matplotlib_output()',
					)
				}
			}
		}

		await currentPyodideInstance.runPythonAsync(code)

		consoleOutput.push(outputArray)

		runningCode = false

		// setMetadata((metadata) => ({
		// 	...metadata,
		// 	outputs: [
		// 		...metadata.outputs.filter((output) => output.id !== runId),
		// 		{
		// 			id: runId,
		// 			contents: outputContent,
		// 			status: 'completed',
		// 		},
		// 	],
		// }))
	}

	let mermaidHtml = $state('')
	const drawMermaidDiagram = async (code: string) => {
		try {
			if (await mermaid.parse(code)) {
				const { svg } = await mermaid.render(
					`mermaid-${nanoid()}`,
					code,
				)
				mermaidHtml = svg
			}
		} catch (error) {
			console.log('Error:', error)
		}
	}

	const downloadMermaidDiagram = async (
		theme: 'default' | 'dark',
	) => {
		const config = mermaid.mermaidAPI.getConfig()
		mermaid.initialize({
			theme: theme,
			securityLevel: 'loose',
		})
		const { svg } = await mermaid.render(`mermaid-${nanoid()}`, code)
		var element = document.createElement('a')
		element.setAttribute(
			'href',
			'data:text/plain;charset=utf-8,' + encodeURIComponent(svg),
		)
		element.setAttribute('download', 'mermaid.svg')

		element.style.display = 'none'
		document.body.appendChild(element)

		element.click()

		document.body.removeChild(element)

		mermaid.initialize(config)
	}
</script>

<Tabs.Root value="code">
	{#if lang === 'html'}
		<Tabs.List
			class="bg-background grid w-full grid-cols-2 rounded border p-0">
			<Tabs.Trigger
				value="code"
				class="data-[state=active]:bg-secondary h-full rounded-none rounded-l">
				Code
			</Tabs.Trigger>
			<Tabs.Trigger
				value="preview"
				class="data-[state=active]:bg-secondary h-full rounded-none rounded-r">
				Preview
			</Tabs.Trigger>
		</Tabs.List>
	{/if}
	<Tabs.Content value="code" class="mt-1">
		<div
			class="bg-secondary flex items-center justify-between rounded-t px-2">
			<span class="py-1 text-sm">{lang}</span>
			<div>
				<CopyButton
					variant="ghost"
					class="hover:bg-transparent"
					text={code} />
				{#if lang === 'python'}
					<Button
						loading={runningCode}
						size="icon"
						variant="ghost"
						class="hover:bg-transparent"
						onclick={() => runPython(code)}>
						<TriangleIcon
							class={cn('rotate-90', runningCode && 'invisible')} />
					</Button>
				{/if}
				{#if lang === 'mermaid'}
					<Button
						loading={runningCode}
						size="icon"
						variant="ghost"
						class="hover:bg-transparent"
						onclick={() => drawMermaidDiagram(code)}>
						<TriangleIcon
							class={cn('rotate-90', runningCode && 'invisible')} />
					</Button>
				{/if}
			</div>
		</div>

		<div
			bind:this={autoScroll.ref}
			class="max-h-[60vh] overflow-y-scroll">
			<pre
				class="shiki one-dark-pro !bg-[#f6f6f7] text-wrap dark:!bg-[#1e1e1e]"><code>{#if codeTokens.length > 0}{#each codeTokens as tokens, index (index)}{@const html = `<span class="line">${tokens.map((token) => `<span style="color: ${token.color ? token.color : mode.current === 'dark' ? '#fff' : '#000'}; font-style:${fontStyle[(token.fontStyle as 0 | 1 | 2 | 3) ?? 0]}">${token.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`).join('')}</span>\n`}{@html html}{/each}{:else}{code}{/if}</code></pre>
		</div>

		<!-- class={cn('w-12 shrink-0', {
                  'text-muted-foreground': [
                    'in_progress',
                    'loading_packages',
                  ].includes(consoleOutput.status),
                  'text-emerald-500': consoleOutput.status === 'completed',
                  'text-red-400': consoleOutput.status === 'failed',
                })} -->

		{#if mermaidHtml}
			<div
				class="bg-secondary flex items-center justify-between rounded-t px-2">
				<span class="py-1 text-sm">Mermaid SVG</span>
				<div>
					<CopyButton
						variant="ghost"
						class="hover:bg-transparent"
						text={mermaidHtml} />
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							class={cn(
								buttonVariants({
									variant: 'ghost',
									class: 'hover:bg-transparent',
									size: 'icon',
								}),
							)}>
							<DownloadIcon />
						</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.Group>
								<DropdownMenu.GroupHeading>
									Theme
								</DropdownMenu.GroupHeading>
								<DropdownMenu.Separator />
								<DropdownMenu.Item
									onclick={() => downloadMermaidDiagram('default')}>
									Light
								</DropdownMenu.Item>
								<DropdownMenu.Item
									onclick={() => downloadMermaidDiagram('dark')}>
									Dark
								</DropdownMenu.Item>
							</DropdownMenu.Group>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			</div>
			<div class="flex border hover:cursor-pointer">
				<ScrollArea orientation="both" class="max-h-96 w-full">
					<div class="flex min-h-64 justify-center *:[svg]:w-full">
						{@html mermaidHtml}
					</div>
				</ScrollArea>
			</div>
		{/if}
		{#if consoleOutput.length > 0}
			<div
				class="bg-muted sticky top-0 z-50 mt-2 flex h-fit w-full flex-row items-center justify-between border-b border-zinc-200 px-2 py-1 dark:border-zinc-700">
				<div
					class="dark:bg-secondary flex flex-row items-center gap-3 pl-2 text-sm">
					<div class="text-muted-foreground">
						<TerminalIcon class="size-4" />
					</div>
					<div>Console</div>
				</div>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div
					class="px-2 text-sm hover:cursor-pointer hover:underline"
					onclick={() => {
						consoleOutput = []
					}}>
					Clear
				</div>
			</div>
			{#each consoleOutput as output, index}
				<div
					class="flex flex-row border-b border-zinc-200 bg-zinc-50 px-4 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900">
					<div class="w-8 shrink-0 text-emerald-500">
						{'>'}
					</div>
					<div
						class="flex w-full flex-col gap-2 text-zinc-900 dark:text-zinc-50">
						{#each output as content, index}
							{#if content.type === 'image'}
								<picture>
									<img
										src={content.value}
										alt="output"
										class="max-w-screen-toast-mobile w-full rounded-md" />
								</picture>
							{:else}
								<div class="w-full break-words whitespace-pre-line">
									{content.value}
								</div>
							{/if}
						{/each}
					</div>
				</div>
			{/each}
		{/if}
	</Tabs.Content>
	<Tabs.Content value="preview" class="mt-1">
		<iframe
			srcdoc={iframehtml}
			title="preview_html"
			class="max-h-[calc(60vh+40px)] min-h-[calc(60vh+40px)] w-full"
			sandbox="allow-scripts">
		</iframe>
	</Tabs.Content>
</Tabs.Root>
