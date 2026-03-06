UPDATE option
SET main_question_id = CASE main_question_id
    WHEN 6 THEN 8
    WHEN 7 THEN 9
    WHEN 8 THEN 6
    WHEN 9 THEN 7
END
WHERE main_question_id IN (6,7,8,9);
