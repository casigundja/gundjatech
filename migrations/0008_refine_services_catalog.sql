-- Refinamento editorial e comercial do Catálogo de Serviços GundjaTech (idempotente)

UPDATE services
SET name = 'Site Institucional Corporativo',
    title = 'Site Institucional Corporativo',
    updated_at = datetime('now')
WHERE slug = 'site-institucional-premium';

UPDATE services
SET name = 'Loja Virtual & E-commerce',
    title = 'Loja Virtual & E-commerce',
    updated_at = datetime('now')
WHERE slug = 'loja-virtual-alta-conversao';

UPDATE services
SET name = 'Landing Page de Alta Conversão',
    title = 'Landing Page de Alta Conversão',
    short_description = 'Páginas de vendas estratégicas desenhadas para receber tráfego pago e converter visitantes em clientes.',
    summary = 'Páginas de vendas estratégicas desenhadas para receber tráfego pago e converter visitantes em clientes.',
    updated_at = datetime('now')
WHERE slug = 'landing-page-alta-performance';

UPDATE services
SET name = 'Domínios & Blindagem DNS',
    title = 'Domínios & Blindagem DNS',
    short_description = 'Registro, renovação preventiva, SSL e DNS profissional para manter sua empresa sempre no ar.',
    summary = 'Registro, renovação preventiva, SSL e DNS profissional para manter sua empresa sempre no ar.',
    updated_at = datetime('now')
WHERE slug = 'gestao-e-registro-de-dominios';

UPDATE services
SET name = 'Tráfego Pago • Meta Ads',
    title = 'Tráfego Pago • Meta Ads',
    short_description = 'Campanhas no Instagram e Facebook com criativos de alto impacto para alcançar o público certo no momento exato de compra.',
    summary = 'Campanhas no Instagram e Facebook com criativos de alto impacto para alcançar o público certo no momento exato de compra.',
    updated_at = datetime('now')
WHERE slug = 'gestao-trafego-meta-ads';

UPDATE services
SET name = 'Tráfego Pago • Google Ads',
    title = 'Tráfego Pago • Google Ads',
    updated_at = datetime('now')
WHERE slug = 'gestao-trafego-google-ads';

INSERT OR IGNORE INTO services (
    category_id,
    name,
    title,
    slug,
    short_description,
    summary,
    description,
    base_price,
    price,
    price_starting_at,
    estimated_days,
    delivery_time_days,
    is_featured,
    is_active,
    sort_order,
    order_position,
    created_at,
    updated_at
)
SELECT
    id,
    'Sistemas Web & Portais Sob Medida',
    'Sistemas Web & Portais Sob Medida',
    'sistemas-web-portais-sob-medida',
    'Aplicações web, portais de clientes, painéis administrativos e integrações sob medida em nuvem.',
    'Aplicações web, portais de clientes, painéis administrativos e integrações sob medida em nuvem.',
    'Desenvolvimento completo de sistemas web corporativos, ERPs sob medida, portais de clientes, integrações via API, automação de processos e infraestrutura em nuvem com alta disponibilidade.',
    8500,
    8500,
    8500,
    30,
    30,
    1,
    1,
    4,
    4,
    datetime('now'),
    datetime('now')
FROM service_categories
WHERE id = 1
LIMIT 1;
