# Coding Standards

## TypeScript Standards
- Use strict mode for all TypeScript files
- Define interfaces for all data structures
- Use type guards for runtime type checking
- Prefer const assertions for literal types
- Use generics for reusable components

## React Component Standards
- Use functional components with hooks
- Implement proper error boundaries
- Use React.memo for performance optimization
- Follow container/presenter pattern for complex components
- Use custom hooks for shared logic

## UI Element Identification Standards
- Add `data-testid` attributes to all interactive elements and key containers
- Use descriptive, hierarchical naming for test IDs
- Include `aria-label` for accessibility and identification
- Add CSS classes with BEM naming convention for styling hooks

### Test ID Naming Convention
```jsx
// Format: data-testid="component-element-action"
// Examples:
<div data-testid="bmad-tab-container">
  <button data-testid="epic-1-tab-button" aria-label="Epic 1">
  <div data-testid="story-1-1-panel">
    <button data-testid="story-1-1-edit-button">
    <div data-testid="story-1-1-verification-view">
  </div>
</div>
```

### Required Test IDs
- All buttons: `data-testid="[context]-[action]-button"`
- All tabs: `data-testid="[tab-name]-tab"`
- All panels: `data-testid="[panel-name]-panel"`
- All forms: `data-testid="[form-name]-form"`
- All inputs: `data-testid="[field-name]-input"`
- All modals: `data-testid="[modal-name]-modal"`

### Element Naming Examples
```jsx
// Story Panel
<div 
  data-testid="story-1-1-panel" 
  className="story-panel story-panel--epic-1"
  aria-label="Story 1.1: Create MadShrimp Agent"
>
  <button 
    data-testid="story-1-1-edit-button"
    className="story-panel__edit-btn"
    aria-label="Edit Story 1.1"
  />
  <div 
    data-testid="story-1-1-parallel-indicator"
    className="story-panel__parallel-indicator"
    aria-label="Multiple developers can work on this"
  >👥</div>
</div>

// Epic Tab
<button 
  data-testid="epic-1-tab-button"
  className="epic-tab epic-tab--active"
  aria-label="Epic 1: MadShrimp Integration"
  role="tab"
  aria-selected="true"
/>

// Verification View
<div 
  data-testid="story-1-2-verification-view"
  className="verification-view"
  aria-label="Verification results for Story 1.2"
>
  <span data-testid="story-1-2-verification-score">85</span>
</div>
```

## Chakra UI v2 Color System

### Core Color Palette
Based on Chakra UI v2 design system, use these semantic color tokens for consistent theming:

#### Background Colors (Dark Mode)
```javascript
// Primary backgrounds
bg.DEFAULT: '#141414'        // Main dark background
bg.subtle: '#1a1a1a'         // Subtle background variation
bg.muted: '#262626'          // Muted background

// Component backgrounds
gray.800: '#1a202c'          // Card/panel backgrounds
gray.900: '#171923'          // Darker sections
blackAlpha.300: 'rgba(0,0,0,0.3)'  // Overlay backgrounds
```

#### Text Colors (Dark Mode)
```javascript
// Text hierarchy
fg.DEFAULT: '#e5e5e5'        // Primary text
fg.muted: '#a3a3a3'          // Secondary/muted text
gray.300: '#cbd5e1'          // Subtle text
gray.400: '#94a3b8'          // Disabled text
white: '#ffffff'             // High contrast text
```

#### Status Colors
```javascript
// Success
green.500: '#38a169'         // Success primary
green.400: '#48bb78'         // Success hover
green.100: 'rgba(154,230,180,0.16)'  // Success background

// Warning
yellow.500: '#d69e2e'        // Warning primary
yellow.400: '#ecc94b'        // Warning hover
yellow.100: 'rgba(246,224,94,0.16)'  // Warning background

// Error
red.500: '#e53e3e'           // Error primary
red.400: '#fc8181'           // Error hover
red.100: 'rgba(254,178,178,0.16)'    // Error background

// Info
blue.500: '#3182ce'          // Info primary
blue.400: '#63b3ed'          // Info hover
blue.100: 'rgba(190,227,248,0.16)'   // Info background
```

#### Interactive Colors
```javascript
// Primary brand
blue.600: '#2c5282'          // Primary button
blue.500: '#3182ce'          // Primary hover
blue.400: '#63b3ed'          // Primary active

// Borders
border.DEFAULT: '#404040'    // Default border
gray.600: '#4a5568'          // Input borders
gray.700: '#2d3748'          // Hover borders
```

### Usage Guidelines

#### Buttons
```jsx
// Primary button
style={{
  backgroundColor: '#3182ce',  // blue.500
  color: 'white',
  '&:hover': { backgroundColor: '#2c5282' }  // blue.600
}}

// Secondary button
style={{
  backgroundColor: 'transparent',
  color: '#63b3ed',  // blue.400
  border: '1px solid #63b3ed',
  '&:hover': { 
    backgroundColor: 'rgba(99,179,237,0.1)',
    borderColor: '#3182ce'  // blue.500
  }
}}
```

#### Cards and Panels
```jsx
style={{
  backgroundColor: '#1a202c',  // gray.800
  borderColor: '#2d3748',      // gray.700
  color: '#e5e5e5'            // fg.DEFAULT
}}
```

