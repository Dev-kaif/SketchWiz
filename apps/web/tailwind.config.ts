// tailwind.config.ts
import type { Config } from "tailwindcss";
import sharedConfig from "@repo/tailwind-config";

const config: Pick<Config, "content" | "presets"> = {
  content: [
    "./app/**/*.tsx",
    "./Component/**/*.tsx",
    "../../packages/ui/src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [sharedConfig],
};

export default config;
