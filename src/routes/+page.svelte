<script lang="ts">
	import { makeClient } from '$lib/api-client'

	const client = makeClient(fetch)
</script>

<h1>Welcome to SvelteKit</h1>
<p>
	Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a>
	to read the documentation
</p>

<!-- svelte-ignore a11y_consider_explicit_label -->
<button
	onclick={async () => {
		const tasks = await client.ingest.$get({
			query: { repo: 'https://github.com/TZGyn/gitingest-js.git' },
		})
	}}>
	Fetch
</button>
