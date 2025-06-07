import { Modal, App, Setting, Notice, MarkdownView } from 'obsidian';
import { ImageSearchService, SearchImage } from '../services/ImageSearchService';
import { AnkiConnectService } from '../services/AnkiConnectService';

export class ImageSearchModal extends Modal {
	private keywords: string[];
	private imageSearchService: ImageSearchService;
	private ankiConnectService: AnkiConnectService;
	private settings: any;
	private originalText: string;
	private images: SearchImage[] = [];
	private selectedImage: SearchImage | null = null;
	private isSearching = false;
	private imagesContainer: HTMLElement;
	private createCardButton: HTMLButtonElement;

	private batchKeywords: string[] = [];
	private batchSelections: { keyword: string, image: SearchImage | null }[] = [];
	private batchIndex: number = 0;

	constructor(
		app: App,
		keywords: string[],
		imageSearchService: ImageSearchService,
		ankiConnectService: AnkiConnectService,
		settings: any,
		originalText: string
	) {
		super(app);
		this.keywords = keywords;
		this.imageSearchService = imageSearchService;
		this.ankiConnectService = ankiConnectService;
		this.settings = settings;
		this.originalText = originalText;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// 检查是否为多关键词批量模式
		const lines = this.originalText.split('\n').map(line => line.trim()).filter(line => line && line.replace(/[-\s]/g, '') !== '');
		
		if (lines.length > 1) {
			this.batchKeywords = lines;
			this.batchSelections = [];
			this.batchIndex = 0;
			this.openBatchStep();
			return;
		}

		// Modal header
		contentEl.createEl('h2', { text: 'Generate Anki Card with Image' });
		
		// Original text preview
		const textPreview = contentEl.createDiv({ cls: 'ankipix-text-preview' });
		textPreview.createEl('h3', { text: 'Selected Text:' });
		textPreview.createEl('p', { text: this.originalText, cls: 'ankipix-original-text' });
		
		// Keywords display
		const keywordsDiv = contentEl.createDiv({ cls: 'ankipix-keywords' });
		keywordsDiv.createEl('h3', { text: 'Search Keywords:' });
		const keywordsList = keywordsDiv.createEl('div', { cls: 'ankipix-keywords-list' });
		this.keywords.forEach(keyword => {
			keywordsList.createEl('span', { text: keyword, cls: 'ankipix-keyword-tag' });
		});

	// Search controls
	const searchControls = contentEl.createDiv({ cls: 'ankipix-search-controls' });
	
	let customSearchValue = '';
	const customKeywordSetting = new Setting(searchControls)
		.setName('Custom Search Term')
		.setDesc('Override automatic keywords with your own search term')
		.addText(text => {
			text.setPlaceholder('Enter custom search term...');
			text.inputEl.addEventListener('keypress', (e) => {
				if (e.key === 'Enter') {
					this.searchImages(text.getValue() || this.keywords[0]);
				}
			});
			text.inputEl.addEventListener('input', () => {
				customSearchValue = text.getValue();
			});
		})
		.addButton(button => {
			button.setButtonText('Search')
				.setCta()
				.onClick(() => {
					this.searchImages(customSearchValue || this.keywords[0]);
				});
		});

		// Images container
		const imagesContainer = contentEl.createDiv({ cls: 'ankipix-images-container' });
		
		// Buttons container
		const buttonsContainer = contentEl.createDiv({ cls: 'ankipix-buttons' });
		
		const createCardButton = buttonsContainer.createEl('button', {
			text: 'Create Anki Card',
			cls: 'mod-cta ankipix-create-button'
		}) as HTMLButtonElement;
		createCardButton.disabled = true;
		createCardButton.addEventListener('click', () => this.createAnkiCard());
		
		const cancelButton = buttonsContainer.createEl('button', {
			text: 'Cancel',
			cls: 'ankipix-cancel-button'
		});
		cancelButton.addEventListener('click', () => this.close());

		// Store references for later use
		this.imagesContainer = imagesContainer;
		this.createCardButton = createCardButton;

		// Start initial search
		this.searchImages(this.keywords[0]);
	}
	async searchImages(searchTerm: string) {
		if (this.isSearching) return;
		
		this.isSearching = true;
		this.imagesContainer.empty();
		
		const loadingEl = this.imagesContainer.createDiv({ cls: 'ankipix-loading' });
		loadingEl.textContent = 'Searching for images...';

		try {
			this.images = await this.imageSearchService.searchImages(searchTerm, 9);
			
			this.imagesContainer.empty();
			
			if (this.images.length === 0) {
				this.imagesContainer.createDiv({ 
					cls: 'ankipix-no-results',
					text: 'No images found. Try a different search term.' 
				});
				return;
			}

			// Create image grid
			const imageGrid = this.imagesContainer.createDiv({ cls: 'ankipix-image-grid' });
			
			this.images.forEach((image, index) => {
				const imageItem = imageGrid.createDiv({ cls: 'ankipix-image-item' });
				
				// Use thumbnail for display, full URL for final card
				let imageUrl = image.thumbnail || image.url;
				
				const img = imageItem.createEl('img');
				img.src = imageUrl;
				img.alt = image.tags || 'Search result';
				
				// Add loading state initially
				imageItem.addClass('loading');
				
				// Add error handling for image loading
				img.onerror = () => {
					imageItem.addClass('ankipix-image-error');
					imageItem.removeClass('loading');
					img.alt = 'Failed to load image';
					
					// Try fallback URL if thumbnail failed
					if (img.src === image.thumbnail && image.url !== image.thumbnail) {
						imageItem.removeClass('ankipix-image-error');
						imageItem.addClass('loading');
						img.src = image.url;
					}
				};

				img.onload = () => {
					imageItem.removeClass('ankipix-image-error');
					imageItem.removeClass('loading');
					imageItem.addClass('loaded');
				};
				
				// Image info
				const infoDiv = imageItem.createDiv({ cls: 'ankipix-image-info' });
				infoDiv.createEl('div', { text: `${image.width}×${image.height}`, cls: 'ankipix-image-size' });
				if (image.source) {
					infoDiv.createEl('div', { text: image.source, cls: 'ankipix-image-source' });
				}
				
				// Click handler
				imageItem.addEventListener('click', () => {
					// Remove previous selection
					imageGrid.querySelectorAll('.ankipix-image-item').forEach(item => {
						item.removeClass('selected');
					});
					
					// Add selection to current item
					imageItem.addClass('selected');
					this.selectedImage = image;
					this.createCardButton.disabled = false;
				});
			});

		} catch (error) {
			this.imagesContainer.empty();
			this.imagesContainer.createDiv({ 
				cls: 'ankipix-error',
				text: 'Error searching for images. Please check your API configuration.' 
			});
			new Notice('Image search failed: ' + (error instanceof Error ? error.message : String(error)));
		} finally {
			this.isSearching = false;
		}
	}

