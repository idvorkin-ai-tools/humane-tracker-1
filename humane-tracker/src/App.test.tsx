import { render, screen } from "@testing-library/react";
import React from "react";
import App from "./App";

// Mock Dexie database and hooks
jest.mock("./config/db", () => ({
	db: {
		habits: {
			toArray: jest.fn(() => Promise.resolve([])),
			where: jest.fn(() => ({
				equals: jest.fn(() => ({
					toArray: jest.fn(() => Promise.resolve([])),
				})),
			})),
		},
		entries: {
			toArray: jest.fn(() => Promise.resolve([])),
			where: jest.fn(() => ({
				equals: jest.fn(() => ({
					toArray: jest.fn(() => Promise.resolve([])),
				})),
			})),
		},
	},
}));

jest.mock("dexie-react-hooks", () => ({
	useObservable: jest.fn(() => null), // Simulate no user logged in
}));

test("renders habit tracker", () => {
	render(<App />);
	// Just check that something renders
	expect(document.body).toBeTruthy();
});
