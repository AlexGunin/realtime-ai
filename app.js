class ChatApp {
    constructor() {
        this.messagesContainer = document.getElementById('messages');
        this.messageInput = document.getElementById('messageInput');
        this.chatForm = document.getElementById('chatForm');
        this.sendBtn = document.getElementById('sendBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');

        this.currentAssistantMessage = null;
        this.isStreaming = false;

        this.init();
    }

    init() {
        // Event listeners
        this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
        this.clearBtn.addEventListener('click', () => this.clearChat());

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());

        // Enter to send, Shift+Enter for new line
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.chatForm.dispatchEvent(new Event('submit'));
            }
        });

        // Check backend health
        this.checkHealth();

        // Welcome message
        this.addMessage('assistant', 'Привет! Я AI ассистент. Чем могу помочь?');
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
    }

    async checkHealth() {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), CONFIG.HEALTH_CHECK_TIMEOUT);

            const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.HEALTH}`, {
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (response.ok) {
                this.setStatus('connected', 'Подключено');
            } else {
                this.setStatus('error', 'Ошибка подключения');
            }
        } catch (error) {
            this.setStatus('error', 'Backend не доступен');
            console.error('Health check failed:', error);
        }
    }

    setStatus(state, text) {
        this.statusIndicator.className = `status ${state}`;
        this.statusText.textContent = text;
    }

    async handleSubmit(e) {
        e.preventDefault();

        const message = this.messageInput.value.trim();
        if (!message || this.isStreaming) return;

        // Add user message
        this.addMessage('user', message);

        // Clear input
        this.messageInput.value = '';
        this.autoResizeTextarea();

        // Disable input while streaming
        this.setStreamingState(true);

        // Send message and stream response
        await this.sendMessage(message);
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = role === 'user' ? '👤' : '🤖';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();

        return contentDiv;
    }

    async sendMessage(message) {
        try {
            // Create empty assistant message
            const assistantContent = this.addMessage('assistant', '');
            this.currentAssistantMessage = assistantContent;

            // Show typing indicator
            this.typingIndicator.style.display = 'flex';
            this.scrollToBottom();

            // Prepare request
            const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.CHAT}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    conversationId: CONFIG.CONVERSATION_ID
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Hide typing indicator
            this.typingIndicator.style.display = 'none';

            // Read stream using EventSource-like approach
            await this.readStream(response.body.getReader());

        } catch (error) {
            console.error('Error sending message:', error);
            this.typingIndicator.style.display = 'none';

            if (this.currentAssistantMessage) {
                this.currentAssistantMessage.textContent = '❌ Ошибка: ' + error.message;
                this.currentAssistantMessage.style.color = '#f44336';
            }
        } finally {
            this.setStreamingState(false);
            this.currentAssistantMessage = null;
        }
    }

    async readStream(reader) {
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);

                    try {
                        const event = JSON.parse(data);
                        this.handleStreamEvent(event);
                    } catch (e) {
                        console.error('Failed to parse SSE data:', data);
                    }
                }
            }
        }
    }

    handleStreamEvent(event) {
        switch (event.type) {
            case 'chunk':
                if (this.currentAssistantMessage) {
                    this.currentAssistantMessage.textContent += event.text;
                    this.scrollToBottom();
                }
                break;

            case 'done':
                console.log('Stream completed');
                break;

            case 'error':
                console.error('Stream error:', event.message);
                if (this.currentAssistantMessage) {
                    this.currentAssistantMessage.textContent = '❌ Ошибка: ' + event.message;
                    this.currentAssistantMessage.style.color = '#f44336';
                }
                break;
        }
    }

    setStreamingState(isStreaming) {
        this.isStreaming = isStreaming;
        this.sendBtn.disabled = isStreaming;
        this.messageInput.disabled = isStreaming;
    }

    async clearChat() {
        if (!confirm('Очистить историю разговора?')) return;

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.CLEAR}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversationId: CONFIG.CONVERSATION_ID
                })
            });

            if (response.ok) {
                this.messagesContainer.innerHTML = '';
                this.addMessage('assistant', 'История очищена. Чем могу помочь?');
            }
        } catch (error) {
            console.error('Error clearing chat:', error);
            alert('Ошибка при очистке истории');
        }
    }

    scrollToBottom() {
        this.messagesContainer.parentElement.scrollTop =
            this.messagesContainer.parentElement.scrollHeight;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
