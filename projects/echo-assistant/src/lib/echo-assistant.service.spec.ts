import { TestBed } from '@angular/core/testing';

import { EchoAssistantService } from './echo-assistant.service';

describe('EchoAssistantService', () => {
  let service: EchoAssistantService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EchoAssistantService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
