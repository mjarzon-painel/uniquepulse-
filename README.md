# UniquePulse — WhatsApp Blast Manager (Unique Automóveis)

Painel **colaborativo** de disparo de WhatsApp para a Unique Automóveis. Vários
aparelhos veem/editam a mesma lista e acompanham o disparo **ao vivo**; o disparo roda
no **servidor (VPS)**, 24h, mesmo sem ninguém com a tela aberta.

---

## 🌐 Acessos

| O quê | Onde |
|---|---|
| Painel (produção) | **https://uniquepulse.onrender.com** |
| Login do painel | usuário **`admin`** / senha **`unique2026`** (em `src/config.ts`) |
| Repositório | https://github.com/mjarzon-painel/uniquepulse- |
| Frontend (host) | Render (static site `uniquepulse-`), env **`VITE_API_URL`** = URL do backend |
| Backend (host) | VPS Windows `154.64.32.170` (RDP, usuário `xdatacenter`) |
| Backend URL fixa | **https://swung-dig-chastity.ngrok-free.dev** (túnel ngrok fixo) |

---

## 🧱 Arquitetura

```
Aparelhos (celular/PC) ──> uniquepulse.onrender.com (frontend React, Render)
                                   │  (VITE_API_URL)
                                   ▼
                     https://swung-dig-chastity.ngrok-free.dev  (túnel ngrok fixo)
                                   ▼
                     VPS Windows  ──>  backend Node (server/index.js)  :3001
                                   ├─ Estado compartilhado (app-state.json)  → fonte única
                                   ├─ Motor de disparo (roda no servidor)
                                   ├─ Modo CHIP: whatsapp-web.js (vários chips, round-robin)
                                   └─ Modo API: WhatsApp Cloud API oficial (template aprovado)
```

- **Backend é o dono dos dados** (contatos, templates, settings, disparo, log, histórico).
  Persiste em `app-state.json` (na pasta acima de `/app`, sobrevive a updates).
- Frontend é um **cliente fino**: recebe `app-state` por socket e manda **ações**
  (`importContacts`, `start`, `pause`, `updateTemplate`, `updateApi`, etc.).
- **Chips** (whatsapp-web.js): sessões salvas em `.wwebjs_auth`; reconectam sozinhas.
- **2 modos de envio** (campo `sendMode`): `chip` (não-oficial, risco de ban) ou `api` (oficial).

---

## 📁 Estrutura

```
whatsapp-blast-manager/
├── server/index.js          # Backend: estado compartilhado + motor de disparo + chips + API
├── src/
│   ├── App.tsx              # Shell + sync (app-state/sessions) + nav mobile
│   ├── main.tsx             # entry + ErrorBoundary
│   ├── store/useStore.ts    # Zustand: cliente do backend (ações → socket)
│   ├── utils/
│   │   ├── api.ts           # socket.io + REST (getApiUrl=VITE_API_URL, sendAction, etc.)
│   │   ├── helpers.ts       # validação telefone, intervalo, rodízio template
│   │   └── parseContacts.ts # importação inteligente (CSV/XLSX/PDF/DOCX/TXT/VCF)
│   ├── pages/               # Dashboard, Contacts, Templates, Disparo, Respostas, Historico, Conexoes, Login
│   ├── config.ts            # login + marca (parametrizável por VITE_* p/ multi-empresa)
│   ├── components/          # Header, Sidebar, ConnectModal, CompletionModal, WhatsAppBubble, ErrorBoundary
│   ├── config.ts            # credenciais de login do painel
│   └── types.ts
├── public/                  # logo-icon/full.png, feirao.jpg (arte do template)
├── setup-vps.ps1            # instala tudo no VPS (Node + projeto + ngrok)
├── update-vps.ps1           # atualiza só o backend (mantém a URL/túnel)
├── start-vps.ps1            # inicia backend + túnel ngrok fixo
└── install-autostart.ps1    # registra tarefa agendada "UniquePulse" (auto-start no logon)
```

---

## ▶️ Rodar localmente (dev)

```bash
npm install
npm start          # frontend (vite :5173) + backend (:3001) juntos
```
Sem `VITE_API_URL`, o frontend usa `http://localhost:3001`.

