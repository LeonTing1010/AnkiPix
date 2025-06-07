import { App, PluginSettingTab, Setting } from 'obsidian';
import AnkiPixPlugin from '../main';

export class AnkiPixSettingsTab extends PluginSettingTab {
	plugin: AnkiPixPlugin;

	constructor(app: App, plugin: AnkiPixPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Header
		containerEl.createEl('h1', { text: 'AnkiPix Settings' });
		containerEl.createEl('p', { 
			text: 'Configure AnkiPix to automatically generate Anki cards with smart image search.',
			cls: 'setting-item-description'
		});

		// API Configuration Section
		containerEl.createEl('h2', { text: 'API Configuration' });

		new Setting(containerEl)
			.setName('Pixabay API Key')
			.setDesc('Get your free API key from pixabay.com/api/docs/')
			.addText(text => text
				.setPlaceholder('Enter your Pixabay API key')
				.setValue(this.plugin.settings.pixabayApiKey)
				.onChange(async (value) => {
					this.plugin.settings.pixabayApiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Bing Image Search API Key (Optional)')
			.setDesc('For extended image search. Get from Azure Cognitive Services.')
			.addText(text => text
				.setPlaceholder('Enter your Bing API key (optional)')
				.setValue(this.plugin.settings.bingApiKey)
				.onChange(async (value) => {
					this.plugin.settings.bingApiKey = value;
					await this.plugin.saveSettings();
				}));

		// Anki Configuration Section
		containerEl.createEl('h2', { text: 'Anki Configuration' });

		new Setting(containerEl)
			.setName('AnkiConnect URL')
			.setDesc('URL for AnkiConnect. Default is http://localhost:8765')
			.addText(text => text
				.setPlaceholder('http://localhost:8765')
				.setValue(this.plugin.settings.ankiConnectUrl)
				.onChange(async (value) => {
					this.plugin.settings.ankiConnectUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default Deck Name')
			.setDesc('Name of the Anki deck to create cards in')
			.addText(text => text
				.setPlaceholder('AnkiPix Generated')
				.setValue(this.plugin.settings.ankiDeckName)
				.onChange(async (value) => {
					this.plugin.settings.ankiDeckName = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Note Type')
			.setDesc('Anki note type to use for generated cards')
			.addText(text => text
				.setPlaceholder('Basic')
				.setValue(this.plugin.settings.noteType)
				.onChange(async (value) => {
					this.plugin.settings.noteType = value;
					await this.plugin.saveSettings();
				}));

		// Field Mapping Section
		containerEl.createEl('h2', { text: 'Field Mapping' });

		new Setting(containerEl)
			.setName('Front Field Name')
			.setDesc('Name of the field for the front of the card')
			.addText(text => text
				.setPlaceholder('Front')
				.setValue(this.plugin.settings.frontField)
				.onChange(async (value) => {
					this.plugin.settings.frontField = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Back Field Name')
			.setDesc('Name of the field for the back of the card')
			.addText(text => text
				.setPlaceholder('Back')
				.setValue(this.plugin.settings.backField)
				.onChange(async (value) => {
					this.plugin.settings.backField = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Image Field Name')
			.setDesc('Name of the field for images')
			.addText(text => text
				.setPlaceholder('Image')
				.setValue(this.plugin.settings.imageField)
				.onChange(async (value) => {
					this.plugin.settings.imageField = value;
					await this.plugin.saveSettings();
				}));

		// Subject Tags Section
		containerEl.createEl('h2', { text: 'Subject Enhancement' });
		containerEl.createEl('p', { 
			text: 'Enable automatic keyword enhancement for specific subjects',
			cls: 'setting-item-description'
		});

		new Setting(containerEl)
			.setName('Biology Enhancement')
			.setDesc('Add biology-specific keywords like "diagram", "anatomy", "cell"')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.subjectTags.biology)
				.onChange(async (value) => {
					this.plugin.settings.subjectTags.biology = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('English Language Enhancement')
			.setDesc('Add keywords for vocabulary learning like "object", "real", "white background"')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.subjectTags.english)
				.onChange(async (value) => {
					this.plugin.settings.subjectTags.english = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Exam Preparation Enhancement')
			.setDesc('Add keywords for exam content like "concept", "definition", "diagram"')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.subjectTags.exam)
				.onChange(async (value) => {
					this.plugin.settings.subjectTags.exam = value;
					await this.plugin.saveSettings();
				}));

		// Image Quality Section
		containerEl.createEl('h2', { text: 'Image Quality Settings' });

		new Setting(containerEl)
			.setName('Minimum Resolution')
			.setDesc('Minimum image resolution (pixels). Default: 600')
			.addText(text => text
				.setPlaceholder('600')
				.setValue(this.plugin.settings.imageQuality.minResolution.toString())
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.imageQuality.minResolution = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Prefer CC0 Licensed Images')
			.setDesc('Prioritize images with Creative Commons Zero (public domain) license')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.imageQuality.preferCC0)
				.onChange(async (value) => {
					this.plugin.settings.imageQuality.preferCC0 = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Watermark Detection')
			.setDesc('Attempt to filter out images with visible watermarks')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.imageQuality.detectWatermark)
				.onChange(async (value) => {
					this.plugin.settings.imageQuality.detectWatermark = value;
					await this.plugin.saveSettings();
				}));

		// Test Connection Section
		containerEl.createEl('h2', { text: 'Connection Test' });
		
		const testConnectionSetting = new Setting(containerEl)
			.setName('Test AnkiConnect Connection')
			.setDesc('Verify that AnkiConnect is properly configured')
			.addButton(button => button
				.setButtonText('Test Connection')
				.setCta()
				.onClick(async () => {
					button.setButtonText('Testing...');
					button.setDisabled(true);
					
					try {
						const isConnected = await this.plugin.ankiConnectService.testConnection();
						if (isConnected) {
							button.setButtonText('✓ Connected');
							button.removeCta();
						} else {
							button.setButtonText('✗ Failed');
						}
					} catch (error) {
						button.setButtonText('✗ Error');
						console.error('Connection test failed:', error);
					}
					
					setTimeout(() => {
						button.setButtonText('Test Connection');
						button.setCta();
						button.setDisabled(false);
					}, 3000);
				}));

		// Usage Instructions
		containerEl.createEl('h2', { text: 'How to Use' });
		const usageEl = containerEl.createDiv({ cls: 'ankipix-usage-instructions' });
		const ol = usageEl.createEl('ol');
		const steps = [
			{ bold: 'Setup:', text: 'Install AnkiConnect add-on in Anki and ensure Anki is running' },
			{ bold: 'Configure API:', text: 'Add your Pixabay API key above (free registration required)' },
			{ bold: 'Select Text:', text: 'Highlight any text in your notes' },
			{ bold: 'Generate Cards:', text: 'Right-click and select "Generate Anki card with image" or use the ribbon icon' },
			{ bold: 'Review Images:', text: 'Preview and select the best image before creating the card' },
			{ bold: 'Study:', text: 'Your cards will appear in Anki automatically!' }
		];
		for (const step of steps) {
			const li = ol.createEl('li');
			li.createEl('strong', { text: step.bold });
			li.appendText(' ' + step.text);
		}

		// Donation link
		const donateDiv = containerEl.createDiv({ cls: 'ankipix-donate' });
		const donateLink = donateDiv.createEl('a', {
			href: 'https://ko-fi.com/lt1010',
			text: '☕ Buy Me a Coffee',
			cls: 'ankipix-donate-link'
		});
		donateLink.target = '_blank';
	}
}
