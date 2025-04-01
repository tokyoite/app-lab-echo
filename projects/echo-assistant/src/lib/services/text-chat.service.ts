// projects/echo-assistant/src/lib/services/text-chat.service.ts

import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { ConfigService } from './config.service';
import { isPlatformBrowser } from '@angular/common';
import { Message } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class TextChatService {
  private socket: WebSocket | null = null;
  private isConnecting = false;
  private isReconnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  // State management
  private isProcessing = new BehaviorSubject<boolean>(false);
  private messageSubject = new Subject<Message>();

  // Track conversation history
  private conversation: Message[] = [];

  constructor(
    private configService: ConfigService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  public get isProcessing$(): Observable<boolean> {
    return this.isProcessing.asObservable();
  }

  public get messages$(): Observable<Message> {
    return this.messageSubject.asObservable();
  }

  /**
   * Connect to the backend WebSocket proxy server
   */
  public async connect(): Promise<void> {
    // Check if running in a browser environment
    if (!isPlatformBrowser(this.platformId)) {
      console.warn(
        'WebSocket connections are only supported in browser environments.'
      );
      return Promise.resolve();
    }

    // Don't create a new connection if already connecting or connected
    if (this.isConnecting) {
      console.log(
        '[TextChatService] Already attempting to connect, skipping duplicate connection attempt'
      );
      return;
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log(
        '[TextChatService] WebSocket connection already open, reusing existing connection'
      );
      return;
    }

    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      console.log(
        '[TextChatService] WebSocket is currently connecting, waiting for connection'
      );
      return;
    }

    // Set connecting flag to prevent multiple connection attempts
    this.isConnecting = true;
    console.log('[TextChatService] Attempting to connect...');

    // Add connection timeout to abort hanging connection attempts
    let connectionTimeout: any = null;
    connectionTimeout = setTimeout(() => {
      if (
        this.isConnecting &&
        (!this.socket || this.socket.readyState !== WebSocket.OPEN)
      ) {
        console.error(
          '[TextChatService] WebSocket connection attempt timed out after 10s'
        );
        if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
          // Force close if stuck in connecting/closing state
          this.socket.close(1001, 'Connection Timeout');
        }
        this.socket = null;
        this.isConnecting = false;
        this.messageSubject.next({
          role: 'system',
          content: 'Connection timed out. Please try again.',
        });
      }
    }, 10000); // 10-second timeout

    try {
      // Close any existing connection that might be in a bad state
      if (this.socket) {
        console.log(
          '[TextChatService] Closing existing WebSocket connection before creating a new one (State: ' +
            this.socket.readyState +
            ')'
        );
        this.socket.close();
        this.socket = null;
      }

      // Connect to WebRTC signaling server
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = new URL(this.configService.config.backendApiUrl).hostname;
      const port = new URL(this.configService.config.backendApiUrl).port || '4000';
      const model = this.configService.config.model || 'gpt-4o-realtime-preview';
      const url = `${protocol}//${host}:${port}/api/webrtc-signaling?model=${model}`;
      
      console.log(
        `[TextChatService] Connecting to backend WebSocket at: ${url}`
      );

      this.socket = new WebSocket(url);

      // --- WebSocket Event Listeners ---

      // Handle INCOMING messages
      this.socket.addEventListener('message', (event: MessageEvent) => {
        try {
          if (typeof event.data === 'string') {
            // Process text data (JSON)
            try {
              const message = JSON.parse(event.data);
              // Delegate handling to separate method
              this.handleBackendMessage(message);
            } catch (jsonError) {
              console.error(
                '[TextChatService] Error parsing JSON message:',
                jsonError,
                event.data
              );
            }
          } else {
            // Handle binary data if needed (e.g., ArrayBuffer, Blob)
            console.warn(
              '[TextChatService] Received unexpected binary message:',
              event.data
            );
          }
        } catch (error) {
          console.error(
            '[TextChatService] Error processing WebSocket message:',
            error
          );
        }
      });

      // Handle connection OPEN
      this.socket.addEventListener('open', () => {
        console.log(
          '[TextChatService] WebSocket connection opened successfully.'
        );
        this.isConnecting = false; // Connection established
        this.reconnectAttempts = 0; // Reset reconnect counter on success
        this.isReconnecting = false;

        // Clear the connection timeout timer
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
          console.log('[TextChatService] Connection timeout cleared.');
        }

        // Initialize session for text-only mode
        this.initializeSessionForText();
      });

      // Handle connection ERRORS
      this.socket.addEventListener('error', (event) => {
        console.error('[TextChatService] WebSocket error event:', event);
        this.isProcessing.next(false);
        this.isConnecting = false;
        this.isReconnecting = false;

        // Clear connection timeout if it's still running
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
          console.log(
            '[TextChatService] Connection timeout cleared due to error.'
          );
        }

        // Show error to user
        this.messageSubject.next({
          role: 'system',
          content:
            'Connection error. Please check your network or try again later.',
        });

        // Clean up the potentially broken socket object
        this.socket = null;
      });

      // Handle connection CLOSE
      this.socket.addEventListener('close', (event: CloseEvent) => {
        console.log(
          `[TextChatService] WebSocket connection closed. Code: ${
            event.code
          }, Reason: "${event.reason || 'No reason given'}", Clean: ${
            event.wasClean
          }`
        );
        this.isProcessing.next(false);
        this.isConnecting = false; // No longer connecting

        // Clear connection timeout if it's somehow still active
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
          console.log('[TextChatService] Connection timeout cleared on close.');
        }

        // Show disconnection message only if it wasn't a clean closure
        if (!event.wasClean || event.code !== 1000) {
          this.messageSubject.next({
            role: 'system',
            content: `Connection closed unexpectedly. ${
              event.reason || 'Please try reconnecting.'
            }`,
          });
        } else {
          // Normal closure (e.g., user logout, component destroy)
          this.messageSubject.next({
            role: 'system',
            content: 'Connection closed.',
          });
        }

        // Nullify the socket object after handling the close event
        this.socket = null;
      });
    } catch (error) {
      console.error(
        '[TextChatService] Error initializing WebSocket connection:',
        error
      );
      this.isProcessing.next(false);
      this.isConnecting = false;

      // Clear connection timeout if error happened before listener setup
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
      this.messageSubject.next({
        role: 'system',
        content: 'Failed to initialize connection. Please try again.',
      });
      // Ensure socket is null if initialization failed partway
      this.socket = null;
    }
  }

  /**
   * Sends the initial configuration message to the backend proxy
   * to establish the OpenAI session for text-only interaction.
   */
  private async initializeSessionForText(): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error(
        '[TextChatService] Cannot initialize session: WebSocket not connected'
      );
      return;
    }

    console.log(
      '[TextChatService] Initializing proxied OpenAI session for text mode...'
    );
    
    const initMessage = {
      type: 'initialize_webrtc',
      modalities: ['text'],
    };

    try {
      this.socket.send(JSON.stringify(initMessage));
      console.log('[TextChatService] Initialization message sent.');

      // Set user ID if available
      if (this.configService.config.userId) {
        const userIdMessage = {
          type: 'set_user_id',
          userId: this.configService.config.userId
        };
        this.socket.send(JSON.stringify(userIdMessage));
        console.log('[TextChatService] User ID sent to backend:', this.configService.config.userId);
      }
    } catch (error) {
      console.error(
        '[TextChatService] Error sending initialization message:',
        error
      );
    }
  }

  /**
   * Helper method to handle incoming messages from the backend WebSocket proxy.
   */
  private handleBackendMessage(message: any): void {
    console.log('[TextChatService] Processing message from backend:', message);

    switch (message.type) {
      case 'user_context_loaded':
        console.log('[TextChatService] User context loaded for:', message.userId);
        break;

      case 'response.text.delta':
        // Main way to receive text chunks from OpenAI via the proxy
        if (
          message.delta &&
          typeof message.delta === 'string' &&
          message.delta.trim() !== ''
        ) {
          this.messageSubject.next({
            role: 'assistant',
            content: message.delta,
          });
        }
        break;

      case 'response.content_part.added':
        if (message.content_part?.content?.text) {
          this.messageSubject.next({
            role: 'assistant',
            content: message.content_part.content.text,
          });
        }
        break;

      // --- State & Informational Messages from OpenAI (via proxy) ---
      case 'session.created':
        console.log(
          '[TextChatService] Proxied OpenAI session created:',
          message.session?.id
        );
        break;

      case 'conversation.item.created':
        console.log(
          '[TextChatService] Message successfully sent to OpenAI via proxy:',
          message.item?.id
        );
        break;

      case 'response.created':
        console.log(
          '[TextChatService] OpenAI response generation initiated:',
          message.response_id
        );
        this.isProcessing.next(true); // Start showing "thinking" indicator
        break;

      case 'response.done':
        console.log(
          '[TextChatService] OpenAI response generation complete:',
          message.response?.id
        );
        this.isProcessing.next(false); // Stop showing "thinking" indicator
        break;

      // --- Error & Connection Messages from Backend Proxy ---
      case 'connection_closed':
        console.log(
          '[TextChatService] Backend reported OpenAI connection closed:',
          message
        );
        // Treat this similarly to a WebSocket close event
        this.handleConnectionClosure(
          message.code,
          message.reason?.toString() || 'Proxied connection closed'
        );
        break;

      case 'error':
        console.error(
          '[TextChatService] Received error message:',
          message.error
        );
        this.messageSubject.next({
          role: 'system',
          content: `Error: ${message.error || 'An unknown error occurred.'}`,
        });
        this.isProcessing.next(false); // Stop processing on error
        break;

      // --- Other OpenAI events (forwarded by backend) ---
      case 'response.content_part.done':
      case 'response.output_item.done':
      case 'rate_limits.updated':
      case 'response.output_item.added':
        console.log(
          `[TextChatService] Received informational event: ${message.type}`
        );
        break;

      default:
        console.warn(
          '[TextChatService] Received message with unhandled type:',
          message.type,
          message
        );
    }
  }

  /**
   * Handles connection closure
   */
  private handleConnectionClosure(code?: number, reason?: string): void {
    if (this.socket) {
      this.socket = null;
    }
    this.isProcessing.next(false);
    this.isConnecting = false;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;

    const cleanClosure = code === 1000 || code === 1005;
    if (!cleanClosure) {
      this.messageSubject.next({
        role: 'system',
        content: `Connection closed unexpectedly. ${
          reason || 'Please try reconnecting.'
        }`,
      });
    } else {
      this.messageSubject.next({
        role: 'system',
        content: 'Connection closed.',
      });
    }
  }

  /**
   * Send text message to the backend proxy
   */
  public async sendTextMessage(text: string): Promise<void> {
    if (!text || !text.trim()) {
      console.warn('[TextChatService] Attempted to send empty message.');
      return;
    }

    // Always add the message to UI immediately
    this.messageSubject.next({ role: 'user', content: text });
    this.conversation.push({ role: 'user', content: text });

    // Handle cases where connection is not ready
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn(
        '[TextChatService] WebSocket not open. Attempting to connect/reconnect...'
      );
      
      // Prevent infinite reconnection loop if already trying
      if (this.isReconnecting || this.isConnecting) {
        console.log(
          `[TextChatService] Already attempting to connect/reconnect. Message will be queued or dropped.`
        );
        return;
      }

      // Check max reconnect attempts
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error(
          `[TextChatService] Maximum reconnection attempts (${this.maxReconnectAttempts}) reached.`
        );
        this.messageSubject.next({
          role: 'system',
          content:
            'Unable to connect to the server after multiple attempts. Please try again later.',
        });
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        this.isProcessing.next(false);
        return;
      }

      // Try to connect and resend the message
      this.isReconnecting = true;
      this.reconnectAttempts++;

      console.log(
        `[TextChatService] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );

      this.connect()
        .then(() => {
          // If socket is now open, send the message
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.log(
              '[TextChatService] Reconnection successful. Sending message...'
            );
            this.sendMessageToBackend(text);
          } else {
            console.warn(
              '[TextChatService] Reconnection attempt finished, but socket not open.'
            );
          }
          this.isReconnecting = false;
        })
        .catch((error) => {
          console.error('[TextChatService] Reconnection failed:', error);
          this.isReconnecting = false;
          this.messageSubject.next({
            role: 'system',
            content: 'Failed to reconnect to the server.',
          });
        });

      return;
    }

    // If already connected, send the message directly
    this.sendMessageToBackend(text);
  }

  /**
   * Sends a message to the connected WebSocket
   */
  private async sendMessageToBackend(text: string): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error(
        '[TextChatService] Cannot send message: WebSocket is not open.'
      );
      this.isProcessing.next(false);
      return;
    }

    try {
      // Use the message format expected by the backend
      const textMessage = {
        type: 'text_message',
        text: text,
      };

      console.log(
        '[TextChatService] Sending text message to backend proxy:',
        textMessage
      );
      this.socket.send(JSON.stringify(textMessage));

    } catch (error) {
      console.error(
        '[TextChatService] Error sending text message via WebSocket:',
        error
      );
      this.isProcessing.next(false);
      this.messageSubject.next({
        role: 'system',
        content: 'Error sending message. Please try again.',
      });
    }
  }

  /**
   * Close the WebSocket connection cleanly.
   */
  public disconnect(): void {
    if (this.socket) {
      console.log('[TextChatService] Disconnecting WebSocket...');
      try {
        this.socket.close(1000, 'Client disconnecting normally');
        console.log(
          '[TextChatService] WebSocket connection closed command sent.'
        );
      } catch (error) {
        console.error(
          '[TextChatService] Error closing WebSocket connection:',
          error
        );
      } finally {
        this.socket = null;
        this.isConnecting = false;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.isProcessing.next(false);
      }
    } else {
      console.log(
        '[TextChatService] disconnect called but no active socket found.'
      );
    }
  }
}