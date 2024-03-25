DROP SCHEMA IF EXISTS wot_wiki;
CREATE SCHEMA wot_wiki;
USE wot_wiki;

CREATE TABLE wgapi (
	id INT PRIMARY KEY AUTO_INCREMENT,
    access_token VARCHAR(64) NOT NULL,
    expires_at BIGINT NOT NULL
);

CREATE TABLE users (
	id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(320) NOT NULL,	
    password CHAR(64) NOT NULL,
    rights SET('r', 'w', 'c') NOT NULL,
    ban_type SET('r', 'w', 'c') DEFAULT NULL,
    ban_date TIMESTAMP DEFAULT NULL,
    ban_reason TEXT DEFAULT NULL
);

CREATE TABLE nations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    alias VARCHAR(20) NOT NULL,
    name VARCHAR(60) NOT NULL
);

CREATE TABLE tanks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tank_id INT NOT NULL,
    nation_id INT NOT NULL,
    alias VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    tier ENUM('I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X') NOT NULL,
    class ENUM('LT', 'MT', 'HT', 'TD', 'SPG') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (nation_id)
        REFERENCES nations (id)
        ON DELETE CASCADE
);

CREATE TABLE comments (
	id INT PRIMARY KEY AUTO_INCREMENT,
    parent_comment_id INT DEFAULT -1,
    is_deleted BOOL DEFAULT FALSE,
    user_id INT,
    tank_id INT NOT NULL,
    content MEDIUMTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)
		REFERENCES users (id)
        ON DELETE SET NULL,
	FOREIGN KEY (parent_comment_id)
		REFERENCES comments (id)
        ON DELETE SET NULL,
	FOREIGN KEY (tank_id)
		REFERENCES tanks (id)
        ON DELETE CASCADE
);

CREATE TABLE firepower (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tank_id INT NOT NULL,
    projectile_1_type ENUM('AP', 'APCR', 'HEAT', 'HE_STUN') NOT NULL,
    projectile_2_type ENUM('APCR', 'HEAT', 'HESH', 'AP', 'HE') NOT NULL,
    projectile_3_type ENUM('HE', 'AP', 'HESH'),
    projectile_1_dmg INT NOT NULL CHECK (projectile_1_dmg > 0),
    projectile_2_dmg INT NOT NULL CHECK (projectile_2_dmg > 0),
    projectile_3_dmg INT CHECK (projectile_3_dmg > 0),
    projectile_1_pen INT NOT NULL CHECK (projectile_1_pen > 0),
    projectile_2_pen INT NOT NULL CHECK (projectile_2_pen > 0),
    projectile_3_pen INT CHECK (projectile_3_pen > 0),
    projectile_1_velocity INT NOT NULL CHECK (projectile_1_velocity > 0),
    projectile_2_velocity INT NOT NULL CHECK (projectile_2_velocity > 0),
    projectile_3_velocity INT CHECK (projectile_3_velocity > 0),
    projectile_1_min_stun_duration FLOAT CHECK (projectile_1_min_stun_duration > 0),
    projectile_1_max_stun_duration FLOAT CHECK (projectile_1_max_stun_duration > 0),
    reload_time FLOAT NOT NULL CHECK (reload_time > 0),
    clip_size INT CHECK (clip_size > 1),
    burst_size INT CHECK (burst_size > 0),
    intra_clip_reload FLOAT CHECK (intra_clip_reload > 0),
    aim_time FLOAT NOT NULL CHECK (aim_time > 0),
    dispersion FLOAT NOT NULL CHECK (dispersion > 0),
    ammo_capacity INT NOT NULL CHECK (ammo_capacity > 0),
    FOREIGN KEY (tank_id)
        REFERENCES tanks (id)
        ON DELETE CASCADE
);

