<script lang="ts">
	import * as TreeView from '$lib/components/ui/tree-view'

	import { type Children } from '$lib/utils/files/build-file-tree'
	import Self from './tree-view.svelte'

	let { path }: { path: Children } = $props()
</script>

{#if path.children.length === 0}
	<TreeView.File name={path.name.split('/').pop() || ''} />
{:else}
	<TreeView.Folder name={path.name.split('/').pop() || ''}>
		{#each path.children as child}
			<Self path={child} />
		{/each}
	</TreeView.Folder>
{/if}
