import OpenAI from 'openai';

export type TranslationModel = 'gpt-4o' | 'gpt-5' | 'gpt-4.1';

interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deployments: {
    [key in TranslationModel]: string;
  };
  apiVersions: {
    [key in TranslationModel]: string;
  };
}

class AzureOpenAIService {
  // We create clients per request with model-specific API versions
  private config: AzureOpenAIConfig | null = null;
  private lastError: string | null = null;

  constructor() {
    this.initializeConfig();
  }

  private initializeConfig() {
    const endpointRaw = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
    const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;

    console.log('Environment variables check:', {
      endpointRaw,
      apiKeyExists: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      allEnvVars: {
        VITE_AZURE_OPENAI_ENDPOINT: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT,
        VITE_GPT4_DEPLOYMENT_NAME: import.meta.env.VITE_GPT4_DEPLOYMENT_NAME,
        VITE_GPT5_DEPLOYMENT_NAME: import.meta.env.VITE_GPT5_DEPLOYMENT_NAME,
        VITE_GPT41_DEPLOYMENT_NAME: import.meta.env.VITE_GPT41_DEPLOYMENT_NAME,
      }
    });

    if (!endpointRaw || !apiKey) {
      console.warn('Azure OpenAI credentials not configured. Using mock responses.');
      console.warn('Missing:', { endpoint: !endpointRaw, apiKey: !apiKey });
      return;
    }

    // Handle different Azure AI endpoint formats
    let endpoint = endpointRaw.trim();
    let baseURL = '';
    let isAzureAIFoundry = false;

    try {
      const url = new URL(endpointRaw);

      // Check if this is an Azure AI Foundry project endpoint
      if (url.hostname.includes('services.ai.azure.com')) {
        // Azure AI Foundry format: https://xxx.services.ai.azure.com/models
        // Extract the base (remove any project-specific paths)
        const baseHost = `${url.protocol}//${url.hostname}`;
        baseURL = `${baseHost}/models`;
        endpoint = baseHost;
        isAzureAIFoundry = true;
      } else {
        // Standard Azure OpenAI format: https://xxx.cognitiveservices.azure.com/
        endpoint = url.origin;
        baseURL = `${endpoint}/openai/deployments`;
      }
    } catch {
      // Fallback: assume standard Azure OpenAI format
      baseURL = `${endpoint}/openai/deployments`;
    }

    this.config = {
      endpoint,
      apiKey,
      deployments: {
        // For Azure AI Foundry, use deployment names from environment
        'gpt-4o': isAzureAIFoundry ? (import.meta.env.VITE_GPT4_DEPLOYMENT_NAME || 'gpt-4o') : (import.meta.env.VITE_GPT4_DEPLOYMENT_NAME || 'gpt-4'),
        'gpt-5': isAzureAIFoundry ? (import.meta.env.VITE_GPT5_DEPLOYMENT_NAME || 'gpt-5') : (import.meta.env.VITE_GPT5_DEPLOYMENT_NAME || 'gpt-5'),
        'gpt-4.1': isAzureAIFoundry ? (import.meta.env.VITE_GPT41_DEPLOYMENT_NAME || 'gpt-4.1') : (import.meta.env.VITE_GPT41_DEPLOYMENT_NAME || 'gpt-4-turbo')
      },
      apiVersions: {
        // Different API versions for different models
        'gpt-4o': '2024-02-15-preview',
        'gpt-5': '2024-02-15-preview',
        'gpt-4.1': '2024-12-01-preview'
      }
    };

    console.log('Azure OpenAI configuration:', {
      endpoint: this.config.endpoint,
      baseURL,
      apiVersions: this.config.apiVersions,
      deployments: this.config.deployments,
      hasApiKey: !!this.config.apiKey,
      isAzureAIFoundry
    });

    // SECURITY NOTE: dangerouslyAllowBrowser is enabled for demo purposes
    // In production, consider:
    // 1. Using a backend proxy to make API calls
    // 2. Implementing token-based authentication
    // 3. Using environment-specific API keys with limited permissions
    // 4. Adding CORS restrictions and other security measures
  }

