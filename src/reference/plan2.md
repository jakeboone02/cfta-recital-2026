## Goal

Make an optimum recital order for easiest execution for the performers, teachers, and helpers.

## Setup

The recital will take place on April 24-25, with three shows: Friday night, Saturday morning, and Saturday afternoon.

The recital dances are divided into three groups A, B, and C, with either 10 or 11 dances in each group.
(For the purpose of this exercise, two dances in each group are placeholders for "Predance" dances, and don't need any real information.)

Each show will have two parts (part 1 and part 2), and each group will dance in two recitals:

- Friday night (`recital_id` 1) will be group A then group B
- Saturday morning (`recital_id` 2) will be group C then group A
- Saturday afternoon (`recital_id` 3) will be group B then group C

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

## Command

Evaluate the data and come up with an optimal show order, or a method to determine the optimal order. Propose multiple options if it would be worthwhile.

## Requirements

In order of importance:

1. No dancers should be in consecutive dances
2. No dancers should be in dances that only have one dance between them (in reality this is probably not possible to enforce at 100%, so let’s say “a minimal number of dancers” instead of absolutely zero)
3. Dances of the same style should not be adjacent (a Tap dance should not follow another Tap dance, for example)—note that SpecTAPular counts as a Tap dance
4. Baby dances (“Pre” and “Combo” classes) should not be adjacent, nor should they start or end a group (if necessary, one can start a group, but not end)
5. Try to keep the number of families (guessed by the number of unique last names) roughly balanced among the groups.

### Additional restrictions

- Adult Tap 1 must be in Group C
- Adult Tap 2 must be in Group B
- Ms. Haley’s dance must be in Group C
- Each Combo class must keep both of their dances in the same group
- Use placeholders for two (2) Pre-dance classes in each group, and put them at roughly the 1/3 point and the 2/3 point of each group’s order

## Tips

- The view `recital_show_order` shows the entire show order with every dance.
- The view `consecutive_dances_tracker` is the same as `recital_show_order`, plus (1) a list of the dancers in each dance, (2) a list of dancers in the dance that are also in the next dance, and (3) a list of dancers in the dance that are also in the dance after next.

Before finalizing the plan, ask as many clarifying questions as you need.
