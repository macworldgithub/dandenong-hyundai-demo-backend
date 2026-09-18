// Seed data: Bank accounts
export const bankAccountsFixture = [
  {
    name: 'NAB Operating Account',
    bsb: '083-214',
    accountNumber: '12-345-6789',
    type: 'operating',
    glAccountCode: '1000', // will be resolved to Account _id in seed
    openingBalanceCents: 45672300, // $456,723.00
  },
  {
    name: 'NAB Trust Account',
    bsb: '083-214',
    accountNumber: '12-345-6790',
    type: 'trust',
    glAccountCode: '1010',
    openingBalanceCents: 12500000, // $125,000.00
  },
  {
    name: 'NAB Deposit Account',
    bsb: '083-214',
    accountNumber: '12-345-6791',
    type: 'deposits',
    glAccountCode: '1020',
    openingBalanceCents: 8750000, // $87,500.00
  },
];
