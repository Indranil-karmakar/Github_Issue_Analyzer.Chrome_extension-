# GitHub Issue Analyzer

A powerful Chrome extension that leverages AI to analyze GitHub issues and provide intelligent solutions. This extension integrates with Google's Gemini AI to understand code problems, extract file references, and generate actionable solutions.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Setup & Configuration](#setup--configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Development](#development)
- [File Structure](#file-structure)
- [Contributing](#contributing)

## 🎯 Overview

The GitHub Issue Analyzer is a full-stack application that bridges GitHub issues with AI-powered analysis. It automatically:
- Extracts and parses GitHub issue information
- Identifies relevant code files and line references
- Uses Google's Gemini AI to analyze problems and generate solutions
- Stores analysis results in MongoDB for future reference
- Provides a seamless Chrome extension interface for quick access

## ✨ Features

- **AI-Powered Analysis**: Leverages Google Gemini 2.5 Flash for intelligent issue analysis
- **Chrome Extension Integration**: One-click analysis directly from GitHub repositories
- **Code Context Extraction**: Automatically identifies and extracts relevant code files and line numbers
- **Solution Generation**: Provides detailed, actionable solutions for identified issues
- **Issue Repository**: Stores analyzed issues and solutions in MongoDB for persistence
- **GitHub API Integration**: Direct integration with GitHub's REST API for issue data
- **Real-time Processing**: Live issue analysis with loading states and error handling
- **Responsive UI**: Modern, dark-themed interface built with React and Tailwind CSS
- **Developer Friendly**: Built with modern tools (Vite, React 19, Tailwind CSS 4)

## 🛠 Tech Stack

### Frontend (Chrome Extension)
- **Framework**: React 19.1.1
- **Build Tool**: Vite 7.1.0 with HMR support
- **Styling**: Tailwind CSS 4.1.11 with Vite integration
- **Extension Tool**: CRXJS Vite Plugin 2.1.0
- **Package Manager**: npm/yarn
- **Code Quality**: ESLint with React hooks and refresh plugins

### Backend (Server)
- **Runtime**: Node.js with ES Modules
- **Framework**: Express 5.1.0
- **Database**: MongoDB with Mongoose 8.17.1
- **AI Service**: Google Generative AI (Gemini 2.5 Flash)
- **HTTP Client**: Node-fetch 3.3.2
- **CORS**: Enabled for cross-origin requests
- **Environment**: dotenv 17.2.1

## 📁 Project Structure

```
client/
├── src/
│   ├── App.jsx                 # Main application component
│   ├── App.css                 # Application styles
│   ├── main.jsx                # React entry point
│   ├── index.css               # Global styles
│   ├── index.html              # Extension popup HTML
│   ├── popup.html              # Popup window HTML
│   ├── assets/                 # Static resources
│   ├── popup/
│   │   ├── PopupApp.jsx        # Popup-specific component
│   │   └── index.jsx           # Popup React entry
│   ├── services/
│   │   └── apiService.js       # Backend API communication
│   └── utils/
│       └── githubUtils.js      # GitHub utilities
├── public/
│   └── Logo.png                # Extension icon
├── background.js               # Service worker script
├── manifest.json               # Chrome extension manifest (v3)
├── vite.config.js              # Vite configuration
├── eslint.config.js            # ESLint rules
├── package.json                # Dependencies & scripts
└── README.md                   # This file
```

## 📦 Installation

### Prerequisites
- Node.js 14+ and npm/yarn
- MongoDB instance (local or cloud)
- Google Generative AI API key
- GitHub Personal Access Token (optional)

### Step 1: Clone the Repository

```bash
git clone https://github.com/Rishav-roy-10/github-extension.git
cd github-extension/client
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages:
- React 19.1.1
- Vite 7.1.0
- Tailwind CSS 4.1.11
- CRXJS Vite Plugin
- ESLint with plugins

## 🔐 Setup & Configuration

### Environment Setup

1. **Ensure the backend server is running** on `http://localhost:5000`

2. **Backend Configuration** (in `server/.env`):
```env
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/github-analyzer
GEMINI_API_KEY=your_google_generative_ai_key
GITHUB_TOKEN=your_github_personal_access_token
NODE_ENV=development
```

### Installing the Extension

1. **Build the extension:**
```bash
npm run build
```

2. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top-right)
   - Click "Load unpacked"
   - Select the `dist/` directory

3. **Verify Installation:**
   - Extension icon should appear in Chrome toolbar
   - Click to open the popup interface

## 🚀 Usage

### Via Chrome Extension

1. **Navigate to a GitHub repository**
2. **Click the extension icon** in your toolbar
3. **Paste the repository URL** in the input field
4. **Click "Analyze Issues"**
5. **View AI-powered solutions** for each issue

### Available Commands

```bash
# Development server with HMR
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Example Workflow

```
Input: https://github.com/owner/repo
↓
Extension fetches issues from GitHub API
↓
Backend analyzes each issue with Gemini AI
↓
Solutions are displayed with file references
↓
Results are stored in MongoDB
```

## 📚 API Documentation

### Frontend API Service (`services/apiService.js`)

```javascript
// Fetch and analyze repository issues
fetchRepositoryIssues(repoUrl)
  → Returns: Array of analyzed issues with AI solutions

// Expected Response Format:
[
  {
    issueNumber: 123,
    title: "Issue Title",
    body: "Issue description",
    state: "open",
    fileReferences: [
      { path: "src/file.js", lineNumbers: [10, 11, 12] }
    ],
    aiSolution: "AI-generated solution..."
  }
]
```

### Backend API Endpoints

**Get Repository Issues:**
```bash
GET /api/repos/issues?url=https://github.com/owner/repo
```

**Analyze an Issue:**
```bash
POST /api/issues/analyze
Content-Type: application/json

{
  "issueUrl": "https://github.com/owner/repo/issues/123",
  "repoUrl": "https://github.com/owner/repo"
}
```

**Get All Issues:**
```bash
GET /api/issues
```

**Get Specific Issue:**
```bash
GET /api/issues/:id
```

## 👨‍💻 Development

### Running in Development Mode

```bash
# Frontend (with Vite HMR)
npm run dev

# Backend (in separate terminal)
cd ../server
npm run dev
```

### Building for Production

```bash
npm run build
```

Output: `dist/` directory ready for Chrome Web Store submission

### Code Quality

```bash
# Run ESLint
npm run lint

# ESLint checks for:
# - React best practices
# - React hooks rules
# - Fast refresh issues
# - JavaScript standards
```

### Hot Module Replacement (HMR)

Vite provides instant HMR during development:
- Changes to React components reflect immediately
- Styles update without full reload
- State preservation during updates

## 📝 Key Components

### App.jsx
Main application component that handles:
- Repository URL input
- Issue fetching and display
- Error state management
- Loading animations

### PopupApp.jsx
Popup-specific wrapper component for the extension UI

### apiService.js
Centralized API communication with backend:
- Repository issue fetching
- Issue analysis requests
- Error handling

### githubUtils.js
GitHub-specific utility functions:
- URL parsing
- Repository validation
- Issue data formatting

## 🔧 Manifest Configuration

The extension uses Chrome Manifest V3 with:
- Background Service Worker (`background.js`)
- Popup UI (`popup.html`)
- GitHub API permissions
- Storage permissions
- Tab access permissions

## 🎨 Styling

- **Framework**: Tailwind CSS 4.1.11
- **Features**: Utility-first, responsive design
- **Theme**: Dark mode interface
- **Animations**: Smooth transitions and loading spinners

## 📦 Scripts Reference

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build for Chrome |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint checks |

## 🐛 Troubleshooting

**Extension not loading?**
- Ensure backend is running on port 5000
- Check browser console for errors (F12)
- Verify `dist/` folder exists after build

**Issues not fetching?**
- Check GitHub repository URL format
- Verify backend API is accessible
- Check MongoDB connection

**AI solutions not generating?**
- Verify `GEMINI_API_KEY` is set correctly
- Check backend logs for Gemini errors
- Ensure API quota is available

## 📧 Support & Contact

- **Issues**: Open a GitHub issue
- **Questions**: GitHub Discussions
- **Author**: Rishav-roy-10

## 📄 License

ISC License - See LICENSE file for details

## 🙏 Acknowledgments

- React community for excellent documentation
- Vite for incredible DX
- Google Generative AI for powerful AI capabilities
- GitHub for comprehensive API
- Tailwind CSS for utility-first styling

---

**Built with ❤️ using React, Vite, and modern web technologies**

### Quick Links
