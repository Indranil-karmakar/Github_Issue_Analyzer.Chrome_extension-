// Import config first to ensure environment variables are loaded
import { PORT, MONGO_URI } from './config.js';

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Import routes
import issueRoutes from './routes/issueRoutes.js';
import repoRoutes from './routes/repoRoutes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/issues', issueRoutes);
app.use('/api/repos', repoRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'GitHub Issue Analyzer API' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

