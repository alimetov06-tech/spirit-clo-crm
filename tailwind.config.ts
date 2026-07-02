import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        milk: "#F8F4EC",
        linen: "#EEE5D8",
        sand: "#D8C8B8",
        graphite: "#2F2C29",
        ink: "#171412",
        sage: "#64746A",
        clay: "#9B6A55",
        gold: "#B4935D"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(47, 44, 41, 0.08)"
      },
      borderRadius: {
        xl: "0.75rem"
      }
    }
  },
  plugins: []
};

export default config;
