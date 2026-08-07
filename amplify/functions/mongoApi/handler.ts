import mongoose from 'mongoose';

let conn: typeof mongoose | null = null;

export const handler = async (event: any) => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'MONGODB_URI environment variable is missing' }),
    };
  }

  try {
    if (!conn || mongoose.connection.readyState !== 1) {
      conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
      });
      console.log('Successfully connected to MongoDB Atlas via VPC NAT Gateway!');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Connected to MongoDB Atlas via VPC NAT Gateway (Static IP 65.0.249.226)',
        readyState: mongoose.connection.readyState,
      }),
    };
  } catch (error: any) {
    console.error('MongoDB VPC Connection Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to connect to MongoDB Atlas',
      }),
    };
  }
};
