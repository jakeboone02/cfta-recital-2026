# CFTA Recital Show-Order Planner

A web application for Copper Hills Center for the Arts (CFTA) that helps organize dances across multiple recital shows. The app optimizes show order to minimize dancer conflicts between consecutive dances, balance dance styles, and handle intermission placement.

## How It Works

Each year's recital data is loaded into the app via CSV files. The app then lets you:

- Assign dances to **recital groups** (lettered divisions like A, B, C)
- Define which groups appear in each **show** and in what order
- Drag and drop to rearrange the **show order** within each group
- Run the **optimizer** to automatically find a good ordering
- View reports on dancer conflicts, style distribution, and more

---

## Key Concepts

Before preparing your CSV files, it helps to understand how the data fits together.

### Dances

A **dance** is an individual performance piece — typically one song, one routine. Each dance has a style (Ballet, Tap, Jazz, etc.) and is performed by one or more classes.

### Classes

A **class** is a group of dancers who learn together on a regular schedule (e.g., "Ballet & Tap Combo A, Mon 4:15pm"). A single class may perform multiple dances (for example, a combo class does both a Ballet dance and a Tap dance).

### Dancers

A **dancer** is an individual performer enrolled in one or more classes. A dancer's name (`"First Last"`) is their unique identifier. Some participants are **teachers** who perform in certain dances — these are flagged with `is_teacher`.

### Recital Groups

Dances are divided into **recital groups** identified by letters (A, B, C, etc.). Groups let you split a large number of dances across shows so each show is a manageable length. A typical setup might have three groups where each group appears in two of three shows.

### Shows

A **show** is one complete performance with an audience. Each show is composed of a sequence of recital groups. For example, a Friday show might run groups A then B, while a Saturday morning show runs C then A.

The `group_order` field on each show defines this sequence — it's a JSON array of group names like `["A","B"]`.

### Fixed-Order Groups (Every-Show Dances)

Some dances appear in **every** show — maybe an opener, a high-energy number near the end, and a finale. These are placed in their own **fixed-order groups** that have the `has_fixed_order` flag set to `1`. The optimizer won't rearrange dances within fixed-order groups, but you can still drag and drop dances in and out of them in the UI.

Fixed-order groups are included in each show's `group_order` alongside regular groups. For example, if `OPENER` contains the opening number and `CLOSER` contains Hip Hop and Finale:

```
group_order: ["OPENER", "A", "B", "CLOSER"]
```

This means the show runs: opener → Group A dances → Group B dances → Hip Hop → Finale.

You can place fixed-order groups anywhere in the sequence — not just at the start or end. For example, a `MIDDLE` group between two regular groups is perfectly valid: `["OPENER", "A", "MIDDLE", "B", "CLOSER"]`.

### Show Order & Placeholders

Within each recital group, dances are performed in a specific order. The **show order** is a JSON array of dance IDs with optional `"PLACEHOLDER"` markers indicating pre-dance or intermission slots — typically for young dancers' classes that only appear in one show. The actual pre-dance class names and participants can be filled in on the printed program.

Example: `[5, 12, "PLACEHOLDER", 8, 3, "PLACEHOLDER", 19, 7]` means: dance 5, dance 12, placeholder slot, dance 8, dance 3, placeholder slot, dance 19, dance 7.

---

## CSV Files

You need to prepare **7 CSV files** to load a recital's data. They must be uploaded in a specific order because later files reference IDs defined in earlier ones.

> **Tip:** You can create these in any spreadsheet app (Google Sheets, Excel, etc.) and export as CSV. Make sure to use UTF-8 encoding and include the header row.

### Upload Order

| Order | File                 | Purpose                               |
| ----- | -------------------- | ------------------------------------- |
| 1     | `dancers.csv`        | All performers (dancers and teachers) |
| 2     | `classes.csv`        | Dance classes                         |
| 3     | `dances.csv`         | Individual dance performances         |
| 4     | `class_dances.csv`   | Which classes perform which dances    |
| 5     | `dancer_classes.csv` | Which dancers are in which classes    |
| 6     | `shows.csv`          | Show schedule and group assignments   |
| 7     | `recital_groups.csv` | Initial dance order within groups     |

---

### 1. `dancers.csv`

Every person who will appear on stage, including teachers who perform.

