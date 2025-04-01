// projects/echo-assistant/src/lib/echo-assistant.module.ts

import { NgModule, ModuleWithProviders, Provider } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { EchoDialogComponent } from './components/echo-dialog/echo-dialog.component';
import { TesseractAnimationComponent } from './components/tesseract-animation/tesseract-animation.component';

import { ApiService } from './services/api.service';
import { ConfigService } from './services/config.service';
import { AudioChatService } from './services/audio-chat.service';
import { EchoConfig } from './interfaces/echo-config.interface';

// Main component that wraps the button and dialog
import { EchoAssistantComponent } from './echo-assistant.component';

// Provider factory for Angular 19 standalone compatibility
export function provideEchoAssistant(config: EchoConfig): Provider[] {
  return [
    {
      provide: 'ECHO_CONFIG',
      useValue: config,
    },
    ApiService,
    ConfigService,
    AudioChatService,
  ];
}

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    EchoDialogComponent,
    TesseractAnimationComponent,
    EchoAssistantComponent,
  ],
  exports: [EchoAssistantComponent],
})
export class EchoAssistantModule {
  static forRoot(config: EchoConfig): ModuleWithProviders<EchoAssistantModule> {
    return {
      ngModule: EchoAssistantModule,
      providers: provideEchoAssistant(config),
    };
  }
}
