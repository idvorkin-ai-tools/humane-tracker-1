#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "textual>=0.89.0",
#     "rich>=13.9.0",
#     "typer>=0.9.0",
#     "questionary>=2.0.0",
# ]
# ///
"""Humane Tracker TUI - Explore habit tracker backup data with vi keybindings."""

import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Optional

import questionary
import typer
from rich.console import Console
from typing_extensions import Annotated

from textual import on
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container
from textual.screen import Screen
from textual.widgets import DataTable, Footer, Header, Label, Static


class HumaneData:
    """Load and analyze humane tracker backup data."""

    def __init__(self, filepath: str | None = None, data: dict | None = None):
        if data is not None:
            self.data = data
        elif filepath:
            with open(filepath) as f:
                self.data = json.load(f)
        else:
            raise ValueError("Must provide either filepath or data")
        self.habits = {h["id"]: h for h in self.data.get("habits", [])}
        self.entries = self.data.get("entries", [])

    def get_categories(self) -> dict[str, list[dict]]:
        """Group habits by category."""
        categories = defaultdict(list)
        for habit in self.data.get("habits", []):
            categories[habit.get("category", "uncategorized")].append(habit)
        return dict(categories)

    def get_habits_by_category(self, category: str) -> list[dict]:
        """Get all habits in a category."""
        return [h for h in self.data.get("habits", []) if h.get("category") == category]

    def get_entries_for_habit(self, habit_id: str) -> list[dict]:
        """Get all entries for a habit."""
        return [e for e in self.entries if e.get("habitId") == habit_id]

    def get_habit_name(self, habit_id: str) -> str:
        """Get habit name by ID."""
        habit = self.habits.get(habit_id)
        return habit.get("name", "Unknown") if habit else "Unknown"

    def get_category_stats(self) -> list[tuple[str, int, int]]:
        """Get (category, habit_count, total_target) tuples."""
        categories = self.get_categories()
        stats = []
        for cat, habits in sorted(categories.items()):
            total_target = sum(h.get("targetPerWeek", 0) for h in habits)
            stats.append((cat, len(habits), total_target))
        return stats

    def merge_habits(self, target_habit_id: str, source_habit_ids: list[str]) -> dict:
        """Merge multiple habits into one, taking max value on duplicate days.

        Args:
            target_habit_id: The habit ID to merge into (will be kept)
            source_habit_ids: List of habit IDs to merge from (will be removed)

        Returns:
            New data dict with merged habits and entries
        """
        all_source_ids = set(source_habit_ids)
        if target_habit_id in all_source_ids:
            all_source_ids.remove(target_habit_id)

        # Collect all entries for target and sources, grouped by date
        entries_by_date: dict[str, list[dict]] = defaultdict(list)
        for entry in self.entries:
            if entry.get("habitId") == target_habit_id or entry.get("habitId") in all_source_ids:
                date = entry.get("date", "")[:10]  # Normalize to YYYY-MM-DD
                entries_by_date[date].append(entry)

        # Create merged entries - take max value per day
        merged_entries = []
        for date, day_entries in entries_by_date.items():
            max_entry = max(day_entries, key=lambda e: e.get("value", 0))
            merged_entries.append({
                "id": max_entry["id"],
                "habitId": target_habit_id,
                "date": date,
                "value": max_entry.get("value", 0),
                "createdAt": max_entry.get("createdAt", ""),
            })

        # Keep entries not involved in the merge
        other_entries = [
            e for e in self.entries
            if e.get("habitId") != target_habit_id and e.get("habitId") not in all_source_ids
        ]

        # Remove source habits from habits list
        new_habits = [h for h in self.data.get("habits", []) if h["id"] not in all_source_ids]

        return {
            **self.data,
            "habits": new_habits,
            "entries": other_entries + merged_entries,
        }


