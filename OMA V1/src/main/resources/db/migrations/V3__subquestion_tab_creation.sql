CREATE TABLE IF NOT EXISTS sub_question (
    sub_question_id SERIAL PRIMARY KEY,
    main_question_id INT NOT NULL,
    question_text TEXT NOT NULL,
    weight INT DEFAULT 0,
 
    CONSTRAINT fk_sub_question_main_question
        FOREIGN KEY (main_question_id)
        REFERENCES mainquestion(main_question_id)
        ON DELETE CASCADE
);