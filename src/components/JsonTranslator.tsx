import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, Download, FileText, CircleNotch, File } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { azureOpenAIService, TranslationModel } from '../services/azureOpenAI'

interface CsvRow {
  [key: string]: string
}

interface MultiModelTranslationResult {
  sNo: number
  english: string
  translations: { [key in TranslationModel]?: string }
}

interface CsvTranslatorProps {
  onBack: () => void
}

export function CsvTranslator({ onBack }: CsvTranslatorProps) {
  const [selectedModels, setSelectedModels] = useState<TranslationModel[]>(['gpt-4o'])
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CsvRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationProgress, setTranslationProgress] = useState(0)
  const [translationResults, setTranslationResults] = useState<MultiModelTranslationResult[]>([])
  const [translatedCsvData, setTranslatedCsvData] = useState<CsvRow[]>([])
  const [currentTranslatingText, setCurrentTranslatingText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const modelLabels = {
    'gpt-4o': 'GPT-4o',
    'gpt-5': 'GPT-5',
    'gpt-4.1': 'GPT-4.1'
  }

  const handleModelSelection = (model: TranslationModel, checked: boolean) => {
    setSelectedModels(prev => {
      if (checked) {
        return [...prev, model]
      } else {
        return prev.filter(m => m !== model)
      }
    })
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    setUploadedFile(file)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const parsed = parseCsv(content)
        setCsvData(parsed.data)
        setCsvHeaders(parsed.headers)
        toast.success('CSV file loaded successfully')
      } catch (error: any) {
        toast.error(error.message || 'Invalid CSV file')
        setUploadedFile(null)
        setCsvData([])
        setCsvHeaders([])
      }
    }
    reader.readAsText(file)
  }

  const parseCsv = (content: string): { headers: string[], data: CsvRow[] } => {
    const lines = content.trim().split('\n')
    if (lines.length === 0) throw new Error('Empty CSV file')

    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''))

    // Validate that we have the required columns (S.No and English are required)
    const requiredColumns = ['S.No', 'English']
    const hasRequiredColumns = requiredColumns.every(col =>
      headers.some(header => header.trim().toLowerCase() === col.toLowerCase())
    )

    if (!hasRequiredColumns) {
      throw new Error('CSV must have columns: S.No, English (Spanish columns will be added for each selected model)')
    }

    const data: CsvRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i])
      if (values.length === headers.length) {
        const row: CsvRow = {}
        headers.forEach((header, index) => {
          row[header] = values[index]
        })
        data.push(row)
      }
    }

    return { headers, data }
  }

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())
    return result
  }

  const extractTextFromCsv = (data: CsvRow[]): string[] => {
    const texts: string[] = []

    data.forEach(row => {
      // Only extract from the 'English' column
      const englishText = row['English'] || row[' English'] || ''
      if (typeof englishText === 'string' && englishText.trim().length > 0 && /[a-zA-Z]/.test(englishText)) {
        texts.push(englishText.trim())
      }
    })

    return texts
  }

  const handleTranslateCsv = async () => {
    if (csvData.length === 0) return

    if (selectedModels.length === 0) {
      toast.error('Please select at least one model')
      return
    }

    setIsTranslating(true)
    setTranslationProgress(0)
    setTranslationResults([])
    setCurrentTranslatingText('')

    try {
      // Extract all text strings from CSV
      const allTexts = extractTextFromCsv(csvData)
      const uniqueTexts = [...new Set(allTexts)] // Remove duplicates

      if (uniqueTexts.length === 0) {
        toast.error('No translatable text found in CSV')
        setIsTranslating(false)
        return
      }

      const results: MultiModelTranslationResult[] = []
      const translationMaps = new Map<string, { [key in TranslationModel]?: string }>()

      // Translate each unique text with all selected models
      for (let i = 0; i < uniqueTexts.length; i++) {
        const text = uniqueTexts[i]
        setCurrentTranslatingText(text)

        try {
          const translations = await azureOpenAIService.translateTextWithMultipleModels(text, selectedModels)

          const result: MultiModelTranslationResult = {
            sNo: i + 1,
            english: text,
            translations: translations
          }

          results.push(result)
          translationMaps.set(text, translations)
          setTranslationResults([...results])

          // Update progress
          const progress = ((i + 1) / uniqueTexts.length) * 100
          setTranslationProgress(progress)

        } catch (error) {
          console.error(`Failed to translate: ${text}`, error)
          // Continue with original text if translation fails
          const fallbackTranslations: { [key in TranslationModel]?: string } = {}
          selectedModels.forEach(model => {
            fallbackTranslations[model] = text
          })
          translationMaps.set(text, fallbackTranslations)
        }
      }

      // Create translated CSV with separate columns for each model
      const translatedCsv = csvData.map(row => {
        const newRow: CsvRow = { ...row }
        const englishText = row['English'] || row[' English'] || ''

        if (englishText && typeof englishText === 'string') {
          const translations = translationMaps.get(englishText.trim())
          if (translations) {
            selectedModels.forEach(model => {
              const columnName = `Spanish-${modelLabels[model]}`
              newRow[columnName] = translations[model] || englishText
            })
          }
        }

        return newRow
      })

      setTranslatedCsvData(translatedCsv)
      setCurrentTranslatingText('')
      toast.success(`Translation completed! ${results.length} texts translated with ${selectedModels.length} model(s).`)

    } catch (error) {
      console.error('Translation error:', error)
      toast.error('Translation failed. Please try again.')
    } finally {
      setIsTranslating(false)
    }
  }

  const downloadTranslatedCsv = () => {
    if (translatedCsvData.length === 0) return

    // Generate new headers including the model-specific Spanish columns
    const originalHeaders = csvHeaders.filter(h => !h.toLowerCase().includes('spanish'))
    const newHeaders = [...originalHeaders]
    selectedModels.forEach(model => {
      newHeaders.push(`Spanish-${modelLabels[model]}`)
    })

    const csvContent = generateCsvFromData(translatedCsvData, newHeaders)
    downloadFile(csvContent, `${uploadedFile?.name.replace('.csv', '')}_translated.csv`, 'text/csv')
    toast.success('Translated CSV file downloaded')
  }

  const downloadTranslationReport = () => {
    if (translationResults.length === 0) return

    const csvContent = generateMultiModelCsv(translationResults)
    downloadFile(csvContent, 'translation-report.csv', 'text/csv')
    toast.success('Translation report downloaded')
  }

  const generateCsvFromData = (data: CsvRow[], headers: string[]): string => {
    const csvRows = [headers.join(',')]

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || ''
        return escapeCsvField(value)
      })
      csvRows.push(values.join(','))
    })

    return csvRows.join('\n')
  }

  const escapeCsvField = (field: string): string => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`
    }
    return field
  }

  const generateMultiModelCsv = (results: MultiModelTranslationResult[]): string => {
    const headers = ['S.no', 'English', ...selectedModels.map(model => `Spanish-${modelLabels[model]}`)]
    const csvRows = [headers.join(',')]

    results.forEach(({ sNo, english, translations }) => {
      const row = [
        sNo.toString(),
        escapeCsvField(english),
        ...selectedModels.map(model => escapeCsvField(translations[model] || ''))
      ]
      csvRows.push(row.join(','))
    })

    return csvRows.join('\n')
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const resetTranslation = () => {
    setUploadedFile(null)
    setCsvData([])
    setCsvHeaders([])
    setTranslationResults([])
    setTranslatedCsvData([])
    setTranslationProgress(0)
    setCurrentTranslatingText('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-4">
            <Button variant="outline" onClick={onBack}>
              ← Back to Text Translation
            </Button>
            <div className="flex items-center gap-2">
              <File size={32} className="text-accent" />
              <h1 className="text-3xl font-bold text-foreground">CSV File Translation</h1>
            </div>
          </div>
          <p className="text-muted-foreground">
            Upload a CSV file with columns: S.No, English. Select multiple models to generate separate Spanish columns for each model (e.g., Spanish-GPT4o, Spanish-GPT5, etc.)
          </p>
        </div>

        {/* Model Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Choose Translation Models (Select multiple)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {(Object.keys(modelLabels) as TranslationModel[]).map((model) => (
                <div key={model} className="flex items-center space-x-2">
                  <Checkbox
                    id={model}
                    checked={selectedModels.includes(model)}
                    onCheckedChange={(checked) => handleModelSelection(model, checked as boolean)}
                  />
                  <Label htmlFor={model} className="cursor-pointer font-medium text-foreground">
                    {modelLabels[model]}
                  </Label>
                </div>
              ))}
            </div>
            {selectedModels.length === 0 && (
              <p className="text-sm text-red-500 mt-2">Please select at least one model</p>
            )}
          </CardContent>
        </Card>

        {/* File Upload Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload size={20} />
              Upload CSV File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                aria-label="Upload CSV file"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                disabled={isTranslating}
              >
                <Upload size={16} className="mr-2" />
                Choose CSV File
              </Button>
              {uploadedFile && (
                <div className="flex items-center gap-2">
                  <FileText size={16} />
                  <span className="text-sm">{uploadedFile.name}</span>
                  <Badge variant="secondary">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
              )}
            </div>

            {csvData.length > 0 && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <h4 className="text-sm font-medium mb-2">CSV Preview ({csvData.length} rows)</h4>
                  <div className="text-xs text-muted-foreground">
                    Input Columns: {csvHeaders.join(', ')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Output will include: S.No, English, {selectedModels.map(model => `Spanish-${modelLabels[model]}`).join(', ')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Ready to translate {csvData.filter(row => {
                      const englishText = row['English'] || row[' English'] || ''
                      return englishText.trim().length > 0
                    }).length} English texts with {selectedModels.length} model(s)
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleTranslateCsv}
                    disabled={isTranslating}
                    className="flex items-center gap-2"
                  >
                    {isTranslating ? (
                      <>
                        <CircleNotch size={16} className="animate-spin" />
                        Translating...
                      </>
                    ) : (
                      'Start Translation'
                    )}
                  </Button>
                  <Button variant="outline" onClick={resetTranslation} disabled={isTranslating}>
                    Reset
                  </Button>
                </div>

                {isTranslating && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Translation Progress</span>
                      <span>{Math.round(translationProgress)}%</span>
                    </div>
                    <Progress value={translationProgress} className="w-full" />
                    {currentTranslatingText && (
                      <p className="text-sm text-muted-foreground">
                        Translating: {currentTranslatingText.substring(0, 50)}
                        {currentTranslatingText.length > 50 ? '...' : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Download Section */}
        {translationResults.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download size={20} />
                Download Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button onClick={downloadTranslationReport} variant="outline">
                  <Download size={16} className="mr-2" />
                  Download Translation Report
                </Button>
                {translatedCsvData.length > 0 && (
                  <Button onClick={downloadTranslatedCsv} variant="outline">
                    <Download size={16} className="mr-2" />
                    Download Updated CSV
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Translation Results Table */}
        {translationResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Translation Results ({translationResults.length} items)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">S.no</TableHead>
                      <TableHead>English</TableHead>
                      {selectedModels.map(model => (
                        <TableHead key={model}>Spanish-{modelLabels[model]}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {translationResults.map((result) => (
                      <TableRow key={result.sNo}>
                        <TableCell>{result.sNo}</TableCell>
                        <TableCell className="max-w-xs truncate">{result.english}</TableCell>
                        {selectedModels.map(model => (
                          <TableCell key={model} className="max-w-xs truncate">
                            {result.translations[model] || ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