class CategoriesScreen(Screen):
    """Screen showing all categories."""

    BINDINGS = [
        Binding("j", "cursor_down", "Down", show=False),
        Binding("k", "cursor_up", "Up", show=False),
        Binding("enter", "select", "Select"),
        Binding("l", "select", "Select", show=False),
        Binding("q", "quit", "Quit"),
        Binding("?", "help", "Help"),
    ]

    def __init__(self, humane_data: HumaneData):
        super().__init__()
        self.humane_data = humane_data

    def compose(self) -> ComposeResult:
        yield Header()
        yield Container(
            Label("Categories", classes="title"),
            DataTable(id="categories-table"),
            id="main-container",
        )
        yield Footer()

    def on_mount(self) -> None:
        table = self.query_one("#categories-table", DataTable)
        table.cursor_type = "row"
        table.zebra_stripes = True
        table.add_columns("Category", "Habits", "Weekly Target")

        for cat, count, target in self.humane_data.get_category_stats():
            table.add_row(cat.capitalize(), str(count), str(target), key=cat)

        table.focus()

    def action_cursor_down(self) -> None:
        table = self.query_one("#categories-table", DataTable)
        table.action_cursor_down()

    def action_cursor_up(self) -> None:
        table = self.query_one("#categories-table", DataTable)
        table.action_cursor_up()

    def action_select(self) -> None:
        table = self.query_one("#categories-table", DataTable)
        if table.cursor_row is not None and table.row_count > 0:
            row_key = table.coordinate_to_cell_key((table.cursor_row, 0)).row_key
            category = str(row_key.value)
            self.app.push_screen(HabitsScreen(self.humane_data, category))

    @on(DataTable.RowSelected)
    def on_row_selected(self, event: DataTable.RowSelected) -> None:
        category = str(event.row_key.value)
        self.app.push_screen(HabitsScreen(self.humane_data, category))

    def action_help(self) -> None:
        self.app.push_screen(HelpScreen())


class HabitsScreen(Screen):
    """Screen showing habits in a category."""

    BINDINGS = [
        Binding("j", "cursor_down", "Down", show=False),
        Binding("k", "cursor_up", "Up", show=False),
        Binding("enter", "select", "Select"),
        Binding("l", "select", "Select", show=False),
        Binding("h", "back", "Back"),
        Binding("escape", "back", "Back", show=False),
        Binding("q", "quit", "Quit"),
        Binding("?", "help", "Help"),
    ]

    def __init__(self, humane_data: HumaneData, category: str):
        super().__init__()
        self.humane_data = humane_data
        self.category = category
        self.habits = humane_data.get_habits_by_category(category)

    def compose(self) -> ComposeResult:
        yield Header()
        yield Container(
            Label(f"Habits: {self.category.capitalize()}", classes="title"),
            DataTable(id="habits-table"),
            id="main-container",
        )
        yield Footer()

    def on_mount(self) -> None:
        table = self.query_one("#habits-table", DataTable)
        table.cursor_type = "row"
        table.zebra_stripes = True
        table.add_columns("Name", "Target/Week", "Entries")

        for habit in sorted(self.habits, key=lambda h: h.get("name", "")):
            entry_count = len(self.humane_data.get_entries_for_habit(habit["id"]))
            table.add_row(
                habit.get("name", "Unknown"),
                str(habit.get("targetPerWeek", 0)),
                str(entry_count),
                key=habit["id"],
            )

        table.focus()

    def action_cursor_down(self) -> None:
        table = self.query_one("#habits-table", DataTable)
        table.action_cursor_down()

    def action_cursor_up(self) -> None:
        table = self.query_one("#habits-table", DataTable)
        table.action_cursor_up()

    def action_select(self) -> None:
        table = self.query_one("#habits-table", DataTable)
        if table.cursor_row is not None and table.row_count > 0:
            row_key = table.coordinate_to_cell_key((table.cursor_row, 0)).row_key
            habit_id = str(row_key.value)
            self.app.push_screen(EntriesScreen(self.humane_data, habit_id))

    @on(DataTable.RowSelected)
    def on_row_selected(self, event: DataTable.RowSelected) -> None:
        habit_id = str(event.row_key.value)
        self.app.push_screen(EntriesScreen(self.humane_data, habit_id))

    def action_back(self) -> None:
        self.app.pop_screen()

    def action_help(self) -> None:
        self.app.push_screen(HelpScreen())


