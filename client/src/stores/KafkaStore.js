import { makeAutoObservable, runInAction } from 'mobx';
import axios from 'axios';

class KafkaStore {
  // Connection state
  isConnected = false;
  connectionError = null;
  
  // Topics
  topics = [];
  flowTopics = [];
  
  // Messages and outputs
  messages = [];
  flowOutputs = [];
  
  // Monitoring state
  isMonitoring = false;
  monitoringStats = {
    totalOutputs: 0,
    monitoredTopics: [],
    topicCount: 0
  };
  
  // Topic statistics
  topicStats = [];
  
  // Loading states
  isLoadingTopics = false;
  isLoadingMessages = false;
  isSendingMessage = false;
  
  // WebSocket connection for real-time updates
  websocket = null;
  
  constructor() {
    makeAutoObservable(this);
    this.initializeWebSocket();
  }
  
  // WebSocket connection for real-time updates
  initializeWebSocket() {
    try {
      this.websocket = new WebSocket('ws://localhost:3001/ws');
      
      this.websocket.onopen = () => {
        console.log('WebSocket connected');
        runInAction(() => {
          this.isConnected = true;
          this.connectionError = null;
        });
      };
      
      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      };
      
      this.websocket.onclose = () => {
        console.log('WebSocket disconnected');
        runInAction(() => {
          this.isConnected = false;
        });
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          this.initializeWebSocket();
        }, 3000);
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        runInAction(() => {
          this.connectionError = 'WebSocket connection failed';
        });
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      runInAction(() => {
        this.connectionError = 'Failed to initialize WebSocket connection';
      });
    }
  }
  
  handleWebSocketMessage(data) {
    runInAction(() => {
      switch (data.type) {
        case 'flow-output':
          this.flowOutputs.unshift(data.payload);
          // Keep only last 1000 outputs
          if (this.flowOutputs.length > 1000) {
            this.flowOutputs = this.flowOutputs.slice(0, 1000);
          }
          break;
          
        case 'monitoring-stats':
          this.monitoringStats = data.payload;
          break;
          
        case 'topic-stats':
          this.topicStats = data.payload;
          break;
          
        case 'monitoring-started':
          this.isMonitoring = true;
          break;
          
        case 'monitoring-stopped':
          this.isMonitoring = false;
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    });
  }
  
  // API calls to backend
  async fetchTopics() {
    this.isLoadingTopics = true;
    try {
      const response = await axios.get('/api/kafka/topics');
      runInAction(() => {
        this.topics = response.data.topics || [];
        this.flowTopics = response.data.flowTopics || [];
        this.isLoadingTopics = false;
      });
    } catch (error) {
      console.error('Failed to fetch topics:', error);
      runInAction(() => {
        this.isLoadingTopics = false;
        this.connectionError = 'Failed to fetch topics';
      });
    }
  }
  
  async sendMessage(topic, message, key = null) {
    this.isSendingMessage = true;
    try {
      const response = await axios.post('/api/kafka/messages/send', {
        topic,
        message,
        key
      });
      
      runInAction(() => {
        this.isSendingMessage = false;
      });
      
      return response.data.success;
    } catch (error) {
      console.error('Failed to send message:', error);
      runInAction(() => {
        this.isSendingMessage = false;
      });
      return false;
    }
  }
  
  async sendToFlowTopic(orgUsrNode, message, key = null) {
    return await this.sendMessage(`${orgUsrNode}-topic`, message, key);
  }
  
  async startMonitoring(orgUsrNode = null) {
    try {
      const response = await axios.post('/api/kafka/monitoring/start', {
        orgUsrNode
      });
      
      if (response.data.success) {
        runInAction(() => {
          this.isMonitoring = true;
        });
      }
      
      return response.data.success;
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      return false;
    }
  }
  
  async stopMonitoring() {
    try {
      const response = await axios.post('/api/kafka/monitoring/stop');
      
      if (response.data.success) {
        runInAction(() => {
          this.isMonitoring = false;
        });
      }
      
      return response.data.success;
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
      return false;
    }
  }
  
  async getMonitoringStatus() {
    try {
      const response = await axios.get('/api/kafka/monitoring/status');
      runInAction(() => {
        this.monitoringStats = response.data;
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get monitoring status:', error);
      return null;
    }
  }
  
  async getTopicStatistics() {
    try {
      const response = await axios.get('/api/kafka/statistics');
      runInAction(() => {
        this.topicStats = response.data;
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get topic statistics:', error);
      return [];
    }
  }
  
  async clearOutputs() {
    try {
      const response = await axios.post('/api/kafka/outputs/clear');
      if (response.data.success) {
        runInAction(() => {
          this.flowOutputs = [];
          this.topicStats = [];
        });
      }
      return response.data.success;
    } catch (error) {
      console.error('Failed to clear outputs:', error);
      return false;
    }
  }
  
  // Get outputs for specific workflow
  getOutputsForWorkflow(workflowName) {
    return this.flowOutputs.filter(output => 
      output.orgUsrNode.includes(workflowName)
    );
  }
  
  // Get latest outputs
  getLatestOutputs(limit = 10) {
    return this.flowOutputs.slice(0, limit);
  }
  
  // Cleanup
  disconnect() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
}

export const kafkaStore = new KafkaStore();