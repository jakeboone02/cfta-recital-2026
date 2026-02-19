CREATE TABLE dances (
  id int PRIMARY KEY,
  recital_group int check (recital_group IN (1, 2, 3)) null,
  class_time text,
  dance_style text check (dance_style IN ('Acro', 'Ballet', 'Lyrical/Modern', 'Jazz', 'Musical Theater', 'Tap', 'BABY DANCE')) not null,
  dance text,
  choreography text,
  song text,
  artist text,
  spectapular int check (spectapular IN (0, 1))
);

CREATE TABLE dancers (
  name text GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  first_name text not null,
  last_name text not null
);

CREATE UNIQUE INDEX dancers_name ON dancers (name);

CREATE TABLE dance_dancers (
  dance_id int not null,
  dancer text not null
);

CREATE TABLE recital_group_orders (
  recital_id text check (recital_ID IN ('A', 'B', 'C')) null,
  dance_id int not null,
  follows_dance_id int
);

CREATE TABLE recitals (
  id text PRIMARY KEY check (id IN ('A', 'B', 'C')),
  recital_group_part_1 int check (recital_group_part_1 IN (1, 2, 3)) null,
  recital_group_part_2 int check (recital_group_part_2 IN (1, 2, 3)) null,
  description text not null
);

--------------------------------------------------------------------------------
-- Views
--------------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS participants AS
 SELECT
   d.id AS dance_id,
   d.recital_group,
   d.class_time,
   d.dance_style,
   d.dance,
   d.choreography,
   dd.dancer,
   p.first_name,
   p.last_name
  FROM dances d JOIN dance_dancers dd ON d.id = dd.dance_id JOIN dancers p ON p.name = dd.dancer
 ORDER BY dance, class_time, last_name, first_name;

--------------------------------------------------------------------------------
-- Recitals
--------------------------------------------------------------------------------

INSERT INTO recitals (id, recital_group_part_1, recital_group_part_2, description) VALUES ('A', 1, 2, 'April 26 PM - Saturday Afternoon Recital');
INSERT INTO recitals (id, recital_group_part_1, recital_group_part_2, description) VALUES ('B', 2, 3, 'April 25 PM - Friday Evening Recital');
INSERT INTO recitals (id, recital_group_part_1, recital_group_part_2, description) VALUES ('C', 3, 1, 'April 26 AM - Saturday Morning Recital');

--------------------------------------------------------------------------------
-- Dances
--------------------------------------------------------------------------------

