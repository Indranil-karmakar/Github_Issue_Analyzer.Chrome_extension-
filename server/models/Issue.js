import mongoose from 'mongoose';

const IssueSchema = new mongoose.Schema({
  repositoryUrl: {
    type: String,
    required: true,
    trim: true
  },
  // Fields for indexing
  repoOwner: {
    type: String,
    index: true,
    sparse: true
  },
  repoName: {
    type: String,
    index: true,
    sparse: true
  },
  issueId: {
    type: String,
    index: true,
    sparse: true
  },
  issueNumber: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  fileReferences: [{
    path: String,
    lineNumbers: [Number]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Function to extract repository owner and name from URL and set issueId
function processIssueData(doc) {
  // Initialize fields with default values to prevent null index entries
  doc.repoOwner = doc.repoOwner || 'unknown';
  doc.repoName = doc.repoName || 'unknown';
  doc.issueId = doc.issueId || 'unknown';
  
  if (doc.repositoryUrl) {
    try {
      const url = new URL(doc.repositoryUrl);
      const pathParts = url.pathname.split('/');
      if (pathParts.length >= 3) {
        doc.repoOwner = pathParts[1];
        doc.repoName = pathParts[2];
        
        // Set issueId based on issueNumber
        if (doc.issueNumber) {
          // Handle AI-generated issue numbers (strings that start with 'AI-')
          if (typeof doc.issueNumber === 'string' && doc.issueNumber.startsWith('AI-')) {
            doc.issueId = doc.issueNumber;
          } else {
            doc.issueId = String(doc.issueNumber);
          }
        }
      }
    } catch (err) {
      console.warn('Could not parse repository URL:', err.message);
      // Keep the default values set above
    }
  }
  return doc;
}

// Extract repository owner and name from URL for indexing on save
IssueSchema.pre('save', function(next) {
  processIssueData(this);
  next();
});

// Handle findOneAndUpdate operations
IssueSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  // Only process if we have the necessary fields
  if (update && update.repositoryUrl) {
    const doc = processIssueData(update);
    this.setUpdate(doc);
  }
  
  next();
});

// Add sparse index to allow null values
IssueSchema.index({ repoOwner: 1, repoName: 1, issueId: 1 }, { sparse: true });

export default mongoose.model('Issue', IssueSchema);