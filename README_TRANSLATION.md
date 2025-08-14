# AI Translation Tool

A modern React application for translating English text to Spanish using Azure OpenAI models (GPT-4o, GPT-5, GPT-4.1).

## Features

### Text Translation

- **Multiple AI Models**: Choose between GPT-4o, GPT-5, and GPT-4.1
- **Real-time Translation**: Instant English to Spanish translation
- **Copy to Clipboard**: Easy sharing of translated content
- **Character Counter**: Track input text length
- **Error Handling**: Graceful fallback with mock translations

### CSV File Translation

- **File Upload**: Upload CSV files for bulk translation
- **Batch Processing**: Automatically translates all text values in CSV
- **Progress Tracking**: Real-time progress indication during translation
- **Duplicate Handling**: Efficiently processes unique text strings
- **Multiple Output Formats**:
  - **Translation Report**: CSV with columns (S.no, English, Spanish) for stakeholder review
  - **Translated CSV**: Complete CSV file with all text translated to Spanish
- **Preview Table**: View all translations before download

## Getting Started

### Prerequisites

- Node.js 16+
- Azure OpenAI API access
- Valid Azure OpenAI deployment

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ai-translation-tool
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

Create a `.env` file in the root directory:

```env
VITE_AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
VITE_AZURE_OPENAI_API_KEY=your_api_key
VITE_GPT4_DEPLOYMENT_NAME=your_gpt4_deployment_name
VITE_GPT5_DEPLOYMENT_NAME=your_gpt5_deployment_name
VITE_GPT41_DEPLOYMENT_NAME=your_gpt41_deployment_name
```

4. Start the development server:

```bash
npm run dev
```

## Usage

### Text Translation

1. Select your preferred AI model (GPT-4o, GPT-5, or GPT-4.1)
2. Enter English text in the input field
3. Click "Translate" to get Spanish translation
4. Copy the result to clipboard if needed

### CSV File Translation

1. Switch to "CSV File Translation" mode
2. Select your preferred AI model
3. Upload a CSV file containing English text
4. Click "Start Translation" to begin processing
5. Monitor progress and view results in the table
6. Download results as:
   - **Translation Report**: For stakeholder review (S.no | English | Spanish)
   - **Translated CSV**: Complete file with Spanish translations

## CSV Input Format

The tool accepts any CSV file structure. Sample format:

```csv
Title,Description,Category,Status
"Welcome to our platform","A comprehensive solution for your business needs","Software","Active"
"Get Started","Begin your journey with our easy setup process","Guide","Published"
"Contact Support","Reach out to our team for assistance","Help","Available"
```

## Output Formats

### Translation Report CSV

```csv
S.no,English,Spanish
1,"Welcome to our platform","Bienvenido a nuestra plataforma"
2,"Get Started","Comenzar"
3,"Contact Support","Contactar Soporte"
```

### Translated CSV

The original CSV structure with all English text replaced with Spanish translations:

```csv
Title,Description,Category,Status
"Bienvenido a nuestra plataforma","Una solución integral para las necesidades de su negocio","Software","Activo"
"Comenzar","Comience su viaje con nuestro proceso de configuración fácil","Guía","Publicado"
"Contactar Soporte","Comuníquese con nuestro equipo para obtener asistencia","Ayuda","Disponible"
```

## Configuration

The application supports both standard Azure OpenAI and Azure AI Foundry endpoints:

- **Standard Azure OpenAI**: `https://your-resource.cognitiveservices.azure.com/`
- **Azure AI Foundry**: `https://your-project.services.ai.azure.com/models`

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   └── JsonTranslator.tsx  # CSV translation component
├── services/
│   └── azureOpenAI.ts     # Azure OpenAI integration
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities
└── styles/                # CSS and theme files
```

## Technologies Used

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Radix UI** - Component library
- **Azure OpenAI** - Translation service
- **Phosphor Icons** - Icon library

## Error Handling

The application includes comprehensive error handling:

- Network failures fall back to mock translations
- Invalid CSV files are rejected with user-friendly messages
- API errors are displayed with retry options
- Progress tracking continues even if individual translations fail

## Security Notes

⚠️ **Important**: This application uses `dangerouslyAllowBrowser: true` for demo purposes. For production deployment:

1. Implement a backend proxy for API calls
2. Use environment-specific API keys with limited permissions
3. Add CORS restrictions and security headers
4. Consider token-based authentication

## Sample Files

Use the included sample files for testing:

- **`sample-data.csv`**: Sample CSV with various text content
- Perfect for testing the CSV translation functionality

## License

This project is licensed under the MIT License - see the LICENSE file for details.