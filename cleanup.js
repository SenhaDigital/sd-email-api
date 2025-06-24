#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n========================================');
console.log('🧹 Limpeza da arquitetura de microserviços');
console.log('========================================\n');

// Arquivos e diretórios da arquitetura antiga a serem removidos
const obsoleteFiles = [
  'docker-compose.yml',
  'Dockerfile',
  '.dockerignore',
  '.env'  // O formato .env antigo é substituído por env.*.yml
];

const obsoleteDirs = [
  'api-gateway',
  'email-validator',
  'email-sender'
];

console.log('Os seguintes arquivos e diretórios não são mais necessários na arquitetura serverless:');
console.log('\nArquivos:');
obsoleteFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`  - ${file}`);
  }
});

console.log('\nDiretórios:');
obsoleteDirs.forEach(dir => {
  if (fs.existsSync(path.join(__dirname, dir))) {
    console.log(`  - ${dir}`);
  }
});

console.log('\n⚠️  Esta operação excluirá permanentemente os arquivos e diretórios listados acima.');
rl.question('Deseja continuar? (s/N): ', (answer) => {
  if (answer.toLowerCase() === 's') {
    // Remove arquivos obsoletos
    obsoleteFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`✅ Arquivo removido: ${file}`);
        } catch (err) {
          console.error(`❌ Erro ao remover arquivo ${file}: ${err.message}`);
        }
      }
    });

    // Remove diretórios obsoletos recursivamente
    obsoleteDirs.forEach(dir => {
      const dirPath = path.join(__dirname, dir);
      if (fs.existsSync(dirPath)) {
        try {
          // Função recursiva para remover diretórios
          const removeDir = (dirPath) => {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
              const entryPath = path.join(dirPath, entry.name);
              
              if (entry.isDirectory()) {
                removeDir(entryPath);
              } else {
                fs.unlinkSync(entryPath);
              }
            }
            
            fs.rmdirSync(dirPath);
          };
          
          removeDir(dirPath);
          console.log(`✅ Diretório removido: ${dir}`);
        } catch (err) {
          console.error(`❌ Erro ao remover diretório ${dir}: ${err.message}`);
        }
      }
    });

    console.log('\n✅ Limpeza concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Configure suas credenciais AWS (aws configure)');
    console.log('2. Crie seu arquivo .env.local para desenvolvimento local');
    console.log('3. Execute npm run dev para testar localmente');
    console.log('4. Execute npm run deploy:dev para fazer deploy no ambiente de desenvolvimento\n');
  } else {
    console.log('\n🛑 Operação cancelada. Nenhum arquivo foi removido.');
  }
  
  rl.close();
});

rl.on('close', () => {
  console.log('\n👋 Processo de limpeza finalizado!\n');
  process.exit(0);
});
