# Sistema de Gestão e Apoio à Decisão — Igreja

Aplicativo de gerenciamento de estoque, eventos e finanças, com previsão de consumo, recomendações de reposição e previsão financeira dos eventos.

## Tecnologias

- **Frontend:** Expo SDK 58, React Native 0.88.0, React 19.3.0, Expo Router e TypeScript 6.0.3.
- **Backend:** Node.js, Express 5.3.0, Supabase JS 2.119.2, CORS 2.8.6 e dotenv 18.0.10.
- **Banco de dados e autenticação:** PostgreSQL e Supabase Auth.

As dependências adicionais do frontend, incluindo Expo Secure Store, Expo Constants, Expo UI, React Native Picker, Lucide React Native e React Native SVG, já estão declaradas no `package.json`. Não é necessário instalá-las separadamente.

## 1. Instalação das dependências

Após clonar o repositório, abra a pasta principal no VS Code.

### Backend

No terminal, a partir da raiz do projeto:

```bash
cd backEnd
npm ci
```

### Frontend

Em outro terminal, a partir da raiz do projeto:

```bash
cd frontEnd
npm ci
```

O `npm ci` instala as dependências conforme o `package-lock.json`. Se uma pasta não possuir esse arquivo, use `npm install` nela. Se houver divergência entre o manifesto e o lockfile, comunique a equipe antes de atualizar as dependências.

## 2. Configuração do backend

Crie o arquivo `backEnd/.env` (na raiz de `backEnd`, e não dentro da `src`).

```dotenv
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_SECRET_KEY=SUA_CHAVE_SECRETA
SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
ADMIN_USER_ID=UUID_DO_USUARIO_ADMINISTRADOR
PORT=3000
```

## 3. Executar o projeto no computador

Mantenha os dois terminais abertos ao mesmo tempo.

### Terminal 1 — Backend

A partir da raiz do projeto:

```bash
cd backEnd
node src/server.js
```

Teste no navegador do computador:

http://localhost:3000/

Resultado esperado: `Backend da Igreja funcionando!`

### Terminal 2 — Frontend

A partir da raiz do projeto:

```bash
cd frontEnd
npx expo start
```

Pressione `w` no terminal do Expo para abrir o aplicativo no navegador (normalmente http://localhost:8081). Alternativamente, execute `npm run web` no lugar de `npx expo start` para iniciar diretamente no navegador.

Realize o login com as credenciais de demonstração fornecidas pela equipe. O `ADMIN_USER_ID` precisa corresponder ao usuário autorizado no Supabase.

## 5. Executar no celular (opcional)

### Rede local — LAN

1. Mantenha o backend em execução.
2. Conecte o computador e o celular a uma rede que permita comunicação entre dispositivos.
3. Execute, dentro de `frontEnd`:

   ```bash
   npx expo start --lan
   ```

4. Abra o Expo Go e escaneie o QR Code.

Não é necessário executar `npm run android` ou `npm run ios` para testar pelo Expo Go. Esses comandos destinam-se à compilação nativa e exigem ferramentas adicionais.

O `api.ts` tenta identificar o IPv4 do computador automaticamente no Expo Go. Caso seja necessário definir o endereço manualmente, crie `frontEnd/.env.local`:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

Substitua o IP de exemplo pelo IPv4 real do computador (no Windows, consulte `ipconfig`). Reinicie o Expo e recarregue o aplicativo. Ao voltar para testes no navegador local, remova essa configuração se quiser utilizar o endereço padrão `localhost`.

Se o celular não conseguir acessar `http://IP_DO_COMPUTADOR:3000/` pelo navegador, verifique a comunicação entre os dispositivos e o firewall. Em redes confiáveis, permita somente as conexões necessárias; não desative o firewall. O HTTP local deve ser utilizado apenas para testes com dados fictícios em redes confiáveis.

## Solução de problemas

### Erros de cache do Expo

Dentro de `frontEnd`:

```bash
npx expo start --clear
```

### Erros de dependências ou incompatibilidade com o SDK

Dentro de `frontEnd`, pare o Expo e execute:

```bash
npm ci
npx expo-doctor
npx expo start --clear
```

Se necessário, a equipe pode corrigir versões incompatíveis com `npx expo install --fix`, revisar as alterações e atualizar os arquivos `package.json` e `package-lock.json` no repositório.

Evite excluir o `package-lock.json` como primeira solução: isso pode instalar versões diferentes das testadas pela equipe.

### Backend não inicia ou aplicativo não conecta

- Confira se executou `node src/server.js` dentro de `backEnd`.
- Confira a existência do `.env` e as configurações do Supabase.
- Verifique se a porta 3000 está disponível.
- Confira a URL da API e se o backend está rodando.
- Se houver alteração de configuração, reinicie o processo correspondente.
