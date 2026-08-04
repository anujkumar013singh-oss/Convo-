import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'convo',
      autoIndex: true,
    });
    console.log(`[MongoDB] Atlas Connected to database "${conn.connection.db.databaseName}": ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Error] ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
