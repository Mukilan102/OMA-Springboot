CREATE TABLE freetext_cache (
    cache_id BIGSERIAL PRIMARY KEY,
    main_question_id INT NOT NULL,
    category_id INT NOT NULL,
    free_text TEXT NOT NULL,
    bert_score NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_cache_main_question
        FOREIGN KEY (main_question_id)
        REFERENCES mainquestion(main_question_id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_cache_category
        FOREIGN KEY (category_id)
        REFERENCES category(category_id)
        ON DELETE CASCADE
);

-- Create index on category_id for faster queries
CREATE INDEX idx_freetext_cache_category ON freetext_cache(category_id);

-- Create index for efficient pagination of unprocessed entries (FIFO processing)
-- Optimizes: WHERE bert_score IS NULL ORDER BY created_at LIMIT N
-- Replaces need for separate null_score index since it covers filtering + sorting
CREATE INDEX idx_unprocessed_queue ON freetext_cache(created_at) 
WHERE bert_score IS NULL;
