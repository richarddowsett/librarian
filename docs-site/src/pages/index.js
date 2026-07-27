import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Personal book cataloging and series tracker">
      <main style={{ padding: '6rem 2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--ifm-color-primary)' }}>
          {siteConfig.title}
        </h1>
        <p style={{ fontSize: '1.5rem', color: 'var(--ifm-font-color-base)', marginBottom: '3rem' }}>
          {siteConfig.tagline}
        </p>
        <div>
          <Link
            className="button button--primary button--lg"
            to="/docs/intro"
            style={{ 
              padding: '1rem 3rem', 
              fontSize: '1.25rem', 
              textDecoration: 'none', 
              background: 'var(--ifm-color-primary)', 
              color: 'white', 
              borderRadius: '8px',
              fontWeight: 'bold',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
            View Documentation
          </Link>
        </div>
      </main>
    </Layout>
  );
}
