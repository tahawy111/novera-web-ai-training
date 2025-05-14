import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  filename: String, // Original filename, optional
  imgurUrl: {
    type: String,
    required: true
  },
  imgurDeleteHash: String, // Important if you ever want to delete from Imgur
  wasteType: {
    type: String,
    required: true,
    enum: ['paper', 'plastic', 'metal', 'mixed'] // Added mixed from your original HTML
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

// Check if the model already exists before compiling it
const Image = mongoose.models.Image || mongoose.model('Image', imageSchema);

export default Image;