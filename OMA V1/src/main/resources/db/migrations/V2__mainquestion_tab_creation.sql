CREATE TABLE IF NOT EXISTS mainquestion (
    main_question_id SERIAL PRIMARY KEY,
    category_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, 
    weight INT DEFAULT 1,
 
    CONSTRAINT fk_main_question_category
        FOREIGN KEY (category_id)
        REFERENCES category(category_id)
        ON DELETE CASCADE
);