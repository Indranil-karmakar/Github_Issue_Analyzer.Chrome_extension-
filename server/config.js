// config.js - Load environment variables before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Export environment variables for use in other modules
export const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
export const MONGO_URI = process.env.MONGO_URI;
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const PORT = process.env.PORT || 3001;

console.log('Environment variables loaded in config.js:', {
  GITHUB_TOKEN_EXISTS: !!GITHUB_TOKEN,
  MONGO_URI_EXISTS: !!MONGO_URI,
  GEMINI_API_KEY_EXISTS: !!GEMINI_API_KEY
});