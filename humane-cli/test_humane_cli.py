#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "textual>=0.89.0",
#     "rich>=13.9.0",
#     "typer>=0.9.0",
#     "questionary>=2.0.0",
#     "pytest>=8.0.0",
#     "pytest-asyncio>=0.24.0",
# ]
# ///
"""Tests for Humane Tracker TUI using Textual's testing framework."""

import pytest
from textual.widgets import DataTable

from humane_cli import (
    CategoriesScreen,
    EntriesScreen,
    HabitsScreen,
    HelpScreen,
    HumaneCLI,
    HumaneData,
    find_habits_by_name,
)

# Test data fixture
TEST_DATA = {
    "version": 1,
    "habits": [
        {
            "id": "habit1",
            "name": "Morning Run",
            "category": "fitness",
            "targetPerWeek": 3,
        },
        {
            "id": "habit2",
            "name": "Meditation",
            "category": "wellness",
            "targetPerWeek": 7,
        },
        {
            "id": "habit3",
            "name": "Evening Walk",
            "category": "fitness",
            "targetPerWeek": 5,
        },
    ],
    "entries": [
        {"id": "e1", "habitId": "habit1", "date": "2025-11-28", "value": 1, "createdAt": "2025-11-28T10:00:00Z"},
        {"id": "e2", "habitId": "habit1", "date": "2025-11-27", "value": 1, "createdAt": "2025-11-27T10:00:00Z"},
        {"id": "e3", "habitId": "habit2", "date": "2025-11-28", "value": 1, "createdAt": "2025-11-28T08:00:00Z"},
    ],
}


@pytest.fixture
def humane_data():
    """Create test HumaneData instance."""
    return HumaneData(data=TEST_DATA)


@pytest.fixture
def app(humane_data):
    """Create test app instance."""
    return HumaneCLI(humane_data=humane_data)


class TestHumaneData:
    """Tests for HumaneData class."""

    def test_get_categories(self, humane_data):
        categories = humane_data.get_categories()
        assert "fitness" in categories
        assert "wellness" in categories
        assert len(categories["fitness"]) == 2
        assert len(categories["wellness"]) == 1

    def test_get_habits_by_category(self, humane_data):
        fitness_habits = humane_data.get_habits_by_category("fitness")
        assert len(fitness_habits) == 2
        names = [h["name"] for h in fitness_habits]
        assert "Morning Run" in names
        assert "Evening Walk" in names

    def test_get_entries_for_habit(self, humane_data):
        entries = humane_data.get_entries_for_habit("habit1")
        assert len(entries) == 2

        entries = humane_data.get_entries_for_habit("habit2")
        assert len(entries) == 1

    def test_get_habit_name(self, humane_data):
        assert humane_data.get_habit_name("habit1") == "Morning Run"
        assert humane_data.get_habit_name("nonexistent") == "Unknown"

    def test_get_category_stats(self, humane_data):
        stats = humane_data.get_category_stats()
        # Should be sorted by category name
        assert stats[0] == ("fitness", 2, 8)  # 3 + 5 = 8
        assert stats[1] == ("wellness", 1, 7)


class TestCategoriesScreen:
    """Tests for CategoriesScreen."""

    @pytest.mark.asyncio
    async def test_categories_display(self, app):
        async with app.run_test() as pilot:
            # Should start on categories screen
            assert isinstance(app.screen, CategoriesScreen)

            # Check table has correct rows - query from screen
            table = app.screen.query_one("#categories-table", DataTable)
            assert table.row_count == 2  # fitness and wellness

    @pytest.mark.asyncio
    async def test_navigate_with_j_k(self, app):
        async with app.run_test() as pilot:
            table = app.screen.query_one("#categories-table", DataTable)

            # Should start at row 0
            assert table.cursor_row == 0

            # Press j to go down
            await pilot.press("j")
            assert table.cursor_row == 1

            # Press k to go back up
            await pilot.press("k")
            assert table.cursor_row == 0

    @pytest.mark.asyncio
    async def test_select_with_enter(self, app):
        async with app.run_test() as pilot:
            # Press enter to select first category (fitness)
            await pilot.press("enter")

            # Should now be on habits screen
            assert isinstance(app.screen, HabitsScreen)
            assert app.screen.category == "fitness"

    @pytest.mark.asyncio
    async def test_select_with_l(self, app):
        async with app.run_test() as pilot:
            # Press l to select (vim right = enter)
            await pilot.press("l")

            assert isinstance(app.screen, HabitsScreen)

    @pytest.mark.asyncio
    async def test_help_screen(self, app):
        async with app.run_test() as pilot:
            await pilot.press("?")
            assert isinstance(app.screen, HelpScreen)

            # Escape should go back
            await pilot.press("escape")
            assert isinstance(app.screen, CategoriesScreen)


