import express from 'express';
import multer from 'multer';
import fs from 'fs'; // Keep for potential diskStorage cleanup (though memoryStorage is active)
import path from 'path'; // Keep for potential diskStorage usage
import sharp from 'sharp';
import Image from '../models/image.js';
import imgurUploader from 'imgur-uploader';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const idsDataPath = path.join(__dirname, 'ids.json');
let idsData = [];

try {
  if (fs.existsSync(idsDataPath)) {
    const fileContent = fs.readFileSync(idsDataPath, 'utf-8');
    if (fileContent) {
      idsData = JSON.parse(fileContent);
    }
  } else {
    console.error('ids.json file not found at:', idsDataPath);
    // Create empty file if it doesn't exist
    fs.writeFileSync(idsDataPath, '[]', 'utf-8');
  }
} catch (error) {
  console.error('Error reading ids.json:', error);
  idsData = []; // Fallback to empty array
}

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID;
router.post('/upload', upload.array('imagesToUpload'), async (req, res, next) => {
  console.log(req.files);

  const academicId = req.body.academicId;
  const wasteTypes = Array.isArray(req.body.wasteTypes) ? req.body.wasteTypes : [req.body.wasteTypes];

  if (!academicId) {
    return res.status(400).json({ error: 'الرقم الأكاديمي مطلوب.' });
  }

  // Find the user in idsData based on academicId
  const user = idsData.find(user => {
    if (!user || !user.id) return false;
    return user.id.toString() === academicId.toString();
  });

  if (!user) {
    return res.status(400).json({ error: 'الرقم الأكاديمي غير موجود.' });
  }

  const uploaderName = user.name; // Get the name from the found user

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'لم يتم رفع أي ملفات.' });
  }

  // No need to check length matching since we're handling it on the client side
  try {
    const uploadedImageDocs = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const wasteType = wasteTypes[i];

      if (!['paper', 'plastic', 'metal', 'mixed'].includes(wasteType)) {
        console.warn(`Invalid waste type '${wasteType}' for file ${file.originalname}. Skipping.`);
        continue; // Skip this file if waste type is invalid
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
        description: `Waste type: ${wasteType}, Uploader: ${uploaderName}`, // Add uploader name to description
      });

      // Check if upload was successful and link exists
      if (!imgurResponse || !imgurResponse.link) {
        console.error('Imgur Uploader Error:', imgurResponse);
        throw new Error(
          `Imgur upload failed for ${file.originalname}: ${imgurResponse?.error || 'Unknown imgur-uploader error'
          }`
        );
      }

      console.log('Imgur Upload Success:', imgurResponse.link);

      const newImage = new Image({
        filename: file.originalname,
        imgurUrl: imgurResponse.link, // Use link from imgur-uploader response
        imgurDeleteHash: imgurResponse.deletehash, // Use deletehash from imgur-uploader response
        wasteType: wasteType,
        academicId: academicId, // Save academic ID
        uploaderName: uploaderName, // Save uploader name
      });
      const savedImage = await newImage.save();
      uploadedImageDocs.push(savedImage);
    }

    if (uploadedImageDocs.length === 0) {
      return res.status(400).json({ error: 'لم يتم رفع أي صور صالحة للتصنيف.' });
    }

    // Change from json to render success.ejs
    res.render('success', {
      message: `تم رفع وتصنيف ${uploadedImageDocs.length} صور بنجاح بواسطة ${uploaderName}!`, // Include name in success message
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