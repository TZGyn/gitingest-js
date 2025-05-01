import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Mistral } from '@mistralai/mistralai'

export const google = Bun.env.GEMINI_API_KEY
	? createGoogleGenerativeAI({
			apiKey: Bun.env.GEMINI_API_KEY,
	  })
	: null

export const mistral = Bun.env.MISTRAL_API_KEY
	? new Mistral({
			apiKey: Bun.env.MISTRAL_API_KEY,
	  })
	: null
