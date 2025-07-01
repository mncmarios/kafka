import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { kafkaStore } from '../stores/KafkaStore';

const WorkflowKafkaIntegration = observer(({ workflowsStore }) => {
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Start monitoring when component mounts
    kafkaStore.startMonitoring();
    
    return () => {
      // Cleanup on unmount
      kafkaStore.stopMonitoring();
    };
  }, []);

  const handleWorkflowExecution = async (workflow) => {
    if (!workflow) return;
    
    setIsProcessing(true);
    setSelectedWorkflow(workflow);
    
    try {
      // Create the org-usr-node identifier
      const orgUsrNode = `${workflowsStore.organizationName}-${workflowsStore.userName}-${workflow.name}`;
      
      // Send workflow execution message to Kafka
      const success = await kafkaStore.sendToFlowTopic(orgUsrNode, {
        type: 'workflow_execution',
        workflowId: workflow.id,
        workflowName: workflow.name,
        timestamp: new Date().toISOString(),
        status: 'started'
      });
      
      if (success) {
        console.log(`Workflow ${workflow.name} execution message sent to Kafka`);
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getWorkflowOutputs = (workflowName) => {
    return kafkaStore.getOutputsForWorkflow(workflowName);
  };

  const renderWorkflowOutputs = (workflowName) => {
    const outputs = getWorkflowOutputs(workflowName);
    
    if (outputs.length === 0) {
      return <div className="text-gray-500 text-sm">No outputs yet</div>;
    }
    
    return (
      <div className="space-y-2">
        {outputs.slice(0, 3).map((output, index) => (
          <div key={index} className="bg-gray-50 p-2 rounded text-sm">
            <div className="font-medium text-blue-600">{output.topic}</div>
            <div className="text-gray-700 truncate">
              {typeof output.data === 'object' ? JSON.stringify(output.data).substring(0, 100) + '...' : output.data}
            </div>
            <div className="text-xs text-gray-500">{new Date(output.timestamp).toLocaleString()}</div>
          </div>
        ))}
        {outputs.length > 3 && (
          <div className="text-xs text-gray-500">+{outputs.length - 3} more outputs</div>
        )}
      </div>
    );
  };

  return (
    <div className="workflow-kafka-integration p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Workflow Kafka Integration</h2>
      
      {/* Connection Status */}
      <div className="mb-6 flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${kafkaStore.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm font-medium">
            Kafka: {kafkaStore.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${kafkaStore.isMonitoring ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
          <span className="text-sm font-medium">
            Monitoring: {kafkaStore.isMonitoring ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Workflows List */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Available Workflows</h3>
        <div className="grid gap-4">
          {Object.values(workflowsStore.workflows).map(workflow => (
            <div key={workflow.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-lg">{workflow.name}</h4>
                  <p className="text-sm text-gray-600">ID: {workflow.id}</p>
                  <p className="text-sm text-gray-600">
                    Topic: {workflowsStore.organizationName}-{workflowsStore.userName}-{workflow.name}-topic
                  </p>
                </div>
                <button
                  onClick={() => handleWorkflowExecution(workflow)}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {isProcessing && selectedWorkflow?.id === workflow.id ? 'Processing...' : 'Execute'}
                </button>
              </div>
              
              {/* Workflow Outputs */}
              <div>
                <h5 className="font-medium text-sm mb-2">Recent Outputs:</h5>
                {renderWorkflowOutputs(workflow.name)}
              </div>
            </div>
          ))}
        </div>
        
        {Object.keys(workflowsStore.workflows).length === 0 && (
          <div className="text-gray-500 text-center py-8">
            No workflows available. Create a workflow to see it here.
          </div>
        )}
      </div>

      {/* Global Statistics */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Global Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-2xl font-bold text-blue-600">{kafkaStore.monitoringStats.totalOutputs}</div>
            <div className="text-sm text-gray-600">Total Outputs</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-2xl font-bold text-green-600">{kafkaStore.monitoringStats.topicCount}</div>
            <div className="text-sm text-gray-600">Active Topics</div>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <div className="text-2xl font-bold text-purple-600">{Object.keys(workflowsStore.workflows).length}</div>
            <div className="text-sm text-gray-600">Workflows</div>
          </div>
          <div className="bg-orange-50 p-3 rounded">
            <div className="text-2xl font-bold text-orange-600">{kafkaStore.flowTopics.length}</div>
            <div className="text-sm text-gray-600">Flow Topics</div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default WorkflowKafkaIntegration;