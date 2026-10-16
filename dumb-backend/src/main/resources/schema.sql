CREATE DATABASE IF NOT EXISTS dumb DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE dumb;

CREATE TABLE IF NOT EXISTS user (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(128) NOT NULL UNIQUE,
    avatar VARCHAR(255),
    role VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS album (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(128) NOT NULL,
    artist VARCHAR(128) NOT NULL,
    cover_image VARCHAR(255),
    release_date DATE,
    genre VARCHAR(32) NOT NULL,
    label_name VARCHAR(128),
    description TEXT,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    album_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,
    score DECIMAL(3,1) NOT NULL,
    author_id BIGINT NOT NULL,
    cover_image VARCHAR(255),
    status VARCHAR(32) NOT NULL,
    publish_time DATETIME,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_review_album_id (album_id),
    INDEX idx_review_author_id (author_id),
    INDEX idx_review_status (status)
);

CREATE TABLE IF NOT EXISTS anime (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,
    cover_image VARCHAR(255),
    author_id BIGINT NOT NULL,
    score DECIMAL(3,1) NOT NULL,
    studio VARCHAR(128) NOT NULL,
    genre VARCHAR(255),
    background_image VARCHAR(255),
    release_date DATE,
    status VARCHAR(32) NOT NULL,
    publish_time DATETIME,
    views INT NOT NULL DEFAULT 0,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_anime_status (status),
    INDEX idx_anime_author_id (author_id)
);

CREATE TABLE IF NOT EXISTS movie (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,
    cover_image VARCHAR(255),
    author_id BIGINT NOT NULL,
    score DECIMAL(3,1) NOT NULL,
    director VARCHAR(128) NOT NULL,
    actors VARCHAR(255) NOT NULL,
    genre VARCHAR(255),
    region VARCHAR(64),
    background_image VARCHAR(255),
    release_date DATE,
    status VARCHAR(32) NOT NULL,
    publish_time DATETIME,
    views INT NOT NULL DEFAULT 0,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_movie_status (status),
    INDEX idx_movie_author_id (author_id)
);

CREATE TABLE IF NOT EXISTS comment (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content_type VARCHAR(32) NOT NULL,
    content_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    score DECIMAL(3,1),
    parent_id BIGINT,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_comment_target (content_type, content_id),
    INDEX idx_comment_user_id (user_id)
);

INSERT INTO user (username, password, email, role, status)
VALUES ('admin', '$2a$10$k5kaYfYgS2D51x5fCZ7uL.LDfYw6gB9Wf9iiV2fSO2GCJQh5hMCrG', 'admin@dumb.com', 'ADMIN', 'ENABLED')
ON DUPLICATE KEY UPDATE username = VALUES(username);
