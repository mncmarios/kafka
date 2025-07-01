import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { kafkaStore } from '../stores/KafkaStore';

const RealTimeOutputs = observer(() => {
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [expandedOutput, setExpandedOutput] = useState(null);

  const getFilteredOutputs = () => {
    if (selectedTopic === 'all') {
      return kafkaStore.getLatestOutputs(50);
    }
    return kafkaStore.getOutputsFromTopic(selectedTopic);
  };

  const formatOutputData = (data) => {
    if (typeof data === 'string') {
      try {
        return JSON.stringify(JSON.parse(data), null, 2);
      } catch {
        return data;
      }
    }
    return JSON.stringify(data, null, 2);
  };

  const getOutputType = (data) => {
    if (typeof data === 'object' && data !== null) {
      // Detect output type based on content
      const dataStr = JSON.stringify(data).toLowerCase();
      if (dataStr.includes('extracted_text') || dataStr.includes('ocr')) {
        return { type: 'OCR', icon: '📄', color: 'orange' };
      }
      if (dataStr.includes('translation') || dataStr.includes('translated')) {
        return { type: 'Translation', icon: '🌐', color: 'blue' };
      }
      if (dataStr.includes('categorization') || dataStr.includes('entities') || dataStr.includes('analysis')) {
        return { type: 'Text Analysis', icon: '🔍', color: 'purple' };
      }
    }
    return { type: 'Data', icon: '📊', color: 'gray' };
  };

  const outputs = getFilteredOutputs();
  const topics = kafkaStore.flowTopics;

  return (
    <div className="real-time-outputs p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Real-Time Processing Outputs</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${kafkaStore.isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium">
              {kafkaStore.isMonitoring ? 'Live Monitoring' : 'Monitoring Stopped'}
            </span>
          </div>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="all">All Topics</option>
            {topics.map(topic => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-3 rounded">
          <div className="text-2xl font-bold text-blue-600">{kafkaStore.monitoringStats.totalOutputs}</div>
          <div className="text-sm text-gray-600">Total Outputs</div>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <div className="text-2xl font-bold text-green-600">{kafkaStore.monitoringStats.topicCount}</div>
          <div className="text-sm text-gray-600">Active Topics</div>
        </div>
        <div className="bg-purple-50 p-3 rounded">
          <div className="text-2xl font-bold text-purple-600">{outputs.length}</div>
          <div className="text-sm text-gray-600">Filtered Results</div>
        </div>
        <div className="bg-orange-50 p-3 rounded">
          <div className="text-2xl font-bold text-orange-600">
            {outputs.filter(o => {
              const now = new Date();
              const outputTime = new Date(o.timestamp);
              return (now - outputTime) < 60000; // Last minute
            }).length}
          </div>
          <div className="text-sm text-gray-600">Last Minute</div>
        </div>
      </div>

      {/* Outputs List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {outputs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-2">📡</div>
            <div className="text-lg font-medium">Waiting for processing outputs...</div>
            <div className="text-sm">Upload a file to start seeing results here</div>
          </div>
        ) : (
          outputs.map((output, index) => {
            const outputType = getOutputType(output.data);
            const isExpanded = expandedOutput === index;
            
            return (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedOutput(isExpanded ? null : index)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full bg-${outputType.color}-100 flex items-center justify-center`}>
                        <span className="text-sm">{outputType.icon}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{outputType.type}</div>
                        <div className="text-sm text-gray-600">{output.topic}</div>
                        <div className="text-xs text-gray-500">
                          Workflow: {output.orgUsrNode}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {new Date(output.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(output.timestamp).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {isExpanded ? 'Click to collapse' : 'Click to expand'}
                      </div>
                    </div>
                  </div>
                  
                  {!isExpanded && (
                    <div className="mt-2 text-sm text-gray-700 truncate">
                      {typeof output.data === 'object' 
                        ? JSON.stringify(output.data).substring(0, 150) + '...'
                        : output.data.substring(0, 150) + '...'
                      }
                    </div>
                  )}
                </div>
                
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="p-4">
                      <h4 className="font-medium text-sm mb-2">Full Output Data:</h4>
                      <pre className="bg-white p-3 rounded border text-xs overflow-x-auto max-h-64 overflow-y-auto">
                        {formatOutputData(output.data)}
                      </pre>
                      
                      <div className="mt-3 grid grid-cols-2 gap-4 text-xs text-gray-600">
                        <div>
                          <strong>Message Key:</strong> {output.messageKey || 'None'}
                        </div>
                        <div>
                          <strong>Partition:</strong> {output.partition}
                        </div>
                        <div>
                          <strong>Offset:</strong> {output.offset}
                        </div>
                        <div>
                          <strong>Timestamp:</strong> {new Date(output.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Clear Button */}
      {outputs.length > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => kafkaStore.clearOutputs()}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
          >
            Clear All Outputs
          </button>
        </div>
      )}
    </div>
  );
});

export default RealTimeOutputs;