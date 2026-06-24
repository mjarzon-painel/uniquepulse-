# 🏢 Replicar o UniquePulse para outra empresa

Guia completo e repetível para colocar o sistema rodando com a **API oficial** (WhatsApp
Cloud API) para uma **nova empresa** — do zero ao primeiro disparo + caixa de respostas.

> Cada empresa = **uma instância separada**: backend próprio (porta + túnel próprios) +
> frontend próprio (Render com env próprias) + número/WABA/token próprios da empresa.
> O código é o mesmo; o que muda são **variáveis de ambiente** e os **dados da Meta**.

---

## 🗺️ Visão geral

```
Aparelhos → frontend Render (empresa X)  ──VITE_API_URL──►  backend (VPS, porta X) ──► Cloud API
                                                                 ▲
                                              Meta envia respostas via WEBHOOK (/webhook)
```

Coisas que são **por empresa** (anote numa planilha de onboarding):

| Variável | Onde se usa | Exemplo |
|---|---|---|
| WABA ID | Meta | `2525170417942471` |
| Phone Number ID | painel + envio | `1196730566852814` |
| Token permanente | backend/painel | `EAAS...` (nunca expira) |
| Nome do template | painel | `feirao_empresaX` |
| URL da imagem | painel | `https://.../arte.jpg` |
| PIN (2 etapas) | registro do número | `654321` |
| WEBHOOK_VERIFY_TOKEN | backend + Meta | string à sua escolha |
| VITE_API_URL | Render | URL do túnel do backend |
| Marca (nome/logo) | Render (VITE_BRAND_*) | "ZapEmpresaX" |

---

## PARTE A — Configuração na Meta (Cloud API)

### A1. Business Manager verificado
- `business.facebook.com` → a empresa precisa de um **Gerenciador de Negócios** com a
  **Verificação da empresa = APROVADA** (Configurações → Central de Segurança).
- Sem isso o número fica preso em limites baixos. (Costuma ser a etapa mais demorada.)

### A2. Criar WABA + adicionar o número
- Em **developers.facebook.com** → crie/abra um App do tipo **Business** → adicione o caso
  de uso **"Conectar-se com clientes pelo WhatsApp"**.
- Vá em **Configuração da API** → **Números de telefone → Gerenciar → Adicionar número**.
- Use um número **que NÃO tenha conta no WhatsApp** (app comum). Verifique por **código**
  (SMS/ligação). Após verificar: `code_verification_status = VERIFIED`.

### A3. Registrar o número na Cloud API (resolve `#133010 Account not registered`)
Verificado ≠ registrado. Registre definindo um **PIN de 6 dígitos** (verificação em 2 etapas):

```bash
curl -X POST "https://graph.facebook.com/v21.0/<PHONE_NUMBER_ID>/register" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","pin":"<PIN_6_DIGITOS>"}'
# Esperado: {"success":true}
```
Confirme: `platform_type` vira **CLOUD_API** e `status` vira **CONNECTED**:
```bash
curl "https://graph.facebook.com/v21.0/<PHONE_NUMBER_ID>?fields=display_phone_number,platform_type,status&access_token=<TOKEN>"
```

### A4. Token PERMANENTE (System User)
- `business.facebook.com/settings/system-users` (no BM da empresa).
- **Adicionar** System User (função **Funcionário** evita o "limite de admins").
- **Adicionar ativos** → WhatsApp Accounts → marque a WABA → **Controle total**.
- **Gerar token**: App = o seu app, **Validade = Nunca**, permissões
  **`whatsapp_business_management`** + **`whatsapp_business_messaging`**. Copie e guarde.
- Valide (deve mostrar `type: SYSTEM_USER` e `expires_at: 0`):
```bash
curl "https://graph.facebook.com/v21.0/debug_token?input_token=<TOKEN>&access_token=<TOKEN>"
```

### A5. Template aprovado
- O template tem que estar **na MESMA WABA** do número que envia.
- **WhatsApp Manager → Modelos de mensagem → Criar**. Categoria **Marketing**, idioma `pt_BR`.
- **Sem variáveis** no corpo (o backend só envia a imagem do cabeçalho — corpo com `{{1}}`
  faria o envio falhar por falta de parâmetro).
- Cabeçalho = **Imagem**; botões = **Resposta rápida** (ex.: "Vou dia 26/27/28").
- Mantenha o corpo **curto** (poucas linhas) para não aparecer "Ler mais" no WhatsApp.
- Confira o status:
```bash
curl "https://graph.facebook.com/v21.0/<WABA_ID>/message_templates?fields=name,status&access_token=<TOKEN>"
```

### A6. Perfil do número (foto + dados)
- WhatsApp Manager → o número → **Perfil**: foto (quadrada, ≥192px), descrição, endereço,
  site, categoria. Passa confiança e ajuda na qualidade.

