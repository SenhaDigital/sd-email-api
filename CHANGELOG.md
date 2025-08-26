# Changelog

Todos os notáveis mudanças neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).

## [Não Publicado]
### Adicionado
- Sistema de autenticação via chave de API
- Documentação abrangente da API
- Suporte a múltiplos ambientes (dev, staging, prod)
- Processamento assíncrono de emails com SQS
- Rastreamento de status de jobs de email

### Alterado
- Melhorias na estrutura do projeto
- Atualização das dependências
- Aprimoramento no tratamento de erros

## [1.0.0] - 2025-06-25
### Adicionado
- Versão inicial da API de envio de emails
- Suporte a envio de emails com HTML e anexos
- Integração com MongoDB para armazenamento de jobs
- Autenticação básica
- Documentação inicial

### Corrigido
- Correções de segurança nas configurações do SMTP
- Melhorias no tratamento de erros
- Ajustes na validação de emails
