const DELIMITER_LIST = [
	{ left: '$$', right: '$$', display: true },
	{ left: '$$', right: '$$', display: false },
	// { left: '$', right: '$', display: false },
	// { left: '\\pu{', right: '}', display: false },
	// { left: '\\ce{', right: '}', display: false },
	// { left: '\\(', right: '\\)', display: false },
	// { left: '\\[', right: '\\]', display: true },
	// {
	// 	left: '\\begin{equation}',
	// 	right: '\\end{equation}',
	// 	display: true,
	// },
]

// const DELIMITER_LIST = [
//     { left: '$$', right: '$$', display: false },
//     { left: '$', right: '$', display: false },
// ];

// const inlineRule = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\1(?=[\s?!\.,:？！。，：]|$)/;
// const blockRule = /^(\${1,2})\n((?:\\[^]|[^\\])+?)\n\1(?:\n|$)/;

let inlinePatterns: string[] = []
let blockPatterns: string[] = []

function escapeRegex(string: string) {
	return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

function generateRegexRules(delimiters: any[]) {
	delimiters.forEach((delimiter) => {
		const { left, right, display } = delimiter
		// Ensure regex-safe delimiters
		const escapedLeft = escapeRegex(left)
		const escapedRight = escapeRegex(right)

		if (!display) {
			// For inline delimiters, we match everything
			inlinePatterns.push(
				`${escapedLeft}((?:\\\\[^]|[^\\\\])+?)${escapedRight}`,
			)
		} else {
			// Block delimiters doubles as inline delimiters when not followed by a newline
			inlinePatterns.push(
				`${escapedLeft}(?!\\n)((?:\\\\[^]|[^\\\\])+?)(?!\\n)${escapedRight}`,
			)
			blockPatterns.push(
				`${escapedLeft}\\n((?:\\\\[^]|[^\\\\])+?)\\n${escapedRight}`,
			)
		}
	})

	// Math formulas can end in special characters
	const inlineRule = new RegExp(
		`^(${inlinePatterns.join('|')})(?=[\\s?。，!-\/:-@[-\`{-~]|$)`,
		'u',
	)
	const blockRule = new RegExp(
		`^(${blockPatterns.join('|')})(?=[\\s?。，!-\/:-@[-\`{-~]|$)`,
		'u',
	)

	return { inlineRule, blockRule }
}

const { inlineRule, blockRule } = generateRegexRules(DELIMITER_LIST)

// export default function (options = {}) {
// 	return {
// 		extensions: [inlineKatex(options), blockKatex(options)],
// 	}
// }
export const markedKatexExtension = (options = {}) => {
	return {
		extensions: [inlineKatex(options), blockKatex(options)],
	}
}

function katexStart(src: string, displayMode: boolean) {
	let ruleReg = displayMode ? blockRule : inlineRule

	let indexSrc = src

	while (indexSrc) {
		let index = -1
		let startIndex = -1
		let startDelimiter = ''
		let endDelimiter = ''
		for (let delimiter of DELIMITER_LIST) {
			if (delimiter.display !== displayMode) {
				continue
			}

			startIndex = indexSrc.indexOf(delimiter.left)
			if (startIndex === -1) {
				continue
			}

			index = startIndex
			startDelimiter = delimiter.left
			endDelimiter = delimiter.right
		}

		if (index === -1) {
			return
		}

		// Check if the delimiter is preceded by a special character.
		// If it does, then it's potentially a math formula.
		const f =
			index === 0 ||
			indexSrc.charAt(index - 1).match(/[\s?。，!-\/:-@[-`{-~]/)
		if (f) {
			const possibleKatex = indexSrc.substring(index)

			if (possibleKatex.match(ruleReg)) {
				return index
			}
		}

		indexSrc = indexSrc
			.substring(index + startDelimiter.length)
			.replace(endDelimiter, '')
	}
}

function katexTokenizer(
	src: string,
	tokens: any,
	displayMode: boolean,
) {
	let ruleReg = displayMode ? blockRule : inlineRule
	let type = displayMode ? 'blockKatex' : 'inlineKatex'

	const match = src.match(ruleReg)

	if (match) {
		const text = match
			.slice(2)
			.filter((item) => item)
			.find((item) => item.trim())

		return {
			type,
			raw: match[0],
			text: text,
			displayMode,
		}
	}
}

function inlineKatex(options: any) {
	return {
		name: 'inlineKatex',
		level: 'inline',
		start(src: string) {
			return katexStart(src, false)
		},
		tokenizer(src: string, tokens: any) {
			return katexTokenizer(src, tokens, false)
		},
		renderer(token: any) {
			return `${token?.text ?? ''}`
		},
	}
}

function blockKatex(options: any) {
	return {
		name: 'blockKatex',
		level: 'block',
		start(src: string) {
			return katexStart(src, true)
		},
		tokenizer(src: string, tokens: any) {
			return katexTokenizer(src, tokens, true)
		},
		renderer(token: any) {
			return `${token?.text ?? ''}`
		},
	}
}
