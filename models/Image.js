import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  imgurUrl: {
    type: String,
    required: true,
  },
  imgurDeleteHash: {
    type: String,
    required: true,
  },
  wasteType: {
    type: String,
    enum: ['paper', 'plastic', 'metal', 'mixed', 'unknown'], // Added 'unknown' for safety
    default: 'unknown',
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  academicId: { // Added academicId field
    type: String,
    required: true,
  },
  uploaderName: { // Added uploaderName field
    type: String,
    required: false, // Not strictly required if ID not found, though we'll validate
  },
});

const Image = mongoose.model('Image', imageSchema);

export default Image;