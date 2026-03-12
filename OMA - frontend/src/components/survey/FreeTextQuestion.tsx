interface FreeTextQuestionProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

export function FreeTextQuestion({ value, onChange }: FreeTextQuestionProps) {
  return (
    <div className="space-y-4">
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer here..."
        rows={4}
        className="w-full p-4 text-base border-2 border-gray-200 rounded-xl 
                   focus:border-[#008489] focus:ring-2 focus:ring-[#008489]/20 
                   outline-none transition-all duration-200 resize-none
                   placeholder:text-gray-400 text-[#002D72]"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-black italic">
          Please do not include personal information such as names, email addresses, or other identifiers.
        </p>

        <p className="text-xs text-[#4A4A4A]/70">
          {(value?.length || 0)} characters
        </p>
      </div>
    </div>
  );
}
