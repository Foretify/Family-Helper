import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function InstructionsModal({ title, instructions, onClose }) {
  if (!instructions) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-slate-800">📋 {title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-4 overflow-auto prose prose-sm max-w-none">
          <ReactMarkdown>{instructions}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
