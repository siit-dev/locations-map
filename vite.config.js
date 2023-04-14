/** @type {import('vite').UserConfig} */
export default {
  build: {
    target: 'esnext',
    outDir: 'dist',
    lib: {
      entry: {
        index: 'src/index.ts',
      },
      name: 'LocationsMap',
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: ['jquery'],
      output: {
        exports: 'named',
        globals: {
          jquery: 'jQuery',
        },
      },
    },
  },
};
