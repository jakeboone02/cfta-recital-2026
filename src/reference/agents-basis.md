## Setup

The recital will take place on April 24-25, with three shows: Friday night, Saturday morning, and Saturday afternoon.

The recital dances are divided into three groups A, B, and C, with either 10 or 11 dances in each group.
(For the purpose of this exercise, two dances in each group are placeholders for "Predance" dances, and don't need any real information.)

Each show will have two parts (part 1 and part 2), and each group will dance in two recitals:

- Friday night (`show_id` 1) will be group A then group B
- Saturday morning (`show_id` 2) will be group C then group A
- Saturday afternoon (`show_id` 3) will be group B then group C

Three dances will not be aasigned to groups A/B/C but will be featured in all three shows:

- "SpecTAPular" will be the first dance of every show
- "Hip Hop" will be the second-to-last dance of every show
- "Finale" will be the last dance of every show

For example, show 1 order will be SpecTAPular, Group A, Group B, Hip Hop, Finale.

Teachers (`dancers.is_teacher = 1`) will not participate in "SpecTAPular".

## Database

The database setup script is @src/create_database.sql. Broadly, relationships boil down to this:

- Each dancer is in one or more classes.
- Each class is participating in one or more dances.
- Each dance is assigned to a recital group (except for the three "every show" dances)
- The order of the dances within each group are defined in `recital_groups.show_order` as a JSON array of numbers representing each `dance_id` or "PRE" for pre-dance placeholders.
