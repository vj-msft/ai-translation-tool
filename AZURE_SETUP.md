# Azure AI Foundry Setup Guide

This guide will help you configure Azure AI Foundry to use GPT-5 and GPT-4.1 models with your `vijaycse@live.in` account.

## Prerequisites

1. Azure subscription with access to Azure AI Foundry
2. Your Azure AI Foundry resource deployed
3. Model deployments created for GPT-5 and GPT-4.1

## Setup Steps

### 1. Access Azure AI Foundry

1. Go to [Azure AI Foundry](https://ai.azure.com/)
2. Sign in with your `vijaycse@live.in` account
3. Select your subscription and resource group

### 2. Create or Access Your AI Foundry Resource

1. If you don't have an AI Foundry resource, create one:
   - Click "Create new resource"
   - Choose your subscription and resource group
   - Select a region (recommend East US or West Europe for GPT-5 availability)
   - Follow the creation wizard

2. If you already have a resource, select it from the dashboard

### 3. Deploy Models

You need to deploy the following models in your AI Foundry resource:

1. **GPT-4.1 (or GPT-4 Turbo)**:
   - Go to "Model Deployments" in your AI Foundry resource
   - Click "Deploy Model"
   - Search for "gpt-4" or "gpt-4-turbo"
   - Create deployment with a name like `gpt-4-deployment`

2. **GPT-5** (if available):
   - Go to "Model Deployments"
   - Click "Deploy Model"
   - Search for "gpt-5"
   - Create deployment with a name like `gpt-5-deployment`

3. **GPT-4o** (fallback):
   - Deploy GPT-4o as well for comparison
   - Name it something like `gpt-4o-deployment`

### 4. Get Your Credentials

1. In your AI Foundry resource, go to "Keys and Endpoint"
2. Copy the following information:
   - **Endpoint**: Something like `https://your-resource.openai.azure.com/`
   - **Key**: One of the provided API keys
   - **API Version**: Use `2024-02-15-preview` for latest features

### 5. Configure the Application

1. Copy the `.env.example` file to `.env`:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

2. Edit the `.env` file with your actual values:
   \`\`\`env
   VITE_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   VITE_AZURE_OPENAI_API_KEY=your-api-key-here
   VITE_GPT4_DEPLOYMENT_NAME=gpt-4o-deployment
   VITE_GPT5_DEPLOYMENT_NAME=gpt-5-deployment
   VITE_GPT41_DEPLOYMENT_NAME=gpt-4-deployment
   VITE_AZURE_OPENAI_API_VERSION=2024-02-15-preview
   \`\`\`

3. Replace the placeholder values with your actual:
   - Endpoint URL
   - API key
   - Deployment names (exactly as you named them in Azure)

### 6. Test the Setup

1. Restart your development server:
   \`\`\`bash
   npm run dev
   \`\`\`

2. Open the app in your browser
3. Look for the status badge - it should show "Azure AI Foundry configured and ready"
4. Try translating some text with different models

## Troubleshooting

### Common Issues:

1. **"Azure AI Foundry not configured" message**:
   - Check that your `.env` file has all required values
   - Ensure there are no extra quotes around values
   - Restart the dev server after changing `.env`

2. **"Translation failed" errors**:
   - Verify your API key is correct
   - Check that deployment names match exactly
   - Ensure your Azure subscription has sufficient quota

3. **Model not available**:
   - GPT-5 may not be available in all regions yet
   - Try different regions or use GPT-4 Turbo as alternative
   - Check Azure AI Foundry model availability in your region

### Check Your Setup:

You can verify your configuration by looking at the browser's developer console. The app will log whether Azure AI Foundry is properly configured.

## Security Notes

- Never commit your `.env` file to version control
- The `.env` file is already in `.gitignore`
- Use environment variables for production deployments
- Rotate your API keys regularly

## Model Capabilities

- **GPT-4o**: Fast, efficient, good for general translations
- **GPT-4.1/Turbo**: More advanced reasoning, better for complex texts
- **GPT-5**: Latest model with enhanced capabilities (when available)

All models are configured to provide accurate Spanish (Spain) translations with natural language flow.
