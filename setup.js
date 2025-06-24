#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n========================================');
console.log('🚀 Setup da API Serverless de Email Descentralizada');
console.log('========================================\n');

const envLocalPath = path.join(__dirname, '.env.local');

// Verifica se .env.local já existe
if (fs.existsSync(envLocalPath)) {
  console.log('⚠️  Arquivo .env.local já existe. Deseja sobrescrevê-lo? (s/N): ');
  rl.question('', (answer) => {
    if (answer.toLowerCase() === 's') {
      createEnvFile();
    } else {
      console.log('🛑 Configuração cancelada.');
      rl.close();
    }
  });
} else {
  createEnvFile();
}

function createEnvFile() {
  rl.question('Estágio de desenvolvimento (dev/prod) [dev]: ', (stage) => {
    const selectedStage = stage || 'dev';
    
    rl.question('Email padrão para envio (deve ser verificado no SES): ', (email) => {
      if (!email || !email.includes('@')) {
        console.log('❌ Email inválido. Por favor, forneça um email válido.');
        rl.close();
        return;
      }
      
      const content = `# Configurações do ambiente Serverless
STAGE=${selectedStage}

# Email Padrão para Envio (SES deve estar verificado para este domínio)
DEFAULT_FROM_EMAIL=${email}

# Logging
LOG_LEVEL=info
`;

      fs.writeFileSync(envLocalPath, content);
      console.log('\n✅ Arquivo .env.local criado com sucesso!');
      console.log('\n📋 Próximos passos:');
      console.log('1. Configure suas credenciais AWS usando o AWS CLI (aws configure)');
      console.log('2. Execute `npm run dev` para iniciar o servidor local');
      console.log('3. Execute `npm run deploy:dev` para fazer o deploy na AWS\n');
      
      rl.close();
    });
  });
}

rl.on('close', () => {
  console.log('\n👋 Obrigado por usar a API Serverless de Email Descentralizada!\n');
  process.exit(0);
});