	async createAnkiCard() {
		if (!this.originalText) {
			new Notice('No text selected');
			return;
		}

		const lines = this.originalText.split('\n').map(line => line.trim()).filter(line => line);
		if (lines.length > 1) {
			let created = 0;
			for (const line of lines) {
				if (!line || line.replace(/[-\s]/g, '') === '') continue; // 跳过空行或无效行
				try {
					const images = await this.imageSearchService.searchImages(line, 9);
					if (!images || images.length === 0) continue;
					const selected = images[0];
					const imageUrl = selected.url;
					const imageFieldContent = `<img src="${imageUrl}" class="ankipix-anki-card-image">`;
					const cardData = {
						deckName: this.settings.ankiDeckName,
						modelName: this.settings.noteType,
						fields: {
							[this.settings.frontField]: line,
							[this.settings.backField]: `Images for: ${line}<br>${imageFieldContent}`
						},
						picture: [{
							url: imageUrl,
							fields: [this.settings.backField]
						}],
						tags: ['ankipix', 'auto-generated']
					};
					await this.ankiConnectService.createNote(cardData);
					created++;
				} catch (error) {
					// Skip failed cards
				}
			}
			new Notice(`Batch created ${created} Anki cards!`);
			this.close();
			return;
		}

		// 单行逻辑
		if (!this.images || this.images.length === 0) {
			new Notice('No images to add to card');
			return;
		}

		try {
			this.createCardButton.textContent = 'Creating card...';
			this.createCardButton.disabled = true;
		const selected = this.selectedImage || this.images[0];
		const imageUrl = selected.url;
		const imageFieldContent = `<img src="${imageUrl}" class="ankipix-anki-card-image">`;

		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (markdownView && markdownView.editor) {
			const editor = markdownView.editor;
			const insertText = `![](${imageUrl})`;
			const cursor = editor.getCursor();
			editor.replaceRange('\n' + insertText + '\n', cursor);
			}

			const cardData = {
				deckName: this.settings.ankiDeckName,
				modelName: this.settings.noteType,
				fields: {
					[this.settings.frontField]: this.originalText,
					[this.settings.backField]: `Images for: ${this.originalText}<br>${imageFieldContent}`
				},
				picture: [{
					url: imageUrl,
					fields: [this.settings.backField]
				}],
				tags: ['ankipix', 'auto-generated']
			};

			await this.ankiConnectService.createNote(cardData);

			new Notice('Anki card created successfully!');
			this.close();

		} catch (error) {
			new Notice('Failed to create Anki card: ' + (error instanceof Error ? error.message : String(error)));
			this.createCardButton.textContent = 'Create Anki Card';
			this.createCardButton.disabled = false;
		}
	}

