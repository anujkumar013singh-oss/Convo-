import { motion } from 'framer-motion';
import { X, Download, Film, Image as ImageIcon } from 'lucide-react';

export default function MediaLightbox({ media, onClose }) {
  if (!media) return null;

  const isVideo = media.type === 'video' || (media.url && media.url.match(/\.(mp4|webm|ogg)$/i));

  // Trigger browser download of image/video
  const handleDownload = async () => {
    try {
      const response = await fetch(media.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = media.name || (isVideo ? 'video_download.mp4' : 'photo_download.jpg');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Direct link fallback
      const link = document.createElement('a');
      link.href = media.url;
      link.download = media.name || 'download';
      link.target = '_blank';
      link.click();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/90 backdrop-blur-lg p-4 sm:p-6"
      onClick={onClose}
    >
      {/* Top Controls Bar */}
      <div
        className="w-full max-w-4xl flex items-center justify-between z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-white font-sans">
          {isVideo ? <Film size={20} className="text-accent" /> : <ImageIcon size={20} className="text-accent" />}
          <span className="font-semibold text-sm sm:text-base truncate max-w-xs sm:max-w-md">
            {media.name || (isVideo ? 'Video Player' : 'Image Viewer')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Download / Save Button */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white font-sans font-bold text-xs sm:text-sm
                       hover:bg-accent-hover transition-colors shadow-lg cursor-pointer focus-ring"
            title="Download file to device"
          >
            <Download size={16} />
            <span>Save to Device</span>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer focus-ring"
            aria-label="Close player"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Centered Media Player Canvas */}
      <div
        className="flex-1 w-full max-w-4xl flex items-center justify-center py-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            controls
            autoPlay
            src={media.url}
            className="max-h-[75vh] w-auto max-w-full rounded-2xl shadow-2xl border border-white/10 object-contain bg-black"
          >
            Your browser does not support playing this video.
          </video>
        ) : (
          <img
            src={media.url}
            alt={media.name || 'Media view'}
            className="max-h-[75vh] w-auto max-w-full rounded-2xl shadow-2xl border border-white/10 object-contain"
          />
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center font-sans text-xs text-white/60 font-medium">
        Press ESC or tap anywhere outside to close
      </div>
    </motion.div>
  );
}
