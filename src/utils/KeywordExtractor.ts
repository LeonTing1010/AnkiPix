export class KeywordExtractor {
	private settings: any;

	constructor(settings: any) {
		this.settings = settings;
	}

	updateSettings(settings: any) {
		this.settings = settings;
	}

	extractKeywords(text: string): string[] {
		if (!text || text.trim().length === 0) {
			return [];
		}

		const cleanText = text.trim();
		const keywords: string[] = [];

		// Handle different text formats
		if (this.isListItem(cleanText)) {
			keywords.push(...this.extractFromListItem(cleanText));
		} else if (this.isDefinition(cleanText)) {
			keywords.push(...this.extractFromDefinition(cleanText));
		} else if (this.isQA(cleanText)) {
			keywords.push(...this.extractFromQA(cleanText));
		} else {
			// Simple extraction for general text
			keywords.push(...this.extractSimpleKeywords(cleanText));
		}

		// Remove duplicates and filter
		return [...new Set(keywords)]
			.filter(keyword => keyword.length > 2)
			.slice(0, 5); // Limit to top 5 keywords
	}

	private isListItem(text: string): boolean {
		return /^[-*+]\s/.test(text.trim());
	}

	private isDefinition(text: string): boolean {
		return text.includes(':') || text.includes(' is ') || text.includes(' are ');
	}

	private isQA(text: string): boolean {
		return text.includes('?') || text.toLowerCase().startsWith('what') || 
			   text.toLowerCase().startsWith('how') || text.toLowerCase().startsWith('why');
	}

	private extractFromListItem(text: string): string[] {
		// Remove list markers and extract the main term
		const cleaned = text.replace(/^[-*+]\s+/, '').trim();
		return this.extractSimpleKeywords(cleaned);
	}

	private extractFromDefinition(text: string): string[] {
		const keywords: string[] = [];
		
		// Split on definition markers
		if (text.includes(':')) {
			const parts = text.split(':');
			if (parts.length >= 2) {
				// The part before ':' is usually the term being defined
				keywords.push(...this.extractNounPhrases(parts[0].trim()));
				// Also extract key terms from the definition
				keywords.push(...this.extractNounPhrases(parts[1].trim()).slice(0, 2));
			}
		} else if (text.includes(' is ')) {
			const parts = text.split(' is ');
			keywords.push(...this.extractNounPhrases(parts[0].trim()));
		} else if (text.includes(' are ')) {
			const parts = text.split(' are ');
			keywords.push(...this.extractNounPhrases(parts[0].trim()));
		}

		return keywords;
	}

	private extractFromQA(text: string): string[] {
		// Extract key terms from questions, focusing on the subject matter
		const cleaned = text
			.replace(/^(what|how|why|when|where|which)\s+/i, '')
			.replace(/\?/g, '')
			.trim();
		
		return this.extractNounPhrases(cleaned);
	}

	private extractSimpleKeywords(text: string): string[] {
		// For simple text, extract the most likely important terms
		const words = this.tokenize(text);
		const filtered = this.filterImportantWords(words);
		
		// Try to extract noun phrases
		const nounPhrases = this.extractNounPhrases(text);
		
		// Combine and prioritize
		const combined = [...nounPhrases, ...filtered];
		return [...new Set(combined)].slice(0, 3);
	}

	private extractNounPhrases(text: string): string[] {
		const phrases: string[] = [];
		
		// Simple noun phrase patterns
		const words = this.tokenize(text);
		
		// Single important words
		const importantWords = this.filterImportantWords(words);
		phrases.push(...importantWords);
		
		// Two-word combinations (adjective + noun patterns)
		for (let i = 0; i < words.length - 1; i++) {
			const current = words[i];
			const next = words[i + 1];
			
			if (this.isLikelyNoun(next) && (this.isLikelyAdjective(current) || this.isLikelyNoun(current))) {
				phrases.push(`${current} ${next}`);
			}
		}
		
		// Three-word combinations for complex terms
		for (let i = 0; i < words.length - 2; i++) {
			const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
			if (this.isLikelyComplexTerm(phrase)) {
				phrases.push(phrase);
			}
		}
		
		return phrases.filter(phrase => phrase.length > 2);
	}

	private tokenize(text: string): string[] {
		return text
			.toLowerCase()
			.replace(/[^\w\s]/g, ' ')
			.split(/\s+/)
			.filter(word => word.length > 1);
	}

	private filterImportantWords(words: string[]): string[] {
		const stopWords = new Set([
			'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
			'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
			'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
			'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
			'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
		]);

		return words.filter(word => 
			!stopWords.has(word) && 
			word.length > 2 &&
			!/^\d+$/.test(word) // Exclude pure numbers
		);
	}

	private isLikelyNoun(word: string): boolean {
		// Simple heuristics for identifying nouns
		const nounEndings = ['tion', 'sion', 'ment', 'ness', 'ity', 'er', 'or', 'ist'];
		const scientificPatterns = /^[a-z]+ology$|^[a-z]+ism$|^[a-z]+gen$/i;
		
		return nounEndings.some(ending => word.endsWith(ending)) ||
			   scientificPatterns.test(word) ||
			   word.length > 4; // Longer words are more likely to be meaningful nouns
	}

	private isLikelyAdjective(word: string): boolean {
		const adjectiveEndings = ['ful', 'less', 'ous', 'ive', 'able', 'ible', 'ant', 'ent'];
		return adjectiveEndings.some(ending => word.endsWith(ending));
	}

	private isLikelyComplexTerm(phrase: string): boolean {
		// Check if this looks like a scientific or technical term
		const scientificPatterns = [
			/\b[a-z]+ acid\b/i,
			/\b[a-z]+ cell\b/i,
			/\b[a-z]+ system\b/i,
			/\b[a-z]+ theory\b/i,
			/\b[a-z]+ process\b/i,
			/\b[a-z]+ method\b/i,
			/\b[a-z]+ syndrome\b/i,
			/\b[a-z]+ disease\b/i
		];
		
		return scientificPatterns.some(pattern => pattern.test(phrase));
	}
}
