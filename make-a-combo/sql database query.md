CREATE TABLE shops (
    id CHAR(36) NOT NULL PRIMARY KEY,
    shop_id VARCHAR(255) NOT NULL UNIQUE,
    store_name VARCHAR(255) NOT NULL,
    status ENUM('enabled', 'disabled') NOT NULL DEFAULT 'enabled',
    app_plan VARCHAR(50) DEFAULT 'Free',
    theme_name VARCHAR(255),
    last_source VARCHAR(100),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP 
        ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE templates (
    id CHAR(36) NOT NULL PRIMARY KEY,
    shop_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    layout_type ENUM('layout1', 'layout2', 'layout3', 'layout4') NOT NULL,
    source JSON NOT NULL,
    product_list JSON NOT NULL,
    config JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_templates_shop
        FOREIGN KEY (shop_id)
        REFERENCES shops(id)
        ON DELETE CASCADE
);

CREATE TABLE discounts (
    id CHAR(36) NOT NULL PRIMARY KEY,
    template_id CHAR(36) NOT NULL UNIQUE,
    settings JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP 
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_discounts_template
        FOREIGN KEY (template_id)
        REFERENCES templates(id)
        ON DELETE CASCADE
);
