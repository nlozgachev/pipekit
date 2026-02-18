import { build, emptyDir } from "@deno/dnt";

const denoJson = JSON.parse(await Deno.readTextFile("./deno.json"));

await emptyDir("./npm");

await build({
  entryPoints: [
    {
      name: "./Composition",
      path: "./src/Composition/index.ts",
    },
    {
      name: "./Core",
      path: "./src/Core/index.ts",
    },
    {
      name: "./Types",
      path: "./src/Types/index.ts",
    },
  ],
  outDir: "./npm",
  shims: {
    deno: false,
    timers: true,
  },
  test: false,
  typeCheck: "both",
  compilerOptions: {
    lib: ["ES2022"],
    target: "ES2022",
  },
  package: {
    name: "@nlozgachev/fp-lib",
    version: denoJson.version,
    description: "Simple functional programming toolkit for TypeScript",
    license: "MIT",
    sideEffects: false,
    repository: {
      type: "git",
      url: "https://github.com/nlozgachev/fp-lib",
    },
  },
  postBuild() {
    try {
      Deno.copyFileSync("README.md", "npm/README.md");
    } catch {
      // README is optional
    }

    const pkgPath = "./npm/package.json";
    const pkg = JSON.parse(Deno.readTextFileSync(pkgPath));
    delete pkg.main;
    delete pkg.module;
    Deno.writeTextFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  },
});