  private createClientForModel(model: TranslationModel): OpenAI {
    if (!this.config) {
      throw new Error('Azure OpenAI not configured');
    }

    const apiVersion = this.config.apiVersions[model];
    const deploymentName = this.config.deployments[model];

    // For Azure OpenAI, we need to include the deployment name in the base URL
    const baseURL = `${this.config.endpoint}/openai/deployments/${deploymentName}`;

    console.log(`Creating client for ${model}:`, {
      baseURL,
      apiVersion,
      deployment: deploymentName,
      endpoint: this.config.endpoint
    });

    return new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: baseURL,
      defaultQuery: { 'api-version': apiVersion },
      defaultHeaders: { 'api-key': this.config.apiKey },
      dangerouslyAllowBrowser: true, // Required for client-side usage
    });
  }  async translateText(text: string, model: TranslationModel): Promise<string> {
    if (!this.config) {
      // Fallback to mock translation if not configured
      return this.mockTranslation(text, model);
    }

    try {
      const deploymentName = this.config.deployments[model];
      const client = this.createClientForModel(model);
      this.lastError = null;

      const systemPrompt = `You are a professional translator specialized in Premier League football content translation. Translate the following English text to Spanish (Spain).

TRANSLATION STANDARDS FOR PREMIER LEAGUE FOOTBALL:
- You are specialized in translating Premier League football data, match reports, news, and commentary
- Adhere strictly to football jargons, terminology, and nuances specific to Premier League football
- Maintain consistency with official Spanish football terminology used in Spain for Premier League coverage
- Preserve Premier League team names in their original English form (e.g., "Manchester United", "Arsenal", "Liverpool")
- Preserve player names, manager names, and stadium names in their original form
- Use appropriate Spanish football vernacular while keeping Premier League-specific expressions
- Consider Spanish football journalism standards for Premier League coverage
- Maintain the excitement and passion typical of football commentary and reporting

PREMIER LEAGUE SPECIFIC GUIDELINES:
- Keep Premier League terminology: "Premier League", "matchday", "fixture", "table", "relegation", "promotion"
- Use Spanish football terms: "partido" (match), "gol" (goal), "tarjeta" (card), "penalti" (penalty)
- Preserve match statistics, scores, dates, and league positions exactly as provided
- Use "fútbol" not "soccer" when referring to the sport
- Apply proper Spanish grammar while keeping Premier League authenticity
- Maintain official Premier League competition names and formats

FORMATTING AND STRUCTURE REQUIREMENTS:
- CRITICAL: Preserve ALL markdown formatting exactly as provided in the original text
- Maintain hyperlinks in exact format: [link text](URL) - translate only the link text, keep URLs unchanged
- Preserve ALL markdown elements: **bold**, *italic*, lists, headers, etc.
- Keep line breaks, paragraphs, and spacing exactly as in the original
- Translate only the visible text content while preserving all formatting markup
- Ensure the output can be directly used in APIs and UIs that expect markdown format

GUIDELINES:
- Provide only the translation without any additional explanation or formatting
- Be accurate, natural, and maintain the excitement of Premier League football content
- Use standard Spanish football broadcasting terminology for Premier League coverage
- NEVER remove or alter markdown syntax, URLs, or structural formatting`;

      console.log('Making translation request:', {
        model: deploymentName,
        endpoint: this.config.endpoint,
        apiVersion: this.config.apiVersions[model],
        systemPrompt: systemPrompt.substring(0, 100) + '...',
        textLength: text.length
      });

      // Use the configured deployment/model name directly
      const response = await client.chat.completions.create({
        model: deploymentName, // Use deployment name for Azure OpenAI
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        max_tokens: 1000,
        temperature: 0.3,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      const translation = response.choices[0]?.message?.content?.trim();

      if (!translation) {
        throw new Error('No translation received from the model');
      }

      console.log('Translation successful:', {
        originalLength: text.length,
        translationLength: translation.length
      });

      return translation;
    } catch (error: any) {
      console.error('Azure OpenAI translation error:', error);
      this.lastError = error?.message || String(error);

      // Provide more specific error information
      if (error?.status === 401) {
        this.lastError = 'Authentication failed - check your API key';
      } else if (error?.status === 404) {
        this.lastError = 'Model deployment not found - check deployment names';
      } else if (error?.status === 429) {
        this.lastError = 'Rate limit exceeded - please wait and try again';
      }

      // For demo purposes, provide a helpful fallback
      if (model === 'gpt-4.1') {
        return this.mockTranslation(text, model) + `\n\n(Demo Note: GPT-4.1 is deployed but requires special API access. Using mock translation for demo.)`;
      } else {
        return this.mockTranslation(text, model) + `\n\n(Note: Azure API call failed: ${this.lastError})`;
      }
    }
  }

  async translateTextWithMultipleModels(text: string, models: TranslationModel[]): Promise<{ [key in TranslationModel]?: string }> {
    const results: { [key in TranslationModel]?: string } = {};

    // Translate with each model sequentially to avoid rate limiting
    for (const model of models) {
      try {
        results[model] = await this.translateText(text, model);
      } catch (error) {
        console.error(`Failed to translate with ${model}:`, error);
        results[model] = `Translation failed: ${error}`;
      }
    }

    return results;
  }

  private mockTranslation(text: string, model: TranslationModel): string {
    const modelLabels = {
      'gpt-4o': 'GPT-4o',
      'gpt-5': 'GPT-5',
      'gpt-4.1': 'GPT-4.1'
    };

    // For demo purposes, provide a realistic mock translation
    if (model === 'gpt-4.1') {
      // Simple word-by-word demo translation
      const basicTranslations: { [key: string]: string } = {
        'hello': 'hola',
        'world': 'mundo',
        'how are you': 'cómo estás',
        'good morning': 'buenos días',
        'thank you': 'gracias',
        'please': 'por favor',
        'yes': 'sí',
        'no': 'no',
        'water': 'agua',
        'food': 'comida'
      };

      const lowerText = text.toLowerCase();
      for (const [english, spanish] of Object.entries(basicTranslations)) {
        if (lowerText.includes(english)) {
          return `${spanish} (translated with ${modelLabels[model]})`;
        }
      }

      return `Traducción en español del texto: "${text}" (generado por ${modelLabels[model]} - versión demo)`;
    }

    return `[${modelLabels[model]} Mock] Spanish translation of: "${text}"`;
  }

  isConfigured(): boolean {
    return this.config !== null;
  }

  getConfigurationStatus(): string {
    if (this.isConfigured()) {
      return 'Azure AI Foundry configured and ready';
    }
    return 'Azure AI Foundry not configured - using mock responses';
  }

  getLastError(): string | null {
    return this.lastError;
  }
}

// Export a singleton instance
export const azureOpenAIService = new AzureOpenAIService();
