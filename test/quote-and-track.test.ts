import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('Fase 4 - Módulo 2: Formulários Públicos & Acompanhamento de Solicitações', () => {
    it('deve renderizar a página de solicitar orçamento (GET /solicitar-orcamento)', async () => {
        const res = await app.request('/solicitar-orcamento');
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Solicite seu Orçamento');
        expect(html).toContain('contact_name');
        expect(html).toContain('service_id');
    });

    it('deve retornar 422 quando submeter orçamento sem campos obrigatórios via JSON', async () => {
        const res = await app.request('/solicitar-orcamento', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                contact_name: '',
                email: '',
                phone: '',
                title: '',
                description: ''
            })
        });

        expect(res.status).toBe(422);
    });

    it('deve registrar solicitação e gerar protocolo válido no formato GNDJ-YYYYMMDD-XXXX', async () => {
        const res = await app.request('/solicitar-orcamento', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                contact_name: 'Carlos Oliveira',
                company_name: 'Oliveira Corp',
                email: 'carlos@oliveira.com',
                phone: '11988887777',
                service_id: '1',
                title: 'Desenvolvimento de Novo Portal',
                description: 'Necessitamos de um portal corporativo com área restrita e catálogo de produtos.',
                estimated_budget: '15000'
            })
        });

        expect(res.status).toBe(201);
        const data = await res.json() as { ok: boolean; protocol: string; message: string };
        expect(data.ok).toBe(true);
        expect(data.protocol).toMatch(/^GNDJ-\d{8}-[A-Z0-9]{4}$/);
    });

    it('deve renderizar a página de acompanhamento de solicitação (GET /acompanhar-solicitacao)', async () => {
        const res = await app.request('/acompanhar-solicitacao');
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Acompanhar Solicitação');
        expect(html).toContain('Ex: GNDJ-20261121-AB12');
    });

    it('deve exibir aviso quando consultar protocolo inexistente', async () => {
        const res = await app.request('/acompanhar-solicitacao?protocol=GNDJ-00000000-NONE');
        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Nenhuma solicitação encontrada');
    });

    it('deve descartar bots via honeypot sobrenome_hp em POST /api/lead', async () => {
        const res = await app.request('/api/lead', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email: 'spam@bot.com',
                sobrenome_hp: 'Eu sou um bot'
            })
        });

        expect(res.status).toBe(200);
        const data = await res.json() as { ok: boolean };
        expect(data.ok).toBe(true);
    });

    it('deve registrar lead rápido válido em POST /api/lead', async () => {
        const res = await app.request('/api/lead', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                nome: 'Mariana Souza',
                email: 'mariana@empresa.com.br',
                telefone: '19999998888',
                empresa: 'Souza Advogados'
            })
        });

        expect(res.status).toBe(200);
        const data = await res.json() as { ok: boolean; message: string };
        expect(data.ok).toBe(true);
    });
});
