import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EchoDialogComponent } from './echo-dialog.component';

describe('EchoDialogComponent', () => {
  let component: EchoDialogComponent;
  let fixture: ComponentFixture<EchoDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EchoDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EchoDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
