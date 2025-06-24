#!/usr/bin/env node

/**
 * Script para testar a conexão SMTP do Zoho
 * 
 * Este script carrega as variáveis de ambiente do env.dev.yml
 * e tenta enviar um email de teste usando as configurações SMTP
 */

const nodemailer = require('nodemailer');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function main() {
  console.log('🚀 Testando conexão SMTP do Zoho...\n');
  
  try {
    // Carrega configurações do env.dev.yml
    const envPath = path.join(__dirname, 'env.dev.yml');
    const envConfig = yaml.load(fs.readFileSync(envPath, 'utf8'));
    
    console.log('📧 Configurações SMTP encontradas:');
    console.log(`- Host: ${envConfig.SMTP_HOST}`);
    console.log(`- Porta: ${envConfig.SMTP_PORT}`);
    console.log(`- Usuário: ${envConfig.SMTP_USER}`);
    console.log(`- Remetente: ${envConfig.DEFAULT_FROM_EMAIL}`);
    console.log(`- SSL/TLS: ${envConfig.SMTP_SECURE ? 'Habilitado' : 'Desabilitado'}\n`);
    
    // Cria transportador SMTP
    const transporter = nodemailer.createTransport({
      host: envConfig.SMTP_HOST,
      port: envConfig.SMTP_PORT,
      secure: envConfig.SMTP_SECURE === true,
      auth: {
        user: envConfig.SMTP_USER,
        pass: envConfig.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: envConfig.SMTP_REJECT_UNAUTHORIZED === true
      }
    });
    
    console.log('🔄 Verificando conexão com o servidor SMTP...');
    
    // Verifica conexão SMTP
    await transporter.verify();
    console.log('✅ Conexão SMTP estabelecida com sucesso!\n');
    
    // Solicita email para teste
    const destinatario = await question('Email para enviar teste (deixe em branco para pular): ');
    
    if (destinatario && destinatario.includes('@')) {
      console.log(`\n📤 Enviando email de teste para ${destinatario}...`);
      
      // Prepara email de teste
      const info = await transporter.sendMail({
        from: `SDConsulta | Boas vindas!!! <${envConfig.DEFAULT_FROM_EMAIL}>`,
        // Headers especiais para ajudar na exibição da imagem de perfil
        headers: {
          'X-Entity-Ref-ID': `message-${Date.now()}`,
          'X-Avatar-URL': `https://www.gravatar.com/avatar/${crypto.createHash('md5').update(envConfig.DEFAULT_FROM_EMAIL.trim().toLowerCase()).digest('hex')}?s=80&d=mp`,
          'X-Gravatar-Email': envConfig.DEFAULT_FROM_EMAIL
        },
        to: destinatario,
        subject: 'Teste de API Descentralizada de Email',
        text: 'Este é um email de teste enviado pela API Descentralizada de Email.',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #0066cc;">Teste de Conexão SMTP</h2>
            <p>Este é um email de teste enviado pela <strong>API Descentralizada de Email</strong>.</p>
            <p>Configurações utilizadas:</p>
            <ul>
              <li>Servidor: ${envConfig.SMTP_HOST}</li>
              <li>Porta: ${envConfig.SMTP_PORT}</li>
              <li>Remetente: ${envConfig.DEFAULT_FROM_EMAIL}</li>
              <li>Data e Hora: ${new Date().toLocaleString()}</li>
            </ul>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              Este é um email automático, por favor não responda.
            </p>
          </div>
        `
      });
      
      console.log('✅ Email enviado com sucesso!');
      console.log(`📝 ID da mensagem: ${info.messageId}`);
    } else if (destinatario) {
      console.log('❌ Endereço de email inválido. Teste de envio pulado.');
    } else {
      console.log('ℹ️ Teste de envio de email pulado.');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar conexão SMTP:');
    console.error(error);
    process.exit(1);
  }
}

// Função auxiliar para perguntas
function question(query) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    readline.question(query, answer => {
      readline.close();
      resolve(answer);
    });
  });
}

// Executa script
main().catch(console.error).finally(() => {
  console.log('\n👋 Teste SMTP concluído!\n');
});
