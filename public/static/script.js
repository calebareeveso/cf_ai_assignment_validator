const CHAT_MODEL_DEFAULT = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const domReady = (callback) => {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', callback);
	} else {
		callback();
	}
};

let md;
let currentChatId = null;
let isValidationComplete = false;
let fetchedReadmeContent = null;

// Button state management functions
function updateButtonState(state) {
	const button = document.getElementById('validate-assignment');
	const buttonText = document.getElementById('button-text');
	const buttonLoading = document.getElementById('button-loading');
	const loadingText = document.getElementById('loading-text');

	switch (state) {
		case 'idle':
			button.disabled = false;
			buttonText.style.display = 'inline';
			buttonLoading.style.display = 'none';
			break;
		case 'fetching-readme':
			button.disabled = true;
			buttonText.style.display = 'none';
			buttonLoading.style.display = 'inline-flex';
			loadingText.textContent = 'Fetching README...';
			break;
		case 'validating':
			button.disabled = true;
			buttonText.style.display = 'none';
			buttonLoading.style.display = 'inline-flex';
			loadingText.textContent = 'Validating...';
			break;
	}
}

// Workflow polling function for validation
async function pollWorkflowStatusForValidation(workflowId) {
	const maxAttempts = 30; // 30 seconds max
	let attempts = 0;

	return new Promise((resolve, reject) => {
		const poll = async () => {
			try {
				const response = await fetch(`/api/fetch-readme/status/${workflowId}`);
				const status = await response.json();

				if (status.status === 'completed' || status.status === 'complete') {
					// Handle both 'completed' and 'complete' status
					const result = status.result || status.output;
					if (result && result.success) {
						resolve(result.content);
					} else {
						reject(new Error(result?.error || 'Failed to fetch README content'));
					}
				} else if (status.status === 'errored') {
					reject(new Error(status.error || 'Workflow failed'));
				} else if (attempts < maxAttempts) {
					// Still running, poll again in 1 second
					attempts++;
					setTimeout(poll, 1000);
				} else {
					reject(new Error('Timeout waiting for README fetch to complete'));
				}
			} catch (error) {
				console.error('Error polling workflow status:', error);
				reject(new Error('Error checking workflow status'));
			}
		};

		poll();
	});
}

domReady(async () => {
	md = window.markdownit();

	// Check URL for existing chat
	await checkUrlForChat();

	// Add event listeners
	document.getElementById('validation-form').addEventListener('submit', handleValidation);
	document.getElementById('chat-form').addEventListener('submit', handleChatSubmit);
	document.getElementById('clear-chat').addEventListener('click', clearCurrentChat);
	document.getElementById('back-button').addEventListener('click', handleBackButton);

	// Remove the separate GitHub URL blur handler - we'll handle everything in the form submit

	// Handle Enter key in message input
	document.getElementById('message-input').addEventListener('keydown', function (event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleChatSubmit(event);
		}
	});

	// Handle browser back/forward buttons
	window.addEventListener('popstate', async () => {
		await checkUrlForChat();
	});
});

async function checkUrlForChat() {
	const urlParams = new URLSearchParams(window.location.search);
	const chatId = urlParams.get('chat');

	if (chatId) {
		// Load existing chat
		await loadExistingChat(chatId);
	} else {
		// Show initial state
		showInitialState();
	}
}

async function loadExistingChat(chatId) {
	try {
		// Load messages for this chat
		const messages = await loadChatHistory(chatId);

		if (messages.length > 0) {
			// Check if this chat has validation results
			const hasValidation = messages.some(
				(msg) =>
					msg.content.includes('## Assignment Validation Results') ||
					msg.content.includes('- [') ||
					msg.content.includes('**Repository Name Prefix**')
			);

			if (hasValidation) {
				// Reconstruct validation results and show chat interface
				const validationMessage = messages.find(
					(msg) =>
						msg.content.includes('## Assignment Validation Results') ||
						msg.content.includes('- [') ||
						msg.content.includes('**Repository Name Prefix**')
				);

				if (validationMessage) {
					const validationHtml = parseValidationResults(validationMessage.content);
					await showChatInterfaceWithValidation(chatId, validationHtml, validationMessage.content);
					return;
				}
			}

			// Regular chat without validation
			await showChatInterface(chatId);
		} else {
			// No messages, show initial state
			showInitialState();
		}
	} catch (error) {
		console.error('Error loading existing chat:', error);
		showInitialState();
	}
}

