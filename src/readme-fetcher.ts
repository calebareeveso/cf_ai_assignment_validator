import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

type Bindings = {
	README_FETCHER: Workflow;
};

type ReadmeFetchPayload = {
	githubUrl: string;
};

export class ReadmeFetcher extends WorkflowEntrypoint<Bindings, ReadmeFetchPayload> {
	async run(event: WorkflowEvent<ReadmeFetchPayload>, step: WorkflowStep) {
		const { githubUrl } = event.payload;

		return await step.do('fetch-readme', async () => {
			try {
				// Convert GitHub URL to raw README URL
				const rawReadmeUrl = githubUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/') + '/main/README.md';

				// Fetch the README content
				const response = await fetch(rawReadmeUrl);

				if (!response.ok) {
					// Try with master branch if main doesn't exist
					const masterUrl = githubUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/') + '/master/README.md';

					const masterResponse = await fetch(masterUrl);
					if (!masterResponse.ok) {
						throw new Error('Failed to fetch README content');
					}

					const content = await masterResponse.text();
					return { content, url: masterUrl, success: true };
				}

				const content = await response.text();
				return { content, url: rawReadmeUrl, success: true };
			} catch (error) {
				console.error('Error fetching README:', error);
				return {
					content: null,
					url: null,
					success: false,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		});
	}
}
