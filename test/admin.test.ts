import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { hmacSign } from '../src/lib/crypto';

const TEST_SECRET = 'test_secret_for_signing_cookies_32bytes!';

function createAdminMockEnv() {
    const data = {
        users: [
            {
                id: 1,
                name: 'Administrador Master',
                email: 'admin@gundjatech.com',
                role: 'admin',
                is_active: 1
            },
            {
                id: 2,
                name: 'Cliente Comum',
                email: 'cliente@externo.com',
                role: 'client',
                is_active: 1
            },
            {
                id: 3,
                name: 'Dev Gundja',
                email: 'dev@gundjatech.com',
                role: 'developer',
                is_active: 1
            }
        ],
        clients: [
            {
                id: 1,
                name: 'Carlos Oliveira',
                company: 'TechCorp Brasil',
                email: 'carlos@techcorp.com.br',
                phone: '(11) 98888-7777',
                status: 'active',
                created_at: '2026-11-20 12:00:00'
            }
        ],
        service_requests: [
            {
                id: 1,
                protocol: 'GNDJ-20261121-0001',
                client_id: 1,
                name: 'Carlos Oliveira',
                company: 'TechCorp Brasil',
                email: 'carlos@techcorp.com.br',
                phone: '(11) 98888-7777',
                service_title: 'Portal Fullstack Cloudflare Workers',
                briefing: 'Migração completa de sistema com alta velocidade',
                status: 'new',
                created_at: '2026-11-21 10:00:00'
            }
        ],
        service_request_history: [] as any[],
        projects: [
            {
                id: 1,
                client_id: 1,
                title: 'Website Corporativo TechCorp',
                description: 'Novo site institucional',
                status: 'in_progress',
                progress_percentage: 60,
                start_date: '2026-11-01',
                expected_end_date: '2026-12-15',
                created_at: '2026-11-01 10:00:00'
            }
        ],
        project_stages: [
            {
                id: 1,
                project_id: 1,
                title: 'Arquitetura Edge & D1 Schema',
                status: 'completed',
                sort_order: 1,
                created_at: '2026-11-02 10:00:00'
            }
        ],
        project_attachments: [
            {
                id: 1,
                project_id: 1,
                file_name: 'briefing-tecnico.pdf',
                file_path: '/uploads/briefing-tecnico.pdf',
                created_at: '2026-11-02 11:00:00'
            }
        ],
        financial_transactions: [
            {
                id: 1,
                client_id: 1,
                type: 'income',
                category: 'contract',
                description: 'Parcela 01/03 - Desenvolvimento Web Edge',
                amount: 5000,
                status: 'pending',
                due_date: '2026-11-30',
                payment_method: 'PIX',
                invoice_number: 'NF-2026-01',
                created_at: '2026-11-01 10:00:00'
            }
        ],
        domains: [
            {
                id: 1,
                client_id: 1,
                domain_name: 'techcorp.com.br',
                registrar: 'Registro.br',
                expires_at: '2027-05-10',
                auto_renew: 1,
                status: 'active',
                dns_provider: 'Cloudflare Edge',
                created_at: '2026-11-01 10:00:00'
            }
        ],
        advertising_campaigns: [
            {
                id: 1,
                client_id: 1,
                name: 'Google Ads Search SP 2026',
                platform: 'google_ads',
                budget: 4000,
                spent_amount: 1500,
                status: 'active',
                start_date: '2026-11-01',
                created_at: '2026-11-01 10:00:00'
            }
        ],
        quotations: [
            {
                id: 1,
                client_id: 1,
                total_amount: 15000,
                status: 'approved',
                created_at: '2026-11-05 10:00:00'
            }
        ],
        services: [
            {
                id: 1,
                title: 'Desenvolvimento Web Enterprise',
                slug: 'desenvolvimento-web-enterprise',
                category: 'sites',
                price: 12000,
                summary: 'Sites modernos com tecnologia edge',
                is_active: 1,
                is_featured: 1,
                order_position: 1,
                created_at: '2026-11-01 10:00:00'
            }
        ],
        conversations: [
            {
                id: 1,
                session_id: 'conv_session_1',
                visitor_name: 'Lead Qualificado',
                visitor_company: 'Inovação Ltda',
                visitor_email: 'contato@inovacao.com',
                visitor_objective: 'Contratar portal sob medida',
                status: 'open',
                ai_enabled: 1,
                crm_stage: 'qualification',
                lead_score: 85,
                last_message_at: '2026-11-21 10:30:00',
                created_at: '2026-11-21 10:00:00'
            }
        ],
        conversation_messages: [
            {
                id: 1,
                conversation_id: 1,
                sender_type: 'visitor',
                message: 'Preciso de um sistema veloz para minha empresa.',
                is_ai: 0,
                created_at: '2026-11-21 10:05:00'
            }
        ],
        sessions: [
            {
                id: 'sess_admin_1',
                user_id: 1,
                payload: JSON.stringify({
                    id: 1,
                    name: 'Administrador Master',
                    email: 'admin@gundjatech.com',
                    role: 'admin',
                    is_active: 1
                }),
                last_activity: Math.floor(Date.now() / 1000)
            },
            {
                id: 'sess_client_2',
                user_id: 2,
                payload: JSON.stringify({
                    id: 2,
                    name: 'Cliente Comum',
                    email: 'cliente@externo.com',
                    role: 'client',
                    is_active: 1
                }),
                last_activity: Math.floor(Date.now() / 1000)
            }
        ]
    };

    const mockDb = {
        prepare: (query: string) => {
            return {
                bind: (...params: any[]) => {
                    return {
                        first: async <T>(): Promise<T | null> => {
                            const q = query.toLowerCase();
                            if (q.includes('from sessions where id =')) {
                                const s = data.sessions.find(x => x.id === params[0]);
                                return (s || null) as unknown as T;
                            }
                            if (q.includes('from users where id =')) {
                                const u = data.users.find(x => x.id === params[0]);
                                return (u || null) as unknown as T;
                            }
                            if (q.includes('from users where lower(email) =')) {
                                const u = data.users.find(x => x.email.toLowerCase() === String(params[0]).toLowerCase());
                                return (u || null) as unknown as T;
                            }
                            if (q.includes('from clients where lower(email) =')) {
                                const c = data.clients.find(x => x.email.toLowerCase() === String(params[0]).toLowerCase());
                                return (c || null) as unknown as T;
                            }
                            if (q.includes('from service_requests where id =')) {
                                const r = data.service_requests.find(x => x.id === Number(params[0]));
                                return (r || null) as unknown as T;
                            }
                            if (q.includes('from quotations where service_request_id =')) {
                                const quo = (data.quotations as any[]).find(x => Number(x.service_request_id) === Number(params[0]));
                                return (quo || null) as unknown as T;
                            }
                            if (q.includes('from quotations') && q.includes('where q.id =') || q.includes('from quotations where id =')) {
                                const quo = (data.quotations as any[]).find(x => Number(x.id) === Number(params[0]));
                                return (quo || null) as unknown as T;
                            }
                            if (q.includes('from projects') && q.includes('where p.id =')) {
                                const p = data.projects.find(x => x.id === Number(params[0]));
                                if (!p) return null;
                                const c = data.clients.find(x => x.id === p.client_id);
                                return { ...p, client_name: c?.name, company: c?.company, client_email: c?.email } as unknown as T;
                            }
                            if (q.includes('from project_stages where id =')) {
                                const st = data.project_stages.find(x => x.id === Number(params[0]));
                                return (st || null) as unknown as T;
                            }
                            if (q.includes('from conversations where id =')) {
                                const c = data.conversations.find(x => x.id === Number(params[0]));
                                return (c || null) as unknown as T;
                            }
                            return null;
                        },
                        all: async <T>(): Promise<{ results: T[] }> => {
                            const q = query.toLowerCase();
                            if (q.includes('from clients')) {
                                return { results: data.clients as unknown as T[] };
                            }
                            if (q.includes('from service_requests')) {
                                return { results: data.service_requests as unknown as T[] };
                            }
                            if (q.includes('from service_request_history')) {
                                return { results: data.service_request_history as unknown as T[] };
                            }
                            if (q.includes('from projects')) {
                                const mapped = data.projects.map(p => {
                                    const c = data.clients.find(x => x.id === p.client_id);
                                    return { ...p, client_name: c?.name, company: c?.company };
                                });
                                return { results: mapped as unknown as T[] };
                            }
                            if (q.includes('from project_stages where project_id =')) {
                                return { results: data.project_stages.filter(x => x.project_id === Number(params[0])) as unknown as T[] };
                            }
                            if (q.includes('from project_attachments where project_id =')) {
                                return { results: data.project_attachments.filter(x => x.project_id === Number(params[0])) as unknown as T[] };
                            }
                            if (q.includes('from financial_transactions')) {
                                const mapped = data.financial_transactions.map(t => {
                                    const c = data.clients.find(x => x.id === t.client_id);
                                    return { ...t, client_name: c?.name, company: c?.company, client_email: c?.email };
                                });
                                return { results: mapped as unknown as T[] };
                            }
                            if (q.includes('from domains')) {
                                const mapped = data.domains.map(d => {
                                    const c = data.clients.find(x => x.id === d.client_id);
                                    return { ...d, client_name: c?.name, company: c?.company, client_email: c?.email };
                                });
                                return { results: mapped as unknown as T[] };
                            }
                            if (q.includes('from advertising_campaigns')) {
                                const mapped = data.advertising_campaigns.map(a => {
                                    const c = data.clients.find(x => x.id === a.client_id);
                                    return { ...a, client_name: c?.name, company: c?.company };
                                });
                                return { results: mapped as unknown as T[] };
                            }
                            if (q.includes('from services')) {
                                return { results: data.services as unknown as T[] };
                            }
                            if (q.includes('from users')) {
                                return { results: data.users as unknown as T[] };
                            }
                            if (q.includes('from conversations')) {
                                return { results: data.conversations as unknown as T[] };
                            }
                            if (q.includes('from conversation_messages')) {
                                return { results: data.conversation_messages.filter(x => x.conversation_id === Number(params[0])) as unknown as T[] };
                            }
                            return { results: [] };
                        },
                        run: async () => {
                            const q = query.toLowerCase();
                            if (q.includes('insert into clients')) {
                                const newId = data.clients.length + 1;
                                data.clients.push({
                                    id: newId,
                                    name: params[0],
                                    company: params[1],
                                    email: params[3],
                                    phone: params[4],
                                    status: params[7] || 'lead',
                                    created_at: new Date().toISOString()
                                });
                                return { success: true, meta: { last_row_id: newId } };
                            }
                            if (q.includes('delete from clients where id =')) {
                                const idx = data.clients.findIndex(x => x.id === Number(params[0]));
                                if (idx !== -1) data.clients.splice(idx, 1);
                                return { success: true };
                            }
                            if (q.includes("update service_requests set status = 'cancelled'")) {
                                const req = data.service_requests.find(x => x.id === Number(params[0]));
                                if (req) req.status = 'cancelled';
                                return { success: true };
                            }
                            if (q.includes("update service_requests set status = 'in_progress'")) {
                                const req = data.service_requests.find(x => x.id === Number(params[1] ?? params[0]));
                                if (req) req.status = 'in_progress';
                                return { success: true };
                            }
                            if (q.includes('update service_requests set status =')) {
                                const req = data.service_requests.find(x => x.id === Number(params[1]));
                                if (req) req.status = params[0];
                                return { success: true };
                            }
                            if (q.includes('insert into quotations')) {
                                const qId = data.quotations.length + 1;
                                (data.quotations as any[]).push({
                                    id: qId,
                                    reference_code: params[0],
                                    client_id: Number(params[1]),
                                    service_request_id: Number(params[2]),
                                    title: params[3],
                                    total_amount: Number(params[4] || 0),
                                    final_amount: Number(params[5] || 0),
                                    status: query.toLowerCase().includes("'sent'") ? 'sent' : 'draft',
                                    created_at: new Date().toISOString()
                                });
                                return { success: true, meta: { last_row_id: qId } };
                            }
                            if (q.includes('update quotations set status =')) {
                                const targetId = Number(params[params.length - 1]);
                                const quo = (data.quotations as any[]).find(x => Number(x.id) === targetId);
                                if (quo) {
                                    quo.status = q.includes("'approved'") ? 'approved' : q.includes("'sent'") ? 'sent' : params[0];
                                }
                                return { success: true };
                            }
                            if (q.includes('insert into service_request_history')) {
                                data.service_request_history.push({
                                    id: data.service_request_history.length + 1,
                                    service_request_id: params[0],
                                    user_id: params[1],
                                    action: params[2],
                                    notes: params[5],
                                    created_at: new Date().toISOString()
                                });
                                return { success: true };
                            }
                            if (q.includes('insert into projects')) {
                                const pId = data.projects.length + 1;
                                data.projects.push({
                                    id: pId,
                                    client_id: params[0],
                                    title: params[1],
                                    slug: params[2],
                                    description: params[3],
                                    status: 'planning',
                                    progress_percentage: 0,
                                    start_date: params[4] || '2026-11-21',
                                    expected_end_date: params[5] || null,
                                    created_at: new Date().toISOString()
                                });
                                return { success: true, meta: { last_row_id: pId } };
                            }
                            if (q.includes('update projects')) {
                                const p = data.projects.find(x => x.id === Number(params[4]));
                                if (p) {
                                    p.status = params[0];
                                    p.progress_percentage = Number(params[1]);
                                    p.start_date = params[2];
                                    p.expected_end_date = params[3];
                                }
                                return { success: true };
                            }
                            if (q.includes('insert into project_stages')) {
                                const sId = data.project_stages.length + 1;
                                data.project_stages.push({
                                    id: sId,
                                    project_id: Number(params[0]),
                                    title: params[1],
                                    status: 'pending',
                                    sort_order: 0,
                                    created_at: new Date().toISOString()
                                });
                                return { success: true, meta: { last_row_id: sId } };
                            }
                            if (q.includes('update project_stages')) {
                                const st = data.project_stages.find(x => x.id === Number(params[2]));
                                if (st) st.status = params[0];
                                return { success: true };
                            }
                            if (q.includes('insert into financial_transactions')) {
                                const tId = data.financial_transactions.length + 1;
                                data.financial_transactions.push({
                                    id: tId,
                                    client_id: Number(params[0]),
                                    type: 'income',
                                    category: 'contract',
                                    description: params[1],
                                    amount: Number(params[2]),
                                    status: q.includes("'paid'") ? 'paid' : 'pending',
                                    due_date: params[3],
                                    payment_method: params[4],
                                    invoice_number: params[5],
                                    created_at: new Date().toISOString()
                                });
                                return { success: true, meta: { last_row_id: tId } };
                            }
                            if (q.includes("update financial_transactions set status = 'paid'")) {
                                const t = data.financial_transactions.find(x => x.id === Number(params[0]));
                                if (t) t.status = 'paid';
                                return { success: true };
                            }
                            if (q.includes("update financial_transactions set status = 'canceled'")) {
                                const t = data.financial_transactions.find(x => x.id === Number(params[0]));
                                if (t) t.status = 'canceled';
                                return { success: true };
                            }
                            if (q.includes('insert into domains')) {
                                const dId = data.domains.length + 1;
                                data.domains.push({
                                    id: dId,
                                    client_id: Number(params[0]),
                                    domain_name: params[1],
                                    registrar: params[2],
                                    expires_at: params[3],
                                    auto_renew: params[4],
                                    status: 'active',
                                    created_at: new Date().toISOString()
                                });
                                return { success: true, meta: { last_row_id: dId } };
                            }
                            if (q.includes('delete from domains where id =')) {
                                const idx = data.domains.findIndex(x => x.id === Number(params[0]));
                                if (idx !== -1) data.domains.splice(idx, 1);
                                return { success: true };
                            }
                            if (q.includes('insert into advertising_campaigns')) {
                                const cId = data.advertising_campaigns.length + 1;
                                data.advertising_campaigns.push({
                                    id: cId,
                                    client_id: Number(params[0]),
                                    name: params[1],
                                    platform: params[2],
                                    budget: Number(params[3]),
                                    spent_amount: 0,
                                    status: 'active',
                                    created_at: new Date().toISOString()
                                });
                                return { success: true, meta: { last_row_id: cId } };
                            }
                            if (q.includes('update advertising_campaigns')) {
                                const ac = data.advertising_campaigns.find(x => x.id === Number(params[0]));
                                if (ac) ac.status = ac.status === 'active' ? 'paused' : 'active';
                                return { success: true };
                            }
                            if (q.includes('insert into services')) {
                                const sId = data.services.length + 1;
                                data.services.push({
                                    id: sId,
                                    title: params[0],
                                    slug: params[1],
                                    category: params[2],
                                    price: params[3],
                                    summary: params[4],
                                    is_active: params[6],
                                    created_at: new Date().toISOString()
                                });
                                return { success: true, meta: { last_row_id: sId } };
                            }
                            if (q.includes('update services set is_active =')) {
                                const s = data.services.find(x => x.id === Number(params[0]));
                                if (s) s.is_active = s.is_active === 1 ? 0 : 1;
                                return { success: true };
                            }
                            if (q.includes('insert into users')) {
                                const uId = data.users.length + 1;
                                data.users.push({
                                    id: uId,
                                    name: params[0],
                                    email: params[1],
                                    phone: params[2],
                                    role: params[3],
                                    company: params[4],
                                    is_active: 1
                                });
                                return { success: true, meta: { last_row_id: uId } };
                            }
                            if (q.includes('update users set is_active =')) {
                                const u = data.users.find(x => x.id === Number(params[1]));
                                if (u) u.is_active = Number(params[0]);
                                return { success: true };
                            }
                            if (q.includes('insert into conversation_messages')) {
                                const mId = data.conversation_messages.length + 1;
                                data.conversation_messages.push({
                                    id: mId,
                                    conversation_id: Number(params[0]),
                                    sender_type: 'staff',
                                    sender_id: params[1],
                                    message: params[2],
                                    is_ai: 0,
                                    created_at: new Date().toISOString()
                                });
                                return { success: true, meta: { last_row_id: mId } };
                            }
                            if (q.includes('update conversations set ai_enabled =')) {
                                const c = data.conversations.find(x => x.id === Number(params[0]));
                                if (c) c.ai_enabled = c.ai_enabled === 1 ? 0 : 1;
                                return { success: true };
                            }
                            if (q.includes("update conversations set status = 'closed'")) {
                                const c = data.conversations.find(x => x.id === Number(params[0]));
                                if (c) c.status = 'closed';
                                return { success: true };
                            }
                            if (q.includes("update conversations set status = 'open'")) {
                                const c = data.conversations.find(x => x.id === Number(params[0]));
                                if (c) c.status = 'open';
                                return { success: true };
                            }
                            if (q.includes('update conversations set last_message_at =')) {
                                return { success: true };
                            }
                            return { success: true };
                        }
                    };
                },
                first: async <T>(): Promise<T | null> => {
                    const q = query.toLowerCase();
                    if (q.includes('count(*) as total') && q.includes('from clients')) {
                        return {
                            total: data.clients.length,
                            active: data.clients.filter(x => x.status === 'active').length,
                            leads: data.clients.filter(x => x.status === 'lead').length
                        } as unknown as T;
                    }
                    if (q.includes('count(*) as total') && q.includes('from service_requests')) {
                        return {
                            total: data.service_requests.length,
                            pending: data.service_requests.filter(x => x.status === 'new').length
                        } as unknown as T;
                    }
                    if (q.includes('count(*) as total') && q.includes('from projects')) {
                        return {
                            total: data.projects.length,
                            active: data.projects.filter(x => x.status === 'in_progress').length
                        } as unknown as T;
                    }
                    if (q.includes('count(*) as total') && q.includes('from quotations')) {
                        return {
                            total: data.quotations.length,
                            approved: data.quotations.filter(x => x.status === 'approved').length
                        } as unknown as T;
                    }
                    if (q.includes('sum(amount) as val from financial_transactions')) {
                        let sum = 0;
                        if (q.includes("status = 'paid'")) {
                            sum = data.financial_transactions.filter(x => x.status === 'paid').reduce((a, b) => a + b.amount, 0);
                        } else if (q.includes("status = 'pending'") && q.includes("due_date < date('now')")) {
                            sum = 0;
                        } else if (q.includes("status = 'pending'")) {
                            sum = data.financial_transactions.filter(x => x.status === 'pending').reduce((a, b) => a + b.amount, 0);
                        } else {
                            sum = data.financial_transactions.filter(x => x.status !== 'canceled').reduce((a, b) => a + b.amount, 0);
                        }
                        return { val: sum } as unknown as T;
                    }
                    if (q.includes('sum(budget) as total_budget')) {
                        const total_budget = data.advertising_campaigns.reduce((a, b) => a + (b.budget || 0), 0);
                        const total_spent = data.advertising_campaigns.reduce((a, b) => a + (b.spent_amount || 0), 0);
                        return { total_budget, total_spent } as unknown as T;
                    }
                    return null;
                },
                all: async <T>(): Promise<{ results: T[] }> => {
                    const q = query.toLowerCase();
                    if (q.includes('from clients')) {
                        return { results: data.clients as unknown as T[] };
                    }
                    if (q.includes('from service_requests')) {
                        return { results: data.service_requests as unknown as T[] };
                    }
                    if (q.includes('from projects')) {
                        const mapped = data.projects.map(p => {
                            const c = data.clients.find(x => x.id === p.client_id);
                            return { ...p, client_name: c?.name, company: c?.company };
                        });
                        return { results: mapped as unknown as T[] };
                    }
                    if (q.includes('from financial_transactions')) {
                        const mapped = data.financial_transactions.map(t => {
                            const c = data.clients.find(x => x.id === t.client_id);
                            return { ...t, client_name: c?.name, company: c?.company, client_email: c?.email };
                        });
                        return { results: mapped as unknown as T[] };
                    }
                    if (q.includes('from domains')) {
                        const mapped = data.domains.map(d => {
                            const c = data.clients.find(x => x.id === d.client_id);
                            return { ...d, client_name: c?.name, company: c?.company, client_email: c?.email };
                        });
                        return { results: mapped as unknown as T[] };
                    }
                    if (q.includes('from advertising_campaigns')) {
                        const mapped = data.advertising_campaigns.map(a => {
                            const c = data.clients.find(x => x.id === a.client_id);
                            return { ...a, client_name: c?.name, company: c?.company };
                        });
                        return { results: mapped as unknown as T[] };
                    }
                    if (q.includes('from services')) {
                        return { results: data.services as unknown as T[] };
                    }
                    if (q.includes('from users')) {
                        return { results: data.users as unknown as T[] };
                    }
                    if (q.includes('from conversations')) {
                        return { results: data.conversations as unknown as T[] };
                    }
                    return { results: [] };
                }
            };
        }
    };

    return {
        env: {
            DB: mockDb as any,
            SESSION_SECRET: TEST_SECRET,
            APP_SECRET: TEST_SECRET,
            APP_NAME: 'GundjaTech',
            APP_URL: 'http://localhost'
        },
        data
    };
}