class TestHabitsScreen:
    """Tests for HabitsScreen."""

    @pytest.mark.asyncio
    async def test_habits_display(self, app):
        async with app.run_test() as pilot:
            # Navigate to fitness habits
            await pilot.press("enter")

            assert isinstance(app.screen, HabitsScreen)
            table = app.screen.query_one("#habits-table", DataTable)
            assert table.row_count == 2  # Morning Run and Evening Walk

    @pytest.mark.asyncio
    async def test_back_with_h(self, app):
        async with app.run_test() as pilot:
            await pilot.press("enter")  # Go to habits
            assert isinstance(app.screen, HabitsScreen)

            await pilot.press("h")  # Go back
            assert isinstance(app.screen, CategoriesScreen)

    @pytest.mark.asyncio
    async def test_back_with_escape(self, app):
        async with app.run_test() as pilot:
            await pilot.press("enter")
            assert isinstance(app.screen, HabitsScreen)

            await pilot.press("escape")
            assert isinstance(app.screen, CategoriesScreen)

    @pytest.mark.asyncio
    async def test_navigate_to_entries(self, app):
        async with app.run_test() as pilot:
            await pilot.press("enter")  # Go to habits
            await pilot.press("enter")  # Go to entries

            assert isinstance(app.screen, EntriesScreen)


class TestEntriesScreen:
    """Tests for EntriesScreen."""

    @pytest.mark.asyncio
    async def test_entries_display(self, app):
        async with app.run_test() as pilot:
            # Navigate to fitness -> first habit (Evening Walk, alphabetically)
            await pilot.press("enter")
            await pilot.press("enter")

            assert isinstance(app.screen, EntriesScreen)
            table = app.screen.query_one("#entries-table", DataTable)
            # Evening Walk has no entries, so should show "No entries" row
            assert table.row_count >= 1

    @pytest.mark.asyncio
    async def test_back_navigation(self, app):
        async with app.run_test() as pilot:
            await pilot.press("enter")  # Categories -> Habits
            await pilot.press("enter")  # Habits -> Entries

            assert isinstance(app.screen, EntriesScreen)

            await pilot.press("h")  # Back to habits
            assert isinstance(app.screen, HabitsScreen)

            await pilot.press("h")  # Back to categories
            assert isinstance(app.screen, CategoriesScreen)

    @pytest.mark.asyncio
    async def test_full_navigation_flow(self, app):
        """Test navigating categories -> habits -> entries -> back -> back."""
        async with app.run_test() as pilot:
            # Start at categories
            assert isinstance(app.screen, CategoriesScreen)

            # Go to habits (press j to go to wellness, then enter)
            await pilot.press("j")  # Move to wellness
            await pilot.press("l")  # Select with l

            assert isinstance(app.screen, HabitsScreen)
            assert app.screen.category == "wellness"

            # Go to entries
            await pilot.press("enter")
            assert isinstance(app.screen, EntriesScreen)
            assert app.screen.habit_name == "Meditation"

            # Navigate all the way back
            await pilot.press("escape")
            assert isinstance(app.screen, HabitsScreen)

            await pilot.press("escape")
            assert isinstance(app.screen, CategoriesScreen)


class TestQuit:
    """Tests for quit functionality."""

    @pytest.mark.asyncio
    async def test_quit_from_categories(self, app):
        async with app.run_test() as pilot:
            await pilot.press("q")
            # App should exit (no assertion needed, just shouldn't hang)

    @pytest.mark.asyncio
    async def test_quit_from_habits(self, app):
        async with app.run_test() as pilot:
            await pilot.press("enter")  # Go to habits
            await pilot.press("q")
            # App should exit


# Test data for merge functionality
MERGE_TEST_DATA = {
    "version": 1,
    "habits": [
        {"id": "tgu", "name": "TGU", "category": "fitness", "targetPerWeek": 3},
        {"id": "tgu-l", "name": "TGU-L", "category": "fitness", "targetPerWeek": 2},
        {"id": "tgu-r", "name": "TGU-R", "category": "fitness", "targetPerWeek": 2},
        {"id": "kb", "name": "Kettlebell", "category": "fitness", "targetPerWeek": 5},
    ],
    "entries": [
        # TGU entries
        {"id": "e1", "habitId": "tgu", "date": "2025-11-28", "value": 5, "createdAt": "2025-11-28T10:00:00Z"},
        {"id": "e2", "habitId": "tgu", "date": "2025-11-27", "value": 3, "createdAt": "2025-11-27T10:00:00Z"},
        # TGU-L entries (overlaps with TGU on 11-28, different value)
        {"id": "e3", "habitId": "tgu-l", "date": "2025-11-28", "value": 8, "createdAt": "2025-11-28T11:00:00Z"},
        {"id": "e4", "habitId": "tgu-l", "date": "2025-11-26", "value": 4, "createdAt": "2025-11-26T10:00:00Z"},
        # TGU-R entries
        {"id": "e5", "habitId": "tgu-r", "date": "2025-11-28", "value": 6, "createdAt": "2025-11-28T12:00:00Z"},
        {"id": "e6", "habitId": "tgu-r", "date": "2025-11-25", "value": 7, "createdAt": "2025-11-25T10:00:00Z"},
        # KB entry (should be unaffected)
        {"id": "e7", "habitId": "kb", "date": "2025-11-28", "value": 10, "createdAt": "2025-11-28T09:00:00Z"},
    ],
}


