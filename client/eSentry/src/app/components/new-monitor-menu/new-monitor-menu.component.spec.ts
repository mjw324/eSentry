import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewMonitorMenuComponent } from './new-monitor-menu.component';

describe('NewMonitorMenuComponent', () => {
  let component: NewMonitorMenuComponent;
  let fixture: ComponentFixture<NewMonitorMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewMonitorMenuComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewMonitorMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
