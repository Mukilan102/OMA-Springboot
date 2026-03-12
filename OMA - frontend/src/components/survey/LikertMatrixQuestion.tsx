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
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr>
              <th className="w-[50%] text-left p-3 text-sm font-medium text-[#002D72] border-b-2 border-gray-200">
                Statement
              </th>
              {columnHeaders.map((col) => (
                <th
                  key={col.option_id}
                  className="p-3 text-center text-xs font-medium text-[#4A4A4A] border-b-2 border-gray-200"
                >
                  {col.option_text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subQuestions.map((sq) => {
              const isAnswered = responses[sq.sub_question_id] !== undefined;

              return (
                <tr
                  key={sq.sub_question_id}
                  className={`transition-colors duration-200 ${
                    isAnswered
                      ? "bg-[#008489]/[0.035]"
                      : "bg-white hover:bg-gray-50"
                  }`}
                >
                  {/* Statement column */}
                <td
                  className={`w-[55%] p-3 text-sm text-[#4A4A4A] border-b border-gray-100 align-middle ${
                    isAnswered ? "border-l-4 border-l-[#008489]" : ""
                  }`}
                >   
                    <div className="min-h-[3.5rem] flex items-center leading-relaxed">
                      {sq.question_text}
                    </div>
                  </td>

                  {/* Option columns */}
                  {sq.options.map((opt) => {
                    const isSelected = responses[sq.sub_question_id] === opt.option_id;

                    return (
                      <td
                        key={opt.option_id}
                        className={`border-b border-gray-100 align-middle transition-colors duration-200 ${
                          isSelected
                            ? "bg-[#008489]/15"
                            : "hover:bg-gray-100/70"
                        }`}
                      >
                        <label className="flex items-center justify-center w-full min-h-[3.5rem] p-3 cursor-pointer">
                          <input
                            type="radio"
                            name={`sq-${sq.sub_question_id}`}
                            checked={isSelected}
                            onChange={() =>
                              handleSelect(sq.sub_question_id, opt.option_id)
                            }
                            className="w-4 h-4 accent-[#008489] cursor-pointer"
                          />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
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
