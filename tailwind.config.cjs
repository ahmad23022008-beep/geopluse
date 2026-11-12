module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#152de4",
        "primary-container": "#3a4efb",
        "on-primary": "#ffffff",
        "on-primary-container": "#e2e3ff",
        "primary-fixed": "#dfe0ff",
        "primary-fixed-dim": "#bdc2ff",
        "on-primary-fixed": "#000965",
        "on-primary-fixed-variant": "#0020dd",

        "secondary": "#00629e",
        "secondary-container": "#3ca9ff",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#003c63",
        "secondary-fixed": "#cfe5ff",
        "secondary-fixed-dim": "#9acbff",

        "tertiary": "#495400",
        "tertiary-container": "#5f6d00",
        "tertiary-fixed": "#d4f029",
        "tertiary-fixed-dim": "#b9d300",
        "on-tertiary-fixed": "#191e00",
        "on-tertiary-container": "#d7f32d",

        "surface": "#fbf8ff",
        "surface-dim": "#d5d8fa",
        "surface-bright": "#fbf8ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f4f2ff",
        "surface-container": "#edecff",
        "surface-container-high": "#e5e6ff",
        "surface-container-highest": "#dee0ff",
        "on-surface": "#161a33",
        "on-surface-variant": "#444656",
        "inverse-surface": "#2b2f49",
        "inverse-on-surface": "#f0efff",

        "outline": "#757688",
        "outline-variant": "#c5c5d9",
        "structural-border": "#dee0ed",

        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace']
      },
      borderRadius: {
        'DEFAULT': '0.25rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
        'full': '9999px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(37, 41, 67, 0.04), 0 4px 12px rgba(37, 41, 67, 0.03)',
        'card-hover': '0 4px 16px rgba(58, 78, 251, 0.08), 0 2px 6px rgba(37, 41, 67, 0.06)',
        'panel': '0 12px 32px rgba(37, 41, 67, 0.12), 0 4px 8px rgba(37, 41, 67, 0.04)',
      }
    },
  },
  plugins: [],
};
