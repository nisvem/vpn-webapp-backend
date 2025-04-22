# VPN WebApp Backend

VPN WebApp Backend is a TypeScript-based server application that powers the VPN WebApp. It handles user authentication, VPN server management, and API endpoints for the frontend application.

---

## Features

1. **User Authentication**:
   - Secure login and session management.

2. **API Endpoints**:
   - Provides RESTful APIs for the frontend application.

3. **VPN Server Management**:
   - Manage VPN servers and monitor their status.

---

## File Structure

The project is structured as follows:

- **src**:
  - Main source files for the backend application.
  - Includes controllers, services, and utilities.

- **config**:
  - Configuration files for the application.

- **logs**:
  - Log files for debugging and monitoring.

---

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/nisvem/vpn-webapp-backend.git
   cd vpn-webapp-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory.
   - Add the following variables:
     ```
     DATABASE_URL=<Your Database URL>
     JWT_SECRET=<Your JWT Secret>
     ```

4. Start the server:
   ```bash
   npm start
   ```

5. The server will be running at:
   ```
   http://localhost:5000
   ```
   
---

## Russian Version

# VPN WebApp Backend

VPN WebApp Backend — это серверное приложение на TypeScript, которое поддерживает работу VPN WebApp. Оно обрабатывает аутентификацию пользователей, управление VPN-серверами и предоставляет API для фронтенд-приложения.

---

## Возможности

1. **Аутентификация пользователей**:
   - Безопасный вход и управление сессиями.

2. **API интерфейсы**:
   - Предоставляет RESTful API для фронтенд-приложения.

3. **Управление VPN-серверами**:
   - Управление VPN-серверами и мониторинг их статуса.

---

## Структура файлов

Проект структурирован следующим образом:

- **src**:
  - Основные исходные файлы для серверного приложения.
  - Включает контроллеры, сервисы и утилиты.

- **config**:
  - Конфигурационные файлы приложения.

- **logs**:
  - Файлы логов для отладки и мониторинга.

---

## Установка

1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/nisvem/vpn-webapp-backend.git
   cd vpn-webapp-backend
   ```

2. Установите зависимости:
   ```bash
   npm install
   ```

3. Настройте переменные окружения:
   - Создайте файл `.env` в корневом каталоге.
   - Добавьте следующие переменные:
     ```
     DATABASE_URL=<Ваш URL базы данных>
     JWT_SECRET=<Ваш секретный ключ JWT>
     ```

4. Запустите сервер:
   ```bash
   npm start
   ```

5. Сервер будет доступен по адресу:
   ```
   http://localhost:5000
   ```
