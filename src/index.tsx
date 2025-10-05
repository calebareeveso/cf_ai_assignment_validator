import { Hono } from 'hono';
import { streamText } from 'hono/streaming';
import { jsxRenderer } from 'hono/jsx-renderer';
import { EventSourceParserStream } from 'eventsource-parser/stream';
import { Ai, D1Database, Workflow } from '@cloudflare/workers-types';
export { ReadmeFetcher } from './readme-fetcher';

type Bindings = {
	AI: Ai;
	cloudflare_ai_assignment_validator_database: D1Database;
	README_FETCHER: Workflow;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
	jsxRenderer(({ children }) => {
		return (
			<html lang="en">
				<head>
					<meta charset="UTF-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1.0" />
					<title>Cloudflare AI Assignment Validator</title>
					<link rel="preconnect" href="https://fonts.googleapis.com" />
					<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
					<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
					<script
						src="https://cdnjs.cloudflare.com/ajax/libs/markdown-it/13.0.2/markdown-it.min.js"
						integrity="sha512-ohlWmsCxOu0bph1om5eDL0jm/83eH09fvqLDhiEdiqfDeJbEvz4FSbeY0gLJSVJwQAp0laRhTXbUQG+ZUuifUQ=="
						crossorigin="anonymous"
						referrerpolicy="no-referrer"
					></script>
					<link
						rel="stylesheet"
						href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css"
						integrity="sha512-0aPQyyeZrWj9sCA46UlmWgKOP0mUipLQ6OZXu8l4IcAmD2u31EPEy9VcIMvl7SoAaKe8bLXZhYoMaE/in+gcgA=="
						crossorigin="anonymous"
						referrerpolicy="no-referrer"
					/>
					<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
					<link href="/static/style.css" rel="stylesheet" />
					<style>{`
					/* Cloudflare Brand Colors */
					:root {
						--cf-orange: #f48120;
						--cf-orange-light: #faad3f;
						--cf-dark: #404041;
						--cf-white: #ffffff;
						--cf-gray-light: #f5f5f5;
						--cf-gray-medium: #e5e5e5;
					}

					body {
						font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
					}

					/* Input Focus Effects */
					#github-url:focus {
						border-color: var(--cf-orange) !important;
						box-shadow: 0 0 0 3px rgba(244, 129, 32, 0.1) !important;
					}

					#message-input:focus {
						border-color: var(--cf-orange) !important;
						box-shadow: 0 0 0 3px rgba(244, 129, 32, 0.1) !important;
					}

					/* Button Hover Effects */
					.cf-button-primary:hover {
						transform: translateY(-2px);
						box-shadow: 0 12px 24px rgba(244, 129, 32, 0.3) !important;
					}

					.cf-button-secondary:hover {
						border-color: var(--cf-orange) !important;
						color: var(--cf-orange) !important;
					}

					.cf-button-danger:hover {
						background-color: #2d2d2e !important;
					}

					/* Modern Loader Styles */
					.loader-container {
						display: flex;
						justify-content: center;
						align-items: center;
						margin-bottom: 1.5rem;
					}

					/* Dots Loader */
					.loader-dots {
						display: flex;
						gap: 8px;
					}

					.loader-dots .dot {
						width: 12px;
						height: 12px;
						border-radius: 50%;
						background: linear-gradient(135deg, var(--cf-orange), var(--cf-orange-light));
						animation: dotPulse 1.4s ease-in-out infinite both;
					}

					.loader-dots .dot:nth-child(1) { animation-delay: -0.32s; }
					.loader-dots .dot:nth-child(2) { animation-delay: -0.16s; }
					.loader-dots .dot:nth-child(3) { animation-delay: 0s; }

					@keyframes dotPulse {
						0%, 80%, 100% {
							transform: scale(0.8);
							opacity: 0.5;
						}
						40% {
							transform: scale(1.2);
							opacity: 1;
						}
					}

					/* Pulse Ring Loader */
					.loader-pulse {
						position: relative;
						width: 60px;
						height: 60px;
					}

					.pulse-ring {
						position: absolute;
						top: 0;
						left: 0;
						width: 100%;
						height: 100%;
						border: 3px solid var(--cf-orange);
						border-radius: 50%;
						animation: pulseRing 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
					}

					.pulse-ring:nth-child(1) { animation-delay: 0s; }
					.pulse-ring:nth-child(2) { animation-delay: 0.5s; }
					.pulse-ring:nth-child(3) { animation-delay: 1s; }

					@keyframes pulseRing {
						0% {
							transform: scale(0.1);
							opacity: 1;
						}
						100% {
							transform: scale(1);
							opacity: 0;
						}
					}

					/* Button Loading Animation */
					#button-loading .animate-spin {
						animation: spin 1s linear infinite;
					}

					@keyframes spin {
						from { transform: rotate(0deg); }
						to { transform: rotate(360deg); }
					}
				`}</style>
				</head>
				<body className="font-sans">{children}</body>
			</html>
		);
	})
);

