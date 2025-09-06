import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnections } from '@/lib/notification-stream';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;
  const connections = getConnections();
  
  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Store the connection
      connections.set(userId, controller);
      
      // Send initial connection message
      const data = JSON.stringify({
        type: 'connection',
        message: 'Connected to calendar notifications',
        timestamp: new Date().toISOString()
      });
      
      controller.enqueue(`data: ${data}\n\n`);
      
      // Send keep-alive every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(`: keep-alive\n\n`);
        } catch (error) {
          clearInterval(keepAlive);
          connections.delete(userId);
        }
      }, 30000);
      
      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        connections.delete(userId);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
      });
    },
    
    cancel() {
      connections.delete(userId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}