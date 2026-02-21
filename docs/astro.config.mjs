// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightTypeDoc, { typeDocSidebarGroup } from "starlight-typedoc";
import starlightThemeNova from "starlight-theme-nova";

export default defineConfig({
  redirects: {
    "/api/core/namespaces/arr": "/api/core/namespaces/arr/functions/chunksof",
    "/api/core/namespaces/rec": "/api/core/namespaces/rec/functions/entries",
  },
  integrations: [
    starlight({
      title: "@nlozgachev/pipekit",
      customCss: ["./src/styles/custom.css"],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/nlozgachev/pipekit",
        },
      ],
      plugins: [
        starlightThemeNova({
          nav: [
            {
              label: "Docs",
              href: "/getting-started/installation",
            },
          ],
        }),
        starlightTypeDoc({
          entryPoints: [
            "../src/Core/index.ts",
            "../src/Types/index.ts",
            "../src/Composition/index.ts",
          ],
          tsconfig: "../tsconfig.typedoc.json",
          output: "api",
          typeDoc: {
            entryPointStrategy: "expand",
            excludePrivate: true,
            excludeInternal: true,
          },
          sidebar: {
            label: "API Reference",
            collapsed: true,
          },
        }),
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Installation", slug: "getting-started/installation" },
            {
              label: "Thinking in pipelines",
              slug: "getting-started/pipelines",
            },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Option — absent values", slug: "guides/option" },
            { label: "Result — handling failures", slug: "guides/result" },
            {
              label: "Validation — collecting errors",
              slug: "guides/validation",
            },
            { label: "Task — async operations", slug: "guides/task" },
            {
              label: "RemoteData — loading states",
              slug: "guides/remote-data",
            },
            { label: "These — inclusive OR", slug: "guides/these" },
            { label: "Lens — nested updates", slug: "guides/lens" },
            { label: "Optional — optional focus", slug: "guides/optional" },
            { label: "Brand — nominal types", slug: "guides/brand" },
            { label: "Arr — array utilities", slug: "guides/arr" },
            { label: "Rec — record utilities", slug: "guides/rec" },
          ],
        },
        {
          label: "Appendix",
          items: [{ label: "Design & influences", slug: "appendix" }],
        },
        typeDocSidebarGroup,
      ],
    }),
  ],
});
