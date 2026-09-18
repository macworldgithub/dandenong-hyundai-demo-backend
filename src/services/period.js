import Entity from '../models/Entity.js';
import Period from '../models/Period.js';

export async function resolvePeriod(id) {
  const entity = await Entity.findOne();
  const period = await Period.findById(id || entity?.activePeriod);
  if (!period) throw Object.assign(new Error('Period not found'), { statusCode: 404 });
  return period;
}

export async function requestPeriod(req) {
  return (await resolvePeriod(req.body?.periodId || req.query?.periodId))._id;
}
