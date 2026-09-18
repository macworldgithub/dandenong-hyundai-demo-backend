// Seed principals own illustrative audit records only. Interactive users must
// sign up, so these accounts are deliberately ineligible for authentication.
export const usersFixture = [
  {
    name: 'Demo Dealership Principal',
    email: 'seed-dealership@dandenonghyundai.invalid',
    password: 'seed-account-disabled',
    role: 'dealership',
    isIllustrative: true,
    isSelfRegistered: false,
  },
  {
    name: 'Demo Admin Principal',
    email: 'seed-admin@dandenonghyundai.invalid',
    password: 'seed-account-disabled',
    role: 'admin',
    isIllustrative: true,
    isSelfRegistered: false,
  },
];