CREATE TABLE survivability (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tank_id INT NOT NULL,
    hp INT NOT NULL CHECK (hp > 0),
    hull_front_armor FLOAT NOT NULL CHECK (hull_front_armor > 0),
    hull_side_armor FLOAT NOT NULL CHECK (hull_side_armor > 0),
    hull_back_armor FLOAT NOT NULL CHECK (hull_back_armor > 0),
    turret_front_armor FLOAT CHECK (turret_front_armor > 0),
    turret_side_armor FLOAT CHECK (turret_side_armor > 0),
    turret_back_armor FLOAT CHECK (turret_back_armor > 0),
    suspension_repair_time FLOAT NOT NULL CHECK (suspension_repair_time > 0),
    stationary_camo FLOAT NOT NULL CHECK (stationary_camo > 0),
    stationary_camo_after_firing FLOAT NOT NULL CHECK (stationary_camo_after_firing > 0),
    movement_camo FLOAT NOT NULL CHECK (movement_camo > 0),
    movement_camo_after_firing FLOAT NOT NULL CHECK (movement_camo_after_firing > 0),
    FOREIGN KEY (tank_id)
        REFERENCES tanks (id)
        ON DELETE CASCADE
);

CREATE TABLE mobility (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tank_id INT NOT NULL,
    weight FLOAT NOT NULL CHECK (weight > 0),
    load_limit FLOAT NOT NULL CHECK (load_limit > 0),
    engine_hp FLOAT NOT NULL CHECK (engine_hp > 0),
    top_speed FLOAT NOT NULL CHECK (top_speed > 0),
    reverse_speed FLOAT NOT NULL CHECK (reverse_speed > 0),
    hull_traverse_speed FLOAT NOT NULL CHECK (hull_traverse_speed > 0),
    turret_traverse_speed FLOAT CHECK (turret_traverse_speed > 0),
    gun_elevation FLOAT NOT NULL CHECK (gun_elevation >= 0),
    gun_depression FLOAT NOT NULL CHECK (gun_depression >= 0),
    FOREIGN KEY (tank_id)
        REFERENCES tanks (id)
        ON DELETE CASCADE
);

CREATE TABLE spotting (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tank_id INT NOT NULL,
    view_range FLOAT NOT NULL CHECK (view_range > 0),
    radio_range FLOAT NOT NULL CHECK (radio_range > 0),
    FOREIGN KEY (tank_id)
        REFERENCES tanks (id)
        ON DELETE CASCADE
);

INSERT INTO wgapi (access_token, expires_at) VALUES
    ('77d8b62ca62cd02efd13d8965e279e7fac5d5700', '1712499596');

INSERT INTO nations (alias, name) VALUES
	('ussr', 'Union of Soviet Socialist Republics'),
    ('usa', 'United States of America'),
    ('uk', 'United Kingdom'),
    ('france', 'France'),
    ('germany', 'Germany');

INSERT INTO tanks (tank_id, nation_id, alias, name, tier, class) VALUES
	(7169, (SELECT id FROM nations WHERE alias = 'ussr'), 'is-7', 'IS-7', 'X', 'HT'),
	(9505, (SELECT id FROM nations WHERE alias = 'usa'), 'm103', 'M103', 'IX', 'HT'),
	(5969, (SELECT id FROM nations WHERE alias = 'uk'), 'cent-1', 'Centurion Mk. I', 'VIII', 'MT'),
	(2625, (SELECT id FROM nations WHERE alias = 'france'), 'arl-44', 'ARL 44', 'VI', 'HT'),
	(7953, (SELECT id FROM nations WHERE alias = 'germany'), 'jagdtiger', 'Jagdtiger', 'IX', 'TD'),
	(8449, (SELECT id FROM nations WHERE alias = 'ussr'), '212a', '212A', 'IX', 'SPG'),
	(7457, (SELECT id FROM nations WHERE alias = 'usa'), 'm4043', 'M40/M43', 'VIII', 'SPG'),
	(13345, (SELECT id FROM nations WHERE alias = 'usa'), 't26e4', 'T26E4 SuperPershing', 'VIII', 'MT'),
	(14673, (SELECT id FROM nations WHERE alias = 'uk'), 'charioteer', 'Charioteer', 'VIII', 'TD'),
	(5185, (SELECT id FROM nations WHERE alias = 'france'), 'amx-13-75', 'AMX 13 75', 'VII', 'LT'),
	(5137, (SELECT id FROM nations WHERE alias = 'germany'), 'tiger-2', 'Tiger II', 'VIII', 'HT'),
	(2305, (SELECT id FROM nations WHERE alias = 'ussr'), 'su-152', 'SU-152', 'VII', 'TD'),
	(9761, (SELECT id FROM nations WHERE alias = 'usa'), 'chaffee', 'M24 Chaffee', 'V', 'LT'),
	(1105, (SELECT id FROM nations WHERE alias = 'uk'), 'cromwell', 'Cromwell', 'VI', 'MT'),
	(2881, (SELECT id FROM nations WHERE alias = 'france'), 'amx-40', 'AMX 40', 'IV', 'LT'),
	(1041, (SELECT id FROM nations WHERE alias = 'germany'), 'stug-3-g', 'StuG III Ausf. G', 'V', 'TD'),
	(10497, (SELECT id FROM nations WHERE alias = 'ussr'), 'kv-2', 'KV-2', 'VI', 'HT'),
	(13905, (SELECT id FROM nations WHERE alias = 'uk'), 'fv4005', 'FV4005 Stage II', 'X', 'TD'),
	(15425, (SELECT id FROM nations WHERE alias = 'france'), 'amx-30-b', 'AMX 30 B', 'X', 'MT'),
	(6161, (SELECT id FROM nations WHERE alias = 'germany'), 'luchs', 'Pz.Kpfw. II Luchs', 'IV', 'LT');

