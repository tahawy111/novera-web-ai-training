import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Image from '../models/image.js'; // Assuming Image model exists

import indexRoutes from './index.js';
import imageRoutes from './images.js';

dotenv.config();

// __dirname is not available in ES modules, so we create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router(); // Use router instead of app

// MongoDB Connection (This should ideally be in index.js or a separate config)
// Keeping it here for now based on the provided snippet context, but note this is not best practice.
// mongoose.connect(process.env.MONGODB_URI)
//   .then(() => console.log('MongoDB Connected'))
//   .catch(err => console.error('MongoDB Connection Error:', err));

// Middleware (These should ideally be in index.js)
// router.use(express.json()); // For parsing application/json
// router.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
// router.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// View Engine Setup (These should ideally be in index.js)
// router.set('view engine', 'ejs');
// router.set('views', path.join(__dirname, 'views'));

// Home page - Redirect to Gallery
router.get("/", async (req, res) => {
  try {
    // Fetch images and group by waste type for the gallery view
    const images = await Image.find().sort({ uploadedAt: -1 }); // Sort by newest first

    const groupedImages = images.reduce((acc, image) => {
      const type = image.wasteType || 'unknown';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(image);
      return acc;
    }, {});

    // Define icons and names for waste types (should match gallery.ejs)
    const typeIcons = {
      paper: 'fas fa-file-alt',
      plastic: 'fas fa-bottle-water',
      metal: 'fas fa-wrench',
      mixed: 'fas fa-recycle',
      unknown: 'fas fa-question-circle'
    };

    const typeNames = {
      paper: 'ورق',
      plastic: 'بلاستيك',
      metal: 'معدن',
      mixed: 'مختلط',
      unknown: 'غير معروف'
    };

    res.render("gallery", {
      groupedImages: groupedImages,
      typeIcons: typeIcons,
      typeNames: typeNames,
      currentPage: 'gallery', // Pass currentPage for header highlighting
      images: images // Pass the images array here
    });
  } catch (error) {
    console.error('Error fetching images for gallery:', error);
    // Render error page or handle differently
    res.status(500).render('error', {
      errorStatus: 500,
      errorMessage: 'حدث خطأ أثناء تحميل المعرض.'
    });
  }
});

// Gallery Page
router.get("/gallery", async (req, res) => {
  try {
    // Fetch images and group by waste type
    const images = await Image.find().sort({ uploadedAt: -1 }); // Sort by newest first

    const groupedImages = images.reduce((acc, image) => {
      const type = image.wasteType || 'unknown';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(image);
      return acc;
    }, {});

    // Define icons and names for waste types (should match gallery.ejs)
    const typeIcons = {
      paper: 'fas fa-file-alt',
      plastic: 'fas fa-bottle-water',
      metal: 'fas fa-wrench',
      mixed: 'fas fa-recycle',
      unknown: 'fas fa-question-circle'
    };

    const typeNames = {
      paper: 'ورق',
      plastic: 'بلاستيك',
      metal: 'معدن',
      mixed: 'مختلط',
      unknown: 'غير معروف'
    };

    res.render("gallery", {
      groupedImages: groupedImages,
      typeIcons: typeIcons,
      typeNames: typeNames,
      currentPage: 'gallery', // Pass currentPage for header highlighting
      images: images // Pass the images array here
    });
  } catch (error) {
    console.error('Error fetching images for gallery:', error);
    // Render error page or handle differently
    res.status(500).render('error', {
      errorStatus: 500,
      errorMessage: 'حدث خطأ أثناء تحميل المعرض.'
    });
  }
});

// Upload Page
router.get("/upload", (req, res) => {
  res.render("upload", { currentPage: 'upload' }); // Pass currentPage for header highlighting
});

// Success Page
router.get("/success", (req, res) => {
  const message = req.query.message || 'العملية تمت بنجاح.';
  res.render("success", { message: message, currentPage: 'success' });
});

export default router;
