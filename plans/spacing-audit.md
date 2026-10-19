# Spacing audit

The redesign set a spacing scale of **8 · 14 · 18 · 22 · 30 · 44 · 64 · 96 px** (`plans/redesign/README.md`). This audit lists every spacing class of 10px or more that isn't on that scale, the step it would snap to, and where it is. **Applied 2026-10-18** with 16→18, 20→22, 80→64, 12→14, and with 10px values included. Tokens are `s1`–`s8` in `app/globals.css`.

181 values are off the scale. Left out on purpose: values under 10px (fine adjustments inside components), position offsets like `top-3`, stock shadcn files in `components/ui/`, the motion jig, and `/dev/system`.

## What would change on screen

| Now | Snaps to | Uses | What you'd see |
|---|---|---|---|
| 10px | 8 | 11 | Slightly tighter padding in rows and table cells. |
| 12px | 14 | 38 | Small clusters (mood row, tray groups, list rows) loosen a little. |
| **16px** | **14 or 18?** | 35 | Tie. The most common gap between controls and form rows. |
| **20px** | **18 or 22?** | 11 | Tie. Today's header-to-stickers gap, Trends section gaps. |
| 24px | 22 | 35 | Barely visible. Settings and onboarding padding, footer gaps. |
| 28px | 30 | 3 | Barely visible. |
| 32px | 30 | 13 | Barely visible. Landing copy spacing, onboarding sections. |
| 40px | 44 | 13 | A little more air above sections and between columns. |
| 48px | 44 | 11 | The landing indents and onboarding margins pull in 4px. |
| 56px | 64 | 7 | **Noticeable.** The gap above "what have you been up to?" on the landing page and above the desktop sticker tray grow 8px; Trends' two-column gap widens. |
| **80px** | **64 or 96?** | 4 | Tie. The landing and notice pages' top and bottom padding. |

## Decisions for you

1. **16px → 14 or 18?** I'd pick **18**. Snapping down tightens forms and Trends, and the stationery look leans roomy.
2. **20px → 18 or 22?** I'd pick **22**. Today already uses 22 for the gap between stickers, so the header gap would match it.
3. **80px → 64 or 96?** I'd pick **64**. 96 adds a lot above the landing hero.
4. **12px → 14, or keep 12 as a fine adjustment?** It's the most-used off-scale value. I'd snap it, but it's the change most likely to feel off in tight rows.

## By screen

### App frame (every page) (27)

| Now | Snaps to | Where |
|---|---|---|
| 10px | 8 | `pt-2.5` not-found.tsx:55, `py-2.5` page.tsx:33 |
| 12px | 14 | `pl-3` not-found.tsx:30, `pr-3` not-found.tsx:55, `pl-3` not-found.tsx:56, `pb-3` SheetHeader.tsx:13, `px-3` Chip.tsx:21, `mt-3` NoticePage.tsx:34, `px-3` Menu.tsx:39, `px-3` Menu.tsx:53 |
| 16px | 14 or 18? | `sm:pb-4` SheetHeader.tsx:13, `gap-4` SheetHeader.tsx:14 |
| 20px | 18 or 22? | `py-5` AppShell.tsx:62 |
| 24px | 22 | `gap-x-6` SiteFooter.tsx:10, `gap-6` SiteFooter.tsx:12, `gap-6` SheetHeader.tsx:13, `pt-6` SheetHeader.tsx:13, `mt-6` NoticePage.tsx:37 |
| 32px | 30 | `gap-8` TopNav.tsx:56, `gap-8` SheetHeader.tsx:15 |
| 40px | 44 | `mb-10` not-found.tsx:28, `lg:py-10` AppShell.tsx:62, `sm:pt-10` SheetHeader.tsx:13, `mt-10` NoticePage.tsx:40 |
| 48px | 44 | `pt-12` NoticePage.tsx:31 |
| 80px | 64 or 96? | `pb-20` NoticePage.tsx:31, `sm:pt-20` NoticePage.tsx:31 |

### Landing (13)

