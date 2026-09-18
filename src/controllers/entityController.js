import Entity from '../models/Entity.js';
import Period from '../models/Period.js';

export async function getEntity(req, res) {
  const entity = await Entity.findOne().populate('activePeriod');
  if (!entity) {
    return res.status(404).json({ error: 'No entity configured' });
  }

  res.json({
    entity,
    periods: await Period.find().sort({ start: -1 }),
    activePeriod: entity.activePeriod,
    actingAs: req.user,
    book: 'Management',
  });
}
