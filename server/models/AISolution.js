import mongoose from 'mongoose';

const AISolutionSchema = new mongoose.Schema({
  issue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    required: true
  },
  analysis: {
    type: String,
    required: true
  },
  solution: {
    type: String,
    required: true
  },
  codeSnippets: [{
    filePath: String,
    originalCode: String,
    suggestedCode: String,
    lineNumbers: [Number]
  }],
  bestPractices: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('AISolution', AISolutionSchema);