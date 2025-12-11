# API Contracts для Backend

## Базовый URL
```
BASE_URL: настраивается в config.js (по умолчанию http://localhost:3000)
```

## Endpoints

### 1. POST /api/chat (Streaming)

Отправка сообщения и получение потокового ответа от ИИ.

**Request:**
```json
POST /api/chat
Content-Type: application/json

{
  "message": "Привет! Как дела?",
  "conversationId": "uuid-string" // опционально, для поддержки нескольких чатов
}
```

**Response:**
- Content-Type: `text/event-stream`
- Формат: Server-Sent Events (SSE)

**События (SSE):**

1. Чанк текста:
```json
data: {"type": "chunk", "text": "фрагмент текста"}
```

2. Завершение:
```json
data: {"type": "done"}
```

3. Ошибка:
```json
data: {"type": "error", "message": "описание ошибки"}
```

**Пример потока:**
```
data: {"type": "chunk", "text": "Привет"}
data: {"type": "chunk", "text": "!"}
data: {"type": "chunk", "text": " У"}
data: {"type": "chunk", "text": " меня"}
data: {"type": "chunk", "text": " всё"}
data: {"type": "chunk", "text": " отлично"}
data: {"type": "done"}
```

---

### 2. POST /api/clear

Очистка истории разговора.

**Request:**
```json
POST /api/clear
Content-Type: application/json

{
  "conversationId": "uuid-string" // опционально
}
```

**Response:**
```json
{
  "success": true
}
```

---

### 3. GET /api/health (опционально)

Проверка состояния сервера.

**Request:**
```
GET /api/health
```

**Response:**
```json
{
  "status": "ok"
}
```

---

## CORS Requirements

Backend должен поддерживать CORS для фронтенда:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## Обработка ошибок

### Возможные HTTP статусы:
- `200` - успешный запрос
- `400` - неверные параметры запроса
- `401` - отсутствует API ключ
- `429` - превышен лимит запросов
- `500` - внутренняя ошибка сервера

### Формат ошибки (для не-streaming запросов):
```json
{
  "error": "описание ошибки"
}
```

## Требования к Backend

1. **Streaming:** Обязательная поддержка Server-Sent Events (SSE)
2. **История:** Backend хранит историю разговора по conversationId
3. **Модель:** Рекомендуется Claude 3.5 Sonnet или аналог
4. **Timeout:** Рекомендуемый timeout для streaming - 60 секунд
