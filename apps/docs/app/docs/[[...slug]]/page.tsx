import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createRelativeLink } from "fumadocs-ui/mdx";

import { getMDXComponents } from "@/mdx-components";
import { source } from "@/lib/source";

type PageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  return {
    title: page.data.title,
    description: page.data.description,
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  const Mdx = page.data.body;

  const toc = page.data.toc ?? [];

  return (
    <main className="ashlar-docs-page">
      <article className="ashlar-docs-article">
        <header className="ashlar-docs-header">
          <h1>{page.data.title}</h1>
          {page.data.description ? <p>{page.data.description}</p> : null}
        </header>
        <div className="prose ashlar-docs-body">
          <Mdx
            components={getMDXComponents({
              a: createRelativeLink(source, page),
            })}
          />
        </div>
      </article>
      {toc.length > 0 ? (
        <aside className="ashlar-docs-toc" aria-label="On this page">
          <p>On This Page</p>
          {toc.map((item) => (
            <a data-depth={item.depth} href={item.url} key={item.url}>
              {item.title}
            </a>
          ))}
        </aside>
      ) : null}
    </main>
  );
}
