// projects/echo-assistant/src/lib/echo-assistant.component.ts

import {
  Component,
  OnInit,
  inject,
  PLATFORM_ID,
  Inject,
  ElementRef,
  Renderer2,
  Input,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { EchoDialogComponent } from './components/echo-dialog/echo-dialog.component';
import { ConfigService } from './services/config.service';
import { Optional } from '@angular/core';
import { EchoConfig } from './interfaces/echo-config.interface';

@Component({
  selector: 'echo-assistant',
  standalone: true,
  imports: [CommonModule, EchoDialogComponent],
  template: `<echo-dialog [isOpen]="isOpen"></echo-dialog>`,
  styles: [`
    :host {
      display: block;
      margin: 0;
      padding: 0;
      height: 0;
      overflow: visible;
    }
  `],
})
export class EchoAssistantComponent implements OnInit {
  // Add the isOpen property as an Input
  @Input() isOpen = true; // Default to true so it's visible by default
  private configService = inject(ConfigService);
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Optional() @Inject('ECHO_CONFIG') private config?: EchoConfig
  ) {}

  ngOnInit(): void {
    // Initialize config if provided via injection
    if (this.config) {
      this.configService.initialize(this.config);
    }

    // Apply CSS variables directly to ensure the component works without global styles
    if (isPlatformBrowser(this.platformId)) {
      this.createStyleElement();
    }
  }

  private createStyleElement(): void {
    const primaryColor = this.configService.config.primaryColor || '#6C5CE7';
    const secondaryColor =
      this.configService.config.secondaryColor || '#00CEFF';

    const styleElement = this.renderer.createElement('style');
    styleElement.type = 'text/css';
    styleElement.textContent = `
      :root {
        --echo-primary: ${primaryColor};
        --echo-secondary: ${secondaryColor};
        --echo-gradient: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
        --echo-glow: 0 0 15px ${primaryColor}80;
      }
    `;

    this.renderer.appendChild(document.head, styleElement);
  }
}
