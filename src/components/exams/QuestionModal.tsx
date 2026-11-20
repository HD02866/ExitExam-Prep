'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import type { QuestionWithOptions, OptionKey } from '@/types/database.types';
import type { QuestionInput } from '@/actions/questions';
import { CheckCircle2, HelpCircle } from 'lucide-react';

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuestionInput) => Promise<string | undefined>;
  initialData?: QuestionWithOptions | null;
  questionNumber?: number;
}

export function QuestionModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  questionNumber,
}: QuestionModalProps) {
  const isEditing = Boolean(initialData);

  const [questionText, setQuestionText] = useState('');
  const [points, setPoints] = useState<number>(1);
  const [explanation, setExplanation] = useState('');
  const [options, setOptions] = useState<Record<OptionKey, string>>({
    A: '',
    B: '',
    C: '',
    D: '',
  });
  const [correctKey, setCorrectKey] = useState<OptionKey>('A');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setQuestionText(initialData.question_text);
      setPoints(Number(initialData.points) || 1);
      setExplanation(initialData.explanation || '');

      const optsMap: Record<OptionKey, string> = { A: '', B: '', C: '', D: '' };
      let correct: OptionKey = 'A';

      (initialData.options || []).forEach((opt) => {
        if (opt.option_key in optsMap) {
          optsMap[opt.option_key] = opt.option_text;
          if (opt.is_correct) {
            correct = opt.option_key;
          }
        }
      });

      setOptions(optsMap);
      setCorrectKey(correct);
    } else {
      setQuestionText('');
      setPoints(1);
      setExplanation('');
      setOptions({ A: '', B: '', C: '', D: '' });
      setCorrectKey('A');
    }
    setError(null);
  }, [initialData, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (!questionText.trim()) {
      setError('Question text is required.');
      return;
    }

    if (isNaN(points) || points <= 0) {
      setError('Points must be a positive number greater than 0.');
      return;
    }

    const missingOptions = (['A', 'B', 'C', 'D'] as OptionKey[]).filter(
      (k) => !options[k] || options[k].trim().length === 0
    );

    if (missingOptions.length > 0) {
      setError(`All four answer options must be filled out. Missing: Option ${missingOptions.join(', ')}.`);
      return;
    }

    if (!correctKey) {
      setError('You must select exactly one answer option as correct.');
      return;
    }

    setIsLoading(true);

    const payload: QuestionInput = {
      questionText: questionText.trim(),
      points,
      explanation: explanation.trim() || null,
      options: (['A', 'B', 'C', 'D'] as OptionKey[]).map((key) => ({
        optionKey: key,
        optionText: options[key].trim(),
        isCorrect: key === correctKey,
      })),
    };

    const err = await onSubmit(payload);
    setIsLoading(false);

    if (err) {
      setError(err);
    } else {
      onClose();
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Question #${questionNumber || ''}` : 'Add New Question'}
      description="Each examination question requires exactly four answer options with one designated correct answer."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <Alert type="error">
            {error}
          </Alert>
        )}

        {/* Question Text */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1">
            Question Statement <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            required
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="State the problem or multiple-choice question clearly..."
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
        </div>

        {/* Points & Explanation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Input
              label="Points"
              type="number"
              step="0.5"
              min="0.5"
              max="100"
              required
              value={points}
              onChange={(e) => setPoints(parseFloat(e.target.value))}
              helperText="Points awarded"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
              Explanation <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Rationale or educational explanation for review..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
            />
          </div>
        </div>

        {/* 4 Answer Options */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-sm font-bold text-slate-900">
              Answer Options (Exactly 4 Required)
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Select the single correct answer
            </span>
          </div>

          {(['A', 'B', 'C', 'D'] as OptionKey[]).map((key) => {
            const isCorrect = correctKey === key;
            return (
              <div
                key={key}
                onClick={() => setCorrectKey(key)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                  isCorrect
                    ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Radio Indicator */}
                <input
                  type="radio"
                  name="correct_answer"
                  id={`opt_${key}`}
                  checked={isCorrect}
                  onChange={() => setCorrectKey(key)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer shrink-0"
                />

                {/* Option Badge */}
                <label
                  htmlFor={`opt_${key}`}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-bold shrink-0 cursor-pointer ${
                    isCorrect
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {key}
                </label>

                {/* Option Text Input */}
                <input
                  type="text"
                  required
                  placeholder={`Enter text for Option ${key}...`}
                  value={options[key]}
                  onChange={(e) => {
                    e.stopPropagation();
                    setOptions({ ...options, [key]: e.target.value });
                  }}
                  className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />

                {isCorrect && (
                  <span className="text-xs font-bold text-emerald-700 px-2 py-0.5 rounded-md bg-emerald-100 shrink-0">
                    Correct Answer
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            {isEditing ? 'Save Question' : 'Add Question'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
