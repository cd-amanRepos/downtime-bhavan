import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './Header.js';

describe('Header', () => {
  it('renders the brand wordmark in English and Hindi', () => {
    render(<Header />);
    expect(screen.getByText('Downtime')).toBeInTheDocument();
    expect(screen.getByText('Bhavan')).toBeInTheDocument();
    expect(screen.getByText(/डाउनटाइम भवन/)).toBeInTheDocument();
  });

  it('renders the Sarkari Mode theme toggle', () => {
    render(<Header />);
    expect(screen.getByRole('button', { name: /Sarkari Mode/i })).toBeInTheDocument();
  });

  it('renders the nav with all expected links', () => {
    render(<Header />);
    ['Status', 'Janta Darbar', 'Leaderboard', 'Methodology', 'API'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
