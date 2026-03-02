-- Create sample table
CREATE TABLE IF NOT EXISTS sample (
 sample_id SERIAL PRIMARY KEY,
 sample_text VARCHAR(255) NOT NULL,
 weight INT DEFAULT 1
);