| Column       | Required | Type   | Description                                          |
| ------------ | -------- | ------ | ---------------------------------------------------- |
| `first_name` | Yes      | Text   | Dancer's first name                                  |
| `last_name`  | Yes      | Text   | Dancer's last name                                   |
| `is_teacher` | Yes      | 0 or 1 | `1` if this person is a teacher/instructor, else `0` |

**Example:**

```csv
first_name,last_name,is_teacher
Jane,Smith,0
Emily,Johnson,0
Angie,Wells,1
```

**Notes:**

- Each dancer's full name (`first_name` + space + `last_name`) must be unique.

---

### 2. `classes.csv`

Every class offered at the studio that is performing in the recital.

| Column       | Required | Type    | Description                                     |
| ------------ | -------- | ------- | ----------------------------------------------- |
| `class_id`   | Yes      | Integer | A unique ID you assign (1, 2, 3, …)             |
| `teacher`    | Yes      | Text    | Name of the instructor                          |
| `class_name` | Yes      | Text    | Descriptive name (e.g., "Ballet & Tap Combo A") |
| `class_time` | Yes      | Text    | When the class meets (e.g., "Mon 4:15pm")       |

**Example:**

```csv
class_id,teacher,class_name,class_time
1,Ms. Angie,Ballet & Tap Combo A,Mon 4:15pm
2,Ms. Marissa,Ballet & Tap Combo B,Tue 5:15pm
3,Ms. Jillian,Jazz 1,Wed 3:00pm
```

**Notes:**

- `class_id` values are your own numbering — they just need to be unique integers.
- These IDs are used to link classes to dances and dancers in later CSV files.

---

### 3. `dances.csv`

Every dance that will be performed in the recital, including every-show dances.

| Column                | Required | Type    | Description                                                                                    |
| --------------------- | -------- | ------- | ---------------------------------------------------------------------------------------------- |
| `dance_id`            | Yes      | Integer | A unique ID you assign (1, 2, 3, …)                                                            |
| `dance_style`         | Yes      | Text    | Style category (see example values below)                                                      |
| `choreography`        | No       | Text    | Choreographer name                                                                             |
| `dance_name`          | Yes      | Text    | Display name for the dance                                                                     |
| `song`                | No       | Text    | Song title                                                                                     |
| `artist`              | No       | Text    | Song artist                                                                                    |
| `skip_overlap_checks` | No       | 0 or 1  | `1` to skip dancer-overlap scoring for this dance (default `0`)                                |
| `exclude_teachers`    | No       | 0 or 1  | `1` if teachers listed in this dance's classes are not actually performing in it (default `0`) |

**Example `dance_style` values:** `All`, `Ballet`, `Hip Hop`, `Jazz`, `Modern/Lyrical`, `Musical Theater`, `Tap`

> Use `All` for dances that span all styles (like a full-cast opener or finale).

**Example:**

```csv
dance_id,dance_style,choreography,dance_name,song,artist,skip_overlap_checks,exclude_teachers
1,Tap,Ms. Angie,SpecTAPular,Footloose,Kenny Loggins,1,1
2,Hip Hop,Mr. Noble,Hip Hop,Uptown Funk,Bruno Mars,0,0
3,Ballet,Ms. Jillian,Swan Lake,Swan Lake Suite,Tchaikovsky,0,0
4,Tap,Ms. Angie,Singin' in the Rain,Singin' in the Rain,Gene Kelly,0,0
5,All,Staff,Finale,We Are Family,Sister Sledge,1,0
```

**Notes:**

- Include every-show dances here (opener, Hip Hop, finale, etc.) — they're regular dances that happen to appear in every show.
- `dance_id` values are referenced by `class_dances.csv` and `recital_groups.csv`.
- Set `skip_overlap_checks` to `1` for dances where dancer overlap with adjacent dances doesn't matter (e.g., an opener or finale where everyone participates). These dances will show muted overlap indicators in the reports.
- Set `exclude_teachers` to `1` for dances where teachers are listed as members of participating classes but are **not** actually performing. For example, a teacher may be enrolled in Adult Tap but does not perform in the opening number — setting this flag excludes them from that dance's participant list and overlap calculations.

---

### 4. `class_dances.csv`

Links classes to the dances they perform. A class can perform multiple dances (combo classes), and a dance can be performed by multiple classes.

