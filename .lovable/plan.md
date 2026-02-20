
## Melhoria: Feedback de Erros do WhatsApp na Interface

### Diagnóstico confirmado

O código está funcionando corretamente. A API Meta retorna o erro `#131030 - Recipient phone number not in allowed list` porque o app da Meta ainda está em modo **Desenvolvimento/Teste**, que restringe o envio apenas para números previamente cadastrados na lista de destinatários do painel da Meta.

Isso NÃO é um bug de código — é uma limitação da Meta que precisa de resolução no painel deles. Porém, o sistema falha silenciosamente (fire-and-forget), então o admin não sabe que o envio falhou.

### O que será implementado

#### 1. `src/lib/whatsappApi.ts` — Retornar mensagem de erro detalhada

Atualmente `sendWhatsAppMessage` retorna apenas `true/false`. Vamos expandir para retornar um objeto com `{ success: boolean; errorCode?: number; errorMessage?: string }` para que os chamadores possam reagir ao tipo de erro.

Criar também uma função auxiliar `getWhatsAppErrorHint(code: number): string` que traduz códigos de erro da Meta para mensagens em português claras:
- `131030` → "Número não está na lista de destinatários permitidos. No modo de teste, adicione o número em Meta for Developers → WhatsApp → API Setup."
- `190` → "Access Token inválido ou expirado. Atualize o token nas configurações."
- `131047` → "Mensagem fora da janela de 24h. Use um template aprovado pela Meta."
- Outros → "Erro na API Meta (código X). Verifique as configurações."

#### 2. `src/pages/WhatsAppSettingsPage.tsx` — Botão "Testar Conexão" com feedback real

Adicionar um botão **"Testar Conexão"** que:
- Envia uma mensagem de teste para o próprio `businessPhone` configurado
- Exibe resultado inline (não apenas toast):
  - Verde: "✅ Conexão funcionando! Mensagem enviada."
  - Vermelho: "❌ Erro #131030: Número não está na lista de teste..." com link direto para o painel da Meta

Adicionar também um **aviso informativo** explicando a diferença entre modo de desenvolvimento e produção da Meta, com links diretos:

```
⚠️ Modo de Desenvolvimento da Meta
No modo de teste, mensagens só podem ser enviadas para
números cadastrados no painel. Para uso em produção, publique
seu app na Meta e solicite permissão whatsapp_business_messaging.

[Abrir lista de destinatários] [Ver como publicar app]
```

#### 3. `src/pages/ServiceFormPage.tsx` — Toast de erro quando WhatsApp falha

Quando `sendServiceConfirmation` retornar falha, exibir um toast com dica:
```
toast.warning('WhatsApp não enviado', {
  description: 'Número não está na lista de destinatários permitidos no modo de teste.'
})
```

Em vez de falhar silenciosamente.

#### 4. `src/pages/PlanCheckoutPage.tsx` — Mesmo tratamento

Mesmo padrão do item 3 acima.

### Arquivos modificados

1. `src/lib/whatsappApi.ts` — Retornar objeto com código de erro + função de hint em português
2. `src/pages/WhatsAppSettingsPage.tsx` — Botão Testar Conexão + aviso sobre modo de desenvolvimento
3. `src/pages/ServiceFormPage.tsx` — Toast de aviso quando WhatsApp falha
4. `src/pages/PlanCheckoutPage.tsx` — Toast de aviso quando WhatsApp falha

### Sem mudanças em

- Banco de dados (Dexie) — sem alterações
- Edge function — sem alterações
- Tipos — sem alterações
- Lógica de salvamento — sem alterações
- Fluxo principal de atendimento/pagamento — continua funcionando normalmente, WhatsApp é sempre secundário

### Impacto no usuário

O admin agora verá exatamente o que aconteceu com o envio do WhatsApp, com instruções claras de como resolver (adicionar número na Meta ou publicar o app), sem precisar abrir o console do navegador.