app.get('/', (c) => {
	return c.render(
		<>
			<div className="flex h-screen" style={{ background: 'linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%)' }}>
				<div className="flex-grow flex flex-col">
					<div
						id="chat-history"
						className="flex-1 overflow-y-auto p-6 space-y-4 bg-white flex flex-col-reverse messages-container"
						style={{ display: 'none' }}
					>
						<button
							id="back-button"
							className="cf-button-secondary fixed left-4 z-10 flex items-center px-4 py-2 bg-white border-2 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 transition-all duration-200"
							style={{ borderColor: 'var(--cf-dark)', color: 'var(--cf-dark)', top: '1px' }}
						>
							<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
							</svg>
							Back
						</button>
						<button
							id="clear-chat"
							className="cf-button-danger fixed right-4 z-10 flex items-center px-4 py-2 text-white rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 transition-all duration-200"
							style={{ backgroundColor: 'var(--cf-dark)', top: '1px' }}
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
						</button>
					</div>
					<div id="validation-results" className="flex-1 overflow-y-auto p-6 space-y-4 bg-white" style={{ display: 'none' }}></div>
					<div id="initial-state" className="flex-1 flex items-center justify-center">
						<div className="max-w-md w-full mx-auto p-8">
							<div className="text-center mb-10">
								<div className="mb-3">
									<h1 className="text-5xl font-bold mb-2" style={{ color: 'var(--cf-dark)' }}>
										<span style={{ color: 'var(--cf-orange)' }}>Cloudflare</span> AI
									</h1>
									<h2 className="text-2xl font-semibold" style={{ color: 'var(--cf-dark)' }}>
										App Assignment Validator
									</h2>
								</div>
								<p className="text-sm mb-2" style={{ color: 'var(--cf-dark)', opacity: 0.8 }}>
									Enter your GitHub repository URL to validate your assignment against the requirements
								</p>
							</div>

							<form id="validation-form" className="space-y-3">
								<div>
									<input
										id="github-url"
										type="url"
										className="border-2 rounded-lg w-full py-3 px-4 leading-tight focus:outline-none transition-all duration-200 text-sm"
										style={{
											borderColor: 'var(--cf-gray-medium)',
											color: 'var(--cf-dark)',
										}}
										placeholder="https://github.com/username/cf_ai_project"
									/>
								</div>

								<button
									id="validate-assignment"
									type="submit"
									className="cf-button-primary w-full px-6 py-3 text-white rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
									style={{
										background: 'linear-gradient(135deg, var(--cf-orange) 0%, var(--cf-orange-light) 100%)',
									}}
								>
									<span id="button-text">Validate Assignment</span>
									<div id="button-loading" className="hidden inline-flex items-center">
										<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
										<span id="loading-text">Fetching README...</span>
									</div>
								</button>
							</form>
						</div>
					</div>
					<div className="px-6 py-4 bg-white shadow-up" style={{ borderTop: '2px solid var(--cf-gray-medium)' }}>
						<form className="flex items-center" id="chat-form">
							<textarea
								id="message-input"
								className="flex-grow m-2 p-3 border-2 rounded-lg shadow-sm transition-all duration-200"
								style={{
									borderColor: 'var(--cf-gray-medium)',
									color: 'var(--cf-dark)',
								}}
								placeholder="Type a message..."
							></textarea>
							<button
								type="submit"
								className="m-2 px-6 py-3 text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
								style={{
									background: 'linear-gradient(135deg, var(--cf-orange) 0%, var(--cf-orange-light) 100%)',
								}}
							>
								Send
							</button>
						</form>
						<div className="text-xs mt-2" style={{ color: 'var(--cf-dark)', opacity: 0.6 }}>
							<p className="model-display">-</p>
							<input type="hidden" className="message-user message-assistant message-model" />
						</div>
					</div>
				</div>
			</div>
			<script src="/static/script.js"></script>
		</>
	);
});

// API endpoint to get messages for a specific chat
app.get('/api/messages/:chatId', async (c) => {
	try {
		const chatId = c.req.param('chatId');
		const result = await c.env.cloudflare_ai_assignment_validator_database
			.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY created_at ASC')
			.bind(chatId)
			.all();
		return c.json({ messages: result.results });
	} catch (error) {
		console.error('Error fetching messages:', error);
		return c.json({ error: 'Failed to fetch messages' }, 500);
	}
});

