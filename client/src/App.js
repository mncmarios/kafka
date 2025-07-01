import React from 'react';
import './App.css';
import SimpleFileUpload from './components/SimpleFileUpload';
import { newWorkflowsStore } from './stores/WorkflowsStore';

// Create the workflows store instance
const workflowsStore = newWorkflowsStore();

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1 className="text-3xl font-bold text-white mb-8">File Processing</h1>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <SimpleFileUpload workflowsStore={workflowsStore} />
      </main>
    </div>
  );
}

export default App;