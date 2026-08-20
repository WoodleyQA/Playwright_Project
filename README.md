# Playwright_Project
This project uses Playwright to test the [restful-booker](https://restful-booker.herokuapp.com) UI demo and REST API, following the Page Object Model (POM) for UI pages and a request wrapper client for API calls.


To-Do List

Set up local project ✅
Clone repo ✅
Familiarize with core concepts of Typescript (TS) such as:


1. **async / await and Promises**
Why It Matters: E2E testing relies heavily on asynchronous browser interactions (network requests, page loads, rendering UI elements).

How It's Used: Knowing how TypeScript handles Promise<T> return types ensures every Playwright action properly resolves before executing the next step, preventing flaky tests.

Example:

async function getElementText(locator: Locator): Promise<string> {
  return await locator.innerText();
}


2. **Types, Interfaces & Custom Type Aliases**

Why It Matters: Ensures test data, API payloads, and component props are strictly typed across your tests.

How It's Used: Defining interfaces for test fixtures, API request bodies, or user profile objects prevents typos in field names and gives you autocomplete in VS Code.

Example: interface TestUser {
  username: string;
  email: string;
}

const user: TestUser = { username: 'testuser', email: 'test@example.com' };


**3.Classes, Modifiers, and this (Page Object Model)**

Why It Matters: The Page Object Model (POM) is the backbone of scalable E2E test suites, encapsulating page elements and actions into reusable classes.

How It's Used: Understanding class constructors, private class fields (private readonly), and methods allows you to group locators and page interactions cleanly.

Example:
import { Page, Locator } from '@playwright/test';

export class HomePage {
  private readonly searchInput: Locator;

  constructor(private page: Page) {
    this.searchInput = page.locator('#global-enhancements-search-query');
  }

  async searchForProduct(term: string) {
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
  }
}
