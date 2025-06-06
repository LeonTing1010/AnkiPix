# AnkiPix - Smart Image for Anki Cards

AnkiPix is an Obsidian plugin that automatically generates Anki flashcards with smart image search from your notes. Simply select text in your notes, and AnkiPix will find relevant images and create Anki cards instantly.

## Features

### 🎯 **Core Features**
- **One-click card generation**: Select text in Obsidian and generate Anki cards with images instantly
- **Smart image search**: Automatically searches for relevant, high-quality images using multiple APIs
- **Subject-aware keywords**: Intelligent keyword enhancement for Biology, English, and Exam preparation
- **Quality control**: Filters images by resolution, watermarks, and licensing
- **Direct Anki integration**: Cards are automatically added to your Anki deck via AnkiConnect

### 🔧 **Smart Features**
- **Multi-source search**: Uses Pixabay (CC0 licensed) and optionally Bing Image Search
- **Automatic keyword enhancement**: Adds subject-specific terms to improve search results
- **Batch processing**: Generate multiple cards from bulleted lists
- **Customizable templates**: Configure card fields and deck names
- **Preview and select**: Review images before creating cards

### 📚 **Perfect for**
- **Students**: Create visual flashcards for vocabulary, biology terms, historical events
- **Teachers**: Quickly generate educational materials with relevant imagery
- **Language learners**: Build vocabulary cards with real object images
- **Medical students**: Find anatomical diagrams and medical imagery
- **Researchers**: Organize knowledge with visual associations

## Installation

### Prerequisites
1. **Anki**: Download and install [Anki](https://apps.ankiweb.net/)
2. **AnkiConnect**: Install the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on in Anki
3. **API Keys**: Sign up for a free [Pixabay API key](https://pixabay.com/api/docs/)

### Install Plugin
1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "AnkiPix"
4. Install and enable the plugin
5. Configure your settings (see Configuration section)

## Configuration

### API Setup
1. **Pixabay API Key** (Required): 
   - Sign up at [pixabay.com](https://pixabay.com/accounts/register/)
   - Go to [API documentation](https://pixabay.com/api/docs/)
   - Copy your API key to AnkiPix settings

2. **Bing Image Search** (Optional):
   - For extended image search capabilities
   - Get API key from [Azure Cognitive Services](https://azure.microsoft.com/en-us/services/cognitive-services/bing-image-search-api/)

### Anki Setup
1. **AnkiConnect URL**: Default `http://localhost:8765`
2. **Deck Name**: Choose where to create your cards
3. **Note Type**: Select your preferred Anki note type
4. **Field Mapping**: Map front, back, and image fields

### Quality Settings
- **Minimum Resolution**: Filter images by pixel dimensions
- **Prefer CC0**: Prioritize Creative Commons licensed images
- **Watermark Detection**: Attempt to filter watermarked images

## Usage

### Basic Usage
1. **Select text** in any Obsidian note
2. **Right-click** and choose "Generate Anki card with image"
3. **Preview images** and select the best one
4. **Create card** - it will appear in Anki automatically!

### Batch Processing
1. Create a bulleted list in your notes:
   ```
   - Mitochondria
   - Cell membrane
   - Nucleus
   - Ribosomes
   ```
2. Select the entire list
3. Use the command "Batch generate from list"
4. All cards will be created automatically

### Advanced Features
- **Custom search terms**: Override automatic keywords with your own
- **Subject enhancement**: Enable specific enhancements for Biology, English, or Exam prep
- **Quality control**: Adjust image resolution and licensing preferences

## Examples

### Biology Study
Select: "Mitochondria are the powerhouses of the cell"
- **Keyword extraction**: "mitochondria", "cell", "powerhouse"
- **Enhanced search**: "mitochondria biology diagram anatomy cell"
- **Result**: High-quality cellular diagram with mitochondria labeled

### Vocabulary Learning
Select: "Dog"
- **Enhanced search**: "dog object real white background"
- **Result**: Clean photo of a dog on white background, perfect for vocabulary cards

### Medical Terms
Select: "Pneumonia: infection that inflames air sacs in lungs"
- **Keywords**: "pneumonia", "infection", "lungs"
- **Enhanced search**: "pneumonia medical diagram lungs infection"
- **Result**: Medical illustration showing infected lungs

## Troubleshooting

### Common Issues

**"Cannot connect to Anki"**
- Ensure Anki is running
- Verify AnkiConnect add-on is installed and enabled
- Check that AnkiConnect URL is correct (default: `http://localhost:8765`)

**"No images found"**
- Check your Pixabay API key is correctly entered
- Try different or simpler search terms
- Ensure you have internet connectivity

**"API rate limit exceeded"**
- Pixabay free tier: 5,000 requests/month
- Wait for limit to reset or upgrade to paid plan
- Use batch processing efficiently

**Images not appearing in Anki**
- Check your image field name matches Anki note type
- Verify HTML image tags are supported in your card template

### Performance Tips
- Use specific keywords for better image results
- Enable subject enhancement for your field of study
- Batch process multiple terms at once for efficiency
- Regularly clean up unused images in Anki media folder

## Privacy & Licensing

### Image Licensing
- **Pixabay**: All images are CC0 (public domain) - safe for any use
- **Bing Search**: Mixed licensing - check individual image rights
- **Recommendation**: Prefer Pixabay results for commercial or educational use

### Data Privacy
- API calls are made directly from your computer
- No personal data is stored on external servers
- Image URLs are cached locally for performance

## Support

### Getting Help
- **GitHub Issues**: [Report bugs or request features](https://github.com/ankipix/obsidian-plugin/issues)
- **Discussions**: [Community support and tips](https://github.com/ankipix/obsidian-plugin/discussions)
- **Documentation**: [Full documentation](https://ankipix.ai/docs)

### Contributing
We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) for details.

## Roadmap

### Upcoming Features
- **More image sources**: Wikimedia Commons, educational databases
- **Advanced filtering**: Subject-specific image quality checks
- **OCR integration**: Extract text from images for definitions
- **Collaborative features**: Share image datasets with community
- **Mobile support**: iOS and Android Obsidian compatibility

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for the learning community**

Transform your notes into powerful visual learning tools with AnkiPix!
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/lt1010)