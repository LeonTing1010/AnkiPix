import { requestUrl } from 'obsidian';

export interface SearchImage {
	url: string;
	thumbnail?: string;
	width: number;
	height: number;
	source: string;
	tags?: string;
	isCC0?: boolean;
	pixabayId?: number; // Add Pixabay-specific ID field
}

export class ImageSearchService {
	private settings: any;

	constructor(settings: any) {
		this.settings = settings;
	}

	updateSettings(settings: any) {
		this.settings = settings;
	}

	async searchImages(keyword: string, maxResults: number = 9): Promise<SearchImage[]> {
		const results: SearchImage[] = [];

		try {
			// Try Pixabay first (preferred for CC0 images)
			if (this.settings.pixabayApiKey) {
				const pixabayResults = await this.searchPixabay(keyword, maxResults);
				results.push(...pixabayResults);
			}

			// If not enough results and Bing API is available, supplement with Bing
			if (results.length < maxResults && this.settings.bingApiKey) {
				const remainingSlots = maxResults - results.length;
				const bingResults = await this.searchBing(keyword, remainingSlots);
				results.push(...bingResults);
			}

			// Filter by quality settings
			return this.filterImagesByQuality(results);
		} catch (error) {
			console.error('Image search failed:', error);
			throw error;
		}
	}

	private async searchPixabay(keyword: string, maxResults: number): Promise<SearchImage[]> {
		try {
			// Basic validation
			let searchKeyword = keyword.trim();
			if (!searchKeyword || searchKeyword.length === 0) {
				return [];
			}
			
			// Simple keyword cleaning
			searchKeyword = searchKeyword.replace(/[^\w\s\-]/g, ' ').replace(/\s+/g, ' ').trim();
			
			if (!searchKeyword) {
				return [];
			}
			
			// URL encode for API
			const q = encodeURIComponent(searchKeyword.slice(0, 100));
			
			// Add cache-busting to ensure unique requests
			const timestamp = Date.now();
			const randomSeed = Math.floor(Math.random() * 1000000);

			// Build request parameters
			const params = [
				`key=${encodeURIComponent(this.settings.pixabayApiKey)}`,
				`q=${q}`,
				"image_type=photo",
				"orientation=all",
				`min_width=${this.settings.imageQuality.minResolution}`,
				`min_height=${this.settings.imageQuality.minResolution}`,
				`per_page=${Math.min(maxResults, 200)}`,
				"safesearch=true",
				"order=popular",
				`_t=${timestamp}`,
				`_r=${randomSeed}`
			];
			const url = `https://pixabay.com/api/?${params.join("&")}`;

			const response = await requestUrl({
				url: url,
				method: 'GET',
				headers: {
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					'Pragma': 'no-cache',
					'Expires': '0'
				}
			});

			const data = response.json;

			// Check for API errors
			if (response.status !== 200) {
				console.error(`Pixabay API Error: Status ${response.status}`);
				return [];
			}

			if (data?.error) {
				console.error(`Pixabay API Error:`, data.error);
				return [];
			}

			// Validate response structure
			if (!data || typeof data !== 'object') {
				console.error(`Invalid Pixabay response format`);
				return [];
			}

			// Check for results
			if (!data.hits || !Array.isArray(data.hits) || data.hits.length === 0) {
				return [];
			}

			// Convert results to our format
			const results = data.hits.map((hit: any) => ({
				url: hit.webformatURL || hit.largeImageURL,
				thumbnail: hit.previewURL,
				width: hit.webformatWidth || hit.imageWidth,
				height: hit.webformatHeight || hit.imageHeight,
				source: 'Pixabay',
				tags: hit.tags,
				isCC0: true,
				pixabayId: hit.id
			}));

			return results;
		} catch (error) {
			console.error('Pixabay search failed:', error);
			return [];
		}
	}

	private async searchBing(keyword: string, maxResults: number): Promise<SearchImage[]> {
		try {
			const enhancedKeyword = this.enhanceKeyword(keyword);
			const url = `https://api.bing.microsoft.com/v7.0/images/search?q=${encodeURIComponent(enhancedKeyword)}&count=${maxResults}&imageType=Photo&size=Medium`;

			const response = await requestUrl({
				url: url,
				method: 'GET',
				headers: {
					'Ocp-Apim-Subscription-Key': this.settings.bingApiKey
				}
			});

			const data = response.json;

			if (!data.value) {
				return [];
			}

			return data.value.map((item: any) => ({
				url: item.contentUrl,
				thumbnail: item.thumbnailUrl,
				width: item.width,
				height: item.height,
				source: 'Bing',
				tags: item.name,
				isCC0: false // Bing images are not guaranteed CC0
			}));
		} catch (error) {
			console.error('Bing search failed:', error);
			return [];
		}
	}

	private enhanceKeyword(keyword: string): string {
		let enhanced = keyword;

		// Add subject-specific enhancements
		if (this.settings.subjectTags.biology) {
			if (this.isBiologyTerm(keyword)) {
				enhanced += ' biology diagram anatomy cell';
			}
		}

		if (this.settings.subjectTags.english) {
			if (this.isVocabularyTerm(keyword)) {
				enhanced += ' object real white background';
			}
		}

		if (this.settings.subjectTags.exam) {
			enhanced += ' concept definition diagram';
		}

		// Add quality preferences
		if (this.settings.imageQuality.preferCC0) {
			enhanced += ' CC0';
		}

		// Add negative keywords to filter out unwanted content
		enhanced += ' -cartoon -art -abstract -drawing';

		return enhanced;
	}

	private isBiologyTerm(keyword: string): boolean {
		const biologyKeywords = [
			'cell', 'dna', 'rna', 'protein', 'enzyme', 'mitochondria', 'nucleus',
			'membrane', 'organism', 'bacteria', 'virus', 'gene', 'chromosome',
			'photosynthesis', 'respiration', 'metabolism', 'evolution', 'species',
			'anatomy', 'physiology', 'neuron', 'brain', 'heart', 'lung', 'kidney',
			'blood', 'bone', 'muscle', 'tissue', 'organ', 'system'
		];
		
		const lowerKeyword = keyword.toLowerCase();
		return biologyKeywords.some(term => lowerKeyword.includes(term));
	}

	private isVocabularyTerm(keyword: string): boolean {
		// Simple heuristic: if it's a single word or simple phrase, treat as vocabulary
		return keyword.split(' ').length <= 2 && keyword.length < 20;
	}

	private filterImagesByQuality(images: SearchImage[]): SearchImage[] {
		return images.filter(image => {
			// Use more reasonable resolution requirement (max 300px to work with Pixabay previews)
			const effectiveMinResolution = Math.min(this.settings.imageQuality.minResolution, 300);
			
			// Check minimum resolution
			if (image.width < effectiveMinResolution || 
				image.height < effectiveMinResolution) {
				return false;
			}

			// Watermark detection (disabled by default as it was too aggressive)
			if (this.settings.imageQuality.detectWatermark) {
				const suspiciousPatterns = ['getty', 'shutterstock', 'watermark', 'stock'];
				const imageUrl = image.url.toLowerCase();
				const imageTags = (image.tags || '').toLowerCase();
				
				if (suspiciousPatterns.some(pattern => 
					imageUrl.includes(pattern) || imageTags.includes(pattern))) {
					return false;
				}
			}

			return true;
		});
	}
}
