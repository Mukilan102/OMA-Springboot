CREATE TABLE IF NOT EXISTS category (
    category_id SERIAL PRIMARY KEY,
    category_text VARCHAR(255) NOT NULL,
    weight INT DEFAULT 1
);