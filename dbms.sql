CREATE DATABASE feastflow_db;
USE feastflow_db;
CREATE TABLE users (
id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(100) NOT NULL,
mobile VARCHAR(15) NOT NULL UNIQUE,
email VARCHAR(150) NOT NULL UNIQUE,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE addresses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    label VARCHAR(50) DEFAULT 'Home',
    flat VARCHAR(150) NOT NULL,
    street VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    is_default TINYINT(1) DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    gst DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 40.00,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    placed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);
SHOW TABLES;
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    price DECIMAL(10,2),
    category VARCHAR(50),
    emoji VARCHAR(10),
    rating FLOAT,
    is_popular BOOLEAN,
    is_active BOOLEAN DEFAULT 1
);
ALTER TABLE products ADD is_veg BOOLEAN;
INSERT INTO products (name, description, price, category, emoji, rating, is_popular, is_veg) VALUES
('Butter Chicken',   'Creamy tomato-based curry with tender chicken',    280, 'Indian',       '🍛', 4.8, 1, 0),
('Paneer Tikka',     'Grilled cottage cheese with spices and veggies',   220, 'Indian',       '🧀', 4.7, 1, 1),
('Veg Biryani',      'Fragrant basmati rice with seasonal vegetables',   180, 'Indian',       '🍚', 4.5, 0, 1),
('Masala Dosa',      'Crispy dosa with spiced potato filling',           120, 'South Indian', '🥞', 4.6, 1, 1),
('Chole Bhature',    'Spiced chickpeas with fluffy deep-fried bread',    150, 'Indian',       '🫓', 4.4, 0, 1),
('Margherita Pizza', 'Classic pizza with tomato, mozzarella and basil',  320, 'Italian',      '🍕', 4.7, 1, 1),
('Chicken Burger',   'Juicy grilled chicken with crispy lettuce',        199, 'Fast Food',    '🍔', 4.5, 1, 0),
('French Fries',     'Golden crispy fries with seasoning',                99, 'Fast Food',    '🍟', 4.3, 0, 1),
('Chocolate Shake',  'Rich thick chocolate milkshake',                   149, 'Beverages',    '🥛', 4.6, 0, 1),
('Mango Lassi',      'Creamy mango yogurt drink',                         99, 'Beverages',    '🥭', 4.8, 1, 1),
('Gulab Jamun',      'Soft milk-solid balls in sugar syrup',              80, 'Desserts',     '🍮', 4.7, 0, 1),
('Hakka Noodles',    'Stir-fried noodles with veggies and sauces',      160, 'Chinese',      '🍜', 4.4, 0, 1),
('Chicken Momos',    'Steamed dumplings with spicy chutney',             140, 'Chinese',      '🥟', 4.6, 1, 0),
('Dal Makhani',      'Slow-cooked black lentils in creamy sauce',        200, 'Indian',       '🫕', 4.5, 0, 1),
('Idli Sambar',      'Soft steamed rice cakes with sambar and chutney',  100, 'South Indian', '🫔', 4.5, 0, 1),
('Brownie Sundae',   'Warm brownie with vanilla ice cream',              180, 'Desserts',     '🍫', 4.9, 1, 1);
