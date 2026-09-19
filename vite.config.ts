import vinext from "vinext";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
      inspectorPort: false,
      config: {
        main: "vinext/server/fetch-handler",
        compatibility_flags: ["nodejs_compat"],
      },
    }),
  ],
});
