// Azure Translate API Test Script
// This script tests the Azure Translate API configuration

const testAzureTranslateAPI = async () => {
  console.log('🔍 Testing Azure Translate API Configuration...\n');

  // Check environment variables
  const endpoint = 'https://api.cognitive.microsofttranslator.com/';
  const apiKey = '';
  const region = 'eastus'; // Corrected region

  console.log('📋 Configuration Check:');
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   API Key: ${apiKey ? apiKey.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`   Region: ${region}`);
  console.log(`   Key Length: ${apiKey ? apiKey.length : 0} characters\n`);

  if (!endpoint || !apiKey || !region) {
    console.log('❌ Configuration incomplete - missing required values');
    return;
  }

  // Test the API call
  console.log('🧪 Testing API Call...');

  try {
    const url = `${endpoint}translate`;
    const params = new URLSearchParams({
      'api-version': '3.0',
      'from': 'en',
      'to': 'es'
    });

    const testText = 'Hello, world!';

    const response = await fetch(`${url}?${params}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Ocp-Apim-Subscription-Region': region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ text: testText }])
    });

    console.log(`   Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   Error Response: ${errorText}\n`);

      if (response.status === 401) {
        console.log('🔍 401 Unauthorized - Possible causes:');
        console.log('   ❌ Invalid API key');
        console.log('   ❌ API key expired or revoked');
        console.log('   ❌ Incorrect subscription key format');
        console.log('   ❌ Resource not found or not accessible\n');

        console.log('🛠️  Troubleshooting Steps:');
        console.log('   1. Verify API key in Azure Portal:');
        console.log('      - Go to your "ai-translate-uks-01" resource');
        console.log('      - Check "Keys and Endpoint" section');
        console.log('      - Copy Key 1 or Key 2 (32 characters)');
        console.log('   2. Ensure the resource is active and not suspended');
        console.log('   3. Check if you have the correct subscription');
        console.log('   4. Verify the region matches your resource location');
      } else if (response.status === 403) {
        console.log('🔍 403 Forbidden - Possible causes:');
        console.log('   ❌ Billing issue or quota exceeded');
        console.log('   ❌ Resource access permissions');
      }
      return;
    }

    const result = await response.json();
    console.log('   ✅ API call successful!');
    console.log(`   Translation: "${result[0]?.translations[0]?.text}"\n`);

    console.log('🎉 Azure Translate API is working correctly!');
    console.log('   The 401 errors in your app should be resolved.');
    console.log('   Try refreshing your browser to test the translation.');

  } catch (error) {
    console.log(`   ❌ Network Error: ${error.message}\n`);
    console.log('🔍 Possible causes:');
    console.log('   ❌ Network connectivity issues');
    console.log('   ❌ Firewall or proxy blocking the request');
    console.log('   ❌ Invalid endpoint URL');
  }
};

// Run the test
testAzureTranslateAPI().catch(console.error);
