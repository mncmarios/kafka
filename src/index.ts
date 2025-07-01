import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { defaultKafkaConfig } from './config/kafkaConfig.js';
import { KafkaAdminService } from './services/KafkaAdminService.js';
import { KafkaProducerService } from './services/KafkaProducerService.js';
import { KafkaOutputMonitor } from './services/KafkaOutputMonitor.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Kafka services
const adminService = new KafkaAdminService(defaultKafkaConfig);
const producerService = new KafkaProducerService(defaultKafkaConfig);
const outputMonitor = new KafkaOutputMonitor(defaultKafkaConfig);

// WebSocket connections
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  clients.add(ws);
  
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
const broadcast = (data) => {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
};

// Set up output monitor events
outputMonitor.on('flow-output', (output) => {
  broadcast({
    type: 'flow-output',
    payload: output
  });
});

outputMonitor.on('monitoring-started', (data) => {
  broadcast({
    type: 'monitoring-started',
    payload: data
  });
});

outputMonitor.on('monitoring-stopped', () => {
  broadcast({
    type: 'monitoring-stopped'
  });
});

// API Routes

// Get all topics
app.get('/api/kafka/topics', async (req, res) => {
  try {
    const allTopics = await adminService.getAllTopics();
    const flowTopics = await adminService.getFlowTopics();
    
    res.json({
      success: true,
      topics: allTopics,
      flowTopics: flowTopics
    });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send message to topic
app.post('/api/kafka/messages/send', async (req, res) => {
  try {
    const { topic, message, key } = req.body;
    
    if (!topic || !message) {
      return res.status(400).json({
        success: false,
        error: 'Topic and message are required'
      });
    }
    
    const success = await producerService.sendMessage(topic, message, key);
    
    res.json({
      success: success,
      message: success ? 'Message sent successfully' : 'Failed to send message'
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start monitoring
app.post('/api/kafka/monitoring/start', async (req, res) => {
  try {
    const { orgUsrNode } = req.body;
    
    await outputMonitor.startMonitoring(orgUsrNode);
    
    res.json({
      success: true,
      message: 'Monitoring started successfully'
    });
  } catch (error) {
    console.error('Error starting monitoring:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Stop monitoring
app.post('/api/kafka/monitoring/stop', async (req, res) => {
  try {
    await outputMonitor.stopMonitoring();
    
    res.json({
      success: true,
      message: 'Monitoring stopped successfully'
    });
  } catch (error) {
    console.error('Error stopping monitoring:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get monitoring status
app.get('/api/kafka/monitoring/status', async (req, res) => {
  try {
    const status = outputMonitor.getMonitoringStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting monitoring status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get topic statistics
app.get('/api/kafka/statistics', async (req, res) => {
  try {
    const stats = outputMonitor.getTopicStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear outputs
app.post('/api/kafka/outputs/clear', async (req, res) => {
  try {
    outputMonitor.clearOutputs();
    res.json({
      success: true,
      message: 'Outputs cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing outputs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all outputs
app.get('/api/kafka/outputs', async (req, res) => {
  try {
    const { orgUsrNode, topic, limit } = req.query;
    
    let outputs;
    if (orgUsrNode) {
      outputs = outputMonitor.getOutputsForOrgUsrNode(orgUsrNode);
    } else if (topic) {
      outputs = outputMonitor.getOutputsFromTopic(topic);
    } else {
      outputs = outputMonitor.getLatestOutputs(limit ? parseInt(limit) : 100);
    }
    
    res.json({
      success: true,
      outputs: outputs
    });
  } catch (error) {
    console.error('Error getting outputs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Environment variables endpoint (for compatibility with existing frontend)
app.get('/api/env', (req, res) => {
  res.json({
    ORG_NAME: process.env.ORG_NAME || 'default_org',
    USER_NAME: process.env.USER_NAME || 'default_user'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      kafka: 'connected',
      websocket: `${clients.size} clients connected`
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  // Start monitoring on server startup
  outputMonitor.startMonitoring().catch(console.error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  
  await outputMonitor.disconnect();
  await producerService.disconnect();
  await adminService.disconnect();
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  
  await outputMonitor.disconnect();
  await producerService.disconnect();
  await adminService.disconnect();
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});