function showInitialState() {
	// Clear URL parameters
	window.history.replaceState({}, document.title, window.location.pathname);
	currentChatId = null;
	isValidationComplete = false;

	document.getElementById('initial-state').style.display = 'flex';
	document.getElementById('chat-history').style.display = 'none';
	document.getElementById('validation-results').style.display = 'none';
	document.getElementById('chat-form').style.display = 'none';
}

async function showChatInterface(chatId) {
	currentChatId = chatId;

	// Update URL with chat ID
	const url = new URL(window.location);
	url.searchParams.set('chat', chatId);
	window.history.pushState({}, '', url);

	document.getElementById('initial-state').style.display = 'none';
	document.getElementById('validation-results').style.display = 'none';
	document.getElementById('chat-history').style.display = 'flex';
	document.getElementById('chat-form').style.display = 'flex';
	document.getElementById('clear-chat').style.display = 'block';

	// Load previous messages for this chat
	await loadChatHistory(chatId);
}

async function showChatInterfaceWithValidation(chatId, validationHtml, validationResponse) {
	currentChatId = chatId;

	// Update URL with chat ID
	const url = new URL(window.location);
	url.searchParams.set('chat', chatId);
	window.history.pushState({}, '', url);

	document.getElementById('initial-state').style.display = 'none';
	document.getElementById('validation-results').style.display = 'none';
	document.getElementById('chat-history').style.display = 'flex';
	document.getElementById('chat-form').style.display = 'flex';
	document.getElementById('clear-chat').style.display = 'block';

	// Add validation results to the top of chat history
	const chatHistory = document.getElementById('chat-history');
	const validationDiv = document.createElement('div');
	validationDiv.style.cssText =
		'background: linear-gradient(135deg, #fff5ed 0%, #fff 100%); border-left: 4px solid #f48120; padding: 1.25rem; margin-bottom: 1rem; border-radius: 0 0.5rem 0.5rem 0;';
	validationDiv.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 0.75rem;">
      <div style="width: 0.75rem; height: 0.75rem; border-radius: 9999px; margin-right: 0.5rem; background: linear-gradient(135deg, #f48120, #faad3f);"></div>
      <h3 style="font-size: 1.125rem; font-weight: 600; color: #404041;">Assignment Validation Results</h3>
    </div>
    ${validationHtml}
    <div style="margin-top: 1rem; padding: 1rem; background: white; border-radius: 0.5rem; border: 2px solid #e5e5e5;">
      <p style="font-size: 0.875rem; margin-bottom: 0.5rem; font-weight: 600; color: #f48120;">💬 You can now ask questions about this validation:</p>
      <div style="font-size: 0.875rem; color: #404041; opacity: 0.8;">
        <div style="margin-bottom: 0.25rem;">• "What exact requirements failed?"</div>
        <div style="margin-bottom: 0.25rem;">• "What evidence was missing for <strong>LLM/AI Engine</strong>?"</div>
        <div style="margin-bottom: 0.25rem;">• "How can I improve my project to pass <strong>Workflow/Coordination</strong>?"</div>
        <div style="margin-bottom: 0.25rem;">• "What should I add to meet the <strong>User Input (Chat/Voice)</strong> requirement?"</div>
        <div style="margin-bottom: 0.25rem;">• "What does the <strong>Memory or State</strong> requirement mean, and how can I address it?"</div>
        <div style="margin-bottom: 0.25rem;">• "What is considered sufficient <strong>Project Documentation</strong>?"</div>
        <div style="margin-bottom: 0.25rem;">• "Can you explain all six requirements and what evidence is needed for each?"</div>
      </div>
    </div>
  `;

	// Insert at the top of chat history
	chatHistory.insertBefore(validationDiv, chatHistory.firstChild);

	// Load previous messages for this chat (excluding the validation messages we just added)
	const messages = await loadChatHistory(chatId);
	// Filter out the validation messages since we already displayed them
	const nonValidationMessages = messages.filter((msg) => {
		// Check if this is a validation message
		const isValidationUserMessage = msg.content.includes('GITHUB_URL:') && msg.content.includes('README_CONTENT:');
		const isValidationAssistantMessage =
			msg.content.includes('## Assignment Validation Results') ||
			msg.content.includes('- [') ||
			msg.content.includes('**Repository Name Prefix**');

		return !isValidationUserMessage && !isValidationAssistantMessage;
	});

	for (const msg of nonValidationMessages) {
		chatHistory.prepend(createChatMessageElement(msg));
	}
}

// Old README handling functions removed - now handled in single validation flow

function handleBackButton() {
	// Clear current chat and return to initial state
	currentChatId = null;
	isValidationComplete = false;
	fetchedReadmeContent = null;

	// Clear URL parameters
	window.history.replaceState({}, document.title, window.location.pathname);

	// Reset form
	document.getElementById('github-url').value = '';

	// Reset button state
	updateButtonState('idle');

	// Show initial state
	showInitialState();
}

async function handleValidation(event) {
	event.preventDefault();

	const githubUrl = document.getElementById('github-url').value;

	if (!githubUrl) {
		alert('Please provide a GitHub repository URL');
		return;
	}

	// Validate GitHub URL format
	if (!githubUrl.includes('github.com/')) {
		alert('Please enter a valid GitHub repository URL');
		return;
	}

	// Extract chatId from GitHub URL (repository name)
	const urlParts = githubUrl.split('/');
	const chatId = urlParts[urlParts.length - 1] || 'unknown';
	currentChatId = chatId;

	// Show loading state immediately
	document.getElementById('initial-state').style.display = 'none';
	document.getElementById('chat-history').style.display = 'none';
	document.getElementById('validation-results').style.display = 'block';
	document.getElementById('chat-form').style.display = 'none';

	// Update button state to show fetching README
	updateButtonState('fetching-readme');

	// Show loading state
	const resultsDiv = document.getElementById('validation-results');
	resultsDiv.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
      <div style="text-align: center;">
          <div class="loader-container">
            <div class="loader-pulse">
              <div class="pulse-ring"></div>
              <div class="pulse-ring"></div>
              <div class="pulse-ring"></div>
            </div>
          </div>
        <p style="font-size: 1.125rem; font-weight: 600; color: #404041;">Fetching README content...</p>
        <p style="font-size: 0.875rem; margin-top: 0.5rem; color: #404041; opacity: 0.7;">This may take a few moments</p>
      </div>
    </div>
  `;

	try {
		// Step 1: Fetch README content using workflow
		let readmeContent = null;
		try {
			// Start the workflow to fetch README content
			const fetchResponse = await fetch('/api/fetch-readme', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ githubUrl }),
			});

			const fetchData = await fetchResponse.json();

			if (fetchResponse.ok) {
				// Poll for workflow completion
				readmeContent = await pollWorkflowStatusForValidation(fetchData.workflowId);
			} else {
				throw new Error(fetchData.error || 'Failed to start README fetch workflow');
			}
		} catch (error) {
			console.error('Error fetching README:', error);
			throw new Error('Failed to fetch README content: ' + error.message);
		}

		// Step 2: Update button state to show validating
		updateButtonState('validating');

		// Update loading message
		resultsDiv.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
        <div style="text-align: center;">
          <div class="loader-container">
            <div class="loader-pulse">
              <div class="pulse-ring"></div>
              <div class="pulse-ring"></div>
              <div class="pulse-ring"></div>
            </div>
          </div>
          <p style="font-size: 1.125rem; font-weight: 600; color: #404041;">Validating assignment...</p>
          <p style="font-size: 0.875rem; margin-top: 0.5rem; color: #404041; opacity: 0.7;">Analyzing requirements and checking compliance</p>
        </div>
      </div>
    `;

		// Step 3: Create validation message and send to AI
		const validationMessage = `GITHUB_URL: ${githubUrl}\n\nREADME_CONTENT:\n${readmeContent}`;

		// Send validation request
		const response = await fetch('/api/chat', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				messages: [{ role: 'user', content: validationMessage }],
				config: {
					model: CHAT_MODEL_DEFAULT,
					systemMessage: 'Use the system prompt for validation',
				},
			}),
		});

		let validationResponse = '';
		const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

		while (true) {
			const { value, done } = await reader.read();
			if (done) break;

			const lines = value.split('\n');
			for (const line of lines) {
				if (line.startsWith('data: ')) {
					const data = line.slice(6);
					if (data === '[DONE]') break;
					try {
						const parsed = JSON.parse(data);
						if (parsed.content) {
							validationResponse += parsed.content;
							// Don't update UI during streaming - keep showing loader
						}
					} catch (e) {
						validationResponse += data;
						// Don't update UI during streaming - keep showing loader
					}
				}
			}
		}

		// Parse XML response and create requirement checkboxes
		const validationHtml = parseValidationResults(validationResponse);

		// Save the validation conversation
		await saveMessages(chatId, [
			{ role: 'user', content: validationMessage },
			{ role: 'assistant', content: validationResponse },
		]);

		isValidationComplete = true;

		// Reset button state to idle
		updateButtonState('idle');

		// Show chat interface with validation results at the top
		showChatInterfaceWithValidation(chatId, validationHtml, validationResponse);
	} catch (error) {
		console.error('Validation error:', error);
		resultsDiv.innerHTML = `
      <div style="text-align: center; color: #404041;">
        <p style="font-weight: 600; font-size: 1.125rem; margin-bottom: 1rem;">Error during validation: ${error.message}</p>
        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; color: white; border-radius: 0.5rem; font-weight: 600; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); transition: all 0.2s; background: linear-gradient(135deg, #f48120, #faad3f); border: none; cursor: pointer;">
          Try Again
        </button>
      </div>
    `;
		// Reset button state
		updateButtonState('idle');
	}
}

function parseValidationResults(response) {
	// Try to extract markdown checkbox validation results
	const lines = response.split('\n');
	const requirements = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const checkboxMatch = line.match(/^- \[([x ])\] \*\*(.*?)\*\*: (.*)$/);

		if (checkboxMatch) {
			const isChecked = checkboxMatch[1] === 'x';
			const title = checkboxMatch[2];
			const description = checkboxMatch[3];

			// Look for evidence in the next line
			let evidence = '';
			if (i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
				const evidenceMatch = lines[i + 1].match(/\|\s*\[(.*?)\]/);
				if (evidenceMatch) {
					evidence = evidenceMatch[1];
				}
			}

			requirements.push({
				title,
				description,
				checked: isChecked,
				evidence,
			});
		}
	}

	// Create visual requirement checklist
	if (requirements.length > 0) {
		const passedCount = requirements.filter((r) => r.checked).length;
		const totalCount = requirements.length;
		const allPassed = passedCount === totalCount;

		const checklistHtml = `
      <div style="border-radius: 1rem; margin-bottom: 1.5rem; overflow: hidden; background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%); border: 2px solid ${
				allPassed ? '#f48120' : '#e5e5e5'
			}; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">
        <!-- Header -->
        <div style="padding: 1.25rem; background: linear-gradient(135deg, ${allPassed ? '#f48120' : '#404041'} 0%, ${
			allPassed ? '#faad3f' : '#2d2d2e'
		} 100%);">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <h3 style="font-size: 1.25rem; font-weight: 700; color: white; margin-bottom: 0.25rem;">Validation Results</h3>
              <p style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.9);">
                ${passedCount} of ${totalCount} requirements met
              </p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 1.875rem; font-weight: 700; color: white;">${passedCount}/${totalCount}</div>
              <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.9);">
                ${allPassed ? '✓ All Passed' : 'Review Needed'}
              </div>
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div style="height: 0.5rem; background: #e5e5e5;">
          <div style="height: 100%; transition: all 0.5s; width: ${
						(passedCount / totalCount) * 100
					}%; background: linear-gradient(90deg, #f48120 0%, #faad3f 100%);"></div>
        </div>

        <!-- Requirements List -->
        <div style="padding: 1.25rem;">
          ${requirements
						.map(
							(req, index) => `
            <div style="border-radius: 0.5rem; margin-bottom: 0.75rem; background: white; border: 2px solid ${
							req.checked ? '#f48120' : '#e5e5e5'
						}; ${req.checked ? 'box-shadow: 0 2px 8px rgba(244, 129, 32, 0.15);' : ''}">
              <div style="padding: 1rem;">
                <div style="display: flex; align-items: flex-start;">
                  <!-- Checkbox -->
                  <div style="flex-shrink: 0; margin-top: 0.25rem; margin-right: 0.75rem;">
                    ${
											req.checked
												? `<div style="width: 1.5rem; height: 1.5rem; border-radius: 9999px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f48120, #faad3f);">
                        <svg style="width: 1rem; height: 1rem; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>`
												: `<div style="width: 1.5rem; height: 1.5rem; border-radius: 9999px; border: 2px solid #e5e5e5; background: white;"></div>`
										}
                  </div>

                  <!-- Content -->
                  <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                      <span style="font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.5rem; border-radius: 9999px; margin-right: 0.5rem; background: ${
												req.checked ? '#fff5ed' : '#f5f5f5'
											}; color: ${req.checked ? '#f48120' : '#404041'};">
                        #${index + 1}
                      </span>
                      <h4 style="font-weight: 700; font-size: 1rem; color: ${req.checked ? '#f48120' : '#404041'};">
                        ${req.title}
                      </h4>
                    </div>
                    
                    <p style="font-size: 0.875rem; line-height: 1.5; margin-bottom: 0.75rem; color: #404041; opacity: 0.85;">
                      ${req.description}
                    </p>
                    
                    ${
											req.evidence
												? `<div style="margin-top: 0.75rem; padding: 0.75rem; border-radius: 0.5rem; background: linear-gradient(135deg, #fff5ed 0%, #ffffff 100%); border-left: 4px solid #f48120;">
                        <div style="display: flex; align-items: flex-start;">
                          <svg style="width: 1rem; height: 1rem; margin-right: 0.5rem; flex-shrink: 0; margin-top: 0.125rem; color: #f48120;" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                          </svg>
                          <div style="flex: 1;">
                            <p style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; color: #f48120;">Evidence Found:</p>
                            <p style="font-size: 0.875rem; font-style: italic; line-height: 1.5; color: #404041;">"${req.evidence}"</p>
                          </div>
                        </div>
                      </div>`
												: ''
										}
                  </div>
                </div>
              </div>
            </div>
          `
						)
						.join('')}
        </div>

        <!-- Footer Summary -->
        <div style="padding: 1rem; border-top: 2px solid #e5e5e5; background: #f9f9f9;">
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.875rem;">
            <div style="color: #404041; opacity: 0.7;">
              ${allPassed ? '🎉 Congratulations! All requirements are met.' : '⚠️ Some requirements need attention.'}
            </div>
            <div style="font-weight: 600; color: ${allPassed ? '#f48120' : '#404041'};">
              ${Math.round((passedCount / totalCount) * 100)}% Complete
            </div>
          </div>
        </div>
      </div>
    `;

		return checklistHtml;
	}

	// If no checkboxes found, return the full response
	return md.render(response);
}

