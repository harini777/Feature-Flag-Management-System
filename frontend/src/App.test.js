import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the landing page with FeatureFlow branding', () => {
  render(<App />);
  // The landing page renders "FeatureFlow" as the main brand name
  const brandElements = screen.getAllByText(/FeatureFlow/i);
  expect(brandElements.length).toBeGreaterThan(0);
});
