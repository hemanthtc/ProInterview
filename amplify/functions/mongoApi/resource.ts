import { defineFunction } from '@aws-amplify/backend';

export const mongoApi = defineFunction({
  name: 'mongoApi',
  entry: './handler.ts',
});