class EntriesScreen(Screen):
    """Screen showing entries for a habit."""

    BINDINGS = [
        Binding("j", "cursor_down", "Down", show=False),
        Binding("k", "cursor_up", "Up", show=False),
        Binding("h", "back", "Back"),
        Binding("escape", "back", "Back", show=False),
        Binding("q", "quit", "Quit"),
        Binding("?", "help", "Help"),
        Binding("g", "go_top", "Top", show=False),
        Binding("G", "go_bottom", "Bottom", show=False),
    ]

    def __init__(self, humane_data: HumaneData, habit_id: str):
        super().__init__()
        self.humane_data = humane_data
        self.habit_id = habit_id
        self.habit_name = humane_data.get_habit_name(habit_id)
        self.entries = humane_data.get_entries_for_habit(habit_id)

    def compose(self) -> ComposeResult:
        yield Header()
        yield Container(
            Label(f"Entries: {self.habit_name}", classes="title"),
            DataTable(id="entries-table"),
            id="main-container",
        )
        yield Footer()

    def on_mount(self) -> None:
        table = self.query_one("#entries-table", DataTable)
        table.cursor_type = "row"
        table.zebra_stripes = True
        table.add_columns("Date", "Value", "Created At")

        for entry in sorted(self.entries, key=lambda e: e.get("date", ""), reverse=True):
            date_str = entry.get("date", "")[:10]
            created_str = entry.get("createdAt", "")[:10]
            table.add_row(date_str, str(entry.get("value", 0)), created_str)

        if not self.entries:
            table.add_row("No entries", "-", "-")

        table.focus()

    def action_cursor_down(self) -> None:
        table = self.query_one("#entries-table", DataTable)
        table.action_cursor_down()

    def action_cursor_up(self) -> None:
        table = self.query_one("#entries-table", DataTable)
        table.action_cursor_up()

    def action_back(self) -> None:
        self.app.pop_screen()

    def action_help(self) -> None:
        self.app.push_screen(HelpScreen())

    def action_go_top(self) -> None:
        table = self.query_one("#entries-table", DataTable)
        table.move_cursor(row=0)

    def action_go_bottom(self) -> None:
        table = self.query_one("#entries-table", DataTable)
        table.move_cursor(row=table.row_count - 1)


