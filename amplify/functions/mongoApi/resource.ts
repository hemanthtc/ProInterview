import { defineFunction } from '@aws-amplify/backend';

export const mongoApi = defineFunction({
  name: 'mongoApi',
  entry: './handler.ts',
  timeoutSeconds: 30,
  environment: {
    MONGODB_URI: process.env.MONGODB_URI || '',
  },
});