async function handleChatSubmit(event) {
	event.preventDefault();

	if (!currentChatId) return;

	const input = document.getElementById('message-input');
	const chatHistory = document.getElementById('chat-history');

	const userMsg = { role: 'user', content: input.value };
	chatHistory.prepend(createChatMessageElement(userMsg));

	const messages = await loadChatHistory(currentChatId);
	messages.push(userMsg);

	input.value = '';

	// Show assistant message
	const assistantMsg = { role: 'assistant', content: '' };
	const assistantMessage = createChatMessageElement(assistantMsg);
	chatHistory.prepend(assistantMessage);
	const assistantResponse = assistantMessage.firstChild;

	// Scroll to latest message
	chatHistory.scrollTop = chatHistory.scrollHeight;

	try {
		const response = await fetch('/api/chat', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				messages,
				config: {
					model: CHAT_MODEL_DEFAULT,
					systemMessage: isValidationComplete
						? 'You are a helpful assistant for Cloudflare AI development. The user has just completed an assignment validation and may ask questions about the results, requirements, or how to improve their project. Be helpful and specific in your responses.'
						: 'Use the system prompt for validation',
				},
			}),
		});

		const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

		while (true) {
			const { value, done } = await reader.read();
			if (done) break;

			const lines = value.split('\n');
			for (const line of lines) {
				if (line.startsWith('data: ')) {
					const data = line.slice(6);
					if (data === '[DONE]') break;
					try {
						const parsed = JSON.parse(data);
						if (parsed.content) {
							assistantMsg.content += parsed.content;
							assistantResponse.innerHTML = md.render(assistantMsg.content);
						}
					} catch (e) {
						assistantMsg.content += data;
						assistantResponse.innerHTML = md.render(assistantMsg.content);
					}
				}
			}
		}

		// Highlight code and save messages
		highlightCode(assistantMessage);
		messages.push(assistantMsg);
		await saveMessages(currentChatId, messages);
	} catch (error) {
		console.error('Chat error:', error);
		assistantMsg.content = 'Sorry, there was an error processing your request.';
		assistantResponse.innerHTML = md.render(assistantMsg.content);
	}
}

