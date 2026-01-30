"""
Inicijalizacioni SQL script za Purchase Service
Kreira potrebne tabele u PostgreSQL bazi
"""

-- Shopping Carts table
CREATE TABLE IF NOT EXISTS shopping_carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    total_price FLOAT DEFAULT 0.0,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shopping_carts_user_id ON shopping_carts(user_id);
CREATE INDEX idx_shopping_carts_status ON shopping_carts(status);

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
    tour_id INTEGER NOT NULL,
    tour_name VARCHAR(255) NOT NULL,
    tour_price FLOAT NOT NULL,
    quantity INTEGER DEFAULT 1,
    price FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_cart_id ON order_items(cart_id);
CREATE INDEX idx_order_items_tour_id ON order_items(tour_id);

-- Tour Purchase Tokens table
CREATE TABLE IF NOT EXISTS tour_purchase_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    cart_id INTEGER NOT NULL REFERENCES shopping_carts(id),
    tour_id INTEGER NOT NULL,
    tour_name VARCHAR(255) NOT NULL,
    purchase_price FLOAT NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active VARCHAR(20) DEFAULT 'completed'
);

CREATE INDEX idx_tour_purchase_tokens_user_id ON tour_purchase_tokens(user_id);
CREATE INDEX idx_tour_purchase_tokens_token ON tour_purchase_tokens(token);
CREATE INDEX idx_tour_purchase_tokens_tour_id ON tour_purchase_tokens(tour_id);

-- SAGA Transactions table
CREATE TABLE IF NOT EXISTS saga_transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    cart_id INTEGER NOT NULL REFERENCES shopping_carts(id),
    user_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'processing',
    current_step VARCHAR(100),
    steps_completed TEXT,
    compensation_log TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_saga_transactions_transaction_id ON saga_transactions(transaction_id);
CREATE INDEX idx_saga_transactions_user_id ON saga_transactions(user_id);
CREATE INDEX idx_saga_transactions_status ON saga_transactions(status);