#### Status Badges
```jsx
// Success
style={{
  backgroundColor: '#38a169',  // green.500
  color: 'white'
}}

// Warning
style={{
  backgroundColor: '#d69e2e',  // yellow.500
  color: 'white'
}}

// Error
style={{
  backgroundColor: '#e53e3e',  // red.500
  color: 'white'
}}
```

#### Tables (Dark Mode)
```jsx
// Table container
style={{
  backgroundColor: 'rgba(26,32,44,0.5)',  // gray.800 with opacity
  border: '1px solid #2d3748'             // gray.700
}}

// Table header
style={{
  backgroundColor: 'rgba(45,55,72,0.3)',  // gray.700 with opacity
  borderBottom: '2px solid #2d3748'       // gray.700
}}

// Table row hover
style={{
  '&:hover': { 
    backgroundColor: 'rgba(74,85,104,0.1)'  // gray.600 with opacity
  }
}}
```

### Accessibility Requirements
- Maintain WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Use semantic color tokens instead of hardcoded values
- Test color combinations with contrast checking tools
- Provide hover and focus states for all interactive elements

## File Naming Conventions
- React components: PascalCase (StoryPanel.jsx)
- Utilities: camelCase (storySync.js)
- Types: PascalCase with .ts extension (BMADTypes.ts)
- MCP tools: kebab-case (auto-verify.ts)
- BMAD agents: kebab-case (madshrimp.md)

## API Endpoint Conventions
```
GET    /api/bmad/stories           - List all stories
GET    /api/bmad/stories/:id       - Get specific story
PUT    /api/bmad/stories/:id       - Update story
GET    /api/bmad/epics             - List all epics
GET    /api/bmad/verification/:id  - Get verification results
POST   /api/bmad/verify            - Trigger verification
GET    /api/bmad/prd               - Get PRD content
PUT    /api/bmad/prd               - Update PRD content
```

## State Management
- Use React Context for global state (user preferences, theme)
- Use component state for UI state (modals, form inputs)
- Use server state caching for API data
- Implement optimistic updates for better UX

## Tab Creation Standards

### IMPORTANT: Tab Styling System
**DO NOT USE TAILWIND CLASSES FOR TABS** - Use the nested-tabs.css system for consistent styling across the application.

### Creating Navigation Tabs
All tabs in the application MUST use the nested-tabs.css styling system with HeadlessUI Tab components. Never use Tailwind classes for tab styling.

#### Required Structure for Tabs
```jsx
import { Tab } from '@headlessui/react';

// CORRECT - Using nested-tabs.css classes
<div className="inner-tabs-wrapper">
  <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
    <Tab.List className="inner-tabs-list project-inner-tabs">
      <Tab className={({ selected }) => `inner-tab ${selected ? 'active' : ''}`}>
        <span>Tab Name</span>
      </Tab>
    </Tab.List>
    
    <Tab.Panels className="inner-tab-panels">
      <Tab.Panel>
        {/* Tab content */}
      </Tab.Panel>
    </Tab.Panels>
  </Tab.Group>
</div>

// INCORRECT - DO NOT USE TAILWIND CLASSES
// ❌ <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
// ❌ <Tab className={({ selected }) => `w-full rounded-lg py-2.5 px-4 ${selected ? 'bg-white shadow' : ''}`}>
```

#### CSS Classes Reference
- **Wrapper**: `inner-tabs-wrapper` - Wraps the entire tab group
- **Tab List**: `inner-tabs-list project-inner-tabs` - Container for tab buttons
- **Tab Button**: `inner-tab` - Base class for each tab
- **Active Tab**: `inner-tab active` - Applied to selected tab
- **Panel Container**: `inner-tab-panels` - Container for tab panels

#### Example Implementation
```jsx
// Example from NestedTabs.jsx
<Tab.List className="inner-tabs-list project-inner-tabs">
  <Tab className={({ selected }) => `inner-tab ${selected ? 'active' : ''}`}>
    <span>📋 Tasks</span>
  </Tab>
  <Tab className={({ selected }) => `inner-tab ${selected ? 'active' : ''}`}>
    <span>📊 History</span>
  </Tab>
  <Tab className={({ selected }) => `inner-tab ${selected ? 'active' : ''}`}>
    <span>🤖 BMAD</span>
  </Tab>
</Tab.List>
```

#### Adding New Tabs Checklist
1. ✅ Import HeadlessUI Tab components
2. ✅ Wrap with `inner-tabs-wrapper` div
3. ✅ Use `inner-tabs-list project-inner-tabs` for Tab.List
4. ✅ Use `inner-tab` class with conditional `active` class
5. ✅ Use `inner-tab-panels` for Tab.Panels
6. ✅ Add proper `data-testid` attributes
7. ✅ Include ARIA labels for accessibility
8. ❌ Do NOT use Tailwind utility classes for styling

## Tab Navigation Best Practices
- Lazy load tab content for performance
- Maintain tab state in URL for deep linking
- Use keyboard navigation (Tab, Shift+Tab, Arrow keys)
- Implement proper ARIA labels for accessibility
- Show loading states for async content
- Always use nested-tabs.css classes, never Tailwind for tabs
