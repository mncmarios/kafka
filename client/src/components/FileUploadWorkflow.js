import React, { useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { kafkaStore } from '../stores/KafkaStore';

const FileUploadWorkflow = observer(({ workflowsStore }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setUploadStatus('');
  };

  const handleWorkflowSelect = (event) => {
    setSelectedWorkflow(event.target.value);
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedWorkflow) {
      setUploadStatus('Please select both a file and a workflow');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading file to NiFi...');

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Upload file to NiFi workflow
      const result = await workflowsStore.sendFile(
        formData,
        workflowsStore.userName,
        selectedWorkflow
      );

      if (result.status === 200) {
        setUploadStatus('✅ File uploaded successfully! Processing started...');
        
        // Start monitoring the specific workflow's Kafka topic
        const orgUsrNode = `${workflowsStore.organizationName}-${workflowsStore.userName}-${selectedWorkflow}`;
        await kafkaStore.startMonitoring(orgUsrNode);
        
        // Clear file selection
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setUploadStatus(`❌ Upload failed: ${result.result?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('File upload error:', error);
      setUploadStatus(`❌ Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const getWorkflowOutputs = (workflowName) => {
    const orgUsrNode = `${workflowsStore.organizationName}-${workflowsStore.userName}-${workflowName}`;
    return kafkaStore.getOutputsForOrgUsrNode(orgUsrNode);
  };

  const renderProcessingSteps = (workflowName) => {
    const outputs = getWorkflowOutputs(workflowName);
    const workflow = Object.values(workflowsStore.workflows).find(w => w.name === workflowName);
    
    if (!workflow) return null;

    // Define processing steps based on node types
    const processingSteps = [];
    
    // Add steps based on workflow configuration
    if (workflow.hasOCR) processingSteps.push({ type: 'ocr', label: 'OCR Processing', icon: '📄' });
    if (workflow.hasMachineTranslation) processingSteps.push({ type: 'machine_translation', label: 'Machine Translation', icon: '🌐' });
    if (workflow.hasTextAnalysis) processingSteps.push({ type: 'text_analysis', label: 'Text Analysis', icon: '🔍' });

    return (
      <div className="mt-4">
        <h4 className="font-medium text-sm mb-2">Processing Pipeline:</h4>
        <div className="flex space-x-2">
          {processingSteps.map((step, index) => {
            const hasOutput = outputs.some(output => 
              output.data && typeof output.data === 'object' && 
              Object.keys(output.data).some(key => key.toLowerCase().includes(step.type))
            );
            
            return (
              <div key={step.type} className="flex items-center">
                <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                  hasOutput ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  <span>{step.icon}</span>
                  <span>{step.label}</span>
                  {hasOutput && <span>✅</span>}
                  }
                </div>
                {index < processingSteps.length - 1 && (
                  <div className="mx-1 text-gray-400">→</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="file-upload-workflow p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">File Processing Workflow</h2>
      
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

      {/* File Upload Section */}
      <div className="mb-8 p-4 border-2 border-dashed border-gray-300 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Upload File for Processing</h3>
        
        <div className="space-y-4">
          {/* Workflow Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Workflow:
            </label>
            <select
              value={selectedWorkflow}
              onChange={handleWorkflowSelect}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a workflow...</option>
              {Object.values(workflowsStore.workflows).map(workflow => (
                <option key={workflow.id} value={workflow.name}>
                  {workflow.name}
                </option>
              ))}
            </select>
          </div>

          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File:
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
            />
            {selectedFile && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleFileUpload}
            disabled={!selectedFile || !selectedWorkflow || isUploading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload & Start Processing'}
          </button>

          {/* Status Message */}
          {uploadStatus && (
            <div className={`p-3 rounded ${
              uploadStatus.includes('✅') ? 'bg-green-50 text-green-800' : 
              uploadStatus.includes('❌') ? 'bg-red-50 text-red-800' : 
              'bg-blue-50 text-blue-800'
            }`}>
              {uploadStatus}
            </div>
          )}
        </div>
      </div>

      {/* Active Workflows */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Active Workflows</h3>
        <div className="space-y-4">
          {Object.values(workflowsStore.workflows).map(workflow => {
            const outputs = getWorkflowOutputs(workflow.name);
            const hasRecentActivity = outputs.length > 0;
            
            return (
              <div key={workflow.id} className={`border rounded-lg p-4 ${
                hasRecentActivity ? 'border-green-300 bg-green-50' : 'border-gray-200'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-lg">{workflow.name}</h4>
                    <p className="text-sm text-gray-600">
                      Topic: {workflowsStore.organizationName}-{workflowsStore.userName}-{workflow.name}-topic
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${hasRecentActivity ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="text-sm text-gray-600">
                      {outputs.length} outputs
                    </span>
                  </div>
                </div>
                
                {/* Processing Steps */}
                {renderProcessingSteps(workflow.name)}
                
                {/* Recent Outputs */}
                {outputs.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-sm mb-2">Recent Processing Results:</h5>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {outputs.slice(0, 3).map((output, index) => (
                        <div key={index} className="bg-white p-2 rounded border text-sm">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-blue-600">{output.topic}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(output.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-gray-700 truncate">
                            {typeof output.data === 'object' 
                              ? JSON.stringify(output.data).substring(0, 100) + '...'
                              : output.data
                            }
                          </div>
                        </div>
                      ))}
                      {outputs.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{outputs.length - 3} more results
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {Object.keys(workflowsStore.workflows).length === 0 && (
          <div className="text-gray-500 text-center py-8">
            No workflows available. Create a workflow to start processing files.
          </div>
        )}
      </div>
    </div>
  );
});

export default FileUploadWorkflow;