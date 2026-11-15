// Credentials for the two public demo sites under test. Both are the
// published defaults from the restful-booker project's own documentation, not
// secrets. They live here once instead of as literals in specs, and can be
// overridden from the environment if the demo is ever pointed at another
// instance.
//
// The two sites use different admin passwords.
export const UI_ADMIN = {
  username: process.env.UI_ADMIN_USER ?? 'admin',
  password: process.env.UI_ADMIN_PASSWORD ?? 'password',
};

export const API_ADMIN = {
  username: process.env.API_ADMIN_USER ?? 'admin',
  password: process.env.API_ADMIN_PASSWORD ?? 'password123',
};