	async openBatchStep() {
		const { contentEl } = this;
		contentEl.empty();
		const currentKeyword = this.batchKeywords[this.batchIndex];
		// 修正：Pixabay/Bing API 400，关键词不能有多余空格或无效内容
		const safeKeyword = currentKeyword.replace(/[-\s]/g, '').length === 0 ? '' : currentKeyword.replace(/\s+/g, ' ').trim();
		if (!safeKeyword) {
			this.batchSelections.push({ keyword: currentKeyword, image: null });
			if (this.batchIndex < this.batchKeywords.length - 1) {
				this.batchIndex++;
				this.openBatchStep();
			} else {
				await this.openBatchFinishStep();
			}
			return;
		}
		
		contentEl.createEl('h2', { text: `Step ${this.batchIndex + 1} / ${this.batchKeywords.length}` });
		contentEl.createEl('h3', { text: `Keyword: ${currentKeyword}` });
		const imagesContainer = contentEl.createDiv({ cls: 'ankipix-images-container' });
		const loadingEl = imagesContainer.createDiv({ cls: 'ankipix-loading' });
		loadingEl.textContent = 'Searching for images...';

		let images: SearchImage[] = [];
		try {
			images = await this.imageSearchService.searchImages(safeKeyword, 9);
			imagesContainer.empty();
			
			if (images.length === 0) {
				imagesContainer.createDiv({ cls: 'ankipix-no-results', text: 'No images found. Try a different search term.' });
				
				// Add custom search input
				const customSearchDiv = contentEl.createDiv({ cls: 'ankipix-custom-search' });
				customSearchDiv.createEl('label', { text: 'Try a custom search term:' });
				const customInput = customSearchDiv.createEl('input', { 
					type: 'text', 
					placeholder: `Try different words for "${currentKeyword}"...`,
					cls: 'ankipix-custom-input'
				});
				customInput.value = currentKeyword; // Pre-fill with current keyword
				
				// Create buttons for user to choose what to do
				const buttons = contentEl.createDiv({ cls: 'ankipix-buttons' });
				
				const searchBtn = buttons.createEl('button', { text: 'Search Custom Term', cls: 'mod-cta' });
				searchBtn.addEventListener('click', async () => {
					const customTerm = customInput.value.trim();
					if (customTerm) {
						// Replace the current keyword temporarily and search again
						const originalKeyword = this.batchKeywords[this.batchIndex];
						this.batchKeywords[this.batchIndex] = customTerm;
						this.openBatchStep();
						// Restore original keyword for card creation
						this.batchKeywords[this.batchIndex] = originalKeyword;
					}
				});
				
				// Allow Enter key to trigger search
				customInput.addEventListener('keypress', (e) => {
					if (e.key === 'Enter') {
						searchBtn.click();
					}
				});
				
				const retryBtn = buttons.createEl('button', { text: 'Retry Original', cls: 'ankipix-retry-button' });
				retryBtn.addEventListener('click', () => {
					this.openBatchStep(); // Retry the current keyword
				});
				
				const skipBtn = buttons.createEl('button', { text: 'Skip This Word', cls: 'ankipix-skip-button' });
				skipBtn.addEventListener('click', () => {
					this.batchSelections.push({ keyword: currentKeyword, image: null });
					if (this.batchIndex < this.batchKeywords.length - 1) {
						this.batchIndex++;
						this.openBatchStep();
					} else {
						this.openBatchFinishStep();
					}
				});
				
				const cancelBtn = buttons.createEl('button', { text: 'Cancel', cls: 'ankipix-cancel-button' });
				cancelBtn.addEventListener('click', () => this.close());
				
				return;
			}
			
			// Successfully found images - create the image grid
			const imageGrid = imagesContainer.createDiv({ cls: 'ankipix-image-grid' });
			let selected: SearchImage | null = null;
			
			// Create buttons first so we can reference them
			const buttons = contentEl.createDiv({ cls: 'ankipix-buttons' });
			const nextBtn = buttons.createEl('button', { 
				text: this.batchIndex < this.batchKeywords.length - 1 ? 'Next' : 'Continue to Review', 
				cls: 'mod-cta ankipix-create-button' 
			});
			nextBtn.disabled = true;
			
			// Update button state when image is selected
			const updateButtonState = () => {
				nextBtn.disabled = !selected;
			};
			
			images.forEach((image, index) => {
				const imageItem = imageGrid.createDiv({ cls: 'ankipix-image-item' });
				
				// Determine which image URL to use
				// For display in the grid, use thumbnail for faster loading
				let imageUrl = image.thumbnail || image.url;
				
				const img = imageItem.createEl('img');
				img.src = imageUrl;
				img.alt = image.tags || 'Search result';
				
				// Add loading state initially
				imageItem.addClass('loading');
				
				// Add error handling for image loading
				img.onerror = () => {
					imageItem.addClass('ankipix-image-error');
					imageItem.removeClass('loading');
					img.alt = 'Failed to load image';
					
					// Try fallback URL if thumbnail failed
					if (img.src === image.thumbnail && image.url !== image.thumbnail) {
						imageItem.removeClass('ankipix-image-error');
						imageItem.addClass('loading');
						img.src = image.url;
					}
				};
				
				img.onload = () => {
					imageItem.removeClass('ankipix-image-error');
					imageItem.removeClass('loading');
					imageItem.addClass('loaded');
				};
				
				const infoDiv = imageItem.createDiv({ cls: 'ankipix-image-info' });
				infoDiv.createEl('div', { text: `${image.width}×${image.height}`, cls: 'ankipix-image-size' });
				if (image.source) {
					infoDiv.createEl('div', { text: image.source, cls: 'ankipix-image-source' });
				}
				imageItem.addEventListener('click', () => {
					imageGrid.querySelectorAll('.ankipix-image-item').forEach(item => item.removeClass('selected'));
					imageItem.addClass('selected');
					selected = image;
					updateButtonState();
				});
			});

			nextBtn.addEventListener('click', async () => {
				if (!selected) return;
				this.batchSelections.push({ keyword: currentKeyword, image: selected });
				if (this.batchIndex < this.batchKeywords.length - 1) {
					this.batchIndex++;
					this.openBatchStep();
				} else {
					await this.openBatchFinishStep();
				}
			});
			
			const cancelBtn = buttons.createEl('button', { text: 'Cancel', cls: 'ankipix-cancel-button' });
			cancelBtn.addEventListener('click', () => this.close());
		} catch (error) {
			imagesContainer.empty();
			imagesContainer.createDiv({ cls: 'ankipix-error', text: 'Error searching for images. Please try again.' });
			
			// Create buttons for user to choose what to do
			const buttons = contentEl.createDiv({ cls: 'ankipix-buttons' });
			
			const retryBtn = buttons.createEl('button', { text: 'Retry Search', cls: 'mod-cta' });
			retryBtn.addEventListener('click', () => {
				this.openBatchStep(); // Retry the current keyword
			});
			
			const skipBtn = buttons.createEl('button', { text: 'Skip This Word', cls: 'ankipix-skip-button' });
			skipBtn.addEventListener('click', () => {
				this.batchSelections.push({ keyword: currentKeyword, image: null });
				if (this.batchIndex < this.batchKeywords.length - 1) {
					this.batchIndex++;
					this.openBatchStep();
				} else {
					this.openBatchFinishStep();
				}
			});
			
			const cancelBtn = buttons.createEl('button', { text: 'Cancel', cls: 'ankipix-cancel-button' });
			cancelBtn.addEventListener('click', () => this.close());
		}
	}

