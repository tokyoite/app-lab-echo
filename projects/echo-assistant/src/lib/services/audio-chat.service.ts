// projects/echo-assistant/src/lib/services/audio-chat.service.ts
import { Inject, Injectable, PLATFORM_ID, NgZone } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { ConfigService } from './config.service';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class AudioChatService {
  // --- WebRTC Connection ---
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private readonly RTC_CONFIG: RTCConfiguration = {
    iceServers: [
      // Public STUN servers
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };
  private isWebRTCInitializing = false;
  private isWebRTCConnected = false;

  // --- State Management ---
  private isListening = new BehaviorSubject<boolean>(false);
  private isProcessing = new BehaviorSubject<boolean>(false);
  private messageSubject = new Subject<{ role: string; content: string }>(); // For system/error messages

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone,
    private configService: ConfigService,
    private apiService: ApiService
  ) {
    // Create audio element only in browser
    if (isPlatformBrowser(this.platformId)) {
      this.remoteAudioElement = document.createElement('audio');
      this.remoteAudioElement.autoplay = true;
      this.remoteAudioElement.style.display = 'none';
      document.body.appendChild(this.remoteAudioElement);
    }
  }

  // --- Public Observables ---
  public get isListening$(): Observable<boolean> {
    return this.isListening.asObservable();
  }
  public get isProcessing$(): Observable<boolean> {
    return this.isProcessing.asObservable();
  }
  public get messages$(): Observable<{ role: string; content: string }> {
    return this.messageSubject.asObservable();
  }

  // --- Public Methods ---

  /** Can be called to ensure service is ready (e.g., check browser support). */
  public initialize(): Promise<void> {
    if (!isPlatformBrowser(this.platformId))
      return Promise.reject('Browser only');

    if (!this.configService.config.enableVoice) {
      console.log('[AudioChatService] Voice features disabled in config.');
      return Promise.reject('Voice features disabled');
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject('getUserMedia not supported');
    }
    if (typeof RTCPeerConnection === 'undefined') {
      return Promise.reject('RTCPeerConnection not supported');
    }
    console.log('[AudioChatService] Initialized (WebRTC support checked).');
    return Promise.resolve();
  }

  /** Starts WebRTC audio session using HTTP POST for SDP exchange. */
  public async startListening(): Promise<void> {
    if (!isPlatformBrowser(this.platformId))
      return Promise.reject('Browser only');
    if (this.isListening.value) {
      console.warn('[AudioChatService] Already listening.');
      return;
    }
    if (this.isWebRTCInitializing) {
      console.warn('[AudioChatService] Init in progress.');
      return;
    }

    console.log('[AudioChatService] Starting listening (HTTP Signaling)...');
    this.isWebRTCInitializing = true;
    this.isListening.next(true);
    this.isProcessing.next(true);

    // Get Mic Access
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      console.log('[AudioChatService] Mic access granted.');
    } catch (error) {
      console.error('[AudioChatService] Mic access error:', error);
      this.messageSubject.next({
        role: 'system',
        content: 'Error: Mic access denied or unavailable.',
      });
      this.abortStartListening(error); // Call cleanup/reject helper
      return; // Exit function after calling abort
    }

    // Setup PeerConnection and Start Signaling
    try {
      this.setupPeerConnection(); // Creates PC, sets handlers
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection)
          this.peerConnection.addTrack(track, this.localStream!);
      });
      console.log(`[AudioChatService] Local audio track added.`);

      // Create & Send Offer via HTTP POST
      console.log('[AudioChatService] Creating SDP Offer...');
      const offer = await this.peerConnection!.createOffer();
      await this.peerConnection!.setLocalDescription(offer);
      console.log(
        '[AudioChatService] Offer created & set as local description.'
      );

      const model =
        this.configService.config.model || 'gpt-4o-realtime-preview';

      // Using the ApiService to send the offer to the backend
      try {
        const sdpAnswer = await this.apiService.sendWebRTCOffer(
          offer.sdp!,
          model
        );

        if (!sdpAnswer || !sdpAnswer.includes('a=candidate')) {
          // Basic SDP check
          throw new Error('Invalid SDP Answer received from server.');
        }
        console.log(
          '[AudioChatService] Received valid SDP Answer from backend.'
        );

        // Set Remote Description (Answer)
        await this.peerConnection!.setRemoteDescription({
          type: 'answer',
          sdp: sdpAnswer,
        });
        console.log('[AudioChatService] Remote description (answer) set.');

        this.isWebRTCInitializing = false;
        console.log(
          '[AudioChatService] HTTP signaling complete. Waiting for ICE connection...'
        );
        // Note: isProcessing remains true until ICE connects or track received
      } catch (signalError) {
        console.error('[AudioChatService] Signaling error:', signalError);
        if (signalError instanceof Error) {
          throw new Error(`Signaling failed: ${signalError.message}`);
        } else {
          throw new Error(`Signaling failed: ${String(signalError)}`);
        }
      }
    } catch (error) {
      console.error(
        '[AudioChatService] Error during WebRTC setup/HTTP signaling:',
        error
      );
      const errorMsg =
        error instanceof Error
          ? error.message
          : 'Could not set up audio connection.';
      this.messageSubject.next({
        role: 'system',
        content: `Error: ${errorMsg}`,
      });
      this.abortStartListening(error); // Call cleanup/reject helper
    }
  }

  /** Stops the WebRTC audio session. */
  public stopListening(): void {
    if (!this.isListening.value && !this.isWebRTCInitializing) return;
    console.log('[AudioChatService] Stopping listening...');
    this.cleanupWebRTC();
    // Update state after cleanup
    this.isListening.next(false);
    this.isProcessing.next(false);
    this.isWebRTCConnected = false;
    this.isWebRTCInitializing = false;
    console.log('[AudioChatService] Listening stopped.');
  }

  /** Cleans up resources. */
  public disconnect(): void {
    console.log('[AudioChatService] Disconnecting...');
    this.stopListening(); // Includes WebRTC cleanup
    if (this.remoteAudioElement) {
      this.remoteAudioElement.remove();
      this.remoteAudioElement = null;
    }
    console.log('[AudioChatService] Disconnected.');
  }

  // --- Private Helper Methods ---

  /** Creates and configures the RTCPeerConnection */
  private setupPeerConnection(): void {
    this.cleanupPeerConnection();
    this.peerConnection = new RTCPeerConnection(this.RTC_CONFIG);
    console.log('[AudioChatService] RTCPeerConnection created.');

    // Log local ICE candidates for debugging - DO NOT SEND THEM
    this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        console.debug(
          `[AudioChatService] Local ICE Candidate (Debug): ${event.candidate.type}`
        );
      } else {
        console.debug(
          '[AudioChatService] End of local ICE candidates (Debug).'
        );
      }
    };

    this.peerConnection.ontrack = this.handleRemoteTrack.bind(this);
    this.peerConnection.oniceconnectionstatechange =
      this.handleIceConnectionStateChange.bind(this);
    this.peerConnection.onsignalingstatechange =
      this.handleSignalingStateChange.bind(this);
  }

  private handleRemoteTrack(event: RTCTrackEvent): void {
    console.log(
      `[AudioChatService] Remote track received: Kind=${event.track.kind}, ID=${event.track.id}`
    );

    // Ensure we have the audio element reference
    if (!this.remoteAudioElement) {
      console.error(
        '[AudioChatService] Cannot play audio, remoteAudioElement is null.'
      );
      return;
    }

    if (event.track.kind === 'audio' && event.streams.length > 0) {
      console.log(
        '[AudioChatService] Attaching remote audio track to element.'
      );
      const remoteStream = event.streams[0];

      const [track] = remoteStream.getAudioTracks();
      if (track) {
        console.log('[AudioChatService] Remote audio track state:', {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
      } else {
        console.warn(
          '[AudioChatService] No audio track found in remote stream.'
        );
      }

      // Assign the stream
      this.remoteAudioElement.srcObject = remoteStream;

      // Ensure not muted and volume is up
      this.remoteAudioElement.muted = false;
      this.remoteAudioElement.volume = 1.0;

      // Explicitly try to play the audio
      const playPromise = this.remoteAudioElement.play();

      if (playPromise !== undefined) {
        playPromise
          .then((_) => {
            // Automatic playback started!
            console.log(
              '[AudioChatService] Audio playback started successfully via play().'
            );
            this.ngZone.run(() => {
              // Ensure state updates run in zone
              this.isProcessing.next(false);
              if (this.isWebRTCInitializing) this.isWebRTCInitializing = false;
            });
          })
          .catch((error) => {
            // Autoplay was prevented.
            console.error('[AudioChatService] Audio playback failed:', error);
            // You might need to provide a "Click to Play" button if play() fails here
            // due to stricter browser policies.
            this.messageSubject.next({
              role: 'system',
              content:
                'Could not autoplay audio. Browser policy might require further interaction.',
            });
            this.ngZone.run(() => this.isProcessing.next(false)); // Still stop processing indicator
          });
      } else {
        // play() didn't return a promise (older browser? unlikely)
        console.log(
          '[AudioChatService] play() did not return a promise. Autoplay relies on element attribute.'
        );
        this.ngZone.run(() => {
          this.isProcessing.next(false);
          if (this.isWebRTCInitializing) this.isWebRTCInitializing = false;
        });
      }
    } else if (event.track.kind !== 'audio') {
      console.warn(
        `[AudioChatService] Received non-audio track: ${event.track.kind}`
      );
    } else if (event.streams.length === 0) {
      console.warn(
        `[AudioChatService] Received audio track but no associated streams.`
      );
    }
  }

  /** Handles changes in the ICE connection state */
  private handleIceConnectionStateChange(): void {
    if (!this.peerConnection) return;
    const state = this.peerConnection.iceConnectionState;
    console.log(`[AudioChatService] ICE connection state: ${state}`);
    this.ngZone.run(() => {
      this.isWebRTCInitializing = false; // No longer initializing once checking starts
      switch (state) {
        case 'checking':
          this.isProcessing.next(true);
          break;
        case 'connected':
        case 'completed':
          this.isWebRTCConnected = true;
          this.isProcessing.next(false);
          console.log('[AudioChatService] ICE Connection ESTABLISHED.');
          break;
        case 'disconnected':
          this.isWebRTCConnected = false;
          this.isProcessing.next(true);
          this.messageSubject.next({
            role: 'system',
            content: 'Audio connection unstable...',
          });
          break;
        case 'failed':
          this.isWebRTCConnected = false;
          this.isProcessing.next(false);
          this.messageSubject.next({
            role: 'system',
            content: 'Audio connection failed.',
          });
          this.stopListening();
          break;
        case 'closed':
          this.isWebRTCConnected = false;
          this.isProcessing.next(false);
          if (this.isListening.value) this.stopListening(); // Stop if closed unexpectedly
          break;
      }
    });
  }

  /** Handles changes in the signaling state */
  private handleSignalingStateChange(): void {
    if (!this.peerConnection) return;
    console.log(
      `[AudioChatService] Signaling state: ${this.peerConnection.signalingState}`
    );
    // Can reset initializing flag if state reverts to stable after issues
    if (
      this.peerConnection.signalingState === 'stable' &&
      this.isWebRTCInitializing
    ) {
      this.isWebRTCInitializing = false;
    }
  }

  /** Cleans up the RTCPeerConnection */
  private cleanupPeerConnection(): void {
    if (this.peerConnection) {
      try {
        // Add try/catch for safety during cleanup
        this.peerConnection.onicecandidate = null;
        this.peerConnection.ontrack = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.onsignalingstatechange = null;
        if (this.peerConnection.signalingState !== 'closed')
          this.peerConnection.close();
      } catch (e) {
        console.error('Error closing peer connection:', e);
      }
      this.peerConnection = null;
      console.log('[AudioChatService] PeerConnection cleaned up.');
    }
    this.isWebRTCConnected = false;
  }

  /** Cleans up the local media stream */
  private cleanupLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
      console.log('[AudioChatService] Local stream cleaned up.');
    }
  }

  /** Cleans up all WebRTC related resources */
  private cleanupWebRTC(): void {
    console.log('[AudioChatService] Cleaning up WebRTC...');
    this.cleanupPeerConnection();
    this.cleanupLocalStream();
    if (this.remoteAudioElement) {
      this.remoteAudioElement.pause();
      this.remoteAudioElement.srcObject = null;
    }
  }

  /** Helper to reset state and reject the startListening promise on failure */
  private abortStartListening(error?: any): Promise<never> {
    this.isWebRTCInitializing = false;
    this.isListening.next(false);
    this.isProcessing.next(false);
    this.cleanupWebRTC();
    console.log('[AudioChatService] Aborted start listening.');
    return Promise.reject(error || new Error('Start listening aborted.'));
  }
}