INSERT INTO firepower VALUES
	(NULL, (SELECT id FROM tanks WHERE name = 'AMX 40'), 'AP', 'HEAT', 'HE', 110, 110, 175, 74, 92, 38, 600, 480, 600, NULL, NULL, 5.94, NULL, NULL, NULL, 2.4, 0.44, 105),
    (NULL, (SELECT id FROM tanks WHERE name = 'StuG III Ausf. G'), 'AP', 'APCR', 'HE', 135, 135, 175, 150, 194, 38, 925, 1156, 925, NULL, NULL, 4.31, NULL, NULL, NULL, 1.63, 0.32, 44),
    (NULL, (SELECT id FROM tanks WHERE name = 'KV-2'), 'AP', 'AP', 'HE', 700, 700, 910, 110, 136, 86, 525, 525, 525, NULL, NULL, 23.01, NULL, NULL, NULL, 3.64, 0.58, 36),
    (NULL, (SELECT id FROM tanks WHERE name = 'FV4005 Stage II'), 'AP', 'HESH', 'HE', 1150, 1750, 1750, 310, 230, 92, 830, 830, 830, NULL, NULL, 28.76, NULL, NULL, NULL, 3.55, 0.4, 20),
    (NULL, (SELECT id FROM tanks WHERE name = 'AMX 30 B'), 'APCR', 'HEAT', 'HE', 390, 390, 480, 248, 300, 53, 1100, 800, 700, NULL, NULL, 7.48, NULL, NULL, NULL, 1.92, 0.35, 50),
    (NULL, (SELECT id FROM tanks WHERE name = 'Pz.Kpfw. II Luchs'), 'AP', 'APCR', 'HE', 30, 30, 40, 95, 110, 15, 940, 960, 940, NULL, NULL, 17.26, 10, 2, 959.6, 2.2, 0.5, 420),
    (NULL, (SELECT id FROM tanks WHERE name = 'AMX 13 75'), 'AP', 'APCR', 'HE', 135, 135, 175, 144, 202, 38, 1000, 1250, 1000, NULL, NULL, 13.71, 4, 1, 2, 1.92, 0.36, 36),
    (NULL, (SELECT id FROM tanks WHERE name = 'Tiger II'), 'AP', 'APCR', 'HE', 360, 360, 440, 225, 285, 60, 1100, 1375, 1100, NULL, NULL, 9.97, NULL, NULL, NULL, 2.4, 0.3, 42),
    (NULL, (SELECT id FROM tanks WHERE name = 'SU-152'), 'AP', 'HEAT', 'HE', 700, 700, 910, 135, 250, 86, 600, 750, 600, NULL, NULL, 16.97, NULL, NULL, NULL, 3.26, 0.48, 26),
    (NULL, (SELECT id FROM tanks WHERE name = 'M24 Chaffee'), 'AP', 'APCR', 'HE', 110, 110, 175, 96, 143, 38, 619, 869, 604, NULL, NULL, 4.22, NULL, NULL, NULL, 1.53, 0.42, 60),
    (NULL, (SELECT id FROM tanks WHERE name = 'Cromwell'), 'AP', 'APCR', 'HE', 135, 135, 175, 145, 202, 38, 785, 981, 785, NULL, NULL, 3.74, NULL, NULL, NULL, 2.21, 0.35, 75),
    (NULL, (SELECT id FROM tanks WHERE name = 'ARL 44'), 'AP', 'APCR', 'HE', 240, 240, 320, 212, 259, 45, 1000, 1250, 1000, NULL, NULL, 9.59, NULL, NULL, NULL, 3.26, 0.36, 50),
    (NULL, (SELECT id FROM tanks WHERE name = 'Jagdtiger'), 'AP', 'APCR', 'HE', 560, 560, 700, 276, 352, 65, 1200, 1500, 1200, NULL, NULL, 10.93, NULL, NULL, NULL, 2.21, 0.32, 36),
    (NULL, (SELECT id FROM tanks WHERE name = '212A'), 'HE_STUN', 'HE', 'AP', 900, 1200, 600, 52, 65, 258, 425, 455, 510, 12.6, 28, 37.39, NULL, NULL, NULL, 4.99, 0.72, 40),
    (NULL, (SELECT id FROM tanks WHERE name = 'Charioteer'), 'APCR', 'HESH', 'HESH', 390, 480, 480, 268, 210, 105, 1478, 1173, 1173, NULL, NULL, 9.68, NULL, NULL, NULL, 2.35, 0.34, 30),
    (NULL, (SELECT id FROM tanks WHERE name = 'Centurion Mk. I'), 'AP', 'APCR', 'HE', 230, 230, 280, 226, 258, 42, 1020, 1275, 1020, NULL, NULL, 7.19, NULL, NULL, NULL, 2.21, 0.32, 65),
    (NULL, (SELECT id FROM tanks WHERE name = 'M40/M43'), 'HE_STUN', 'HE', 'AP', 900, 1100, 600, 52, 65, 272, 440, 471, 528, 12.6, 28, 44.1, NULL, NULL, NULL, 5.08, 0.74, 16),
    (NULL, (SELECT id FROM tanks WHERE name = 'T26E4 SuperPershing'), 'AP', 'APCR', 'HE', 240, 240, 320, 202, 258, 45, 975, 1219, 975, NULL, NULL, 7.67, NULL, NULL, NULL, 2.21, 0.36, 54),
    (NULL, (SELECT id FROM tanks WHERE name = 'M103'), 'AP', 'HEAT', 'HE', 400, 400, 515, 258, 340, 60, 1067, 1067, 1067, NULL, NULL, 9.59, NULL, NULL, NULL, 2.21, 0.35, 45),
    (NULL, (SELECT id FROM tanks WHERE name = 'IS-7'), 'AP', 'APCR', 'HE', 490, 490, 640, 250, 303, 68, 900, 1125, 900, NULL, NULL, 13.14, NULL, NULL, NULL, 2.78, 0.38, 30);

