import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          "50": "#F0FDFA",
          "100": "#CCFBF1",
          "200": "#99F6E4",
          "300": "#5EEAD4",
          "400": "#2DD4BF",
          "500": "#14B8A6",
          "600": "#0D9488",
          "700": "#0F766E",
          "800": "#115E59",
          "900": "#134E4A",
          "950": "#042F2E",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [forms],
};

export default config;