// API endpoint to save messages for a specific chat
app.post('/api/messages', async (c) => {
	try {
		const { messages, chatId } = await c.req.json();

		// Clear existing messages for this chat
		await c.env.cloudflare_ai_assignment_validator_database.prepare('DELETE FROM messages WHERE chatId = ?').bind(chatId).run();

		// Insert new messages
		for (const message of messages) {
			await c.env.cloudflare_ai_assignment_validator_database
				.prepare('INSERT INTO messages (role, content, chatId) VALUES (?, ?, ?)')
				.bind(message.role, message.content, chatId)
				.run();
		}

		return c.json({ success: true });
	} catch (error) {
		console.error('Error saving messages:', error);
		return c.json({ error: 'Failed to save messages' }, 500);
	}
});

// API endpoint to clear messages for a specific chat
app.delete('/api/messages/:chatId', async (c) => {
	try {
		const chatId = c.req.param('chatId');
		await c.env.cloudflare_ai_assignment_validator_database.prepare('DELETE FROM messages WHERE chatId = ?').bind(chatId).run();
		return c.json({ success: true });
	} catch (error) {
		console.error('Error clearing messages:', error);
		return c.json({ error: 'Failed to clear messages' }, 500);
	}
});

// API endpoint to fetch GitHub README content using workflow
app.post('/api/fetch-readme', async (c) => {
	try {
		const { githubUrl } = await c.req.json();

		if (!githubUrl) {
			return c.json({ error: 'GitHub URL is required' }, 400);
		}

		// Start the workflow to fetch README content
		const workflow = await c.env.README_FETCHER.create({
			params: { githubUrl },
			id: crypto.randomUUID(),
		});

		// Return the workflow ID for status checking
		return c.json({
			workflowId: workflow.id,
			status: 'started',
			message: 'README fetch workflow started',
		});
	} catch (error) {
		console.error('Error starting README fetch workflow:', error);
		return c.json({ error: 'Failed to start README fetch workflow' }, 500);
	}
});

// API endpoint to check workflow status and get results
app.get('/api/fetch-readme/status/:workflowId', async (c) => {
	try {
		const workflowId = c.req.param('workflowId');
		const workflow = await c.env.README_FETCHER.get(workflowId);
		const status = await workflow.status();

		return c.json(status);
	} catch (error) {
		console.error('Error checking workflow status:', error);
		return c.json({ status: 'errored', error: error instanceof Error ? error.message : String(error) }, 500);
	}
});

