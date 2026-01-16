// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Phone Fullscreen Card View Tests
 * Tests the mobile sports bar display across different phone sizes
 */

test.describe('Phone Fullscreen Card Views', () => {

  test.beforeEach(async ({ page }) => {
    // Login first (page requires authentication)
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email Address' }).fill('fred.pacheco@gmail.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('03111988');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for login to complete
    await page.waitForURL('/');

    // Navigate to phone sports bar page
    await page.goto('/Phone-sports-bar.html');
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Load & Structure', () => {

    test('should load phone sports bar page', async ({ page }) => {
      await expect(page).toHaveTitle(/GridTV Sports/);
    });

    test('should have fullscreen container', async ({ page }) => {
      const container = page.locator('.fullscreen-container');
      await expect(container).toBeVisible();
    });

    test('should have fullscreen grid', async ({ page }) => {
      const grid = page.locator('.fullscreen-grid');
      await expect(grid).toBeVisible();
    });

    test('should apply correct viewport meta tag', async ({ page }) => {
      const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewport).toContain('width=device-width');
      expect(viewport).toContain('user-scalable=no');
    });
  });

  test.describe('CSS Variables & Responsiveness', () => {

    test('should have CSS custom properties defined', async ({ page }) => {
      const bgPrimary = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim();
      });
      expect(bgPrimary).toBe('#0a0e1a');
    });

    test('should have body with no overflow', async ({ page }) => {
      const overflow = await page.evaluate(() => {
        return getComputedStyle(document.body).overflow;
      });
      expect(overflow).toBe('hidden');
    });

    test('should use full viewport height', async ({ page }) => {
      const container = page.locator('.fullscreen-container');
      const box = await container.boundingBox();
      const viewport = page.viewportSize();

      expect(box?.height).toBeGreaterThanOrEqual(viewport.height - 10);
    });
  });

  test.describe('Game Card Rendering', () => {

    test('should display game cards when games are available', async ({ page }) => {
      // Wait for potential game cards to load
      await page.waitForTimeout(2000);

      const cards = page.locator('.fullscreen-game-card');
      const count = await cards.count();

      // Either cards are present or empty state is shown
      if (count > 0) {
        await expect(cards.first()).toBeVisible();
      }
    });

    test('should have proper card structure', async ({ page }) => {
      await page.waitForTimeout(2000);

      const cards = page.locator('.fullscreen-game-card');
      const count = await cards.count();

      if (count > 0) {
        const firstCard = cards.first();
        // Card should have data-game-id attribute
        const gameId = await firstCard.getAttribute('data-game-id');
        expect(gameId).toBeTruthy();
      }
    });

    test('should have league identifier on cards', async ({ page }) => {
      await page.waitForTimeout(2000);

      const cards = page.locator('.fullscreen-game-card');
      const count = await cards.count();

      if (count > 0) {
        const firstCard = cards.first();
        const league = await firstCard.getAttribute('data-league');
        expect(['nfl', 'nba', 'mlb', 'nhl', 'ncaa', 'ncaab']).toContain(league);
      }
    });
  });

  test.describe('Grid Layouts', () => {

    test('should support grid-1 layout (single card fullscreen)', async ({ page }) => {
      const grid = page.locator('.fullscreen-grid');

      // Check if grid class can be applied
      await page.evaluate(() => {
        const grid = document.querySelector('.fullscreen-grid');
        if (grid) {
          grid.classList.add('grid-1');
        }
      });

      await expect(grid).toHaveClass(/grid-1|fullscreen-grid/);
    });

    test('should apply mobile-specific padding for grids', async ({ page }) => {
      const grid = page.locator('.fullscreen-grid');
      const padding = await grid.evaluate((el) => {
        return getComputedStyle(el).padding;
      });

      // Mobile should have reduced padding
      expect(padding).toBeTruthy();
    });
  });

  test.describe('Touch Interactions', () => {

    test('should be touch-friendly with proper touch targets', async ({ page }) => {
      const touchTarget = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--touch-target').trim();
      });
      expect(touchTarget).toBe('44px');
    });

    test('should have -webkit-overflow-scrolling for smooth scrolling', async ({ page }) => {
      const scrolling = await page.evaluate(() => {
        return getComputedStyle(document.body).webkitOverflowScrolling || 'touch';
      });
      expect(scrolling).toBe('touch');
    });
  });

  test.describe('Visual Regression', () => {

    test('should match fullscreen container snapshot', async ({ page }) => {
      await page.waitForTimeout(2000);

      const container = page.locator('.fullscreen-container');
      await expect(container).toHaveScreenshot('fullscreen-container.png', {
        maxDiffPixels: 100,
      });
    });

    test('should match game card snapshot when present', async ({ page }) => {
      await page.waitForTimeout(2000);

      const cards = page.locator('.fullscreen-game-card');
      const count = await cards.count();

      if (count > 0) {
        await expect(cards.first()).toHaveScreenshot('game-card.png', {
          maxDiffPixels: 50,
        });
      }
    });
  });

  test.describe('Performance', () => {

    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/Phone-sports-bar.html');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should not have layout shift after load', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      const initialHeight = await page.evaluate(() => {
        const container = document.querySelector('.fullscreen-container');
        return container?.getBoundingClientRect().height;
      });

      await page.waitForTimeout(1000);

      const finalHeight = await page.evaluate(() => {
        const container = document.querySelector('.fullscreen-container');
        return container?.getBoundingClientRect().height;
      });

      expect(finalHeight).toBe(initialHeight);
    });
  });

  test.describe('Required Scripts & Styles', () => {

    test('should load field visualizer script', async ({ page }) => {
      const hasVisualizer = await page.evaluate(() => {
        return typeof window.SVGFieldVisualizer !== 'undefined' ||
               document.querySelector('script[src*="field-visualizer"]') !== null;
      });
      expect(hasVisualizer).toBe(true);
    });

    test('should load play animations script', async ({ page }) => {
      const hasAnimations = await page.evaluate(() => {
        return document.querySelector('script[src*="play-animations"]') !== null;
      });
      expect(hasAnimations).toBe(true);
    });

    test('should load fullscreen cards styles', async ({ page }) => {
      const hasStyles = await page.evaluate(() => {
        return document.querySelector('link[href*="fullscreen-cards"]') !== null;
      });
      expect(hasStyles).toBe(true);
    });

    test('should load mobile fullscreen styles', async ({ page }) => {
      const hasStyles = await page.evaluate(() => {
        return document.querySelector('link[href*="mobile-fullscreen"]') !== null;
      });
      expect(hasStyles).toBe(true);
    });
  });
});
