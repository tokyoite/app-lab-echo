// projects/echo-assistant/src/public-api.ts

/*
 * Public API Surface of echo-assistant
 */

// Export the main module and providers
export * from './lib/echo-assistant.module';

// Export the main component
export * from './lib/echo-assistant.component';

// Export interfaces
export * from './lib/interfaces/echo-config.interface';

// Export services (for advanced usage)
export * from './lib/services/api.service';
export * from './lib/services/config.service';
export * from './lib/services/audio-chat.service';

// Export individual components (for advanced usage)
export * from './lib/components/echo-dialog/echo-dialog.component';
export * from './lib/components/tesseract-animation/tesseract-animation.component';

// Export the provider function for Angular 19 standalone
export { provideEchoAssistant } from './lib/echo-assistant.module';
