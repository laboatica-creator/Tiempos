const { Pool } = require('pg');

const pool = new Pool({
  host: 'dpg-d724fae3jp1c738p3o70-a.oregon-postgres.render.com',
  user: 'tiempos_user',
  password: 'F7qM8btv5Xc2nRIix2MtUKBXreIfc9TE',
  database: 'tiempos_n5xb',
  ssl: { rejectUnauthorized: false }
});

pool.query("SELECT id, full_name, role FROM users WHERE email = 'carla@vendedor.com'")
  .then(res => {
    console.log('Usuario encontrado:');
    console.log(res.rows);
    pool.end();
  })
  .catch(err => {
    console.log('Error:', err.message);
    pool.end();
  });