| Column     | Required | Type    | Description                                |
| ---------- | -------- | ------- | ------------------------------------------ |
| `class_id` | Yes      | Integer | References a `class_id` from `classes.csv` |
| `dance_id` | Yes      | Integer | References a `dance_id` from `dances.csv`  |

**Example:**

```csv
class_id,dance_id
1,3
1,4
2,3
```

This means: Class 1 performs dances 3 and 4 (a combo class). Class 2 also performs dance 3.

**Notes:**

- For combo classes (one class performing two dances), add two rows — one per dance.
- For dances where many classes participate, add a row for each class in that dance.

---

### 5. `dancer_classes.csv`

Links individual dancers to their classes.

| Column        | Required | Type    | Description                                            |
| ------------- | -------- | ------- | ------------------------------------------------------ |
| `class_id`    | Yes      | Integer | References a `class_id` from `classes.csv`             |
| `dancer_name` | Yes      | Text    | Full name as `"First Last"` — must match `dancers.csv` |

**Example:**

```csv
class_id,dancer_name
1,Jane Smith
1,Emily Johnson
2,Emily Johnson
3,Jane Smith
```

This means: Jane and Emily are in class 1. Emily is also in class 2. Jane is also in class 3.

**Notes:**

- **Names must match exactly** — `dancer_name` must be the same `first_name` + space + `last_name` from `dancers.csv`. Watch out for extra spaces, different capitalization, or nicknames.

---

### 6. `shows.csv`

Defines each show's schedule and which recital groups it contains.

| Column             | Required | Type    | Description                                               |
| ------------------ | -------- | ------- | --------------------------------------------------------- |
| `show_id`          | Yes      | Integer | A unique ID for the show (1, 2, 3, …)                     |
| `group_order`      | Yes\*    | JSON    | JSON array of group names in performance order            |
| `show_description` | Yes      | Text    | Human-readable name (e.g., "Friday Evening Recital")      |
| `show_time`        | Yes      | Text    | Date and time in ISO 8601 (e.g., `"2027-04-23 18:00:00"`) |

**Example:**

```csv
show_id,group_order,show_description,show_time
1,"[""OPENER"",""A"",""B"",""CLOSER""]",Friday Evening Recital,2027-04-30 18:00:00
2,"[""OPENER"",""C"",""A"",""CLOSER""]",Saturday Morning Recital,2027-05-01 10:00:00
3,"[""OPENER"",""B"",""C"",""CLOSER""]",Saturday Afternoon Recital,2027-05-01 13:00:00
```

**Notes:**

- `group_order` is a JSON array inside a CSV field. In most spreadsheet apps, you type `["OPENER","A","B","CLOSER"]` in the cell and the CSV export handles the quoting. If editing the raw CSV, you'll need to quote the column contents and double-quote the values within it: `"[""OPENER"",""A"",""B"",""CLOSER""]"`.
- The app also accepts relaxed JSON formatting in CSV uploads — you can write `"[OPENER,A,B,CLOSER]"` (without quoting the values) and the app will normalize it automatically.
- The order of group names determines the performance sequence. The above example plays: opener → Group A → Group B → closer dances.
- Fixed-order groups (like `OPENER` and `CLOSER`) typically appear in every show's `group_order`. The regular groups (A, B, C) are mixed and matched across shows so each appears in two of three shows.

---

### 7. `recital_groups.csv`

Defines the recital groups and the initial dance order within each group. The app's optimizer and drag-and-drop UI will rearrange regular groups — this file just provides the starting point.

| Column            | Required | Type   | Description                                                        |
| ----------------- | -------- | ------ | ------------------------------------------------------------------ |
| `recital_group`   | Yes      | Text   | Group name (e.g., `A`, `B`, `C`, `OPENER`, `CLOSER`)               |
| `show_order`      | Yes      | JSON   | JSON array of dance IDs and `"PLACEHOLDER"` markers                |
| `has_fixed_order` | No       | 0 or 1 | `1` if the optimizer should not rearrange this group (default `0`) |

**Example:**

```csv
recital_group,show_order,has_fixed_order
OPENER,"[1]",1
A,"[3,4,""PLACEHOLDER"",8,11,""PLACEHOLDER"",15,9]",0
B,"[12,7,""PLACEHOLDER"",6,14,""PLACEHOLDER"",10,13]",0
C,"[16,17,""PLACEHOLDER"",18,19,""PLACEHOLDER"",20,21]",0
CLOSER,"[2,5]",1
```