function createChatMessageElement(msg) {
	const div = document.createElement('div');
	div.className = `message-${msg.role}`;

	if (msg.role === 'assistant') {
		const response = document.createElement('div');
		response.className = 'response';
		const html = md.render(msg.content);
		response.innerHTML = html;
		div.appendChild(response);
		highlightCode(div);
	} else {
		const userMessage = document.createElement('p');
		userMessage.innerText = msg.content;
		div.appendChild(userMessage);
	}

	return div;
}

function highlightCode(content) {
	const codeEls = [...content.querySelectorAll('code')];
	for (const codeEl of codeEls) {
		hljs.highlightElement(codeEl);
	}
}

async function loadChatHistory(chatId) {
	try {
		const response = await fetch(`/api/messages/${chatId}`);
		const data = await response.json();
		return data.messages || [];
	} catch (error) {
		console.error('Error loading chat history:', error);
		return [];
	}
}

async function saveMessages(chatId, messages) {
	try {
		await fetch('/api/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ messages, chatId }),
		});
	} catch (error) {
		console.error('Error saving messages:', error);
	}
}

async function clearCurrentChat() {
	if (!currentChatId) return;

	try {
		await fetch(`/api/messages/${currentChatId}`, {
			method: 'DELETE',
		});

		// Clear UI
		document.getElementById('chat-history').innerHTML = '';

		// Reset state and URL
		currentChatId = null;
		isValidationComplete = false;

		// Clear URL parameters
		window.history.replaceState({}, document.title, window.location.pathname);

		showInitialState();
	} catch (error) {
		console.error('Error clearing chat:', error);
	}
}
