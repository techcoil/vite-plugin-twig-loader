// file system
const { readFileSync } = require('fs');
const { extname } = require('path');
// render functions
const { retrieveOptions, configureTwig, renderTemplate } = require('./tasks');
let viteLoaderConfigured = false;

/**
 * @param {import('.').Options} options
 * @returns {import('vite').Plugin}
 */
module.exports = (options) => {

  const {
    index = null,
    filters = {},
    functions = {},
    globals = {},
    settings = {}
  } = options || retrieveOptions();

  configureTwig({ filters, functions });

  return {
    name: 'vite-plugin-twig-loader',
    transformIndexHtml: {
      enforce: 'pre',
      async transform(html) {
        return index
          ? await renderTemplate(index, { ...globals }, settings)
          : html;
      }
    },
    async load(path) {
      if (extname(path) !== '.twig') return;
      const twig = await renderTemplate(path, { ...globals }, settings);
      const input = readFileSync(path, 'utf8');
      console.log('configured vite from twig loader');
      let  configurationCode = '';
      if(!viteLoaderConfigured) {
        configurationCode =  `
        console.log('configuring vite');
        ${Object.entries(filters || {}).map(([name, filter]) => `Twig.extendFilter('${name}', ${filter.toString()});`).join('\n')}
        `;
        viteLoaderConfigured = true;
      }
      return `
        import Twig from 'twig';

        ${configurationCode}

        export const path = ${JSON.stringify(path)};
        export const ctx = ${JSON.stringify(input)};
        export const globals = ${JSON.stringify({ ...globals })};
        export const settings = ${JSON.stringify(settings)};

        export const render = (data) => Twig.twig({data: ctx}).render(data);

        export default ${JSON.stringify(twig)};
      `;
    },
    handleHotUpdate({ file, server }) {
      if (extname(file) === '.twig') {
        server.ws.send({ type: 'full-reload' })
      }
    }
  };
};
