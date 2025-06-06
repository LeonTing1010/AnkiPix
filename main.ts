import { Plugin, Editor, MarkdownView, MarkdownFileInfo, Setting, SettingTab, Notice, Modal, TFile, requestUrl } from 'obsidian';
import { AnkiPixSettingsTab } from './src/settings';
import { ImageSearchModal } from './src/modals/ImageSearchModal';
import { AnkiConnectService } from './src/services/AnkiConnectService';
import { ImageSearchService } from './src/services/ImageSearchService';
import { KeywordExtractor } from './src/utils/KeywordExtractor';

interface AnkiPixSettings {
	pixabayApiKey: string;
	bingApiKey: string;
	ankiConnectUrl: string;
	ankiDeckName: string;
	noteType: string;
	frontField: string;
	backField: string;
	imageField: string;
	subjectTags: {
		biology: boolean;
		english: boolean;
		exam: boolean;
	};
	imageQuality: {
		minResolution: number;
		preferCC0: boolean;
		detectWatermark: boolean;
	};
}

const DEFAULT_SETTINGS: AnkiPixSettings = {
	pixabayApiKey: '',
	bingApiKey: '',
	ankiConnectUrl: 'http://localhost:8765',
	ankiDeckName: 'AnkiPix Generated',
	noteType: 'Basic',
	frontField: 'Front',
	backField: 'Back',
	imageField: 'Image',
	subjectTags: {
		biology: true,
		english: true,
		exam: true
	},
	imageQuality: {
		minResolution: 600,
		preferCC0: true,
		detectWatermark: true
	}
};

export default class AnkiPixPlugin extends Plugin {
	settings: AnkiPixSettings;
	ankiConnectService: AnkiConnectService;
	imageSearchService: ImageSearchService;
	keywordExtractor: KeywordExtractor;

	async onload() {
		await this.loadSettings();

		// Initialize services
		this.ankiConnectService = new AnkiConnectService(this.settings.ankiConnectUrl);
		this.imageSearchService = new ImageSearchService(this.settings);
		this.keywordExtractor = new KeywordExtractor(this.settings);

		// Add ribbon icon
		this.addRibbonIcon('image-plus', 'AnkiPix: Generate Anki cards with images', (evt: MouseEvent) => {
			this.generateCardsFromSelection();
		});

		// Add commands
		this.addCommand({
			id: 'generate-anki-cards',
			name: 'Generate Anki cards from selection',
			editorCallback: (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
				if (ctx instanceof MarkdownView) {
					this.generateCardsFromSelection(editor);
				}
			}
		});

		this.addCommand({
			id: 'batch-generate-from-list',
			name: 'Batch generate from list',
			editorCallback: (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
				if (ctx instanceof MarkdownView) {
					this.batchGenerateFromList(editor);
				}
			}
		});

		// Add settings tab
		this.addSettingTab(new AnkiPixSettingsTab(this.app, this));

		// Add context menu
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor, view) => {
				const selection = editor.getSelection();
				if (selection) {
					menu.addItem((item) => {
						item
							.setTitle('Generate Anki card with image')
							.setIcon('image-plus')
							.onClick(async () => {
								await this.generateCardsFromSelection(editor);
							});
					});
				}
			})
		);

		console.log('AnkiPix plugin loaded successfully');
	}

	onunload() {
		console.log('AnkiPix plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Update services with new settings
		this.ankiConnectService?.updateUrl(this.settings.ankiConnectUrl);
		this.imageSearchService?.updateSettings(this.settings);
		this.keywordExtractor?.updateSettings(this.settings);
	}

	async generateCardsFromSelection(editor?: Editor) {
		try {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView) {
				new Notice('Please open a markdown file first');
				return;
			}

			const currentEditor = editor || activeView.editor;
			const selection = currentEditor.getSelection();
			
			if (!selection || selection.trim().length === 0) {
				new Notice('Please select some text first');
				return;
			}

			// Check AnkiConnect connection
			const isConnected = await this.ankiConnectService.testConnection();
			if (!isConnected) {
				new Notice('Cannot connect to Anki. Please ensure Anki is running with AnkiConnect installed.');
				return;
			}

			// Extract keywords from selection
			const keywords = this.keywordExtractor.extractKeywords(selection);
			
			if (keywords.length === 0) {
				new Notice('No keywords could be extracted from the selection');
				return;
			}

			// Open image search modal
			new ImageSearchModal(
				this.app,
				keywords,
				this.imageSearchService,
				this.ankiConnectService,
				this.settings,
				selection
			).open();

		} catch (error) {
			console.error('Error generating cards:', error);
			new Notice('Error generating cards: ' + (error instanceof Error ? error.message : String(error)));
		}
	}

	async batchGenerateFromList(editor: Editor) {
		try {
			const selection = editor.getSelection();
			if (!selection) {
				new Notice('Please select a list of items first');
				return;
			}

			// Parse list items (support both - and * formats)
			const listItems = selection
				.split('\n')
				.map(line => line.trim())
				.filter(line => line.startsWith('-') || line.startsWith('*'))
				.map(line => line.replace(/^[-*]\s*/, '').trim())
				.filter(item => item.length > 0);

			if (listItems.length === 0) {
				new Notice('No list items found in selection. Please select a bulleted list.');
				return;
			}

			if (listItems.length > 50) {
				new Notice('Too many items selected. Please select 50 or fewer items for batch processing.');
				return;
			}

			// Check AnkiConnect connection
			const isConnected = await this.ankiConnectService.testConnection();
			if (!isConnected) {
				new Notice('Cannot connect to Anki. Please ensure Anki is running with AnkiConnect installed.');
				return;
			}

			new Notice(`Processing ${listItems.length} items...`);

			// Process each item
			let successCount = 0;
			for (const item of listItems) {
				try {
					const keywords = this.keywordExtractor.extractKeywords(item);
					if (keywords.length > 0) {
						const images = await this.imageSearchService.searchImages(keywords[0], 1);
						if (images.length > 0) {
							await this.ankiConnectService.createNote({
								deckName: this.settings.ankiDeckName,
								modelName: this.settings.noteType,
								fields: {
									[this.settings.frontField]: item,
									[this.settings.backField]: `Image for: ${item}`,
									[this.settings.imageField]: images[0].url
								},
								tags: ['ankipix', 'batch-generated']
							});
							successCount++;
						}
					}
				} catch (error) {
					console.error(`Error processing item "${item}":`, error);
				}
			}

			new Notice(`Successfully created ${successCount}/${listItems.length} Anki cards`);

		} catch (error) {
			console.error('Error in batch generation:', error);
			new Notice('Error in batch generation: ' + (error instanceof Error ? error.message : String(error)));
		}
	}
}