app.post('/api/chat', async (c) => {
	const payload = await c.req.json();
	const messages = [...payload.messages];

	// Check if this is a validation request (first message in the conversation)
	// If messages length is 1, it's the initial validation request
	// If messages length > 1, it's a follow-up conversation
	const isValidationRequest = messages.length === 1;

	let systemPrompt;

	if (isValidationRequest) {
		// Use the assignment validation system prompt for validation requests
		systemPrompt = `You are an expert Cloudflare AI Developer and Technical Reviewer tasked with evaluating a project for the Cloudflare AI App fast-track assignment. Your goal is to strictly determine if a provided GitHub README document and repository URL indicate that the project meets all of the mandatory five core application requirements and the one mandatory repository naming requirement.

CRITICAL: This is the INITIAL validation request. You MUST respond with EXACTLY the following structured format. Do not deviate from this format:

## Assignment Validation Results

- [ ] **Repository Name Prefix**: [descriptive evidence with specific details]
- [ ] **LLM/AI Engine**: [descriptive evidence with specific model names and implementation details]
- [ ] **Workflow/Coordination**: [descriptive evidence with specific technology and implementation approach]
- [ ] **User Input (Chat/Voice)**: [descriptive evidence with specific interface type and technology used]
- [ ] **Memory or State**: [descriptive evidence with specific storage technology and what is persisted]
- [ ] **Project Documentation**: [descriptive evidence with specific sections and completeness]

INSTRUCTIONS:
1. Analyze the provided GITHUB_URL and README_CONTENT thoroughly
2. For each requirement, determine if it PASSES or FAILS
3. Use [x] for requirements that PASS and [ ] for requirements that FAIL
4. Provide DESCRIPTIVE evidence that includes:
   - Specific technology names (e.g., "Llama 3.3 70B model" not just "AI")
   - Implementation details (e.g., "real-time streaming chat interface" not just "chat")
   - Exact file references when mentioned (e.g., "src/index.tsx lines 359-362")
   - Concrete features (e.g., "D1 SQLite database for persistent chat history" not just "database")
5. Follow the EXACT format above - do not add extra text or change the structure

REQUIREMENTS TO CHECK WITH DETAILED EVIDENCE EXPECTATIONS:

- Repository Name Prefix: 
  * Check if GITHUB_URL contains "/cf_ai_" in the repository name
  * Evidence should state: "Repository named 'cf_ai_[project_name]'" or similar with actual name

- LLM/AI Engine: 
  * Look for specific model names like: Llama 3.3, Mistral, GPT, Claude, or @cf/meta/llama models
  * Evidence should include: Model name, version, and how it's used (e.g., "Uses Llama 3.3 70B via Workers AI for streaming chat responses")
  * NOT acceptable: Generic mentions like "AI" or "machine learning" without specifics

- Workflow/Coordination:
  * Look for: Cloudflare Workflows, Durable Objects, Workers coordination, step functions, orchestration patterns
  * Evidence should describe: What the workflow does and what technology is used (e.g., "Cloudflare Workflows for asynchronous README fetching with status polling")
  * NOT acceptable: Just "uses Workers" without coordination/orchestration details

- User Input (Chat/Voice):
  * Look for: Chat interface, voice input, Cloudflare Pages, Realtime API, WebSocket, SSE, interactive UI
  * Evidence should describe: Interface type and technology (e.g., "Real-time chat interface with streaming AI responses via Server-Sent Events")
  * NOT acceptable: Just "web interface" without interaction details

- Memory or State:
  * Look for: D1, R2, KV, Vectorize, Durable Objects, session storage, database, persistent storage
  * Evidence should describe: Storage technology and what data is persisted (e.g., "D1 SQLite database storing chat history with user/assistant messages indexed by chatId")
  * NOT acceptable: Just "stores data" without technology or purpose details

- Project Documentation:
  * Look for: README sections like Setup, Installation, Deployment, How to Run, Prerequisites, Architecture
  * Evidence should describe: What sections exist and their completeness (e.g., "Comprehensive README with step-by-step setup, database migration instructions, and deployment guide")
  * NOT acceptable: Just "has README" without content assessment`;
	} else {
		// Use the follow-up chat system prompt
		systemPrompt = `You are a helpful assistant for Cloudflare AI development. The user has completed an assignment validation and is now asking follow-up questions.

IMPORTANT: This is a FOLLOW-UP conversation, NOT the initial validation. You should:
- Respond in natural, conversational sentences and paragraphs
- DO NOT use the structured validation format (checkboxes, bullet points)
- Provide detailed explanations and helpful guidance
- Reference the previous validation results when relevant
- Be specific and actionable in your advice
- Use markdown for formatting (headings, bold, lists) but not the validation checkbox format
- Answer questions about requirements, improvements, and best practices

Example responses:
- If asked "What failed?": Explain in sentences which requirements didn't pass and why
- If asked "How to improve?": Provide step-by-step guidance in paragraph form
- If asked about a specific requirement: Give detailed explanations and examples

Remember: Use natural language and conversational tone, not structured validation format.`;
	}

	messages.unshift({ role: 'system', content: systemPrompt });
	//console.log("Model", payload.config.model);
	//console.log("Messages", JSON.stringify(messages));
	let eventSourceStream;
	let retryCount = 0;
	let successfulInference = false;
	let lastError;
	const MAX_RETRIES = 3;
	while (successfulInference === false && retryCount < MAX_RETRIES) {
		try {
			eventSourceStream = (await c.env.AI.run(payload.config.model, {
				messages,
				stream: true,
			})) as ReadableStream;
			successfulInference = true;
		} catch (err) {
			lastError = err;
			retryCount++;
			console.error(err);
			console.log(`Retrying #${retryCount}...`);
		}
	}
	if (eventSourceStream === undefined) {
		if (lastError) {
			throw lastError;
		}
		throw new Error(`Problem with model`);
	}
	// EventSource stream is handy for local event sources, but we want to just stream text
	const tokenStream = eventSourceStream.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream());

	const encoder = new TextEncoder();

	return new Response(
		new ReadableStream({
			async start(controller) {
				try {
					for await (const msg of tokenStream) {
						if ((msg as any).data !== '[DONE]') {
							const data = JSON.parse((msg as any).data);
							if (data.response) {
								// Send as SSE format for immediate streaming
								const sseData = `data: ${JSON.stringify({
									content: data.response,
								})}\n\n`;
								controller.enqueue(encoder.encode(sseData));
							}
						}
					}
					// Send final SSE event
					controller.enqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
				} catch (error) {
					controller.error(error);
				}
			},
		}),
		{
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'Access-Control-Allow-Origin': '*',
			},
		}
	);
});

export default app;
