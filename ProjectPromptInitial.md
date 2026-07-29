# Baby Steps — Initial Project Prompt

> This is the original, verbatim project description. It is the source of truth for
> scope. `ProjectPlan.md` translates it into ordered, buildable steps.

---

I'd like to build a **desktop web-app** for a habit-tracking app called Baby Steps

I want to build this in pieces, because I want it to also teach me while we're building it. I want to use React, next JS, tailwind, and all the modern tools like that.

In addition to all the code for the web-app itself, there will be a learning/ folder, where for each change that we make (and they will be made slowly) it will also output an html document to explain the change made.

Each document should have a section for

- Tools: Explain the tools being used, why, a high-level description of what these tools do and why they're used broadly, and any other relevant information
- Intuition: Explain the core intuition for the code change. The focus here is to explain the essence, not the full details. Use concrete examples with toy data. Use figures and diagrams liberally
- Code: Do a high-level walkthrough of the changes to the code. Group/order the changes in an understandable way.

Format:

- Output a single self-contained HTML file which includes CSS and JavaScript. Make the whole thing one long page with section headers and a table of contents. Don't use tabs for the top-level structure. Basic responsive styling so you can view it on a phone is nice too. Put the file in a global place on my computer outside of the code repo, and make sure the filename always starts with today's date in `YYYY-MM-DD-` format, because it helps keep the files time-sorted and out of version control. For example: /tmp/2026-01-12-explanation-.html
- Be concise and clear. Do not use more words than necessary, keep it as brief and to the point as possible.
- Some tips on diagrams. Ideally, you should pick a small number of diagram families that can be reused throughout the explanation to explain various cases. Some useful kinds of diagrams:
    - A very simplified version of the UI that the user sees in the app, to explain UI changes.
    - A system diagram showing data flow or communication between components. Make sure to include example data here!
- Don't use ASCII diagrams. Always use simple HTML designs for your diagrams, HTML lists for lists of things, etc.
    - For code blocks, always use `<pre>` tags. If you use a custom styled div instead, it **must** have `white-space: pre-wrap` in its CSS, or the browser will collapse all newlines into a single line. Before saving the file, scan each code block in the HTML source and confirm its CSS includes `white-space: pre` or `pre-wrap`.
- Use callouts for key concepts or definitions, important edge cases, etc.

The Project has two pages — **Calendar** and **Trends** — switched via a top nav.

## Login

Users sign in with Google or Github. Data is persisted.

## Shell

- Top-nav. Name of app on top left, nav for calendar or trends in the middle, and color swapper and user profile on the right.
- Clicking nav links preventDefault and switches pages in state — no real navigation.

## Style

- Generous padding, airy feel
- Serif fonts, classical feel
- Color swapper allows for 2 different themes:  dark theme and clean stone/white

## Sticker model

- **Life areas** — six life areas, each assigned a color, roygbv, but shaded according to color palette
    - Spirituality red
    - Exercise blue
    - Work orange
    - Creativity & Play yellow
    - Romance & Adventure green
    - Friends & Family purple
- **Activities** -- belong to life areas, and users will decide these
    - example: lifting weights would belong to exercise, meditation to spirituality, etc.
- Two kinds of stickers on a day
    - Activities
        - A day may hold **any number** of activity stickers
        - Activities have a single character mark (a capital letter or emoji) that the user chooses, and the color of the sticker will be the life area
    - **Mood** — one optional mood per day. Five moods: Great, Good, Okay, Low, Rough.
        - represented with smily faces, and blue, green, yellow, orange, red respectively

## Calendar page

- User can use right and left arrows to go through different months, current month at the top (July 2026). Weeks start on Sundays.
- A series of stickers on the right that the user can drag and drop to the calendar days. Contains all the activities the user has + moods. Also a + button to add more stickers, which must be associated with a life area. Dragging a mood on a day that already has a mood will replace it.
- The drag and drop should feel delightful, and when dragging over the according calendar square should highlight to show the user where they'll be dragging to.
- Clicking on a sticker or on a life area shows an overview of the days that the sticker or life area was active, by highlighting the days that have that sticker (bg color in that stickers shade). Same with moods.
- Clicking an in-month day opens a **modal** to modify which activities were on that day (select or deselect) or modify the mood or add a mood

## Trends page

- three options: **Life Star / Pie / Bars** (controlled radios).
    - **Left — the visualization**, all computed from the stickers actually placed in the current month:
        - *Life Star* (default): a radar/star chart. Six spokes evenly spaced, concentric hairline rings at 25/50/75/100%, hairline axes, a polygon connecting each area's point where the radius is that area's share of the busiest area, dots at the vertices, and a Cormorant label at each spoke end reading "Area · count". This is the Artist's Way life star — the further a point reaches, the more of your attention that area took.
        - *Pie*: a donut of the same data; wedges filled with each area's ramp color, labeled with life area.
        - *Bars*: horizontal bars sorted by count — area name (Cormorant), a track with a ramp-colored fill, and the tabular count.
        - Option to switch to date range or year or all-time also supported
    - **Right — the readout**: a muted sentence explaining the chart, then a `.table` with columns **Area / Marks / Share** (tabular figures, a small ramp-color swatch beside each area name), and below it a **"Mood across the month"** strip listing each mood as a colored dot + name + count.

Ensure that we go one small step at a time, so it is easy to track the changes and be able to conceptualize about the changes made. Justify decisions or ask the user to choose between options.

Save this description as ProjectPromptInitial.md. Plan the steps for execution, and drop the plan in ProjectPlan.md. Then we can look that over and get started. The Project Plan should be very detailed but concise without being wordy. It will explain what it each change will do, including for someone who is new
