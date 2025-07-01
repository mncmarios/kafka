import React from 'react';
import './App.css';
import KafkaMonitor from './components/KafkaMonitor';
import WorkflowKafkaIntegration from './components/WorkflowKafkaIntegration';
import { newWorkflowsStore } from './stores/WorkflowsStore';

// Create the workflows store instance
const workflowsStore = newWorkflowsStore();

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1 className="text-3xl font-bold text-white mb-8">Kafka Workflow Management</h1>
      </header>
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Workflow Kafka Integration */}
        <WorkflowKafkaIntegration workflowsStore={workflowsStore} />
        
        {/* Kafka Monitor */}
        <KafkaMonitor />
      </main>
    </div>
  );
}

export default App;