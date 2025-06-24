#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n========================================');
console.log('🚀 Configuração do Ambiente de Desenvolvimento Local');
console.log('========================================\n');

const envLocalPath = path.join(__dirname, '.env.local');

// Verifica se o AWS CLI está configurado
let awsConfigured = false;
try {
  execSync('aws sts get-caller-identity', { stdio: 'ignore' });
  awsConfigured = true;
  console.log('✅ AWS CLI configurado');
} catch (e) {
  console.log('❌ AWS CLI não configurado ou credenciais inválidas');
}

// Função principal
async function setup() {
  // Verifica se .env.local já existe
  if (fs.existsSync(envLocalPath)) {
    console.log('⚠️  Arquivo .env.local já existe. Deseja sobrescrevê-lo? (s/N): ');
    const answer = await question('');
    if (answer.toLowerCase() !== 's') {
      console.log('🛑 Configuração cancelada.');
      return;
    }
  }

  // Cria variáveis para ambiente local
  const stage = await question('Estágio de desenvolvimento (dev/local) [local]: ') || 'local';
  const region = await question('Região AWS para recursos [us-east-1]: ') || 'us-east-1';
  const fromEmail = await question('Email padrão para envio: ');
  
  if (!fromEmail || !fromEmail.includes('@')) {
    console.log('❌ Email inválido. Por favor, forneça um email válido.');
    return;
  }
  
  const emailTable = await question('Nome da tabela DynamoDB para emails [sd-email-jobs-local]: ') || 'sd-email-jobs-local';
  const emailQueueName = await question('Nome da fila SQS para validação [sd-email-validation-queue-local]: ') || 'sd-email-validation-queue-local';
  const sendEmailQueueName = await question('Nome da fila SQS para envio [sd-email-send-queue-local]: ') || 'sd-email-send-queue-local';
  
  console.log('\n📧 Configuração do servidor SMTP:');
  const smtpHost = await question('Host SMTP: ');
  const smtpPort = await question('Porta SMTP [587]: ') || '587';
  const smtpUser = await question('Usuário SMTP: ');
  const smtpPass = await question('Senha SMTP: ');
  const smtpSecure = await question('Conexão segura (TLS) [false]: ') || 'false';
  
  const content = `# Configuração local para desenvolvimento
STAGE=${stage}
REGION=${region}
ENVIRONMENT=${stage}
DEFAULT_FROM_EMAIL=${fromEmail}
EMAIL_TABLE=${emailTable}
EMAIL_QUEUE_NAME=${emailQueueName}
SEND_EMAIL_QUEUE_NAME=${sendEmailQueueName}
LOG_LEVEL=debug

# Configurações SMTP
SMTP_HOST=${smtpHost}
SMTP_PORT=${smtpPort}
SMTP_USER=${smtpUser}
SMTP_PASS=${smtpPass}
SMTP_SECURE=${smtpSecure}
SMTP_REJECT_UNAUTHORIZED=true

# Configurações para o serverless-offline
IS_OFFLINE=true
DYNAMODB_LOCAL_PORT=8000
DYNAMODB_LOCAL_ENDPOINT=http://localhost:8000
`;

  fs.writeFileSync(envLocalPath, content);
  console.log('\n✅ Arquivo .env.local criado com sucesso!');
  
  // Instruções para configuração do AWS API
  if (!awsConfigured) {
    console.log('\n⚠️  Você precisa configurar o AWS CLI para desenvolvimento local:');
    console.log('   Execute: aws configure');
    console.log('   E forneça suas credenciais AWS');
  }

  console.log('\n📋 Para iniciar o desenvolvimento local:');
  console.log('1. Instale o DynamoDB local:');
  console.log('   npm install -g serverless-dynamodb-local');
  console.log('   serverless dynamodb install');
  console.log('2. Inicie o ambiente de desenvolvimento:');
  console.log('   npm run dev');
  console.log('\n📋 Para fazer deploy:');
  console.log('   npm run deploy:dev  # Para ambiente de desenvolvimento');
  console.log('   npm run deploy:prod # Para ambiente de produção');
}

// Helper para criar prompts de perguntas como Promises
function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

// Executa setup e fecha no final
setup()
  .catch(err => console.error(`❌ Erro: ${err.message}`))
  .finally(() => {
    console.log('\n👋 Configuração finalizada!');
    rl.close();
  });
