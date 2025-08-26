# 👥 Guia de Contribuição

Obrigado por considerar contribuir para o projeto SDsend! Aqui estão as diretrizes para contribuição.

## 📋 Como Contribuir

1. **Reportando Bugs**
   - Verifique se o bug já não foi reportado
   - Descreva o comportamento esperado e o que realmente aconteceu
   - Inclua passos para reproduzir o problema
   - Adicione capturas de tela se aplicável

2. **Sugerindo Melhorias**
   - Explique o problema que a melhoria resolveria
   - Descreva a solução proposta
   - Inclua exemplos de código se relevante

3. **Enviando Pull Requests**
   - Crie um fork do repositório
   - Crie um branch para sua feature (`git checkout -b feature/AmazingFeature`)
   - Faça commit das suas alterações (`git commit -m 'Add some AmazingFeature'`)
   - Faça push para o branch (`git push origin feature/AmazingFeature`)
   - Abra um Pull Request

## 🛠️ Configuração do Ambiente

1. **Clonar o repositório**
   ```bash
   git clone https://github.com/seu-usuario/sd-email-api.git
   cd sd-email-api
   ```

2. **Instalar dependências**
   ```bash
   npm install
   ```

3. **Configurar variáveis de ambiente**
   - Crie um arquivo `.env` baseado no `.env.example`
   - Preencha as variáveis necessárias

4. **Executar testes**
   ```bash
   npm test
   ```

## 📝 Padrões de Código

### TypeScript
- Use tipagem forte sempre que possível
- Evite `any` - prefira tipos explícitos
- Use interfaces para definir tipos de objetos

### Nomenclatura
- **Variáveis e funções**: `camelCase`
- **Classes**: `PascalCase`
- **Interfaces**: Prefixo `I` (ex: `IEmailOptions`)
- **Arquivos**: `kebab-case` para nomes de arquivos
- **Constantes**: `UPPER_SNAKE_CASE`

### Estrutura de Pastas
```
src/
  ├── handlers/      # Funções Lambda
  ├── services/      # Lógica de negócios
  ├── models/        # Modelos de dados
  ├── utils/         # Utilitários
  ├── middleware/    # Middlewares
  └── types/         # Definições de tipos TypeScript
```

## 🔍 Testes

- Escreva testes para novas funcionalidades
- Mantenha a cobertura de testes acima de 80%
- Execute todos os testes antes de enviar um PR

```bash
# Executar testes
npm test

# Executar testes com cobertura
npm run test:coverage
```

## 📝 Commits

Use o padrão Conventional Commits:

```
type(escopo): mensagem descritiva

Corpo detalhado se necessário

[Detalhes adicionais, referências, etc.]
```

**Tipos de commit**:
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Mudanças na documentação
- `style`: Formatação, ponto e vírgula, etc.
- `refactor`: Refatoração de código
- `test`: Adicionando testes
- `chore`: Atualização de tarefas, configuração do build

**Exemplo**:
```
feat(api): adiciona endpoint para envio de email

Adiciona novo endpoint POST /api/email/send para envio de emails
com suporte a HTML e anexos.

Refs: #123
```

## 📦 Versionamento

Usamos [SemVer](https://semver.org/) para versionamento. Para as versões disponíveis, veja as [tags](https://github.com/seu-usuario/sd-email-api/tags).

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙋‍♂️ Dúvidas?

Se tiver dúvidas, abra uma issue ou entre em contato com a equipe de desenvolvimento.
