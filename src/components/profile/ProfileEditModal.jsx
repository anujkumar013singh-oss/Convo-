import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  Check,
  X,
  ChevronRight,
  Plus,
  Trash2,
  Link as LinkIcon,
  FileText,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { profileSchema } from '../../lib/validators';
import useAuthStore from '../../store/authStore';
import useDebounce from '../../hooks/useDebounce';
import api from '../../services/api';
import { toast } from 'sonner';

// FontAwesome Camera Icon Component
const FontAwesomeFarCamera = ({ className = "w-4 h-4 text-white" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M149.1 64c-11.3 0-21.7 6.4-26.9 16.5L103.5 112H64C28.7 112 0 140.7 0 176v240c0 35.3 28.7 64 64 64h384c35.3 0 64-28.7 64-64V176c0-35.3-28.7-64-64-64h-39.5l-18.7-31.5c-5.2-10.1-15.6-16.5-26.9-16.5H149.1zM256 208a96 96 0 1 1 0 192 96 96 0 1 1 0-192zm-48 96a48 48 0 1 0 96 0 48 48 0 1 0 -96 0z" />
  </svg>
);

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const modalVariants = {
  hidden: { scale: 0.96, opacity: 0, y: 12 },
  visible: { scale: 1, opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } },
  exit: { scale: 0.96, opacity: 0, y: 12, transition: { duration: 0.15 } },
};

