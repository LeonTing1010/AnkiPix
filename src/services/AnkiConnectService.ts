import { requestUrl } from 'obsidian';

export interface AnkiNote {
	deckName: string;
	modelName: string;
	fields: Record<string, string>;
	tags: string[];
}

export class AnkiConnectService {
	private url: string;

	constructor(url: string) {
		this.url = url;
	}

	updateUrl(url: string) {
		this.url = url;
	}

	async testConnection(): Promise<boolean> {
		try {
			const response = await this.makeRequest('version', 6);
			return response !== null;
		} catch (error) {
			return false;
		}
	}

	async createNote(note: AnkiNote): Promise<void> {
		try {
			// First, ensure the deck exists
			await this.createDeckIfNotExists(note.deckName);

			// Check if a similar note already exists to avoid duplicates
			const frontFieldValue = note.fields[Object.keys(note.fields)[0]];
			const existingNotes = await this.findNotes(`deck:"${note.deckName}" ${frontFieldValue}`);
			
			if (existingNotes && existingNotes.length > 0) {
				throw new Error(`Card with content "${frontFieldValue}" already exists in deck "${note.deckName}"`);
			}

			// Create the note
			const result = await this.makeRequest('addNote', 6, {
				note: {
					deckName: note.deckName,
					modelName: note.modelName,
					fields: note.fields,
					tags: note.tags
				}
			});

			if (result === null) {
				throw new Error('Failed to create note - null response from AnkiConnect');
			}

			return result;
		} catch (error) {
			throw new Error(`Failed to create Anki note: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	async findNotes(query: string): Promise<number[]> {
		try {
			return await this.makeRequest('findNotes', 6, {
				query: query
			});
		} catch (error) {
			return [];
		}
	}

	async createDeckIfNotExists(deckName: string): Promise<void> {
		try {
			// Get all deck names
			const deckNames = await this.makeRequest('deckNames', 6);
			
			if (!deckNames.includes(deckName)) {
				// Create the deck if it doesn't exist
				await this.makeRequest('createDeck', 6, {
					deck: deckName
				});
			}
		} catch (error) {
			throw new Error(`Failed to create deck: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	async getModelNames(): Promise<string[]> {
		try {
			return await this.makeRequest('modelNames', 6);
		} catch (error) {
			return ['Basic']; // Fallback
		}
	}

	async getFieldNames(modelName: string): Promise<string[]> {
		try {
			return await this.makeRequest('modelFieldNames', 6, {
				modelName: modelName
			});
		} catch (error) {
			return ['Front', 'Back']; // Fallback
		}
	}

	private async makeRequest(action: string, version: number, params?: any): Promise<any> {
		const body = {
			action: action,
			version: version,
			params: params || {}
		};

		try {
			const response = await requestUrl({
				url: this.url,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body)
			});

			const data = response.json;

			if (data.error) {
				throw new Error(data.error);
			}

			return data.result;
		} catch (error) {
			if (error instanceof Error && 
				(error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED'))) {
				throw new Error('Cannot connect to AnkiConnect. Please ensure Anki is running with the AnkiConnect add-on installed.');
			}
			throw error;
		}
	}
}
