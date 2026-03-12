import { Check } from "lucide-react";
import type { SurveyOption } from "../../types/survey";

interface MultiAnswerQuestionProps {
  options: SurveyOption[];
  value: number[] | undefined;
  onChange: (optionIds: number[]) => void;
}

// Detects "None of the above" / "None" style options
const isNoneOption = (text: string) => /\bnone\b/i.test(text);

export function MultiAnswerQuestion({ options, value, onChange }: MultiAnswerQuestionProps) {
  const selectedIds = value || [];

  const toggleOption = (optionId: number) => {
    const clickedOption = options.find((o) => o.option_id === optionId);
    const clickedIsNone = clickedOption ? isNoneOption(clickedOption.option_text) : false;

    if (selectedIds.includes(optionId)) {
      // Deselect this option
      onChange(selectedIds.filter((id) => id !== optionId));
    } else if (clickedIsNone) {
      // Selecting "None of the above" → clear all other selections
      onChange([optionId]);
    } else {
      // Selecting a normal option → deselect any "none" options first
      const noneIds = options
        .filter((o) => isNoneOption(o.option_text))
        .map((o) => o.option_id);
      const withoutNone = selectedIds.filter((id) => !noneIds.includes(id));
      onChange([...withoutNone, optionId]);
    }
  };

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const isSelected = selectedIds.includes(option.option_id);
        return (
        <button
          key={option.option_id}
          type="button"
          onClick={() => toggleOption(option.option_id)}
          // Added 'justify-start' and ensured 'text-left' is here to override button defaults
          className={`w-full flex items-start justify-start text-left gap-4 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
            isSelected
              ? "border-[#008489] bg-[#008489]/5 shadow-md"
              : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
          }`}
        >
          {/* checkbox container */}
          <div
            className={`w-6 h-6 mt-1 shrink-0 rounded-md border-2 flex items-center justify-center ${
              isSelected
                ? "border-[#008489] bg-[#008489]"
                : "border-gray-300 bg-white"
            }`}
          >
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </div>

          {/* text container */}
          {/* Added 'flex-1' and 'text-left' to ensure the span fills the width and aligns text correctly */}
          <span
            className={`min-w-0 text-base leading-relaxed flex-1 text-left ${
              isSelected
                ? "text-[#002D72] font-medium"
                : "text-[#4A4A4A]"
            }`}
            style={{ textAlign: 'left' }} 
          >
            {option.option_text}
          </span>
        </button>
        );
      })}
      <p className="text-xs text-[#4A4A4A]/70 pt-2">
        Select all that apply ({selectedIds.length} selected)
      </p>
    </div>
  );
}