export default function ProfileEditModal({ user, onClose }) {
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const logout = useAuthStore((s) => s.logout);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isImageChanged, setIsImageChanged] = useState(false);

  // Active editing field: null | 'fullName' | 'phone' | 'email' | 'username'
  const [activeEditingField, setActiveEditingField] = useState(null);
  const [showSettingsSubPage, setShowSettingsSubPage] = useState(false);

  const fileInputRef = useRef(null);

  const cleanUserUsername = (user?.username || '').replace(/^@+/, '');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName || user.username || '',
      username: cleanUserUsername,
      email: user.email || '',
      phone: user.phone || '',
      bio: user.bio || '',
      links: user.links || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'links',
  });

  const fullNameValue = watch('fullName');
  const usernameValue = watch('username');
  const emailValue = watch('email');
  const phoneValue = watch('phone');
  const bioValue = watch('bio') || '';

  const cleanTypedUsername = (usernameValue || '').replace(/^@+/, '').trim();
  const debouncedUsername = useDebounce(cleanTypedUsername, 350);

  // Username live availability check against database
  useEffect(() => {
    if (!debouncedUsername || debouncedUsername === cleanUserUsername || debouncedUsername.length < 3) {
      setUsernameStatus(null);
      return;
    }

    let cancelled = false;
    setUsernameStatus('checking');

    api.checkUsername(`${debouncedUsername}&exclude=me`).then((res) => {
      if (!cancelled) {
        setUsernameStatus(res.available ? 'available' : 'taken');
      }
    }).catch(() => {
      if (!cancelled) setUsernameStatus(null);
    });

    return () => { cancelled = true; };
  }, [debouncedUsername, cleanUserUsername]);

  // Avatar Image Upload Handler
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setAvatarPreview(dataUrl);
      setIsImageChanged(true);
      setIsUploading(false);
      toast.success('Image selected! Click "Save Changes" to update');
    };
    reader.onerror = () => {
      setIsUploading(false);
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  // Save profile updates
  const onSubmit = async (data) => {
    if (usernameStatus === 'taken') {
      toast.error(`Username @${cleanTypedUsername} is already taken`);
      return;
    }

    const updates = {
      fullName: data.fullName,
      username: cleanTypedUsername,
      email: data.email,
      phone: data.phone,
      bio: data.bio,
      links: data.links,
      avatarUrl: avatarPreview,
    };

    const result = await updateProfile(updates);

    if (result.success) {
      toast.success('Profile updated successfully!');
      onClose();
    } else {
      toast.error(result.error || 'Failed to save profile');
    }
  };

  const canSave = (isDirty || isImageChanged) && !isSubmitting && usernameStatus !== 'taken';

  return (
    <motion.div
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        variants={modalVariants}
        className="w-full max-w-[460px] bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl shadow-black/90 relative flex flex-col items-center max-h-[92vh] overflow-y-auto text-zinc-100 antialiased"
        onClick={(e) => e.stopPropagation()}
      >
        {showSettingsSubPage ? (
          /* ── SETTINGS SUB-PAGE (Bio & Social Links) ── */
          <div className="w-full flex flex-col flex-1">
            <div className="w-full h-12 flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-4">
              <button
                type="button"
                onClick={() => setShowSettingsSubPage(false)}
                className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors flex items-center justify-center cursor-pointer"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>

              <h1 className="font-sans font-bold text-lg text-zinc-100 text-center flex-1">
                Settings (Bio & Links)
              </h1>

              <div className="w-8 h-8" />
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {/* Bio Card */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <FileText size={15} className="text-violet-400" />
                    <label className="text-xs font-semibold uppercase tracking-wider">Bio</label>
                  </div>
                  <span className="font-mono text-xs text-zinc-500">{bioValue.length}/160</span>
                </div>

                <textarea
                  rows={3}
                  placeholder="Write a brief bio..."
                  className="w-full bg-zinc-900 text-zinc-100 rounded-lg p-3 text-sm font-sans outline-none border border-zinc-800 focus:border-violet-500 resize-none transition-colors"
                  {...register('bio')}
                />
                {errors.bio && <p className="text-rose-400 text-xs font-sans">{errors.bio.message}</p>}
              </div>

              {/* Social Links Card */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-zinc-300 mb-1">
                  <LinkIcon size={15} className="text-violet-400" />
                  <label className="text-xs font-semibold uppercase tracking-wider">Social Links</label>
                </div>

                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-center bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                      <input
                        type="text"
                        placeholder="Platform"
                        className="w-20 bg-transparent text-zinc-100 font-sans text-xs font-semibold outline-none border-b border-zinc-700 pb-1 focus:border-violet-500"
                        {...register(`links.${index}.label`)}
                      />
                      <input
                        type="url"
                        placeholder="https://..."
                        className="flex-1 bg-transparent text-zinc-100 font-sans text-xs font-normal outline-none border-b border-zinc-700 pb-1 truncate focus:border-violet-500"
                        {...register(`links.${index}.url`)}
                      />
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-zinc-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => append({ label: '', url: '' })}
                    className="w-full py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-dashed border-zinc-700 text-violet-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={15} /> Add Social Link
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsSubPage(false)}
              className="w-full h-11 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm flex items-center justify-center transition-all cursor-pointer mt-4"
            >
              Done
            </button>
          </div>
        ) : (
          /* ── MAIN EDIT PROFILE PAGE ── */
          <div className="w-full flex flex-col items-center">
            {/* Header */}
            <div className="w-full h-12 flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-5">
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors flex items-center justify-center cursor-pointer"
                aria-label="Go back"
              >
                <ArrowLeft size={18} />
              </button>

              <h1 className="font-sans font-bold text-lg text-zinc-100 text-center flex-1">
                Edit Profile
              </h1>

              <div className="w-8 h-8" />
            </div>

            {/* Avatar Block */}
            <div className="flex flex-col items-center justify-center relative mb-5 flex-shrink-0">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full relative p-0.5 border-2 border-violet-500/40 bg-zinc-900 flex items-center justify-center shadow-lg cursor-pointer group"
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={cleanUserUsername}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center text-3xl font-bold uppercase">
                    {cleanUserUsername?.charAt(0) || 'U'}
                  </div>
                )}

                <div
                  className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg absolute bottom-0 right-0 border-2 border-zinc-950 group-hover:bg-violet-500 transition-colors cursor-pointer"
                  title="Change avatar"
                >
                  {isUploading ? (
                    <Loader2 size={16} className="animate-spin text-white" />
                  ) : (
                    <FontAwesomeFarCamera className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                aria-label="Upload avatar image"
              />
            </div>

            {/* Form Fields Card */}
            <div className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl overflow-hidden shadow-sm mb-5 flex-shrink-0">
              {/* Row 1: Full Name */}
              <div className="border-b border-zinc-800/80 min-h-[52px] px-4 py-2.5 flex items-center justify-between">
                <span className="font-sans text-xs font-semibold text-zinc-400 uppercase tracking-wider">Full Name</span>
                <div className="flex items-center gap-2 min-w-0 flex-1 justify-end ml-4">
                  {activeEditingField === 'fullName' ? (
                    <input
                      type="text"
                      placeholder="Enter full name"
                      className="w-full max-w-[200px] bg-zinc-900 text-zinc-100 rounded-md px-2.5 py-1 text-sm font-semibold outline-none border border-violet-500 text-right"
                      {...register('fullName')}
                      autoFocus
                    />
                  ) : (
                    <div
                      onClick={() => setActiveEditingField('fullName')}
                      className="flex items-center gap-1.5 cursor-pointer group"
                    >
                      <span className="text-sm font-bold text-zinc-100 truncate max-w-[190px]">
                        {fullNameValue || 'Add full name'}
                      </span>
                      <ChevronRight size={15} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Phone Number */}
              <div className="border-b border-zinc-800/80 min-h-[52px] px-4 py-2.5 flex items-center justify-between">
                <span className="font-sans text-xs font-semibold text-zinc-400 uppercase tracking-wider">Phone</span>
                <div className="flex items-center gap-2 min-w-0 flex-1 justify-end ml-4">
                  {activeEditingField === 'phone' ? (
                    <input
                      type="tel"
                      placeholder="+1234567890"
                      className="w-full max-w-[200px] bg-zinc-900 text-zinc-100 rounded-md px-2.5 py-1 text-sm font-semibold outline-none border border-violet-500 text-right"
                      {...register('phone')}
                      autoFocus
                    />
                  ) : (
                    <div
                      onClick={() => setActiveEditingField('phone')}
                      className="flex items-center gap-1.5 cursor-pointer group"
                    >
                      <span className="text-sm font-bold text-zinc-100 truncate max-w-[190px]">
                        {phoneValue || 'Not set'}
                      </span>
                      <ChevronRight size={15} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Email */}
              <div className="border-b border-zinc-800/80 min-h-[52px] px-4 py-2.5 flex items-center justify-between">
                <span className="font-sans text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email</span>
                <div className="flex items-center gap-2 min-w-0 flex-1 justify-end ml-4">
                  {activeEditingField === 'email' ? (
                    <input
                      type="email"
                      placeholder="name@example.com"
                      className="w-full max-w-[220px] bg-zinc-900 text-zinc-100 rounded-md px-2.5 py-1 text-sm font-semibold outline-none border border-violet-500 text-right"
                      {...register('email')}
                      autoFocus
                    />
                  ) : (
                    <div
                      onClick={() => setActiveEditingField('email')}
                      className="flex items-center gap-1.5 cursor-pointer group"
                    >
                      <span className="text-sm font-bold text-zinc-100 break-all text-right">
                        {emailValue || 'Add email'}
                      </span>
                      <ChevronRight size={15} className="text-zinc-500 group-hover:text-zinc-300 transition-colors flex-shrink-0" />
                    </div>
                  )}
                </div>
              </div>

              {/* Row 4: Username */}
              <div className="border-b border-zinc-800/80 min-h-[52px] px-4 py-2.5 flex flex-col justify-center">
                <div className="flex items-center justify-between w-full">
                  <span className="font-sans text-xs font-semibold text-zinc-400 uppercase tracking-wider">Username</span>
                  <div className="flex items-center gap-2 min-w-0 flex-1 justify-end ml-4">
                    {activeEditingField === 'username' ? (
                      <div className="relative flex items-center justify-end w-full max-w-[200px]">
                        <span className="absolute left-2 text-violet-400 font-bold text-xs">@</span>
                        <input
                          type="text"
                          placeholder="username"
                          className={`w-full bg-zinc-900 text-zinc-100 rounded-md pl-6 pr-7 py-1 text-sm font-mono font-semibold outline-none border ${
                            errors.username || usernameStatus === 'taken' ? 'border-rose-500' : 'border-violet-500'
                          }`}
                          {...register('username')}
                          onChange={(e) => {
                            const val = e.target.value.replace(/^@+/, '').trim();
                            setValue('username', val, { shouldValidate: true, shouldDirty: true });
                          }}
                          autoFocus
                        />
                        {usernameStatus && (
                          <span className="absolute right-2">
                            {usernameStatus === 'checking' && <Loader2 size={13} className="animate-spin text-zinc-400" />}
                            {usernameStatus === 'available' && <Check size={13} className="text-emerald-400 font-bold" />}
                            {usernameStatus === 'taken' && <X size={13} className="text-rose-400 font-bold" />}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div
                        onClick={() => setActiveEditingField('username')}
                        className="flex items-center gap-1.5 cursor-pointer group"
                      >
                        <span className="font-mono text-sm font-bold text-violet-400 truncate max-w-[190px]">
                          @{cleanTypedUsername || cleanUserUsername}
                        </span>
                        <ChevronRight size={15} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                      </div>
                    )}
                  </div>
                </div>

                {usernameStatus === 'taken' && (
                  <div className="flex items-center gap-1 mt-1.5 text-rose-400 text-xs font-medium justify-end">
                    <AlertCircle size={13} />
                    <span>Username @{cleanTypedUsername} is already taken.</span>
                  </div>
                )}
                {usernameStatus === 'available' && (
                  <div className="flex items-center gap-1 mt-1.5 text-emerald-400 text-xs font-medium justify-end">
                    <Check size={13} />
                    <span>Username @{cleanTypedUsername} is available!</span>
                  </div>
                )}
              </div>

              {/* Row 5: Settings */}
              <div>
                <div
                  onClick={() => setShowSettingsSubPage(true)}
                  className="min-h-[52px] px-4 py-2.5 flex items-center justify-between hover:bg-zinc-800/40 transition-colors cursor-pointer"
                >
                  <span className="font-sans text-xs font-semibold text-zinc-400 uppercase tracking-wider">Settings</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-zinc-300">Bio & Links</span>
                    <ChevronRight size={15} className="text-zinc-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Changes Button */}
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={!canSave}
              className="w-full h-11 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm flex items-center justify-center transition-all shadow-md shadow-violet-950/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0 active:scale-[0.99]"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={() => {
                logout();
                onClose();
                toast.success('Logged out successfully');
              }}
              className="w-full h-10 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 text-rose-300 font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer flex-shrink-0 mt-3"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
