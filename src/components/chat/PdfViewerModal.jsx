import { motion } from 'framer-motion';
import { X, Download, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function PdfViewerModal({ pdf, onClose }) {
  if (!pdf) return null;

  const pdfUrl = pdf.url;
  const pdfName = pdf.name || 'document.pdf';

  // Trigger browser download to save directly to local computer
  const handleDownload = async (e) => {
    e?.stopPropagation();
    try {
      toast.info(`Downloading ${pdfName}...`);
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = pdfName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success('Downloaded to system!');
    } catch {
      // Direct link fallback
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = pdfName;
      link.target = '_blank';
      link.click();
    }
  };

  const handleOpenNewTab = (e) => {
    e?.stopPropagation();
    window.open(pdfUrl, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/90 backdrop-blur-xl p-3 sm:p-6"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="w-full max-w-5xl flex items-center justify-between z-10 bg-[#1c1c20]/90 border border-white/10 p-3 sm:p-4 rounded-2xl shadow-2xl backdrop-blur-md mb-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center flex-shrink-0">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-sans text-sm sm:text-base font-extrabold text-white truncate">
              {pdfName}
            </h3>
            <p className="font-sans text-xs text-text-tertiary font-medium">
              PDF Document • {pdf.size || 'Attachment'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Open in New Tab Button */}
          <button
            type="button"
            onClick={handleOpenNewTab}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-sans font-bold text-xs transition-colors cursor-pointer"
            title="Open PDF in new tab"
          >
            <ExternalLink size={15} />
            <span>Open in Tab</span>
          </button>

          {/* Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-sans font-extrabold text-xs sm:text-sm transition-all shadow-lg shadow-accent/25 cursor-pointer active:scale-95"
            title="Download PDF to computer"
          >
            <Download size={16} />
            <span>Download</span>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close viewer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* PDF View Container Canvas */}
      <div
        className="flex-1 w-full max-w-5xl h-full min-h-[60vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#121215] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={`${pdfUrl}#toolbar=1`}
          title={pdfName}
          className="w-full h-full flex-1 rounded-2xl bg-zinc-900 border-none"
        />
      </div>

      {/* Bottom Footer Info */}
      <div className="text-center font-sans text-xs text-white/50 font-medium mt-3">
        Click outside or press ESC to exit PDF viewer
      </div>
    </motion.div>
  );
}
