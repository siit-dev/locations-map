/** @type {import('vite').UserConfig} */
export default {
  build: {
    target: 'esnext',
    outDir: 'lib',
    lib: {
      entry: 'src/index.ts',
      name: 'LocationsMap',
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'umd'],
    },
  },
};
