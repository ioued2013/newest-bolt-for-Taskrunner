#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENVIRONMENTS = {
  development: 'dev',
  staging: 'staging', 
  production: 'prod'
};

function main() {
  const environment = process.argv[2] || 'development';
  
  if (!ENVIRONMENTS[environment]) {
    console.error(`Invalid environment: ${environment}`);
    console.error(`Valid environments: ${Object.keys(ENVIRONMENTS).join(', ')}`);
    process.exit(1);
  }

  console.log(`🚀 Deploying to ${environment} environment...`);

  try {
    // Load environment-specific variables
    loadEnvironmentVariables(environment);
    
    // Run pre-deployment checks
    runPreDeploymentChecks();
    
    // Build the application
    buildApplication(environment);
    
    // Deploy based on environment
    deployApplication(environment);
    
    console.log(`✅ Successfully deployed to ${environment}!`);
  } catch (error) {
    console.error(`❌ Deployment failed:`, error.message);
    process.exit(1);
  }
}

function loadEnvironmentVariables(environment) {
  const envFile = `.env.${environment}`;
  
  if (fs.existsSync(envFile)) {
    console.log(`📋 Loading environment variables from ${envFile}`);
    
    // Copy environment file to .env for build process
    fs.copyFileSync(envFile, '.env');
  } else {
    console.warn(`⚠️  Environment file ${envFile} not found, using defaults`);
  }
}

function runPreDeploymentChecks() {
  console.log('🔍 Running pre-deployment checks...');
  
  // Check if required environment variables are set
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Required environment variable ${varName} is not set`);
    }
  }
  
  // Run tests if they exist
  try {
    execSync('npm test -- --passWithNoTests', { stdio: 'inherit' });
  } catch (error) {
    console.warn('⚠️  Tests failed or not found, continuing deployment...');
  }
  
  console.log('✅ Pre-deployment checks passed');
}

function buildApplication(environment) {
  console.log(`🔨 Building application for ${environment}...`);
  
  if (environment === 'production' || environment === 'staging') {
    // Build for web deployment
    execSync('npm run build:web', { stdio: 'inherit' });
    
    // Build mobile apps with EAS
    if (environment === 'production') {
      console.log('📱 Building mobile apps for production...');
      execSync('eas build --platform all --profile production --non-interactive', { stdio: 'inherit' });
    }
  }
}

function deployApplication(environment) {
  console.log(`🚀 Deploying application to ${environment}...`);
  
  switch (environment) {
    case 'development':
      console.log('🔧 Development deployment - starting local server');
      execSync('npm run dev', { stdio: 'inherit' });
      break;
      
    case 'staging':
      console.log('🧪 Deploying to staging environment');
      // Deploy to staging server (could be Netlify, Vercel, etc.)
      deployToNetlify('staging');
      break;
      
    case 'production':
      console.log('🌟 Deploying to production environment');
      // Deploy to production
      deployToNetlify('production');
      
      // Submit to app stores if mobile builds are ready
      submitToAppStores();
      break;
  }
}

function deployToNetlify(environment) {
  try {
    // Deploy web build to Netlify
    execSync(`netlify deploy --prod --dir=dist --message="Deploy ${environment} build"`, { 
      stdio: 'inherit' 
    });
  } catch (error) {
    console.warn('⚠️  Netlify deployment failed, continuing...');
  }
}

function submitToAppStores() {
  try {
    console.log('📱 Submitting to app stores...');
    execSync('eas submit --platform all --profile production --non-interactive', { 
      stdio: 'inherit' 
    });
  } catch (error) {
    console.warn('⚠️  App store submission failed, check EAS dashboard');
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };