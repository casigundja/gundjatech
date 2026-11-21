import type { FC } from 'hono/jsx';
import { BaseLayout } from './layout';

interface BlogPostRecord {
    id: number;
    title: string;
    slug: string;
    summary: string | null;
    content?: string;
    published_at: string | null;
    author_name?: string | null;
}

export const BlogListView: FC<{ currentUser?: { name: string; role: string } | null; posts: BlogPostRecord[] }> = ({ currentUser, posts }) => {
    return (
        <BaseLayout title="Blog & Artigos Técnicos • GundjaTech" activeNav="blog" currentUser={currentUser}>
            <section style="padding: 60px 0;">
                <div class="gt-container">
                    <div style="text-align: center; max-width: 700px; margin: 0 auto 50px;">
                        <h1 style="font-size: 38px; font-weight: 800; margin-bottom: 12px;">Blog & Engenharia Digital</h1>
                        <p style="color: #E7F0F5; font-size: 16px;">
                            Artigos aprofundados sobre criação de sites, SEO técnico, cibersegurança e arquitetura de software.
                        </p>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px;">
                        {posts.map((post) => (
                            <div key={post.id} style="background: #04253a; border: 1px solid #16749A; border-radius: 12px; padding: 26px; display: flex; flex-direction: column; justify-content: space-between;">
                                <div>
                                    <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #FFFFFF;">
                                        <a href={`/blog/${post.slug}`} style="color: #FFFFFF;">{post.title}</a>
                                    </h3>
                                    <p style="font-size: 14px; color: #E7F0F5; line-height: 1.6; margin-bottom: 20px;">
                                        {post.summary || 'Leia o artigo completo para entender como aplicar em sua empresa.'}
                                    </p>
                                </div>
                                <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px; display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
                                    <span style="color: rgba(231,240,245,0.7);">{post.published_at ? new Date(post.published_at).toLocaleDateString('pt-BR') : 'Recente'}</span>
                                    <a href={`/blog/${post.slug}`} style="color: #F2C230; font-weight: 700;">Ler artigo →</a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </BaseLayout>
    );
};

export const BlogPostView: FC<{ currentUser?: { name: string; role: string } | null; post: BlogPostRecord }> = ({ currentUser, post }) => {
    return (
        <BaseLayout title={`${post.title} • GundjaTech`} activeNav="blog" currentUser={currentUser}>
            <article style="padding: 70px 0;">
                <div class="gt-container" style="max-width: 800px;">
                    <a href="/blog" style="color: #F2C230; font-size: 14px; font-weight: bold; text-decoration: none;">← Voltar ao Blog</a>
                    <h1 style="font-size: 38px; font-weight: 800; line-height: 1.25; margin: 20px 0 16px; color: #FFFFFF;">
                        {post.title}
                    </h1>
                    <div style="font-size: 14px; color: #E7F0F5; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        Publicado em {post.published_at ? new Date(post.published_at).toLocaleDateString('pt-BR') : 'Data recente'} • Por Especialistas GundjaTech
                    </div>
                    <div style="font-size: 17px; line-height: 1.8; color: #E7F0F5;" dangerouslySetInnerHTML={{ __html: post.content || post.summary || '' }} />
                </div>
            </article>
        </BaseLayout>
    );
};
