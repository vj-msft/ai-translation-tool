import OpenAI from 'openai';

export type TranslationModel = 'gpt-4o' | 'gpt-5' | 'gpt-4.1';

interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deployments: {
    [key in TranslationModel]: string;
  };
  apiVersion: string;
}

class AzureOpenAIService {
  // We defer creating the OpenAI client until a request so we can bind the
  // deployment in the baseURL (Azure requires /deployments/{deployment}/...)
  private client: OpenAI | null = null;
  private config: AzureOpenAIConfig | null = null;
  private lastError: string | null = null;

  constructor() {
    this.initializeConfig();
  }

  private initializeConfig() {
    const endpointRaw = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
    const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;

    if (!endpointRaw || !apiKey) {
      console.warn('Azure OpenAI credentials not configured. Using mock responses.');
      return;
    }

    // Sanitize endpoint: we only need scheme + host (strip any accidental portal/project paths)
    let endpoint = endpointRaw.trim();
    try {
      const url = new URL(endpointRaw);
      endpoint = url.origin; // e.g. https://your-resource.openai.azure.com
    } catch {
      // leave as-is; SDK will likely fail and we will fallback
    }

    this.config = {
      endpoint,
      apiKey,
      deployments: {
        'gpt-4o': import.meta.env.VITE_GPT4_DEPLOYMENT_NAME || 'gpt-4',
        'gpt-5': import.meta.env.VITE_GPT5_DEPLOYMENT_NAME || 'gpt-5',
        'gpt-4.1': import.meta.env.VITE_GPT41_DEPLOYMENT_NAME || 'gpt-4-turbo'
      },
      apiVersion: import.meta.env.VITE_AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
    };

    // Create a shared client pointing at the deployments root; pass deployment via model param
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: `${this.config.endpoint}/openai/deployments`,
      defaultQuery: { 'api-version': this.config.apiVersion },
      defaultHeaders: { 'api-key': this.config.apiKey },
    });
  }

  async translateText(text: string, model: TranslationModel): Promise<string> {
    if (!this.config || !this.client) {
      // Fallback to mock translation if not configured
      return this.mockTranslation(text, model);
    }

    try {
      const deploymentName = this.config.deployments[model];
      this.lastError = null;

      const systemPrompt = `You are a professional translator. Translate the following English text to Spanish (Spain).
Provide only the translation without any additional explanation or formatting.
Be accurate, natural, and maintain the tone and style of the original text.`;

      const response = await this.client.chat.completions.create({
        model: deploymentName, // Azure: deployment name used as model
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

      return translation;
    } catch (error: any) {
      console.error('Azure OpenAI translation error:', error);
      this.lastError = error?.message || String(error);
      // Fallback to mock on error (retain visibility by prefixing)
      return this.mockTranslation(text, model) + `\n(Note: Real call failed: ${this.lastError})`;
    }
  }

  private mockTranslation(text: string, model: TranslationModel): string {
    const modelLabels = {
      'gpt-4o': 'GPT-4o',
      'gpt-5': 'GPT-5',
      'gpt-4.1': 'GPT-4.1'
    };

    return `[${modelLabels[model]} Mock] Spanish translation of: "${text}"`;
  }

  isConfigured(): boolean {
  return this.config !== null; // client is created lazily per request
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
