# AI Bank Statement Analyzer

This project is a full-stack application designed to analyze bank statements. It consists of a Node.js backend and a React frontend.

## Project Structure

-   `backend/`: The Node.js (with TypeScript) backend that handles statement processing and analysis.
-   `frontend/`: The React (with TypeScript) frontend for user interaction and displaying analysis results.

## Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later recommended)
-   [npm](https://www.npmjs.com/) (comes with Node.js)

## Getting Started

### 1. Install Dependencies

You need to install the dependencies for both the frontend and the backend.

**For the backend:**

```bash
cd backend
npm install
```

**For the frontend:**

```bash
cd frontend
npm install
```

### 2. Running the Application

To run the application, you need to start both the backend and frontend servers in separate terminals.

**Start the backend server:**

Navigate to the `backend` directory and run:

```bash
npm run dev
```

The backend server will start on `http://localhost:3000`.

**Start the frontend server:**

Navigate to the `frontend` directory and run:

```bash
npm run dev
```

The frontend development server will start, usually on `http://localhost:5173`. If that port is in use, it will automatically find the next available port.

### PowerShell Execution Policy

If you are using PowerShell and encounter an error message like "running scripts is disabled on this system," you'll need to set the execution policy for the current process. Run this command in your PowerShell terminal before running `npm run dev`:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

## Available Scripts

### Backend (`backend/`)

-   `npm run dev`: Starts the development server with hot-reloading.
-   `npm run start`: Starts the server (similar to `dev`).
-   `npm run typecheck`: Runs the TypeScript compiler to check for type errors.
-   `npm run convert`: A utility script for converting bank statements via the command line.

### Frontend (`frontend/`)

-   `npm run dev`: Starts the Vite development server.
-   `npm run build`: Builds the application for production.
-   `npm run preview`: Serves the production build locally.
-   `npm run lint`: Lints the codebase using ESLint.
 -  `npm run format`: Formats the code using Prettier.

<!-- Trigger redeploy: updated README to force new commit for Render -->
