import express from 'express';
import { GitHubService, IssueAnalyzerService } from '../services/index.js';

const router = express.Router();
const issueAnalyzer = new IssueAnalyzerService();

// Initialize GitHub service with API token (will work without token for public repos)
const githubService = new GitHubService(process.env.GITHUB_TOKEN);

/**
 * @route   GET /api/repos/:repoUrl/analyze
 * @desc    Analyze a repository for potential issues
 * @access  Public
 */
router.get('/:repoUrl/analyze', async (req, res) => {
  try {
    console.log('Repository analysis request received');
    const repoUrl = decodeURIComponent(req.params.repoUrl);
    console.log(`Analyzing repository: ${repoUrl}`);
    
    // Fetch repository contents
    console.log('Fetching repository contents...');
    const repoContents = await githubService.fetchRepoContents(repoUrl);
    console.log(`Retrieved ${repoContents.length} files from repository`);
    
    // Filter for code files only (exclude binaries, images, etc.)
    const codeFileExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', 
      '.go', '.rb', '.php', '.html', '.css', '.scss', '.json', '.yml', '.yaml'
    ];
    
    console.log('Filtering for code files...');
    const codeFiles = repoContents.filter(file => {
      // Check if path contains a dot to avoid errors with files without extensions
      if (file.path.includes('.')) {
        const extension = file.path.substring(file.path.lastIndexOf('.'));
        return codeFileExtensions.includes(extension);
      }
      return false;
    });
    console.log(`Found ${codeFiles.length} code files`);
    
    // Limit to a reasonable number of files to analyze
    const filesToAnalyze = codeFiles.slice(0, 10);
    console.log(`Selected ${filesToAnalyze.length} files for analysis`);
    
    // Fetch content for each file and analyze
    const analysisResults = [];
    
    console.log('Beginning file analysis...');
    for (const file of filesToAnalyze) {
      try {
        console.log(`Analyzing file: ${file.path}`);
        const content = await githubService.fetchFileContent(repoUrl, file.path);
        const issues = issueAnalyzer.analyzeCode(content);
        
        console.log(`Found ${issues.length} issues in ${file.path}`);
        if (issues.length > 0) {
          // For each issue in the file, create a separate analysis result
          issues.forEach(issue => {
            analysisResults.push({
              filePath: file.path,
              issueType: issue.type,
              description: issue.description,
              severity: issue.severity,
              lineNumbers: [] // We don't have line numbers from the analyzer yet
            });
          });
        }
      } catch (err) {
        console.warn(`Could not analyze ${file.path}:`, err.message);
      }
    }
    
    console.log(`Analysis complete. Found issues in ${analysisResults.length} files`);
    
    // Save AI-generated issues to the database
    const Issue = (await import('../models/Issue.js')).default;
    const savedIssues = [];
    
    for (let i = 0; i < analysisResults.length; i++) {
      const item = analysisResults[i];
      const aiIssueNumber = `AI-${i + 1}`;
      
      // Create or update the AI issue in the database
      const aiIssue = await Issue.findOneAndUpdate(
        { repositoryUrl: repoUrl, issueNumber: aiIssueNumber },
        {
          repositoryUrl: repoUrl,
          issueNumber: aiIssueNumber,
          title: `Code Issue: ${item.issueType || 'Code smell detected'}`,
          body: item.description || 'Potential code issue detected by automated analysis',
          state: 'open',
          fileReferences: [
            {
              path: item.filePath,
              lineNumbers: item.lineNumbers || []
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        { new: true, upsert: true }
      );
      
      savedIssues.push(aiIssue);
    }
    
    const response = {
      repositoryUrl: repoUrl,
      filesAnalyzed: filesToAnalyze.length,
      totalFiles: codeFiles.length,
      analysisResults
    };
    
    console.log('Saving AI issues to database and sending analysis results to client');
    res.json(response);
  } catch (error) {
    console.error('Error analyzing repository:', error);
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Error analyzing repository';
    
    if (error.name === 'CastError') {
      errorMessage = `Invalid data format: ${error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
});

export default router;