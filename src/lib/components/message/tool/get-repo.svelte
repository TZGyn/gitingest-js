<script lang="ts">
	import * as TreeView from '$lib/components/ui/tree-view'
	import {
		buildTree,
		type Children,
	} from '$lib/utils/files/build-file-tree'
	import { normalize } from '$lib/utils/files/normalize-path'
	import TreeViewNode from './tree-view.svelte'

	let {
		result,
	}: {
		result: {
			paths: string[]
		}
	} = $props()

	let paths = $derived(
		buildTree(result.paths.map((path) => normalize('/' + path))),
	)
</script>

<div
	class="bg-secondary/50 h-96 max-h-96 w-full overflow-scroll rounded border p-4">
	<TreeView.Root>
		<TreeViewNode path={paths[0]} />
	</TreeView.Root>
</div>