class TestMergeHabits:
    """Tests for merge_habits functionality."""

    @pytest.fixture
    def merge_data(self):
        return HumaneData(data=MERGE_TEST_DATA)

    def test_merge_takes_max_value_on_same_day(self, merge_data):
        """When multiple habits have entries on the same day, take max value."""
        result = merge_data.merge_habits("tgu", ["tgu-l", "tgu-r"])

        # Find the merged entry for 2025-11-28
        merged_entries = [e for e in result["entries"] if e["habitId"] == "tgu"]
        nov28_entry = next(e for e in merged_entries if e["date"] == "2025-11-28")

        # TGU had 5, TGU-L had 8, TGU-R had 6 -> max is 8
        assert nov28_entry["value"] == 8

    def test_merge_keeps_unique_dates(self, merge_data):
        """Entries on unique dates are preserved."""
        result = merge_data.merge_habits("tgu", ["tgu-l", "tgu-r"])

        merged_entries = [e for e in result["entries"] if e["habitId"] == "tgu"]
        dates = {e["date"] for e in merged_entries}

        # Should have 11-28 (all three), 11-27 (tgu only), 11-26 (tgu-l), 11-25 (tgu-r)
        assert dates == {"2025-11-28", "2025-11-27", "2025-11-26", "2025-11-25"}

    def test_merge_removes_source_habits(self, merge_data):
        """Source habits are removed from the habits list."""
        result = merge_data.merge_habits("tgu", ["tgu-l", "tgu-r"])

        habit_ids = {h["id"] for h in result["habits"]}
        assert "tgu" in habit_ids
        assert "tgu-l" not in habit_ids
        assert "tgu-r" not in habit_ids
        assert "kb" in habit_ids  # Unrelated habit should remain

    def test_merge_preserves_unrelated_entries(self, merge_data):
        """Entries for habits not involved in merge are preserved."""
        result = merge_data.merge_habits("tgu", ["tgu-l", "tgu-r"])

        kb_entries = [e for e in result["entries"] if e["habitId"] == "kb"]
        assert len(kb_entries) == 1
        assert kb_entries[0]["value"] == 10

    def test_merge_with_target_in_sources(self, merge_data):
        """Including target in sources list is handled gracefully."""
        result = merge_data.merge_habits("tgu", ["tgu", "tgu-l"])

        # Should still work - tgu-l merged into tgu
        habit_ids = {h["id"] for h in result["habits"]}
        assert "tgu" in habit_ids
        assert "tgu-l" not in habit_ids
        assert "tgu-r" in habit_ids  # Not merged

    def test_merge_reassigns_entry_habit_ids(self, merge_data):
        """All merged entries have the target habit ID."""
        result = merge_data.merge_habits("tgu", ["tgu-l", "tgu-r"])

        # No entries should have tgu-l or tgu-r as habitId
        for entry in result["entries"]:
            assert entry["habitId"] != "tgu-l"
            assert entry["habitId"] != "tgu-r"


class TestFindHabitsByName:
    """Tests for find_habits_by_name helper."""

    @pytest.fixture
    def merge_data(self):
        return HumaneData(data=MERGE_TEST_DATA)

    def test_find_exact_match(self, merge_data):
        """Can find habit by exact name."""
        results = find_habits_by_name(merge_data, "TGU")
        names = [h["name"] for h in results]
        # Should match TGU, TGU-L, TGU-R (all contain "TGU")
        assert "TGU" in names
        assert "TGU-L" in names
        assert "TGU-R" in names

    def test_find_case_insensitive(self, merge_data):
        """Search is case-insensitive."""
        results = find_habits_by_name(merge_data, "tgu")
        assert len(results) == 3

        results = find_habits_by_name(merge_data, "kettlebell")
        assert len(results) == 1
        assert results[0]["name"] == "Kettlebell"

    def test_find_partial_match(self, merge_data):
        """Can find by partial name."""
        results = find_habits_by_name(merge_data, "-L")
        assert len(results) == 1
        assert results[0]["name"] == "TGU-L"

    def test_find_no_match(self, merge_data):
        """Returns empty list when no match."""
        results = find_habits_by_name(merge_data, "nonexistent")
        assert results == []


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
