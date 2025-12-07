import express from 'express';
import { Issue, AISolution } from '../models/index.js';
import { GitHubService, IssueAnalyzerService, GeminiService } from '../services/index.js';
import { GITHUB_TOKEN, GEMINI_API_KEY } from '../config.js';

const router = express.Router();
const issueAnalyzer = new IssueAnalyzerService();

// Initialize services with API tokens from config
console.log('GitHub Token in routes:', GITHUB_TOKEN ? 'Token exists' : 'Token missing');
const githubService = new GitHubService(GITHUB_TOKEN);
const geminiService = new GeminiService(GEMINI_API_KEY);

/**
 * @route   GET /api/issues/:repoUrl
 * @desc    Get all issues for a repository
 * @access  Public
 */
router.get('/:repoUrl', async (req, res) => {
  try {
    const repoUrl = decodeURIComponent(req.params.repoUrl);
    
    // Check if we already have issues for this repo in the database
    let issues = await Issue.find({ repositoryUrl: repoUrl }).sort({ createdAt: -1 });
    
    // If no issues in DB or force refresh requested, fetch from GitHub
    if (issues.length === 0 || req.query.refresh === 'true') {
      const githubIssues = await githubService.fetchIssues(repoUrl);
      
      // Process each issue to extract file references
      const processedIssues = githubIssues.map(issue => {
        const fileReferences = issueAnalyzer.extractFileReferences(issue.body);
        return {
          repositoryUrl: repoUrl,
          issueNumber: issue.issueNumber,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          fileReferences,
          createdAt: new Date(issue.createdAt),
          updatedAt: new Date(issue.updatedAt)
        };
      });
      
      // Save to database (upsert)
      for (const issue of processedIssues) {
        await Issue.findOneAndUpdate(
          { repositoryUrl: issue.repositoryUrl, issueNumber: issue.issueNumber },
          issue,
          { upsert: true, new: true }
        );
      }
      
      // Fetch updated issues from database
      issues = await Issue.find({ repositoryUrl: repoUrl }).sort({ createdAt: -1 });
    }
    
    res.json(issues);
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/issues/:repoUrl/create-ai-issue
 * @desc    Create an AI-generated issue
 * @access  Public
 */
router.post('/:repoUrl/create-ai-issue', async (req, res) => {
  try {
    const repoUrl = decodeURIComponent(req.params.repoUrl);
    const { title, body, fileReferences = [] } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }
    
    // Find the highest AI issue number for this repo
    const highestAIIssue = await Issue.findOne(
      { 
        repositoryUrl: repoUrl,
        issueNumber: { $regex: /^AI-\d+$/ }
      }
    ).sort({ issueNumber: -1 });
    
    // Generate new AI issue number
    let nextAINumber = 1;
    if (highestAIIssue) {
      const currentNumber = parseInt(highestAIIssue.issueNumber.split('-')[1], 10);
      nextAINumber = currentNumber + 1;
    }
    
    const aiIssueNumber = `AI-${nextAINumber}`;
    
    // Create the new AI issue
    const newIssue = await Issue.create({
      repositoryUrl: repoUrl,
      issueNumber: aiIssueNumber,
      title,
      body,
      state: 'open',
      fileReferences,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    res.status(201).json(newIssue);
  } catch (error) {
    console.error('Error creating AI issue:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/issues/:repoUrl/:issueNumber
 * @desc    Get a specific issue with AI analysis
 * @access  Public
 */
router.get('/:repoUrl/:issueNumber', async (req, res) => {
  try {
    const repoUrl = decodeURIComponent(req.params.repoUrl);
    // Handle both numeric and string issue numbers (like 'AI-1')
    const issueNumber = req.params.issueNumber;
    // Only parse as integer if it's a numeric string
    const parsedIssueNumber = /^\d+$/.test(issueNumber) ? parseInt(issueNumber, 10) : issueNumber;
    
    // Find issue in database
    let issue = await Issue.findOne({ repositoryUrl: repoUrl, issueNumber: parsedIssueNumber });
    
    // If not found or force refresh, fetch from GitHub
    if (!issue || req.query.refresh === 'true') {
      // For AI-generated issues, we don't need to fetch from GitHub
      if (typeof parsedIssueNumber === 'string' && parsedIssueNumber.startsWith('AI-')) {
        // Return 404 for AI-generated issues that don't exist in our database
        return res.status(404).json({ message: 'AI-generated issue not found' });
      }
      
      const githubIssue = await githubService.fetchIssue(repoUrl, parsedIssueNumber);
      const fileReferences = issueAnalyzer.extractFileReferences(githubIssue.body);
      
      issue = await Issue.findOneAndUpdate(
        { repositoryUrl: repoUrl, issueNumber: parsedIssueNumber },
        {
          repositoryUrl: repoUrl,
          issueNumber: githubIssue.issueNumber,
          title: githubIssue.title,
          body: githubIssue.body,
          state: githubIssue.state,
          fileReferences,
          createdAt: new Date(githubIssue.createdAt),
          updatedAt: new Date(githubIssue.updatedAt)
        },
        { upsert: true, new: true }
      );
    }
    
    // Check if we already have an AI solution for this issue
    let aiSolution = await AISolution.findOne({ issue: issue._id });
    
    // Include the AI solution if it exists
    const response = {
      issue,
      aiSolution: aiSolution || null
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching issue:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/issues/:repoUrl/:issueNumber/analyze
 * @desc    Analyze an issue with AI and provide solutions
 * @access  Public
 */
router.post('/:repoUrl/:issueNumber/analyze', async (req, res) => {
  try {
    const repoUrl = decodeURIComponent(req.params.repoUrl);
    // Handle both numeric and string issue numbers (like 'AI-1')
    const issueNumber = req.params.issueNumber;
    // Only parse as integer if it's a numeric string
    const parsedIssueNumber = /^\d+$/.test(issueNumber) ? parseInt(issueNumber, 10) : issueNumber;
    
    // Find issue in database
    let issue = await Issue.findOne({ repositoryUrl: repoUrl, issueNumber: parsedIssueNumber });
    
    if (!issue) {
      // For AI-generated issues, we don't need to fetch from GitHub
      if (typeof parsedIssueNumber === 'string' && parsedIssueNumber.startsWith('AI-')) {
        // Return 404 for AI-generated issues that don't exist in our database
        return res.status(404).json({ message: 'AI-generated issue not found' });
      }
      
      // Fetch issue from GitHub if not in database
      const githubIssue = await githubService.fetchIssue(repoUrl, parsedIssueNumber);
      const fileReferences = issueAnalyzer.extractFileReferences(githubIssue.body);
      
      issue = await Issue.create({
        repositoryUrl: repoUrl,
        issueNumber: githubIssue.issueNumber,
        title: githubIssue.title,
        body: githubIssue.body,
        state: githubIssue.state,
        fileReferences,
        createdAt: new Date(githubIssue.createdAt),
        updatedAt: new Date(githubIssue.updatedAt)
      });
    }
    
    // Fetch file contents for referenced files
    const fileContents = [];
    for (const fileRef of issue.fileReferences) {
      try {
        const content = await githubService.fetchFileContent(repoUrl, fileRef.path);
        fileContents.push({
          path: fileRef.path,
          content
        });
      } catch (err) {
        console.warn(`Could not fetch content for ${fileRef.path}:`, err.message);
      }
    }
    
    // Generate AI solution
    const aiAnalysis = await geminiService.analyzeIssue(issue, fileContents);
    
    // Save or update the AI solution
    const aiSolution = await AISolution.findOneAndUpdate(
      { issue: issue._id },
      {
        issue: issue._id,
        analysis: aiAnalysis.analysis,
        solution: aiAnalysis.solution,
        codeSnippets: aiAnalysis.codeSnippets,
        bestPractices: aiAnalysis.bestPractices
      },
      { upsert: true, new: true }
    );
    
    res.json(aiSolution);
  } catch (error) {
    console.error('Error analyzing issue:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;