import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { mongoApi } from './functions/mongoApi/resource';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  mongoApi,
});

// Create custom VPC with 1 NAT Gateway & Elastic IP for dedicated static IP egress
const customVpcStack = backend.createStack('CustomVPCStack');

export const vpc = new ec2.Vpc(customVpcStack, 'AmplifyVpc', {
  maxAzs: 2,
  natGateways: 1, // Automatically provisions 1 NAT Gateway with a dedicated Elastic IP
  subnetConfiguration: [
    {
      cidrMask: 24,
      name: 'Public',
      subnetType: ec2.SubnetType.PUBLIC,
    },
    {
      cidrMask: 24,
      name: 'Private',
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    },
  ],
});

// Create Security Group inside the VPC allowing outbound traffic
const lambdaSecurityGroup = new ec2.SecurityGroup(customVpcStack, 'LambdaSecurityGroup', {
  vpc,
  description: 'Allow outbound connections to MongoDB Atlas via NAT Gateway',
  allowAllOutbound: true,
});

// Configure Lambda function VPC Config (Subnets & Security Group)
const cfnFunction = backend.mongoApi.resources.cfnResources.cfnFunction;
cfnFunction.vpcConfig = {
  subnetIds: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds,
  securityGroupIds: [lambdaSecurityGroup.securityGroupId],
};

// Attach VPC Access Execution policy so Lambda can create ENIs inside VPC subnets
backend.mongoApi.resources.lambda.role?.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
);




