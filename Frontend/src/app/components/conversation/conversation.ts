import { Component, OnInit, OnDestroy, AfterViewChecked, ViewChild, ElementRef, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from '@angular/fire/auth';
import { WebsocketService, ConversationMessage } from '../../services/websocket';
import { ChatService } from '../../services/chat';
import { AuthService } from '../../services/auth';
import { UserService, AppUser } from '../../services/user.service';

@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversation.html',
  styleUrls: ['./conversation.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  availableUsers: AppUser[] = [];
  isConnected: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';
  currentUser: User | null = null;
  currentUserId: string = '';
  selectedUser: AppUser | null = null;
  newMessage: string = '';
  messages: ConversationMessage[] = [];
  typingIndicator: {senderId: string, isTyping: boolean} | null = null;
  loadingUsers: boolean = false;

  private subscriptions: Subscription = new Subscription();
  private shouldScrollToBottom = false;

  constructor(
    private websocketService: WebsocketService,
    private chatService: ChatService,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.authService.currentUser$.subscribe((user: User | null) => {
        if (user) {
          this.currentUser = user;
          this.currentUserId = user.uid;
          this.initializeChat();

          if (!this.isConnected) {
          this.connectToChat();
        }

        } else {
          this.router.navigate(['/login']);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.websocketService.disconnect();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private initializeChat(): void {
    this.subscriptions.add(
      this.websocketService.messages$.subscribe((messages: ConversationMessage[]) => {
        this.ngZone.run(() => {
          if (this.selectedUser) {
            const filteredMessages = messages.filter((msg: ConversationMessage) =>
              (msg.senderId === this.currentUserId && msg.receiverId === this.selectedUser!.uid) ||
              (msg.senderId === this.selectedUser!.uid && msg.receiverId === this.currentUserId)
            );

            if (JSON.stringify(filteredMessages) !== JSON.stringify(this.messages)) {
              this.messages = filteredMessages;
              this.shouldScrollToBottom = true;

              this.cdr.detectChanges();

            }
          } else {
            if (JSON.stringify(messages) !== JSON.stringify(this.messages)) {
              this.messages = messages;
              this.cdr.detectChanges();
            }
          }
        });
      })
    );

    this.subscriptions.add(
      this.websocketService.connected$.subscribe((connected: boolean) => {
        this.ngZone.run(() => {
          this.isConnected = connected;

          if (this.currentUserId) {
            this.loadAvailableUsers();
          }

          this.cdr.detectChanges();
        });
      })
    );

    this.subscriptions.add(
      this.websocketService.typing$.subscribe((typing: any) => {
        this.ngZone.run(() => {
          this.typingIndicator = typing;
          this.cdr.detectChanges();
        });
      })
    );
  }

  private loadAvailableUsers(): void {
    if (!this.currentUserId) {
      console.log('cannot load users');
      return;
    }

    this.loadingUsers = true;
    this.errorMessage = '';

    this.subscriptions.add(
      this.userService.getAllUsers(this.currentUserId).subscribe({
        next: (users: AppUser[]) => {
          this.ngZone.run(() => {
            this.availableUsers = users;
            this.loadingUsers = false;
            this.cdr.detectChanges();
          });
        },
        error: (error: any) => {
          this.ngZone.run(() => {
            console.error('Error loading users:', error);
            this.errorMessage = 'Failed to load users. Click reload to try again.';
            this.loadingUsers = false;
            this.availableUsers = [];
            this.cdr.detectChanges();
          });
        }
      })
    );
  }

  async connectToChat(): Promise<void> {
    if (!this.currentUser) {
      this.errorMessage = 'No authenticated user found';
      return;
    }

    try {
      this.isLoading = true;
      this.errorMessage = '';
      this.currentUserId = this.currentUser.uid;

      this.loadAvailableUsers();

      // WebSocket side
      try {
        await this.websocketService.connect(this.currentUserId);
      } catch (wsError) {
        console.warn('WebSocket failed:', wsError);
      }

    } catch (error: any) {
      console.error('Error in connection process:', error);
      this.errorMessage = 'Connection failed';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  selectUser(user: AppUser): void {
    if (user.uid === this.currentUserId) {
      alert("Its yourself!");
      return;
    }
    this.selectedUser = user;
    this.errorMessage = '';
    this.loadChatHistory();
  }

  loadChatHistory(): void {
    if (!this.currentUserId || !this.selectedUser) return;

    this.isLoading = true;

    this.subscriptions.add(
      this.chatService.getRecentChatHistory(this.currentUserId, this.selectedUser.uid)
        .subscribe({
          next: (messages: ConversationMessage[]) => {
            this.ngZone.run(() => {
              this.websocketService.setMessages(messages);
              this.isLoading = false;
              this.shouldScrollToBottom = true;
              this.cdr.detectChanges();
            });
          },
          error: (error: any) => {
            this.ngZone.run(() => {
              console.error('Error loading chat history:', error);
              this.errorMessage = 'Fail on loading chat history';
              this.isLoading = false;
              this.cdr.detectChanges();
            });
          }
        })
    );
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedUser || !this.currentUserId) {
      return;
    }

    try {
      const messageText = this.newMessage.trim();
      const receiverId = this.selectedUser.uid;

      this.newMessage = '';
      this.errorMessage = '';

      if (this.isConnected) {
        this.websocketService.sendMessage(receiverId, messageText);
      } else {
        this.chatService.sendMessage(this.currentUserId, receiverId, messageText)
          .subscribe({
            next: (savedMessage: ConversationMessage) => {
              this.ngZone.run(() => {
                const currentMessages = this.websocketService.getCurrentMessages();
                this.websocketService.setMessages([...currentMessages, savedMessage]);

                this.cdr.detectChanges();
              });
            },
            error: (error: any) => {
              this.ngZone.run(() => {
                console.error('Failed to send message via REST API:', error);
                this.errorMessage = 'Failed to send message';
                this.cdr.detectChanges();
              });
            }
          });
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      this.errorMessage = 'Failed to send message';
      this.cdr.detectChanges();
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onMessageInput(): void {
    if (this.selectedUser && this.isConnected) {
      this.websocketService.sendTypingIndicator(this.selectedUser.uid, this.newMessage.length > 0);
    }
  }

  getUserName(userId: string): string {
    if (userId === this.currentUserId && this.currentUser) {
      return this.currentUser.displayName || this.currentUser.email || 'You';
    }

    const user = this.availableUsers.find(u => u.uid === userId);
    if (user) {
      return this.userService.getUserDisplayName(user);
    }

    if (this.selectedUser && this.selectedUser.uid === userId) {
      return this.userService.getUserDisplayName(this.selectedUser);
    }

    return userId;
  }

  getUserDisplayName(user: AppUser): string {
    return this.userService.getUserDisplayName(user);
  }

  getUserAvatar(user: AppUser): string {
    return this.userService.getUserAvatar(user);
  }

  isMyMessage(message: ConversationMessage): boolean {
    return message.senderId === this.currentUserId;
  }

  disconnect(): void {
    try {
      this.websocketService.disconnect();

      this.selectedUser = null;
      this.messages = [];
      this.errorMessage = '';
      this.cdr.detectChanges();


    } catch (error: any) {
      console.error('Error disconnecting:', error);
      this.errorMessage = 'Error disconnecting from chat';
      this.cdr.detectChanges();
    }
  }

  async signOut(): Promise<void> {
    try {
      this.websocketService.disconnect();
      await this.authService.signOut();
      this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('Error signing out:', error);
      this.errorMessage = 'Error signing out';
    }
  }

  goBack(): void {
    this.selectedUser = null;
    this.messages = [];
    this.websocketService.clearMessages();
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        setTimeout(() => {
          const container = this.messagesContainer.nativeElement;
          container.scrollTop = container.scrollHeight;
        }, 10);
      }
    } catch (err) {
    }
  }

  formatTimestamp(timestamp: string): string {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString();
  }

  isUserTyping(userId: string): boolean {
    return this.typingIndicator?.senderId === userId && this.typingIndicator?.isTyping === true;
  }

  ReloadUsers(): void {
    this.loadAvailableUsers();
  }

  forceRefreshUI(): void {
    this.cdr.detectChanges();
  }
}