import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
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

