const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  idgoogle: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: false,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.'],
  },
  authKeytel: {
    type: String,
    required: true,
    minlength: [8, 'Auth key must be at least 8 characters long.'],
  },
  token: {
    type: String,
    required: true,
  },
  codeInsee: {
    type: String,
    default: '00000',
  },
  codeRivoli: {
    type: String,
    default: '00000',
  },
  city: {
    type: String,
    default: '',
  },
  street: {
    type: String,
    default: '',
  },
  postalcode: {
    type: String,
    default: '',
  },
  // Ajout du sous-document "position"
  position: {
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
  },
  fcmToken: {
    type: String,
    default: '',
  },
  notificationsEnabled: {
    type: Boolean,
    default: true,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Index
userSchema.index({ email: 1 });

const UserModel = mongoose.model('User', userSchema);

module.exports = UserModel;
