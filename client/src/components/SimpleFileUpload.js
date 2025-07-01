import React, { useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { kafkaStore } from '../stores/KafkaStore';

const SimpleFileUpload = observer(({ workflowsStore }) => {
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
    setUploadStatus('Uploading file...');

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
        setUploadStatus('✅ File uploaded successfully!');
        
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

  const getWorkflowData = (workflowName) => {
    const orgUsrNode = `${workflowsStore.organizationName}-${workflowsStore.userName}-${workflowName}`;
    return kafkaStore.getOutputsForOrgUsrNode(orgUsrNode);
  };

  const formatData = (data) => {
    if (typeof data === 'string') {
      try {
        return JSON.stringify(JSON.parse(data), null, 2);
      } catch {
        return data;
      }
    }
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">File Upload & Processing</h2>
      
      {/* Upload Section */}
      <div className="mb-8 p-4 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="space-y-4">
          {/* Workflow Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Workflow:
            </label>
            <select
              value={selectedWorkflow}
              onChange={handleWorkflowSelect}
              className="w-full p-2 border border-gray-300 rounded"
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
              className="w-full p-2 border border-gray-300 rounded"
            />
            {selectedFile && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: {selectedFile.name}
              </div>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleFileUpload}
            disabled={!selectedFile || !selectedWorkflow || isUploading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>

          {/* Status */}
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

      {/* Data Display */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Processing Results</h3>
        
        {Object.values(workflowsStore.workflows).map(workflow => {
          const data = getWorkflowData(workflow.name);
          
          if (data.length === 0) return null;
          
          return (
            <div key={workflow.id} className="mb-6 border rounded-lg p-4">
              <h4 className="font-medium text-lg mb-3">{workflow.name}</h4>
              
              <div className="space-y-3">
                {data.map((output, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-blue-600">{output.topic}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(output.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <pre className="bg-white p-3 rounded border text-sm overflow-x-auto max-h-64 overflow-y-auto">
                      {formatData(output.data)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        {kafkaStore.flowOutputs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No data yet. Upload a file to see results.
          </div>
        )}
      </div>
    </div>
  );
});

export default SimpleFileUpload;