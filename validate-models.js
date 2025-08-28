// Validation script to test removed models
import { azureOpenAIService } from './src/services/azureOpenAI.js';

async function validateRemovedModels() {
  console.log('🔍 Validating that GPT-4, GPT-4o, and GPT-4o-mini models have been removed...\n');

  // Get service info to see what models are available
  const serviceInfo = azureOpenAIService.getServiceInfo();

  console.log('📋 Available models after removal:');
  console.log('Deployments:', Object.keys(serviceInfo.deployments || {}));
  console.log('API Versions:', Object.keys(serviceInfo.apiVersions || {}));
  console.log('Resource Names:', Object.keys(serviceInfo.resourceNames || {}));

  // Check if removed models are still present
  const removedModels = ['gpt-4', 'gpt-4o', 'gpt-4o-mini'];
  const deployments = serviceInfo.deployments || {};

  let foundRemovedModels = [];

  for (const model of removedModels) {
    if (model in deployments) {
      foundRemovedModels.push(model);
    }
  }

  if (foundRemovedModels.length > 0) {
    console.log('\n❌ ERROR: The following removed models are still present:');
    foundRemovedModels.forEach(model => console.log(`   - ${model}`));
    process.exit(1);
  } else {
    console.log('\n✅ SUCCESS: All specified models (GPT-4, GPT-4o, GPT-4o-mini) have been successfully removed!');
    console.log(`\n📊 Total remaining models: ${Object.keys(deployments).length}`);
    console.log('Remaining models:');
    Object.keys(deployments).forEach(model => console.log(`   - ${model}`));
  }
}

validateRemovedModels().catch(console.error);