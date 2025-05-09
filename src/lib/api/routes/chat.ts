import { Hono } from 'hono'

// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { describeRoute, openAPISpecs } from 'hono-openapi'
import { resolver, validator as zValidator } from 'hono-openapi/zod'
import { z } from 'zod'
import { getLatestCommit } from '$lib/utils/git/get-latest-commit'
import { db } from '$lib/db'
import { git } from '$lib/db/schema'
import { google, mistral } from '$lib/ai/model'
import {
	convertToCoreMessages,
	createDataStreamResponse,
	generateText,
	smoothStream,
	streamText,
} from 'ai'

const app = new Hono().post(
	'/',
	zValidator(
		'json',
		z.object({
			messages: z.any(),
			repo: z
				.string()
				.refine(
					(url) => {
						try {
							const repo = new URL(url)
							if (
								!['github.com', 'gitlab.com'].includes(repo.hostname)
							) {
								return false
							}
							return true
						} catch (error) {
							return false
						}
					},
					{
						message: 'Invalid url, must be github.com or gitlab.com',
					},
				)
				.transform((url) => new URL(url))
				.openapi({
					example: 'https://github.com/TZGyn/gitingest-js.git',
				}),
			branch: z
				.string()
				.optional()
				.nullable()
				.openapi({ nullable: true }),
			commit: z
				.string()
				.optional()
				.nullable()
				.openapi({ nullable: true }),
		}),
	),
	async (c) => {
		if (!google) {
			return c.text('Chat not enabled', { status: 500 })
		}
		const { messages } = c.req.valid('json')

		let coreMessages = convertToCoreMessages(messages)

		const model = google('gemini-2.0-flash')

		return createDataStreamResponse({
			headers: {
				...c.res.headers,
			},
			execute: async (dataStream) => {
				// dataStream.writeMessageAnnotation({
				// 	type: 'model',
				// 	model: 'Google Gemini Flash',
				// })

				// dataStream.writeData({
				// 	type: 'message',
				// 	message: 'Understanding prompt',
				// })

				// dataStream.writeData({
				// 	type: 'message',
				// 	message: 'Generating Response',
				// })

				const additionalSystemPrompt = {
					chat: `
						YOU ARE NOT ALLOWED TO CALL ANY TOOLS, DONT USE PREVIOUS CHATS TO FAKE CALL TOOLS
						ONLY TREAT THIS AS TEXT TO TEXT CHAT

						You have also been given image generation tool, do not ask for confirmation, just relay the user request
						The tool can also take in an image url if its use for editing, please decide whether or not to include an image url based on the context
						Example: If an user ask to generate an image of a cat, then ask to give it clothes, please provide the image url for editing
						Another example: if an user ask to generate an image of a cat with transparent background
						Dont say back to the user you cant generate a transparent background 
						Just use the tool and let the user see the result themselves

						Remember to evaluate after using the tools
						
						IMPORTANT NOTES FOR IMAGE GENERATION TOOL: ONCE YOU RECEIVE THE FILES URL, THE IMAGE GENERATION IS CONSIDERED DONE
					`,
					x_search: `
						You have been given an ability to search X(formerly Twitter)'s posts
						'You MUST run the tool first exactly once'
						DO NOT ASK THE USER FOR CONFIRMATION!
					`,
					web_search: `
						You have been given a web search ability, 
						'You MUST run the tool first exactly once'
						DO NOT ASK THE USER FOR CONFIRMATION!
					`,
					academic_search: `
						You have been given an ability to search academic papers
						'You MUST run the tool first exactly once'
						DO NOT ASK THE USER FOR CONFIRMATION!
					`,
					web_reader: `
						You have been given an ability to fetch url as markdown 
						'You MUST run the tool first exactly once'
						DO NOT ASK THE USER FOR CONFIRMATION!
					`,
					image: `
						You have been given an ability to generate image 
						'You MUST run the tool first exactly once'
						USE 1:1 aspect ratio if not specified and 1 image as default unless specified
						DO NOT ASK THE USER FOR CONFIRMATION!
					`,
					'gpt-image-1': `
						You have been given an ability to generate image 
						'You MUST run the tool first exactly once'
						USE 1:1 aspect ratio if not specified and 1 image as default unless specified
						DO NOT ASK THE USER FOR CONFIRMATION!
					`,
				}

				const result = streamText({
					model: model,
					messages: coreMessages,
					system: `
						You are a chat assistant

						Today's Date: ${new Date().toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'short',
							day: '2-digit',
							weekday: 'short',
						})}

						Note: frontend has a tool to display mermaid code, 
						so you don't have to tell the user you don't have the ability to render mermaid code 
						or tell the user how to render them

						if a math equation is generated, wrap it around $$ for katex inline styling and $$ for block
						example:

						(inline)
						Pythagorean theorem: $$a^2+b^2=c^2$$

						(block)
						$$
						\mathcal{L}\{f\}(s) = \int_0^{\infty} {f(t)e^{-st}dt}
						$$

						DONT USE $$ UNLESS YOU NEED TO GENERATE MATH FORMULAS

						WRAP CODE AROUND \`IF INLINE\`
						WRAP CODE AROUND
						\`\`\`
						IF BLOCK
						\`\`\`
						You must put the programming language for codeblock so frontend can make correct syntax highlighting
						eg:
						\`\`\`javascript
						javascript code
						\`\`\`

						Do not generate tool call details to the user
						It is a must to generate some text, letting the user knows your thinking process before using a tool.
						Thus providing better user experience, rather than immediately jump to using the tool and generate a conclusion

						Common Order: Tool, Text
						Better order you must follow: Text, Tool, Text

						If the tools return an unauthenticated error due to user not logged in, please say the following to the user:
						"You must be logged in to use this feature, if you sign up we will give you 50 credits (worth $0.50)"
					`,
					providerOptions: {},
					abortSignal: c.req.raw.signal,
					maxSteps: 5,
					// experimental_activeTools: [...activeTools(mode)],
					onError: (error) => {
						console.log('Error', error)
					},
					experimental_transform: smoothStream({
						delayInMs: 20, // optional: defaults to 10ms
						chunking: 'word', // optional: defaults to 'word'
					}),
				})

				result.mergeIntoDataStream(dataStream, {
					sendReasoning: true,
				})
			},
			onError: (error) => {
				// Error messages are masked by default for security reasons.
				// If you want to expose the error message to the client, you can do so here:
				console.log('Stream Error', error)
				return error instanceof Error ? error.message : String(error)
			},
		})
	},
)

export { app as ChatRoute }
