// https://github.com/hughsk/path-sort
export function pathsort(paths: string[], sep?: string) {
	sep = sep || '/'

	return paths
		.map(function (el) {
			return el.split(sep)
		})
		.sort(sorter)
		.map(function (el) {
			return el.join(sep)
		})
}

function sorter(a: string[], b: string[]) {
	var l = Math.max(a.length, b.length)
	for (var i = 0; i < l; i += 1) {
		if (!(i in a)) return -1
		if (!(i in b)) return +1
		if (a[i].toUpperCase() > b[i].toUpperCase()) return +1
		if (a[i].toUpperCase() < b[i].toUpperCase()) return -1
		if (a.length < b.length) return -1
		if (a.length > b.length) return +1
	}
	return 0
}

export function standalone(sep: string) {
	sep = sep || '/'
	return function pathsort(a: string, b: string) {
		return sorter(a.split(sep), b.split(sep))
	}
}