async function makeSignedCookie(sessionId: string): Promise<string> {
    const sig = await hmacSign(sessionId, TEST_SECRET);
    return `gt_session=${sessionId}.${sig}`;
}

describe('Fase 4 • Módulo 5 & 6: Painel Administrativo Core & Avançado (/admin/*)', () => {
    it('1. Bloqueia visitante anônimo em /admin/dashboard e redireciona para login', async () => {
        const { env } = createAdminMockEnv();
        const res = await app.request('/admin/dashboard', {
            method: 'GET'
        }, env);

        expect(res.status).toBe(302);
        expect(res.headers.get('Location')).toBe('/login');
    });

    it('2. Bloqueia usuário com papel "client" de acessar /admin/dashboard e redireciona para portal', async () => {
        const { env } = createAdminMockEnv();
        const clientCookie = await makeSignedCookie('sess_client_2');

        const res = await app.request('/admin/dashboard', {
            method: 'GET',
            headers: {
                'Cookie': clientCookie
            }
        }, env);

        expect(res.status).toBe(302);
        expect(res.headers.get('Location')).toBe('/portal/dashboard');
    });

    it('3. Permite acesso de Administrador ao Dashboard com métricas executivas', async () => {
        const { env } = createAdminMockEnv();
        const adminCookie = await makeSignedCookie('sess_admin_1');

        const res = await app.request('/admin/dashboard', {
            method: 'GET',
            headers: {
                'Cookie': adminCookie
            }
        }, env);

        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Dashboard Executivo');
        expect(html).toContain('Gundja');
        expect(html).toContain('Tech');
        expect(html).toContain('Administrador Master');
    });

    it('4. Lista e cadastra novos clientes no CRM Administrativo', async () => {
        const { env, data } = createAdminMockEnv();
        const adminCookie = await makeSignedCookie('sess_admin_1');

        // GET Clientes
        const getRes = await app.request('/admin/clientes', {
            method: 'GET',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(getRes.status).toBe(200);
        const getHtml = await getRes.text();
        expect(getHtml).toContain('TechCorp Brasil');

        // POST Novo Cliente
        const postRes = await app.request('/admin/clientes', {
            method: 'POST',
            headers: {
                'Cookie': adminCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'name=Novo+Parceiro&email=contato@parceiro.com&company=Grupo+Parceiro&status=active'
        }, env);

        expect(postRes.status).toBe(302);
        expect(postRes.headers.get('Location')).toContain('/admin/clientes?success=');
        expect(data.clients.some(c => c.email === 'contato@parceiro.com')).toBe(true);
    });

    it('5. Pipeline de solicitações: exige orçamento antes de iniciar e cria projeto automaticamente ao aprovar orçamento', async () => {
        const { env, data } = createAdminMockEnv();
        const adminCookie = await makeSignedCookie('sess_admin_1');

        // GET Detalhe da solicitação
        const detailRes = await app.request('/admin/solicitacoes/1', {
            method: 'GET',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(detailRes.status).toBe(200);
        const detailHtml = await detailRes.text();
        expect(detailHtml).toContain('GNDJ-20261121-0001');
        expect(detailHtml).toContain('Elaborar Orçamento');

        // POST Atualização de Status para Em Análise
        const statusRes = await app.request('/admin/solicitacoes/1/status', {
            method: 'POST',
            headers: {
                'Cookie': adminCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'status=analyzing&notes=Em+analise+pela+engenharia'
        }, env);
        expect(statusRes.status).toBe(302);
        expect(data.service_requests[0].status).toBe('analyzing');
        expect(data.service_request_history.length).toBeGreaterThan(0);

        // Tentativa de converter em projeto ANTES de aprovar orçamento deve ser bloqueada
        const prematureConvertRes = await app.request('/admin/solicitacoes/1/converter', {
            method: 'POST',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(prematureConvertRes.status).toBe(302);
        expect(prematureConvertRes.headers.get('Location')).toContain('error=');
        expect(data.projects.length).toBe(1);

        // Elabora / envia o orçamento da solicitação
        const quoteSentRes = await app.request('/admin/solicitacoes/1/status', {
            method: 'POST',
            headers: {
                'Cookie': adminCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'status=quotation_sent&notes=Proposta+comercial+enviada'
        }, env);
        expect(quoteSentRes.status).toBe(302);
        expect(data.service_requests[0].status).toBe('quotation_sent');

        // Aprovação do orçamento cria automaticamente o Projeto e move a solicitação para Em Execução (in_progress)
        const approveRes = await app.request('/admin/solicitacoes/1/status', {
            method: 'POST',
            headers: {
                'Cookie': adminCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'status=approved&notes=Orçamento+aprovado+pelo+cliente'
        }, env);
        expect(approveRes.status).toBe(302);
        expect(approveRes.headers.get('Location')).toContain('success=');
        expect(data.service_requests[0].status).toBe('in_progress');
        expect(data.projects.length).toBe(2);

        // Conclusão do projeto lança automaticamente a receita liquidada em Receita & Caixa
        const initialTxCount = data.financial_transactions.length;
        const completeRes = await app.request('/admin/solicitacoes/1/status', {
            method: 'POST',
            headers: {
                'Cookie': adminCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'status=completed&notes=Projeto+entregue+e+homologado'
        }, env);
        expect(completeRes.status).toBe(302);
        expect(data.service_requests[0].status).toBe('completed');
        expect(data.financial_transactions.length).toBe(initialTxCount + 1);
        const autoRevenueTx = data.financial_transactions[data.financial_transactions.length - 1];
        expect(autoRevenueTx.type).toBe('income');
        expect(autoRevenueTx.status).toBe('paid');
    });

    it('6. Catálogo de serviços: cadastro de pacote e toggle de status', async () => {
        const { env, data } = createAdminMockEnv();
        const adminCookie = await makeSignedCookie('sess_admin_1');

        // GET Serviços
        const getRes = await app.request('/admin/servicos', {
            method: 'GET',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(getRes.status).toBe(200);

        // POST Novo Serviço
        const postRes = await app.request('/admin/servicos', {
            method: 'POST',
            headers: {
                'Cookie': adminCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'title=Cloudflare+Edge+Migration&category=infra&price=9500&summary=Migracao+serverless&is_active=1'
        }, env);
        expect(postRes.status).toBe(302);
        expect(data.services.some(s => s.title === 'Cloudflare Edge Migration')).toBe(true);

        // POST Toggle Status
        const toggleRes = await app.request('/admin/servicos/1/toggle', {
            method: 'POST',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(toggleRes.status).toBe(302);
        expect(data.services[0].is_active).toBe(0);
    });

    it('7. Gestão de equipe & usuários: listagem, criação e alteração de status', async () => {
        const { env, data } = createAdminMockEnv();
        const adminCookie = await makeSignedCookie('sess_admin_1');

        // GET Usuários
        const getRes = await app.request('/admin/usuarios', {
            method: 'GET',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(getRes.status).toBe(200);
        const html = await getRes.text();
        expect(html).toContain('Equipe, Colaboradores');

        // POST Criar Usuário
        const postRes = await app.request('/admin/usuarios', {
            method: 'POST',
            headers: {
                'Cookie': adminCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'name=Novo+Engenheiro&email=engenheiro@gundjatech.com&role=developer&password=senhaForte123@'
        }, env);
        expect(postRes.status).toBe(302);
        expect(data.users.some(u => u.email === 'engenheiro@gundjatech.com')).toBe(true);

        // POST Alterar status de usuário
        const statusRes = await app.request('/admin/usuarios/3/status', {
            method: 'POST',
            headers: {
                'Cookie': adminCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'is_active=0'
        }, env);
        expect(statusRes.status).toBe(302);
        expect(data.users.find(u => u.id === 3)?.is_active).toBe(0);
    });

    it('8. Central de atendimento CRM: listagem, resposta humana e toggle da IA autônoma', async () => {
        const { env, data } = createAdminMockEnv();
        const adminCookie = await makeSignedCookie('sess_admin_1');

        // GET Atendimento
        const getRes = await app.request('/admin/atendimento', {
            method: 'GET',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(getRes.status).toBe(200);
        const html = await getRes.text();
        expect(html).toContain('Inbox de Atendimento');
        expect(html).toContain('Lead Qualificado');

        // POST Enviar resposta de staff
        const msgRes = await app.request('/admin/atendimento/1/mensagem', {
            method: 'POST',
            headers: {
                'Cookie': adminCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'message=Ola!+Sou+o+administrador+e+posso+te+ajudar.'
        }, env);
        expect(msgRes.status).toBe(302);
        expect(data.conversation_messages.some(m => m.sender_type === 'staff')).toBe(true);

        // POST Toggle IA
        const toggleAiRes = await app.request('/admin/atendimento/1/toggle-ai', {
            method: 'POST',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(toggleAiRes.status).toBe(302);
        expect(data.conversations[0].ai_enabled).toBe(0);

        // POST Fechar conversa
        const closeRes = await app.request('/admin/atendimento/1/fechar', {
            method: 'POST',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(closeRes.status).toBe(302);
        expect(data.conversations[0].status).toBe('closed');
    });

    // ========================================================
    // NOVOS TESTES: MÓDULO 6 (PAINEL ADMINISTRATIVO AVANÇADO)
    // ========================================================
    it('9. Gestão de Projetos: listagem, criação, atualização de progresso e etapas', async () => {
        const { env, data } = createAdminMockEnv();
        const adminCookie = await makeSignedCookie('sess_admin_1');

        // GET Projetos
        const getRes = await app.request('/admin/projetos', {
            method: 'GET',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(getRes.status).toBe(200);
        const getHtml = await getRes.text();
        expect(getHtml).toContain('Website Corporativo TechCorp');

        // POST Novo Projeto
        const postRes = await app.request('/admin/projetos', {
            method: 'POST',
            headers: {
                'Cookie': adminCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'client_id=1&title=SaaS+Enterprise+Gundja&description=Plataforma+distribuida&start_date=2026-11-25'
        }, env);
        expect(postRes.status).toBe(302);
        expect(postRes.headers.get('Location')).toContain('/admin/projetos?success=');
        expect(data.projects.some(p => p.title === 'SaaS Enterprise Gundja')).toBe(true);

        // GET Detalhe do Projeto
        const detailRes = await app.request('/admin/projetos/1', {
            method: 'GET',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(detailRes.status).toBe(200);
        const detailHtml = await detailRes.text();
        expect(detailHtml).toContain('Arquitetura Edge &amp; D1 Schema');

        // POST Atualizar Projeto
        const updateRes = await app.request('/admin/projetos/1', {
            method: 'POST',
            headers: {
                'Cookie': adminCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'status=reviewing&progress_percentage=85&start_date=2026-11-01'
        }, env);
        expect(updateRes.status).toBe(302);
        expect(data.projects[0].status).toBe('reviewing');
        expect(data.projects[0].progress_percentage).toBe(85);

        // POST Adicionar Etapa
        const stageRes = await app.request('/admin/projetos/1/etapas', {
            method: 'POST',
            headers: {
                'Cookie': adminCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'title=Deploy+Serverless+no+Edge'
        }, env);
        expect(stageRes.status).toBe(302);
        expect(data.project_stages.some(s => s.title === 'Deploy Serverless no Edge')).toBe(true);

        // POST Toggle Etapa
        const toggleStageRes = await app.request('/admin/projetos/1/etapas/1/toggle', {
            method: 'POST',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(toggleStageRes.status).toBe(302);
        expect(data.project_stages[0].status).toBe('pending');
    });

    it('10. Finanças & Faturamento: listagem, lançamento, liquidação e cancelamento de faturas', async () => {
        const { env, data } = createAdminMockEnv();
        const adminCookie = await makeSignedCookie('sess_admin_1');

        // GET Financeiro
        const getRes = await app.request('/admin/financeiro', {
            method: 'GET',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(getRes.status).toBe(200);
        const getHtml = await getRes.text();
        expect(getHtml).toContain('Gestão Financeira &amp; Faturamento');
        expect(getHtml).toContain('Parcela 01/03');

        // POST Nova Fatura
        const postRes = await app.request('/admin/financeiro', {
            method: 'POST',
            headers: {
                'Cookie': adminCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'client_id=1&description=Manutencao+Mensal+Cloudflare&amount=1200&due_date=2026-12-10&payment_method=PIX'
        }, env);
        expect(postRes.status).toBe(302);
        expect(postRes.headers.get('Location')).toContain('success=');
        expect(data.financial_transactions.some(t => t.description === 'Manutencao Mensal Cloudflare')).toBe(true);

        // POST Liquidar Fatura
        const payRes = await app.request('/admin/financeiro/1/pagar', {
            method: 'POST',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(payRes.status).toBe(302);
        expect(data.financial_transactions[0].status).toBe('paid');

        // POST Cancelar Fatura
        const cancelRes = await app.request('/admin/financeiro/2/cancelar', {
            method: 'POST',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(cancelRes.status).toBe(302);
        expect(data.financial_transactions[1].status).toBe('canceled');
    });

    it('11. Domínios & DNS: listagem, cadastro e remoção de domínio gerenciado', async () => {
        const { env, data } = createAdminMockEnv();
        const adminCookie = await makeSignedCookie('sess_admin_1');

        // GET Domínios
        const getRes = await app.request('/admin/dominios', {
            method: 'GET',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(getRes.status).toBe(200);
        const getHtml = await getRes.text();
        expect(getHtml).toContain('techcorp.com.br');

        // POST Novo Domínio
        const postRes = await app.request('/admin/dominios', {
            method: 'POST',
            headers: {
                'Cookie': adminCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'client_id=1&domain_name=portalnovo.com.br&registrar=Cloudflare&expires_at=2028-01-01&auto_renew=1'
        }, env);
        expect(postRes.status).toBe(302);
        expect(postRes.headers.get('Location')).toContain('success=');
        expect(data.domains.some(d => d.domain_name === 'portalnovo.com.br')).toBe(true);

        // POST Excluir Domínio
        const delRes = await app.request('/admin/dominios/1/excluir', {
            method: 'POST',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(delRes.status).toBe(302);
        expect(data.domains.some(d => d.id === 1)).toBe(false);
    });

    it('12. Campanhas de Mídia: listagem, cadastro e alternância de status ativa/pausada', async () => {
        const { env, data } = createAdminMockEnv();
        const adminCookie = await makeSignedCookie('sess_admin_1');

        // GET Campanhas
        const getRes = await app.request('/admin/campanhas', {
            method: 'GET',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(getRes.status).toBe(200);
        const getHtml = await getRes.text();
        expect(getHtml).toContain('Google Ads Search SP 2026');

        // POST Nova Campanha
        const postRes = await app.request('/admin/campanhas', {
            method: 'POST',
            headers: {
                'Cookie': adminCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'client_id=1&name=Meta+Ads+Remarketing&platform=meta_ads&budget=2500'
        }, env);
        expect(postRes.status).toBe(302);
        expect(postRes.headers.get('Location')).toContain('success=');
        expect(data.advertising_campaigns.some(a => a.name === 'Meta Ads Remarketing')).toBe(true);

        // POST Toggle Status
        const toggleRes = await app.request('/admin/campanhas/1/toggle', {
            method: 'POST',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(toggleRes.status).toBe(302);
        expect(data.advertising_campaigns[0].status).toBe('paused');
    });

    it('13. Auditoria de Rotas Complementares e Responsividade Mobile (/clientes/novo, /servicos/novo, /cancelar, /minha-conta)', async () => {
        const { env, data } = createAdminMockEnv();
        const adminCookie = await makeSignedCookie('sess_admin_1');

        // GET /admin/clientes/novo
        const newClientForm = await app.request('/admin/clientes/novo', {
            method: 'GET',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(newClientForm.status).toBe(200);
        const newClientHtml = await newClientForm.text();
        expect(newClientHtml).toContain('Cadastrar Novo Cliente');
        expect(newClientHtml).toContain('gt-mobile-toggle');

        // GET /admin/servicos/novo
        const newServiceForm = await app.request('/admin/servicos/novo', {
            method: 'GET',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(newServiceForm.status).toBe(200);
        expect(await newServiceForm.text()).toContain('Cadastrar Novo Pacote de Serviço');

        // POST /admin/solicitacoes/1/cancelar
        const cancelReq = await app.request('/admin/solicitacoes/1/cancelar', {
            method: 'POST',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(cancelReq.status).toBe(302);
        expect(data.service_requests[0].status).toBe('cancelled');

        // GET /minha-conta (sem rótulo "Segurança & Senha", padronizado para "Minha Conta")
        const accountRes = await app.request('/minha-conta', {
            method: 'GET',
            headers: { 'Cookie': adminCookie }
        }, env);
        expect(accountRes.status).toBe(200);
        const accountHtml = await accountRes.text();
        expect(accountHtml).toContain('Minha Conta');
        expect(accountHtml).toContain('Alteração de Senha');
        expect(accountHtml).not.toContain('Segurança & Senha');
    });
});
