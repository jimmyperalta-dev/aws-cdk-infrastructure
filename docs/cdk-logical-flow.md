# Logical Flow of the AWS CDK Infrastructure

## 1. Infrastructure Deployment Flow

The deployment process begins with AWS CDK, which orchestrates the creation of all required AWS resources in the correct sequence:

1. **VPC and Network Resources**:
   - VPC with CIDR block 10.0.0.0/16
   - Two public subnets across different Availability Zones
   - Internet Gateway for external connectivity
   - Route tables with routes to the Internet Gateway
   - Security groups for the ALB and ECS tasks

2. **Load Balancer Configuration**:
   - Application Load Balancer deployed across multiple subnets
   - Target group configured with health check path `/`
   - Listener configured on port 80

3. **ECS Cluster and Task Definition**:
   - ECS Cluster created as a logical grouping for tasks
   - Task Definition specifying:
     * Nginx container image
     * CPU and memory requirements
     * Port mappings
     * IAM Task Execution Role
     * Logging configuration

4. **ECS Service Deployment**:
   - Service created with desired task count
   - Tasks deployed using Fargate launch type
   - Tasks registered with ALB target group
   - Service configured to maintain desired task count

## 2. Request-Response Cycle

When a user accesses the application, the request follows this path:

1. **Client Request**:
   - User sends HTTP request to the load balancer DNS name
   - Request arrives at the Internet Gateway and routes to the ALB

2. **Load Balancing**:
   - ALB receives the request on port 80
   - ALB routes the request to a healthy container based on target group
   - ALB maintains sticky sessions if configured

3. **Container Processing**:
   - Container receives the request on port 80
   - Nginx web server processes the request
   - For root endpoint (`/`), Nginx returns its default page
   - For health check, Nginx returns HTTP 200 status

4. **Response Journey**:
   - Container generates HTTP response with content
   - Response travels back through ALB
   - Response arrives at client browser/application

## 3. Health Monitoring Flow

The system maintains health through a continuous monitoring cycle:

1. **Health Checks**:
   - ALB performs regular health checks to `/` endpoint
   - Containers must respond with HTTP 200 status
   - Unhealthy containers are removed from rotation

2. **Auto Recovery**:
   - ECS service monitors running task count
   - If tasks fail health checks, new tasks are launched
   - Service maintains the desired number of healthy tasks

3. **Logging and Monitoring**:
   - Containers stream logs to CloudWatch Logs
   - Container failures and start/stop events are recorded
   - Task state changes trigger ECS service events

## 4. Security Flow

Security controls are applied at multiple layers:

1. **Network Security**:
   - VPC isolation of resources
   - Security groups restricting traffic:
     * ALB security group allows HTTP on port 80 from internet
     * ECS task security group allows traffic only from ALB

2. **Identity and Access Management**:
   - Task Execution Role with permissions to:
     * Pull images from ECR
     * Write logs to CloudWatch
     * Limited to principle of least privilege

3. **Container Security**:
   - Container runs as non-root user
   - No SSH access to container or underlying infrastructure
   - Nginx server runs with appropriate permissions

## 5. Infrastructure as Code Flow

AWS CDK enables a developer-friendly approach to infrastructure:

1. **Code to Infrastructure**:
   - JavaScript code defines all infrastructure components
   - CDK synthesizes CloudFormation templates
   - CloudFormation provisions resources in AWS

2. **Version Control**:
   - Infrastructure code stored in Git repository
   - Changes tracked and reviewed like application code
   - Infrastructure history maintained

3. **Testing and Validation**:
   - Infrastructure defined with typed constructs
   - Validation occurs during synthesis
   - Errors caught before deployment

4. **Updates and Rollbacks**:
   - Changes applied as unified stack updates
   - Failed deployments automatically rolled back
   - Infrastructure state maintained consistently

This AWS CDK-managed architecture demonstrates how infrastructure as code can define a complete, secure, and scalable application environment.
