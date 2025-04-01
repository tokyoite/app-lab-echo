// projects/echo-assistant/src/lib/services/config.service.ts

import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { EchoConfig } from '../interfaces/echo-config.interface';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private readonly document = inject(DOCUMENT);
  private _config: EchoConfig = {
    backendApiUrl: '',
    buttonText: 'Echo',
    dialogTitle: 'Echo AI Assistant',
    welcomeMessage:
      "Hello! I'm Echo, your AI assistant. How can I help you today?",
    primaryColor: '#6C5CE7',
    secondaryColor: '#00CEFF',
    // New default properties
    model: 'gpt-4o-realtime-preview',
    enableVoice: true,
  };

  get config(): EchoConfig {
    return this._config;
  }

  initialize(config: Partial<EchoConfig>): void {
    this._config = { ...this._config, ...config };
    this.applyStyles();
  }

  private applyStyles(): void {
    const style = this.document.createElement('style');
    style.innerHTML = `
      :root {
        --echo-primary: ${this._config.primaryColor};
        --echo-secondary: ${this._config.secondaryColor};
        --echo-gradient: linear-gradient(135deg, ${this._config.primaryColor}, ${this._config.secondaryColor});
        --echo-glow: 0 0 15px ${this._config.primaryColor}80;
      }
    `;
    this.document.head.appendChild(style);
  }
}
