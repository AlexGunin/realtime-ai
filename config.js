// Конфигурация для подключения к backend
const CONFIG = {
    // URL бекенда - измените на свой
    API_BASE_URL: 'http://localhost:3000',

    // Endpoints
    ENDPOINTS: {
        CHAT: '/api/chat',
        CLEAR: '/api/clear',
        HEALTH: '/api/health'
    },

    // ID разговора (можно генерировать уникальный для каждой сессии)
    CONVERSATION_ID: 'default',

    // Таймаут для проверки здоровья API (в миллисекундах)
    HEALTH_CHECK_TIMEOUT: 5000
};