| Now | Snaps to | Where |
|---|---|---|
| 12px | 14 | `gap-y-3` page.tsx:74 |
| 32px | 30 | `mt-8` page.tsx:36, `mt-8` page.tsx:74, `gap-x-8` page.tsx:74 |
| 40px | 44 | `pt-10` page.tsx:69 |
| 48px | 44 | `pt-12` page.tsx:29, `gap-12` page.tsx:30, `lg:mx-12` page.tsx:31, `mr-12` page.tsx:58, `lg:px-12` page.tsx:69 |
| 56px | 64 | `mt-14` page.tsx:69 |
| 80px | 64 or 96? | `pb-20` page.tsx:29, `sm:pt-20` page.tsx:29 |

### Today and the sticker tray (19)

| Now | Snaps to | Where |
|---|---|---|
| 10px | 8 | `mt-2.5` TrayGroup.tsx:48, `pt-2.5` AddStickersSheet.tsx:63, `px-2.5` StickerRetire.tsx:98, `px-2.5` EditStickerForm.tsx:68 |
| 12px | 14 | `gap-3` MoodRow.tsx:31, `mt-3` StickerTray.tsx:198, `gap-y-3` StickerTray.tsx:198, `gap-y-3` TrayGroup.tsx:48, `gap-3` AddStickersSheet.tsx:62 |
| 16px | 14 or 18? | `gap-4` StickerFields.tsx:173, `gap-4` AddStickersSheet.tsx:76, `px-4` MarkPicker.tsx:173 |
| 20px | 18 or 22? | `gap-5` TodayView.tsx:71, `gap-5` StickerFields.tsx:113 |
| 24px | 22 | `gap-6` StickerTray.tsx:68, `gap-6` AddStickersSheet.tsx:91 |
| 28px | 30 | `gap-y-7` StickerTray.tsx:90 |
| 40px | 44 | `gap-x-10` StickerTray.tsx:90 |
| 48px | 44 | `pr-12` AddStickersSheet.tsx:76 |

### Calendar (32)

| Now | Snaps to | Where |
|---|---|---|
| 10px | 8 | `pt-2.5` DaySheet.tsx:45, `py-2.5` WeekList.tsx:62 |
| 12px | 14 | `gap-3` DaySheet.tsx:44, `gap-3` MonthDots.tsx:158, `gap-3` WeekList.tsx:62, `mt-3` WeekList.tsx:117, `gap-x-3` DayPanel.tsx:60, `gap-y-3` DayPanel.tsx:60, `px-3` CalendarBoard.tsx:374, `px-3` CalendarBoard.tsx:443, `px-3` CalendarBoard.tsx:446 |
| 16px | 14 or 18? | `lg:pr-4` CalendarPanel.tsx:161, `lg:pl-4` CalendarPanel.tsx:161, `gap-4` MonthDots.tsx:139, `pt-4` MonthDots.tsx:139, `mt-4` DayPanel.tsx:93 |
| 20px | 18 or 22? | `gap-5` MonthDots.tsx:65, `pt-5` DayPanel.tsx:89, `sm:gap-5` PeriodHeader.tsx:24 |
| 24px | 22 | `gap-6` MonthDots.tsx:143, `gap-6` PeriodHeader.tsx:22, `mt-6` CalendarBoard.tsx:374, `mt-6` CalendarSkeleton.tsx:20 |
| 28px | 30 | `gap-7` DayPanel.tsx:35, `gap-y-7` CalendarSkeleton.tsx:20 |
| 32px | 30 | `gap-8` CalendarPanel.tsx:124 |
| 40px | 44 | `lg:gap-10` CalendarPanel.tsx:127, `pt-10` CalendarBoard.tsx:428, `pt-10` CalendarSkeleton.tsx:18, `gap-x-10` CalendarSkeleton.tsx:20 |
| 56px | 64 | `mt-14` CalendarBoard.tsx:428, `mt-14` CalendarSkeleton.tsx:18 |

### Trends (36)

