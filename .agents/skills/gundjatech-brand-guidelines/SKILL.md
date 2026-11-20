---
name: gundjatech-brand-guidelines
description: >-
  MANDATORY skill for creating ANY visual, digital, frontend, design, marketing, or code asset for GundjaTech.
  Use whenever creating, editing, or generating websites, landing pages, e-commerce stores, ad creatives,
  social media banners, UI components, print materials, documents, or branding for GundjaTech.
  Enforces the official G-Nexus symbol, color tokens (Golden Yellow #F2C230, Deep Petrol Blue #063B5C,
  Pure White #FFFFFF, Medium Petrol Blue #16749A, Soft Ice #E7F0F5), typography, and conversion UI patterns.
---

# GundjaTech • Diretrizes Obrigatórias de Identidade Visual (Paleta 3)

Este runbook define os padrões visuais, tokens de design, arquivos de logotipo e componentes de interface para **qualquer criação realizada para a GundjaTech**.

---

## 1. Pilares da Empresa e Posicionamento

A **GundjaTech** atua em áreas essenciais de tecnologia:
1. **Venda de produtos de informática** (hardware corporativo, componentes, notebooks e periféricos).
2. **Desenvolvimento de sites profissionais** (código limpo, ultra-rápido, SEO e alta disponibilidade).
3. **Criação de lojas virtuais** (e-commerce de alta conversão, checkout otimizado).
4. **Gestão de tráfego pago & domínios** (campanhas de performance em Meta Ads, Google Ads e infraestrutura web).

**Conceito Visual**: Sofisticado, tecnológico e profissional (Amarelo Ouro + Azul Petróleo + Branco).

---

## 2. Tokens Oficiais de Cores (Paleta 3: Amarelo Ouro + Azul Petróleo + Branco)

| Cor | Nome Técnico | HEX | RGB | Função de Uso |
| :--- | :--- | :--- | :--- | :--- |
| ![#F2C230](https://via.placeholder.com/15/F2C230/F2C230.png) | **Amarelo Ouro** | `#F2C230` | `242, 194, 48` | **Cor de Ação / CTA**: Botões principais, palavra "Tech", trilha e nó do circuito, estrelas e destaques |
| ![#063B5C](https://via.placeholder.com/15/063B5C/063B5C.png) | **Azul Petróleo Escuro** | `#063B5C` | `6, 59, 92` | **Fundo Principal (Dark)**: Fundo escuro corporativo, seções institucionais, cabeçalho e rodapé |
| ![#FFFFFF](https://via.placeholder.com/15/FFFFFF/FFFFFF.png) | **Branco Puro** | `#FFFFFF` | `255, 255, 255` | **Alto Contraste**: Títulos sobre fundo escuro, fundos claros principais e palavra "Gundja" (dark mode) |
| ![#16749A](https://via.placeholder.com/15/16749A/16749A.png) | **Azul Petróleo Médio** | `#16749A` | `22, 116, 154` | **Base Tecnológica**: Corpo principal do "G", gradientes secundários, bordas e elementos interativos |
| ![#E7F0F5](https://via.placeholder.com/15/E7F0F5/E7F0F5.png) | **Gelo / Petróleo Claro** | `#E7F0F5` | `231, 240, 245` | **Fundo Suave (Light)**: Seções claras secundárias, cards editoriais e textos de apoio sobre fundo escuro |

### Snippet CSS (:root)
```css
:root {
  --gt-gold: #F2C230;
  --gt-gold-hover: #E0B020;
  --gt-petrol-dark: #063B5C;
  --gt-petrol-mid: #16749A;
  --gt-ice: #E7F0F5;
  --gt-white: #FFFFFF;
}
```

---

## 3. Logotipos Oficiais e Regras de Aplicação

O símbolo oficial da marca é o **"G-Nexus"** (corpo do G em Azul Petróleo `#16749A` &rarr; `#063B5C` e trilha de circuito + nó central em Amarelo Ouro `#F2C230`).

### Arquivos Vetoriais Oficiais:
- **Fundo Escuro (`#063B5C`)**:
  - Logotipo Principal: `logo-principal-fundo-escuro.svg`
  - Logotipo Horizontal: `logo-horizontal-fundo-escuro.svg`
  - Símbolo Isolado: `simbolo-escuro.svg`
- **Fundo Claro (`#FFFFFF` / `#E7F0F5`)**:
  - Logotipo Principal: `logo-principal-fundo-claro.svg`
  - Logotipo Horizontal: `logo-horizontal-fundo-claro.svg`
  - Símbolo Isolado: `simbolo-claro.svg`
- **Ícone de Navegador**:
  - Favicon: `favicon.svg`
