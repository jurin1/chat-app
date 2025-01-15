import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreadSidebarComponent } from './thread-sidebar.component';

describe('ThreadSidebarComponent', () => {
  let component: ThreadSidebarComponent;
  let fixture: ComponentFixture<ThreadSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreadSidebarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ThreadSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
