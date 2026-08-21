/**
 * MongoDB connection via Mongoose
 *
 * Mongoose is an ODM (Object Document Mapper): it maps JS objects
 * to MongoDB documents and enforces schemas, validation, and indexes.
 *
 * Set MONGODB_URI=memory in .env to spin up an ephemeral in-memory
 * MongoDB (dev only) when you do not have a local mongod / Docker.
 */
const mongoose = require('mongoose');

async function connectDB() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  if (uri === 'memory' || uri === 'memory://') {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    uri = mongod.getUri('quizapp');
    console.log('Using in-memory MongoDB (development only)');
  }

  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    family: 4,
    autoSelectFamily: false,
});
  console.log(`MongoDB connected: ${conn.connection.host}`);
  return conn;
}

module.exports = connectDB;