### A7. Webhook (para RECEBER as respostas) ⭐
1. Suba o backend (Parte B) — ele já tem o endpoint `/webhook`.
2. No App da Meta → **WhatsApp → Configuração → Webhook**:
   - **Callback URL:** `https://<URL_DO_BACKEND>/webhook`
   - **Verify token:** o mesmo valor de `WEBHOOK_VERIFY_TOKEN` do backend.
   - Clique em **Verificar e salvar** (a Meta chama o GET `/webhook`).
   - Em **Campos do webhook**, assine **`messages`**.
3. Inscreva o App na WABA (pode ser via API):
```bash
curl -X POST "https://graph.facebook.com/v21.0/<WABA_ID>/subscribed_apps" \
  -H "Authorization: Bearer <TOKEN>"
# Verifique: deve listar o app
curl "https://graph.facebook.com/v21.0/<WABA_ID>/subscribed_apps?access_token=<TOKEN>"
```
A partir daí, respostas e cliques de botão aparecem ao vivo na aba **Respostas** do painel.

---

## PARTE B — Subir a instância (deploy)

### B1. Backend (VPS Windows)
- Cada empresa roda numa **porta própria** (ex.: 3001, 3002, …) e num **túnel ngrok próprio**
  (domínio fixo separado), para não colidir com outras instâncias.
- Crie um `.env` na raiz do projeto (veja `.env.example`):
  ```
  WA_TOKEN=<chave-forte>
  WEBHOOK_VERIFY_TOKEN=<verify-token>
  META_APP_SECRET=<opcional, recomendado>
  ```
- A porta está em `server/index.js` (`const PORT = 3001`). Para uma 2ª instância, use outra
  pasta de projeto + outra porta + outro domínio ngrok.
- Suba: `node server/index.js` (ou os scripts `start-vps.ps1` adaptados).

### B2. Frontend (Render — static site)
- Novo **Static Site** apontando para o repo. Build: `npm install --include=dev && npm run build`,
  publish dir: `dist`. Regra de Rewrite: `/*` → `/index.html`.
- **Environment** (é o que personaliza a empresa, sem mexer no código):
  ```
  VITE_API_URL=https://<tunel-do-backend>
  VITE_LOGIN_USER=admin
  VITE_LOGIN_PASS=<senha-da-empresa>
  VITE_BRAND_NAME=ZapEmpresaX
  VITE_BRAND_HIGHLIGHT=X          # sufixo destacado em cor (deixe vazio se não quiser)
  VITE_BRAND_TAGLINE=Disparos WhatsApp — Empresa X
  ```

### B3. Marca / logos
- Troque os arquivos em `public/` (`logo-icon.png`, `logo-full.png`) pelos da empresa
  **ou** aponte `VITE_BRAND_LOGO_ICON` / `VITE_BRAND_LOGO_FULL` para outras URLs/arquivos.

---

## PARTE C — Configurar o painel (modo API)
No painel da empresa → **Conexões → Modo de envio → API Oficial (Meta)** e preencha:

| Campo | Valor |
|---|---|
| Access Token | token permanente (A4) |
| Phone Number ID | o do número registrado (A3) |
| Nome do template | o aprovado (A5) |
| Idioma | `pt_BR` |
| URL da imagem | URL pública da arte do cabeçalho |

Salvar → o token fica só no servidor (aparece "configurado ✓"). Faça **1 envio de teste**
(Contatos → 1 número → Disparo → Iniciar) e confira a entrega + a aba **Respostas**.

---

## PARTE D — Checklist de "pronto para disparar"
- [ ] Business Verification **APROVADA**
- [ ] Número **VERIFIED** e **CLOUD_API / CONNECTED** (registrado)
- [ ] Token **permanente** (System User, validade Nunca) válido
- [ ] Template **APPROVED** na WABA certa, sem variável, corpo curto
- [ ] Perfil do número preenchido (foto + dados)
- [ ] Webhook **verificado** + app **inscrito** na WABA (`subscribed_apps`)
- [ ] Painel no **modo API** com token/phoneId/template/imagem salvos
- [ ] **Envio de teste** entregue e **resposta de teste** apareceu na aba Respostas
- [ ] **Limite (tier)** conhecido — número novo começa ~1.000 conversas/24h e escala

---

## 🔧 Comandos úteis (diagnóstico via Graph API)
```bash
# Números de uma WABA (status, verificação, qualidade)
curl "https://graph.facebook.com/v21.0/<WABA_ID>/phone_numbers?fields=id,display_phone_number,code_verification_status,platform_type,status,quality_rating&access_token=<TOKEN>"

# Limite/qualidade de um número
curl "https://graph.facebook.com/v21.0/<PHONE_NUMBER_ID>?fields=display_phone_number,messaging_limit_tier,quality_rating,throughput,status&access_token=<TOKEN>"

# Enviar template de teste (cabeçalho com imagem, sem variáveis no corpo)
curl -X POST "https://graph.facebook.com/v21.0/<PHONE_NUMBER_ID>/messages" \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","to":"55DDDNUMERO","type":"template",
       "template":{"name":"<TEMPLATE>","language":{"code":"pt_BR"},
       "components":[{"type":"header","parameters":[{"type":"image","image":{"link":"<URL_IMAGEM>"}}]}]}}'
```
