import { build, context } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const watch = process.argv.includes('--watch');

const entries = [
  { name: 'content', entry: 'src/extension/content.ts' },
  { name: 'background', entry: 'src/extension/background.ts' },
  { name: 'options', entry: 'src/extension/options.ts' }
];

async function copyStaticFiles() {
  await fs.mkdir(dist, { recursive: true });
  await fs.copyFile(path.join(root, 'src/extension/manifest.json'), path.join(dist, 'manifest.json'));
  await fs.copyFile(path.join(root, 'src/extension/popup.html'), path.join(dist, 'popup.html'));
  await fs.copyFile(path.join(root, 'src/extension/options.html'), path.join(dist, 'options.html'));
}

async function runBuild() {
  await copyStaticFiles();
  await build({
    absWorkingDir: root,
    entryPoints: entries.map((entry) => entry.entry),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome120'],
    outdir: dist,
    sourcemap: true,
    logLevel: 'info',
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development')
    }
  });
}

if (watch) {
  const ctx = await context({
    absWorkingDir: root,
    entryPoints: entries.map((entry) => entry.entry),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome120'],
    outdir: dist,
    sourcemap: true,
    logLevel: 'info',
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development')
    }
  });

  await copyStaticFiles();
  console.log('Watching PixelPal sources...');
  await ctx.watch();
} else {
  await runBuild();
}
