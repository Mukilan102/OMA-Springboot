CREATE TABLE freetext_cache (
    cache_id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    main_question_id INT NOT NULL,
    category_id INT NOT NULL,
    free_text TEXT NOT NULL,
    bert_score NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_cache_session
        FOREIGN KEY (session_id)
        REFERENCES survey_submission(session_id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_cache_main_question
        FOREIGN KEY (main_question_id)
        REFERENCES mainquestion(main_question_id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_cache_category
        FOREIGN KEY (category_id)
        REFERENCES category(category_id)
        ON DELETE CASCADE
);

-- Create index on session_id for faster queries
CREATE INDEX idx_freetext_cache_session ON freetext_cache(session_id);

-- Create index on category_id for faster queries
CREATE INDEX idx_freetext_cache_category ON freetext_cache(category_id);

-- Create index for efficient pagination of unprocessed entries (FIFO processing)
-- Optimizes: WHERE bert_score IS NULL ORDER BY created_at LIMIT N
CREATE INDEX idx_unprocessed_queue ON freetext_cache(created_at) 
WHERE bert_score IS NULL;

-- Create composite index for session + process status queries
CREATE INDEX idx_freetext_cache_session_score ON freetext_cache(session_id, bert_score);
