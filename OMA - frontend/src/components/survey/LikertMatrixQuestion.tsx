import type { SubQuestion } from "../../types/survey";

interface LikertMatrixQuestionProps {
  subQuestions: SubQuestion[];
  value: Record<number, number> | undefined;
  onChange: (value: Record<number, number>) => void;
}

export function LikertMatrixQuestion({
  subQuestions,
  value,
  onChange,
}: LikertMatrixQuestionProps) {
  const responses = value || {};

  // Derive column headers from the first sub-question's options
  const columnHeaders = subQuestions.length > 0 ? subQuestions[0].options : [];

  const handleSelect = (subQuestionId: number, optionId: number) => {
    onChange({ ...responses, [subQuestionId]: optionId });
  };

  return (
    <div className="space-y-4">
      {/* Desktop: Table layout */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-3 text-sm font-medium text-[#002D72] border-b-2 border-gray-200 min-w-[200px]">
                Statement
              </th>
              {columnHeaders.map((col) => (
                <th
                  key={col.option_id}
                  className="p-3 text-center text-xs font-medium text-[#4A4A4A] border-b-2 border-gray-200 min-w-[90px]"
                >
                  {col.option_text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subQuestions.map((sq, rowIndex) => (
              <tr
                key={sq.sub_question_id}
                className={rowIndex % 2 === 0 ? "bg-gray-50/50" : "bg-white"}
              >
                <td className="p-3 text-sm text-[#4A4A4A] leading-relaxed border-b border-gray-100">
                  {sq.question_text}
                </td>
                {sq.options.map((opt) => {
                  const isSelected = responses[sq.sub_question_id] === opt.option_id;
                  return (
                    <td
                      key={opt.option_id}
                      className={`border-b border-gray-100 transition-colors duration-150 ${
                        isSelected
                          ? 'bg-[#008489]/10'
                          : 'hover:bg-gray-100/70'
                      }`}
                    >
                      <label
                        className="flex items-center justify-center w-full h-full p-3 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={`sq-${sq.sub_question_id}`}
                          checked={isSelected}
                          onChange={() => handleSelect(sq.sub_question_id, opt.option_id)}
                          className="w-4 h-4 accent-[#008489] cursor-pointer"
                        />
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Stacked layout */}
      <div className="md:hidden space-y-6">
        {subQuestions.map((sq) => (
          <div
            key={sq.sub_question_id}
            className="p-4 rounded-xl border-2 border-gray-200 space-y-3"
          >
            <p className="text-sm text-[#002D72] font-medium leading-relaxed">
              {sq.question_text}
            </p>
            <div className="flex flex-wrap gap-2">
              {sq.options.map((opt) => {
                const isSelected = responses[sq.sub_question_id] === opt.option_id;
                return (
                  <button
                    key={opt.option_id}
                    type="button"
                    onClick={() => handleSelect(sq.sub_question_id, opt.option_id)}
                    className={`px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all duration-200 ${
                      isSelected
                        ? "border-[#008489] bg-[#008489] text-white shadow-md"
                        : "border-gray-200 bg-white text-[#4A4A4A] hover:border-gray-300"
                    }`}
                  >
                    {opt.option_text}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
