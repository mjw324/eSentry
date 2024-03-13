import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditMonitorMenuComponent } from './edit-monitor-menu.component';

describe('EditMonitorMenuComponent', () => {
  let component: EditMonitorMenuComponent;
  let fixture: ComponentFixture<EditMonitorMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditMonitorMenuComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditMonitorMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
