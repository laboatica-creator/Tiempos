(async () => {
  try {
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         email: 'laboatica@hotmail.com',
         password: 'Les1419055@'
       })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    
    if (!token) throw new Error('No token ' + JSON.stringify(loginData));

    const reqBody = {
       full_name: 'Jugador 1',
       national_id: '12345678',
       phone_number: '+5060000000',
       email: 'jugador@jugador.com',
       date_of_birth: '1990-01-01',
       password: 'password',
       role: 'CUSTOMER'
    };
    
    const pRes = await fetch('http://localhost:4000/api/auth/register', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(reqBody)
    });
    console.log('PLAYER STATUS:', pRes.status);
    console.log('PLAYER:', await pRes.text());

    const fRes = await fetch('http://localhost:4000/api/auth/register-staff', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
       body: JSON.stringify({
         ...reqBody,
         full_name: 'Fran 1',
         national_id: 'F12345678',
         phone_number: '+5060000001',
         email: 'fran@fran.com',
         role: 'FRANCHISE'
       })
    });
    console.log('FRANCHISE STATUS:', fRes.status);
    console.log('FRANCHISE:', await fRes.text());

  } catch(e) {
    console.error('ERROR:', e.message);
  }
})();
