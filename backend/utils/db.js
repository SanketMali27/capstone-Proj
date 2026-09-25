const DEFAULT_DEV_MONGODB_URI = 'mongodb://127.0.0.1:27017/foodbridge';

const getMongoUri = () => {
  const envUri = process.env.MONGODB_URI?.trim();

  if (envUri) {
    return envUri;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('MONGODB_URI is required in production');
  }

  return DEFAULT_DEV_MONGODB_URI;
};

const isAtlasUri = (uri) => uri.includes('mongodb+srv://') || uri.includes('.mongodb.net');

const isLocalUri = (uri) => /localhost|127\.0\.0\.1/.test(uri);

const describeMongoTarget = (uri) => {
  if (isAtlasUri(uri)) {
    return 'MongoDB Atlas';
  }

  if (isLocalUri(uri)) {
    return 'local MongoDB';
  }

  return 'MongoDB';
};

const buildMongoHelp = (uri, error) => {
  const help = [];

  if (error?.name === 'MongooseServerSelectionError') {
    help.push('Mongoose could not reach a primary server within the selection timeout.');
  }

  if (isAtlasUri(uri)) {
    help.push(
      'This app is currently using a MongoDB Atlas URI.',
      'If you want to keep Atlas for development, add this machine IP to Atlas Network Access and verify the database user credentials in backend/.env.',
      'If you want local development, change MONGODB_URI in backend/.env to mongodb://127.0.0.1:27017/foodbridge and start MongoDB locally.'
    );
  } else if (isLocalUri(uri)) {
    help.push(
      'This app is currently using a local MongoDB URI.',
      'Start MongoDB locally so port 27017 is available, or change MONGODB_URI in backend/.env to a reachable Atlas/local instance.'
    );
  } else {
    help.push('Verify that MONGODB_URI in backend/.env points to a reachable MongoDB instance.');
  }

  return help.join('\n');
};

const connectToDatabase = async (mongoose) => {
  const mongoUri = getMongoUri();

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000
    });

    console.log(`MongoDB connected to ${describeMongoTarget(mongoUri)}`);
    return mongoUri;
  } catch (error) {
    const wrappedError = new Error(
      `Failed to connect to ${describeMongoTarget(mongoUri)}.\n${buildMongoHelp(mongoUri, error)}`
    );
    wrappedError.cause = error;
    throw wrappedError;
  }
};

module.exports = {
  DEFAULT_DEV_MONGODB_URI,
  connectToDatabase,
  getMongoUri
};
