import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", "Fraunces", "Mackinac", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Fragment Mono", "monospace"],
      },
      colors: {
        fly: {
          purple: "#7c3aed",
          "purple-hover": "#6d28d9",
          "purple-light": "#e6e0fe",
          "purple-border": "#d4c4fd",
          text: "#2e2e2e",
          muted: "#686082",
          dark: "#140f2d",
          cream: "#faf9f6",
        },
      },
    },
  },
  plugins: [],
};
export default config;
