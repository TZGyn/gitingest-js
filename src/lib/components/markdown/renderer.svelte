<script lang="ts">
	import { marked } from 'marked'

	import DOMPurify from 'isomorphic-dompurify'
	import MarkdownInline from './inline.svelte'
	import * as Collapsible from '$lib/components/ui/collapsible/index.js'
	import * as Table from '$lib/components/ui/table/index.js'
	import { ChevronsUpDownIcon } from 'lucide-svelte'
	import { buttonVariants } from '../ui/button'
	import katex from 'katex'
	import type { Token } from 'marked'
	import { browser } from '$app/environment'
	import Code from './code.svelte'
	import Self from './renderer.svelte'

	let {
		tokens = [],
		top = true,
	}: { tokens?: Token[]; top?: boolean } = $props()

	function unescapeHtml(html: string) {
		if (!browser) return null
		const doc = new DOMParser().parseFromString(html, 'text/html')
		return doc.documentElement.textContent
	}
</script>

{#each tokens as token, tokenIdx (tokenIdx)}
	{#if token.type === 'hr'}
		<hr class=" dark:border-gray-850 border-gray-100" />
	{:else if token.type === 'heading'}
		<svelte:element this={'h' + token.depth} dir="auto">
			<MarkdownInline tokens={token.tokens!} />
		</svelte:element>
	{:else if token.type === 'code'}
		{#if token.raw.includes('```')}
			<div class="my-7">
				<Code code={token.text} lang={token.lang} />
			</div>
		{:else}
			{token.text}
		{/if}
	{:else if token.type === 'table'}
		<div class="group relative w-full">
			<div
				class="scrollbar-hidden relative max-w-full overflow-x-auto rounded-lg">
				<Table.Root>
					<!-- <Table.Caption>
						A list of your recent invoices.
					</Table.Caption> -->
					<Table.Header>
						<Table.Row>
							{#each token.header as header, headerIdx}
								<Table.Head>
									<MarkdownInline tokens={header.tokens} />
								</Table.Head>
							{/each}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each token.rows as row, rowIdx}
							<Table.Row>
								{#each row ?? [] as cell, cellIdx}
									<Table.Cell>
										<MarkdownInline tokens={cell.tokens} />
									</Table.Cell>
								{/each}
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</div>
	{:else if token.type === 'blockquote'}
		<blockquote dir="auto">
			<Self tokens={token.tokens} />
		</blockquote>
	{:else if token.type === 'list'}
		{#if token.ordered}
			<ol start={token.start || 1}>
				{#each token.items as item, itemIdx}
					<li dir="auto" class="text-start">
						{#if item?.task}
							<input
								class=" -translate-x-1 translate-y-[1px]"
								type="checkbox"
								checked={item.checked}
								onchange={(e) => {
									// onTaskClick({
									// 	id: id,
									// 	token: token,
									// 	tokenIdx: tokenIdx,
									// 	item: item,
									// 	itemIdx: itemIdx,
									// 	checked: e.target.checked
									// });
								}} />
						{/if}

						<Self tokens={item.tokens} top={token.loose} />
					</li>
				{/each}
			</ol>
		{:else}
			<ul>
				{#each token.items as item, itemIdx}
					<li dir="auto" class="text-start">
						{#if item?.task}
							<input
								class=" -translate-x-1 translate-y-[1px]"
								type="checkbox"
								checked={item.checked}
								onchange={(e) => {
									// onTaskClick({
									// 	id: id,
									// 	token: token,
									// 	tokenIdx: tokenIdx,
									// 	item: item,
									// 	itemIdx: itemIdx,
									// 	checked: e.target.checked
									// });
								}} />
						{/if}

						<Self tokens={item.tokens} top={token.loose} />
					</li>
				{/each}
			</ul>
		{/if}
	{:else if token.type === 'details'}
		<Collapsible.Root>
			<div class="flex items-center justify-between space-x-4 px-4">
				<h4 class="text-sm font-semibold">{token.summary}</h4>
				<Collapsible.Trigger
					class={buttonVariants({
						variant: 'ghost',
						size: 'sm',
						class: 'w-9 p-0',
					})}>
					<ChevronsUpDownIcon />
					<span class="sr-only">Toggle</span>
				</Collapsible.Trigger>
			</div>
			<Collapsible.Content>
				<Self tokens={marked.lexer(token.text)} />
			</Collapsible.Content>
		</Collapsible.Root>
	{:else if token.type === 'html'}
		{@const html = DOMPurify.sanitize(token.text)}
		{#if html && html.includes('<video')}
			{@html html}
		{:else}
			{token.text}
		{/if}
	{:else if token.type === 'iframe'}{:else if token.type === 'paragraph'}
		<p dir="auto">
			<MarkdownInline tokens={token.tokens ?? []} />
		</p>
	{:else if token.type === 'text'}
		{#if top}
			<p dir="auto">
				{#if token.tokens}
					<MarkdownInline tokens={token.tokens} />
				{:else}
					{unescapeHtml(token.text)}
				{/if}
			</p>
		{:else if token.tokens}
			<MarkdownInline tokens={token.tokens ?? []} />
		{:else}
			{unescapeHtml(token.text)}
		{/if}
	{:else if token.type === 'inlineKatex'}
		{#if token.text}
			{@html katex.renderToString(token.text, {
				displayMode: token.displayMode ?? false,
				throwOnError: false,
			})}
		{/if}
	{:else if token.type === 'blockKatex'}
		{#if token.text}
			{@html katex.renderToString(token.text, {
				displayMode: token.displayMode ?? false,
				throwOnError: false,
			})}
		{/if}
	{:else if token.type === 'space'}
		<div class="my-2"></div>
	{:else}
		<!-- {JSON.stringify(token)} -->
	{/if}
{/each}
