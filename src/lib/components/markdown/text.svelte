<script lang="ts">
	let { text }: { text: string } = $props()

	function parseTimestampsAndText(str: string) {
		// const regex = /\[(\d+):(\d{2}):(\d{2})\]\s*([^[]*)/g // Regular expression to match optional hours, minutes, seconds, and text segments
		const regex = /\[(?:(\d+):)?(\d{2}):(\d{2})\]\s*([^[]*)/g
		let matches
		const results = []
		let lastIndex = 0

		while ((matches = regex.exec(str)) !== null) {
			const hours = parseInt(matches[1], 10)
			const minutes = parseInt(matches[2], 10)
			const seconds = parseInt(matches[3], 10)
			const text = matches[4]

			// Extract the text before the timestamp
			const precedingText = str.substring(lastIndex, matches.index)

			results.push({
				precedingText: precedingText,
				hours: hours || 0,
				minutes: minutes,
				seconds: seconds,
				text: text,
			})

			lastIndex = matches.index + matches[0].length // Update lastIndex to the end of the current match
		}

		// Handle any remaining text after the last timestamp
		const remainingText = str.substring(lastIndex)
		if (remainingText) {
			results.push({
				precedingText: remainingText,
				hours: null,
				minutes: null,
				seconds: null,
				text: null,
			})
		}

		return results
	}

	let results = $derived(parseTimestampsAndText(text))
</script>

{#each results as result}
	<span>{result.precedingText}</span>
	{#if result.hours !== null && result.minutes !== null && result.seconds !== null}
		<a
			href={`${result.hours * 60 * 60 + result.minutes * 60 + result.seconds}`}
			class="youtube-timestamp bg-secondary rounded px-1 py-0 text-sm no-underline">
			{#if result.hours}
				{result.hours}:{(result.minutes < 10 ? '0' : '') +
					result.minutes}:{(result.seconds < 10 ? '0' : '') +
					result.seconds}
			{:else}
				{(result.minutes < 10 ? '0' : '') +
					result.minutes}:{(result.seconds < 10 ? '0' : '') +
					result.seconds}
			{/if}
		</a>
	{/if}
	{#if result.text}
		<span>
			{result.text}
		</span>
	{/if}
{/each}
