import fetch from 'node-fetch';

class GitHubService {
  constructor(token) {
    this.token = token;
    this.baseUrl = 'https://api.github.com';
    this.headers = token ? {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    } : {
      'Accept': 'application/vnd.github.v3+json'
    };
    console.log('GitHub token provided:', !!token);
    console.log('GitHub token value:', token);
  }

  /**
   * Extract owner and repo from GitHub URL
   * @param {string} repoUrl - GitHub repository URL
   * @returns {Object} - { owner, repo }
   */
  parseRepoUrl(repoUrl) {
    try {
      // Handle URLs like https://github.com/owner/repo
      const urlParts = repoUrl.split('github.com/');
      if (urlParts.length < 2) throw new Error('Invalid GitHub URL');
      
      const pathParts = urlParts[1].split('/');
      if (pathParts.length < 2) throw new Error('Invalid GitHub URL format');
      
      return {
        owner: pathParts[0],
        repo: pathParts[1].split('#')[0].split('?')[0] // Remove any fragments or query params
      };
    } catch (error) {
      throw new Error(`Failed to parse GitHub URL: ${error.message}`);
    }
  }

  /**
   * Fetch issues from a GitHub repository
   * @param {string} repoUrl - GitHub repository URL
   * @returns {Promise<Array>} - List of issues
   */
  async fetchIssues(repoUrl) {
    try {
      const { owner, repo } = this.parseRepoUrl(repoUrl);
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/issues?state=open&per_page=100`,
        { headers: this.headers }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API error: ${errorData.message || response.statusText}`);
      }

      const issues = await response.json();
      return issues.map(issue => ({
        issueNumber: issue.number,
        title: issue.title,
        body: issue.body || '',
        state: issue.state,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        url: issue.html_url
      }));
    } catch (error) {
      throw new Error(`Failed to fetch issues: ${error.message}`);
    }
  }

  /**
   * Fetch a specific issue from a GitHub repository
   * @param {string} repoUrl - GitHub repository URL
   * @param {number} issueNumber - Issue number
   * @returns {Promise<Object>} - Issue details
   */
  async fetchIssue(repoUrl, issueNumber) {
    try {
      const { owner, repo } = this.parseRepoUrl(repoUrl);
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/issues/${issueNumber}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API error: ${errorData.message || response.statusText}`);
      }

      const issue = await response.json();
      return {
        issueNumber: issue.number,
        title: issue.title,
        body: issue.body || '',
        state: issue.state,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        url: issue.html_url
      };
    } catch (error) {
      throw new Error(`Failed to fetch issue: ${error.message}`);
    }
  }

  /**
   * Fetch repository code structure
   * @param {string} repoUrl - GitHub repository URL
   * @returns {Promise<Array>} - List of files in the repository
   */
  async fetchRepoContents(repoUrl) {
    try {
      console.log(`Fetching repository contents for: ${repoUrl}`);
      const { owner, repo } = this.parseRepoUrl(repoUrl);
      console.log(`Parsed repo info - Owner: ${owner}, Repo: ${repo}`);
      
      // First, try to get the default branch name
      console.log(`Getting repository information to determine default branch...`);
      const repoInfoUrl = `${this.baseUrl}/repos/${owner}/${repo}`;
      console.log(`Fetching from: ${repoInfoUrl}`);
      const repoInfoResponse = await fetch(repoInfoUrl, { headers: this.headers });
      
      if (!repoInfoResponse.ok) {
        console.error(`Failed to get repository info (${repoInfoResponse.status})`);
        const errorData = await repoInfoResponse.json();
        throw new Error(`GitHub API error: ${errorData.message || repoInfoResponse.statusText}`);
      }
      
      const repoInfo = await repoInfoResponse.json();
      const defaultBranch = repoInfo.default_branch || 'main';
      console.log(`Default branch for repository: ${defaultBranch}`);
      
      // Try the default branch
      const branchUrl = `${this.baseUrl}/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
      console.log(`Fetching contents from default branch: ${branchUrl}`);
      const response = await fetch(branchUrl, { headers: this.headers });

      if (!response.ok) {
        console.error(`Default branch ${defaultBranch} not accessible (${response.status})`);
        
        // If we can't get the recursive tree, try getting the top-level contents
        console.log(`Trying to get top-level contents instead...`);
        const contentsUrl = `${this.baseUrl}/repos/${owner}/${repo}/contents`;
        console.log(`Fetching from: ${contentsUrl}`);
        const contentsResponse = await fetch(contentsUrl, { headers: this.headers });
        
        if (!contentsResponse.ok) {
          console.error(`Failed to get repository contents (${contentsResponse.status})`);
          const errorData = await contentsResponse.json();
          throw new Error(`GitHub API error: ${errorData.message || contentsResponse.statusText}`);
        }
        
        const contents = await contentsResponse.json();
        console.log(`Found ${contents.length} items at repository root`);
        
        // Filter for files only
        const files = contents.filter(item => item.type === 'file');
        console.log(`Found ${files.length} files at repository root`);
        return files;
      }

      console.log(`Successfully fetched tree from ${defaultBranch} branch, processing data...`);
      const data = await response.json();
      
      if (!data.tree) {
        console.error(`No tree data found in response`);
        return [];
      }
      
      const filteredData = data.tree.filter(item => item.type === 'blob');
      console.log(`Found ${filteredData.length} files in ${defaultBranch} branch`);
      return filteredData;
    } catch (error) {
      console.error(`Error fetching repository contents: ${error.message}`);
      // Return empty array instead of throwing to allow analysis to continue with partial data
      return [];
    }
  }

  /**
   * Fetch file content from GitHub
   * @param {string} repoUrl - GitHub repository URL
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} - File content
   */
  async fetchFileContent(repoUrl, filePath) {
    try {
      const { owner, repo } = this.parseRepoUrl(repoUrl);
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/contents/${filePath}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API error: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      // GitHub API returns content as base64 encoded
      return Buffer.from(data.content, 'base64').toString('utf-8');
    } catch (error) {
      throw new Error(`Failed to fetch file content: ${error.message}`);
    }
  }
}

export default GitHubService;