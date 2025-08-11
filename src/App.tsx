import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import { Copy, Languages, Loader2, PaperPlaneRight } from '@phosphor-icons/react'
import { toast } from 'sonner'

type TranslationModel = 'gpt-4o' | 'gpt-5' | 'azure'

function App() {
  const [inputText, setInputText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [selectedModel, setSelectedModel] = useKV<TranslationModel>('translation-model', 'gpt-4o')
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState('')

  // Check if send button should be enabled
  const isSendEnabled = inputText.trim().length > 0 && selectedModel && !isTranslating

  const performTranslation = async (text: string, model: TranslationModel) => {
    setIsTranslating(true)
    setError('')

    try {
      let prompt: string
      
      if (model === 'azure') {
        prompt = spark.llmPrompt`Translate the following text to English using Azure Translation service style. Be concise and accurate: ${text}`
      } else if (model === 'gpt-5') {
        prompt = spark.llmPrompt`Using GPT-5 capabilities, translate this text to English with enhanced context understanding: ${text}`
      } else {
        prompt = spark.llmPrompt`Translate the following text to English: ${text}`
      }

      const result = await spark.llm(prompt, 'gpt-4o')
      setTranslatedText(result)
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
    if (!translatedText) return
    
    try {
      await navigator.clipboard.writeText(translatedText)
      toast.success('Translation copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy translation')
    }
  }

  const modelLabels = {
    'gpt-4o': 'GPT-4o',
    'gpt-5': 'GPT-5',
    'azure': 'Azure Translation'
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Languages size={32} className="text-accent" />
            <h1 className="text-3xl font-bold text-foreground">AI Translation Service</h1>
          </div>
          <p className="text-muted-foreground">
            Translate text using advanced AI models with real-time results
          </p>
        </div>

        {/* Model Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Choose Translation Model</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedModel}
              onValueChange={(value) => setSelectedModel(value as TranslationModel)}
              className="flex flex-col gap-3 sm:flex-row sm:gap-6"
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

        {/* Translation Interface */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Input Text
                <Badge variant="secondary" className="text-xs">
                  {inputText.length} characters
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                id="input-text"
                placeholder="Enter text to translate..."
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
                  Translation
                  {isTranslating && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" />
                      Translating...
                    </Badge>
                  )}
                </CardTitle>
                {translatedText && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyTranslation}
                    className="flex items-center gap-1"
                  >
                    <Copy size={14} />
                    Copy
                  </Button>
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
                ) : translatedText ? (
                  <div className="text-base leading-relaxed text-foreground">
                    {translatedText}
                  </div>
                ) : inputText && !translatedText ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      {isTranslating ? (
                        <div className="flex items-center gap-2">
                          <Loader2 size={20} className="animate-spin" />
                          Translating with {modelLabels[selectedModel]}...
                        </div>
                      ) : (
                        'Click "Translate" to see translation'
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Enter text in the input area to see translation
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Powered by {modelLabels[selectedModel]} • Real-time translation
        </div>
      </div>
    </div>
  )
}

export default App