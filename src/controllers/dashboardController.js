import { requestPeriod } from '../services/period.js';
import Entity from '../models/Entity.js';
import { computeKPIs, drillKPI } from '../services/kpi.js';

export async function getKPIs(req, res) {
  const entity = await Entity.findOne();
  if (!entity) return res.status(404).json({ error: 'No entity' });

  const kpis = await computeKPIs(await requestPeriod(req));
  res.json(kpis);
}

export async function drillKPIEndpoint(req, res) {
  const { key } = req.params;
  const entity = await Entity.findOne();
  if (!entity) return res.status(404).json({ error: 'No entity' });

  const data = await drillKPI(key, await requestPeriod(req));
  res.json({ key, data });
}
