// projects/echo-assistant/src/lib/services/api.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);

  /**
   * Sends a user query to the API and gets a response
   */
  sendMessage(message: string, conversation: Message[]): Observable<string> {
    const url = `${this.configService.config.backendApiUrl}/api/chat`;

    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    // Add API keys if provided
    if (this.configService.config.claudeApiKey) {
      headers = headers.set(
        'x-claude-api-key',
        this.configService.config.claudeApiKey
      );
    }

    if (this.configService.config.openaiApiKey) {
      headers = headers.set(
        'x-openai-api-key',
        this.configService.config.openaiApiKey
      );
    }

    // Add auth token if provided
    if (this.configService.config.authToken) {
      headers = headers.set(
        'Authorization',
        `Bearer ${this.configService.config.authToken}`
      );
    }

    return this.http.post<string>(
      url,
      {
        message,
        conversation,
        githubRepo: this.configService.config.githubRepo,
      },
      { headers }
    );
  }

  /**
   * Sends the WebRTC SDP offer to the backend
   * This method doesn't handle the WebRTC connection directly, it just
   * passes the SDP offer to the backend and returns the SDP answer
   */
  async sendWebRTCOffer(sdpOffer: string, model: string): Promise<string> {
    const backendUrl = `${this.configService.config.backendApiUrl}/api/webrtc-init?model=${model}`;
    console.log(`[ApiService] Sending Offer via HTTP POST to ${backendUrl}`);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: sdpOffer,
    });

    console.log(`[ApiService] Backend response status: ${response.status}`);
    const sdpAnswer = await response.text();

    if (!response.ok) {
      throw new Error(
        `Signaling failed (${response.status}): ${
          sdpAnswer || response.statusText
        }`
      );
    }
    
    return sdpAnswer;
  }

  /**
   * This is a legacy method for speech recognition
   * It's deprecated in favor of WebRTC audio streaming
   */
  startSpeechRecognition(): Observable<string> {
    console.warn('[ApiService] Legacy speech recognition API called - should use AudioChatService');
    const url = `${this.configService.config.backendApiUrl}/api/speech/recognize`;
    return this.http.post<string>(url, {});
  }

  /**
   * Converts text to speech
   */
  textToSpeech(text: string): Observable<ArrayBuffer> {
    const url = `${this.configService.config.backendApiUrl}/api/speech/synthesize`;
    return this.http.post(url, { text }, { responseType: 'arraybuffer' });
  }
}