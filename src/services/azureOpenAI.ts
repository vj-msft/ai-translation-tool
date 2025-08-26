import OpenAI from 'openai';

export type TranslationModel =
  | 'gpt-4.1'
  | 'gpt-5-chat'
  | 'gpt-5-mini'
  | 'gpt-5-nano'
  | 'phi-4'
  | 'grok-3-mini'
  | 'mistral-small-2503'
  | 'mistral-small-2503-2'
  | 'azure-translate';

export interface TranslationResult {
  text: string;
  model: TranslationModel;
  latency: number; // in milliseconds
  timestamp: string;
}

interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deployments: {
    [key in Exclude<TranslationModel, 'azure-translate'>]: string;
  };
  apiVersions: {
    [key in Exclude<TranslationModel, 'azure-translate'>]: string;
  };
  resourceNames: {
    [key in Exclude<TranslationModel, 'azure-translate'>]: string;
  };
  resourceApiKeys: {
    [resourceName: string]: string;
  };
}

interface AzureTranslateConfig {
  endpoint: string;
  apiKey: string;
  region: string;
}

class AzureOpenAIService {
  // We create clients per request with model-specific API versions
  private config: AzureOpenAIConfig | null = null;
  private azureTranslateConfig: AzureTranslateConfig | null = null;
  private lastError: string | null = null;

  constructor() {
    this.initializeConfig();
    this.initializeAzureTranslate();
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
        // Models from aifoundry-eus-01 (your main resource)
        'gpt-4.1': 'gpt-4.1',
        'phi-4': 'Phi-4',
        'grok-3-mini': 'grok-3-mini',
        'mistral-small-2503': 'mistral-small-2503',
        'mistral-small-2503-2': 'mistral-small-2503-2',
        // Models from vmuni-mecuvn70-eastus2 (GPT-5 resource)
        'gpt-5-chat': 'gpt-5-chat',
        'gpt-5-mini': 'gpt-5-mini',
        'gpt-5-nano': 'gpt-5-nano'
      },
      apiVersions: {
        // API versions based on model capabilities
        'gpt-4.1': '2024-12-01-preview',
        'gpt-5-chat': '2024-12-01-preview',
        'gpt-5-mini': '2024-12-01-preview',
        'gpt-5-nano': '2024-12-01-preview',
        'phi-4': '2024-02-15-preview',
        'grok-3-mini': '2024-02-15-preview',
        'mistral-small-2503': '2024-02-15-preview',
        'mistral-small-2503-2': '2024-02-15-preview'
      },
      resourceNames: {
        // Map models to their respective Azure resources
        'gpt-4.1': 'aifoundry-eus-01',
        'gpt-5-chat': 'vmuni-mecuvn70-eastus2',
        'gpt-5-mini': 'vmuni-mecuvn70-eastus2',
        'gpt-5-nano': 'vmuni-mecuvn70-eastus2',
        'phi-4': 'aifoundry-eus-01',
        'grok-3-mini': 'aifoundry-eus-01',
        'mistral-small-2503': 'aifoundry-eus-01',
        'mistral-small-2503-2': 'aifoundry-eus-01'
      },
      resourceApiKeys: {
        // API keys for different resources
        'aifoundry-eus-01': apiKey, // Main API key from environment
        'aoai-learn-sk-01': apiKey, // Same key works for both resources
        'vmuni-mecuvn70-eastus2': import.meta.env.VITE_GPT5_API_KEY || 'AryCDJ5I5fb0cTiKciDsnOIWa8J6So948rmMDq3dDHX9HSVYeRRuJQQJ99BHACHYHv6XJ3w3AAAAACOGsSsE'
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

  private initializeAzureTranslate() {
    const endpoint = import.meta.env.VITE_AZURE_TRANSLATE_ENDPOINT;
    const apiKey = import.meta.env.VITE_AZURE_TRANSLATE_API_KEY;
    const region = import.meta.env.VITE_AZURE_TRANSLATE_REGION;

    console.log('Azure Translate configuration check:', {
      endpointExists: !!endpoint,
      apiKeyExists: !!apiKey,
      regionExists: !!region,
      serviceName: 'ai-translate-uks-01'
    });

    if (!endpoint || !apiKey || !region) {
      console.warn('Azure Translate not configured. Using mock responses for azure-translate model.');
      console.warn('Missing Azure Translate config:', {
        endpoint: !endpoint,
        apiKey: !apiKey,
        region: !region
      });
      return;
    }

    this.azureTranslateConfig = {
      endpoint: endpoint.trim(),
      apiKey: apiKey.trim(),
      region: region.trim()
    };

    console.log('Azure Translate configured:', {
      endpoint: this.azureTranslateConfig.endpoint,
      region: this.azureTranslateConfig.region,
      hasApiKey: !!this.azureTranslateConfig.apiKey
    });
  }

  private createClientForModel(model: Exclude<TranslationModel, 'azure-translate'>): OpenAI {
    if (!this.config) {
      throw new Error('Azure OpenAI not configured');
    }

    const apiVersion = this.config.apiVersions[model];
    const deploymentName = this.config.deployments[model];
    const resourceName = this.config.resourceNames[model];
    const resourceApiKey = this.config.resourceApiKeys[resourceName];

    // Get the appropriate endpoint based on the resource
    let endpoint: string;
    if (resourceName === 'aoai-learn-sk-01') {
      // Standard Azure OpenAI endpoint format
      endpoint = 'https://aoai-learn-sk-01.openai.azure.com';
    } else if (resourceName === 'vmuni-mecuvn70-eastus2') {
      // GPT-5 models endpoint (AIServices format like AI Foundry)
      endpoint = 'https://vmuni-mecuvn70-eastus2.cognitiveservices.azure.com';
    } else {
      // AI Foundry endpoint (aifoundry-eus-01)
      endpoint = this.config.endpoint;
    }

    // For Azure OpenAI, we need to include the deployment name in the base URL
    const baseURL = `${endpoint}/openai/deployments/${deploymentName}`;

    console.log(`Creating client for ${model}:`, {
      baseURL,
      apiVersion,
      deployment: deploymentName,
      resource: resourceName,
      endpoint: endpoint,
      hasApiKey: !!resourceApiKey
    });

    return new OpenAI({
      apiKey: resourceApiKey,
      baseURL: baseURL,
      defaultQuery: { 'api-version': apiVersion },
      defaultHeaders: { 'api-key': resourceApiKey },
      dangerouslyAllowBrowser: true, // Required for client-side usage
    });
  }

  private async translateWithAzureTranslate(text: string): Promise<string> {
    if (!this.azureTranslateConfig) {
      return this.mockTranslation(text, 'azure-translate');
    }

    try {
      this.lastError = null;

      const url = `${this.azureTranslateConfig.endpoint}/translate`;
      const params = new URLSearchParams({
        'api-version': '3.0',
        'from': 'en',
        'to': 'es'
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.azureTranslateConfig.apiKey,
          'Ocp-Apim-Subscription-Region': this.azureTranslateConfig.region,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ text: text }])
      });

