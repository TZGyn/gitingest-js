import { type OCRResponse } from '@mistralai/mistralai/models/components'

export const formatFiles = (
	files: {
		path: string
		type: string
		content: string
		pdfParsed?: OCRResponse
		imageDescription?: string
	}[],
) => {
	const formatPDFResponse = (parsedPDF?: OCRResponse) => {
		if (!parsedPDF) return ''

		return parsedPDF.pages
			.map((page) => {
				return page.markdown + '\n'
			})
			.join('\n')
	}
	const text = files
		.map((file) => {
			let output = '='.repeat(48)
			output += '\n'
			output += 'FILE: ' + file.path
			output += '\n'
			output += '='.repeat(48)
			output += '\n'
			output +=
				file.type.split(';')[0] === 'application/pdf'
					? formatPDFResponse(file.pdfParsed)
					: file.type.split(';')[0].startsWith('image/')
						? file.imageDescription
						: file.content
			return output
		})
		.join('\n\n')
	return text
}
