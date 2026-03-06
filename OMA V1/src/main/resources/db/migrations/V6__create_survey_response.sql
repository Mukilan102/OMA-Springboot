-- V6
CREATE TABLE survey_response (
    response_id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    main_question_id INT NOT NULL,
    sub_question_id INT,
    option_id INT,
    free_text TEXT,
    rank_position INT,
    category_id INT NOT NULL,
    CONSTRAINT fk_submission
        FOREIGN KEY (session_id)
        REFERENCES survey_submission(session_id)
);