## 🖥️ Operar o VPS (Windows, via Área de Trabalho Remota)

Conectar: RDP em `154.64.32.170`, usuário `xdatacenter` (senha no painel do provedor).

No PowerShell **do servidor** (`C:\Users\xdatacenter>`):

```powershell
# Atualizar o backend para a versão nova do GitHub (mantém a URL):
iwr https://raw.githubusercontent.com/mjarzon-painel/uniquepulse-/main/update-vps.ps1 -OutFile "$env:USERPROFILE\update.ps1"; powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\update.ps1"

# Reiniciar backend + túnel manualmente:
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\uniquepulse\start-vps.ps1"
```

- **Auto-start**: tarefa agendada `UniquePulse` sobe tudo no logon. Após reiniciar o VPS,
  basta conectar uma vez via RDP (ou ter login automático ativo).
- ngrok com **domínio fixo** (`swung-dig-chastity.ngrok-free.dev`) — authtoken já salvo no VPS
  (`ngrok config add-authtoken`), **não fica no repositório**.

---

## 📨 Envio — os 2 modos

### Modo CHIP (whatsapp-web.js) — **funcionando** ✅
- Conecta números por **QR** ou **código de telefone** (Conexões → Adicionar chip).
- Disparo **reveza entre os chips** (round-robin) + **intervalo variável** (anti-ban).
- ⚠️ Não-oficial → risco de ban. Por isso o intervalo variável e horário comercial.

### Modo API (WhatsApp Cloud API oficial) — **funcionando** ✅
- Config em Conexões → "API Oficial" (token, Phone Number ID, template, idioma, URL imagem).
- Token guardado **só no servidor** (não trafega no broadcast; aparece como `__SET__`).
- Envia **template aprovado** pela Meta. Sem risco de ban (tem custo por mensagem).
- **Respostas** (texto + cliques de botão) chegam via **webhook** (`/webhook`) e aparecem
  na aba **Respostas** do painel, ao vivo, com contagem por dia.

**IDs da API (Unique — produção):** WABA `2525170417942471` · Phone Number ID `1196730566852814`
· imagem do template: `https://uniquepulse.onrender.com/feirao.jpg`

## 🏢 Replicar para outra empresa
Veja **[DEPLOY-NOVA-EMPRESA.md](DEPLOY-NOVA-EMPRESA.md)** — passo a passo completo (Meta +
deploy + webhook + painel). A marca/login são parametrizáveis por variáveis `VITE_*`
(ver `.env.example`), sem tocar no código.

---

## 🎯 Campanha atual — Ultra Feirão Unique
- **Datas:** 26, 27 e 28 de junho de 2026
- **Local:** Av. Getúlio Vargas, 120 — Jardim Elizabeth, Salto/SP (Estacionamento do São Vicente)
- **Tel:** (19) 9 9126-3745
- **3 templates (modo chip):** Escassez / Oportunidade / Urgência (genéricos, sem nome, com
  endereço + pré-agendamento "responder 26/27/28").
- **Template oficial (API):** `ultra_feirao` (pt_BR) — imagem + corpo + botões "Vou dia 26/27/28"
  → **enviado para aprovação na Meta** (qualidade pendente).
- **Lista:** `Downloads/CLIENTES_WHATSAPP.csv` (19.436 clientes filtrados) e
  `Downloads/CLIENTES_LOTE_500.csv` (primeiros 500). ⚠️ Volume alto = enviar em lotes.

---

## ⏳ Pendências / próximos passos
1. **Número da API**: o número de teste dá erro `#133010 (Account not registered)`; o número real
   (`+55 19 98331-4376`) está **bloqueado na verificação** (limite de códigos — esperar liberar).
2. **Token permanente** da API (System User, validade "Nunca") — o temporário expira em 24h.
3. **#1 Segurança**: o backend está **aberto na internet** (sem `WA_TOKEN`). Antes de divulgar o
   link amplamente, ativar uma chave de acesso.
4. **Login automático no boot** do VPS (para a tarefa AtLogOn subir sem RDP).
5. Pro Feirão dessa semana: se a API não ficar pronta a tempo, usar o **modo chip** (já funciona).
