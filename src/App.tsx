import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, Translate, CircleNotch, PaperPlaneRight, File, FileText, Clock } from '@phosphor-icons/react'
import { toast, Toaster } from 'sonner'
import { azureOpenAIService, TranslationModel, TranslationResult } from './services/azureOpenAI'
import { CsvTranslator } from './components/JsonTranslator'

// Fixed translation from English to Spanish (Europe)
const TARGET_LANGUAGE = { code: 'es', name: 'Spanish (Spain)' }

type AppMode = 'text' | 'csv'

function App() {
  const [mode, setMode] = useState<AppMode>('text')
  const [inputText, setInputText] = useState('')
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null)
  const [selectedModel, setSelectedModel] = useState<TranslationModel>('gpt-4.1')
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState('')

  // Check if send button should be enabled
  const isSendEnabled = inputText.trim().length > 0 && selectedModel && !isTranslating

  const modelLabels = {
    'gpt-4.1': 'GPT-4.1',
    'gpt-5-chat': 'GPT-5 Chat',
    'gpt-5-mini': 'GPT-5 Mini',
    'gpt-5-nano': 'GPT-5 Nano',
    'phi-4': 'Microsoft Phi-4',
    'mistral-small-2503': 'Mistral Small 2503',
    'azure-translate': 'Azure AI Translation Service'
  }

  if (mode === 'csv') {
    return <CsvTranslator onBack={() => setMode('text')} />
  }

  const performTranslation = async (text: string, model: TranslationModel) => {
    setIsTranslating(true)
    setError('')

    try {
      const result = await azureOpenAIService.translateText(text, model)
      setTranslationResult(result)
    } catch (err) {
      setError('Translation failed. Please try again.')
      console.error('Translation error:', err)
    } finally {
      setIsTranslating(false)
    }
  }

  const handleSendTranslation = async () => {
    if (!isSendEnabled) return
    await performTranslation(inputText, selectedModel)
  }

  const handleCopyTranslation = async () => {
    if (!translationResult?.text) return

    try {
      await navigator.clipboard.writeText(translationResult.text)
      toast.success('Translation copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy translation')
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Translate size={32} className="text-accent" />
            <h1 className="text-3xl font-bold text-foreground">English to Spanish Translation</h1>
          </div>
          <p className="text-muted-foreground">
            Translate English text to Spanish (Spain) using advanced AI models
          </p>

          {/* Mode Selection */}
          <div className="mt-6 flex justify-center gap-2">
            <Button
              variant={mode === 'text' ? 'default' : 'outline'}
              onClick={() => setMode('text')}
              className="flex items-center gap-2"
            >
              <FileText size={16} />
              Text Translation
            </Button>
            <Button
              variant={mode === 'csv' ? 'default' : 'outline'}
              onClick={() => setMode('csv')}
              className="flex items-center gap-2"
            >
              <File size={16} />
              CSV File Translation
            </Button>
          </div>

          {/* Configuration Status */}
          <div className="mt-4">
            <Badge
              variant={azureOpenAIService.isConfigured() ? "default" : "secondary"}
              className="text-xs"
            >
              {azureOpenAIService.getConfigurationStatus()}
            </Badge>
          </div>
        </div>

        {/* Model Selection */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Choose Translation Model</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={selectedModel}
                onValueChange={(value) => setSelectedModel(value as TranslationModel)}
                className="flex flex-col gap-3"
              >
                {(Object.keys(modelLabels) as TranslationModel[]).map((model) => (
                  <div key={model} className="flex items-center space-x-2">
                    <RadioGroupItem value={model} id={model} />
                    <Label
                      htmlFor={model}
                      className="cursor-pointer font-medium text-foreground"
                    >
                      {modelLabels[model]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        </div>

        {/* Translation Interface */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                English Text
                <Badge variant="secondary" className="text-xs">
                  {inputText.length} characters
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                id="input-text"
                placeholder="Enter English text to translate..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[250px] resize-none text-base leading-relaxed"
                rows={10}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSendTranslation}
                  disabled={!isSendEnabled}
                  className="flex items-center gap-2"
                >
                  <PaperPlaneRight size={16} />
                  {isTranslating ? 'Translating...' : 'Translate'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Output Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Spanish Translation
                  <Badge variant="outline" className="text-xs">
                    {TARGET_LANGUAGE.name}
                  </Badge>
                  {isTranslating && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CircleNotch size={12} className="animate-spin" />
                      Translating...
                    </Badge>
                  )}
                </CardTitle>
                {translationResult && (
                  <div className="mb-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyTranslation}
                      className="flex items-center gap-1"
                    >
                      <Copy size={14} />
                      Copy
                    </Button>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock size={12} />
                      {translationResult.latency}ms
                    </Badge>
                    <Badge variant="outline">
                      {modelLabels[translationResult.model]}
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="min-h-[300px] rounded-lg border bg-muted/30 p-4">
                {error ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <div className="text-destructive font-medium">{error}</div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => performTranslation(inputText, selectedModel)}
                        disabled={isTranslating}
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                ) : translationResult ? (
                  <div className="text-base leading-relaxed text-foreground">
                    {translationResult.text}
                  </div>
                ) : inputText && !translationResult ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      {isTranslating ? (
                        <div className="flex items-center gap-2">
                          <CircleNotch size={20} className="animate-spin" />
                          Translating with {modelLabels[selectedModel]}...
                        </div>
                      ) : (
                        'Click "Translate" to see Spanish translation'
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Enter English text to see Spanish translation
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Powered by {modelLabels[selectedModel]} • English to {TARGET_LANGUAGE.name}
        </div>
      </div>
      <Toaster />
    </div>
  )
}

export default App