INSERT INTO survivability VALUES
	(NULL, (SELECT id FROM tanks WHERE name = 'AMX 40'), 400, 70, 65, 40, 80, 60, 60, 12.03, 13.19, 3.43, 9.89, 2.57),
    (NULL, (SELECT id FROM tanks WHERE name = 'StuG III Ausf. G'), 460, 80, 30, 50, NULL, NULL, NULL, 12.03, 21.89, 5.41, 13.11, 3.24),
    (NULL, (SELECT id FROM tanks WHERE name = 'KV-2'), 960, 75, 75, 70, 75, 75, 70, 12.03, 4.05, 0.61, 2.02, 0.3),
    (NULL, (SELECT id FROM tanks WHERE name = 'FV4005 Stage II'), 1850, 76.2, 50.8, 38.1, 14, 14, 14, 12.03, 1.37, 0.16, 0.85, 0.1),
    (NULL, (SELECT id FROM tanks WHERE name = 'AMX 30 B'), 1900, 80, 35, 30, 150, 40, 30, 12.03, 15.28, 3.19, 11.46, 2.39),
    (NULL, (SELECT id FROM tanks WHERE name = 'Pz.Kpfw. II Luchs'), 520, 30, 20, 20, 50, 30, 30, 10.03, 17.07, 3.58, 17.07, 3.58),
    (NULL, (SELECT id FROM tanks WHERE name = 'AMX 13 75'), 850, 50, 20, 15, 40, 20, 20, 10.03, 17.67, 4.13, 17.67, 4.13),
    (NULL, (SELECT id FROM tanks WHERE name = 'Tiger II'), 1600, 160, 80, 80, 245, 120, 80, 12.03, 4.27, 0.85, 2.17, 0.43),
    (NULL, (SELECT id FROM tanks WHERE name = 'SU-152'), 870, 75, 60, 60, NULL, NULL, NULL, 12.03, 16.47, 2.36, 9.86, 1.41),
    (NULL, (SELECT id FROM tanks WHERE name = 'M24 Chaffee'), 550, 25.4, 25.4, 19.1, 38.1, 25.4, 25.4, 12.03, 15.68, 3.87, 15.68, 3.87),
    (NULL, (SELECT id FROM tanks WHERE name = 'Cromwell'), 840, 63.5, 42.9, 31.8, 76.2, 63.5, 57.2, 12.03, 14.42, 3.56, 10.83, 2.68),
    (NULL, (SELECT id FROM tanks WHERE name = 'ARL 44'), 920, 120, 60, 40, 110, 30, 30, 12.03, 5.24, 1.18, 2.62, 0.59),
    (NULL, (SELECT id FROM tanks WHERE name = 'Jagdtiger'), 2100, 250, 80, 80, NULL, NULL, NULL, 12.03, 10.66, 1.73, 6.38, 1.03),
    (NULL, (SELECT id FROM tanks WHERE name = '212A'), 460, 60, 60, 60, NULL, NULL, NULL, 12.96, 3.48, 0.3, 1.71, 0.15),
    (NULL, (SELECT id FROM tanks WHERE name = 'Charioteer'), 1050, 63.5, 46, 38.1, 30, 25, 30, 12.03, 17.44, 3.65, 10.49, 2.19),
    (NULL, (SELECT id FROM tanks WHERE name = 'Centurion Mk. I'), 1450, 76.2, 50.8, 38.1, 254, 88.9, 88.9, 10.03, 10.99, 2.62, 8.28, 1.97),
    (NULL, (SELECT id FROM tanks WHERE name = 'M40/M43'), 400, 108, 12.7, 12.7, NULL, NULL, NULL, 12.44, 10.54, 0.91, 5.3, 0.46),
    (NULL, (SELECT id FROM tanks WHERE name = 'T26E4 SuperPershing'), 1500, 101.6, 76.2, 50.8, 101.6, 76.2, 76.2, 10.03, 13.17, 2.96, 9.86, 2.22),
    (NULL, (SELECT id FROM tanks WHERE name = 'M103'), 1950, 228.6, 44.5, 44.5, 254, 99.1, 53.3, 12.03, 4.62, 0.83, 2.34, 0.42),
    (NULL, (SELECT id FROM tanks WHERE name = 'IS-7'), 2400, 150, 150, 100, 240, 185, 94, 12.03, 6.61, 1.01, 3.31, 0.51);

