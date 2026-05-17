import { extendTheme, ThemeConfig } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// Paleta baseada em #5D0C95
const brand = {
  50: '#F3E8FF',
  100: '#E5CCFF',
  200: '#CFA3FA',
  300: '#B276F3',
  400: '#8E47DA',
  500: '#5D0C95',
  600: '#530A86',
  700: '#43086B',
  800: '#320650',
  900: '#230437',
};

export const theme = extendTheme({
  config,
  colors: { brand },
  fonts: {
    heading: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
    body: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
  },
  breakpoints: {
    base: '0em',
    sm: '30em',  // 480px
    md: '48em',  // 768px
    lg: '62em',  // 992px
    xl: '80em',  // 1280px
    '2xl': '96em', // 1536px
    '3xl': '120em', // 1920px (desktop/TV HD)
    '4xl': '160em', // 2560px (TV/monitores grandes)
  },
  components: {
    Button: { defaultProps: { colorScheme: 'brand' } },
    IconButton: { defaultProps: { colorScheme: 'brand' } },
    Badge: { baseStyle: { borderRadius: 'md' } },
    Heading: {
      baseStyle: (props: any) => ({ color: mode('gray.800', 'white')(props) }),
    },
  },
  styles: {
    global: (props: any) => ({
      body: {
        bg: mode('gray.50', 'gray.900')(props),
        color: mode('gray.800', 'gray.100')(props),
      },
    }),
  },
});