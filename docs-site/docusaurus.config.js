// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Librarian Docs',
  tagline: 'Personal Book Cataloguing & Series Tracking Application',
  favicon: 'img/favicon.ico',

  url: 'https://librarian.example.com',
  baseUrl: '/',

  organizationName: 'richarddowsett',
  projectName: 'librarian',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/richarddowsett/librarian/tree/main/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Librarian Docs',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Product Specs',
          },
          {
            href: 'https://github.com/richarddowsett/librarian',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Introduction',
                to: '/docs/intro',
              },
              {
                label: 'Product Roadmap',
                to: '/docs/product/roadmap',
              },
              {
                label: 'MVP Specs',
                to: '/docs/product/mvp-librarian',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Librarian. Built with Docusaurus.`,
      },
    }),
};

module.exports = config;
