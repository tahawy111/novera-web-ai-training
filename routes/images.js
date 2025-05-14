import express from 'express';
import multer from 'multer';
import fs from 'fs'; // Keep for potential diskStorage cleanup (though memoryStorage is active)
import path from 'path'; // Keep for potential diskStorage usage
import sharp from 'sharp';
import Image from '../models/Image.js';
import imgurUploader from 'imgur-uploader';
import axios from 'axios'; // Import axios for making HTTP requests

const router = express.Router();

// Multer setup for handling file uploads (remains the same)
const storage = multer.memoryStorage();
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/')
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
//   }
// });
const upload = multer({ storage: storage });

// Add Imgur Client ID (should be from config/env variables for security)
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID || 'YOUR_IMGUR_CLIENT_ID'; // Replace with your actual Imgur Client ID or use environment variables

// POST route for uploading images
router.post('/upload', upload.array('imagesToUpload'), async (req, res, next) => {
  console.log(req.files);
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'لم يتم رفع أي ملفات.' });
    }

    const wasteTypes = Array.isArray(req.body.wasteTypes) ? req.body.wasteTypes : [req.body.wasteTypes];

    // No need to check length matching since we're handling it on the client side
    try {
        const uploadedImageDocs = [];
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const wasteType = wasteTypes[i];

            if (!['paper', 'plastic', 'metal', 'mixed'].includes(wasteType)) {
                console.warn(`Invalid waste type '${wasteType}' for file ${file.originalname}. Skipping.`);
                continue;
            }

            // Process image using sharp
            const processedImageBuffer = await sharp(file.buffer)
                .resize(800, 600, { // Specify desired dimensions
                    fit: 'inside', // Maintain aspect ratio
                    withoutEnlargement: true // Avoid enlarging small images
                })
                .jpeg({ 
                    quality: 70,
                    mozjpeg: true
                })
                .toBuffer();

            console.log(`Uploading ${file.originalname} to Imgur via imgur-uploader package...`);

            // Use processed image for upload
            const imgurResponse = await imgurUploader(processedImageBuffer, {
                title: `Novera Waste - ${file.originalname}`,
                description: `Waste type: ${wasteType}`,
            });

            // Check if upload was successful and link exists
            if (!imgurResponse || !imgurResponse.link) {
                console.error('Imgur Uploader Error:', imgurResponse);
                throw new Error(
                    `Imgur upload failed for ${file.originalname}: ${
                        imgurResponse?.error || 'Unknown imgur-uploader error'
                    }`
                );
            }

            console.log('Imgur Upload Success:', imgurResponse.link);

            const newImage = new Image({
                filename: file.originalname,
                imgurUrl: imgurResponse.link, // Use link from imgur-uploader response
                imgurDeleteHash: imgurResponse.deletehash, // Use deletehash from imgur-uploader response
                wasteType: wasteType,
            });
            const savedImage = await newImage.save();
            uploadedImageDocs.push(savedImage);
        }
        // Change from json to render success.ejs
        res.render('success', {
            message: `تم رفع وتصنيف ${uploadedImageDocs.length} صور بنجاح!`,
            currentPage: 'success' // Pass currentPage for header highlighting
        });
    } catch (error) {
        console.error('Upload process error:', error);
        // You might want to render an error page here too, or keep the JSON for API clients
        res.status(500).json({ error: `خطأ في عملية الرفع: ${error.message}` });
    }
});

// DELETE route for deleting an image by ID
router.delete('/:id', async (req, res, next) => {
  try {
    const imageId = req.params.id;
    const image = await Image.findById(imageId);

    if (!image) {
      const err = new Error('الصورة غير موجودة.');
      err.status = 404;
      return next(err);
    }

    // Delete from Imgur using the delete hash
    if (image.imgurDeleteHash) {
      try {
        await axios.delete(`https://api.imgur.com/3/image/${image.imgurDeleteHash}`, {
          headers: {
            'Authorization': `Client-ID ${IMGUR_CLIENT_ID}`
          }
        });
        console.log(`Deleted image from Imgur with hash: ${image.imgurDeleteHash}`);
      } catch (imgurError) {
        console.error(`Failed to delete image from Imgur with hash ${image.imgurDeleteHash}:`, imgurError.response?.data || imgurError.message);
        // Log the error but continue to delete from DB
      }
    } else {
        console.warn(`No Imgur delete hash found for image ID: ${imageId}. Skipping Imgur deletion.`);
    }

    // Delete from database
    await Image.findByIdAndDelete(imageId);
    console.log(`Deleted image from DB with ID: ${imageId}`);

    res.status(200).json({ message: 'تم حذف الصورة بنجاح.' });

  } catch (error) {
    console.error('Deletion process error:', error);
    const err = new Error(`خطأ في عملية الحذف: ${error.message}`);
    err.status = 500;
    next(err);
  }
});

export default router;