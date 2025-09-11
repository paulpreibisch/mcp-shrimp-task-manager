import { extendTheme } from '@chakra-ui/react';

// Enhanced color system matching coding standards
const colors = {
  // Background colors (Dark Mode)
  bg: {
    DEFAULT: '#141414',        // Main dark background
    subtle: '#1a1a1a',         // Subtle background variation
    muted: '#262626',          // Muted background
  },
  
  // Text colors (Dark Mode)
  fg: {
    DEFAULT: '#e5e5e5',        // Primary text
    muted: '#a3a3a3',          // Secondary/muted text
  },
  
  // Interactive colors
  border: {
    DEFAULT: '#404040',        // Default border
  },
  
  // Enhanced brand colors from existing theme
  brand: {
    primary: '#4fbdba',        // Accent color
    secondary: '#7b68ee',      // Secondary accent
    background: '#0a0e27',     // Main background (legacy)
    panel: '#16213e',          // Panel background (legacy)
    surface: '#1a1f3a',        // Surface background (legacy)
    border: '#2c3e50',         // Border color (legacy)
    dark: '#0f1626',           // Darker background (legacy)
    light: '#34495e',          // Lighter surface (legacy)
  },
  
  // Status colors matching coding standards
  green: {
    100: 'rgba(154,230,180,0.16)',  // Success background
    400: '#48bb78',                 // Success hover
    500: '#38a169',                 // Success primary
  },
  yellow: {
    100: 'rgba(246,224,94,0.16)',   // Warning background
    400: '#ecc94b',                 // Warning hover
    500: '#d69e2e',                 // Warning primary
  },
  red: {
    100: 'rgba(254,178,178,0.16)',  // Error background
    400: '#fc8181',                 // Error hover
    500: '#e53e3e',                 // Error primary
  },
  blue: {
    100: 'rgba(190,227,248,0.16)',  // Info background
    400: '#63b3ed',                 // Info hover/Primary active
    500: '#3182ce',                 // Info primary/Primary hover
    600: '#2c5282',                 // Primary button
  },
  
  // Enhanced gray scale for dark mode
  gray: {
    300: '#cbd5e1',    // Subtle text
    400: '#94a3b8',    // Disabled text
    500: '#718096',
    600: '#4a5568',    // Input borders
    700: '#2d3748',    // Hover borders
    800: '#1a202c',    // Card/panel backgrounds
    900: '#171923',    // Darker sections
  },
  
  // Additional colors
  white: '#ffffff',
  blackAlpha: {
    300: 'rgba(0,0,0,0.3)',  // Overlay backgrounds
    600: 'rgba(0,0,0,0.6)',
  },
};

// Semantic tokens for consistent theming
const semanticTokens = {
  colors: {
    // Background semantic tokens
    'bg.canvas': {
      default: 'white',
      _dark: 'bg.DEFAULT',
    },
    'bg.surface': {
      default: 'gray.50',
      _dark: 'gray.800',
    },
    'bg.subtle': {
      default: 'gray.100',
      _dark: 'bg.subtle',
    },
    'bg.muted': {
      default: 'gray.200',
      _dark: 'bg.muted',
    },
    
    // Text semantic tokens
    'text.default': {
      default: 'gray.900',
      _dark: 'fg.DEFAULT',
    },
    'text.muted': {
      default: 'gray.600',
      _dark: 'fg.muted',
    },
    'text.subtle': {
      default: 'gray.500',
      _dark: 'gray.300',
    },
    'text.accent': {
      default: 'blue.600',
      _dark: 'brand.primary',
    },
    
    // Border semantic tokens
    'border.default': {
      default: 'gray.200',
      _dark: 'border.DEFAULT',
    },
    'border.muted': {
      default: 'gray.100',
      _dark: 'gray.600',
    },
  },
};

// Component style overrides following coding standards
const components = {
  // Global text styles
  Text: {
    baseStyle: {
      color: 'text.default',
    },
  },
  
  // Button component with coding standards colors
  Button: {
    baseStyle: {
      fontWeight: 'medium',
      borderRadius: 'md',
    },
    variants: {
      solid: {
        bg: 'blue.600',           // Primary button
        color: 'white',
        _hover: {
          bg: 'blue.500',         // Primary hover
        },
        _active: {
          bg: 'blue.400',         // Primary active
        },
      },
      outline: {
        borderColor: 'blue.400',
        color: 'blue.400',
        backgroundColor: 'transparent',
        _hover: {
          backgroundColor: 'rgba(99,179,237,0.1)',
          borderColor: 'blue.500',
        },
      },
      ghost: {
        color: 'text.default',
        _hover: {
          bg: 'bg.subtle',
        },
      },
    },
  },
  
  // Card component with proper backgrounds
  Card: {
    baseStyle: {
      container: {
        bg: 'gray.800',           // Card/panel backgrounds
        borderColor: 'gray.700', // Hover borders
        borderWidth: '1px',
        borderRadius: 'lg',
        boxShadow: 'sm',
        color: 'fg.DEFAULT',
      },
    },
  },
  
  // Modal component
  Modal: {
    baseStyle: {
      dialog: {
        bg: 'bg.surface',
        borderColor: 'border.default',
      },
      overlay: {
        bg: 'blackAlpha.600',
      },
    },
  },
  
  // Input component
  Input: {
    variants: {
      outline: {
        field: {
          borderColor: 'gray.600',  // Input borders
          bg: 'bg.canvas',
          color: 'text.default',
          _hover: {
            borderColor: 'gray.700',  // Hover borders
          },
          _focus: {
            borderColor: 'brand.primary',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-primary)',
          },
        },
      },
    },
  },
  
  // Table component
  Table: {
    variants: {
      simple: {
        th: {
          borderColor: 'border.default',
          color: 'text.muted',
          fontSize: 'sm',
          fontWeight: 'semibold',
          textTransform: 'uppercase',
          letterSpacing: 'wider',
        },
        td: {
          borderColor: 'border.default',
          color: 'text.default',
        },
      },
    },
  },
  
  // Tabs component
  Tabs: {
    variants: {
      line: {
        tablist: {
          borderColor: 'border.default',
        },
        tab: {
          color: 'text.muted',
          _selected: {
            color: 'text.accent',
            borderColor: 'brand.primary',
          },
        },
      },
    },
  },
  
  // Badge component with status colors
  Badge: {
    variants: {
      solid: {
        bg: 'brand.primary',
        color: 'white',
      },
      success: {
        bg: 'green.500',
        color: 'white',
      },
      warning: {
        bg: 'yellow.500',
        color: 'white',
      },
      error: {
        bg: 'red.500',
        color: 'white',
      },
    },
  },
};

// Global styles
const styles = {
  global: (props) => ({
    body: {
      bg: props.colorMode === 'dark' ? 'bg.DEFAULT' : 'white',
      color: props.colorMode === 'dark' ? 'fg.DEFAULT' : 'gray.900',
    },
    '*::placeholder': {
      color: props.colorMode === 'dark' ? 'gray.400' : 'gray.400',
    },
    '*, *::before, &::after': {
      borderColor: props.colorMode === 'dark' ? 'border.DEFAULT' : 'gray.200',
    },
  }),
};

// Theme configuration with dark mode as default
const config = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

// Typography
const fonts = {
  heading: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
  body: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
  mono: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
};

// Create and export the Chakra UI theme
const chakraTheme = extendTheme({
  config,
  colors,
  semanticTokens,
  components,
  styles,
  fonts,
});

export default chakraTheme;