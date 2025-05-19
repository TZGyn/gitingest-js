// modified version of https://github.com/ghornich/sort-paths
export function pathsort(items: string[]) {
	return items
		.map(function (item) {
			const path = item

			return {
				item: item,
				pathTokens: path.split('/').map((item, index) => {
					if (index !== path.split('/').length - 1) {
						return item + '/'
					} else {
						return item
					}
				}),
			}
		})
		.sort(function (item_a, item_b) {
			const tokensA = item_a.pathTokens
			const tokensB = item_b.pathTokens

			for (
				let i = 0, len = Math.max(tokensA.length, tokensB.length);
				i < len;
				i++
			) {
				if (!(i in tokensA)) {
					return -1
				}

				if (!(i in tokensB)) {
					return 1
				}

				const tokenA = tokensA[i].toLowerCase()
				const tokenB = tokensB[i].toLowerCase()

				if (tokenA === tokenB) {
					continue
				}

				const isTokenADir = tokenA[tokenA.length - 1] === '/'
				const isTokenBDir = tokenB[tokenB.length - 1] === '/'

				if (isTokenADir === isTokenBDir) {
					return tokenA < tokenB ? -1 : 1
				} else {
					return isTokenADir ? 1 : -1
				}
			}

			return 0
		})
		.map(function (item) {
			return item.item
		})
}
