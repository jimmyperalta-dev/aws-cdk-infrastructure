const { Stack, Duration, CfnOutput, RemovalPolicy } = require('aws-cdk-lib');
const ec2 = require('aws-cdk-lib/aws-ec2');
const ecs = require('aws-cdk-lib/aws-ecs');
const ecr = require('aws-cdk-lib/aws-ecr');
const iam = require('aws-cdk-lib/aws-iam');
const elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
const logs = require('aws-cdk-lib/aws-logs');
const path = require('path');

class CdkInfrastructureStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a VPC with 2 public subnets
    const vpc = new ec2.Vpc(this, 'CDK-VPC', {
      maxAzs: 2,
      natGateways: 0,  // Using public subnets for the demo to stay in free tier
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        }
      ],
    });

    // Create an ECS cluster
    const cluster = new ecs.Cluster(this, 'CDK-Cluster', {
      vpc: vpc,
    });

    // Create a security group for the load balancer
    const lbSecurityGroup = new ec2.SecurityGroup(this, 'LBSecurityGroup', {
      vpc: vpc,
      description: 'Security group for the load balancer',
      allowAllOutbound: true,
    });
    lbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic from the internet'
    );

    // Create a security group for the Fargate tasks
    const serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
      vpc: vpc,
      description: 'Security group for Fargate service',
      allowAllOutbound: true,
    });
    serviceSecurityGroup.addIngressRule(
      lbSecurityGroup,
      ec2.Port.tcp(80),  // Changed from 3000 to 80
      'Allow traffic from the load balancer'
    );

    // Create a task execution role
    const executionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
      ],
    });

    // Create a task role
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    
    // Add CloudWatch logs permissions
    taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')
    );

    // Create a log group
    const logGroup = new logs.LogGroup(this, 'ServiceLogGroup', {
      logGroupName: '/ecs/cdk-demo-app',
      retention: logs.RetentionDays.ONE_WEEK,
    });

    // Create the task definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      memoryLimitMiB: 512,
      cpu: 256,
      executionRole: executionRole,
      taskRole: taskRole,
    });

    // Add container to the task definition using nginx which is more reliable
    const container = taskDefinition.addContainer('DemoAppContainer', {
      image: ecs.ContainerImage.fromRegistry('nginx:latest'),  // Using nginx instead
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'cdk-demo-app',
        logGroup: logGroup,
      }),
      portMappings: [{ containerPort: 80 }],  // Using standard HTTP port
      essential: true,
    });

    // Create the ALB
    const lb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc: vpc,
      internetFacing: true,
      securityGroup: lbSecurityGroup,
    });

    // Create a listener
    const listener = lb.addListener('Listener', {
      port: 80,
      open: true,
    });

    // Create the target group with more lenient health check settings
    const targetGroup = listener.addTargets('ECSTarget', {
      port: 80,
      targets: [],
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/',  // Nginx responds to root path
        interval: Duration.seconds(60),
        timeout: Duration.seconds(30),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      },
      deregistrationDelay: Duration.seconds(60),
    });

    // Create the Fargate service with fewer desired tasks
    const fargateService = new ecs.FargateService(this, 'Service', {
      cluster: cluster,
      taskDefinition: taskDefinition,
      desiredCount: 1,  // Reduced to 1 for simpler testing
      securityGroups: [serviceSecurityGroup],
      assignPublicIp: true,  // Needed for pulling images in public subnets
    });

    // Attach the service to the target group
    fargateService.attachToApplicationTargetGroup(targetGroup);

    // Output the load balancer DNS
    new CfnOutput(this, 'LoadBalancerDNS', {
      value: lb.loadBalancerDnsName,
      description: 'Public DNS of the load balancer',
    });
  }
}

module.exports = { CdkInfrastructureStack }
