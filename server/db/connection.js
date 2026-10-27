const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const env = require('../config/env');
const { seedDatabase } = require('./seed');

let mongodInstance = null;
let isConnected = false;

async function connectDB() {
  if (isConnected) return mongoose.connection;

  const mongoUri = env.MONGODB_URI;

  if (mongoUri && mongoUri.trim().length > 0) {
    try {
      console.log('🔄 Attempting connection to configured MongoDB URI...');
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      isConnected = true;
      console.log('✅ Connected to MongoDB via MONGODB_URI successfully.');
      await seedDatabase();
      return mongoose.connection;
    } catch (err) {
      console.warn('⚠️ Could not connect to external MongoDB URI:', err.message);
      console.log('🔄 Falling back to embedded MongoMemoryServer for standalone zero-config execution...');
    }
  }

  // Fallback to in-memory MongoDB
  try {
    console.log('🚀 Initializing embedded In-Memory MongoDB Server...');
    mongodInstance = await MongoMemoryServer.create();
    const inMemoryUri = mongodInstance.getUri();
    await mongoose.connect(inMemoryUri);
    isConnected = true;
    console.log(`✅ Connected to In-Memory MongoDB successfully at ${inMemoryUri}`);
    await seedDatabase();
    return mongoose.connection;
  } catch (err) {
    console.error('❌ Failed to initialize MongoDB connection:', err);
    throw err;
  }
}

async function disconnectDB() {
  if (!isConnected) return;
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
      mongodInstance = null;
    }
    isConnected = false;
    console.log('🔌 MongoDB connection closed gracefully.');
  } catch (err) {
    console.error('Error disconnecting MongoDB:', err);
  }
}

function getConnectionStatus() {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    isInMemory: !!mongodInstance,
    host: mongoose.connection.host || 'unknown',
  };
}

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
};
