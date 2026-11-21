import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('Fase 4 - Módulo 1: Website Público & Landing Pages JSX', () => {
    it('deve renderizar a Home page (GET /) com branding oficial GundjaTech', async () => {
        const res = await app.request('/');
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Gundja');
        expect(html).toContain('Tech');
        expect(html).toContain('Criamos sites profissionais');
        expect(html).toContain('Soluções Estratégicas para o seu Negócio');
    });

    it('deve renderizar a listagem de Serviços (GET /servicos)', async () => {
        const res = await app.request('/servicos');
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Serviços');
        expect(html).toContain('Criação de Sites');
    });

    it('deve renderizar a página de Portfólio (GET /portfolio)', async () => {
        const res = await app.request('/portfolio');
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Nosso Portfólio');
        expect(html).toContain('KLASSE');
    });

    it('deve renderizar o case detalhado (GET /cases/klasse)', async () => {
        const res = await app.request('/cases/klasse');
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('KLASSE');
        expect(html).toContain('Gestão Escolar');
    });

    it('deve renderizar a página de Blog (GET /blog)', async () => {
        const res = await app.request('/blog');
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Blog');
        expect(html).toContain('Engenharia Digital');
    });

    it('deve renderizar um artigo de blog individual (GET /blog/:slug)', async () => {
        const res = await app.request('/blog/conteudo-tecnico-atraia-e-converta-clientes-com-expertise');
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Conteudo Tecnico');
    });

    it('deve renderizar a página de Contato (GET /contato)', async () => {
        const res = await app.request('/contato');
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Fale com Nossos Especialistas');
        expect(html).toContain('+55 (19) 95324-8420');
    });

    it('deve renderizar landing page Sinnapse SEO (GET /criacao-de-sites)', async () => {
        const res = await app.request('/criacao-de-sites');
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Criação de Sites Profissionais');
        expect(html).toContain('Metodologia OneFlow');
    });

    it('deve renderizar landing page regional (GET /criacao-de-sites-alphaville)', async () => {
        const res = await app.request('/criacao-de-sites-alphaville');
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Alphaville');
    });

    it('deve fornecer sitemap.xml com Content-Type XML correto', async () => {
        const res = await app.request('/sitemap.xml');
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/xml');
        const text = await res.text();
        expect(text).toContain('<urlset');
        expect(text).toContain('https://gundjatech.com/criacao-de-sites');
    });

    it('deve fornecer feed.xml com Content-Type XML correto', async () => {
        const res = await app.request('/feed.xml');
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/xml');
        const text = await res.text();
        expect(text).toContain('<rss version="2.0">');
    });
});
