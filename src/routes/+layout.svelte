<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner'
	import '../app.css'
	import { ModeWatcher } from 'mode-watcher'

	let { children } = $props()
</script>

<Toaster />
<ModeWatcher />
<div class="flex max-h-svh flex-1 overflow-hidden">
	<div class="flex w-full flex-1 flex-col">
		{@render children()}
	</div>
</div>
