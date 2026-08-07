export const handler = async (event: any) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'MongoDB Handler executed via VPC NAT Gateway!' }),
  };
};
