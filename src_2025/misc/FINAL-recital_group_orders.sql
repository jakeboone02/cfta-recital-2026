PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE recital_group_orders (
  recital_id text check (recital_ID IN ('A', 'B', 'C')) null,
  dance_id int not null,
  follows_dance_id int
);
INSERT INTO recital_group_orders VALUES(NULL,6,NULL);
INSERT INTO recital_group_orders VALUES(NULL,1,6);
INSERT INTO recital_group_orders VALUES(NULL,11,1);
INSERT INTO recital_group_orders VALUES(NULL,10,11);
INSERT INTO recital_group_orders VALUES(NULL,5,10);
INSERT INTO recital_group_orders VALUES(NULL,2,5);
INSERT INTO recital_group_orders VALUES(NULL,9,2);
INSERT INTO recital_group_orders VALUES(NULL,8,9);
INSERT INTO recital_group_orders VALUES(NULL,7,8);
INSERT INTO recital_group_orders VALUES(NULL,3,7);
INSERT INTO recital_group_orders VALUES(NULL,26,NULL);
INSERT INTO recital_group_orders VALUES(NULL,14,26);
INSERT INTO recital_group_orders VALUES(NULL,16,14);
INSERT INTO recital_group_orders VALUES(NULL,13,16);
INSERT INTO recital_group_orders VALUES(NULL,18,13);
INSERT INTO recital_group_orders VALUES(NULL,19,18);
INSERT INTO recital_group_orders VALUES(NULL,20,19);
INSERT INTO recital_group_orders VALUES(NULL,12,20);
INSERT INTO recital_group_orders VALUES(NULL,15,12);
INSERT INTO recital_group_orders VALUES(NULL,4,NULL);
INSERT INTO recital_group_orders VALUES(NULL,29,4);
INSERT INTO recital_group_orders VALUES(NULL,21,29);
INSERT INTO recital_group_orders VALUES(NULL,23,21);
INSERT INTO recital_group_orders VALUES(NULL,25,23);
INSERT INTO recital_group_orders VALUES(NULL,27,25);
INSERT INTO recital_group_orders VALUES(NULL,22,27);
INSERT INTO recital_group_orders VALUES(NULL,17,22);
INSERT INTO recital_group_orders VALUES(NULL,24,17);
INSERT INTO recital_group_orders VALUES(NULL,28,24);
INSERT INTO recital_group_orders VALUES('A',30,2);
INSERT INTO recital_group_orders VALUES('A',31,18);
INSERT INTO recital_group_orders VALUES('A',40,26);
INSERT INTO recital_group_orders VALUES('A',41,10);
INSERT INTO recital_group_orders VALUES('B',39,26);
INSERT INTO recital_group_orders VALUES('B',38,21);
INSERT INTO recital_group_orders VALUES('B',34,18);
INSERT INTO recital_group_orders VALUES('B',35,27);
INSERT INTO recital_group_orders VALUES('C',36,10);
INSERT INTO recital_group_orders VALUES('C',37,21);
INSERT INTO recital_group_orders VALUES('C',42,27);
INSERT INTO recital_group_orders VALUES('C',43,2);
COMMIT;
