#!/usr/bin/env node

/**
 * Script para verificar a configuração do Gravatar
 * 
 * Este script verifica se existe uma imagem configurada no Gravatar
 * para o endereço de email usado como remetente
 */

const crypto = require('crypto');
const https = require('https');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Carrega configurações do env.dev.yml
const envPath = path.join(__dirname, 'env.dev.yml');
const envConfig = yaml.load(fs.readFileSync(envPath, 'utf8'));

// Email para verificar
const email = envConfig.DEFAULT_FROM_EMAIL;

// Cria hash MD5 do email (usado pelo Gravatar)
const emailHash = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');

// URL do Gravatar
const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=404`;

console.log('🔍 Verificando Gravatar para o email:', email);
console.log('📧 Hash MD5 do email:', emailHash);
console.log('🖼️ URL do Gravatar:', gravatarUrl);

// Função para verificar se existe uma imagem no Gravatar
function checkGravatar(url) {
  return new Promise((resolve) => {
    const request = https.get(url, (response) => {
      if (response.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
      response.resume();
    });
    
    request.on('error', () => {
      resolve(false);
    });
  });
}

// Executa a verificação
async function main() {
  const hasGravatar = await checkGravatar(gravatarUrl);
  
  if (hasGravatar) {
    console.log('✅ Gravatar encontrado! A imagem está configurada.');
    console.log(`\nPara visualizar a imagem, acesse:\n${gravatarUrl}`);
  } else {
    console.log('❌ Gravatar não encontrado para este email.');
    console.log('\nPara configurar uma imagem:');
    console.log('1. Acesse https://gravatar.com');
    console.log(`2. Crie uma conta com o email ${email}`);
    console.log('3. Faça upload da sua logo ou imagem');
  }
  
  console.log('\n💡 Dica: Depois de configurar o Gravatar, pode levar alguns minutos para a imagem ficar disponível.');
}

main().catch(console.error);
