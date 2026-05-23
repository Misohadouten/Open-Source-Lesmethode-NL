'use client';

import React from 'react';
import { btn } from '@/lib/buttonStyles';
import { formatBytes } from '@/lib/lesAiAnalyse';

interface LesAiUploadPanelProps {
  aiBezig: boolean;
  aiBestand: File | null;
  aiError: string | null;
  aiSucces: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const LesAiUploadPanel: React.FC<LesAiUploadPanelProps> = ({
  aiBezig,
  aiBestand,
  aiError,
  aiSucces,
  onFileChange,
}) => (
  <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold text-orange-800 mb-1">Document uploaden (AI)</h2>
        <p className="text-xs text-orange-700">
          Upload een PDF of Word-document (.docx). AI vult alle lesvelden in (titel, introductie, inhoud, slot,
          leerdoelen, tijdsduur, literatuur). Pas daarna aan en gebruik de duplicaatknop vóór opslaan.
        </p>
      </div>
      <label
        className={`shrink-0 cursor-pointer ${
          aiBezig
            ? 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-orange-200 text-orange-500 cursor-not-allowed'
            : btn.primary
        }`}
      >
        {aiBezig ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Analyseren...
          </>
        ) : (
          <>
            <span>📄</span>
            {aiBestand ? 'Ander document' : 'Document uploaden'}
          </>
        )}
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={onFileChange}
          disabled={aiBezig}
          className="hidden"
        />
      </label>
    </div>

    {aiBestand && !aiBezig && (
      <p className="mt-2 text-xs text-orange-600">
        📎 {aiBestand.name} — {formatBytes(aiBestand.size)}
      </p>
    )}

    {aiError && (
      <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
        {aiError}
      </div>
    )}

    {aiSucces && !aiError && (
      <div className="mt-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
        AI heeft de velden uit je document in het formulier gezet. Controleer en pas aan waar nodig.
      </div>
    )}
  </div>
);

export default LesAiUploadPanel;
