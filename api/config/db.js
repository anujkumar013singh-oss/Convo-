import mongoose from 'mongoose';

const DEFAULT_MONGODB_URI = 'mongodb+srv://alonesurvivor03_db_user:Anuj1234@cluster0.qwgai2u.mongodb.net/convo?retryWrites=true&w=majority&appName=Cluster0';

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

  try {
    const conn = await mongoose.connect(uri, {
      dbName: 'convo',
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    const dbName = conn.connection?.name || 'convo';
    console.log(`[MongoDB] Atlas Connected to database "${dbName}": ${conn.connection?.host || 'Atlas'}`);
    return conn.connection;
  } catch (error) {
    console.error(`[MongoDB Error]: ${error.message}`);
    throw error;
  }
};

export default connectDB;