| Now | Snaps to | Where |
|---|---|---|
| 10px | 8 | `gap-2.5` MoodBars.tsx:22, `py-2.5` HabitTable.tsx:66, `gap-2.5` HabitTable.tsx:190 |
| 12px | 14 | `gap-3` MoodBars.tsx:20, `pt-3` MoodLine.tsx:42, `pr-3` MoodLine.tsx:42, `pt-3` TrendsBoard.tsx:207, `py-3` HabitList.tsx:55, `gap-3` HabitList.tsx:87, `py-3` HabitList.tsx:87, `pt-3` CategoryBars.tsx:62 |
| 16px | 14 or 18? | `gap-4` TrendsBoard.tsx:110, `gap-4` TrendsBoard.tsx:130, `pr-4` HabitTable.tsx:67, `px-4` HabitTable.tsx:67, `gap-4` HabitTable.tsx:140, `gap-4` HabitTable.tsx:149, `gap-x-4` HabitTable.tsx:397, `gap-4` CategoryBars.tsx:17, `gap-4` TrendsSkeleton.tsx:11, `gap-4` TrendsSkeleton.tsx:16 |
| 20px | 18 or 22? | `mb-5` MoodLine.tsx:36, `gap-5` TrendsBoard.tsx:116, `mb-5` TrendsBoard.tsx:220 |
| 24px | 22 | `pb-6` MoodLine.tsx:42, `lg:gap-6` TrendsBoard.tsx:110, `sm:gap-6` TrendsBoard.tsx:111, `lg:gap-6` TrendsSkeleton.tsx:11, `sm:gap-6` TrendsSkeleton.tsx:12 |
| 32px | 30 | `pl-8` MoodLine.tsx:42, `gap-8` TrendsBoard.tsx:108, `gap-8` TrendsSkeleton.tsx:8 |
| 40px | 44 | `px-10` TrendsBoard.tsx:227 |
| 56px | 64 | `gap-x-14` TrendsBoard.tsx:145, `gap-x-14` TrendsBoard.tsx:197, `gap-x-14` TrendsSkeleton.tsx:22 |

### Onboarding (33)

| Now | Snaps to | Where |
|---|---|---|
| 12px | 14 | `gap-y-3` Steps.tsx:52, `gap-y-3` Steps.tsx:58, `gap-3` Steps.tsx:300, `gap-3` page.tsx:50 |
| 16px | 14 or 18? | `gap-4` Steps.tsx:87, `mt-4` Steps.tsx:178, `gap-4` Steps.tsx:240, `mt-4` Steps.tsx:268, `gap-4` Steps.tsx:268, `gap-4` Steps.tsx:286, `gap-4` Steps.tsx:311 |
| 20px | 18 or 22? | `sm:px-5` Steps.tsx:172, `mt-5` Steps.tsx:240 |
| 24px | 22 | `gap-x-6` Steps.tsx:52, `pt-6` Steps.tsx:52, `gap-x-6` Steps.tsx:58, `pt-6` Steps.tsx:74, `mt-6` Steps.tsx:87, `mt-6` Steps.tsx:110, `mt-6` Steps.tsx:117, `py-6` Steps.tsx:172, `mt-6` Steps.tsx:286 |
| 32px | 30 | `mt-8` Steps.tsx:99, `mt-8` Steps.tsx:160, `mt-8` Steps.tsx:279, `pt-8` Steps.tsx:279 |
| 40px | 44 | `gap-10` Steps.tsx:81, `pb-10` page.tsx:63 |
| 48px | 44 | `pb-12` Steps.tsx:81, `mb-12` Steps.tsx:160, `mb-12` Steps.tsx:279, `pt-12` page.tsx:63 |
| 56px | 64 | `sm:pb-14` page.tsx:63 |

### Settings (21)

| Now | Snaps to | Where |
|---|---|---|
| 12px | 14 | `gap-3` SettingsDialog.tsx:155, `gap-3` SettingsDialog.tsx:173, `gap-3` SettingsDialog.tsx:244 |
| 16px | 14 or 18? | `mt-4` SettingsDialog.tsx:59, `pb-4` SettingsDialog.tsx:137, `gap-4` SettingsDialog.tsx:154, `gap-4` SettingsDialog.tsx:230, `gap-4` SettingsDialog.tsx:261, `py-4` SettingsDialog.tsx:261, `gap-4` SettingsDialog.tsx:336, `gap-4` SettingsDialog.tsx:352 |
| 24px | 22 | `pt-6` SettingsDialog.tsx:51, `px-6` SettingsDialog.tsx:137, `pt-6` SettingsDialog.tsx:137, `gap-6` SettingsDialog.tsx:143, `px-6` SettingsDialog.tsx:143, `pb-6` SettingsDialog.tsx:143, `gap-6` SettingsDialog.tsx:147, `gap-6` SettingsDialog.tsx:201, `px-6` SettingsDialog.tsx:261, `gap-6` SettingsDialog.tsx:317 |