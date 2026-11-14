const express = require('express');
const path = require('path');
const db = require('./database/db');

const app = express();
const PORT = 3000;

// Раздаем обычные .html, .css и .js файлы из папки public
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function validateBook(data) {
  const errors = [];
  const maxYear = new Date().getFullYear();

  if (!data.title || data.title.trim() === '') errors.push('Укажите название книги.');
  if (!data.author || data.author.trim() === '') errors.push('Укажите автора книги.');
  if (!data.genre_id || isNaN(Number(data.genre_id))) errors.push('Выберите жанр.');

  const year = Number(data.pub_year);
  if (!data.pub_year || isNaN(year) || year < 1000 || year > maxYear) {
    errors.push(`Год издания должен быть от 1000 до ${maxYear}.`);
  }
  return errors;
}

// Получить список жанров (GET)
app.get('/api/genres', (req, res) => {
  db.all('SELECT * FROM genres', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка БД' });
    res.json(rows);
  });
});

// Получить список книг с фильтром по жанру (GET)
app.get('/api/books', (req, res) => {
  const genre = req.query.genre || '';
  let sql = `
    SELECT books.*, genres.name AS genre_name
    FROM books
    INNER JOIN genres ON books.genre_id = genres.id
  `;
  const params = [];

  if (genre !== '') {
    sql += ' WHERE books.genre_id = ?';
    params.push(genre);
  }
  sql += ' ORDER BY books.id DESC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка БД' });
    res.json(rows);
  });
});

// Получить одну книгу по id (GET)
app.get('/api/books/:id', (req, res) => {
  const sql = `
    SELECT books.*, genres.name AS genre_name
    FROM books
    INNER JOIN genres ON books.genre_id = genres.id
    WHERE books.id = ?
  `;
  db.get(sql, [req.params.id], (err, book) => {
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
    if (!book) return res.status(404).json({ error: 'Книга с таким ID не найдена' });
    res.json(book);
  });
});

// Добавить книгу (POST)
app.post('/api/books', (req, res) => {
  const errors = validateBook(req.body);
  if (errors.length > 0) return res.status(400).json({ errors });

  const sql = 'INSERT INTO books (title, author, pub_year, description, image, genre_id) VALUES (?, ?, ?, ?, ?, ?)';
  const params = [
    req.body.title.trim(),
    req.body.author.trim(),
    Number(req.body.pub_year),
    req.body.description ? req.body.description.trim() : '',
    req.body.image ? req.body.image.trim() : '',
    Number(req.body.genre_id)
  ];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ errors: ['Ошибка сохранения в БД'] });
    res.json({ success: true, id: this.lastID });
  });
});

// Обновить книгу (POST)
app.post('/api/books/:id', (req, res) => {
  const errors = validateBook(req.body);
  if (errors.length > 0) return res.status(400).json({ errors });

  const sql = 'UPDATE books SET title = ?, author = ?, pub_year = ?, description = ?, image = ?, genre_id = ? WHERE id = ?';
  const params = [
    req.body.title.trim(),
    req.body.author.trim(),
    Number(req.body.pub_year),
    req.body.description ? req.body.description.trim() : '',
    req.body.image ? req.body.image.trim() : '',
    Number(req.body.genre_id),
    Number(req.params.id)
  ];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ errors: ['Ошибка обновления'] });
    res.json({ success: true });
  });
});

// Удалить книгу (POST)
app.post('/api/books/:id/delete', (req, res) => {
  db.run('DELETE FROM books WHERE id = ?', [Number(req.params.id)], function (err) {
    if (err) return res.status(500).json({ error: 'Ошибка удаления' });
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