	// New step: show summary and only enable Finish after cards are created
	async openBatchFinishStep() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Review and Create Cards' });
		contentEl.createEl('p', { text: 'Please review your selections before creating the cards:' });
		
		const summary = contentEl.createEl('ul', { cls: 'ankipix-summary-list' });
		let validSelections = 0;
		this.batchSelections.forEach(sel => {
			const listItem = summary.createEl('li');
			listItem.createEl('strong', { text: sel.keyword });
			if (sel.image) {
				listItem.appendText(' ✓ Image selected');
				validSelections++;
			} else {
				listItem.appendText(' ✗ No image (will be skipped)');
			}
		});
		
		if (validSelections === 0) {
			contentEl.createEl('p', { text: 'No valid cards to create. Please go back and select images.', cls: 'ankipix-warning' });
			const backBtn = contentEl.createDiv({ cls: 'ankipix-buttons' }).createEl('button', { text: 'Back', cls: 'mod-cta' });
			backBtn.addEventListener('click', () => {
				this.batchIndex = 0;
				this.batchSelections = [];
				this.openBatchStep();
			});
			return;
		}
		
		contentEl.createEl('p', { text: `${validSelections} cards will be created.` });
		
		const buttons = contentEl.createDiv({ cls: 'ankipix-buttons' });
		const createBtn = buttons.createEl('button', { text: 'Create Cards', cls: 'mod-cta ankipix-create-button' });
		const backBtn = buttons.createEl('button', { text: 'Back to Edit', cls: 'ankipix-back-button' });
		const cancelBtn = buttons.createEl('button', { text: 'Cancel', cls: 'ankipix-cancel-button' });
		
