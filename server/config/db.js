import mongoose from 'mongoose';

export const connectDB = async () => {
  // If connection is already established, reuse it (Vercel Serverless connection pooling)
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined in Vercel settings.');
  }

  try {
    const conn = await mongoose.connect(uri, {
      dbName: 'convo',
      autoIndex: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s if Atlas is unreachable
    });
    console.log(`[MongoDB] Atlas Connected to database "${conn.connection.db.databaseName}": ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    console.error(`[MongoDB Error]: ${error.message}`);
    throw error;
  }
};

export default connectDB;
