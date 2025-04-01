import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TesseractAnimationComponent } from './tesseract-animation.component';

describe('TesseractAnimationComponent', () => {
  let component: TesseractAnimationComponent;
  let fixture: ComponentFixture<TesseractAnimationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TesseractAnimationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TesseractAnimationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
