import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Generate an analysis and solution for a GitHub issue
   * @param {Object} issue - The GitHub issue data
   * @param {Array} fileContents - Array of {path, content} objects for relevant files
   * @returns {Promise<Object>} - AI analysis and solution
   */
  async analyzeIssue(issue, fileContents) {
    try {
      // Prepare context for the AI
      let prompt = `Analyze this GitHub issue and provide a solution:\n\n`;
      prompt += `Issue Title: ${issue.title}\n\n`;
      prompt += `Issue Description:\n${issue.body || 'No description provided.'}\n\n`;
      
      // Add file contents for context
      if (fileContents && fileContents.length > 0) {
        prompt += `Relevant code files:\n\n`;
        
        for (const file of fileContents) {
          prompt += `File: ${file.path}\n\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
        }
      }
      
      prompt += `Please provide:\n`;
      prompt += `1. A detailed analysis of the issue\n`;
      prompt += `2. A step-by-step solution with code examples\n`;
      prompt += `3. Best practices to prevent similar issues\n`;
      prompt += `4. Any suggested code improvements\n`;

      // Generate content with Gemini
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the response to extract structured information
      return this.parseAIResponse(text, issue, fileContents);
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Failed to analyze issue with AI: ${error.message}`);
    }
  }

  /**
   * Parse the AI response into structured sections
   * @param {string} aiResponse - Raw text response from Gemini
   * @param {Object} issue - The GitHub issue data
   * @param {Array} fileContents - Array of file contents
   * @returns {Object} - Structured AI solution
   */
  parseAIResponse(aiResponse, issue, fileContents) {
    // Default structure
    const solution = {
      analysis: '',
      solution: '',
      codeSnippets: [],
      bestPractices: []
    };

    // Extract analysis section
    const analysisMatch = aiResponse.match(/(?:Analysis|Issue Analysis)[:\s]+(.*?)(?=\n\s*(?:Solution|Step-by-step solution|Suggested solution|\d\.\s*Solution))/is);
    if (analysisMatch && analysisMatch[1]) {
      solution.analysis = analysisMatch[1].trim();
    } else {
      // Fallback: take the first paragraph as analysis
      const firstParagraph = aiResponse.split('\n\n')[0];
      solution.analysis = firstParagraph.trim();
    }

    // Extract solution section
    const solutionMatch = aiResponse.match(/(?:Solution|Step-by-step solution|Suggested solution)[:\s]+(.*?)(?=\n\s*(?:Best Practices|Prevention|\d\.\s*Best Practices))/is);
    if (solutionMatch && solutionMatch[1]) {
      solution.solution = solutionMatch[1].trim();
    }

    // Extract best practices
    const bestPracticesMatch = aiResponse.match(/(?:Best Practices|Prevention)[:\s]+(.*?)(?=\n\s*(?:Code Improvements|Suggested Improvements|Conclusion|$))/is);
    if (bestPracticesMatch && bestPracticesMatch[1]) {
      const practicesText = bestPracticesMatch[1].trim();
      // Split by numbered items or bullet points
      const practices = practicesText.split(/\n\s*(?:\d+\.|-|\*)\s+/).filter(Boolean);
      solution.bestPractices = practices.map(p => p.trim());
    }

    // Extract code snippets
    const codeBlockRegex = /```(?:[a-zA-Z]+)?\s*(?:([\w\-./]+\.[a-zA-Z]+))?[\s\S]*?```/g;
    let codeMatch;
    
    while ((codeMatch = codeBlockRegex.exec(aiResponse)) !== null) {
      const codeBlock = codeMatch[0];
      const filePath = codeMatch[1] || ''; // Might be undefined if no filename specified
      
      // Extract the code without the backticks and language identifier
      const code = codeBlock.replace(/```(?:[a-zA-Z]+)?\s*(?:[\w\-./]+\.[a-zA-Z]+)?\s*\n?/, '').replace(/\n?```$/, '');
      
      // Try to match this code snippet with one of the file contents
      let matchedFile = null;
      let originalCode = '';
      
      if (filePath && fileContents) {
        matchedFile = fileContents.find(f => f.path.includes(filePath) || filePath.includes(f.path));
        if (matchedFile) {
          originalCode = matchedFile.content;
        }
      }
      
      solution.codeSnippets.push({
        filePath: matchedFile ? matchedFile.path : filePath,
        originalCode: originalCode,
        suggestedCode: code,
        lineNumbers: [] // Would need more complex analysis to determine exact line numbers
      });
    }

    return solution;
  }
}

export default GeminiService;