export interface Env {
    // Cloudflare D1 Database
    DB: D1Database;

    // Cloudflare KV Namespaces
    KV_SESSIONS: KVNamespace;
    KV_CACHE: KVNamespace;

    // Cloudflare R2 Bucket
    UPLOADS_BUCKET: R2Bucket;

    // Cloudflare Workers AI
    AI: Ai;

    // Environment & Secrets
    ENVIRONMENT?: string;
    SESSION_SECRET: string;
    RESEND_API_KEY?: string;
    GEMINI_API_KEY?: string;
    OPENAI_API_KEY?: string;
    APP_URL?: string;
    EMAIL_FROM?: string;
    STAFF_NOTIFY_EMAIL?: string;

    // Meta WhatsApp Cloud API
    WHATSAPP_VERIFY_TOKEN?: string;
    WHATSAPP_ACCESS_TOKEN?: string;
    WHATSAPP_PHONE_NUMBER_ID?: string;
    WHATSAPP_API_VERSION?: string;
    WHATSAPP_APP_SECRET?: string;
    WHATSAPP_WEBHOOK_SECRET?: string;
}

export type UserRole =
    | 'superadmin'
    | 'admin'
    | 'manager'
    | 'attendant'
    | 'developer'
    | 'financial'
    | 'client';

export interface UserSessionPayload {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    is_active: boolean;
    client_id?: number | null;
}

export interface AppVariables {
    user?: UserSessionPayload | null;
    sessionId?: string | null;
}
