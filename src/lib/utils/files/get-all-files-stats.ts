import * as fs from 'node:fs/promises'
import * as path from 'path'
import { isIgnored } from '$lib/utils/git/ignore-patterns'
import type { OCRResponse } from '@mistralai/mistralai/models/components'

import { google, mistral } from '$lib/ai/model'
import { generateText } from 'ai'

export async function getAllFilesStats(
	rootPath: string,
	dirPath: string,
) {
	const files = await fs.readdir(dirPath)
	const arrayOfFiles: {
		path: string
		type: string
		content: string
		pdfParsed?: OCRResponse
		imageDescription?: string
	}[] = []

	for (const file of files) {
		const filePath = path.join(dirPath, file)
		const bunFile = Bun.file(filePath)
		const fileStat = await bunFile.stat()

		if (isIgnored(path.relative(rootPath, filePath))) {
			continue
		}

		if (fileStat.isDirectory()) {
			arrayOfFiles.push(
				...(await getAllFilesStats(rootPath, filePath)),
			)
		} else {
			if (bunFile.type.startsWith('application/pdf') && mistral) {
				const base64 = (await bunFile.bytes()).toBase64()

				arrayOfFiles.push({
					path: path.relative(rootPath, filePath),
					type: bunFile.type,
					content: await bunFile.text(),
					pdfParsed: await mistral.ocr.process({
						model: 'mistral-ocr-latest',
						document: {
							type: 'document_url',
							documentUrl: 'data:application/pdf;base64,' + base64,
						},
						includeImageBase64: true,
					}),
				})
			} else if (bunFile.type.startsWith('image/') && google) {
				const arrayBuffer = await bunFile.arrayBuffer()
				const { text } = await generateText({
					model: google('gemini-2.0-flash'),
					messages: [
						{
							role: 'user',
							content: [
								{
									type: 'text',
									text: `
										Description this image as detailed as possible
										The description is most likely going to be used to improve other llm's understanding of the image, so give as much details as possible
									`,
								},
								{ type: 'image', image: arrayBuffer },
							],
						},
					],
				})

				arrayOfFiles.push({
					path: path.relative(rootPath, filePath),
					type: bunFile.type,
					content: await bunFile.text(),
					imageDescription: text,
				})
			} else {
				arrayOfFiles.push({
					path: path.relative(rootPath, filePath),
					type: bunFile.type,
					content: await bunFile.text(),
				})
			}
		}
	}

	return arrayOfFiles
}