		backBtn.addEventListener('click', () => {
			this.batchIndex = 0;
			this.batchSelections = [];
			this.openBatchStep();
		});
		
		cancelBtn.addEventListener('click', () => this.close());

		createBtn.addEventListener('click', async () => {
			// Disable all buttons and show loading state
			createBtn.disabled = true;
			backBtn.disabled = true;
			cancelBtn.disabled = true;
			createBtn.textContent = 'Creating cards...';
			
			// Add progress indicator
			const progressEl = contentEl.createDiv({ cls: 'ankipix-progress' });
			progressEl.textContent = 'Initializing...';
			
			let created = 0;
			let skipped = 0;
			let failed = 0;
			let duplicates = 0;
			
			for (let i = 0; i < this.batchSelections.length; i++) {
				const sel = this.batchSelections[i];
				progressEl.textContent = `Processing ${i + 1}/${this.batchSelections.length}: ${sel.keyword}`;
				
				if (!sel.image) {
					skipped++;
					continue;			}
			
			try {
				const imageUrl = sel.image.url;
				const imageFieldContent = `<img src="${imageUrl}" class="ankipix-anki-card-image">`;
				const cardData = {
					deckName: this.settings.ankiDeckName,
					modelName: this.settings.noteType,
					fields: {
						[this.settings.frontField]: sel.keyword,
						[this.settings.backField]: `Images for: ${sel.keyword}<br>${imageFieldContent}`
						},
						picture: [{ url: imageUrl, fields: [this.settings.backField] }],
						tags: ['ankipix', 'auto-generated']
					};
					await this.ankiConnectService.createNote(cardData);
					created++;
				} catch (error) {
					if (error instanceof Error && error.message.includes('already exists')) {
						duplicates++;
					} else {
						failed++;
					}
				}
				
				// Small delay to prevent overwhelming AnkiConnect
				await new Promise(resolve => setTimeout(resolve, 100));
			}
			
			// Show results
			progressEl.textContent = 'Complete!';
			createBtn.textContent = 'Create Cards';
			
			// Prepare result message
			const results = [];
			if (created > 0) results.push(`${created} cards created`);
			if (duplicates > 0) results.push(`${duplicates} duplicates skipped`);
			if (skipped > 0) results.push(`${skipped} items skipped (no image)`);
			if (failed > 0) results.push(`${failed} failed`);
			
			const resultMessage = results.join(', ');
			new Notice(`Batch processing complete: ${resultMessage}`);
			
			if (failed > 0) {
				new Notice('Some cards failed to create. Check console for details.');
			}
			
			// Add "Close" button and delay automatic close
			createBtn.textContent = 'Close';
			createBtn.disabled = false;
			createBtn.onclick = () => this.close();
			
			// Auto-close after 3 seconds if user doesn't interact
			setTimeout(() => {
				if (createBtn.textContent === 'Close') {
					this.close();
				}
			}, 3000);
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
