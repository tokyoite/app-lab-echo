// projects/echo-assistant/src/lib/components/echo-dialog/echo-dialog.component.ts

import {
  Component,
  inject,
  Input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { TesseractAnimationComponent } from '../tesseract-animation/tesseract-animation.component';
import { ConfigService } from '../../services/config.service';
import { ApiService, Message } from '../../services/api.service';
import { AudioChatService } from '../../services/audio-chat.service';

@Component({
  selector: 'echo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TesseractAnimationComponent],
  templateUrl: './echo-dialog.component.html',
  styleUrl: './echo-dialog.component.css',
})
export class EchoDialogComponent implements AfterViewInit, OnInit, OnDestroy {
  @Input() isOpen = true;
  @ViewChild('echoBody') private echoBodyRef!: ElementRef<HTMLDivElement>;

  configService = inject(ConfigService);
  apiService = inject(ApiService);
  audioChatService = inject(AudioChatService);

  private subscriptions = new Subscription();

  isMinimized = false;
  isProcessing = false;
  isListening = false;
  isVoiceSupported = false;
  status = 'Ready';
  waitingText = 'Processing your request...';
  userInput = '';
  messages: Message[] = [];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId) && this.configService.config.enableVoice) {
      this.initializeVoiceService();
    }

    // Subscribe to audio service events
    this.subscriptions.add(
      this.audioChatService.isListening$.subscribe(isListening => {
        this.isListening = isListening;
        if (isListening) {
          this.status = 'Listening...';
        } else {
          this.status = 'Ready';
        }
      })
    );

    this.subscriptions.add(
      this.audioChatService.isProcessing$.subscribe(isProcessing => {
        this.isProcessing = isProcessing;
        if (isProcessing && !this.isListening) {
          this.status = 'Processing...';
          this.waitingText = 'Generating response...';
        } else if (!isProcessing && !this.isListening) {
          this.status = 'Ready';
        }
      })
    );

    this.subscriptions.add(
      this.audioChatService.messages$.subscribe(message => {
        if (message.role === 'user') {
          // Add transcribed speech to input field
          this.userInput = message.content;
          // Auto-send the message
          if (this.userInput.trim()) {
            this.sendMessage();
          }
        } else if (message.role === 'assistant') {
          // Append to last assistant message or create new one
          const lastMessage = this.messages[this.messages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content += message.content;
          } else {
            this.messages.push({
              role: 'assistant',
              content: message.content,
            });
          }
          this.scrollToBottom();
        } else if (message.role === 'system') {
          // Display system messages
          this.messages.push({
            role: 'assistant',
            content: message.content,
          });
          this.scrollToBottom();
        }
      })
    );
  }

  ngAfterViewInit(): void {
    // Add initial welcome message
    this.messages.push({
      role: 'assistant',
      content:
        this.configService.config.welcomeMessage ||
        "Hello! I'm Echo, your AI assistant. How can I help you today?",
    });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.unsubscribe();
    
    // Close audio connections
    if (isPlatformBrowser(this.platformId)) {
      this.audioChatService.disconnect();
    }
  }

  private initializeVoiceService(): void {
    this.audioChatService.initialize()
      .then(() => {
        console.log('[EchoDialogComponent] Voice service initialized successfully');
        this.isVoiceSupported = true;
      })
      .catch(error => {
        console.warn('[EchoDialogComponent] Voice service initialization failed:', error);
        this.isVoiceSupported = false;
      });
  }

  handleClick(event: MouseEvent): void {
    // Prevent click if it's on the minimize button
    if (!(event.target as HTMLElement).closest('.echo-minimize')) {
      // Toggle minimized state and ensure dialog is open
      this.isMinimized = !this.isMinimized;
      this.isOpen = true;

      console.log('Dialog state:', {
        isOpen: this.isOpen,
        isMinimized: this.isMinimized,
      });
    }
  }

  minimize(event: MouseEvent): void {
    event.stopPropagation();
    this.isMinimized = !this.isMinimized;

    // Make sure dialog stays open
    this.isOpen = true;

    console.log('Minimize clicked:', {
      isOpen: this.isOpen,
      isMinimized: this.isMinimized,
    });
  }

  sendMessage(): void {
    if (!this.userInput.trim() || this.isProcessing) {
      return;
    }

    // Add user message
    this.messages.push({
      role: 'user',
      content: this.userInput,
    });

    // Clear input
    const userMessage = this.userInput;
    this.userInput = '';

    // Show processing state
    this.isProcessing = true;
    this.status = 'Processing...';
    this.waitingText = 'Generating response...';

    // Scroll to bottom
    setTimeout(() => this.scrollToBottom(), 0);

    // Call API
    this.apiService.sendMessage(userMessage, this.messages).subscribe({
      next: (response) => {
        // Add assistant message
        this.messages.push({
          role: 'assistant',
          content: response,
        });

        // Reset state
        this.isProcessing = false;
        this.status = 'Ready';

        // Scroll to bottom
        setTimeout(() => this.scrollToBottom(), 0);
      },
      error: (err) => {
        console.error('Error sending message:', err);

        // Add error message
        this.messages.push({
          role: 'assistant',
          content:
            'Sorry, I encountered an error processing your request. Please try again.',
        });

        // Reset state
        this.isProcessing = false;
        this.status = 'Ready';

        // Scroll to bottom
        setTimeout(() => this.scrollToBottom(), 0);
      },
    });
  }

  toggleSpeechRecognition(): void {
    if (!this.isVoiceSupported) {
      this.messages.push({
        role: 'assistant',
        content: 'Voice input is not supported or not enabled in the configuration.',
      });
      return;
    }

    if (this.isListening) {
      // Stop listening
      this.audioChatService.stopListening();
    } else {
      // First check if we have microphone permissions
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'microphone' as PermissionName })
          .then((permissionStatus) => {
            if (permissionStatus.state === 'granted') {
              this.startVoiceRecognition();
            } else if (permissionStatus.state === 'prompt') {
              // We'll show a message and then try - the browser will prompt
              this.messages.push({
                role: 'assistant',
                content: 'Please allow microphone access when prompted.',
              });
              setTimeout(() => this.startVoiceRecognition(), 1000);
            } else {
              // Permission denied
              this.messages.push({
                role: 'assistant',
                content: 'Microphone access is blocked. Please enable it in your browser settings to use voice features.',
              });
            }
          })
          .catch(error => {
            console.warn('[EchoDialogComponent] Cannot check permissions, trying anyway:', error);
            this.startVoiceRecognition();
          });
      } else {
        // Browser doesn't support permissions API, just try
        this.startVoiceRecognition();
      }
    }
  }
  
  private startVoiceRecognition(): void {
    this.audioChatService.startListening()
      .then(() => {
        console.log('[EchoDialogComponent] Started listening');
      })
      .catch(error => {
        console.error('[EchoDialogComponent] Error starting voice:', error);
        this.messages.push({
          role: 'assistant',
          content: `Failed to start voice input: ${error.message || 'Unknown error'}`,
        });
      });
  }

  private scrollToBottom(): void {
    if (this.echoBodyRef) {
      const element = this.echoBodyRef.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }
}
