import express from "express";
const router = express.Router();
import Image from "../models/Image.js"; // For gallery

// User Dashboard Page (Your original HTML)
router.get("/", (req, res) => {
  /*
  const userData = {
      name: "محمد",
      points: 1250,
      totalItems: 78,
      lastActivityDays: 2,
      metalCount: 25,
      plasticCount: 30,
      paperCount: 15,
      mixedCount: 8
  };
  res.render('userdash', { user: userData, currentPage: 'dashboard' });*/
  res.render("upload", { currentPage: "upload" });
});

// Image Upload Page
router.get("/upload", (req, res) => {
  res.render("upload", { currentPage: "upload" });
});

// Gallery Page
router.get("/gallery", async (req, res) => {
  try {
    const images = await Image.find().sort({ uploadedAt: -1 });
    res.render("gallery", { images, currentPage: "gallery" });
  } catch (error) {
    console.error('Error fetching images for gallery:', error);
    // Render error page or handle differently
    res.status(500).render('error', {
      errorStatus: 500,
      errorMessage: 'حدث خطأ أثناء تحميل المعرض.'
    });
  }
});

// Success Page
router.get("/success", (req, res) => {
    const message = req.query.message || 'العملية تمت بنجاح.';
    res.render("success", { message: message, currentPage: 'success' });
});

export default router;
