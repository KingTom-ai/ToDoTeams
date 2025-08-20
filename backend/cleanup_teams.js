const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Team = require('./models/Team');

async function cleanupTeams() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Remove all teams
    const result = await Team.deleteMany({});
    
    console.log(`Deleted ${result.deletedCount} team records`);
    
    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Cleanup failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

cleanupTeams();