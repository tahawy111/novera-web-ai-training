import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import indexRoutes from './routes/index.js';
import imageRoutes from './routes/images.js';

dotenv.config();

// __dirname is not available in ES modules, so we create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Middleware
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// View Engine Setup
app.set('view engine', 'ejs');
// app.set('view options', { async: true });
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', indexRoutes);
app.use('/images', imageRoutes);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error('الصفحة غير موجودة');
  err.status = 404;
  next(err);
});

// Error handler
app.use(function (err, req, res, next) {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Determine response format based on request path
  const isApiRequest = req.originalUrl.startsWith('/images/'); // Assuming /images/ routes are API routes

  res.status(err.status || 500);

  if (isApiRequest) {
    // Send JSON response for API errors
    res.json({
      error: err.message || 'An unexpected API error occurred',
      status: err.status || 500
    });
  } else {
    // Render the error page for regular page requests
    res.render('error', {
      errorStatus: err.status || 500,
      errorMessage: err.message || 'حدث خطأ غير متوقع'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});