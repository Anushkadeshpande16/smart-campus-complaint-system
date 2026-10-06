const pool = require('../config/db');
const { asyncHandler } = require('../utils/helpers');

// Reference data used by forms and filters on every screen
exports.meta = asyncHandler(async (req, res) => {
  const [categories] = await pool.query(
    `SELECT c.id, c.name, c.department_id, c.is_active, d.name AS department_name
       FROM categories c JOIN departments d ON d.id = c.department_id ORDER BY c.id`);
  const [locations] = await pool.query('SELECT * FROM locations ORDER BY building, floor, room, area');
  const [departments] = await pool.query('SELECT * FROM departments ORDER BY name');
  const [sla] = await pool.query("SELECT priority, hours FROM sla_settings ORDER BY FIELD(priority,'High','Medium','Low')");
  res.json({ categories: categories.map((c) => ({ ...c, is_active: !!c.is_active })), locations, departments, sla });
});
