export interface ToastMeta {
    title: string;
    iconPath: string;
    variant: 'success' | 'warning' | 'error';
}

/**
 * Define título, variante semântica e ícone contextuais para notificações flash (toasts)
 * de acordo com a ação executada no Painel Admin ou Portal do Cliente.
 */
export function resolveToastMeta(message: string, isError = false): ToastMeta {
    const msg = String(message || '').toLowerCase();

    if (isError) {
        if (/nenhuma altera/.test(msg)) {
            return {
                title: 'Nenhuma alteração',
                iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
                variant: 'warning',
            };
        }
        if (/obrigat[oó]ri|inv[aá]lid|informe|n[aã]o confere/.test(msg)) {
            return {
                title: 'Verifique os dados',
                iconPath: 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
                variant: 'warning',
            };
        }
        if (/n[aã]o encontrad/.test(msg)) {
            return {
                title: 'Registro não encontrado',
                iconPath: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
                variant: 'error',
            };
        }
        if (/permiss[aã]o|negad|autorizad/.test(msg)) {
            return {
                title: 'Acesso restrito',
                iconPath: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
                variant: 'error',
            };
        }
        if (/j[aá] foi|duplicad/.test(msg)) {
            return {
                title: 'Ação já realizada',
                iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
                variant: 'warning',
            };
        }
        return {
            title: 'Não foi possível concluir',
            iconPath: 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
            variant: 'error',
        };
    }

    if (/exclu[ií]d|removid|apagad/.test(msg)) {
        return {
            title: 'Registro excluído',
            iconPath: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
            variant: 'success',
        };
    }
    if (/convertid.*projeto/.test(msg)) {
        return {
            title: 'Projeto criado',
            iconPath: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
            variant: 'success',
        };
    }
    if (/projeto.*conclu[ií]d/.test(msg)) {
        return {
            title: 'Projeto concluído',
            iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
            variant: 'success',
        };
    }
    if (/liquidad|pagament|fatura.*pag/.test(msg)) {
        return {
            title: 'Pagamento liquidado',
            iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
            variant: 'success',
        };
    }
    if (/or[cç]amento.*aprovad|proposta.*aprovad/.test(msg)) {
        return {
            title: 'Orçamento aprovado',
            iconPath: 'M5 13l4 4L19 7',
            variant: 'success',
        };
    }
    if (/or[cç]amento.*enviad|proposta.*enviad/.test(msg)) {
        return {
            title: 'Orçamento enviado',
            iconPath: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
            variant: 'success',
        };
    }
    if (/cancelad/.test(msg)) {
        return {
            title: 'Cancelamento registrado',
            iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
            variant: 'success',
        };
    }
    if (/recusad|revis[aã]o/.test(msg)) {
        return {
            title: 'Revisão solicitada',
            iconPath: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
            variant: 'success',
        };
    }
    if (/ativad|reativad|desativad|pausad|promovid|movid/.test(msg)) {
        return {
            title: 'Status alterado',
            iconPath: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
            variant: 'success',
        };
    }
    if (/cadastrad|criad|emitid|lan[cç]ad|adicionad|abert/.test(msg)) {
        return {
            title: 'Cadastro realizado',
            iconPath: 'M12 4v16m8-8H4',
            variant: 'success',
        };
    }
    if (/atualizad|salva|alterad|editad/.test(msg)) {
        return {
            title: 'Alterações salvas',
            iconPath: 'M5 13l4 4L19 7',
            variant: 'success',
        };
    }
    if (/enviad|notificad|mensagem|convite|e-mail/.test(msg)) {
        return {
            title: 'Enviado com sucesso',
            iconPath: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
            variant: 'success',
        };
    }

    return {
        title: 'Concluído',
        iconPath: 'M5 13l4 4L19 7',
        variant: 'success',
    };
}
