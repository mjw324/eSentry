import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemCheckerMenuComponent } from './item-checker-menu.component';

describe('ItemCheckerMenuComponent', () => {
  let component: ItemCheckerMenuComponent;
  let fixture: ComponentFixture<ItemCheckerMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ItemCheckerMenuComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemCheckerMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
