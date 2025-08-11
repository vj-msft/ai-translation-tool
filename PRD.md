# Translation Service App

A simple, elegant translation interface that allows users to translate text using different AI models with real-time results.

**Experience Qualities**:
1. **Immediate** - Translations appear quickly without unnecessary delays
2. **Clean** - Minimal interface that focuses attention on the translation task
3. **Reliable** - Clear feedback on translation status and model selection

**Complexity Level**: Micro Tool (single-purpose)
- Focused solely on text translation with model selection, keeping the interface simple and task-oriented

## Essential Features

### Text Input Area
- **Functionality**: Large textarea for users to input text they want translated
- **Purpose**: Primary input method for translation content
- **Trigger**: User clicks or focuses on the input area
- **Progression**: Focus input → Type/paste text → Text appears in input area
- **Success criteria**: Text is clearly visible and editable with proper formatting

### Model Selection
- **Functionality**: Radio button group to choose between GPT-4o, GPT-5, and Azure Translation
- **Purpose**: Allows users to select their preferred translation service
- **Trigger**: User clicks on a radio button option
- **Progression**: View options → Click preferred model → Selection updates visually
- **Success criteria**: Only one model selected at a time, clear visual indication of active selection

### Translation Display
- **Functionality**: Output area showing translated text with loading states
- **Purpose**: Display translation results clearly and allow copying
- **Trigger**: User inputs text and model processes translation
- **Progression**: Text input → Translation processing → Results displayed
- **Success criteria**: Translation appears promptly with proper formatting and copy functionality

### Real-time Translation
- **Functionality**: Automatic translation as user types with debouncing
- **Purpose**: Immediate feedback without manual submission
- **Trigger**: User stops typing for 500ms
- **Progression**: Text input → Brief pause → Translation request → Results update
- **Success criteria**: Smooth translation updates without excessive API calls

## Edge Case Handling

- **Empty Input**: Show placeholder text encouraging user to enter text
- **Translation Errors**: Display friendly error messages with retry options
- **Long Text**: Handle large text inputs with appropriate loading indicators
- **Network Issues**: Graceful handling of connectivity problems with clear messaging
- **Model Unavailable**: Fallback messaging when selected model is not accessible

## Design Direction

The design should feel modern, clean, and professional like a premium translation tool - emphasizing clarity and efficiency over decorative elements.

## Color Selection

Complementary color scheme to create clear visual hierarchy between input and output areas.

- **Primary Color**: Deep Blue (oklch(0.45 0.15 250)) - Communicates trust and professionalism
- **Secondary Colors**: Light Gray (oklch(0.95 0.01 250)) for backgrounds, Medium Gray (oklch(0.65 0.05 250)) for borders
- **Accent Color**: Vibrant Teal (oklch(0.65 0.18 180)) - Attention-grabbing highlight for active states and CTAs
- **Foreground/Background Pairings**:
  - Background (Light Gray #F8F9FA): Dark Gray text (oklch(0.25 0.02 250)) - Ratio 12.1:1 ✓
  - Primary (Deep Blue): White text (oklch(0.98 0 0)) - Ratio 8.2:1 ✓
  - Accent (Vibrant Teal): White text (oklch(0.98 0 0)) - Ratio 5.1:1 ✓
  - Card (White): Dark Gray text (oklch(0.25 0.02 250)) - Ratio 15.8:1 ✓

## Font Selection

Clean, highly legible sans-serif typeface that maintains readability across different text sizes and supports multiple languages well.

- **Typographic Hierarchy**:
  - H1 (App Title): Inter Bold/32px/tight letter spacing
  - H2 (Section Labels): Inter Medium/18px/normal spacing  
  - Body (Input/Output Text): Inter Regular/16px/relaxed line height
  - Labels (Radio Options): Inter Medium/14px/normal spacing
  - Helper Text: Inter Regular/12px/loose spacing

## Animations

Subtle, functional animations that guide attention and provide feedback without being distracting or slowing down the translation workflow.

- **Purposeful Meaning**: Smooth transitions communicate system responsiveness and guide user attention between input and output
- **Hierarchy of Movement**: Focus on translation status indicators and model selection feedback, with minimal motion elsewhere

## Component Selection

- **Components**: Card for main layout structure, Textarea for input, RadioGroup for model selection, Button for copy actions, Badge for status indicators
- **Customizations**: Custom loading spinner for translation status, enhanced textarea with character counting
- **States**: Radio buttons with clear selected/unselected states, textarea with focus highlighting, buttons with hover/active feedback
- **Icon Selection**: Copy icon for copy-to-clipboard, language/translate icon for branding, loading spinner for processing
- **Spacing**: Consistent 4-unit (16px) spacing between major sections, 2-unit (8px) for related elements
- **Mobile**: Single column layout with full-width components, larger touch targets for radio buttons, optimized textarea sizing