class HelpScreen(Screen):
    """Help screen showing keybindings."""

    BINDINGS = [
        Binding("escape", "back", "Back"),
        Binding("q", "back", "Back"),
        Binding("?", "back", "Back"),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        yield Container(
            Label("Keybindings", classes="title"),
            Static(
                """
[bold]Navigation[/bold]
  j / ↓      Move down
  k / ↑      Move up
  g          Go to top
  G          Go to bottom

[bold]Selection[/bold]
  Enter / l  Select / Enter
  h / Esc    Go back

[bold]General[/bold]
  ?          Show this help
  q          Quit

[bold]Screens[/bold]
  Categories → Habits → Entries
  Navigate with h/l or Enter/Esc
""",
                classes="help-text",
            ),
            id="main-container",
        )
        yield Footer()

    def action_back(self) -> None:
        self.app.pop_screen()


class HumaneCLI(App):
    """Humane Tracker TUI Application."""

    CSS = """
    #main-container {
        padding: 1 2;
    }

    .title {
        text-style: bold;
        color: $accent;
        padding-bottom: 1;
    }

    DataTable {
        height: 100%;
    }

    .help-text {
        padding: 1 2;
    }
    """

    TITLE = "Humane Tracker"
    SUB_TITLE = "Habit Backup Explorer"

    BINDINGS = [
        Binding("q", "quit", "Quit"),
    ]

    def __init__(self, filepath: str | None = None, humane_data: HumaneData | None = None):
        super().__init__()
        if humane_data:
            self.humane_data = humane_data
        elif filepath:
            self.humane_data = HumaneData(filepath)
        else:
            raise ValueError("Must provide either filepath or humane_data")

    def on_mount(self) -> None:
        self.push_screen(CategoriesScreen(self.humane_data))


cli = typer.Typer(help="Humane Tracker CLI - Explore and manage habit tracker backup data")
console = Console()


def find_habits_by_name(humane_data: HumaneData, pattern: str) -> list[dict]:
    """Find habits matching a pattern (case-insensitive substring match)."""
    pattern_lower = pattern.lower()
    return [h for h in humane_data.data.get("habits", []) if pattern_lower in h.get("name", "").lower()]


def get_default_backup_path() -> Path | None:
    """Find the most recent backup file in parent directory."""
    parent = Path(__file__).parent.parent
    backups = list(parent.glob("humane-tracker-backup-*.json"))
    if backups:
        return max(backups, key=lambda p: p.stat().st_mtime)
    return None


def load_data(file: Path | None) -> HumaneData:
    """Load data from file or default backup."""
    if file is None:
        file = get_default_backup_path()
        if file is None:
            console.print("[red]Error: No backup file found. Please specify a file.[/red]")
            raise typer.Exit(1)
        console.print(f"[dim]Using: {file}[/dim]")

    if not file.exists():
        console.print(f"[red]Error: File not found: {file}[/red]")
        raise typer.Exit(1)

    return HumaneData(str(file))


@cli.command()
def explore(
    file: Annotated[Optional[Path], typer.Argument(help="Backup JSON file")] = None,
):
    """Launch the interactive TUI explorer."""
    data = load_data(file)
    app = HumaneCLI(humane_data=data)
    app.run()


@cli.command("list")
def list_habits(
    file: Annotated[Optional[Path], typer.Argument(help="Backup JSON file")] = None,
):
    """List all habits grouped by category."""
    data = load_data(file)
    categories = data.get_categories()

    for cat, habits in sorted(categories.items()):
        console.print(f"\n[bold]{cat.upper()}[/bold]")
        console.print("-" * 40)
        for h in sorted(habits, key=lambda x: x.get("name", "")):
            entry_count = len(data.get_entries_for_habit(h["id"]))
            console.print(f"  {h['name']:<30} ({entry_count:>3} entries)")


@cli.command()
def merge(
    file: Annotated[Optional[Path], typer.Argument(help="Backup JSON file")] = None,
    output: Annotated[Optional[Path], typer.Option("--output", "-o", help="Output file (default: stdout)")] = None,
):
    """Interactively merge multiple habits into one.

    On duplicate days, takes the maximum value from all merged entries.
    """
    data = load_data(file)

    # Build habit choices with entry counts
    habits = data.data.get("habits", [])
    if len(habits) < 2:
        console.print("[red]Error: Need at least 2 habits to merge[/red]")
        raise typer.Exit(1)

    def habit_choice(h: dict) -> questionary.Choice:
        entry_count = len(data.get_entries_for_habit(h["id"]))
        label = f"{h['name']} ({entry_count} entries) [{h.get('category', 'uncategorized')}]"
        return questionary.Choice(title=label, value=h)

    sorted_habits = sorted(habits, key=lambda h: (h.get("category", ""), h.get("name", "")))
    choices = [habit_choice(h) for h in sorted_habits]

    # Select target habit
    target = questionary.select(
        "Select TARGET habit (entries will be merged INTO this one):",
        choices=choices,
    ).ask()

    if target is None:
        raise typer.Exit(0)

    # Select source habits (excluding target)
    source_choices = [habit_choice(h) for h in sorted_habits if h["id"] != target["id"]]
    sources = questionary.checkbox(
        "Select SOURCE habits to merge (these will be REMOVED):",
        choices=source_choices,
    ).ask()

    if sources is None or len(sources) == 0:
        console.print("[yellow]No sources selected, nothing to merge.[/yellow]")
        raise typer.Exit(0)

    # Confirm
    console.print("\n[bold]Merge Summary:[/bold]")
    console.print(f"  Target: [green]{target['name']}[/green]")
    console.print("  Sources to merge and remove:")
    for s in sources:
        entry_count = len(data.get_entries_for_habit(s["id"]))
        console.print(f"    - [red]{s['name']}[/red] ({entry_count} entries)")

    if not questionary.confirm("Proceed with merge?", default=False).ask():
        console.print("[yellow]Cancelled.[/yellow]")
        raise typer.Exit(0)

    # Perform merge
    source_ids = [s["id"] for s in sources]
    merged_data = data.merge_habits(target["id"], source_ids)

    # Count results
    merged_entries = [e for e in merged_data["entries"] if e.get("habitId") == target["id"]]
    console.print(f"\n[green]Merged into {len(merged_entries)} entries.[/green]")

    # Output
    output_json = json.dumps(merged_data, indent=2)
    if output:
        output.write_text(output_json)
        console.print(f"[green]Written to {output}[/green]")
    else:
        print(output_json)


def main():
    """Entry point for the CLI."""
    # If no args or first arg is a file (not a command), default to explore
    if len(sys.argv) == 1:
        # No args - try explore with default file
        sys.argv.append("explore")
    elif len(sys.argv) >= 2 and sys.argv[1] not in ("explore", "list", "merge", "--help", "-h"):
        # First arg looks like a file path, insert "explore" command
        sys.argv.insert(1, "explore")

    cli()


if __name__ == "__main__":
    main()
