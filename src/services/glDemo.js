export function buildGlDemo(period) {
  const accounts = [
    ['1000', 'Operating bank', 'asset', 'Admin'],
    ['1200', 'New vehicle inventory', 'asset', 'New'],
    ['2000', 'Trade creditors', 'liability', 'Admin'],
    ['3000', 'Owner capital', 'equity', 'Admin'],
    ['4000', 'Vehicle sales', 'revenue', 'New'],
    ['5000', 'Vehicle cost of sales', 'expense', 'New'],
    ['6100', 'Administration expenses', 'expense', 'Admin'],
  ].map(([code, name, type, department]) => ({
    _id: `demo-gl-${code}`, code, name, type, department,
    isControl: false, isIllustrative: true,
  }));
  const definitions = [
    ['Opening capital', '1000', '3000', 50000000],
    ['Vehicle stock purchase', '1200', '2000', 18000000],
    ['Vehicle sale receipt', '1000', '4000', 6500000],
    ['Vehicle cost recognised', '5000', '1200', 5000000],
    ['Supplier payment', '2000', '1000', 8000000],
    ['Administration payment', '6100', '1000', 450000],
  ];
  const journals = definitions.map(([narration, debit, credit, amount], i) => ({
    _id: `demo-journal-${i + 1}`, periodId: String(period._id),
    date: new Date(period.start).toISOString(), postedAt: new Date(period.start).toISOString(),
    source: 'manual', sourceRef: `DEMO-${i + 1}`, narration,
    isReversal: false, isIllustrative: true,
    lines: [debit, credit].map((code, index) => ({
      accountId: `demo-gl-${code}`,
      department: accounts.find(a => a.code === code).department,
      debitCents: index === 0 ? amount : 0, creditCents: index === 1 ? amount : 0,
    })),
  }));
  const rows = accounts.map(account => {
    const lines = journals.flatMap(j => j.lines).filter(l => l.accountId === account._id);
    const totalDebitCents = lines.reduce((sum, l) => sum + l.debitCents, 0);
    const totalCreditCents = lines.reduce((sum, l) => sum + l.creditCents, 0);
    const balanceCents = totalDebitCents - totalCreditCents;
    return { ...account, accountId: account._id, totalDebitCents, totalCreditCents,
      balanceCents, netDebitCents: Math.max(0, balanceCents), netCreditCents: Math.max(0, -balanceCents) };
  });
  const totalDebitCents = rows.reduce((sum, a) => sum + a.netDebitCents, 0);
  const totalCreditCents = rows.reduce((sum, a) => sum + a.netCreditCents, 0);
  return { accounts, journals, trialBalance: { period, accounts: rows, totalDebitCents,
    totalCreditCents, differenceCents: totalDebitCents - totalCreditCents,
    isBalanced: totalDebitCents === totalCreditCents, dataSource: 'demo' } };
}
