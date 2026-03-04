Update the web application served by @server.ts and @index.html. Ignore the existing @src/App.tsx and related files; they can be completely rewritten.

## Goal

Make a SPA that allows the director of the recital to finalize the recital order.

## Setup

The recital will take place on April 24-25, with three shows: Friday night, Saturday morning, and Saturday afternoon.

The recital dances are divided into three groups A, B, and C, with either 10 or 11 dances in each group.
(For the purpose of this SPA, two dances in each group are placeholders for "Predance" dances, and don't need any real information.)

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

## Requirements

### Layout

The screen should be divided vertically in two parts, the "working" area on the left and the "report" area on the right.

#### Working area

- The left should list the recital groups A, B, and C, and the dances within each group.
- The "every show" dances do not need to be in this area.
- The director should be able to drag-and-drop each dance to a different place in the order, or even to a different group.
- Each dance style should have its own color. See `styleColors` in @src/App.tsx for a starting point.

#### Report area

- The right should list the _entire_ show order with all dances in each show, including the "every show" dances.
- Each dance in this area should show a list of dancers that are in the next dance and dancers that are in the dance after next ("Finale" doesn't count for this metric, even though all dancers are in it).
- Other metrics to display:
  - A count of each dance style within each group(e.g., "4 Tap, 3 Ballet, 2 Musical Theater")
  - A count of distinct `last_name` values in each recital (to give us an idea of how many families will need tickets for each show)
  - A count of dances by choreographer for each show

### Persistence

- The show order, as defined by the director using drag-and-drop, should be persisted using `localStorage`.
- The show order should also be exportable as a CSV file (use `papaparse` which is already installed).

## Technical requirements

- Use Bun for all server-related code
- Keep dependencies to a minimum, but don't re-invent the wheel if there is a light-weight library with an elegant solution to a problem
- Make the code terse but readable
- Make the codebase very small -- do not add code if you don't have to and don't be verbose with code you do write

## Tips

- The view `recital_show_order` shows the entire show order with every dance.
- The view `consecutive_dances_tracker` is the same as `recital_show_order`, with a list of the dancers in each dance, a list of dancers in the dance that are also in the next dance, and a list of dancers in the dance that are also in the dance after next.

Before finalizing the plan, ask as many clarifying questions as you need to be sure of what you want to build.
