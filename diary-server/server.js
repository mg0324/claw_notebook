const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'diaries.json');

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Helper: read data
function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('读取数据文件失败:', err.message);
    return { diaries: [], categories: ['生活', '工作', '学习', '其他'] };
  }
}

// Helper: write data
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ==================== 日记接口 ====================

// GET /api/diaries - 获取所有日记
app.get('/api/diaries', (req, res) => {
  const data = readData();
  const { category, date } = req.query;
  let diaries = data.diaries;

  if (category) {
    diaries = diaries.filter(d => d.category === category);
  }
  if (date) {
    diaries = diaries.filter(d => d.date === date);
  }

  // 按创建时间倒序排列
  diaries.sort((a, b) => b.createdAt - a.createdAt);

  res.json({ success: true, data: diaries, total: diaries.length });
});

// POST /api/diaries - 创建日记
app.post('/api/diaries', (req, res) => {
  const { title, content, date, category } = req.body;

  if (!title || !content) {
    return res.status(400).json({ success: false, message: '标题和内容不能为空' });
  }

  const data = readData();

  const newDiary = {
    id: uuidv4(),
    title: title.trim(),
    content: content.trim(),
    date: date || new Date().toISOString().split('T')[0],
    category: category || '其他',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  data.diaries.push(newDiary);
  writeData(data);

  res.status(201).json({ success: true, data: newDiary, message: '日记创建成功' });
});

// PUT /api/diaries/:id - 更新日记
app.put('/api/diaries/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, date, category } = req.body;

  const data = readData();
  const index = data.diaries.findIndex(d => d.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: '日记不存在' });
  }

  const diary = data.diaries[index];

  if (title !== undefined) diary.title = title.trim();
  if (content !== undefined) diary.content = content.trim();
  if (date !== undefined) diary.date = date;
  if (category !== undefined) diary.category = category;
  diary.updatedAt = Date.now();

  data.diaries[index] = diary;
  writeData(data);

  res.json({ success: true, data: diary, message: '日记更新成功' });
});

// DELETE /api/diaries/:id - 删除日记
app.delete('/api/diaries/:id', (req, res) => {
  const { id } = req.params;
  const data = readData();
  const index = data.diaries.findIndex(d => d.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: '日记不存在' });
  }

  data.diaries.splice(index, 1);
  writeData(data);

  res.json({ success: true, message: '日记删除成功' });
});

// ==================== 分类接口 ====================

// GET /api/categories - 获取分类列表
app.get('/api/categories', (req, res) => {
  const data = readData();
  res.json({ success: true, data: data.categories });
});

// POST /api/categories - 创建分类
app.post('/api/categories', (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: '分类名称不能为空' });
  }

  const data = readData();
  const trimmedName = name.trim();

  if (data.categories.includes(trimmedName)) {
    return res.status(409).json({ success: false, message: '分类已存在' });
  }

  data.categories.push(trimmedName);
  writeData(data);

  res.status(201).json({ success: true, data: data.categories, message: '分类创建成功' });
});

// DELETE /api/categories/:name - 删除分类
app.delete('/api/categories/:name', (req, res) => {
  const { name } = req.params;
  const decodedName = decodeURIComponent(name);
  const data = readData();

  const index = data.categories.indexOf(decodedName);
  if (index === -1) {
    return res.status(404).json({ success: false, message: '分类不存在' });
  }

  data.categories.splice(index, 1);
  writeData(data);

  res.json({ success: true, data: data.categories, message: '分类删除成功' });
});

// ==================== 健康检查 ====================
app.get('/health', (req, res) => {
  res.json({ success: true, message: '日记服务运行正常', timestamp: Date.now() });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`🚀 日记后端服务启动成功，监听端口 ${PORT}`);
  console.log(`📁 数据文件路径: ${DATA_FILE}`);
  console.log(`🌐 API 地址: http://localhost:${PORT}/api`);
});

module.exports = app;
