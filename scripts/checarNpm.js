const versao = (process.env.npm_config_user_agent || '').match(/npm\/(\d+)/);
const major = versao ? Number(versao[1]) : 0;

if (major > 10) {
  console.error(`O deploy precisa do npm 10 (Node 20). Versão atual: npm ${versao[1]}. Com versões mais novas o pacote sai sem as dependências.`);
  process.exit(1);
}
