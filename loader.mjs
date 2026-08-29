import { pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.match(/^[a-zA-Z]:[\\/]/)) {
    console.log(`[TrueForge Windows Patch] Fixing absolute path import: ${specifier}`);
    specifier = pathToFileURL(specifier).href;
  }
  return nextResolve(specifier, context);
}
