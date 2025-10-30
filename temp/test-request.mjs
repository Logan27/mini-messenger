(async () => {
  const res = await fetch( http://localhost:4000/api/auth/register, {
    method: POST,
    headers: { Content-Type: application/json },
    body: JSON.stringify({ username: debuguser3, email: debuguser3@test.com, password: Test123456#, firstName: Debug, lastName: User })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
})();
