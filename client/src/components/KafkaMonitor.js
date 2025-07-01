import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { kafkaStore } from '../stores/KafkaStore';

const KafkaMonitor = observer(() => {
  const [selectedTopic, setSelectedTopic] = useState('');
  const [messageToSend, setMessageToSend] = useState('');
  const [messageKey, setMessageKey] = useState('');

  useEffect(() => {
    kafkaStore.fetchTopics();
    kafkaStore.getMonitoringStatus();
    kafkaStore.getTopicStatistics();
  }, []);

  const handleStartMonitoring = async () => {
    const success = await kafkaStore.startMonitoring();
    if (success) {
      console.log('Monitoring started successfully');
    }
  };

  const handleStopMonitoring = async () => {
    const success = await kafkaStore.stopMonitoring();
    if (success) {
      console.log('Monitoring stopped successfully');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTopic || !messageToSend) return;
    
    const success = await kafkaStore.sendMessage(
      selectedTopic, 
      messageToSend, 
      messageKey || null
    );
    
    if (success) {
      setMessageToSend('');
      setMessageKey('');
      console.log('Message sent successfully');
    }
  };

  const handleClearOutputs = async () => {
    const success = await kafkaStore.clearOutputs();
    if (success) {
      console.log('Outputs cleared successfully');
    }
  };

  return (
    <div className="kafka-monitor p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Kafka Monitor</h2>
      
      {/* Connection Status */}
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${kafkaStore.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm font-medium">
            {kafkaStore.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {kafkaStore.connectionError && (
          <p className="text-red-500 text-sm mt-1">{kafkaStore.connectionError}</p>
        )}
      </div>

      {/* Monitoring Controls */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Monitoring Controls</h3>
        <div className="flex space-x-3">
          <button
            onClick={handleStartMonitoring}
            disabled={kafkaStore.isMonitoring}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            Start Monitoring
          </button>
          <button
            onClick={handleStopMonitoring}
            disabled={!kafkaStore.isMonitoring}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
          >
            Stop Monitoring
          </button>
          <button
            onClick={handleClearOutputs}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Clear Outputs
          </button>
        </div>
        <div className="mt-2">
          <span className={`text-sm ${kafkaStore.isMonitoring ? 'text-green-600' : 'text-gray-600'}`}>
            Status: {kafkaStore.isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}
          </span>
        </div>
      </div>

      {/* Send Message */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Send Message</h3>
        <div className="space-y-3">
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="">Select Topic</option>
            {kafkaStore.topics.map(topic => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Message Key (optional)"
            value={messageKey}
            onChange={(e) => setMessageKey(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
          <textarea
            placeholder="Message content"
            value={messageToSend}
            onChange={(e) => setMessageToSend(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded h-24"
          />
          <button
            onClick={handleSendMessage}
            disabled={kafkaStore.isSendingMessage || !selectedTopic || !messageToSend}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {kafkaStore.isSendingMessage ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-100 p-3 rounded">
            <div className="text-2xl font-bold text-blue-600">{kafkaStore.monitoringStats.totalOutputs}</div>
            <div className="text-sm text-gray-600">Total Outputs</div>
          </div>
          <div className="bg-gray-100 p-3 rounded">
            <div className="text-2xl font-bold text-green-600">{kafkaStore.monitoringStats.topicCount}</div>
            <div className="text-sm text-gray-600">Monitored Topics</div>
          </div>
          <div className="bg-gray-100 p-3 rounded">
            <div className="text-2xl font-bold text-purple-600">{kafkaStore.topics.length}</div>
            <div className="text-sm text-gray-600">Total Topics</div>
          </div>
          <div className="bg-gray-100 p-3 rounded">
            <div className="text-2xl font-bold text-orange-600">{kafkaStore.flowTopics.length}</div>
            <div className="text-sm text-gray-600">Flow Topics</div>
          </div>
        </div>
      </div>

      {/* Recent Outputs */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Recent Outputs</h3>
        <div className="max-h-64 overflow-y-auto border border-gray-300 rounded">
          {kafkaStore.flowOutputs.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">No outputs received yet</div>
          ) : (
            kafkaStore.getLatestOutputs(10).map((output, index) => (
              <div key={index} className="p-3 border-b border-gray-200 last:border-b-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm text-blue-600">{output.topic}</span>
                  <span className="text-xs text-gray-500">{new Date(output.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-sm text-gray-700 truncate">
                  {typeof output.data === 'object' ? JSON.stringify(output.data) : output.data}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Org-User-Node: {output.orgUsrNode}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});

export default KafkaMonitor;