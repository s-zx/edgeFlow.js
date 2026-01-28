/**
 * Build script for browser bundle
 */
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function build() {
  try {
    // Build browser bundle
    // onnxruntime-web is a direct dependency, marked external for bundler handling
    await esbuild.build({
      entryPoints: [join(rootDir, 'dist/index.js')],
      bundle: true,
      format: 'esm',
      outfile: join(rootDir, 'dist/edgeflow.browser.js'),
      platform: 'browser',
      target: ['es2020'],
      sourcemap: true,
      minify: false,
      external: ['onnxruntime-web'], // External: user's bundler will handle this
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      banner: {
        js: '/* edgeFlow.js - Browser Bundle */\n',
      },
    });

    // Build minified version
    await esbuild.build({
      entryPoints: [join(rootDir, 'dist/index.js')],
      bundle: true,
      format: 'esm',
      outfile: join(rootDir, 'dist/edgeflow.browser.min.js'),
      platform: 'browser',
      target: ['es2020'],
      sourcemap: true,
      minify: true,
      external: ['onnxruntime-web'],
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    });

    console.log('✓ Browser bundles created successfully');
    console.log('  - dist/edgeflow.browser.js');
    console.log('  - dist/edgeflow.browser.min.js');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
