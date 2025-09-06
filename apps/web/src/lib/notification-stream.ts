// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>();

// Utility function to send notifications to specific users
export function sendNotificationToUser(userId: string, notification: any) {
  const controller = connections.get(userId);
  
  if (controller) {
    try {
      const data = JSON.stringify({
        ...notification,
        timestamp: new Date().toISOString()
      });
      
      controller.enqueue(`data: ${data}\n\n`);
      return true;
    } catch (error) {
      console.error('Error sending notification to user:', userId, error);
      connections.delete(userId);
      return false;
    }
  }
  
  return false;
}

// Utility function to broadcast notifications to all connected users
export function broadcastNotification(notification: any) {
  const data = JSON.stringify({
    ...notification,
    timestamp: new Date().toISOString()
  });
  
  const disconnectedUsers: string[] = [];
  
  connections.forEach((controller, userId) => {
    try {
      controller.enqueue(`data: ${data}\n\n`);
    } catch (error) {
      console.error('Error broadcasting to user:', userId, error);
      disconnectedUsers.push(userId);
    }
  });
  
  // Clean up disconnected users
  disconnectedUsers.forEach(userId => {
    connections.delete(userId);
  });
  
  return connections.size - disconnectedUsers.length;
}

// Get active connections count
export function getActiveConnectionsCount(): number {
  return connections.size;
}

// Get connected user IDs
export function getConnectedUsers(): string[] {
  return Array.from(connections.keys());
}

// Get connections map for internal use
export function getConnections() {
  return connections;
}