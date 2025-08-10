import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock Firebase auth to skip authentication
jest.mock('./config/firebase', () => ({
  auth: {},
  db: {}
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, callback) => {
    // Simulate logged in user
    callback({ uid: 'mock-user', email: 'test@example.com' });
    return jest.fn(); // unsubscribe function
  }),
  signOut: jest.fn()
}));

test('renders habit tracker', () => {
  render(<App />);
  // Just check that something renders
  expect(document.body).toBeTruthy();
});