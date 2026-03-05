/*  ryf_celestin_and_sia_preston_queries.sql
    DBMS: MySQL 8
    Creates database + tables (DDL), inserts data (DML), and runs required queries.
*/

-- ============================================================
-- CREATE DATABASE
-- ============================================================
CREATE DATABASE IF NOT EXISTS ryf_celestin_and_sia_preston_db;
USE ryf_celestin_and_sia_preston_db;

-- ============================================================
-- TABLES
-- ============================================================

-- colleges
CREATE TABLE colleges (
    college_id  INT            NOT NULL AUTO_INCREMENT,
    name        VARCHAR(255)   NOT NULL,
    campus      VARCHAR(100)   NULL,
    type        VARCHAR(50)    NOT NULL,
    fscl        VARCHAR(8)     NULL,
    website_url VARCHAR(512)   NULL,
    CONSTRAINT pk_colleges PRIMARY KEY (college_id),
    -- Do NOT make fscl unique because UW Tacoma/Bothell share the same value in the provided data.
    CONSTRAINT uq_colleges_name_campus UNIQUE (name, campus)
);

-- location
CREATE TABLE location (
    college_id  INT           NOT NULL,
    street      VARCHAR(255)  NULL,
    city        VARCHAR(100)  NOT NULL,
    state       CHAR(2)       NOT NULL,
    postal_code VARCHAR(10)   NOT NULL,
    CONSTRAINT pk_location         PRIMARY KEY (college_id),
    CONSTRAINT fk_location_college FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

-- college_phones
CREATE TABLE college_phones (
    phone_number VARCHAR(20)   NOT NULL,
    phone_type   VARCHAR(50)   NULL,
    college_id   INT           NOT NULL,
    CONSTRAINT pk_college_phones          PRIMARY KEY (phone_number),
    CONSTRAINT fk_college_phones_college  FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

-- walkscore_stats
CREATE TABLE walkscore_stats (
    college_id INT NOT NULL,
    walk       INT NULL,
    transit    INT NULL,
    bike       INT NULL,
    CONSTRAINT pk_walkscore_stats   PRIMARY KEY (college_id),
    CONSTRAINT fk_walkscore_college FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_walk_range    CHECK (walk    IS NULL OR walk    BETWEEN 0 AND 100),
    CONSTRAINT chk_transit_range CHECK (transit IS NULL OR transit BETWEEN 0 AND 100),
    CONSTRAINT chk_bike_range    CHECK (bike    IS NULL OR bike    BETWEEN 0 AND 100)
);

-- parking_permits
CREATE TABLE parking_permits (
    college_id INT             NOT NULL,
    permit     VARCHAR(100)    NOT NULL,
    cost       DECIMAL(8,2)    NOT NULL,
    rate       VARCHAR(50)     NULL,
    CONSTRAINT pk_parking_permits          PRIMARY KEY (college_id, permit),
    CONSTRAINT fk_parking_college          FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_parking_cost_nonneg     CHECK (cost >= 0)
);

-- housing
CREATE TABLE housing (
    college_id    INT           NOT NULL,
    building_name VARCHAR(255)  NOT NULL,
    address       VARCHAR(255)  NOT NULL,
    units         INT           NULL,
    is_on_campus  TINYINT(1)    NOT NULL DEFAULT 1,
    CONSTRAINT pk_housing           PRIMARY KEY (college_id, building_name, address),
    CONSTRAINT fk_housing_college   FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_units_nonneg     CHECK (units IS NULL OR units >= 0),
    CONSTRAINT chk_is_on_campus_bit CHECK (is_on_campus IN (0,1))
);

-- admission_statistics
CREATE TABLE admission_statistics (
    college_id            INT           NOT NULL,
    year                  INT           NOT NULL,
    applications_received INT           NULL,
    applications_admitted INT           NULL,
    CONSTRAINT pk_admission_statistics      PRIMARY KEY (college_id, year),
    CONSTRAINT fk_admission_college         FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_admission_year_pos       CHECK (year > 0),
    CONSTRAINT chk_apps_received_pos        CHECK (applications_received IS NULL OR applications_received > 0),
    CONSTRAINT chk_apps_admitted_pos        CHECK (applications_admitted  IS NULL OR applications_admitted  > 0),
    CONSTRAINT chk_admitted_lte_received    CHECK (
        applications_admitted IS NULL OR
        applications_received IS NULL OR
        applications_admitted <= applications_received
    )
);

-- expenses
CREATE TABLE expenses (
    college_id           INT           NOT NULL,
    year                 SMALLINT      NOT NULL,
    resident_tuition     DECIMAL(10,2) NOT NULL,
    nonresident_tuition  DECIMAL(10,2) NOT NULL,
    books_supplies       DECIMAL(10,2) NULL,
    CONSTRAINT pk_expenses                 PRIMARY KEY (college_id, year),
    CONSTRAINT fk_expenses_college         FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_expenses_year_pos       CHECK (year > 0),
    CONSTRAINT chk_resident_tuition_nonneg CHECK (resident_tuition >= 0),
    CONSTRAINT chk_nonresident_tuition_nonneg CHECK (nonresident_tuition >= 0),
    CONSTRAINT chk_books_supplies_nonneg   CHECK (books_supplies IS NULL OR books_supplies >= 0)
);

-- ethnicities
CREATE TABLE ethnicities (
    college_id       INT              NOT NULL,
    year             INT              NOT NULL,
    ethnicity        VARCHAR(100)     NOT NULL,
    percent_enrolled DECIMAL(5,2)     NOT NULL,
    CONSTRAINT pk_ethnicities           PRIMARY KEY (college_id, year, ethnicity),
    CONSTRAINT fk_ethnicities_college   FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_ethnicity_pct_range  CHECK (percent_enrolled BETWEEN 0 AND 100)
);

-- gender
CREATE TABLE gender (
    college_id       INT              NOT NULL,
    year             SMALLINT         NOT NULL,
    gender           VARCHAR(50)      NOT NULL,
    percent_enrolled DECIMAL(5,2)     NOT NULL,
    CONSTRAINT pk_gender              PRIMARY KEY (college_id, year, gender),
    CONSTRAINT fk_gender_college      FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_gender_pct_range   CHECK (percent_enrolled BETWEEN 0 AND 100)
);

-- scholarships
CREATE TABLE scholarships (
    college_id            INT            NOT NULL,
    scholarship_name      VARCHAR(255)   NOT NULL,
    avg_awards            DECIMAL(10,2)  NULL,
    residency_requirement VARCHAR(100)   NULL,
    type                  VARCHAR(100)   NULL,
    deadline              DATE           NULL,
    CONSTRAINT pk_scholarships            PRIMARY KEY (college_id, scholarship_name),
    CONSTRAINT fk_scholarships_college    FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_scholarship_avg_nonneg CHECK (avg_awards IS NULL OR avg_awards >= 0)
);

-- greek_organizations
CREATE TABLE greek_organizations (
    college_id INT           NOT NULL,
    name       VARCHAR(255)  NOT NULL,
    org_type   VARCHAR(100)  NULL,
    CONSTRAINT pk_greek_organizations     PRIMARY KEY (college_id, name),
    CONSTRAINT fk_greek_org_college       FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

-- sports
CREATE TABLE sports (
    sport_name VARCHAR(100)  NOT NULL,
    gender     VARCHAR(50)   NOT NULL,
    CONSTRAINT pk_sports PRIMARY KEY (sport_name, gender)
);

-- college_conference
CREATE TABLE college_conference (
    college_id          INT           NOT NULL,
    athletic_conference VARCHAR(255)  NULL,
    division            VARCHAR(100)  NULL,
    CONSTRAINT pk_college_conference           PRIMARY KEY (college_id),
    CONSTRAINT fk_college_conference_college   FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

-- college_sports
CREATE TABLE college_sports (
    college_id INT           NOT NULL,
    sport_name VARCHAR(100)  NOT NULL,
    gender     VARCHAR(50)   NOT NULL,
    CONSTRAINT pk_college_sports           PRIMARY KEY (college_id, sport_name, gender),
    CONSTRAINT fk_college_sports_college   FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_college_sports_sport     FOREIGN KEY (sport_name, gender)
        REFERENCES sports (sport_name, gender)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

-- departments
CREATE TABLE departments (
    college_id      INT           NOT NULL,
    department_id   INT           NOT NULL,
    department_name VARCHAR(255)  NOT NULL,
    CONSTRAINT pk_departments         PRIMARY KEY (college_id, department_id),
    CONSTRAINT fk_departments_college FOREIGN KEY (college_id)
        REFERENCES colleges (college_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

-- faculty
CREATE TABLE faculty (
    email         VARCHAR(255)  NOT NULL,
    first_name    VARCHAR(100)  NOT NULL,
    last_name     VARCHAR(100)  NOT NULL,
    teaching_year INT           NULL,
    phone_number  VARCHAR(20)   NULL,
    college_id    INT           NOT NULL,
    department_id INT           NOT NULL,
    CONSTRAINT pk_faculty               PRIMARY KEY (email),
    CONSTRAINT fk_faculty_department    FOREIGN KEY (college_id, department_id)
        REFERENCES departments (college_id, department_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

-- programs
CREATE TABLE programs (
    college_id    INT           NOT NULL,
    department_id INT           NOT NULL,
    program_id    INT           NOT NULL,
    name          VARCHAR(255)  NOT NULL,
    degree        VARCHAR(100)  NULL,
    type          VARCHAR(100)  NULL,
    length        VARCHAR(50)   NULL,
    CONSTRAINT pk_programs             PRIMARY KEY (college_id, department_id, program_id),
    CONSTRAINT fk_programs_department  FOREIGN KEY (college_id, department_id)
        REFERENCES departments (college_id, department_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

-- ============================================================
-- INSERTS (provided data; duplicates handled for sports)
-- ============================================================

-- -----------------------
-- UW Seattle
-- -----------------------
INSERT IGNORE INTO sports (sport_name, gender) VALUES
('Baseball','Mens'),
('Basketball','Mens'),
('Football','Mens'),
('Golf','Mens'),
('Rowing','Mens'),
('Soccer','Mens'),
('Tennis','Mens'),
('Basketball','Womens'),
('Beach Volleyball', 'Womens'),
('Cross Country','Womens'),
('Golf','Womens'),
('Rowing','Womens'),
('Soccer','Womens'),
('Softball','Womens'),
('Tennis','Womens'),
('Volleyball','Womens');

INSERT INTO colleges (college_id, name, campus, type, fscl, website_url)
VALUES (3, 'University of Washington', 'Seattle', '4-year', '003798', 'https://www.washington.edu/');

INSERT INTO location (college_id, street, city, state, postal_code)
VALUES (3, '1410 NE Campus Parkway', 'Seattle', 'WA', '98195-5852');

INSERT INTO college_phones (phone_number, phone_type, college_id) VALUES
('(206) 543-2100', 'Main', 3),
('(206) 685-8973', 'UW Police (Non-emergency)', 3),
('(206) 543-9686', 'Admissions', 3);

INSERT INTO parking_permits (college_id, permit, cost, rate) VALUES
(3, 'Single Occupancy Vehicle (SOV)', 615.60, 'Quarterly'),
(3, 'Value Parking (E18)', 492.00, 'Quarterly'),
(3, 'Visitor Daily', 21.00, 'Daily');

INSERT INTO walkscore_stats (college_id, walk, transit, bike)
VALUES (3, 97, 83, 77);

INSERT INTO housing (college_id, building_name, address, units, is_on_campus)
VALUES (3, 'Lander Hall', '1201 NE Campus Parkway, Seattle, WA 98105', NULL, 1);

INSERT INTO college_conference (college_id, athletic_conference, division)
VALUES (3, 'Big Ten Conference', 'NCAA Division I');

INSERT INTO departments (college_id, department_id, department_name) VALUES
(3, 1, 'Department of Political Science'),
(3, 2, 'Department of Atmospheric Sciences'),
(3, 3, 'Evans School of Public Policy & Governance'),
(3, 4, 'Department of Economics'),
(3, 5, 'Department of Psychology');

INSERT INTO programs (college_id, department_id, program_id, name, degree, type, length) VALUES
(3, 1, 1, 'Political Science', 'Bachelors', NULL, NULL),
(3, 2, 1, 'Atmospheric Sciences', 'Bachelors', NULL, NULL),
(3, 3, 1, 'Public Administration', 'Masters', NULL, NULL),
(3, 4, 1, 'Economics', 'Bachelors', NULL, NULL),
(3, 5, 1, 'Psychology', 'Bachelors', NULL, NULL);

INSERT INTO faculty (email, first_name, last_name, teaching_year, phone_number, college_id, department_id) VALUES
('mahuvia@uw.edu', 'Mika', 'Ahuvia', NULL, '206-685-0891', 3, 2),
('bitz@uw.edu', 'Cecilia', 'Bitz', NULL, '206-543-1339', 3, 2),
('shuyic@uw.edu', 'Shuyi', 'Chen', NULL, '206-685-1736', 3, 2),
('sallard@uw.edu', 'Scott', 'Allard', NULL, '206-221-4872', 3, 3),
('jvigdor@uw.edu', 'Jacob', 'Vigdor', NULL, '206-616-4436', 3, 3),
('sturn@uw.edu', 'Stephen', 'Turnovsky', NULL, '206-685-8028', 3, 4),
('scheryan@uw.edu', 'Sapna', 'Cheryan', NULL, '206-543-5688', 3, 5);

INSERT INTO expenses (college_id, year, resident_tuition, nonresident_tuition, books_supplies)
VALUES (3, 2026, 13406.00, 44640.00, 900.00);

INSERT INTO ethnicities (college_id, year, ethnicity, percent_enrolled) VALUES
(3, 2026, 'White', 33.00),
(3, 2026, 'Asian', 23.00),
(3, 2026, 'International', 12.00),
(3, 2026, 'Hispanic/Latino', 10.00),
(3, 2026, 'Two or More Races', 7.00),
(3, 2026, 'Not Indicated', 7.00),
(3, 2026, 'Black/African American', 5.00),
(3, 2026, 'American Indian/Alaska Native', 0.00),
(3, 2026, 'Native Hawaiian/Pacific Islander', 0.00);

-- -----------------------
-- UW Bothell
-- -----------------------
INSERT INTO colleges (college_id, name, campus, type, fscl, website_url)
VALUES (2, 'University of Washington', 'Bothell', '4-year', '003798', 'https://www.uwb.edu/');

INSERT INTO location (college_id, street, city, state, postal_code)
VALUES (2, '18115 Campus Way NE', 'Bothell', 'WA', '98011-8246');

INSERT INTO college_phones (phone_number, phone_type, college_id) VALUES
('425-352-5000', 'Main / Welcome Desk', 2),
('425-352-5359', 'Campus Safety (Non-emergency)', 2),
('425-352-3333', 'Hotline / Campus Status', 2);

INSERT INTO parking_permits (college_id, permit, cost, rate) VALUES
(2, 'Resident Quarterly Permit', 278.00, 'Quarterly'),
(2, 'Resident Academic Annual Permit', 834.00, 'Academic Annual'),
(2, 'Quarterly Permit', 232.00, 'Quarterly'),
(2, 'Motorcycle Quarterly Permit', 89.00, 'Quarterly');

INSERT INTO walkscore_stats (college_id, walk, transit, bike)
VALUES (2, 37, 52, 67);

INSERT INTO housing (college_id, building_name, address, units, is_on_campus)
VALUES (2, 'Residential Village', '18612 Beardslee Blvd', NULL, 1);

INSERT INTO departments (college_id, department_id, department_name) VALUES
(2, 1, 'School of Business'),
(2, 2, 'School of Educational Studies'),
(2, 3, 'School of Interdisciplinary Arts & Sciences'),
(2, 4, 'School of Nursing & Health Studies'),
(2, 5, 'School of Science, Technology, Engineering & Mathematics');

INSERT INTO programs (college_id, department_id, program_id, name, degree, type, length) VALUES
(2, 1, 1, 'Business Administration', 'Bachelors', 'Arts', NULL),
(2, 3, 1, 'Health Studies', 'Bachelors', 'Arts', NULL),
(2, 4, 1, 'Nursing', 'Bachelors', 'Science', NULL),
(2, 5, 1, 'Computer Science & Software Engineering', 'Bachelors', 'Science', NULL),
(2, 5, 2, 'Mechanical Engineering', 'Bachelors', 'Science', NULL);

INSERT INTO faculty (email, first_name, last_name, teaching_year, phone_number, college_id, department_id) VALUES
('haintab@uw.edu',   'Hrair',      'Aintablian',   NULL, '425-352-5120', 2, 5),
('mrani@uw.edu',     'Mahmoud',    'Ghofrani',     NULL, '425-352-3224', 2, 5),
('JMcLoud@uw.edu',   'Jennifer',   'McLoud-Mann',  NULL, '425-352-3475', 2, 5),
('rejoicem@uw.edu',  'Rejoice',    'Akapame',      NULL, '425-352-3204', 2, 5),
('mloreto@uw.edu',   'Milagros',   'Loreto',       NULL, '425-352-5074', 2, 5),
('emilyg27@uw.edu',  'Emily',      'Gismervig',    NULL, '425-352-5097', 2, 5),
('schoi5@uw.edu',    'Seungkeun',  'Choi',         NULL, '425-352-5437', 2, 5),
('swcollin@uw.edu',  'Steven',     'Collins',      NULL, '425-352-5356', 2, 5);

INSERT INTO expenses (college_id, year, resident_tuition, nonresident_tuition, books_supplies)
VALUES (2, 2026, 13472.00, 44706.00, 900.00);

INSERT INTO ethnicities (college_id, year, ethnicity, percent_enrolled) VALUES
(2, 2026, 'Asian', 32.00),
(2, 2026, 'Black or African American', 10.00),
(2, 2026, 'Hispanic or Latino', 11.00),
(2, 2026, 'International (student visa)', 4.00),
(2, 2026, 'Two or more races', 7.00),
(2, 2026, 'White', 28.00),
(2, 2026, 'Not indicated', 7.00);

-- -----------------------
-- UW Tacoma
-- -----------------------

INSERT INTO colleges (college_id, name, campus, type, fscl, website_url)
VALUES (1, 'University of Washington', 'Tacoma', '4-year', '003798', 'https://tacoma.uw.edu/');

INSERT INTO location (college_id, street, city, state, postal_code)
VALUES (1, '1900 Commerce Street', 'Tacoma', 'WA', '98402');

INSERT INTO college_phones (phone_number, phone_type, college_id) VALUES
('(253) 692-4000', 'Main', 1),
('(253) 692-4416', 'Campus Safety', 1);

INSERT INTO parking_permits (college_id, permit, cost, rate) VALUES
(1, 'Court 17', 250.00, 'Quarterly'),
(1, 'Whitney', 168.00, 'Quarterly');

INSERT INTO walkscore_stats (college_id, walk, transit, bike)
VALUES (1, 84, NULL, 62);

INSERT INTO housing (college_id, building_name, address, units, is_on_campus)
VALUES (1, 'Court 17', '1717 Market Street', 128, 1);

INSERT INTO departments (college_id, department_id, department_name) VALUES
(1, 1, 'School of Engineering and Technology'),
(1, 2, 'Milgard School of Business'),
(1, 3, 'School of Interdisciplinary Arts and Sciences');

INSERT INTO programs (college_id, department_id, program_id, name, degree, type, length) VALUES
(1, 1, 1, 'Computer Science', 'Bachelors', 'Science', NULL),
(1, 2, 1, 'Business Administration', 'Bachelors', 'Arts', NULL);

INSERT INTO faculty (email, first_name, last_name, teaching_year, phone_number, college_id, department_id) VALUES
('mmuppa@uw.edu','Menaka','Abraham',NULL,'253-692-4520',1,1),
('jhahn01@uw.edu','Ji-Hyun','Ahn',NULL,'253-692-5925',1,3),
('ealmasri@uw.edu','Eyhab','Al-Masri',NULL,'253-692-4721',1,1),
('alcaide@uw.edu','Loly','Alcaide Ramirez',NULL,'253-692-4791',1,3),
('mhali@uw.edu','Mohamed','Ali',NULL,'253-692-4766',1,1),
('almeidan@uw.edu','Nara','Almeida',NULL,NULL,1,1),
('k3a2@uw.edu','Kevin','Anderson',NULL,'253-692-5860',1,1),
('arnoldg@uw.edu','Gregg','Arnold',NULL,'253-692-5732',1,2),
('arnoldl@uw.edu','Lorne','Arnold',NULL,'253-692-4839',1,1),
('aartman@uw.edu','Aaron','Artman',NULL,NULL,1,2),
('asdemir@uw.edu','Ozer','Asdemir',NULL,NULL,1,2),
('tmaspin@uw.edu','Toni','Aspin',NULL,NULL,1,2),
('datwood@uw.edu','Derek','Atwood',NULL,'253-692-5860',1,1),
('yanb@uw.edu','Yan','Bai',NULL,'253-692-5863',1,1),
('baiocchi@uw.edu','Orlando','Baiocchi',NULL,'253-692-4727',1,1),
('jebaker@uw.edu','Joel','Baker',NULL,'253-254-7030',1,1),
('mtbbw@uw.edu','Maria-Tania','Bandes Becerra Weingarden',NULL,'253-692-5841',1,3),
('pbarreto@uw.edu','Paulo','Barreto',NULL,'253-692-4539',1,1),
('zib@uw.edu','Zoe','Barsness',NULL,'253-692-5884',1,2),
('ebayer05@uw.edu','Ellen','Bayer',NULL,'253-692-5663',1,3),
('beaufort@uw.edu','Anne','Beaufort',NULL,NULL,1,3),
('bendop@uw.edu','Patrick','Bendon',NULL,NULL,1,2),
('Db84@uw.edu','Dean','Bennion',NULL,NULL,1,2),
('mwb4@uw.edu','Margo','Bergman',NULL,NULL,1,2),
('biersack@uw.edu','Greg','Biersack',NULL,'253-692-5732',1,2),
('nblair@uw.edu','Nicole','Blair',NULL,'253-692-4786',1,3);

INSERT INTO scholarships (college_id, scholarship_name, avg_awards, residency_requirement, type, deadline) VALUES
(1, 'Dressel Scholars Program', NULL, NULL, NULL, '2026-03-27'),
(1, 'UW Tacoma General Scholarship Application', NULL, 'resident', NULL, NULL),
(1, 'First-Year Merit Scholarship', NULL, 'resident', 'merit', '2026-01-15');

INSERT INTO admission_statistics (college_id, year, applications_received, applications_admitted)
VALUES (1, 2025, 3161, 2662);

INSERT INTO expenses (college_id, year, resident_tuition, nonresident_tuition, books_supplies)
VALUES (1, 2025, 13581.00, 45111.00, 900.00);

INSERT INTO ethnicities (college_id, year, ethnicity, percent_enrolled) VALUES
(1, 2025, 'White', 38.40),
(1, 2025, 'Asian', 20.90),
(1, 2025, 'Hispanic', 15.80),
(1, 2025, 'Black', 9.30),
(1, 2025, 'International', 2.30),
(1, 2025, 'Native Hawaiian or Pacific Islander', 1.20);

INSERT INTO gender (college_id, year, gender, percent_enrolled) VALUES
(1, 2025, 'Female', 51.70),
(1, 2025, 'Male', 48.30);

-- ============================================================
-- QUERIES: 7 SCENARIOS
-- ============================================================

-- 1) Find colleges in a particular area and see what programs are available
-- e.g. colleges and their programs in Washington but NOT in Seattle
SELECT colleges.name, campus, programs.name, degree, programs.type, city, state
FROM colleges, programs, location
WHERE programs.college_id = location.college_id AND colleges.college_id = programs.college_id
AND location.state='WA' AND location.city <> 'Seattle';

-- 2) Search for a college with a particular program or offering
-- such as computer-related majors
SELECT c.name, c.campus, c.type, p.name, p.degree, p.type
FROM colleges c, programs p
WHERE c.college_id = p.college_id
AND p.name like '%Computer%';

-- 3) Find parking permits for a college under a max cost
SELECT pp.permit, pp.cost, pp.rate
FROM parking_permits pp
WHERE pp.college_id = 2 AND pp.cost <= 300.00
ORDER BY pp.cost ASC, pp.permit;

-- 4) List housing options for a college (on-campus first)
SELECT h.building_name, h.address, h.units, h.is_on_campus
FROM housing h
WHERE h.college_id = 2
ORDER BY h.is_on_campus DESC, h.building_name;

-- 5) List departments (schools) for a college
SELECT d.department_id, d.department_name
FROM departments d
WHERE d.college_id = 2
ORDER BY d.department_id;

-- 6) List programs for a department (with basic filters)
SELECT p.program_id, p.name, p.degree, p.type, p.length
FROM programs p
WHERE p.college_id = 2
  AND p.department_id = 5
  AND (p.degree = 'Bachelors' OR p.degree IS NULL)
ORDER BY p.name;

-- 7) Search faculty by last name prefix and department (directory-style)
SELECT f.email, f.first_name, f.last_name, f.phone_number, f.teaching_year
FROM faculty f
WHERE f.college_id = 2
  AND f.department_id = 5
  AND f.last_name LIKE 'Ch%'
ORDER BY f.last_name, f.first_name;

-- ============================================================
-- QUERIES: 5 ANALYTICAL
-- ============================================================

-- A1) Acceptance rate trend by year (admitted/received)
SELECT a.college_id, c.name, c.campus, a.year,
       a.applications_received, a.applications_admitted,
       ROUND(100.0 * a.applications_admitted / NULLIF(a.applications_received, 0), 2) AS acceptance_rate_pct
FROM admission_statistics a
JOIN colleges c ON c.college_id = a.college_id
WHERE a.college_id = 1
ORDER BY a.year;

-- A2) Tuition gap (nonresident minus resident) by year for each college
SELECT e.college_id, c.name, c.campus, e.year,
       e.resident_tuition, e.nonresident_tuition,
       (e.nonresident_tuition - e.resident_tuition) AS tuition_gap
FROM expenses e
JOIN colleges c ON c.college_id = e.college_id
ORDER BY e.year DESC, tuition_gap DESC;

-- A3) Diversity composition: top ethnicities per college-year
SELECT x.college_id, c.name, c.campus, x.year, x.ethnicity, x.percent_enrolled
FROM ethnicities x
JOIN colleges c ON c.college_id = x.college_id
WHERE x.percent_enrolled IS NOT NULL
ORDER BY x.year DESC, x.college_id, x.percent_enrolled DESC;

-- A4) Gender distribution by college-year (pivot-ish)
SELECT g.college_id, c.name, c.campus, g.year,
       SUM(CASE WHEN g.gender = 'Female' THEN g.percent_enrolled ELSE 0 END) AS female_pct,
       SUM(CASE WHEN g.gender = 'Male'   THEN g.percent_enrolled ELSE 0 END) AS male_pct,
       SUM(CASE WHEN g.gender NOT IN ('Female','Male') THEN g.percent_enrolled ELSE 0 END) AS other_pct
FROM gender g
JOIN colleges c ON c.college_id = g.college_id
GROUP BY g.college_id, c.name, c.campus, g.year
ORDER BY g.year DESC, g.college_id;

-- A5) Find colleges in Washington which are highly walkable and transit accessible (score >70)
Select c.name, campus, c.type, c.website_url, walk, transit, bike
FROM colleges c, walkscore_stats w
WHERE c.college_id = w.college_id
AND w.walk > 70 AND w.transit > 70;
