

## Correção: Botão "Conectar com Meta" abrindo em popup

### Problema identificado

O botão "Conectar com Meta" faz um redirecionamento (`window.location.href = authUrl`) dentro do iframe de preview do Lovable. A Meta **bloqueia** o carregamento da página de login dentro de iframes por segurança, resultando na tela em branco e erro "recusado".

### Solução

Substituir o redirecionamento por uma **janela popup** (`window.open`). O popup abre fora do iframe, permitindo o login normal na Meta. Após a autenticação, o popup comunica o resultado via `window.opener.postMessage` e fecha automaticamente.

### Arquivos modificados

#### 1. `src/pages/WhatsAppSettingsPage.tsx`
- Alterar `handleConnectOAuth` para usar `window.open()` em vez de `window.location.href`
- Adicionar listener de `message` para receber o resultado do popup
- Ao receber sucesso, recarregar as credenciais OAuth

#### 2. `src/pages/WhatsAppOAuthCallbackPage.tsx`
- Detectar se a página foi aberta em popup (`window.opener`)
- Se sim, enviar `postMessage` com o resultado (sucesso/erro) para a janela pai e fechar o popup
- Se não (acesso direto), manter o comportamento atual de redirecionamento

### Detalhes técnicos

**WhatsAppSettingsPage.tsx** - `handleConnectOAuth`:
```text
1. Chama initMetaOAuth() para obter authUrl
2. Abre popup: window.open(authUrl, 'meta_oauth', 'width=600,height=700')
3. Se popup bloqueado, exibe toast pedindo para permitir popups
4. Registra listener window.addEventListener('message', handler)
5. Handler valida origin, recebe {type: 'oauth-complete', success: boolean}
6. Se sucesso, recarrega credenciais via getOAuthCredentials()
7. Limpa listener ao desmontar componente
```

**WhatsAppOAuthCallbackPage.tsx**:
```text
1. Após exchangeOAuthCode() completar (sucesso ou erro):
2. Se window.opener existe:
   - Envia postMessage({type: 'oauth-complete', success: true/false})
   - Fecha o popup com window.close()
3. Se window.opener não existe (acesso direto):
   - Mantém redirecionamento atual via navigate()
```

### Sem mudanças em
- Edge functions (backend continua igual)
- Banco de dados
- Lógica de tokens/credenciais