INSERT INTO mobility VALUES
	(NULL, (SELECT id FROM tanks WHERE name = 'AMX 40'), 21.86, 25.23, 200.88, 50, 20, 31.29, 27.12, 17, 7),
    (NULL, (SELECT id FROM tanks WHERE name = 'StuG III Ausf. G'), 23.56, 25.69, 465.2, 40, 10, 49.02, 45.89, 20, 7),
    (NULL, (SELECT id FROM tanks WHERE name = 'KV-2'), 53.00, 60.8, 640, 35, 11, 20.86, 17.73, 12, 7),
    (NULL, (SELECT id FROM tanks WHERE name = 'FV4005 Stage II'), 51.01, 54.00, 850, 32, 8, 27.12, 16.69, 8, 10),
    (NULL, (SELECT id FROM tanks WHERE name = 'AMX 30 B'), 36.00, 38.00, 761.24, 65, 23, 50.06, 39.63, 20, 8),
    (NULL, (SELECT id FROM tanks WHERE name = 'Pz.Kpfw. II Luchs'), 12.92, 15.50, 380.62, 60, 22, 34.42, 38, 20, 10),
    (NULL, (SELECT id FROM tanks WHERE name = 'AMX 13 75'), 15.19, 16.35, 400, 61, 23, 43.81, 47.98, 9, 6),
    (NULL, (SELECT id FROM tanks WHERE name = 'Tiger II'), 70.94, 74.00, 740.1, 38, 12, 29.2, 28.16, 15, 8),
    (NULL, (SELECT id FROM tanks WHERE name = 'SU-152'), 45.73, 48.30, 634.37, 43, 11, 23.99, 27.12, 18, 6),
    (NULL, (SELECT id FROM tanks WHERE name = 'M24 Chaffee'), 18.39, 19.50, 500, 62, 21, 43.81, 45.89, 15, 10),
    (NULL, (SELECT id FROM tanks WHERE name = 'Cromwell'), 28.02, 29.50, 687.23, 64, 20, 37.55, 50.06, 15, 8),
    (NULL, (SELECT id FROM tanks WHERE name = 'ARL 44'), 47.18, 50.50, 792.96, 37, 10, 20.86, 22.95, 15, 10),
    (NULL, (SELECT id FROM tanks WHERE name = 'Jagdtiger'), 75.50, 79.00, 740.1, 38, 12, 27.12, 27.12, 15, 7.5),
    (NULL, (SELECT id FROM tanks WHERE name = '212A'), 54.49, 57.50, 898.69, 35, 10, 18.77, 12.52, 45, 1.2),
    (NULL, (SELECT id FROM tanks WHERE name = 'Charioteer'), 30.27, 32.50, 687.23, 52, 20, 37.55, 18.39, 12, 10),
    (NULL, (SELECT id FROM tanks WHERE name = 'Centurion Mk. I'), 44.91, 48.00, 792.96, 50, 20, 37.55, 37.55, 18, 10),
    (NULL, (SELECT id FROM tanks WHERE name = 'M40/M43'), 37.17, 39.50, 528.64, 38.6, 10, 22.95, 10.43, 55, 5),
    (NULL, (SELECT id FROM tanks WHERE name = 'T26E4 SuperPershing'), 50.45, 53.00, 720, 40.2, 18, 33.38, 31.29, 20, 10),
    (NULL, (SELECT id FROM tanks WHERE name = 'M103'), 56.68, 62.50, 909.26, 34, 12, 28.16, 27.12, 15, 8),
    (NULL, (SELECT id FROM tanks WHERE name = 'IS-7'), 68.19, 70.95, 1200, 59.6, 15, 29.2, 26.07, 18, 6);