-- Recital Group 1
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (1, 1, 'Acro', 'You''ll Always Find Your Way Back Home', 'Hannah Montana', 'Tue 4:15', 'Acro 1', 'Ms. Emilee', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (2, 1, 'Acro', 'Hawaiian Roller Coaster Ride', 'Jump5', 'Wed 5:15', 'Acro Jr.', 'Ms. Emilee', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (3, 1, 'Tap', 'No Excuses', 'Meghan Trainor', 'Wed 7:15', 'Adult Tap 2', 'Ms. Angie', 1);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (5, 1, 'Ballet', 'Coastline', 'Hollow Coves', 'Tue 6:15', 'Ballet/Contemporary', 'Ms. Emilee', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (6, 1, 'Ballet', 'Stand By Me', 'Florence + the Machine', 'Wed 2:30', 'Ballet/Tap Combo (Wed 2:30) Ballet', 'Ms. Angie', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (7, 1, 'Tap', 'A Wink and a Smile', 'Harry Connick, Jr.', 'Wed 2:30', 'Ballet/Tap Combo (Wed 2:30) Tap', 'Ms. Angie', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (8, 1, 'Lyrical/Modern', 'Home', 'Phillip Phillips', 'Mon 6:15', 'Lyrical/Modern 1', 'Ms. Marissa', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (9, 1, 'Musical Theater', 'Broadway Baby', 'Glee Cast', 'Wed 4:15', 'Musical Theater 2', 'Ms. Emilee', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (10, 1, 'Musical Theater', 'Come Alive', 'The Greatest Showman', 'Thu 5:15', 'Musical Theater 1', 'Ms. Marissa', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (11, 1, 'Tap', 'Jet Set', 'Catch Me If You Can -- Aaron Teveit & Company of the Original Broadway Cast 2011', 'Wed 6:15', 'Tap 3', 'Ms. Angie', 1);

-- Recital Group 2
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (12, 2, 'Acro', 'He''s A Pirate', 'Dimitri Vegas & Like Mike', 'Tue 5:15', 'Acro 2', 'Ms. Emilee', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (13, 2, 'Ballet', 'Rise Up', 'Andra Day', 'Tue 7:15', 'Adult Ballet/Contemporary', 'Ms. Emilee', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (14, 2, 'Ballet', 'Touch the Sky (Instrumental)', 'Roxane Genot, Jan Prouska', 'Mon 5:15', 'Ballet 1', 'Ms. Marissa', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (15, 2, 'Ballet', 'Journey to the Past', 'Christy Altomare', 'Mon 4:15', 'Ballet/Tap Combo (Mon 4:15) Ballet', 'Ms. Marissa', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (16, 2, 'Tap', 'Live Your Story', 'Tina Parol', 'Mon 4:15', 'Ballet/Tap Combo (Mon 4:15) Tap', 'Ms. Marissa', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (26, 2, 'Jazz', 'Spaceman', 'Head Up High', 'Mon 6:15', 'Jazz 2', 'Ms. Angie', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (18, 2, 'Lyrical/Modern', 'How It Ends', 'DeVotchKa', 'Thu 4:15', 'Lyrical/Modern 1', 'Ms. Angie', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (19, 2, 'Musical Theater', 'Defying Gravity', 'Wicked: The Soundtrack, Wicked Movie Cast', 'Wed 7:15', 'Musical Theater 3', 'Ms. Emilee', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (20, 2, 'Tap', 'New York, New York', 'Home State and Yellsmiles/Anna Uzele & Original Broadway Cast 2024', 'Wed 4:15', 'Tap 1', 'Ms. Angie', 1);

-- Recital Group 3
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (4, 3, 'Ballet', 'Belle of the Ball', 'Leroy Anderson, Simon Tedeschi, Paul Mann', 'Tue 5:15', 'Ballet 1', 'Ms. Jillian', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (21, 3, 'Acro', 'Waka Waka (This Time for Africa)', 'Shakira', 'Wed 6:15', 'Acro 3', 'Ms. Emilee', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (22, 3, 'Tap', 'The Feeling', 'Sammy Rae & Friends', 'Mon 7:15', 'Adult Tap 1', 'Ms. Angie', 1);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (23, 3, 'Ballet', 'Sleeping Beauty Waltz', 'Tchaikovsky, London Symphony Orchestra', 'Tue 6:15', 'Ballet 2', 'Ms. Jillian', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (24, 3, 'Ballet', 'Dream', 'Priscilla Ahn', 'Tue 4:15', 'Ballet/Tap Combo (Tue 4:15) Ballet', 'Ms. Jillian', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (25, 3, 'Tap', 'Ease On Down the Road', 'Matthew Morrison', 'Tue 4:15', 'Ballet/Tap Combo (Tue 4:15) Tap', 'Ms. Jillian', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (17, 3, 'Jazz', 'Stand Out', 'Tevin Campbell', 'Thu 6:15', 'Jazz 1', 'Ms. Marissa', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (27, 3, 'Lyrical/Modern', 'You Will Be Found', 'Dear Evan Hansen Original Motion Picture Soundtrack', 'Thu 5:15', 'Lyrical/Modern 2', 'Ms. Angie', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (28, 3, 'Musical Theater', 'Another Day of Sun', 'La La Land Cast', 'Tue 7:15', 'Musical Theater: HS', 'Ms. Jillian', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (29, 3, 'Tap', 'Welcome to New York (Taylor''s Version)', 'Taylor Swift', 'Wed 5:15', 'Tap 2', 'Ms. Angie', 1);

-- Recital A Baby Dances
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (30, NULL, 'BABY DANCE', 'Butterfly Fly Away', 'Miley and Billy Ray Cyrus', 'Thu 4:15', 'Pre-Ballet/Tap (Thu 4:15) Sweethearts', 'Ms. Marissa', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (31, NULL, 'BABY DANCE', 'When Will My Life Begin', 'Mandy Moore', 'Thu 4:15', 'Pre-Ballet/Tap (Thu 4:15)', 'Ms. Marissa', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (40, NULL, 'BABY DANCE', 'la la lu', 'Christina Perri', 'Wed 11:00', 'Pre-Ballet/Tap (Wed 11:00)', 'Ms. Jillian', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (41, NULL, 'BABY DANCE', 'My Kind of Girl', 'Buddy Greco', 'Wed 11:00', 'Pre-Ballet/Tap (Wed 11:00) Sweethearts', 'Ms. Jillian', 0);

-- Recital B Baby Dances
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (38, NULL, 'BABY DANCE', 'Singin'' in the Rain', 'JJ Heller', 'Wed 10:00', 'Pre-Ballet/Tap (Wed 10:00)', 'Ms. Jillian', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (39, NULL, 'BABY DANCE', 'Lollipop', 'Sophie Green', 'Wed 10:00', 'Pre-Ballet/Tap (Wed 10:00) Sweethearts', 'Ms. Jillian', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (34, NULL, 'BABY DANCE', 'Wind in My Hair', 'Rapunzel', 'Wed 10:00', 'Pre-Ballet/Acro (Wed 10:00)', 'Ms. Marissa', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (35, NULL, 'BABY DANCE', 'My Wish', 'Rascal Flatts', 'Wed 10:00', 'Pre-Ballet/Acro (Wed 10:00) Sweethearts', 'Ms. Marissa', 0);

-- Recital C Baby Dances
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (36, NULL, 'BABY DANCE', 'Mon Cœur Fait Vroum (My Heart Goes Vroom)', 'Cars 2 - Bénabar', 'Thu 11:00', 'Pre-Ballet/Acro (Thu 11:00)', 'Ms. Angie', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (37, NULL, 'BABY DANCE', 'Daughter', 'Ben Rector', 'Thu 11:00', 'Pre-Ballet/Acro (Thu 11:00) Sweethearts', 'Ms. Angie', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (42, NULL, 'BABY DANCE', 'Under the Sea', 'The Little Mermaid', 'Wed/Thu 11:00', 'Pre-Ballet/Tap (Wed/Thu 11:00)', 'Ms. Marissa', 0);
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (43, NULL, 'BABY DANCE', 'My Wish', 'Rascal Flatts', 'Wed/Thu 11:00', 'Pre-Ballet/Tap (Wed/Thu 11:00) Sweethearts', 'Ms. Marissa', 0);

-- Merged Baby Dances
-- INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
--   VALUES (32, NULL, 'BABY DANCE', 'MERGED - Under the Sea', 'The Little Mermaid', 'Wed 11:00', 'Pre-Ballet/Tap (Wed 11:00)', 'Ms. Marissa', 0);
-- INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
--   VALUES (33, NULL, 'BABY DANCE', 'MERGED - My Wish', 'Rascal Flatts', 'Wed 11:00', 'Pre-Ballet/Tap (Wed 11:00) Sweethearts', 'Ms. Marissa', 0);

-- SpecTAPular
INSERT INTO dances (id, recital_group, dance_style, song, artist, class_time, dance, choreography, spectapular)
  VALUES (-1, NULL, 'Tap', 'Song-A-Long', 'Cast of Eurovision Song Contest: The Story of Fire Saga', NULL, 'SpecTAPular', 'Ms. Angie', 0);

--------------------------------------------------------------------------------
-- Dance Orders
--------------------------------------------------------------------------------

-- Recital Group 1 Order
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 6, NULL);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 1, 6);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 11, 1);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 10, 11);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 5, 10);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 2, 5);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 9, 2);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 8, 9);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 7, 8);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 3, 7);

-- Recital Group 2 Order
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 26, NULL);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 14, 26);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 16, 14);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 13, 16);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 18, 13);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 19, 18);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 20, 19);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 12, 20);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 15, 12);

-- Recital Group 3 Order
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 4, NULL);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 29, 4);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 21, 29);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 23, 21);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 25, 23);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 27, 25);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 22, 27);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 17, 22);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 24, 17);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES (NULL, 28, 24);

-- Recital A Baby Dance Order
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES ('A', 30, 2);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES ('A', 31, 18);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES ('A', 40, 26);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES ('A', 41, 10);

-- Recital B Baby Dance Order
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES ('B', 39, 26);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES ('B', 38, 21);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES ('B', 34, 18);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES ('B', 35, 27);

-- Recital C Baby Dance Order
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES ('C', 36, 10);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES ('C', 37, 21);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES ('C', 42, 27);
INSERT INTO recital_group_orders (recital_id, dance_id, follows_dance_id) VALUES ('C', 43, 2);

--------------------------------------------------------------------------------
-- Dancers
--------------------------------------------------------------------------------

INSERT INTO dancers (first_name, last_name) VALUES ('Abbey', 'Foley');
INSERT INTO dancers (first_name, last_name) VALUES ('Abigail', 'Clark');
INSERT INTO dancers (first_name, last_name) VALUES ('Adalynn', 'Malcolm');
INSERT INTO dancers (first_name, last_name) VALUES ('Addie', 'Knisley');
INSERT INTO dancers (first_name, last_name) VALUES ('Addie', 'Vetter');
INSERT INTO dancers (first_name, last_name) VALUES ('Addilyn', 'Bichsel');
INSERT INTO dancers (first_name, last_name) VALUES ('Addison', 'Mattingly');
INSERT INTO dancers (first_name, last_name) VALUES ('Addison', 'Meng');
INSERT INTO dancers (first_name, last_name) VALUES ('Addison', 'Mills');
INSERT INTO dancers (first_name, last_name) VALUES ('Akshara', 'Madana');
INSERT INTO dancers (first_name, last_name) VALUES ('Alaina', 'Akert');
INSERT INTO dancers (first_name, last_name) VALUES ('Alex', 'Sims');
INSERT INTO dancers (first_name, last_name) VALUES ('Alex', 'Vetter');
INSERT INTO dancers (first_name, last_name) VALUES ('Alexandra', 'Stonham');
INSERT INTO dancers (first_name, last_name) VALUES ('Alianna', 'Arce');
INSERT INTO dancers (first_name, last_name) VALUES ('Ali', 'Nava');
INSERT INTO dancers (first_name, last_name) VALUES ('Alice', 'Stonham');
INSERT INTO dancers (first_name, last_name) VALUES ('Alita', 'Van Poppelen');
INSERT INTO dancers (first_name, last_name) VALUES ('Amanda', 'Meyerhofer');
INSERT INTO dancers (first_name, last_name) VALUES ('Amelia', 'Clark');
INSERT INTO dancers (first_name, last_name) VALUES ('Amelia', 'Coates');
INSERT INTO dancers (first_name, last_name) VALUES ('Amelia', 'Haro');
INSERT INTO dancers (first_name, last_name) VALUES ('Amelia', 'Hurtado');
INSERT INTO dancers (first_name, last_name) VALUES ('Amelia', 'Ratkovich');
INSERT INTO dancers (first_name, last_name) VALUES ('Ami', 'Meng');
INSERT INTO dancers (first_name, last_name) VALUES ('Amy', 'Burnham');
INSERT INTO dancers (first_name, last_name) VALUES ('Amy', 'Schroff');
INSERT INTO dancers (first_name, last_name) VALUES ('Angelica', 'Catuna');
INSERT INTO dancers (first_name, last_name) VALUES ('Angie', 'Boone');
INSERT INTO dancers (first_name, last_name) VALUES ('Anneliese', 'Wells');
INSERT INTO dancers (first_name, last_name) VALUES ('Annie', 'Cox');
INSERT INTO dancers (first_name, last_name) VALUES ('Anysia', 'Chandiramani');
INSERT INTO dancers (first_name, last_name) VALUES ('Aria', 'Musarra');
INSERT INTO dancers (first_name, last_name) VALUES ('Ariah', 'Baxter');
INSERT INTO dancers (first_name, last_name) VALUES ('Arianna', 'Kambham');
INSERT INTO dancers (first_name, last_name) VALUES ('Ariella', 'Burdette');
INSERT INTO dancers (first_name, last_name) VALUES ('Asher', 'Boone');
INSERT INTO dancers (first_name, last_name) VALUES ('Aubree', 'Landavazo');
INSERT INTO dancers (first_name, last_name) VALUES ('Audree', 'Addler');
INSERT INTO dancers (first_name, last_name) VALUES ('Audrey', 'Bland');
INSERT INTO dancers (first_name, last_name) VALUES ('Ava', 'Bervig');
INSERT INTO dancers (first_name, last_name) VALUES ('Ava', 'Elgin');
INSERT INTO dancers (first_name, last_name) VALUES ('Ava', 'Wolter');
INSERT INTO dancers (first_name, last_name) VALUES ('Avery', 'Kidd');
INSERT INTO dancers (first_name, last_name) VALUES ('Avyakta Shloka', 'Balla');
INSERT INTO dancers (first_name, last_name) VALUES ('Bailey', 'Meyer');
INSERT INTO dancers (first_name, last_name) VALUES ('Beckham', 'Kidd');
INSERT INTO dancers (first_name, last_name) VALUES ('Blakely', 'Moreno');
INSERT INTO dancers (first_name, last_name) VALUES ('Briddian', 'Demas');
INSERT INTO dancers (first_name, last_name) VALUES ('Brielle', 'Farcas');
INSERT INTO dancers (first_name, last_name) VALUES ('Brooke', 'Balzarini');
INSERT INTO dancers (first_name, last_name) VALUES ('Brooklyn', 'Miller');
INSERT INTO dancers (first_name, last_name) VALUES ('Brooksie', 'Schuitema');
INSERT INTO dancers (first_name, last_name) VALUES ('Brynlie', 'Murphy');
INSERT INTO dancers (first_name, last_name) VALUES ('Caitlyn', 'O''Connor');
INSERT INTO dancers (first_name, last_name) VALUES ('Calista', 'Linger');
INSERT INTO dancers (first_name, last_name) VALUES ('Callie', 'Hayslett');
INSERT INTO dancers (first_name, last_name) VALUES ('Carson', 'Hunter');
INSERT INTO dancers (first_name, last_name) VALUES ('Charis', 'Morkunas');
INSERT INTO dancers (first_name, last_name) VALUES ('Charley', 'Moncrieff');
INSERT INTO dancers (first_name, last_name) VALUES ('Charlie', 'Hansen');
INSERT INTO dancers (first_name, last_name) VALUES ('Charlotte', 'Ardelean');
INSERT INTO dancers (first_name, last_name) VALUES ('Charlotte', 'Delatorre');
INSERT INTO dancers (first_name, last_name) VALUES ('Charlotte', 'Hughes');
INSERT INTO dancers (first_name, last_name) VALUES ('Charlotte', 'Reaney');
INSERT INTO dancers (first_name, last_name) VALUES ('Chloe', 'Hale-Banks');
INSERT INTO dancers (first_name, last_name) VALUES ('Chloe', 'Minani');
INSERT INTO dancers (first_name, last_name) VALUES ('Christina', 'Callanan-Attebery');
INSERT INTO dancers (first_name, last_name) VALUES ('Claira', 'Kundla');
INSERT INTO dancers (first_name, last_name) VALUES ('Clara', 'Boone');
INSERT INTO dancers (first_name, last_name) VALUES ('Cora', 'Bervig');
INSERT INTO dancers (first_name, last_name) VALUES ('Connie', 'Johnson');
INSERT INTO dancers (first_name, last_name) VALUES ('Dawn', 'Ellis');
INSERT INTO dancers (first_name, last_name) VALUES ('Delaney', 'Hernaez');
INSERT INTO dancers (first_name, last_name) VALUES ('Delaney', 'Ogden');
INSERT INTO dancers (first_name, last_name) VALUES ('Eden', 'Rawlings');
INSERT INTO dancers (first_name, last_name) VALUES ('Eden', 'Rosinbum');
INSERT INTO dancers (first_name, last_name) VALUES ('Eleanor', 'Mann');
INSERT INTO dancers (first_name, last_name) VALUES ('Eliana', 'Macrides');
INSERT INTO dancers (first_name, last_name) VALUES ('Elissa', 'Uhl');
INSERT INTO dancers (first_name, last_name) VALUES ('Ella', 'Martin');
INSERT INTO dancers (first_name, last_name) VALUES ('Ella', 'Stan');
INSERT INTO dancers (first_name, last_name) VALUES ('Elli', 'Moore');
INSERT INTO dancers (first_name, last_name) VALUES ('Ellison', 'Wetmore');
INSERT INTO dancers (first_name, last_name) VALUES ('Ellie', 'Coffee');
INSERT INTO dancers (first_name, last_name) VALUES ('Ellie', 'Garibaldi');
INSERT INTO dancers (first_name, last_name) VALUES ('Eloise', 'Arena');
INSERT INTO dancers (first_name, last_name) VALUES ('Elora', 'Tacheny');
INSERT INTO dancers (first_name, last_name) VALUES ('Elyssa', 'Weidman');
INSERT INTO dancers (first_name, last_name) VALUES ('Emery', 'Kinch');
INSERT INTO dancers (first_name, last_name) VALUES ('Emilia', 'Erickson');
INSERT INTO dancers (first_name, last_name) VALUES ('Emilee', 'Machowski');
INSERT INTO dancers (first_name, last_name) VALUES ('Emily', 'Brunk');
INSERT INTO dancers (first_name, last_name) VALUES ('Emily', 'Lewis');
INSERT INTO dancers (first_name, last_name) VALUES ('Emily', 'Ritter');
INSERT INTO dancers (first_name, last_name) VALUES ('Emma', 'Elgin');
INSERT INTO dancers (first_name, last_name) VALUES ('Emma', 'Hoelzen');
INSERT INTO dancers (first_name, last_name) VALUES ('Emma', 'Vilorio');
INSERT INTO dancers (first_name, last_name) VALUES ('Emmaline', 'Ashton');
INSERT INTO dancers (first_name, last_name) VALUES ('Emmanuelle', 'Carnahan');
INSERT INTO dancers (first_name, last_name) VALUES ('Eric', 'Lynch');
INSERT INTO dancers (first_name, last_name) VALUES ('Eve', 'Laun');
INSERT INTO dancers (first_name, last_name) VALUES ('Everly', 'Mauldin');
INSERT INTO dancers (first_name, last_name) VALUES ('Evie', 'Carioto');
INSERT INTO dancers (first_name, last_name) VALUES ('Finnley', 'Vossler');
INSERT INTO dancers (first_name, last_name) VALUES ('Gabriela', 'Ortiz');
INSERT INTO dancers (first_name, last_name) VALUES ('Gia', 'McBride');
INSERT INTO dancers (first_name, last_name) VALUES ('Gianna', 'Arce');
INSERT INTO dancers (first_name, last_name) VALUES ('Gina', 'Sorrentino');
INSERT INTO dancers (first_name, last_name) VALUES ('Grace', 'Hayslett');
INSERT INTO dancers (first_name, last_name) VALUES ('Grace', 'Miller');
INSERT INTO dancers (first_name, last_name) VALUES ('Grace', 'Molina');
INSERT INTO dancers (first_name, last_name) VALUES ('Grace', 'Rawlings');
INSERT INTO dancers (first_name, last_name) VALUES ('Gracen', 'Kantaras');
INSERT INTO dancers (first_name, last_name) VALUES ('Hadley Mae', 'Lichter');
INSERT INTO dancers (first_name, last_name) VALUES ('Hadley', 'Taylor');
INSERT INTO dancers (first_name, last_name) VALUES ('Hailey', 'Ratiu');
INSERT INTO dancers (first_name, last_name) VALUES ('Hallie', 'Riewold');
INSERT INTO dancers (first_name, last_name) VALUES ('Hanna', 'Abney');
INSERT INTO dancers (first_name, last_name) VALUES ('Hanna', 'Tsai');
INSERT INTO dancers (first_name, last_name) VALUES ('Hannah', 'DeSpain');
INSERT INTO dancers (first_name, last_name) VALUES ('Hannah', 'Ratiu');
INSERT INTO dancers (first_name, last_name) VALUES ('Harper', 'Addler');
INSERT INTO dancers (first_name, last_name) VALUES ('Hayden', 'Bragg');
INSERT INTO dancers (first_name, last_name) VALUES ('Heidi', 'Moore');
INSERT INTO dancers (first_name, last_name) VALUES ('Holly', 'Sheppard');
INSERT INTO dancers (first_name, last_name) VALUES ('Hollyn', 'Kinch');
INSERT INTO dancers (first_name, last_name) VALUES ('Isa', 'Segura');
INSERT INTO dancers (first_name, last_name) VALUES ('Isabella', 'Ma');
INSERT INTO dancers (first_name, last_name) VALUES ('Isabelle', 'Stonham');
INSERT INTO dancers (first_name, last_name) VALUES ('Ishika', 'Musani');
INSERT INTO dancers (first_name, last_name) VALUES ('Isla', 'Abuhmaiden');
INSERT INTO dancers (first_name, last_name) VALUES ('Isla', 'Bervig');
INSERT INTO dancers (first_name, last_name) VALUES ('Ivan', 'Shkarayev');
INSERT INTO dancers (first_name, last_name) VALUES ('Ivy', 'Aleo');
INSERT INTO dancers (first_name, last_name) VALUES ('Jacqueline', 'Humbles');
INSERT INTO dancers (first_name, last_name) VALUES ('Jade', 'Franks');
INSERT INTO dancers (first_name, last_name) VALUES ('Jake', 'Boone');
INSERT INTO dancers (first_name, last_name) VALUES ('Jamieson', 'Migliorino');
INSERT INTO dancers (first_name, last_name) VALUES ('Jane', 'Armenta');
INSERT INTO dancers (first_name, last_name) VALUES ('Jane', 'Fuss');
INSERT INTO dancers (first_name, last_name) VALUES ('Jane', 'Hicks');
INSERT INTO dancers (first_name, last_name) VALUES ('Janelle', 'Stayton');
INSERT INTO dancers (first_name, last_name) VALUES ('Jenna', 'Meyerhofer');
INSERT INTO dancers (first_name, last_name) VALUES ('Nora', 'Scorzetti');
INSERT INTO dancers (first_name, last_name) VALUES ('Jillian', 'Hester');
INSERT INTO dancers (first_name, last_name) VALUES ('Jillian', 'Stefanski');
INSERT INTO dancers (first_name, last_name) VALUES ('Jodi', 'DeLaTorre');
INSERT INTO dancers (first_name, last_name) VALUES ('Joelle', 'Murphy');
INSERT INTO dancers (first_name, last_name) VALUES ('Jonah', 'Wells');
INSERT INTO dancers (first_name, last_name) VALUES ('Josslyn', 'Hester');
INSERT INTO dancers (first_name, last_name) VALUES ('Juliana', 'Conner');
INSERT INTO dancers (first_name, last_name) VALUES ('Julie', 'Burnham');
INSERT INTO dancers (first_name, last_name) VALUES ('Juliette', 'Boone');
INSERT INTO dancers (first_name, last_name) VALUES ('Juliette', 'Ogden');
INSERT INTO dancers (first_name, last_name) VALUES ('Justine', 'Persons');
-- INSERT INTO dancers (first_name, last_name) VALUES ('Kaleen', 'Wo');
INSERT INTO dancers (first_name, last_name) VALUES ('Kalina', 'Korito');
INSERT INTO dancers (first_name, last_name) VALUES ('Kate', 'Hoelzen');
INSERT INTO dancers (first_name, last_name) VALUES ('Kate', 'Mather');
INSERT INTO dancers (first_name, last_name) VALUES ('Kate', 'Widney');
INSERT INTO dancers (first_name, last_name) VALUES ('Kekoalakakapono', 'Morkunas');
INSERT INTO dancers (first_name, last_name) VALUES ('Kelsey', 'Puckett');
INSERT INTO dancers (first_name, last_name) VALUES ('Kendall', 'Rudzki');
INSERT INTO dancers (first_name, last_name) VALUES ('Kenley', 'Block');
INSERT INTO dancers (first_name, last_name) VALUES ('Keshavi', 'Patel');
INSERT INTO dancers (first_name, last_name) VALUES ('Keturah', 'Lynch');
INSERT INTO dancers (first_name, last_name) VALUES ('Kinney', 'Chen');
INSERT INTO dancers (first_name, last_name) VALUES ('Kira', 'Shkarayeva');
INSERT INTO dancers (first_name, last_name) VALUES ('Kristi', 'Hunter');
INSERT INTO dancers (first_name, last_name) VALUES ('Kylie', 'Reid-Neal');
INSERT INTO dancers (first_name, last_name) VALUES ('Kylie', 'Gonzalez');
INSERT INTO dancers (first_name, last_name) VALUES ('Larsyn', 'Callanan-Attebery');
INSERT INTO dancers (first_name, last_name) VALUES ('Leelah', 'Taylor');
INSERT INTO dancers (first_name, last_name) VALUES ('Lennon', 'Taylor');
INSERT INTO dancers (first_name, last_name) VALUES ('Lilah', 'Norris');
INSERT INTO dancers (first_name, last_name) VALUES ('Lilli', 'Rosinbum');
INSERT INTO dancers (first_name, last_name) VALUES ('Lillian', 'Denney');
INSERT INTO dancers (first_name, last_name) VALUES ('Lindsay', 'Davis');
INSERT INTO dancers (first_name, last_name) VALUES ('Lizzy', 'Bala Bala');
INSERT INTO dancers (first_name, last_name) VALUES ('Lo', 'Holloway');
INSERT INTO dancers (first_name, last_name) VALUES ('Lucianna', 'Arce');
INSERT INTO dancers (first_name, last_name) VALUES ('Lucy', 'Albert');
INSERT INTO dancers (first_name, last_name) VALUES ('Lucy', 'Goodson');
INSERT INTO dancers (first_name, last_name) VALUES ('Mackenzie', 'Flandrau');
INSERT INTO dancers (first_name, last_name) VALUES ('Maddie', 'Massaro');
INSERT INTO dancers (first_name, last_name) VALUES ('Madeline', 'Nguyen');
INSERT INTO dancers (first_name, last_name) VALUES ('Madeline', 'O''Connor');
INSERT INTO dancers (first_name, last_name) VALUES ('Madi', 'Akert');
INSERT INTO dancers (first_name, last_name) VALUES ('Madison', 'Puckett');
INSERT INTO dancers (first_name, last_name) VALUES ('Madison', 'Schroff');
INSERT INTO dancers (first_name, last_name) VALUES ('Madison', 'Widney');
INSERT INTO dancers (first_name, last_name) VALUES ('Mae', 'Simmers');
INSERT INTO dancers (first_name, last_name) VALUES ('Maezlyn', 'Wiese');
INSERT INTO dancers (first_name, last_name) VALUES ('Maia', 'Hunter');
INSERT INTO dancers (first_name, last_name) VALUES ('Maisie', 'Cantieni');
INSERT INTO dancers (first_name, last_name) VALUES ('Makena', 'Kirara');
INSERT INTO dancers (first_name, last_name) VALUES ('Makenna', 'Reeves');
INSERT INTO dancers (first_name, last_name) VALUES ('Maleah', 'Poku');
INSERT INTO dancers (first_name, last_name) VALUES ('Manya', 'Thakur');
INSERT INTO dancers (first_name, last_name) VALUES ('Margot', 'Denney');
INSERT INTO dancers (first_name, last_name) VALUES ('Marien', 'de la Torre');
INSERT INTO dancers (first_name, last_name) VALUES ('Marina', 'Permiakova');
INSERT INTO dancers (first_name, last_name) VALUES ('Marissa', 'Calderone');
INSERT INTO dancers (first_name, last_name) VALUES ('Marlowe', 'Drown');
INSERT INTO dancers (first_name, last_name) VALUES ('Mavis', 'Henry');
INSERT INTO dancers (first_name, last_name) VALUES ('Megan', 'Henze');
INSERT INTO dancers (first_name, last_name) VALUES ('Megan', 'Riewold');
INSERT INTO dancers (first_name, last_name) VALUES ('Mia', 'Segura');
INSERT INTO dancers (first_name, last_name) VALUES ('Mikaela', 'Wells');
INSERT INTO dancers (first_name, last_name) VALUES ('Mixon', 'Jakubos');
INSERT INTO dancers (first_name, last_name) VALUES ('Moustafa', 'Banna');
INSERT INTO dancers (first_name, last_name) VALUES ('Natallya', 'Shkarayeva');
INSERT INTO dancers (first_name, last_name) VALUES ('Nisha', 'Bhatia');
INSERT INTO dancers (first_name, last_name) VALUES ('Noelle', 'Gunnell');
INSERT INTO dancers (first_name, last_name) VALUES ('Noemi', 'Richardson');
INSERT INTO dancers (first_name, last_name) VALUES ('Nora', 'Ardelean');
INSERT INTO dancers (first_name, last_name) VALUES ('Olivia', 'Bervig');
INSERT INTO dancers (first_name, last_name) VALUES ('Olivia', 'Flandrau');
INSERT INTO dancers (first_name, last_name) VALUES ('Olivia', 'Lenhart');
INSERT INTO dancers (first_name, last_name) VALUES ('Parker', 'Lemanski');
INSERT INTO dancers (first_name, last_name) VALUES ('Pearl', 'Nielsen');
INSERT INTO dancers (first_name, last_name) VALUES ('Penelope', 'Hicks');
INSERT INTO dancers (first_name, last_name) VALUES ('Peyton', 'Grayson');
INSERT INTO dancers (first_name, last_name) VALUES ('Phoenix-Dawn', 'Morkunas');
INSERT INTO dancers (first_name, last_name) VALUES ('Piper', 'McGuire');
INSERT INTO dancers (first_name, last_name) VALUES ('Presleigh', 'Wilson');
INSERT INTO dancers (first_name, last_name) VALUES ('Presley', 'Grubor');
INSERT INTO dancers (first_name, last_name) VALUES ('Quinn', 'Dollman');
INSERT INTO dancers (first_name, last_name) VALUES ('Quinn', 'Ford');
INSERT INTO dancers (first_name, last_name) VALUES ('ReAnn', 'Loose');
INSERT INTO dancers (first_name, last_name) VALUES ('Rebecca', 'Arnold');
INSERT INTO dancers (first_name, last_name) VALUES ('Rebekah', 'Poku');
INSERT INTO dancers (first_name, last_name) VALUES ('Reese', 'Goodman');
INSERT INTO dancers (first_name, last_name) VALUES ('Riley', 'Ratkovich');
INSERT INTO dancers (first_name, last_name) VALUES ('Rory', 'Krueger');
INSERT INTO dancers (first_name, last_name) VALUES ('Ruby', 'Rasch');
INSERT INTO dancers (first_name, last_name) VALUES ('Ryann', 'Bragg');
INSERT INTO dancers (first_name, last_name) VALUES ('Rylee', 'Eklund');
INSERT INTO dancers (first_name, last_name) VALUES ('Ryleigh', 'Gower');
INSERT INTO dancers (first_name, last_name) VALUES ('Rylie', 'Brown');
INSERT INTO dancers (first_name, last_name) VALUES ('Rylie', 'Persons');
INSERT INTO dancers (first_name, last_name) VALUES ('Sadie', 'Mather');
INSERT INTO dancers (first_name, last_name) VALUES ('Sadie', 'McCrite');
INSERT INTO dancers (first_name, last_name) VALUES ('Saisha', 'Sethi');
INSERT INTO dancers (first_name, last_name) VALUES ('Sedona', 'Stumbaugh');
INSERT INTO dancers (first_name, last_name) VALUES ('Shay', 'Patterson');
INSERT INTO dancers (first_name, last_name) VALUES ('Shelby', 'Bow');
INSERT INTO dancers (first_name, last_name) VALUES ('Ryna', 'Arora');
INSERT INTO dancers (first_name, last_name) VALUES ('Sierra', 'Bohannan');
INSERT INTO dancers (first_name, last_name) VALUES ('Skylar', 'Lizama');
INSERT INTO dancers (first_name, last_name) VALUES ('Sofia', 'Nava');
INSERT INTO dancers (first_name, last_name) VALUES ('Sofia', 'Shearer');
INSERT INTO dancers (first_name, last_name) VALUES ('Sophia', 'Andersen');
INSERT INTO dancers (first_name, last_name) VALUES ('Sophia', 'Ortega');
INSERT INTO dancers (first_name, last_name) VALUES ('Sophie', 'Aja');
INSERT INTO dancers (first_name, last_name) VALUES ('Sophie', 'Catuna');
INSERT INTO dancers (first_name, last_name) VALUES ('Stephanie', 'Hansen');
INSERT INTO dancers (first_name, last_name) VALUES ('Summer', 'Lynch');
INSERT INTO dancers (first_name, last_name) VALUES ('Teagan', 'Turley');
INSERT INTO dancers (first_name, last_name) VALUES ('Teanna', 'Brawley');
INSERT INTO dancers (first_name, last_name) VALUES ('Tessa', 'Block');
INSERT INTO dancers (first_name, last_name) VALUES ('Tosha', 'Focht');
INSERT INTO dancers (first_name, last_name) VALUES ('Violet', 'Aleo');
INSERT INTO dancers (first_name, last_name) VALUES ('Vivian', 'Rawlings');
INSERT INTO dancers (first_name, last_name) VALUES ('Wae', 'Callanan-Attebery');
INSERT INTO dancers (first_name, last_name) VALUES ('Winnie', 'Ady');
INSERT INTO dancers (first_name, last_name) VALUES ('Zari', 'Nicely');
INSERT INTO dancers (first_name, last_name) VALUES ('Zoe', 'Griffin');
INSERT INTO dancers (first_name, last_name) VALUES ('Zoey', 'Moore');
INSERT INTO dancers (first_name, last_name) VALUES ('Zyah', 'Chandiramani');

--------------------------------------------------------------------------------
-- Dance Dancers
--------------------------------------------------------------------------------

INSERT INTO dance_dancers (dance_id, dancer) VALUES (1, 'Shelby Bow') /* Acro 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (1, 'Julie Burnham') /* Acro 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (1, 'Amelia Coates') /* Acro 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (1, 'Emma Elgin') /* Acro 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (1, 'Mackenzie Flandrau') /* Acro 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (1, 'Olivia Flandrau') /* Acro 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (1, 'Hadley Mae Lichter') /* Acro 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (1, 'Akshara Madana') /* Acro 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (1, 'Gia McBride') /* Acro 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (1, 'Shay Patterson') /* Acro 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (1, 'Lilli Rosinbum') /* Acro 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (1, 'Alice Stonham') /* Acro 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (12, 'Hanna Abney') /* Acro 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (12, 'Isla Abuhmaiden') /* Acro 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (12, 'Charlotte Ardelean') /* Acro 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (12, 'Kylie Reid-Neal') /* Acro 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (12, 'Brielle Farcas') /* Acro 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (12, 'Abbey Foley') /* Acro 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (12, 'Zoe Griffin') /* Acro 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (12, 'Grace Hayslett') /* Acro 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (12, 'Jillian Hester') /* Acro 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (12, 'Josslyn Hester') /* Acro 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (12, 'Makenna Reeves') /* Acro 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (12, 'Isabelle Stonham') /* Acro 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (21, 'Alaina Akert') /* Acro 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (21, 'Madi Akert') /* Acro 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (21, 'Lucy Albert') /* Acro 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (21, 'Larsyn Callanan-Attebery') /* Acro 3 */;
-- INSERT INTO dance_dancers (dance_id, dancer) VALUES (21, 'Grace Miller') /* Acro 3 */; -- Dropped out
INSERT INTO dance_dancers (dance_id, dancer) VALUES (21, 'Vivian Rawlings') /* Acro 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (21, 'Lennon Taylor') /* Acro 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (2, 'Rebecca Arnold') /* Acro Jr. */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (2, 'Cora Bervig') /* Acro Jr. */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (2, 'Hollyn Kinch') /* Acro Jr. */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (2, 'Makena Kirara') /* Acro Jr. */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (2, 'Claira Kundla') /* Acro Jr. */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (2, 'Kate Mather') /* Acro Jr. */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (2, 'Sadie Mather') /* Acro Jr. */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (2, 'Everly Mauldin') /* Acro Jr. */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (2, 'Rylie Persons') /* Acro Jr. */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (2, 'Noemi Richardson') /* Acro Jr. */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (2, 'Madison Schroff') /* Acro Jr. */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (2, 'Isa Segura') /* Acro Jr. */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (2, 'Sofia Shearer') /* Acro Jr. */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (2, 'Ellison Wetmore') /* Acro Jr. */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (13, 'Dawn Ellis') /* Adult Ballet & Contemp Combo */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (13, 'Emilee Machowski') /* Adult Ballet & Contemp Combo */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (13, 'Tosha Focht') /* Adult Ballet & Contemp Combo */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (13, 'Jade Franks') /* Adult Ballet & Contemp Combo */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (13, 'Kristi Hunter') /* Adult Ballet & Contemp Combo */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (13, 'Holly Sheppard') /* Adult Ballet & Contemp Combo */;
-- INSERT INTO dance_dancers (dance_id, dancer) VALUES (13, 'Kaleen Wo') /* Adult Ballet & Contemp Combo */; -- No recital
INSERT INTO dance_dancers (dance_id, dancer) VALUES (13, 'Gina Sorrentino') /* Adult Ballet & Contemp Combo */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (22, 'Moustafa Banna') /* Adult Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (22, 'Nisha Bhatia') /* Adult Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (22, 'Christina Callanan-Attebery') /* Adult Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (22, 'Marien de la Torre') /* Adult Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (22, 'Dawn Ellis') /* Adult Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (22, 'Stephanie Hansen') /* Adult Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (22, 'ReAnn Loose') /* Adult Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (22, 'Eric Lynch') /* Adult Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (22, 'Ami Meng') /* Adult Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (22, 'Marina Permiakova') /* Adult Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (22, 'Natallya Shkarayeva') /* Adult Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (22, 'Elissa Uhl') /* Adult Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (22, 'Lindsay Davis') /* Adult Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (3, 'Jake Boone') /* Adult Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (3, 'Amanda Meyerhofer') /* Adult Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (3, 'Heidi Moore') /* Adult Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (3, 'Kelsey Puckett') /* Adult Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (3, 'Megan Riewold') /* Adult Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (3, 'Amy Schroff') /* Adult Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (3, 'Justine Persons') /* Adult Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (3, 'Angie Boone') /* Adult Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (3, 'Marissa Calderone') /* Adult Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (3, 'Connie Johnson') /* Adult Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (5, 'Sophia Andersen') /* Ballet & Contemporary Combo: HS */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (5, 'Clara Boone') /* Ballet & Contemporary Combo: HS */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (5, 'Abigail Clark') /* Ballet & Contemporary Combo: HS */;
-- INSERT INTO dance_dancers (dance_id, dancer) VALUES (5, 'Ryleigh Gower') /* Ballet & Contemporary Combo: HS */; -- Dropped out
INSERT INTO dance_dancers (dance_id, dancer) VALUES (5, 'Maia Hunter') /* Ballet & Contemporary Combo: HS */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (5, 'Olivia Lenhart') /* Ballet & Contemporary Combo: HS */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (5, 'Maddie Massaro') /* Ballet & Contemporary Combo: HS */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (5, 'Bailey Meyer') /* Ballet & Contemporary Combo: HS */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (5, 'Brynlie Murphy') /* Ballet & Contemporary Combo: HS */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (5, 'Vivian Rawlings') /* Ballet & Contemporary Combo: HS */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (5, 'Eden Rawlings') /* Ballet & Contemporary Combo: HS */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (5, 'Emily Ritter') /* Ballet & Contemporary Combo: HS */;
-- INSERT INTO dance_dancers (dance_id, dancer) VALUES (5, 'Mikaela Wells') /* Ballet & Contemporary Combo: HS */; -- Dropped out
INSERT INTO dance_dancers (dance_id, dancer) VALUES (15, 'Sophie Aja') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (15, 'Hayden Bragg') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (15, 'Skylar Lizama') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (15, 'Sadie Mather') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (15, 'Charley Moncrieff') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (15, 'Charlotte Reaney') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (15, 'Alita Van Poppelen') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (15, 'Addie Vetter') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (15, 'Finnley Vossler') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (16, 'Sophie Aja') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (16, 'Hayden Bragg') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (16, 'Skylar Lizama') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (16, 'Sadie Mather') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (16, 'Charley Moncrieff') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (16, 'Charlotte Reaney') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (16, 'Alita Van Poppelen') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (16, 'Addie Vetter') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (16, 'Finnley Vossler') /* Ballet & Tap 1 Combo - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (24, 'Kinney Chen') /* Ballet & Tap 1 Combo - Tuesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (24, 'Parker Lemanski') /* Ballet & Tap 1 Combo - Tuesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (24, 'Ruby Rasch') /* Ballet & Tap 1 Combo - Tuesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (24, 'Hailey Ratiu') /* Ballet & Tap 1 Combo - Tuesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (24, 'Kendall Rudzki') /* Ballet & Tap 1 Combo - Tuesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (24, 'Leelah Taylor') /* Ballet & Tap 1 Combo - Tuesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (24, 'Hanna Tsai') /* Ballet & Tap 1 Combo - Tuesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (25, 'Kinney Chen') /* Ballet & Tap 1 Combo - Tuesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (25, 'Parker Lemanski') /* Ballet & Tap 1 Combo - Tuesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (25, 'Ruby Rasch') /* Ballet & Tap 1 Combo - Tuesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (25, 'Hailey Ratiu') /* Ballet & Tap 1 Combo - Tuesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (25, 'Kendall Rudzki') /* Ballet & Tap 1 Combo - Tuesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (25, 'Leelah Taylor') /* Ballet & Tap 1 Combo - Tuesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (25, 'Hanna Tsai') /* Ballet & Tap 1 Combo - Tuesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (6, 'Ivy Aleo') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (6, 'Cora Bervig') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (6, 'Evie Carioto') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (6, 'Lillian Denney') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (6, 'Sedona Stumbaugh') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (6, 'Lucy Goodson') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (6, 'Emily Lewis') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (6, 'Piper McGuire') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (6, 'Blakely Moreno') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (6, 'Ella Martin') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (6, 'Reese Goodman') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (6, 'Kylie Gonzalez') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (6, 'Marlowe Drown') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (7, 'Ivy Aleo') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (7, 'Cora Bervig') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (7, 'Evie Carioto') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (7, 'Lillian Denney') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (7, 'Sedona Stumbaugh') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (7, 'Lucy Goodson') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (7, 'Emily Lewis') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (7, 'Piper McGuire') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (7, 'Blakely Moreno') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (7, 'Ella Martin') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (7, 'Reese Goodman') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (7, 'Kylie Gonzalez') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (7, 'Marlowe Drown') /* Ballet & Tap 1 Combo - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (14, 'Jane Armenta') /* Ballet 1 - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (14, 'Juliana Conner') /* Ballet 1 - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (14, 'Annie Cox') /* Ballet 1 - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (14, 'Kate Mather') /* Ballet 1 - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (14, 'Kira Shkarayeva') /* Ballet 1 - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (14, 'Avyakta Shloka Balla') /* Ballet 1 - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (14, 'Hadley Taylor') /* Ballet 1 - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (4, 'Ryna Arora') /* Ballet 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (4, 'Sierra Bohannan') /* Ballet 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (4, 'Teanna Brawley') /* Ballet 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (4, 'Mavis Henry') /* Ballet 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (4, 'Elli Moore') /* Ballet 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (4, 'Ishika Musani') /* Ballet 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (4, 'Sophia Ortega') /* Ballet 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (4, 'Keshavi Patel') /* Ballet 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (4, 'Saisha Sethi') /* Ballet 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (4, 'Nora Ardelean') /* Ballet 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (23, 'Brooke Balzarini') /* Ballet 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (23, 'Addilyn Bichsel') /* Ballet 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (23, 'Jane Fuss') /* Ballet 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (23, 'Amelia Haro') /* Ballet 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (23, 'Joelle Murphy') /* Ballet 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (23, 'Madeline Nguyen') /* Ballet 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (23, 'Anneliese Wells') /* Ballet 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (17, 'Lucianna Arce') /* Jazz 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (17, 'Alianna Arce') /* Jazz 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (17, 'Emily Brunk') /* Jazz 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (17, 'Juliana Conner') /* Jazz 1 */;
-- INSERT INTO dance_dancers (dance_id, dancer) VALUES (17, 'Lucy Goodson') /* Jazz 1 */; -- Dropped out
INSERT INTO dance_dancers (dance_id, dancer) VALUES (17, 'Jenna Meyerhofer') /* Jazz 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (17, 'Joelle Murphy') /* Jazz 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (17, 'Zari Nicely') /* Jazz 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (17, 'Ivan Shkarayev') /* Jazz 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (17, 'Kira Shkarayeva') /* Jazz 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (17, 'Mae Simmers') /* Jazz 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (17, 'Manya Thakur') /* Jazz 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (26, 'Gianna Arce') /* Jazz 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (26, 'Julie Burnham') /* Jazz 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (26, 'Zyah Chandiramani') /* Jazz 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (26, 'Anysia Chandiramani') /* Jazz 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (26, 'Peyton Grayson') /* Jazz 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (26, 'Kate Hoelzen') /* Jazz 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (26, 'Emma Hoelzen') /* Jazz 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (26, 'Carson Hunter') /* Jazz 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (26, 'Charis Morkunas') /* Jazz 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (26, 'Brynlie Murphy') /* Jazz 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (26, 'Alex Sims') /* Jazz 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (26, 'Charlie Hansen') /* Jazz 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (26, 'Eden Rawlings') /* Jazz 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (8, 'Abigail Clark') /* Lyrical/Modern 1 - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (8, 'Quinn Dollman') /* Lyrical/Modern 1 - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (8, 'Mackenzie Flandrau') /* Lyrical/Modern 1 - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (8, 'Zoe Griffin') /* Lyrical/Modern 1 - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (8, 'Callie Hayslett') /* Lyrical/Modern 1 - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (8, 'Arianna Kambham') /* Lyrical/Modern 1 - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (8, 'Alex Vetter') /* Lyrical/Modern 1 - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (8, 'Addison Mills') /* Lyrical/Modern 1 - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (8, 'Presleigh Wilson') /* Lyrical/Modern 1 - Monday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (18, 'Hanna Abney') /* Lyrical/Modern 1 - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (18, 'Harper Addler') /* Lyrical/Modern 1 - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (18, 'Juliette Boone') /* Lyrical/Modern 1 - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (18, 'Emily Brunk') /* Lyrical/Modern 1 - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (18, 'Emma Elgin') /* Lyrical/Modern 1 - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (18, 'Jillian Hester') /* Lyrical/Modern 1 - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (18, 'Josslyn Hester') /* Lyrical/Modern 1 - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (18, 'Delaney Hernaez') /* Lyrical/Modern 1 - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (18, 'Kate Hoelzen') /* Lyrical/Modern 1 - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (18, 'Amelia Hurtado') /* Lyrical/Modern 1 - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (18, 'Aubree Landavazo') /* Lyrical/Modern 1 - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (18, 'Calista Linger') /* Lyrical/Modern 1 - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (18, 'Emma Vilorio') /* Lyrical/Modern 1 - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (27, 'Lucy Albert') /* Lyrical/Modern 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (27, 'Tessa Block') /* Lyrical/Modern 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (27, 'Clara Boone') /* Lyrical/Modern 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (27, 'Larsyn Callanan-Attebery') /* Lyrical/Modern 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (27, 'Ryleigh Gower') /* Lyrical/Modern 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (27, 'Emma Hoelzen') /* Lyrical/Modern 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (27, 'Olivia Lenhart') /* Lyrical/Modern 2 */;
-- INSERT INTO dance_dancers (dance_id, dancer) VALUES (27, 'Eden Rawlings') /* Lyrical/Modern 2 */; -- Dropped out
INSERT INTO dance_dancers (dance_id, dancer) VALUES (27, 'Vivian Rawlings') /* Lyrical/Modern 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (27, 'Alex Sims') /* Lyrical/Modern 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (27, 'Kalina Korito') /* Lyrical/Modern 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (10, 'Rylie Brown') /* Musical Theater 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (10, 'Amy Burnham') /* Musical Theater 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (10, 'Ellie Coffee') /* Musical Theater 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (10, 'Charlotte Delatorre') /* Musical Theater 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (10, 'Rylee Eklund') /* Musical Theater 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (10, 'Beckham Kidd') /* Musical Theater 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (10, 'Rylie Persons') /* Musical Theater 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (10, 'Madison Puckett') /* Musical Theater 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (10, 'Grace Rawlings') /* Musical Theater 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (10, 'Madison Schroff') /* Musical Theater 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (9, 'Audree Addler') /* Musical Theater 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (9, 'Lizzy Bala Bala') /* Musical Theater 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (9, 'Ava Bervig') /* Musical Theater 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (9, 'Isla Bervig') /* Musical Theater 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (9, 'Kenley Block') /* Musical Theater 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (9, 'Juliette Boone') /* Musical Theater 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (9, 'Amelia Coates') /* Musical Theater 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (9, 'Olivia Flandrau') /* Musical Theater 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (9, 'Carson Hunter') /* Musical Theater 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (9, 'Emery Kinch') /* Musical Theater 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (9, 'Eden Rawlings') /* Musical Theater 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (9, 'Emily Ritter') /* Musical Theater 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (9, 'Janelle Stayton') /* Musical Theater 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (9, 'Kate Widney') /* Musical Theater 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (9, 'Madison Widney') /* Musical Theater 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (19, 'Madi Akert') /* Musical Theater 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (19, 'Olivia Bervig') /* Musical Theater 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (19, 'Tessa Block') /* Musical Theater 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (19, 'Briddian Demas') /* Musical Theater 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (19, 'Olivia Lenhart') /* Musical Theater 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (19, 'Caitlyn O''Connor') /* Musical Theater 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (19, 'Vivian Rawlings') /* Musical Theater 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (19, 'Alex Sims') /* Musical Theater 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (19, 'Megan Henze') /* Musical Theater 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (28, 'Clara Boone') /* Musical Theater: High School */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (28, 'Wae Callanan-Attebery') /* Musical Theater: High School */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (28, 'Maia Hunter') /* Musical Theater: High School */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (28, 'Maddie Massaro') /* Musical Theater: High School */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (28, 'Bailey Meyer') /* Musical Theater: High School */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (28, 'Phoenix-Dawn Morkunas') /* Musical Theater: High School */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (28, 'Kekoalakakapono Morkunas') /* Musical Theater: High School */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (28, 'Maleah Poku') /* Musical Theater: High School */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (28, 'Rebekah Poku') /* Musical Theater: High School */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (28, 'Jillian Stefanski') /* Musical Theater: High School */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (28, 'Mikaela Wells') /* Musical Theater: High School */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (34, 'Violet Aleo') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (34, 'Ryann Bragg') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (34, 'Maisie Cantieni') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (34, 'Jacqueline Humbles') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (34, 'Rory Krueger') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (34, 'Addison Mattingly') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (34, 'Brooklyn Miller') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (34, 'Chloe Minani') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (34, 'Elora Tacheny') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (34, 'Maezlyn Wiese') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (35, 'Violet Aleo') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (35, 'Ryann Bragg') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (35, 'Maisie Cantieni') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (35, 'Jacqueline Humbles') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (35, 'Rory Krueger') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (35, 'Addison Mattingly') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (35, 'Brooklyn Miller') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (35, 'Chloe Minani') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (35, 'Elora Tacheny') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (35, 'Maezlyn Wiese') /* Pre-Ballet & Acro Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (36, 'Audrey Bland') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (36, 'Emilia Erickson') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (36, 'Adalynn Malcolm') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (36, 'Jamieson Migliorino') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (36, 'Grace Molina') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (36, 'Zoey Moore') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (36, 'Hallie Riewold') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (36, 'Alexandra Stonham') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (36, 'Ariah Baxter') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (36, 'Brooksie Schuitema') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (36, 'Eliana Macrides') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (37, 'Audrey Bland') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (37, 'Emilia Erickson') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (37, 'Adalynn Malcolm') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (37, 'Jamieson Migliorino') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (37, 'Grace Molina') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (37, 'Zoey Moore') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (37, 'Hallie Riewold') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (37, 'Alexandra Stonham') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (37, 'Ariah Baxter') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (37, 'Brooksie Schuitema') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (37, 'Eliana Macrides') /* Pre-Ballet & Acro Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (38, 'Ariella Burdette') /* Pre-Ballet & Tap A - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (38, 'Amelia Clark') /* Pre-Ballet & Tap A - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (38, 'Noelle Gunnell') /* Pre-Ballet & Tap A - Wednesday */;
-- INSERT INTO dance_dancers (dance_id, dancer) VALUES (38, 'Chloe Hale-Banks') /* Pre-Ballet & Tap A - Wednesday */; -- Dropped out
INSERT INTO dance_dancers (dance_id, dancer) VALUES (38, 'Eve Laun') /* Pre-Ballet & Tap A - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (38, 'Delaney Ogden') /* Pre-Ballet & Tap A - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (38, 'Juliette Ogden') /* Pre-Ballet & Tap A - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (38, 'Riley Ratkovich') /* Pre-Ballet & Tap A - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (38, 'Amelia Ratkovich') /* Pre-Ballet & Tap A - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (38, 'Ella Stan') /* Pre-Ballet & Tap A - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (39, 'Ariella Burdette') /* Pre-Ballet & Tap A - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (39, 'Amelia Clark') /* Pre-Ballet & Tap A - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (39, 'Noelle Gunnell') /* Pre-Ballet & Tap A - Wednesday */;
-- INSERT INTO dance_dancers (dance_id, dancer) VALUES (39, 'Chloe Hale-Banks') /* Pre-Ballet & Tap A - Wednesday */; -- Dropped out
INSERT INTO dance_dancers (dance_id, dancer) VALUES (39, 'Eve Laun') /* Pre-Ballet & Tap A - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (39, 'Delaney Ogden') /* Pre-Ballet & Tap A - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (39, 'Juliette Ogden') /* Pre-Ballet & Tap A - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (39, 'Riley Ratkovich') /* Pre-Ballet & Tap A - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (39, 'Amelia Ratkovich') /* Pre-Ballet & Tap A - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (39, 'Ella Stan') /* Pre-Ballet & Tap A - Wednesday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (42, 'Sophie Catuna') /* Pre-Ballet & Tap B&C - Wed - Marissa */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (42, 'Angelica Catuna') /* Pre-Ballet & Tap B&C - Wed - Marissa */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (42, 'Hannah Ratiu') /* Pre-Ballet & Tap B&C - Wed - Marissa */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (42, 'Mia Segura') /* Pre-Ballet & Tap B&C - Wed - Marissa */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (42, 'Sofia Nava') /* Pre-Ballet & Tap B&C - Wed - Marissa */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (43, 'Sophie Catuna') /* Pre-Ballet & Tap B&C - Wed - Marissa */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (43, 'Angelica Catuna') /* Pre-Ballet & Tap B&C - Wed - Marissa */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (43, 'Hannah Ratiu') /* Pre-Ballet & Tap B&C - Wed - Marissa */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (43, 'Mia Segura') /* Pre-Ballet & Tap B&C - Wed - Marissa */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (43, 'Sofia Nava') /* Pre-Ballet & Tap B&C - Wed - Marissa */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (40, 'Emmaline Ashton') /* Pre-Ballet & Tap B&C - Wed - Jillian */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (40, 'Presley Grubor') /* Pre-Ballet & Tap B&C - Wed - Jillian */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (40, 'Hannah DeSpain') /* Pre-Ballet & Tap B&C - Wed - Jillian */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (40, 'Aria Musarra') /* Pre-Ballet & Tap B&C - Wed - Jillian */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (40, 'Lilah Norris') /* Pre-Ballet & Tap B&C - Wed - Jillian */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (40, 'Teagan Turley') /* Pre-Ballet & Tap B&C - Wed - Jillian */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (40, 'Nora Scorzetti') /* Pre-Ballet & Tap B&C - Wed - Jillian */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (41, 'Emmaline Ashton') /* Pre-Ballet & Tap B&C - Wed - Jillian */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (41, 'Presley Grubor') /* Pre-Ballet & Tap B&C - Wed - Jillian */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (41, 'Hannah DeSpain') /* Pre-Ballet & Tap B&C - Wed - Jillian */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (41, 'Aria Musarra') /* Pre-Ballet & Tap B&C - Wed - Jillian */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (41, 'Lilah Norris') /* Pre-Ballet & Tap B&C - Wed - Jillian */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (41, 'Teagan Turley') /* Pre-Ballet & Tap B&C - Wed - Jillian */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (41, 'Nora Scorzetti') /* Pre-Ballet & Tap B&C - Wed - Jillian */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (42, 'Jane Hicks') /* Pre-Ballet & Tap D - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (42, 'Penelope Hicks') /* Pre-Ballet & Tap D - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (42, 'Addie Knisley') /* Pre-Ballet & Tap D - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (42, 'Isabella Ma') /* Pre-Ballet & Tap D - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (42, 'Pearl Nielsen') /* Pre-Ballet & Tap D - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (42, 'Mixon Jakubos') /* Pre-Ballet & Tap D - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (43, 'Jane Hicks') /* Pre-Ballet & Tap D - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (43, 'Penelope Hicks') /* Pre-Ballet & Tap D - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (43, 'Addie Knisley') /* Pre-Ballet & Tap D - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (43, 'Isabella Ma') /* Pre-Ballet & Tap D - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (43, 'Pearl Nielsen') /* Pre-Ballet & Tap D - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (43, 'Mixon Jakubos') /* Pre-Ballet & Tap D - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (30, 'Winnie Ady') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (30, 'Margot Denney') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (30, 'Ava Elgin') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (30, 'Quinn Ford') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (30, 'Lo Holloway') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (30, 'Charlotte Hughes') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (30, 'Keturah Lynch') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (30, 'Sadie McCrite') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (30, 'Eden Rosinbum') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (30, 'Elyssa Weidman') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (31, 'Winnie Ady') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (31, 'Margot Denney') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (31, 'Ava Elgin') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (31, 'Quinn Ford') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (31, 'Lo Holloway') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (31, 'Charlotte Hughes') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (31, 'Keturah Lynch') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (31, 'Sadie McCrite') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (31, 'Eden Rosinbum') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (31, 'Elyssa Weidman') /* Pre-Ballet & Tap E - Thursday */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (20, 'Eloise Arena') /* Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (20, 'Rylie Brown') /* Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (20, 'Juliana Conner') /* Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (20, 'Ellie Garibaldi') /* Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (20, 'Summer Lynch') /* Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (20, 'Eleanor Mann') /* Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (20, 'Madeline O''Connor') /* Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (20, 'Gabriela Ortiz') /* Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (20, 'Rylie Persons') /* Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (20, 'Madison Puckett') /* Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (20, 'Makenna Reeves') /* Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (20, 'Madison Schroff') /* Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (20, 'Kira Shkarayeva') /* Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (20, 'Ava Wolter') /* Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (20, 'Gracen Kantaras') /* Tap 1 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (29, 'Isla Bervig') /* Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (29, 'Kenley Block') /* Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (29, 'Juliette Boone') /* Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (29, 'Anysia Chandiramani') /* Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (29, 'Zyah Chandiramani') /* Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (29, 'Ellie Coffee') /* Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (29, 'Carson Hunter') /* Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (29, 'Avery Kidd') /* Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (29, 'Charis Morkunas') /* Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (29, 'Grace Rawlings') /* Tap 2 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (29, 'Ivan Shkarayev') /* Tap 2 */;
-- INSERT INTO dance_dancers (dance_id, dancer) VALUES (29, 'Ali Nava') /* Tap 2 */; -- Dropped out
INSERT INTO dance_dancers (dance_id, dancer) VALUES (11, 'Olivia Bervig') /* Tap 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (11, 'Ava Bervig') /* Tap 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (11, 'Tessa Block') /* Tap 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (11, 'Asher Boone') /* Tap 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (11, 'Clara Boone') /* Tap 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (11, 'Emmanuelle Carnahan') /* Tap 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (11, 'Jodi DeLaTorre') /* Tap 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (11, 'Addison Meng') /* Tap 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (11, 'Maia Hunter') /* Tap 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (11, 'Phoenix-Dawn Morkunas') /* Tap 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (11, 'Eden Rawlings') /* Tap 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (11, 'Jonah Wells') /* Tap 3 */;
INSERT INTO dance_dancers (dance_id, dancer) VALUES (11, 'Anneliese Wells') /* Tap 3 */;
