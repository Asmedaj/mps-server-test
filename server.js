const express = require('express');
const WebSocket = require('ws');
const mysql = require('mysql2');
const path = require('path');

// Создание приложения Express
const app = express();
const port = 3000;

// Создание подключения к базе данных
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Ваш пользователь MySQL
  password: '', // Ваш пароль MySQL
  database: 'sensor_data'
});

// Подключение к базе данных
db.connect(err => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err);
    return;
  }
  console.log('Успешно подключено к базе данных');
});

// Создание веб-сокет сервера
const wss = new WebSocket.Server({ noServer: true });

// Обработка соединений WebSocket
wss.on('connection', ws => {
  console.log('Клиент подключен');

  ws.on('message', data => {
    // Получаем данные от клиента
    const { I, Vp, Vm, Vl, TIME, ID } = JSON.parse(data);

    // Запись данных в базу
    const query = 'INSERT INTO readings (I, Vp, Vm, Vl, unique_id) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [I, Vp, Vm, Vl, ID], (err, results) => {
      if (err) {
        console.error('Ошибка записи в базу данных:', err);
        return;
      }
      console.log('Данные сохранены:', results);
    });
  });

  ws.on('close', () => {
    console.log('Клиент отключен');
  });
});

// Обработка HTTP запросов (выдача веб-страницы)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint для получения последних данных
app.get('/latest-data', (req, res) => {
  const query = 'SELECT I, Vp, Vm, Vl FROM readings ORDER BY time DESC LIMIT 1';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Ошибка при получении данных:', err);
      return res.status(500).send('Ошибка при получении данных');
    }
    res.json(results[0]);
  });
});


// Обработка upgrade запросов для WebSocket
app.server = app.listen(port, () => {
  console.log(`Сервер работает на http://localhost:${port}`);
});

app.server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit('connection', ws, request);
  });
});
