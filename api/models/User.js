import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      match: /^[a-zA-Z0-9_.-@]{3,30}$/,
    },
    usernameLower: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    fullName: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      default: '',
    },
    passwordHash: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: 160,
      default: '',
    },
    links: [
      {
        label: { type: String, trim: true },
        url: { type: String, trim: true },
      },
    ],
    isEmailVerified: {
      type: Boolean,
      default: true,
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook to strip leading @ and set usernameLower
userSchema.pre('validate', function () {
  if (this.username) {
    this.username = this.username.replace(/^@+/, '').trim();
    this.usernameLower = this.username.toLowerCase();
  }
});

// Text index for fast username search
userSchema.index({ username: 'text' });

// Ensure passwordHash is never returned in API responses
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);
export default User;
