import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  OnDestroy,
} from '@angular/core';
import { MessageService, Message } from '../message.service';
import { Observable, Subscription, map, of, switchMap } from 'rxjs';
import { NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SharedModule } from '../../shared/shared';
import { MatButtonModule } from '@angular/material/button';
import { Timestamp } from 'firebase/firestore';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Component for displaying a thread of messages in a sidebar.
 */
@Component({
  selector: 'app-thread-sidebar',
  standalone: true,
  imports: [
    SharedModule,
    NgStyle,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './thread-sidebar.component.html',
  styleUrls: ['./thread-sidebar.component.scss'],
})
export class ThreadSidebarComponent {
}