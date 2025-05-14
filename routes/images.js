import express from 'express';
import multer from 'multer';
import fs from 'fs'; // Keep for potential diskStorage cleanup (though memoryStorage is active)
import path from 'path'; // Keep for potential diskStorage usage
import Image from '../models/Image.js';
import imgurUploader from 'imgur-uploader';

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

// POST route for uploading images
router.post('/upload', upload.array('imagesToUpload', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const wasteTypes = Array.isArray(req.body.wasteTypes) ? req.body.wasteTypes : [req.body.wasteTypes];

  if (req.files.length !== wasteTypes.length) {
    return res.status(400).send('Mismatch between number of files and waste types provided.');
  }


  try {
    const uploadedImageDocs = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const wasteType = wasteTypes[i];

      if (!['paper', 'plastic', 'metal', 'mixed'].includes(wasteType)) {
        console.warn(`Invalid waste type '${wasteType}' for file ${file.originalname}. Skipping.`);
        continue;
      }

      console.log(`Uploading ${file.originalname} to Imgur via imgur-uploader package...`);

      // Use imgur-uploader package
      const imgurResponse = await imgurUploader(file.buffer, {
        title: `Novera Waste - ${file.originalname}`, // Optional title
        description: `Waste type: ${wasteType}`, // Optional description
        // The package automatically uses IMGUR_CLIENT_ID from process.env
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

      // If using diskStorage, uncomment to delete local temp file
      // if (file.path) {
      //   fs.unlink(file.path, (err) => {
      //     if (err) console.error("Error deleting temp file:", err);
      //   });
      // }
    }
    res.redirect('/gallery'); // Redirect to gallery after successful upload

  } catch (error) {
    console.error('Upload process error:', error);
    // If using diskStorage and an error occurs, cleanup uploaded files
    // req.files.forEach(file => {
    //   if (file.path && fs.existsSync(file.path)) fs.unlink(file.path, err => console.error("Cleanup error:", err));
    // });
    res.status(500).send(`Error uploading files: ${error.message}`);
  }
});

export default router;