INSERT INTO spotting VALUES
	(NULL, (SELECT id FROM tanks WHERE name = 'AMX 40'), 340, 360),
    (NULL, (SELECT id FROM tanks WHERE name = 'StuG III Ausf. G'), 310, 432.84),
    (NULL, (SELECT id FROM tanks WHERE name = 'KV-2'), 330, 458.92),
    (NULL, (SELECT id FROM tanks WHERE name = 'FV4005 Stage II'), 390, 750),
    (NULL, (SELECT id FROM tanks WHERE name = 'AMX 30 B'), 410, 782.25),
    (NULL, (SELECT id FROM tanks WHERE name = 'Pz.Kpfw. II Luchs'), 360, 474.56),
    (NULL, (SELECT id FROM tanks WHERE name = 'AMX 13 75'), 370, 750),
    (NULL, (SELECT id FROM tanks WHERE name = 'Tiger II'), 390, 740.53),
    (NULL, (SELECT id FROM tanks WHERE name = 'SU-152'), 330, 625),
    (NULL, (SELECT id FROM tanks WHERE name = 'M24 Chaffee'), 360, 777.03),
    (NULL, (SELECT id FROM tanks WHERE name = 'Cromwell'), 360, 573.65),
    (NULL, (SELECT id FROM tanks WHERE name = 'ARL 44'), 350, 782.25),
    (NULL, (SELECT id FROM tanks WHERE name = 'Jagdtiger'), 390, 740.53),
    (NULL, (SELECT id FROM tanks WHERE name = '212A'), 270, 651.88),
    (NULL, (SELECT id FROM tanks WHERE name = 'Charioteer'), 370, 730.1),
    (NULL, (SELECT id FROM tanks WHERE name = 'Centurion Mk. I'), 400, 782.25),
    (NULL, (SELECT id FROM tanks WHERE name = 'M40/M43'), 290, 782.25),
    (NULL, (SELECT id FROM tanks WHERE name = 'T26E4 SuperPershing'), 390, 777.03),
    (NULL, (SELECT id FROM tanks WHERE name = 'M103'), 390, 745),
    (NULL, (SELECT id FROM tanks WHERE name = 'IS-7'), 400, 750.96);