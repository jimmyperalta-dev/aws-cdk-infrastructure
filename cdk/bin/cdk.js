#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { CdkInfrastructureStack } = require('../lib/cdk-stack');

const app = new cdk.App();
new CdkInfrastructureStack(app, 'CdkInfrastructureStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
  description: 'Infrastructure as Code using AWS CDK',
  tags: {
    Project: 'CDK-Infrastructure',
    Environment: 'Demo',
    ManagedBy: 'CDK'
  }
});
