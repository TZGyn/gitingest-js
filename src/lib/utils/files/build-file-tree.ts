export type Children = {
	name: string
	value: number
	children: Children[]
}

export function buildTree(paths: string[]) {
	let map: Record<
		string,
		{
			name: string
			value: number
			children: Children[]
		}
	> = {
		'': {
			name: 'root',
			value: 100,
			children: [],
		},
	}
	let stack = ['']

	for (let path of paths) {
		let nodes = path.split('/')
		for (let i = 0; i < nodes.length; i++) {
			let currentPath = '/' + nodes.slice(1, i + 1).join('/')
			let lastPath = stack[stack.length - 1]
			let parent = map[lastPath]
			if (!map[currentPath]) {
				let node = {
					name: currentPath,
					value: 100, // or any other value you want to assign
					children: [],
				}
				parent.children.push(node)
				map[currentPath] = node
			}
			stack.push(currentPath)
		}
		stack = stack.slice(0, 1)
	}
	return map[''].children
}
