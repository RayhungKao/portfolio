import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * GitHub Pages has no rewrites: a deep link such as /blog/<slug> matches no file and gets 404.html.
 * Emitting 404.html as a copy of index.html loads the app there, and the app reads the path.
 */
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (index?.type !== 'asset') throw new Error('spa-404-fallback: index.html was not emitted');
      this.emitFile({ type: 'asset', fileName: '404.html', source: index.source });
    },
  };
}

export default defineConfig({
  plugins: [react(), spaFallback()],
});
