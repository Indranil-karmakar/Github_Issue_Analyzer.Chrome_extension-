/**
 * Service to analyze GitHub issues and identify code problems
 */
class IssueAnalyzerService {
  /**
   * Analyze issue content to extract file references and code locations
   * @param {string} issueBody - The body content of the GitHub issue
   * @returns {Array} - List of file references with line numbers
   */
  extractFileReferences(issueBody) {
    if (!issueBody) return [];
    
    try {
      const fileReferences = [];
      
      // Match patterns like filename.js:10 or path/to/file.js:10-20
      const fileLinePattern = /([\w\-./]+\.[a-zA-Z]+):(\d+)(?:-(\d+))?/g;
      let match;
      
      try {
        while ((match = fileLinePattern.exec(issueBody)) !== null) {
          const filePath = match[1];
          const startLine = parseInt(match[2], 10);
          const endLine = match[3] ? parseInt(match[3], 10) : startLine;
          
          const lineNumbers = [];
          for (let i = startLine; i <= endLine; i++) {
            lineNumbers.push(i);
          }
          
          fileReferences.push({
            path: filePath,
            lineNumbers
          });
        }
      } catch (regexError) {
        console.error('Error in file line pattern matching:', regexError.message);
        // Continue with other patterns
      }
      
      // Also look for code blocks with file names in comments or headers
      try {
        const codeBlockPattern = /```(?:[a-zA-Z]+)?\s*(?:([\w\-./]+\.[a-zA-Z]+))?[\s\S]*?```/g;
        while ((match = codeBlockPattern.exec(issueBody)) !== null) {
          if (match[1]) {
            // If we found a filename in the code block header
            const filePath = match[1];
            if (!fileReferences.some(ref => ref.path === filePath)) {
              fileReferences.push({
                path: filePath,
                lineNumbers: []
              });
            }
          }
        }
      } catch (codeBlockError) {
        console.error('Error in code block pattern matching:', codeBlockError.message);
      }
    
    return fileReferences;
    } catch (error) {
      console.error('Error extracting file references:', error.message);
      return [];
    }
  }

  /**
   * Analyze code to identify potential issues
   * @param {string} code - The code content to analyze
   * @returns {Array} - List of potential issues
   */
  analyzeCode(code) {
    if (!code || typeof code !== 'string') {
      console.warn('Invalid code provided for analysis');
      return [];
    }
    
    try {
    
    console.log(`Analyzing code with length: ${code.length} characters`);
    const issues = [];
    
    // Check for common code smells and issues
    if (code.includes('console.log') || code.includes('console.debug') || code.includes('console.error')) {
      issues.push({
        type: 'debugging',
        description: 'Debug statements found in code',
        severity: 'low'
      });
    }
    
    if (code.includes('TODO') || code.includes('FIXME') || code.includes('HACK') || code.includes('XXX')) {
      issues.push({
        type: 'incomplete',
        description: 'TODO, FIXME, HACK or XXX comments found',
        severity: 'medium'
      });
    }
    
    // Check for potential security issues
    if (code.includes('eval(') || code.includes('new Function(')) {
      issues.push({
        type: 'security',
        description: 'Potentially unsafe code execution',
        severity: 'high'
      });
    }
    
    // Check for hardcoded credentials
    const credentialPatterns = [
      /password\s*[:=]\s*['"]+[^'"]+['"]/, 
      /api[_-]?key\s*[:=]\s*['"]+[^'"]+['"]/, 
      /secret\s*[:=]\s*['"]+[^'"]+['"]/, 
      /token\s*[:=]\s*['"]+[^'"]+['"]/, 
      /auth\s*[:=]\s*['"]+[^'"]+['"]/ 
    ];
    
    for (const pattern of credentialPatterns) {
      if (pattern.test(code)) {
        issues.push({
          type: 'security',
          description: 'Potential hardcoded credentials found',
          severity: 'critical'
        });
        break;
      }
    }
    
    return issues;
    } catch (error) {
      console.error('Error analyzing code:', error.message);
      return [];
    }
  }

  /**
   * Combine issue data with code analysis
   * @param {Object} issue - GitHub issue data
   * @param {Array} fileContents - Array of {path, content} objects
   * @returns {Object} - Enhanced issue with code analysis
   */
  enhanceIssueWithCodeAnalysis(issue, fileContents) {
    try {
      const fileReferences = this.extractFileReferences(issue.body);
      const enhancedIssue = { ...issue, fileReferences };
      
      // Add code analysis for each referenced file
      const codeAnalysis = [];
      
      for (const fileRef of fileReferences) {
        try {
          const fileData = fileContents.find(f => f.path === fileRef.path);
          if (fileData) {
            const issues = this.analyzeCode(fileData.content);
            if (issues.length > 0) {
              codeAnalysis.push({
                filePath: fileRef.path,
                issues
              });
            }
          }
        } catch (fileError) {
          console.error(`Error analyzing file ${fileRef.path}:`, fileError.message);
          // Continue with other files
        }
      }
    
    enhancedIssue.codeAnalysis = codeAnalysis;
    return enhancedIssue;
    } catch (error) {
      console.error('Error enhancing issue with code analysis:', error.message);
      // Return the original issue without enhancements if there's an error
      return issue;
    }
  }
}

export default IssueAnalyzerService;