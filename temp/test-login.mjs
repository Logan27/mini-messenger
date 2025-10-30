(async () => {
  const res = await fetch(" http://localhost:4000/api/auth/login\, {
 method: \POST\,
 headers: { \Content-Type\: \application/json\ },
 body: JSON.stringify({ identifier: \admin\, password: \change_this_admin_password\ })
 });
 const data = await res.json();
 console.log(JSON.stringify(data, null, 2));
})();