**Notes:**

- Dance IDs reference the `dance_id` values from `dances.csv`.
- `"PLACEHOLDER"` is a special marker for a single-show slot, typically for a young dancers' pre-dance class.
- Fixed-order groups (`OPENER`, `CLOSER` in this example) have `has_fixed_order` set to `1`. The optimizer won't rearrange their dances, but you can still drag and drop dances in and out of them in the UI.
- The optimizer rearranges the order of dances within regular groups (A, B, C) but won't move dances between groups. Choose your initial groupings thoughtfully — the optimizer fine-tunes the sequence, not the group assignments.
- The app accepts relaxed JSON for `show_order` — you can write `"[1,PLACEHOLDER,2,3]"` or even `"1,PLACEHOLDER,2,3"` and it will be normalized automatically.
- Like `group_order`, strictly-formatted JSON needs proper CSV quoting if editing the raw file.

---

## Designing the Show Structure

Here's a general approach for setting up a new year's recital:

### 1. List all dances and classify them

Start by listing every dance in `dances.csv`. Decide which dances are **fixed** (opener, closer, etc.) and which are **regular** dances that need to be split into groups. Mark fixed dances with `skip_overlap_checks = 1` if their dancer overlaps don't matter, and `exclude_teachers = 1` if teachers will not participate in that number.

### 2. Choose your recital groups

Divide the regular dances into groups (A, B, C, etc.) trying to:

- Keep groups roughly equal in size
- Keep combo class dances (two dances from the same class) in the same group

### 3. Design the show rotation

Decide how groups rotate across shows. A common pattern with 3 groups and 3 shows:

| Show               | Groups |
| ------------------ | ------ |
| Friday Evening     | A, B   |
| Saturday Morning   | C, A   |
| Saturday Afternoon | B, C   |

Each group appears in exactly 2 of the 3 shows. Add your fixed-order groups to each show's `group_order` in the positions you want them (typically opener first, closer last).

### 4. Set initial show orders

For each group, put the dances in a reasonable starting order and add `"PLACEHOLDER"` markers where you want pre-dance slots. The optimizer will improve the order from there.

### 5. Upload and iterate

Upload all 7 CSV files in order, then use the app to run the optimizer and fine-tune the show order with drag-and-drop.

---

## Tips & Common Pitfalls

- **Name matching is exact.** If a dancer is `Jane Smith` in `dancers.csv`, they must be `Jane Smith` (not `jane smith` or `Jane  Smith`) in `dancer_classes.csv`. Double-check for trailing spaces.

- **Upload order matters.** The app links records by ID. If you upload `class_dances.csv` before `classes.csv`, the class IDs won't exist yet and the upload will fail.

- **Combo classes need care.** If a class does both a Ballet and a Tap dance, add two rows in `class_dances.csv` (one per dance). Put both dances in the same recital group. The optimizer automatically detects combo pairs (any class linked to 2+ dances in regular groups) and tries to keep those dances apart within a show to allow time for costume changes.

- **Teacher exclusion is per-dance.** Set `exclude_teachers = 1` on any dance where teachers (`is_teacher = 1`) are listed as members of participating classes but aren't actually performing in that dance. This removes them from the dance's participant list entirely, so they won't create false overlap conflicts.

- **Overlap checks are per-dance.** Set `skip_overlap_checks = 1` on dances where dancer overlap with adjacent dances shouldn't be penalized (e.g., an opener where nearly everyone participates). These dances show muted overlap indicators in the reports for information only.

- **JSON in CSV fields.** The `group_order` and `show_order` columns contain JSON arrays. When editing in a spreadsheet, just type the JSON naturally — the spreadsheet will handle CSV quoting on export. When editing raw CSV, wrap the JSON in double-quotes and escape inner quotes by doubling them. The app also accepts relaxed formats like `[OPENER,A,B,CLOSER]` (without inner quotes) and will normalize them automatically.

- **IDs are yours to choose.** The `class_id`, `dance_id`, and `show_id` values are arbitrary integers you assign. They just need to be unique within each file and consistent across files. Simple sequential numbering (1, 2, 3, …) works great, and spreadsheet applications like Microsoft Excel and Apple Numbers can help by auto-generating sequences.
