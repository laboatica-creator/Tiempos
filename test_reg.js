const axios = require('axios');
(async () => {
  try {
    const loginRes = await axios.post('http://localhost:4000/api/auth/login', {
       email: 'laboatica@hotmail.com',
       password: 'Les1419055@'
    });
    const token = loginRes.data.token;
    
    const reqBody = {
       full_name: 'Jugador 1',
       national_id: '12345678',
       phone_number: '+5060000000',
       email: 'jugador@jugador.com',
       date_of_birth: '1990-01-01',
       password: 'password',
       role: 'CUSTOMER'
    };
    
    const pRes = await axios.post('http://localhost:4000/api/auth/register', reqBody, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    console.log('PLAYER:', pRes.data);

    const fRes = await axios.post('http://localhost:4000/api/auth/register-staff', {
       ...reqBody,
       full_name: 'Fran 1',
       national_id: 'F12345678',
       phone_number: '+5060000001',
       email: 'fran@fran.com',
       role: 'FRANCHISE'
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('FRANCHISE:', fRes.data);

  } catch(e) {
    console.error('ERROR RESPONSE:', e.response ? e.response.data : e.message);
  }
})();
