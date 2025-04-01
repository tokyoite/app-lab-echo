import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EchoAssistantComponent } from './echo-assistant.component';

describe('EchoAssistantComponent', () => {
  let component: EchoAssistantComponent;
  let fixture: ComponentFixture<EchoAssistantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EchoAssistantComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EchoAssistantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
