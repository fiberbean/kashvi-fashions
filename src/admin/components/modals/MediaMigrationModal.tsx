import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, X, HardDrive, Play } from 'lucide-react';
import { migrateExistingProductImagesToR2, MigrationProgress } from '../../utils/migrateImagesToR2';

interface MediaMigrationModalProps {
  onClose: () => void;
}

export default function MediaMigrationModal({ onClose }: MediaMigrationModalProps) {
  const [progress, setProgress] = useState<MigrationProgress>({
    totalProducts: 0,
    currentProductIndex: 0,
    currentProductCode: '',
    totalImagesMigrated: 0,
    status: 'idle',
    logs: [],
  });

  const handleStartMigration = () => {
    setProgress((prev) => ({ ...prev, status: 'running', logs: ['Starting sync...'] }));
    migrateExistingProductImagesToR2((updated) => {
      setProgress(updated);
    });
  };

  const percentage = progress.totalProducts > 0
    ? Math.round((progress.currentProductIndex / progress.totalProducts) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#101628] border border-white/10 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 text-xs">
        
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#00d9ff]" />
            <h2 className="text-sm font-bold text-white">Sync Existing Images to Cloudflare R2</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[#8b9bb4]">
          ఈ టూల్ పాత Supabase స్టోరేజ్‌లో ఉన్న ప్రొడక్ట్ ఫోటోలను డౌన్‌లోడ్ చేసి, <b>&lt; 100 KB WebP</b> గా మార్చి, 
          క్లౌడ్‌ఫ్లేర్ R2 లో <b>ProductCode_01.webp</b> గా అప్‌లోడ్ చేసి, డేటాబేస్‌ను అప్‌డేట్ చేస్తుంది.
        </p>

        {progress.status === 'running' && (
          <div className="space-y-2">
            <div className="flex justify-between text-white font-mono">
              <span>Syncing: {progress.currentProductCode}</span>
              <span>{percentage}% ({progress.currentProductIndex}/{progress.totalProducts})</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6d4aff] to-[#00d9ff] transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Logs Terminal */}
        <div className="bg-[#0a0e17] rounded-xl p-3 border border-white/10 h-48 overflow-y-auto font-mono text-[10px] text-[#00ff9d] space-y-1 custom-scrollbar">
          {progress.logs.length === 0 ? (
            <span className="text-[#8b9bb4] italic">Click "Start Full Sync" to begin...</span>
          ) : (
            progress.logs.map((log, i) => <div key={i}>{log}</div>)
          )}
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span className="font-mono text-[#00d9ff]">
            Total Images Synced: {progress.totalImagesMigrated}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 text-[#8b9bb4] hover:text-white"
            >
              Close
            </button>
            <button
              disabled={progress.status === 'running'}
              onClick={handleStartMigration}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {progress.status === 'running' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#00d9ff]" />
                  <span>Syncing...</span>
                </>
              ) : progress.status === 'completed' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#00ff9d]" />
                  <span>Sync Completed</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-[#00ff9d]" />
                  <span>Start Full Sync</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}