      if (!response.ok) {
        throw new Error(`Azure Translate API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result && result[0] && result[0].translations && result[0].translations[0]) {
        const translation = result[0].translations[0].text;

        console.log('Azure Translate successful:', {
          originalLength: text.length,
          translationLength: translation.length
        });

        return translation;
      } else {
        throw new Error('Invalid response format from Azure Translate');
      }

    } catch (error: any) {
      console.error('Azure Translate error:', error);
      this.lastError = error?.message || String(error);

      // Provide more specific error information
      if (error?.status === 401) {
        this.lastError = 'Authentication failed - check your Azure Translate API key';
      } else if (error?.status === 403) {
        this.lastError = 'Access denied - check your Azure Translate subscription';
      } else if (error?.status === 429) {
        this.lastError = 'Rate limit exceeded - please wait and try again';
      }

      return this.mockTranslation(text, 'azure-translate') + `\n\n(Note: Azure Translate API call failed: ${this.lastError})`;
    }
  }

  // Helper function to estimate token count (rough approximation: 1 token ≈ 4 characters)
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // Helper function to chunk text if it's too long
  private chunkText(text: string, maxTokens: number = 3000): string[] {
    const estimatedTokens = this.estimateTokenCount(text);

    if (estimatedTokens <= maxTokens) {
      return [text];
    }

    // Split by sentences first, then by paragraphs if needed
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

      if (this.estimateTokenCount(potentialChunk) <= maxTokens) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = sentence;
        } else {
          // Single sentence is too long, split by character limit
          const maxChars = maxTokens * 4;
          chunks.push(sentence.substring(0, maxChars));
          currentChunk = sentence.substring(maxChars);
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  // Helper method to translate a single chunk of text
  private async translateSingleChunk(text: string, model: Exclude<TranslationModel, 'azure-translate'>): Promise<string> {
    const deploymentName = this.config!.deployments[model];
    const client = this.createClientForModel(model);

    // Optimized system prompt for faster processing while maintaining quality
    const systemPrompt = `Translate English Premier League content to Spanish (Spain).

KEY RULES:
- Keep team/player names in English (e.g., "Manchester United", "Jadon Sancho")
- Use Spanish football terms: partido (match), gol (goal), penalti (penalty)
- Preserve ALL markdown formatting: [text](URL), **bold**, *italic*, lists
- Keep URLs unchanged, translate only link text
- Use "fútbol" not "soccer"
- Maintain statistics, dates, scores exactly as provided

Provide only the translation, no explanations.`;

    console.log('Making translation request:', {
      model: deploymentName,
      endpoint: this.config!.endpoint,
      apiVersion: this.config!.apiVersions[model],
      systemPrompt: systemPrompt.substring(0, 100) + '...',
      textLength: text.length
    });

    // Use the configured deployment/model name directly
    const requestParams: any = {
      model: deploymentName, // Use deployment name for Azure OpenAI
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ]
    };

    // Different models have different parameter requirements - optimized for speed
    if (model === 'phi-4' || model === 'grok-3-mini') {
      // Microsoft Phi and Grok models use max_completion_tokens
      requestParams.max_completion_tokens = model === 'grok-3-mini' ? 1500 : 2500; // Reduced for speed
      requestParams.temperature = 0.1; // Lower temperature for faster, more deterministic responses
    } else if (model.startsWith('mistral-')) {
      // Mistral models use max_tokens (not max_completion_tokens)
      requestParams.max_tokens = 2500; // Reduced from 4000
      requestParams.temperature = 0.1;
    } else if (model.startsWith('gpt-5-')) {
      // GPT-5 models use max_completion_tokens and have specific parameter requirements
      requestParams.max_completion_tokens = (model === 'gpt-5-mini' || model === 'gpt-5-nano') ? 1500 : 2500; // Reduced
      // GPT-5 Mini and Nano only support default temperature (1.0), not custom values
      if (model === 'gpt-5-chat') {
        // Only GPT-5 Chat supports custom temperature and additional parameters
        requestParams.temperature = 0.1; // Lower for speed
        requestParams.top_p = 0.9; // Slightly more focused
      }
      // GPT-5 Mini and Nano have limited parameter support
      requestParams.frequency_penalty = 0;
      requestParams.presence_penalty = 0;
    } else {
      // Standard OpenAI models (GPT-4.1 etc.) support max_tokens
      requestParams.max_tokens = 2500; // Reduced from 4000
      requestParams.temperature = 0.1; // Lower for speed
      requestParams.top_p = 0.9;
      requestParams.frequency_penalty = 0;
      requestParams.presence_penalty = 0;
    }

    const response = await client.chat.completions.create(requestParams);

    console.log('Response received:', {
      model: deploymentName,
      choices: response.choices?.length || 0,
      firstChoice: response.choices?.[0] ? {
        role: response.choices[0].message?.role,
        hasContent: !!response.choices[0].message?.content,
        contentLength: response.choices[0].message?.content?.length || 0,
        finishReason: response.choices[0].finish_reason
      } : null
    });

    const translation = response.choices[0]?.message?.content?.trim();

    if (!translation || translation.length === 0) {
      // Enhanced error handling for empty responses
      const errorDetails = {
        hasChoices: !!response.choices?.length,
        hasMessage: !!response.choices?.[0]?.message,
        hasContent: !!response.choices?.[0]?.message?.content,
        contentValue: response.choices?.[0]?.message?.content,
        finishReason: response.choices?.[0]?.finish_reason
      };

      console.error('Empty response details:', errorDetails);

      if (response.choices?.[0]?.finish_reason === 'content_filter') {
        throw new Error('Translation blocked by content filter');
      } else if (response.choices?.[0]?.finish_reason === 'length') {
        throw new Error('Translation truncated due to length limit');
      } else {
        throw new Error(`No translation received from ${model}. Response: ${JSON.stringify(errorDetails)}`);
      }
    }

    console.log('Translation successful:', {
      originalLength: text.length,
      translationLength: translation.length
    });

    return translation;
  }

  // Helper method to get performance-optimized model recommendations
  getOptimizedModelRecommendations(): { fastest: TranslationModel[], balanced: TranslationModel[], highest_quality: TranslationModel[] } {
    return {
      fastest: ['azure-translate', 'mistral-small-2503', 'gpt-4.1'],
      balanced: ['gpt-4.1', 'mistral-small-2503-2', 'gpt-5-chat'],
      highest_quality: ['gpt-5-chat', 'gpt-4.1', 'mistral-small-2503']
    };
  }

  async translateText(text: string, model: TranslationModel): Promise<TranslationResult> {
    const startTime = performance.now();

    try {
      let translatedText: string;

      // Handle Azure Translate service separately
      if (model === 'azure-translate') {
        translatedText = await this.translateWithAzureTranslate(text);
      } else {
        if (!this.config) {
          // Fallback to mock translation if not configured
          translatedText = this.mockTranslation(text, model);
        } else {
          // Check for text length limitations for certain models
          const estimatedTokens = this.estimateTokenCount(text);
          const isLimitedModel = model === 'gpt-5-mini' || model === 'gpt-5-nano' || model === 'grok-3-mini';

          if (isLimitedModel && estimatedTokens > 2500) {
            throw new Error(`Text too long for ${model}. This model has a limit of approximately 2500 tokens (~10,000 characters). Current text is approximately ${estimatedTokens} tokens. Please use a shorter text or try a different model like GPT-4.1 or GPT-5 Chat for longer content.`);
          }

          // Normal single request translation
          translatedText = await this.translateSingleChunk(text, model);
        }
      }

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      return {
        text: translatedText,
        model,
        latency,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('Translation error:', error);
      this.lastError = error?.message || String(error);

      // Provide more specific error information
      if (error?.status === 401) {
        this.lastError = 'Authentication failed - check your API key';
      } else if (error?.status === 404) {
        this.lastError = 'Model deployment not found - check deployment names';
      } else if (error?.status === 429) {
        this.lastError = 'Rate limit exceeded - please wait and try again';
      }

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      // For demo purposes, provide a helpful fallback
      let fallbackText: string;
      if (model === 'gpt-4.1') {
        fallbackText = this.mockTranslation(text, model) + `\n\n(Demo Note: GPT-4.1 is deployed but requires special API access. Using mock translation for demo.)`;
      } else {
        fallbackText = this.mockTranslation(text, model) + `\n\n(Note: API call failed: ${this.lastError})`;
      }

      return {
        text: fallbackText,
        model,
        latency,
        timestamp: new Date().toISOString()
      };
    }
  }

  async translateTextWithMultipleModels(text: string, models: TranslationModel[]): Promise<{ [key in TranslationModel]?: TranslationResult }> {
    const results: { [key in TranslationModel]?: TranslationResult } = {};

    // Translate with each model sequentially to avoid rate limiting
    for (const model of models) {
      try {
        results[model] = await this.translateText(text, model);
      } catch (error) {
        console.error(`Failed to translate with ${model}:`, error);
        // Create error result with timing
        results[model] = {
          text: `Translation failed: ${error}`,
          model,
          latency: 0,
          timestamp: new Date().toISOString()
        };
      }
    }

    return results;
  }

  private mockTranslation(text: string, model: TranslationModel): string {
    const modelLabels = {
      'gpt-4.1': 'GPT-4.1',
      'gpt-5-chat': 'GPT-5 Chat',
      'gpt-5-mini': 'GPT-5 Mini',
      'gpt-5-nano': 'GPT-5 Nano',
      'phi-4': 'Microsoft Phi-4',
      'grok-3-mini': 'Grok-3 Mini',
      'mistral-small-2503': 'Mistral Small 2503',
      'mistral-small-2503-2': 'Mistral Small 2503-2',
      'azure-translate': 'Azure AI Translation Service'
    };

    // For demo purposes, provide a realistic mock translation
    if (model === 'azure-translate') {
      // Azure Translate typically provides more direct translations
      const basicTranslations: { [key: string]: string } = {
        'welcome to our platform': 'bienvenido a nuestra plataforma',
        'get started': 'empezar',
        'contact support': 'contactar soporte',
        'user dashboard': 'panel de usuario',
        'about us': 'acerca de nosotros',
        'privacy policy': 'política de privacidad',
        'terms of service': 'términos de servicio',
        'product features': 'características del producto',
        'customer reviews': 'reseñas de clientes',
        'pricing plans': 'planes de precios'
      };

      const lowerText = text.toLowerCase();
      for (const [english, spanish] of Object.entries(basicTranslations)) {
        if (lowerText.includes(english)) {
          return `${spanish} (traducido con ${modelLabels[model]})`;
        }
      }

      return `Traducción directa: "${text}" (generado por ${modelLabels[model]} - versión demo)`;
    }

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
