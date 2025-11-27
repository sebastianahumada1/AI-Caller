#!/usr/bin/env node

/**
 * Script para verificar que todo esté listo para desplegar en Vercel
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkExists(filePath, description) {
  const fullPath = path.join(rootDir, filePath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    log(`✓ ${description}`, 'green');
    return true;
  } else {
    log(`✗ ${description} (falta: ${filePath})`, 'red');
    return false;
  }
}

function checkFileContent(filePath, description, searchString) {
  const fullPath = path.join(rootDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    log(`✗ ${description} - Archivo no existe`, 'red');
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const hasContent = content.includes(searchString);
  
  if (hasContent) {
    log(`✓ ${description}`, 'green');
    return true;
  } else {
    log(`⚠ ${description} - No contiene '${searchString}'`, 'yellow');
    return false;
  }
}

async function main() {
  log('\n🔍 Verificando configuración para Vercel...\n', 'blue');
  
  let allGood = true;
  
  // 1. Verificar archivos de configuración
  log('📋 Archivos de Configuración:', 'blue');
  allGood &= checkExists('vercel.json', 'vercel.json existe');
  allGood &= checkExists('package.json', 'package.json existe');
  allGood &= checkExists('tsconfig.json', 'tsconfig.json existe');
  allGood &= checkExists('.vercelignore', '.vercelignore existe');
  
  console.log();
  
  // 2. Verificar archivos fuente
  log('📁 Archivos Fuente:', 'blue');
  allGood &= checkExists('src/server.ts', 'Servidor principal existe');
  allGood &= checkExists('src/vapi.ts', 'Handler de Vapi existe');
  allGood &= checkExists('src/ghl.ts', 'Cliente de GHL existe');
  allGood &= checkExists('api/index.js', 'Punto de entrada de Vercel existe');
  
  console.log();
  
  // 3. Verificar archivos compilados
  log('🔨 Archivos Compilados:', 'blue');
  const distExists = checkExists('dist/server.js', 'Servidor compilado existe');
  
  if (!distExists) {
    log('   Ejecuta: npm run build', 'yellow');
    allGood = false;
  }
  
  console.log();
  
  // 4. Verificar contenido de archivos críticos
  log('🔧 Contenido de Archivos:', 'blue');
  checkFileContent('api/index.js', 'api/index.js importa desde dist', 'dist/server.js');
  checkFileContent('src/server.ts', 'server.ts exporta app', 'export default app');
  checkFileContent('vercel.json', 'vercel.json tiene rewrites', 'rewrites');
  
  console.log();
  
  // 5. Verificar package.json
  log('📦 Dependencias:', 'blue');
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8')
    );
    
    const requiredDeps = ['express', 'cors', 'axios', 'dotenv', 'zod'];
    const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
    
    if (missingDeps.length === 0) {
      log('✓ Todas las dependencias requeridas están instaladas', 'green');
    } else {
      log(`✗ Faltan dependencias: ${missingDeps.join(', ')}`, 'red');
      allGood = false;
    }
    
    if (packageJson.scripts.build) {
      log('✓ Script de build configurado', 'green');
    } else {
      log('✗ Script de build no encontrado', 'red');
      allGood = false;
    }
  } catch (error) {
    log('✗ Error leyendo package.json', 'red');
    allGood = false;
  }
  
  console.log();
  
  // 6. Advertencias sobre variables de entorno
  log('⚙️  Variables de Entorno Requeridas (configura en Vercel):', 'blue');
  log('   • WEBHOOK_TOKEN', 'yellow');
  log('   • VAPI_API_KEY', 'yellow');
  log('   • GHL_API_KEY', 'yellow');
  log('   • (Opcionales) GHL_API_KEY_SECONDARY, GHL_API_KEY_THIRD, etc.', 'yellow');
  log('   • (Opcional) SLACK_BOT_TOKEN, SLACK_CHANNEL_ID', 'yellow');
  
  console.log();
  
  // 7. Verificar si hay archivo .env (advertencia)
  if (fs.existsSync(path.join(rootDir, '.env'))) {
    log('⚠️  Advertencia: Archivo .env detectado', 'yellow');
    log('   Asegúrate de que .env NO esté en tu repositorio Git', 'yellow');
    log('   Configura las variables de entorno directamente en Vercel', 'yellow');
    console.log();
  }
  
  // 8. Resumen final
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  
  if (allGood) {
    log('\n✅ Todo listo para desplegar en Vercel!\n', 'green');
    log('Pasos siguientes:', 'blue');
    log('1. Sube tu código a GitHub', 'reset');
    log('2. Importa el proyecto en Vercel (vercel.com)', 'reset');
    log('3. Configura las variables de entorno en Vercel', 'reset');
    log('4. Despliega!\n', 'reset');
    log('O usa: vercel --prod\n', 'blue');
  } else {
    log('\n❌ Hay algunos problemas que debes resolver primero\n', 'red');
    log('Revisa los errores arriba y corrígelos antes de desplegar\n', 'reset');
  }
  
  log('Para más información, lee: VERCEL_DEPLOY.md\n', 'blue');
}

main().catch(console.error);

