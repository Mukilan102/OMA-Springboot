CREATE TABLE IF NOT EXISTS option (
    option_id SERIAL PRIMARY KEY,
    main_question_id INT,
    sub_question_id INT,
    option_text TEXT NOT NULL,
    score NUMERIC(5,2) DEFAULT 0,
 
    CONSTRAINT fk_option_main_question
        FOREIGN KEY (main_question_id)
        REFERENCES mainquestion(main_question_id)
        ON DELETE CASCADE,
 
    CONSTRAINT fk_option_sub_question
        FOREIGN KEY (sub_question_id)
        REFERENCES sub_question(sub_question_id)
        ON DELETE CASCADE
     
);